import { z } from "zod";
import { CONTENT_STATUSES, KEYWORD_INTENTS } from "@/constants";
import { keywordTextSchema } from "./keyword";
import { paginationSchema } from "./common";

const toneSchema = z.string().trim().min(2).max(50).optional();
const textSchema = z.string().trim().min(3, "Text is required").max(50000);

// ---------------------------------------------------------------- AI tools

export const aiTitleSchema = z.object({
  keyword: keywordTextSchema,
  tone: toneSchema,
  count: z.coerce.number().int().min(1).max(5).optional(),
});

export const aiDescriptionSchema = z.object({
  keyword: keywordTextSchema,
  target: z.string().trim().max(2048).optional(),
  count: z.coerce.number().int().min(1).max(3).optional(),
});

export const aiOutlineSchema = z.object({
  keyword: keywordTextSchema,
  intent: z.enum(KEYWORD_INTENTS).optional(),
  sections: z.coerce.number().int().min(3).max(10).optional(),
});

export const aiFaqSchema = z.object({
  topic: keywordTextSchema,
  count: z.coerce.number().int().min(1).max(10).optional(),
});

export const aiRewriteSchema = z.object({
  text: textSchema,
  tone: toneSchema,
});

export const aiTransformTextSchema = z.object({
  text: textSchema,
  targetLength: z.coerce.number().int().min(20).max(2000).optional(),
});

// ---------------------------------------------------------------- Briefs & content

export const createBriefSchema = z.object({
  keyword: keywordTextSchema,
  search_intent: z.string().trim().max(50).optional(),
  suggested_title: z.string().trim().max(500).optional(),
  outline: z.string().max(50000).optional(),
  competitor_urls: z.array(z.string().url()).max(20).optional(),
  related_keywords: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  questions: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
});

export const contentListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  sort: z.enum(["created_at", "updated_at", "title"]).default("updated_at"),
  order: z.enum(["ASC", "DESC"]).default("DESC"),
});

export const createContentSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(500),
  content: z.string().max(200000).optional().nullable(),
  meta_title: z.string().trim().max(255).optional().nullable(),
  meta_description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(CONTENT_STATUSES).optional(),
  brief_id: z.string().uuid().optional().nullable(),
});

export const updateContentSchema = createContentSchema.partial();

export type AiTitleInput = z.infer<typeof aiTitleSchema>;
export type AiDescriptionInput = z.infer<typeof aiDescriptionSchema>;
export type AiOutlineInput = z.infer<typeof aiOutlineSchema>;
export type AiFaqInput = z.infer<typeof aiFaqSchema>;
export type AiRewriteInput = z.infer<typeof aiRewriteSchema>;
export type AiTransformTextInput = z.infer<typeof aiTransformTextSchema>;
export type CreateBriefInput = z.infer<typeof createBriefSchema>;
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;
export type CreateContentInput = z.infer<typeof createContentSchema>;

// Missing schemas used by route handlers

export const generateContentSchema = z.object({
  tone: z.string().trim().min(2).max(50).optional(),
  language: z.string().trim().min(2).max(10).optional(),
  guidelines: z.string().trim().max(2000).optional(),
})

export const contentBriefUpdateSchema = z.object({
  keyword: keywordTextSchema.optional(),
  search_intent: z.string().trim().max(50).optional(),
  suggested_title: z.string().trim().max(500).optional(),
  outline: z.string().max(50000).optional(),
  competitor_urls: z.array(z.string().url()).optional(),
  related_keywords: z.array(z.string().trim().min(1).max(200)).optional(),
  questions: z.array(z.string().trim().min(1).max(500)).optional(),
})

export const aiToolSchema = z.object({
  keyword: keywordTextSchema,
  search_intent: z.string().trim().max(50).optional(),
  tone: z.string().trim().min(2).max(50).optional(),
  language: z.string().trim().min(2).max(10).optional(),
  outline: z.string().max(50000).optional(),
  competitor_urls: z.array(z.string().url()).optional(),
  related_keywords: z.array(z.string().trim().min(1).max(200)).optional(),
  questions: z.array(z.string().trim().min(1).max(500)).optional(),
})

export type GenerateContentInput = z.infer<typeof generateContentSchema>
export type ContentBriefUpdateInput = z.infer<typeof contentBriefUpdateSchema>
export type AiToolInput = z.infer<typeof aiToolSchema>

export type UpdateContentInput = z.infer<typeof updateContentSchema>;

/** Creating a document needs the owning project (authorized server-side). */
export const createContentWithProjectSchema = createContentSchema.extend({
  project_id: z.string().uuid("Invalid project"),
});

export type CreateContentWithProjectInput = z.infer<typeof createContentWithProjectSchema>;

// ---------------------------------------------------------------- AI tool dispatcher

/** Every AI content tool the platform exposes. */
export const AI_TOOLS = [
  "title",
  "description",
  "outline",
  "faq",
  "rewrite",
  "expand",
  "shorten",
  "brief",
  "content",
] as const;

export type AiTool = (typeof AI_TOOLS)[number];

export const aiToolRequestSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("title") }).merge(aiTitleSchema),
  z.object({ tool: z.literal("description") }).merge(aiDescriptionSchema),
  z.object({ tool: z.literal("outline") }).merge(aiOutlineSchema),
  z.object({ tool: z.literal("faq") }).merge(aiFaqSchema),
  z.object({ tool: z.literal("rewrite") }).merge(aiRewriteSchema),
  z.object({ tool: z.literal("expand") }).merge(aiTransformTextSchema),
  z.object({ tool: z.literal("shorten") }).merge(aiTransformTextSchema),
  z.object({ tool: z.literal("brief") }).merge(aiToolSchema),
  z.object({ tool: z.literal("content") }).merge(aiToolSchema),
]);

export type AiToolRequest = z.infer<typeof aiToolRequestSchema>;

export const readabilitySchema = z.object({
  text: textSchema,
});

export type ReadabilityInput = z.infer<typeof readabilitySchema>;