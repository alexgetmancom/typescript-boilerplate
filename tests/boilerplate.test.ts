import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createBot } from "../src/bot/bot.js";
import { handleStart } from "../src/bot/commands/start.js";
import type { AppContext } from "../src/bot/context.js";
import { loadConfig } from "../src/config.js";
import { migrateDatabase, openDatabase } from "../src/db/client.js";
import { users } from "../src/db/schema.js";
import { createHttpApp } from "../src/http.js";
import { redact } from "../src/logger.js";

describe("configuration", () => {
  it("loads HTTP-only configuration without a Telegram token", () => {
    const config = loadConfig({ BOT_MODE: "http-only", DATABASE_URL: ":memory:" });
    expect(config.BOT_MODE).toBe("http-only");
    expect(config.TELEGRAM_BOT_TOKEN).toBeUndefined();
    expect(config.PORT).toBe(8080);
  });

  it("rejects polling configuration without a Telegram token", () => {
    expect(() => loadConfig({ BOT_MODE: "polling" })).toThrow("TELEGRAM_BOT_TOKEN is required");
  });

  it("rejects malformed allowlist values", () => {
    expect(() => loadConfig({ BOT_MODE: "http-only", TELEGRAM_ALLOWED_USER_IDS: "abc" })).toThrow(
      "TELEGRAM_ALLOWED_USER_IDS",
    );
  });
});

describe("database and HTTP foundation", () => {
  it("migrates SQLite and serves health endpoints", async () => {
    const database = openDatabase(":memory:");
    migrateDatabase(database.db);
    const config = loadConfig({ BOT_MODE: "http-only", DATABASE_URL: ":memory:" });
    const app = createHttpApp(config, null, database.db);

    expect(database.db.select().from(users).all()).toEqual([]);
    expect((await app.request("/healthz")).status).toBe(200);
    expect(await (await app.request("/healthz")).text()).toBe("ok\n");
    expect((await app.request("/readyz")).status).toBe(200);
    expect(await (await app.request("/readyz")).text()).toBe("ready\n");

    database.close();
  });
});

describe("Telegram example command", () => {
  it("stores the Telegram user and replies", async () => {
    const database = openDatabase(":memory:");
    migrateDatabase(database.db);
    const reply = mock(() => Promise.resolve());
    const context = {
      db: database.db,
      from: { id: 42, first_name: "Test", username: "test_user", is_bot: false, language_code: "en" },
      reply,
    } as unknown as AppContext;

    await handleStart(context);

    const user = database.db.select().from(users).get();
    expect(user?.telegramId).toBe(42);
    expect(reply).toHaveBeenCalledWith("Hello, Test!");
    database.close();
  });

  it("constructs a grammY bot with a valid token", () => {
    const database = openDatabase(":memory:");
    const config = loadConfig({ BOT_MODE: "polling", TELEGRAM_BOT_TOKEN: "123456:token", DATABASE_URL: ":memory:" });
    const bot = createBot(config, database.db);
    expect(bot).toBeDefined();
    database.close();
  });
});

describe("logging safeguards", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it("redacts sensitive object keys recursively", () => {
    expect(redact({ token: "secret", nested: { password: "hidden", value: "kept" } })).toEqual({
      token: "[REDACTED]",
      nested: { password: "[REDACTED]", value: "kept" },
    });
  });
});
