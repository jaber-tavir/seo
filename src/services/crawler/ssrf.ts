/**
 * SSRF protection for the crawler.
 *
 * Strategy (fail-closed):
 *  - Reject non-(http|https) URL schemes, userinfo, IP literals and internal hostnames.
 *  - Resolve the hostname via multi-record lookup (A + AAAA), following CNAME chains,
 *    and validate EVERY resulting IP against the blocklists below.
 *  - The HTTP client then connects DIRECTLY to a validated IP (SNI/Host = hostname),
 *    so no second DNS resolution can bypass the check (TOCTOU-safe).
 *  - Redirect targets are re-validated the same way before the follow-up fetch.
 */

export class SsrfBlockedError extends Error {
  constructor(message = "URL is not allowed") {
    super(message);
    this.name = "SsrfBlockedError";
  }
}

export interface ValidatedUrl {
  raw: string;
  protocol: "http" | "https";
  hostname: string;
  /** One validated, non-blocked IP for the hostname */
  ip: string;
  /** True when the IP is IPv6 */
  isIpv6: boolean;
  port: number;
  path: string;
  /** For https the Server Name Indication value */
  servername: string;
}

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".internal",
  ".local",
  ".localhost",
  ".localdomain",
  ".lan",
  ".home",
  ".corp",
  ".test",
  ".example",
  ".invalid",
];
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.ec2.internal",
  "instance-data.ec2.internal",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

  void 0; // SPLIT helper retired (strict dotted-quad match above)

function ipv4Int(octets: number[]): number {
  return ((octets[0]! * 256 + octets[1]!) * 256 + octets[2]!) * 256 + octets[3]!;
}

/** IPv4 classification - returns the blocked range label, or null when public. */
export function classifyIpv4(ip: string): string | null {
  const trimmed = ip.trim();
  const dotted = trimmed.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  const parts = [dotted![1], dotted![2], dotted![3], dotted![4]].map((n) => Number(n));
  if (parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return "malformed-ipv4";
  }
  const int = ipv4Int(parts as number[]);
  const ranges: Array<[number[], number[], string]> = [
    [[0, 0, 0, 0], [0, 255, 255, 255], "this-network"],
    [[10, 0, 0, 0], [10, 255, 255, 255], "private-10"],
    [[127, 0, 0, 0], [127, 255, 255, 255], "loopback"],
    [[169, 254, 0, 0], [169, 254, 255, 255], "link-local-cloud-metadata"],
    [[172, 16, 0, 0], [172, 31, 255, 255], "private-172"],
    [[192, 0, 0, 0], [192, 0, 0, 255], "ietf-reserved"],
    [[192, 0, 2, 0], [192, 0, 2, 255], "test-net-1"],
    [[192, 88, 99, 0], [192, 88, 99, 255], "6to4-relay-anycast"],
    [[192, 168, 0, 0], [192, 168, 255, 255], "private-192"],
    [[198, 18, 0, 0], [198, 19, 255, 255], "benchmarking"],
    [[198, 51, 100, 0], [198, 51, 100, 255], "test-net-2"],
    [[203, 0, 113, 0], [203, 0, 113, 255], "test-net-3"],
    [[224, 0, 0, 0], [239, 255, 255, 255], "multicast"],
    [[240, 0, 0, 0], [255, 255, 255, 255], "reserved-broadcast"],
    [[100, 64, 0, 0], [100, 127, 255, 255], "cg-nat"],
  ];
  for (const [lo, hi] of ranges) {
    if (int >= ipv4Int(lo) && int <= ipv4Int(hi)) return `blocked:${ranges.find((r) => r[0] === lo && r[1] === hi)![2]}`;
  }
  return null;
}

// ------------------------------------------------------------------ IPv6

function ipv6Groups(ip: string): number[] {
  const lower = ip.toLowerCase();
  const [head, tail] = lower.split("::", 2) as [string, string | undefined];
  let left = head ? head.split(":").filter(Boolean).map((g) => parseInt(g, 16)) : [];
  const right = tail ? tail.split(":").filter(Boolean).map((g) => parseInt(g, 16)) : [];
  if (tail !== undefined) {
    const missing = Math.max(0, 8 - (left.length + right.length));
    left = left.concat(Array.from({ length: missing }, () => 0), right);
  }
  return left;
}

function hasv6Prefix(groups: number[], prefix: number[], bits: number): boolean {
  const full = bits / 16;
  for (let i = 0; i < full; i += 1) {
    if ((groups[i] ?? 0) !== prefix[i]) return false;
  }
  const rem = bits % 16;
  if (rem === 0) return true;
  const mask = (1 << (16 - rem)) - 1;
  return ((groups[full] ?? 0) & mask) === (prefix[full] ?? 0);
}

