import { describe, expect, it } from "vitest";
import { classifyIp, classifyIpv4, isBlockedHostname } from "@/services/crawler/ssrf";

describe("SSRF protection", () => {
  it("blocks loopback and private IPv4 ranges", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.4.9", "172.31.255.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "255.255.255.255"]) {
      expect(classifyIpv4(ip), ip).not.toBeNull();
    }
  });

  it("allows public IPv4 addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "151.101.1.69"]) {
      expect(classifyIpv4(ip), ip).toBeNull();
    }
  });

  it("blocks IPv6 loopback, link-local, unique-local and documentation ranges", () => {
    for (const ip of ["::1", "fe80::1", "fc00::1", "fd00::5", "2001:db8::1", "ff02::1", "::ffff:127.0.0.1"]) {
      expect(classifyIp(ip), ip).not.toBeNull();
    }
  });

  it("allows public IPv6 addresses", () => {
    expect(classifyIp("2606:4700:4700::1111")).toBeNull();
    expect(classifyIp("2001:4860:4860::8888")).toBeNull();
  });

  it("blocks dangerous hostnames", () => {
    expect(isBlockedHostname("localhost")).not.toBeNull();
    expect(isBlockedHostname("foo.localhost")).not.toBeNull();
    expect(isBlockedHostname("host.internal")).not.toBeNull();
    expect(isBlockedHostname("metadata.google.internal")).not.toBeNull();
  });

  it("blocks IP literals passed as hostnames", () => {
    expect(isBlockedHostname("127.0.0.1")).not.toBeNull();
    expect(isBlockedHostname("169.254.169.254")).not.toBeNull();
    expect(isBlockedHostname("::1")).not.toBeNull();
  });

  it("allows normal public hostnames", () => {
    expect(isBlockedHostname("example.com")).toBeNull();
    expect(isBlockedHostname("sub.example.co.uk")).toBeNull();
  });
});
