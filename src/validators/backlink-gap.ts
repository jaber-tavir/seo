import { z } from "zod";

export const backlinkGapSchema = z.object({
  competitor_domains: z.array(z.string().trim().min(3).max(255)).min(1).max(5),
});

export type BacklinkGapInput = z.infer<typeof backlinkGapSchema>;
