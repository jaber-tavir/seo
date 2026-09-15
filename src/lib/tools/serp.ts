/**
 * SERP snippet estimation.
 * Pixel widths use average glyph widths for Google's system fonts:
 * desktop (Arial 20px title / 14px description) and mobile (20px/14px scaled).
 */

const WIDTHS = {
  desktopTitle: { narrow: 9, wide: 11.5, cap: 13, space: 6 },
  mobileTitle: { narrow: 9.5, wide: 12.5, cap: 14, space: 6 },
  desktopDesc: { narrow: 6.3, wide: 8.2, cap: 9.5, space: 4.4 },
  mobileDesc: { narrow: 7.2, wide: 9.4, cap: 11, space: 5 },
} as const;

function isWide(ch: string): boolean {
  return /[mwMW]/.test(ch);
}
function isCap(ch: string): boolean {
  return /[A-Z0-9]/.test(ch);
}

export function estimatePixels(text: string, font: keyof typeof WIDTHS = "desktopTitle"): number {
  const w = WIDTHS[font] ?? WIDTHS.desktopTitle;
  let total = 0;
  for (const ch of text) {
    if (ch === " ") total += w.space;
    else if (isCap(ch)) total += w.cap;
    else if (isWide(ch)) total += w.wide;
    else total += w.narrow;
  }
  return Math.round(total);
}

export interface SerpLimits {
  maxTitlePixels: number;
  maxTitleChars: number;
  minTitleChars: number;
  maxDescChars: number;
  minDescChars: number;
}

export const SERP_LIMITS: Record<"desktop" | "mobile", SerpLimits> = {
  desktop: { maxTitlePixels: 580, maxTitleChars: 60, minTitleChars: 30, maxDescChars: 158, minDescChars: 120 },
  mobile: { maxTitlePixels: 920, maxTitleChars: 60, minTitleChars: 30, maxDescChars: 120, minDescChars: 100 },
};

export interface SerpCheck {
  level: "ok" | "warning" | "error";
  message: string;
}

export function checkSerpInput(
  kind: "title" | "description",
  value: string,
  device: "desktop" | "mobile"
): SerpCheck[] {
  const limits = SERP_LIMITS[device];
  const checks: SerpCheck[] = [];
  const len = value.trim().length;

  if (kind === "title") {
    const px = estimatePixels(value, device === "desktop" ? "desktopTitle" : "mobileTitle");
    if (len === 0) checks.push({ level: "error", message: "Title is required" });
    else {
      if (px > limits.maxTitlePixels)
        checks.push({ level: "error", message: `Title is ~${px}px and will be truncated (max ~${limits.maxTitlePixels}px on ${device})` });
      else checks.push({ level: "ok", message: `~${px}px of ~${limits.maxTitlePixels}px available on ${device}` });
      if (len < limits.minTitleChars)
        checks.push({ level: "warning", message: `Title is short (${len} chars) - you have room for more keywords` });
      else if (len > limits.maxTitleChars)
        checks.push({ level: "warning", message: `Title exceeds ${limits.maxTitleChars} characters` });
    }
  } else {
    if (len === 0) checks.push({ level: "error", message: "Meta description is required" });
    else {
      if (len > limits.maxDescChars)
        checks.push({ level: "error", message: `Description exceeds ~${limits.maxDescChars} characters and will be truncated on ${device}` });
      else if (len < limits.minDescChars)
        checks.push({ level: "warning", message: `Description is short (${len} chars) - aim for ${limits.minDescChars}-${limits.maxDescChars}` });
      else checks.push({ level: "ok", message: `${len} characters - good length` });
    }
  }
  return checks;
}

/** Build a display breadcrumb-style URL like Google does */
export function displayUrl(rawUrl: string): { origin: string; segments: string[] } {
  try {
    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const segments = url.pathname.split("/").filter(Boolean).map((s) => s.replace(/-/g, " "));
    return { origin: url.host.replace(/^www\./, ""), segments };
  } catch {
    return { origin: rawUrl, segments: [] };
  }
}

export interface SerpValidation {
  titleChecks: SerpCheck[];
  descriptionChecks: SerpCheck[];
}

export function validateSerp(title: string, description: string, device: "desktop" | "mobile"): SerpValidation {
  return {
    titleChecks: checkSerpInput("title", title, device),
    descriptionChecks: checkSerpInput("description", description, device),
  };
}
