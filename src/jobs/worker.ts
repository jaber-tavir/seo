import { startCrawlWorker, stopCrawlWorker } from "@/jobs/crawlWebsite";
import { logger } from "@/lib/logger";

async function main() {
  const worker = startCrawlWorker();
  if (!worker) {
    logger.error("worker_exit_no_redis");
    process.exit(1);
  }
  logger.info("crawl_worker_running");

  const shutdown = async (signal: string) => {
    logger.info("worker_shutdown", { signal });
    await stopCrawlWorker();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
