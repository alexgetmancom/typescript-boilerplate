import { Bot } from "grammy";
import type { AppConfig } from "../config.js";
import type { DatabaseClient } from "../db/client.js";
import { log } from "../logger.js";
import { handleStart } from "./commands/start.js";
import type { AppContext } from "./context.js";

export function createBot(config: AppConfig, db: DatabaseClient): Bot<AppContext> {
  if (!config.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to create a Telegram bot");
  }

  const bot = new Bot<AppContext>(config.TELEGRAM_BOT_TOKEN, {
    client: { apiRoot: config.TELEGRAM_API_ROOT },
  });

  bot.use(async (ctx, next) => {
    ctx.config = config;
    ctx.db = db;

    const allowedIds = config.TELEGRAM_ALLOWED_USER_IDS;
    if (allowedIds.length > 0 && (!ctx.from || !allowedIds.includes(ctx.from.id))) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery("Access denied");
      return;
    }

    await next();
  });

  bot.command("start", handleStart);
  bot.command("help", (ctx) => ctx.reply("Use /start to initialize the service."));

  bot.catch((error) => {
    log("error", "Telegram update failed", {
      updateId: error.ctx.update.update_id,
      error: error.error,
    });
  });

  return bot;
}
