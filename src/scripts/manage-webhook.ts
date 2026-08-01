import { loadConfig } from "../config.js";

const config = loadConfig({ ...process.env, BOT_MODE: "http-only" });
if (!config.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required");

const command = process.argv[2] ?? "info";
const keepPending = process.argv.includes("--keep-pending");
const apiRoot = config.TELEGRAM_API_ROOT.replace(/\/$/, "");
const apiUrl = `${apiRoot}/bot${config.TELEGRAM_BOT_TOKEN}/`;

async function callTelegram(method: string, body?: Record<string, unknown>): Promise<unknown> {
  const request: RequestInit = { method: body ? "POST" : "GET" };
  if (body) {
    request.headers = { "content-type": "application/json" };
    request.body = JSON.stringify(body);
  }
  const response = await fetch(apiUrl + method, request);
  const payload = (await response.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!response.ok || !payload.ok) throw new Error(payload.description ?? "Telegram API request failed");
  return payload.result;
}

if (command === "set") {
  if (!config.PUBLIC_WEBHOOK_URL || !config.TELEGRAM_WEBHOOK_SECRET) {
    throw new Error("PUBLIC_WEBHOOK_URL and TELEGRAM_WEBHOOK_SECRET are required to set a webhook");
  }
  const result = await callTelegram("setWebhook", {
    url: `${config.PUBLIC_WEBHOOK_URL.replace(/\/$/, "")}/telegram/webhook`,
    secret_token: config.TELEGRAM_WEBHOOK_SECRET,
    drop_pending_updates: !keepPending,
  });
  console.log(result);
} else if (command === "delete") {
  console.log(await callTelegram("deleteWebhook", { drop_pending_updates: !keepPending }));
} else if (command === "info") {
  console.log(await callTelegram("getWebhookInfo"));
} else {
  throw new Error("Unknown command. Use set, delete, or info.");
}
