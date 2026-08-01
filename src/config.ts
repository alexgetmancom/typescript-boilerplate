import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

const optionalSecret = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(32).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional(),
);

const allowedUserIds = z
  .string()
  .default("")
  .transform((value, context) => {
    if (value.trim() === "") return [];

    const ids = value.split(",").map((item) => Number(item.trim()));
    if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      context.addIssue({
        code: "custom",
        message: "TELEGRAM_ALLOWED_USER_IDS must contain positive integer IDs separated by commas",
      });
      return z.NEVER;
    }

    return ids;
  });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_NAME: z.string().min(1).default("typescript-boilerplate"),
    BOT_MODE: z.enum(["polling", "webhook", "http-only"]).default("polling"),
    TELEGRAM_BOT_TOKEN: optionalText,
    TELEGRAM_API_ROOT: z.string().url().default("https://api.telegram.org"),
    TELEGRAM_WEBHOOK_SECRET: optionalSecret,
    PUBLIC_WEBHOOK_URL: optionalUrl,
    TELEGRAM_ALLOWED_USER_IDS: allowedUserIds,
    DATABASE_URL: z.string().min(1).default("./data/app.db"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    BIND_HOST: z.string().min(1).default("127.0.0.1"),
  })
  .superRefine((data, context) => {
    if (data.BOT_MODE !== "http-only" && !data.TELEGRAM_BOT_TOKEN) {
      context.addIssue({
        code: "custom",
        path: ["TELEGRAM_BOT_TOKEN"],
        message: "TELEGRAM_BOT_TOKEN is required in polling and webhook modes",
      });
    }

    if (data.BOT_MODE === "webhook") {
      if (!data.TELEGRAM_WEBHOOK_SECRET) {
        context.addIssue({
          code: "custom",
          path: ["TELEGRAM_WEBHOOK_SECRET"],
          message: "TELEGRAM_WEBHOOK_SECRET is required in webhook mode",
        });
      }
      if (!data.PUBLIC_WEBHOOK_URL) {
        context.addIssue({
          code: "custom",
          path: ["PUBLIC_WEBHOOK_URL"],
          message: "PUBLIC_WEBHOOK_URL is required in webhook mode",
        });
      }
    }
  });

export type AppConfig = z.infer<typeof envSchema>;

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new ConfigurationError(`Configuration validation failed: ${details}`);
  }
  return result.data;
}
