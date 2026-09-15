import type { MetadataRoute } from "next";
import { env } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/projects/", "/admin/", "/settings/", "/billing/"],
      },
    ],
    sitemap: `${env.APP_URL.replace(/\/$/, "")}/sitemap.xml`,
  };
}
