import { z } from "zod";
import { websiteUrlSchema } from "./common";

/** Tool API input schemas */

export const redirectCheckSchema = z.object({
  url: websiteUrlSchema,
});

export const brokenLinksSchema = z.object({
  url: websiteUrlSchema,
  /** optional limit of unique links to verify per request */
  maxLinks: z.coerce.number().int().min(1).max(100).default(50),
});

export type RedirectCheckInput = z.infer<typeof redirectCheckSchema>;
export type BrokenLinksInput = z.infer<typeof brokenLinksSchema>;
