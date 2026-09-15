import { z } from "zod";

/** Shared building blocks for validators */

export const uuidSchema = z.string().uuid("Invalid identifier");

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Email is required")
  .max(255)
  .email("Please enter a valid email address")
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const nameSchema = z.string().trim().min(1, "Name is required").max(100);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const websiteUrlSchema = z
  .string()
  .trim()
  .min(4, "Website URL is required")
  .max(2048)
  .refine((value) => {
    try {
      const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      const url = new URL(withProtocol);
      return url.hostname.includes(".") || url.hostname === "localhost";
    } catch {
      return false;
    }
  }, "Please enter a valid URL (e.g. https://example.com)");