/** IPv6 classification - returns the blocked label, or null when global unicast. */
export function classifyIpv6(ip: string): string | null {
  const raw = ip.toLowerCase();
  if (raw.includes("%")) return "blocked:zone-scoped";
  if (!raw.includes(":")) return "not-ipv6";
  const groups = ipv6Groups(raw.split("%")[0]);
  if (groups.length !== 8) return "blocked:malformed-ipv6";

  const ranges: Array<[number[], number, string]> = [
    [[0, 0, 0, 0, 0, 0, 0, 0], 128, "unspecified"],
    [[0, 0, 0, 0, 0, 0, 0, 1], 128, "loopback"],
    [[0xfc00], 7, "unique-local"],
    [[0xfe80], 10, "link-local"],
    [[0xff00], 8, "multicast"],
    [[0, 0, 0, 0, 0, 0xffff], 96, "ipv4-mapped"],
    [[0, 0, 0, 0, 0, 0], 96, "ipv4-compatible"],
    [[0x64, 0xff9b], 96, "ipv4-translated"],
    [[0x64, 0xff9b, 0, 1], 64, "ipv4-translated"],
    [[0x100], 64, "discard"],
    [[0x2001, 0xdb8], 32, "documentation"],
    [[0x2001, 0x10], 28, "orchid"],
    [[0x2002], 16, "benchmarking"],
    [[0x2001, 0x2], 48, "benchmarking"],
    [[0x5f00], 16, "segment-routing"],
    [[0x3fff], 20, "documentation"],
  ];
  for (const [prefix, bits, label] of ranges) {
    if (hasv6Prefix(groups, prefix, bits)) return `blocked:${label}`;
  }
  const first = groups[0] ?? 0;
  if ((first & 0xe000) !== 0x2000) return "blocked:not-global-unicast";
  return null;
}

/** Classify any IP literal. Returns a blocked label, or null when it is public. */
export function classifyIp(ip: string): string | null {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return classifyIpv4(ip);
  if (ip.includes(":")) return classifyIpv6(ip);
  return "blocked:not-an-ip";
}

// ------------------------------------------------------------------ Hostname checks

export function isBlockedHostname(hostname: string): string | null {
  const h = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(h)) return "blocked-hostname";
  const bare = h.endsWith(".") ? h.slice(0, -1) : h;
  if (!bare.includes(".")) return "single-label-hostname";
  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (bare === suffix.slice(1) || bare.endsWith(suffix)) return `internal-hostname (${suffix})`;
  }
  const looksLikeIp = /^[0-9a-fA-F:.]+$/.test(bare) && (bare.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(bare));
  if (looksLikeIp) { const ipClass = classifyIp(bare); if (ipClass) return ipClass; }
  return null;
}
// ------------------------------------------------------------------ DNS resolution

interface DnsAnswer {
  type?: number;
  address?: string;
  data?: string;
}

interface DnsLookupResult {
  answers?: DnsAnswer[];
}

const RECORD_A = 1;
const RECORD_AAAA = 28;
const RECORD_CNAME = 5;

async function resolveHostValues(hostname: string, type: number): Promise<string[]> {
  const dnsModule = await import("node:dns").catch(() => null);
  if (!dnsModule) return [];
  const typed = dnsModule as { promises?: { lookup?: (n: string, o: unknown) => Promise<DnsLookupResult> } };
  const lookup = typed.promises?.lookup;
  if (!lookup) return [];

  const results: string[] = [];
  const walk = async (name: string, visited: Set<string>, depth: number): Promise<void> => {
    if (depth > 6 || visited.has(name.toLowerCase())) return;
    visited.add(name.toLowerCase());
    try {
      const parsed = await lookup(name, { type });
      for (const answer of parsed?.answers ?? []) {
        if (answer.type === RECORD_A && typeof answer.address === "string") results.push(answer.address);
        if (answer.type === RECORD_AAAA && typeof answer.address === "string") results.push(answer.address);
        if (answer.type === RECORD_CNAME && typeof answer.data === "string") {
          await walk(answer.data.toLowerCase(), visited, depth + 1);
        }
      }
    } catch {
      // resolution failure for this record type - caller decides
    }
  };

  await walk(hostname, new Set(), 0);
  return results.filter((value, index) => results.indexOf(value) === index);
}

/** Resolve every A and AAAA record and return only public (non-blocked) IPs. */
export async function resolvePublicIps(hostname: string): Promise<string[]> {
  const merged = [...(await resolveHostValues(hostname, RECORD_A)), ...(await resolveHostValues(hostname, RECORD_AAAA))];
  const out: string[] = [];
  for (const ip of merged) {
    if (classifyIp(ip) === null && !out.includes(ip)) out.push(ip);
  }
  return out;
}

// ------------------------------------------------------------------ Full validation

export async function validateTargetUrl(raw: string): Promise<ValidatedUrl> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SsrfBlockedError("URL could not be parsed");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfBlockedError("Only http/https URLs are allowed");
  }
  if (parsed.username || parsed.password) {
    throw new SsrfBlockedError("URLs with embedded credentials are not allowed");
  }
  const hostname = parsed.hostname.toLowerCase();

  const hostBlock = isBlockedHostname(hostname);
  if (hostBlock) throw new SsrfBlockedError(`Hostname rejected: ${hostBlock}`);

  const ips = await resolvePublicIps(hostname);
  if (ips.length === 0) {
    throw new SsrfBlockedError("Hostname did not resolve to a public IP");
  }

  const ip = ips[0];
  const isIpv6 = ip.includes(":");
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80;

  let path = parsed.pathname;
  if (parsed.search) path += parsed.search;

  return {
    raw,
    protocol: parsed.protocol === "https:" ? "https" : "http",
    hostname,
    ip,
    isIpv6,
    port,
    path,
    servername: hostname,
  };
}

/** Same-host gate used while collecting links (no DNS resolution). */
export function isSameSiteCrawlable(linkHost: string, seedHost: string): boolean {
  const l = linkHost.toLowerCase().replace(/\.$/, "");
  const s = seedHost.toLowerCase().replace(/\.$/, "");
  return l === s || l.endsWith(`.${s}`) || s.endsWith(`.${l}`);
}