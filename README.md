# TypeScript Boilerplate

A Bun-first foundation for Telegram bots, small HTTP services, scheduled workers, and SQLite-backed automation projects.

The template contains infrastructure and one deliberately small example domain. Replace the example command and schema with project-specific code when starting a new application.

## Included

- Bun and strict TypeScript configuration.
- Hono HTTP server with liveness and readiness endpoints.
- grammY Telegram bot with polling, webhook, and HTTP-only modes.
- Drizzle ORM with Bun SQLite, WAL mode, busy timeout, foreign keys, and migrations.
- Zod environment validation.
- Structured application logging with sensitive-value redaction.
- Graceful shutdown for the HTTP server, bot, and database.
- A small interval-worker helper for future background jobs.
- Biome formatting and linting.
- Bun tests.
- Docker and Docker Compose.
- GitHub Actions validation.
- MIT license.

## Project structure

    src/
      bot/
        commands/
        context.ts
        bot.ts
      db/
        client.ts
        schema.ts
      runtime/
        supervisor.ts
        worker.ts
      scripts/
        migrate.ts
        manage-webhook.ts
      config.ts
      http.ts
      logger.ts
      index.ts
    tests/
    drizzle/

The users table and the /start command are examples of a thin application layer. They are intentionally easy to remove or replace.

Background workers should be registered with RuntimeSupervisor so shutdown waits for their active cycle before the database is closed.

## Local development

1. Copy .env.example to .env.
2. Set TELEGRAM_BOT_TOKEN if using polling or webhook mode.
3. Install dependencies:

    bun install

4. Apply migrations:

    bun run db:migrate

5. Start the development server:

    bun run dev

The HTTP server listens on http://127.0.0.1:8080 by default.

## Runtime modes

BOT_MODE accepts three values:

- polling: starts the Telegram bot with long polling and serves HTTP health endpoints.
- webhook: serves the Telegram callback at /telegram/webhook and serves HTTP health endpoints.
- http-only: disables Telegram and runs only the HTTP service.

For webhook mode, set both PUBLIC_WEBHOOK_URL and a TELEGRAM_WEBHOOK_SECRET with at least 32 characters. The webhook URL should point to /telegram/webhook.

If TELEGRAM_ALLOWED_USER_IDS is non-empty, it must contain a comma-separated list of Telegram user IDs. Updates from other users are ignored.

## Commands

    bun run dev             Development server with file watching
    bun run build           Production TypeScript build
    bun run start           Run the production build
    bun run typecheck       TypeScript only
    bun run lint            Biome check
    bun run test            Bun test runner
    bun run check           Lint, typecheck, tests, and build
    bun run db:generate     Generate Drizzle migrations
    bun run db:migrate      Apply migrations to DATABASE_URL

## Webhook management

The optional helper can register, remove, and inspect the Telegram webhook:

    bun run webhook -- set
    bun run webhook -- set --keep-pending
    bun run webhook -- info
    bun run webhook -- delete

## Docker

Create .env with DATABASE_URL=/app/data/app.db, then run:

    docker compose up -d --build

The container runs as the non-root bun user and persists SQLite data in the local data directory.

Compose sets NODE_ENV to production and defaults BOT_MODE to http-only unless it is explicitly set in .env.
The checked-in .env.example is aimed at local polling development, so change BOT_MODE to http-only before running Compose without Telegram credentials.

## Deployment constraints

The default database setup is intended for one running application instance. SQLite WAL mode improves local concurrency, but it does not turn a bind-mounted SQLite file into a horizontally scalable shared database.

Startup migrations are appropriate for a single container or VPS process. If a project needs multiple application replicas, move migrations into a separate deployment step and use a database designed for that topology, such as PostgreSQL or a managed libSQL-compatible service.

The liveness endpoint at /healthz only checks that the HTTP process is alive. In polling mode, /readyz also stays unavailable until the Telegram bot has started successfully.

## Starting a new project from this template

1. Copy the repository or use it as a GitHub template.
2. Rename the package and update APP_NAME.
3. Replace the example schema and /start handler.
4. Keep the runtime, integration, and operational conventions unless the project has a documented reason to diverge.
5. Add domain services behind typed boundaries so external APIs can be tested with fixtures.
