# Project Guidelines

## Documentation Workflow

- `docs/` is the project's only source of truth for implemented features, architecture, and development conventions. Start every task by reading [the chapter index](docs/00-index.md), then the chapters relevant to the task.
- Before editing, identify each affected feature's owning chapter and read applicable nested `AGENTS.md` instructions. Follow [project structure](docs/01-architecture.md) and [development conventions](docs/09-development.md).
- Keep features and documentation in one-to-one correspondence: each feature has one owning chapter; reference that chapter rather than duplicating facts elsewhere.
- After completing work, compare the implementation with the relevant chapters. Update documentation for added, changed, or removed behavior; add new chapters to `docs/00-index.md`. If behavior is unchanged, verify the documentation and leave it untouched.
- Keep documentation concise: purpose, main flow, important boundaries, and implementation entry points. Do not duplicate source code, full API schemas, or generated files.
- README files are navigation only, and `plans/` contains historical proposals, not current specifications. Keep project facts in `docs/`.
- If documentation and code disagree, investigate and surface the discrepancy before changing behavior; synchronize the verified outcome rather than blindly trusting either version.
- In the final handoff, state relevant validation and whether documentation was updated or checked without changes.

## Mandatory Safeguards

- AdonisJS has its own CLI tooling; before creating a new file, check for an available generator. See the [Ace documentation](https://docs.adonisjs.com/guides/ace/introduction).
- The project uses the AdonisJS type-safe API client; after backend changes, run `pnpm --filter api dev` to regenerate `.adonisjs`. Documentation-only changes do not require this. See the [API client documentation](https://docs.adonisjs.com/guides/frontend/api-client).
- Models inherit from migration-generated schemas. Never manually edit generated schema files, `apps/api/.adonisjs/**`, or `apps/web/src/routeTree.gen.ts`.
- **Do not run any database-related operations**, including migrations, seeders, data scripts, or tests that access the database. If needed, inform the user and continue subsequent work after the user completes those steps.
- Never commit `APP_KEY`, credentials, tokens, or provider secrets. Review CORS, Redis, database, and queue configuration when changing deployment behavior.
