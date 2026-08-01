import { eq } from "drizzle-orm";
import { users } from "../../db/schema.js";
import type { AppContext } from "../context.js";

export async function handleStart(ctx: AppContext): Promise<void> {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const now = new Date().toISOString();
  const existing = ctx.db.select().from(users).where(eq(users.telegramId, telegramUser.id)).get();
  const values = {
    telegramId: telegramUser.id,
    username: telegramUser.username ?? null,
    firstName: telegramUser.first_name,
    updatedAt: now,
  };

  if (existing) {
    ctx.db.update(users).set(values).where(eq(users.telegramId, telegramUser.id)).run();
  } else {
    ctx.db
      .insert(users)
      .values({ ...values, createdAt: now })
      .run();
  }

  await ctx.reply(`Hello, ${telegramUser.first_name || "there"}!`);
}
