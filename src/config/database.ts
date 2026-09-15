import { Sequelize } from "sequelize";
import { env } from "./env";
import { logger } from "@/lib/logger";

/**
 * Primary MySQL connection.
 * All database access goes through Sequelize - never raw connections.
 */
export const sequelize = new Sequelize(env.DATABASE_NAME, env.DATABASE_USERNAME, env.DATABASE_PASSWORD, {
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  dialect: "mysql",
  logging: env.isDevelopment ? (sql: string) => logger.debug(sql) : false,
  timezone: "+00:00", // store & read dates in UTC
  define: {
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  },
  pool: {
    max: env.DATABASE_POOL_MAX,
    min: 0,
    idle: 10000,
    acquire: 60000,
  },
  dialectOptions: {
    decimalNumbers: true, // return DECIMAL as JS number
  },
});

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
  logger.info("Database connection established", {
    database: env.DATABASE_NAME,
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await sequelize.close();
  logger.info("Database connection closed");
}
