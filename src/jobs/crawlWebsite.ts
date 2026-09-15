import { Worker, type Job } from "bullmq";
import { getRedis } from "@/config/redis";
import { logger } from "@/lib/logger";
import { auditService } from "@/services/AuditService";
import type { CrawlJobData } from "@/queues/crawlQueue";

/**
 * BullMQ crawl worker.
 * Run as a separate process: `npm run worker:crawl` (see package.json).
 * Falls back gracefully when Redis is unavailable (API uses inline crawl).
 */

let worker: Worker<CrawlJobData> | null = null;

export function startCrawlWorker(): Worker<CrawlJobData> | null {
  if (worker) return worker;
  const redis = getRedis();
  if (!redis) {
    logger.warn("crawl_worker_no_redis");
    return null;
  }

  worker = new Worker<CrawlJobData>(
    "seo-crawl",
    async (job: Job<CrawlJobData>) => {
      const { auditId, maxPages, maxDepth } = job.data;
      logger.info("crawl_job_started", { auditId, jobId: job.id });
      await job.updateProgress({ processed: 0, total: maxPages ?? 0 });
      try {
        await auditService.runCrawl(auditId, maxPages ?? 100, maxDepth ?? 2);
        await job.updateProgress({ processed: maxPages ?? 0, total: maxPages ?? 0 });
        logger.info("crawl_job_completed", { auditId, jobId: job.id });
      } catch (err) {
        logger.error("crawl_job_failed", { auditId, jobId: job.id, error: err });
        throw err;
      }
    },
    { connection: redis, concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    logger.error("crawl_worker_job_failed", { jobId: job?.id, error: err.message });
  });

  return worker;
}

export async function stopCrawlWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
