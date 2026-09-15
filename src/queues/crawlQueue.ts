import { Queue, type JobsOptions } from "bullmq";
import { getRedis } from "@/config/redis";
import { logger } from "@/lib/logger";

export interface CrawlJobData {
  auditId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  maxPages?: number;
  maxDepth?: number;
}

const QUEUE_NAME = "seo-crawl";

let queue: Queue<CrawlJobData> | null = null;
let queueUnavailableLogged = false;

function getQueue(): Queue<CrawlJobData> | null {
  if (queue) return queue;
  const redis = getRedis();
  if (!redis) return null;
  try {
    queue = new Queue<CrawlJobData>(QUEUE_NAME, { connection: redis });
    queue.on("error", (err: Error) => logger.warn("crawl_queue_error", { error: err.message }));
    return queue;
  } catch (err) {
    if (!queueUnavailableLogged) {
      queueUnavailableLogged = true;
      logger.warn("crawl_queue_unavailable", { error: err instanceof Error ? err.message : String(err) });
    }
    return null;
  }
}

/** Enqueue a crawl job. Returns the BullMQ job id, or null when Redis is unavailable (caller runs inline). */
export async function enqueueCrawlJob(data: CrawlJobData, options?: JobsOptions): Promise<string | null> {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.add("crawl", data, {
      jobId: `audit-${data.auditId}`,
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 1,
      ...options,
    });
    return job.id ?? null;
  } catch (err) {
    logger.warn("crawl_enqueue_failed_falling_back_inline", {
      auditId: data.auditId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function getCrawlJobProgress(auditId: string): Promise<{ processed: number; total: number } | null> {
  const q = getQueue();
  if (!q) return null;
  try {
    const job = await q.getJob(`audit-${auditId}`);
    if (!job) return null;
    const progress = job.progress as { processed?: number; total?: number } | number | undefined;
    if (typeof progress === "object" && progress) {
      return { processed: progress.processed ?? 0, total: progress.total ?? 0 };
    }
    return null;
  } catch {
    return null;
  }
}
