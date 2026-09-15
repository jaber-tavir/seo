import { z } from "zod";
import { PROJECT_STATUSES, SEARCH_ENGINES } from "@/constants";
import { nameSchema, websiteUrlSchema } from "./common";

export const createProjectSchema = z.object({
  name: nameSchema,
  website_url: websiteUrlSchema,
  country: z.string().trim().length(2, "Use a 2-letter country code").default("us"),
  language: z.string().trim().min(2).max(5).default("en"),
  search_engine: z.enum(SEARCH_ENGINES).default("google"),
  sitemap_url: z.string().trim().url("Sitemap must be a valid URL").max(2048).optional().or(z.literal("")),
});

export const updateProjectSchema = z.object({
  name: nameSchema.optional(),
  website_url: websiteUrlSchema.optional(),
  country: z.string().trim().length(2).optional(),
  language: z.string().trim().min(2).max(5).optional(),
  search_engine: z.enum(SEARCH_ENGINES).optional(),
  sitemap_url: z.string().trim().url().max(2048).nullable().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export type CreateProjectInputSchema = z.infer<typeof createProjectSchema>;
export type UpdateProjectInputSchema = z.infer<typeof updateProjectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
