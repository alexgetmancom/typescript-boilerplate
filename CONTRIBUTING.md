# Contributing

## Development setup

1. Install Bun 1.3.14 or a compatible newer 1.x release.
2. Install dependencies with `bun install`.
3. Copy `.env.example` to `.env` for local configuration.
4. Run `bun run check` before opening a pull request.

Keep source code, tests, comments, logs, and documentation in English. Russian is reserved for product content and locale data in projects created from this template.

## Database changes

Update `src/db/schema.ts`, generate the migration with `bun run db:generate`, and include the generated files in the same change. Do not edit an existing migration that may already have been applied elsewhere.

## Pull requests

Keep pull requests focused and explain the operational impact of runtime or deployment changes. Do not commit `.env`, database files, logs, build output, or credentials.
