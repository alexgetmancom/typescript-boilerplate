import { createBot } from "./bot/bot.js";
import { loadConfig } from "./config.js";
import { migrateDatabase, openDatabase } from "./db/client.js";
import { createHttpApp } from "./http.js";
import { log } from "./logger.js";
import { stopServerGracefully } from "./runtime/shutdown.js";
import { createRuntimeStatus } from "./runtime/status.js";
import { RuntimeSupervisor } from "./runtime/supervisor.js";

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
  const supervisor = new RuntimeSupervisor();
  const runtimeStatus = createRuntimeStatus(config.BOT_MODE);
  const app = createHttpApp(config, bot, database.db, runtimeStatus);
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

    await supervisor.stop();
    if (bot?.isRunning()) {
      await bot.stop();
    }
    await stopServerGracefully(server);
    database.close();
    log("info", "Service stopped");
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  if (config.BOT_MODE === "polling" && bot) {
    void bot
      .start({
        onStart: (botInfo) => {
          runtimeStatus.botReady = true;
          runtimeStatus.botError = null;
          log("info", "Telegram polling started", { username: botInfo.username });
        },
      })
      .catch(async (error) => {
        runtimeStatus.botReady = false;
        runtimeStatus.botError = error instanceof Error ? error.message : String(error);
        log("error", "Telegram polling stopped unexpectedly", { error });
        await shutdown("TELEGRAM_POLLING_FAILED");
        process.exitCode = 1;
      });
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
