# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm workspace orchestrated by Turborepo. `apps/api` contains the AdonisJS 7 backend: HTTP concerns live in `app/controllers`, business logic in `app/services`, persistence models in `app/models`, validation in `app/validators`, and routes/configuration in `start` and `config`. Database migrations and seeders are under `apps/api/database`. `apps/web` is a TanStack Start React application; keep file-based routes in `src/routes`, feature code in `src/features`, and reusable app-level components in `src/components`. Shared UI primitives and theme CSS belong in `packages/ui`. API tests are split between `apps/api/tests/unit` and `apps/api/tests/functional`.

## Build, Test, and Development Commands

Use Node.js 24+ and pnpm 10.33.3.

- `pnpm install` installs all workspace dependencies.
- `pnpm dev` starts workspace development tasks; the web app uses port 3000 and the API defaults to 3333.
- `pnpm build` builds all packages in dependency order.
- `pnpm test` builds dependencies, then runs configured tests.
- `pnpm typecheck` runs TypeScript checks across workspaces.
- `pnpm check` runs Biome validation; `pnpm checkwrite` applies safe formatting/lint fixes.
- `pnpm --filter api db:migrate:run` applies backend migrations.

## Coding Style & Naming Conventions

Write TypeScript with two-space indentation, single quotes, and organized imports; Biome enforces these rules with a 180-character line width. Use kebab-case filenames such as `video-service.ts`, PascalCase for React components and classes, and camelCase for functions and variables. Prefer configured aliases (`#/` in web, `#services/*`, `#models/*`, and similar in API) over long relative imports. Do not edit generated files such as `apps/web/src/routeTree.gen.ts` or `apps/api/.adonisjs/**` manually.

## Testing Guidelines

Backend tests use Japa and follow `*.spec.ts`. Put isolated logic tests in `tests/unit`; use `tests/functional` for HTTP behavior. Run one workspace with `pnpm --filter api test`. No coverage threshold or frontend test suite is currently configured, so add focused regression coverage for backend behavior and document manual web verification in the PR.

## Commit & Pull Request Guidelines

History currently contains only an `init` commit, so no formal convention is established. Use concise, imperative commit subjects and keep each commit focused. PRs should explain the user-visible or API impact, list validation commands, link relevant issues, call out migrations or environment changes, and include screenshots for UI changes.

## Security & Configuration

Copy values from `apps/api/.env.example` into an ignored local `.env`. Never commit `APP_KEY`, credentials, tokens, or provider secrets. Review CORS, Redis, database, and queue settings when changing deployment behavior.
