import { z } from "zod";

export const startAuditSchema = z.object({
  maxPages: z.coerce.number().int().min(1).max(5000).optional(),
  maxDepth: z.coerce.number().int().min(0).max(5).optional(),
});

export const auditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const issueListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  type: z.enum(["error", "warning", "notice"]).optional(),
  status: z.enum(["open", "fixed", "ignored"]).optional(),
});

export type StartAuditInputSchema = z.infer<typeof startAuditSchema>;
