import { connectDatabase } from "@/config/database";
import { isRedisAvailable } from "@/config/redis";
import { ok, withApi } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async () => {
    let database = false;
    try {
      await connectDatabase();
      database = true;
    } catch {
      database = false;
    }
    const redis = await isRedisAvailable();

    return ok({
      status: database ? "ok" : "degraded",
      database,
      redis,
      time: new Date().toISOString(),
    });
  },
  { auth: "none" }
);
