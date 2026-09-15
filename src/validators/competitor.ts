import { z } from "zod";
import { KEYWORD_INTENTS } from "@/constants";
import { uuidSchema, websiteUrlSchema } from "./common";

export const addCompetitorSchema = z.object({
  domain: z.string().trim().min(3, "Domain is required").max(255),
  name: z.string().trim().max(200).optional().nullable(),
});

export const competitorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(["domain", "name", "created_at"]).default("created_at"),
  order: z.enum(["ASC", "DESC"]).default("DESC"),
});

export const competitorUrlSchema = z.object({
  url: websiteUrlSchema,
});

export const compareCompetitorsSchema = z.object({
  competitor_ids: z.array(uuidSchema).min(1, "Select at least one competitor").max(5),
});

export const contentGapQuerySchema = z.object({
  minVolume: z.coerce.number().int().min(0).max(100000000).optional(),
  maxDifficulty: z.coerce.number().int().min(0).max(100).optional(),
  intent: z.enum(KEYWORD_INTENTS).optional(),
  minCompetitors: z.coerce.number().int().min(1).max(10).optional(),
});

export type AddCompetitorInput = z.infer<typeof addCompetitorSchema>;
export type CompetitorListQuery = z.infer<typeof competitorListQuerySchema>;
export type CompareCompetitorsInput = z.infer<typeof compareCompetitorsSchema>;
export type ContentGapQuery = z.infer<typeof contentGapQuerySchema>;
