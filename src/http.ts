import { sql } from "drizzle-orm";
import type { Bot } from "grammy";
import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { logger } from "hono/logger";
import type { AppContext } from "./bot/context.js";
import type { AppConfig } from "./config.js";
import type { DatabaseClient } from "./db/client.js";
import { log } from "./logger.js";
import type { RuntimeStatus } from "./runtime/status.js";

export function createHttpApp(
  config: AppConfig,
  bot: Bot<AppContext> | null,
  db: DatabaseClient,
  runtimeStatus: RuntimeStatus,
): Hono {
  const app = new Hono();

  if (config.NODE_ENV !== "production") app.use("*", logger());

  app.get("/", (context) =>
    context.json({
      name: config.APP_NAME,
      status: "ok",
    }),
  );

  app.get("/healthz", (context) => context.text("ok\n"));

  app.get("/readyz", (context) => {
    try {
      db.run(sql.raw("SELECT 1"));
    } catch (error) {
      log("error", "Readiness check failed", { error });
      return context.text("error\n", 500);
    }

    if (config.BOT_MODE === "polling" && !runtimeStatus.botReady) {
      log("warn", "Readiness check failed: Telegram polling is not ready", {
        error: runtimeStatus.botError,
      });
      return context.text("not ready\n", 503);
    }

    return context.text("ready\n");
  });

  if (config.BOT_MODE === "webhook" && bot) {
    const secretToken = config.TELEGRAM_WEBHOOK_SECRET;
    if (!secretToken) throw new Error("TELEGRAM_WEBHOOK_SECRET is required in webhook mode");

    app.post(
      "/telegram/webhook",
      webhookCallback(bot, "hono", {
        secretToken,
      }),
    );
  }

  app.onError((error, context) => {
    log("error", "Unhandled HTTP error", { error, path: context.req.path });
    return context.json({ error: "Internal Server Error" }, 500);
  });

  return app;
}
