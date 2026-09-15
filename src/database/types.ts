import type { DataTypes, QueryInterface } from "sequelize";

export interface MigrationContext {
  queryInterface: QueryInterface;
  Sequelize: typeof DataTypes;
}

export interface MigrationParams {
  context: MigrationContext;
  name: string;
}

export type MigrationUp = (params: MigrationParams) => Promise<void>;
export type MigrationDown = (params: MigrationParams) => Promise<void>;

export interface MigrationModule {
  up: MigrationUp;
  down: MigrationDown;
}
