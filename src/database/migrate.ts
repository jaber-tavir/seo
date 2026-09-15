import "dotenv/config";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DataTypes, QueryTypes, type QueryInterface } from "sequelize";
import { Umzug } from "umzug";
import { sequelize } from "@/config/database";
import { logger } from "@/lib/logger";

/**
 * TypeScript-first Sequelize migration runner (Umzug).
 * `npm run migrate` / `migrate:undo` / `migrate:status`
 *
 * Production schema management is migrations-only - never `sequelize.sync()`.
 */

const META_TABLE = "SequelizeMeta";
const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Minimal migration storage interface (Umzug contract) */
interface MigrationStorage {
  logMigration(params: { name: string }): Promise<void>;
  unlogMigration(params: { name: string }): Promise<void>;
  executed(): Promise<string[]>;
}

/** Sequelize-backed migration storage (like sequelize-cli's) */
class SequelizeMetaStorage implements MigrationStorage {
  private async ensureTable(): Promise<void> {
    const qi: QueryInterface = sequelize.getQueryInterface();
    const tables = await qi.showAllTables();
    const exists = tables.some(
      (t) => String(typeof t === "string" ? t : (t as { tableName?: string }).tableName).toLowerCase() === META_TABLE.toLowerCase()
    );
    if (exists) return;
    await qi.createTable(META_TABLE, {
      name: { type: "VARCHAR(255)", allowNull: false, primaryKey: true },
    });
  }

  async logMigration({ name }: { name: string }): Promise<void> {
    await sequelize.query(`INSERT INTO \`${META_TABLE}\` (\`name\`) VALUES (:name)`, {
      replacements: { name },
    });
  }

  async unlogMigration({ name }: { name: string }): Promise<void> {
    await sequelize.query(`DELETE FROM \`${META_TABLE}\` WHERE \`name\` = :name`, {
      replacements: { name },
    });
  }

  async executed(): Promise<string[]> {
    await this.ensureTable();
    const rows = await sequelize.query<{ name: string }>(`SELECT \`name\` FROM \`${META_TABLE}\``, {
      type: QueryTypes.SELECT,
    });
    return rows.map((r) => r.name).sort();
  }
}

const umzug = new Umzug({
  migrations: {
    glob: ["migrations/*.ts", { cwd: dirname }],
    resolve: ({ name, path: migrationPath }) => {
      if (!migrationPath) {
        throw new Error(`Unable to resolve migration file for "${name}"`);
      }
      return {
        name: name ?? path.basename(migrationPath),
        up: async (params: unknown) => {
          const mod = await import(pathToFileURL(migrationPath!).href);
          return mod.up(params);
        },
        down: async (params: unknown) => {
          const mod = await import(pathToFileURL(migrationPath!).href);
          return mod.down?.(params);
        },
      };
    },
  },
  context: { queryInterface: sequelize.getQueryInterface(), Sequelize: DataTypes },
  storage: new SequelizeMetaStorage(),
  logger: undefined,
});

async function main() {
  const command = process.argv[2] ?? "up";

  try {
    await sequelize.authenticate();

    if (command === "up") {
      const migrations = await umzug.up();
      console.log(`Executed ${migrations.length} migration(s)`);
      migrations.forEach((m) => console.log(`  OK  ${m.name}`));
    } else if (command === "down") {
      const migrations = await umzug.down();
      console.log(`Reverted ${migrations.length} migration(s)`);
      migrations.forEach((m) => console.log(`  UNDO  ${m.name}`));
    } else if (command === "status") {
      const executed = await umzug.executed();
      const pending = await umzug.pending();
      console.log("Executed:");
      executed.forEach((m) => console.log(`  OK  ${m.name}`));
      console.log("Pending:");
      pending.forEach((m) => console.log(`  --  ${m.name}`));
    } else {
      console.error(`Unknown command "${command}". Use: up | down | status`);
      process.exitCode = 1;
    }
  } catch (err) {
    logger.error("migration_failed", { error: err });
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

void main();
