import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema.js";

export type DatabaseClient = BunSQLiteDatabase<typeof schema>;

export type OpenDatabase = {
  sqlite: Database;
  db: DatabaseClient;
  close: () => void;
};

export function openDatabase(databasePath: string): OpenDatabase {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  }

  const sqlite = new Database(databasePath, { create: true, strict: true });
  sqlite.run("PRAGMA busy_timeout = 5000");
  if (databasePath !== ":memory:") sqlite.run("PRAGMA journal_mode = WAL");
  sqlite.run("PRAGMA foreign_keys = ON");

  const db = drizzle(sqlite, { schema, casing: "snake_case" });
  return { sqlite, db, close: () => sqlite.close() };
}

export function migrateDatabase(db: DatabaseClient, migrationsFolder = resolve(process.cwd(), "drizzle")): void {
  migrate(db, { migrationsFolder });
}
