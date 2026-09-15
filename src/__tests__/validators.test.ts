import { describe, expect, it } from "vitest";
import { createProjectSchema, updateProjectSchema } from "@/validators/project";
import { loginSchema, registerSchema, resetPasswordSchema } from "@/validators/auth";

describe("auth validators", () => {
  it("accepts a valid registration", () => {
    const parsed = registerSchema.safeParse({
      first_name: "Jane",
      last_name: "Doe",
      email: "Jane@Example.com",
      password: "Password123",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("jane@example.com"); // normalized lowercase
    }
  });

  it("rejects weak passwords", () => {
    expect(registerSchema.safeParse({ first_name: "J", email: "a@b.co", password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ first_name: "J", email: "a@b.co", password: "12345678" }).success).toBe(false); // no letter
    expect(registerSchema.safeParse({ first_name: "J", email: "a@b.co", password: "abcdefgh" }).success).toBe(false); // no number
  });

  it("rejects invalid emails", () => {
    expect(registerSchema.safeParse({ first_name: "J", email: "not-an-email", password: "Password123" }).success).toBe(false);
  });

  it("requires password on login", () => {
    expect(loginSchema.safeParse({ email: "a@b.co" }).success).toBe(false);
  });

  it("validates reset payloads", () => {
    expect(resetPasswordSchema.safeParse({ token: "tok123456789", password: "Password123" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "x", password: "Password123" }).success).toBe(false);
  });
});

describe("project validators", () => {
  it("accepts a valid project", () => {
    const parsed = createProjectSchema.safeParse({ name: "My Site", website_url: "https://example.com" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.country).toBe("us");
      expect(parsed.data.search_engine).toBe("google");
    }
  });

  it("accepts bare domains and adds protocol on service layer", () => {
    const parsed = createProjectSchema.safeParse({ name: "My Site", website_url: "example.com" });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(createProjectSchema.safeParse({ name: "X", website_url: "::::" }).success).toBe(false);
    expect(createProjectSchema.safeParse({ name: "X", website_url: "" }).success).toBe(false);
  });

  it("rejects bad statuses on update", () => {
    expect(updateProjectSchema.safeParse({ status: "exploded" }).success).toBe(false);
    expect(updateProjectSchema.safeParse({ status: "paused" }).success).toBe(true);
  });
});
