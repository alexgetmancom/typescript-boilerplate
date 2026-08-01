import type { Context } from "grammy";
import type { AppConfig } from "../config.js";
import type { DatabaseClient } from "../db/client.js";

export type AppContext = Context & {
  config: AppConfig;
  db: DatabaseClient;
};
