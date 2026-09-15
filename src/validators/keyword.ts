import { z } from "zod";
import { COMPETITIONS, DEVICES, KEYWORD_INTENTS, SEARCH_ENGINES } from "@/constants";
import { paginationSchema } from "./common";

export const keywordTextSchema = z
  .string()
  .trim()
  .min(2, "Keyword must be at least 2 characters")
  .max(255, "Keyword is too long")
  .refine((v) => !/^https?:\/\//i.test(v), "Enter a keyword, not a URL");

const localeSchema = z.object({
  country: z.string().trim().length(2, "Use a 2-letter country code").default("us"),
  language: z.string().trim().min(2).max(5).default("en"),
});

export const researchSchema = z.object({
  keyword: keywordTextSchema,
  country: z.string().trim().length(2).default("us"),
  language: z.string().trim().min(2).max(5).default("en"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const trackKeywordSchema = localeSchema.extend({
  keyword: keywordTextSchema,
  search_engine: z.enum(SEARCH_ENGINES).default("google"),
  device: z.enum(DEVICES).default("desktop"),
});

export const trackKeywordsBulkSchema = z.object({
  keywords: z.array(keywordTextSchema).min(1).max(100),
  country: z.string().trim().length(2).default("us"),
  language: z.string().trim().min(2).max(5).default("en"),
  search_engine: z.enum(SEARCH_ENGINES).default("google"),
  device: z.enum(DEVICES).default("desktop"),
});

export const keywordListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  intent: z.enum(KEYWORD_INTENTS).optional(),
  competition: z.enum(COMPETITIONS).optional(),
  sort: z.enum(["keyword", "search_volume", "difficulty", "cpc", "created_at"]).default("created_at"),
  order: z.enum(["ASC", "DESC"]).default("DESC"),
});

export const rankCheckSchema = z.object({
  search_engine: z.enum(SEARCH_ENGINES).default("google"),
  device: z.enum(DEVICES).default("desktop"),
  country: z.string().trim().length(2).default("us"),
  city: z.string().trim().max(100).optional(),
  language: z.string().trim().min(2).max(5).default("en"),
});

export const clusterSchema = z.object({
  keywords: z.array(keywordTextSchema).min(2).max(200),
});

export type ResearchInput = z.infer<typeof researchSchema>;
export type TrackKeywordInput = z.infer<typeof trackKeywordSchema>;
export type TrackKeywordsBulkInput = z.infer<typeof trackKeywordsBulkSchema>;
export type KeywordListQuery = z.infer<typeof keywordListQuerySchema>;
export type RankCheckInput = z.infer<typeof rankCheckSchema>;
export type ClusterInput = z.infer<typeof clusterSchema>;
