# Full Story

A self-hostable, opinionated issue tracker for product and engineering teams.
Linear-style ergonomics, Plane-style openness, with the structure of an issue →
epic hierarchy borrowed from Jira.

## Stack

- **Turborepo** monorepo, two apps (`apps/web` + `apps/mcp`)
- **Next.js 16** (App Router) — note: not the Next.js you remember,
  see [AGENTS.md](AGENTS.md) for the gotcha sheet
- **Bun** as runtime + package manager + workspace driver
- **TypeScript**, **Tailwind CSS v4**, **shadcn/ui** (components live in
  [apps/web/src/components/ui/](apps/web/src/components/ui))
- **Drizzle ORM** + **Postgres**
- **Better Auth** for email/password + multi-tenant orgs (workspaces)
- **Model Context Protocol** SDK for the agent-facing server
- **Biome** for lint/format
- **Vitest** for unit tests, **Playwright** for end-to-end

## Repo layout

```
apps/
  web/                    Next.js 16 web app
    src/
      app/                App Router routes
        [workspaceSlug]/  Workspace-scoped pages (settings, projects, board…)
        invite/[id]/      Accept-invite flow
        onboarding/       First-workspace flow
        sign-in, sign-up/ Auth pages
        api/auth/[...all]/ Better Auth route handler
      components/         Shared shadcn primitives + cross-page components
      drizzle/
        schema.ts         Re-exports every schema module
        schemas/          Table definitions (one file per concern)
        migrations/       Generated SQL
      lib/
        auth.ts           Better Auth server config
        auth-client.ts    Better Auth React client
        session.ts        getSession() + requireSession()
        workspace.ts      requireWorkspace()
        roles.ts          requireRole()
        issue-actions.ts  createIssue / updateIssue server actions
        issues.ts         nextIssueNumber() + writeActivity()
        issue-display.ts  Status / priority / type label + color maps
        issue-filters.ts  URL → Drizzle WHERE for list / board / my-issues
    e2e/                  Playwright specs
    .env.example          Copy to .env, fill in secrets
  mcp/                    MCP server — agent-facing API gateway
    src/index.ts          Server entrypoint, registers tools via the MCP SDK
turbo.json                Pipeline definitions (dev / build / lint / test / db:*)
package.json              Root: workspaces + Turborepo proxy scripts
```

## Quick start

Prerequisites: [Bun](https://bun.sh), Postgres reachable somewhere.

```bash
# 1. Install dependencies (hoists across the workspace)
bun install

# 2. Configure env for the web app
cp apps/web/.env.example apps/web/.env
# Then edit apps/web/.env — at minimum, set:
#   DATABASE_URL       (your Postgres connection string)
#   BETTER_AUTH_SECRET (run `openssl rand -base64 32` to generate)

# 3. Push the schema to your database
bun run db:push

# 4. Run the web dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to
`/sign-in`; create an account, then `/onboarding` will prompt you to create
your first workspace.

## Working in the monorepo

All scripts at the root proxy through Turborepo, which fans them out to the
appropriate workspace packages. To target one package:

```bash
# Just the web app
bun run --filter @fullstory/web dev
bun run --filter @fullstory/web build

# Just the MCP server
bun run --filter fullstory-mcp dev
bun run --filter fullstory-mcp build

# List all workspaces Turbo sees
bunx turbo ls
```

Turbo caches task output per-package (`.turbo/`) — clear with `bunx turbo prune`
if you ever need to bust it.

## Database scripts

All `db:*` scripts run via Turbo and execute `drizzle-kit` inside `apps/web`,
where the config and migrations live.

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `bun run db:generate`| Generate a SQL migration from the schema diff |
| `bun run db:migrate` | Apply generated migrations                   |
| `bun run db:push`    | Sync schema directly (skip migration files)  |
| `bun run db:studio`  | Open Drizzle Studio in the browser           |

## Testing

```bash
bun run test         # vitest, single-shot, all packages
bun run test:watch   # vitest in watch mode
bun run e2e          # playwright (boots the dev server itself)
```

Playwright needs a one-time browser install:

```bash
bun run --filter @fullstory/web exec playwright install chromium
```

Some vitest tests are integration-style and require a reachable Postgres at
`DATABASE_URL` (they auto-skip otherwise). Migrations need to be applied for
those to pass — `bun run db:migrate` first.

## MCP server

The `apps/mcp` package is a Model Context Protocol server for agent-facing
access to Full Story. v0 is a scaffold (`ping` tool only) — the API key flow,
REST endpoints, and full CRUD tool surface land in M5 (see
[TASKS.md](TASKS.md)). Once shipped, point any MCP-aware CLI (Claude Code,
Cursor, Cline, etc.) at the published binary.

## Contributing

Before writing code, read [AGENTS.md](AGENTS.md). Next.js 16 has breaking
changes (async `cookies()`/`headers()`, `middleware` → `proxy`, cache
defaults, etc.) and the gotcha sheet captures the ones most likely to bite.

Every authenticated server component should call `requireSession()` (or
`requireOnboarded()` / `requireWorkspace()` further down the stack). Server
actions and route handlers must re-verify auth themselves — they're
independently reachable as POST endpoints. See the AGENTS.md "Authentication
patterns" section for the full rule set.

## License

MIT — see [LICENSE](LICENSE).
