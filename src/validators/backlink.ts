import { z } from "zod";
import { BACKLINK_STATUSES, LINK_TYPES } from "@/constants";
import { paginationSchema } from "./common";

export const backlinkListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(500).optional(),
  status: z.enum(BACKLINK_STATUSES).optional(),
  link_type: z.enum(LINK_TYPES).optional(),
  anchor: z.string().trim().max(200).optional(),
  sort: z.enum(["first_seen", "last_seen", "created_at", "domain"]).default("first_seen"),
  order: z.enum(["ASC", "DESC"]).default("DESC"),
  view: z.enum(["all", "new", "lost", "referring-domains", "anchors"]).default("all"),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const backlinkRefreshSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export type BacklinkListQuery = z.infer<typeof backlinkListQuerySchema>;
export type BacklinkRefreshInput = z.infer<typeof backlinkRefreshSchema>;
