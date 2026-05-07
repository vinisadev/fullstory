# Full Story

A self-hostable, opinionated issue tracker for product and engineering teams.
Linear-style ergonomics, Plane-style openness, with the structure of an issue →
epic hierarchy borrowed from Jira.

## Stack

- **Next.js 16** (App Router) — note: not the Next.js you remember,
  see [AGENTS.md](AGENTS.md) for the gotcha sheet
- **Bun** as runtime + package manager
- **TypeScript**, **Tailwind CSS v4**, **shadcn/ui** (components live in
  [src/components/ui/](src/components/ui))
- **Drizzle ORM** + **Postgres**
- **Better Auth** for email/password + multi-tenant orgs (workspaces)
- **Biome** for lint/format
- **Vitest** for unit tests, **Playwright** for end-to-end

## Quick start

Prerequisites: [Bun](https://bun.sh), Postgres reachable somewhere.

```bash
# 1. Install dependencies
bun install

# 2. Configure env
cp .env.example .env
# Then edit .env — at minimum, set:
#   DATABASE_URL       (your Postgres connection string)
#   BETTER_AUTH_SECRET (run `openssl rand -base64 32` to generate)

# 3. Push the schema to your database
bun run db:push

# 4. Run the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to
`/sign-in`; create an account, then `/onboarding` will prompt you to create
your first workspace.

## Database scripts

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `bun run db:generate`| Generate a SQL migration from the schema diff |
| `bun run db:migrate` | Apply generated migrations                   |
| `bun run db:push`    | Sync schema directly (skip migration files)  |
| `bun run db:studio`  | Open Drizzle Studio in the browser           |

## Testing

```bash
bun run test         # vitest, single-shot
bun run test:watch   # vitest in watch mode
bun run e2e          # playwright (boots the dev server itself)
```

Playwright needs a one-time browser install: `bunx playwright install chromium`.

## Project layout

```
src/
  app/                    Next.js App Router routes
    [workspaceSlug]/      Workspace-scoped pages (settings, future projects)
    invite/[id]/          Accept-invite flow
    onboarding/           First-workspace flow
    sign-in, sign-up/     Auth pages
    api/auth/[...all]/    Better Auth route handler
  components/ui/          shadcn primitives
  drizzle/
    schema.ts             Re-exports every schema module
    schemas/              Schema definitions (one file per concern)
    migrations/           Generated SQL migrations
  lib/
    auth.ts               Better Auth server config
    auth-client.ts        Better Auth React client
    session.ts            getSession() + requireSession()
    workspace.ts          listWorkspaces() + requireWorkspace()
    roles.ts              isAtLeast() + requireRole()
    redirects.ts          safeRedirect() (open-redirect guard)
e2e/                      Playwright specs
```

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
