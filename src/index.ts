import { createBot } from "./bot/bot.js";
import { loadConfig } from "./config.js";
import { migrateDatabase, openDatabase } from "./db/client.js";
import { createHttpApp } from "./http.js";
import { log } from "./logger.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const database = openDatabase(config.DATABASE_URL);

  try {
    migrateDatabase(database.db);
  } catch (error) {
    database.close();
    log("error", "Database migration failed", { error });
    throw error;
  }

  const bot = config.BOT_MODE === "http-only" ? null : createBot(config, database.db);
  const app = createHttpApp(config, bot, database.db);
  const server = Bun.serve({
    fetch: app.fetch,
    hostname: config.BIND_HOST,
    port: config.PORT,
  });

  let stopping = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    log("info", "Stopping service", { signal });

    if (bot?.isRunning()) {
      await bot.stop();
    }
    await server.stop(true);
    database.close();
    log("info", "Service stopped");
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  if (config.BOT_MODE === "polling" && bot) {
    void bot
      .start({
        onStart: (botInfo) => log("info", "Telegram polling started", { username: botInfo.username }),
      })
      .catch((error) => log("error", "Telegram polling stopped unexpectedly", { error }));
  } else if (config.BOT_MODE === "webhook") {
    log("info", "Telegram webhook mode enabled");
  } else {
    log("info", "HTTP-only mode enabled");
  }

  log("info", "HTTP server listening", {
    address: `http://${config.BIND_HOST}:${config.PORT}`,
    mode: config.BOT_MODE,
  });
}

void main().catch((error) => {
  log("error", "Service startup failed", { error });
  process.exitCode = 1;
});
