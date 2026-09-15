import type { MetadataRoute } from "next";
import { env } from "@/config/env";
import { TOOL_SLUGS } from "@/constants/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.APP_URL.replace(/\/$/, "");
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...TOOL_SLUGS.map(
      (slug): MetadataRoute.Sitemap[number] => ({
        url: `${base}/tools/${slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      })
    ),
    { url: `${base}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
