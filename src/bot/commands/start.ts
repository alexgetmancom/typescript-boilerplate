import { users } from "../../db/schema.js";
import type { AppContext } from "../context.js";

export async function handleStart(ctx: AppContext): Promise<void> {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const now = new Date().toISOString();
  const userValues = {
    username: telegramUser.username ?? null,
    firstName: telegramUser.first_name,
    updatedAt: now,
  };

  ctx.db
    .insert(users)
    .values({ telegramId: telegramUser.id, ...userValues, createdAt: now })
    .onConflictDoUpdate({
      target: users.telegramId,
      set: userValues,
    })
    .run();

  await ctx.reply(`Hello, ${telegramUser.first_name || "there"}!`);
}
