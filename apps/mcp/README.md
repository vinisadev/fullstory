# `fullstory-mcp`

A [Model Context Protocol](https://modelcontextprotocol.io) server that
exposes the Full Story REST API to agent-driven CLIs (Claude Code, Cursor,
Cline, …). Use it to drive Full Story from inside the editor: list issues,
file bugs, update statuses, archive projects — all from chat.

The contract this server speaks is documented in
[../web/API.md](../web/API.md). The server is a thin translation layer:
JSON-RPC tool calls in, REST calls out.

## Tools

| Tool | What it does |
| ---- | ------------ |
| `ping` | Smoke-test connectivity. Returns the workspaces your key sees. |
| `whoami` | Show which Full Story user the configured key belongs to. |
| `list_workspaces` / `get_workspace` | Discover workspaces. |
| `list_projects` / `get_project` | Discover projects in a workspace. |
| `create_project` / `update_project` | CRUD project metadata (name, description, lead). |
| `archive_project` / `unarchive_project` | Toggle archive state. |
| `list_issues` | Filter by project, status, priority, assignee, label. |
| `get_issue` | Issue detail + full activity timeline. |
| `create_issue` / `update_issue` | File and edit issues. |

Every mutation writes an entry to the issue's activity log just like the
web UI — you'll see who did what, including agent-attributed changes.

## Generating an API key

1. Sign in to your Full Story instance.
2. Navigate to **Workspace settings → Your API keys**.
3. Click **Create key**, give it a name (e.g. "Claude Code on laptop"),
   copy the `fs_…` value — it's shown **once**.

Keys are scoped to your user account and grant access to every workspace
you're a member of. Revoke a key from the same page if it leaks.

## Configuration

Two environment variables, set in the host CLI's MCP config:

| Variable | Required | Default | Notes |
| -------- | -------- | ------- | ----- |
| `FULLSTORY_API_KEY` | yes | — | The `fs_…` token from the step above. |
| `FULLSTORY_API_URL` | no | `http://localhost:3000` | Base URL of the web app. Set to your deployed origin in production. |

The server fails fast at startup if `FULLSTORY_API_KEY` is missing or empty.

## Adding the server to your CLI

The examples below assume the server is on npm (lands in M5 task 108). To
run from a local clone instead, replace the `command` / `args` pair with:

```jsonc
"command": "node",
"args": ["/absolute/path/to/fullstory/apps/mcp/dist/index.js"]
```

(Run `bun run --filter fullstory-mcp build` first to produce `dist/`.)

### Claude Code

Add via the CLI helper:

```bash
claude mcp add fullstory \
  --env FULLSTORY_API_KEY=fs_your_key_here \
  --env FULLSTORY_API_URL=https://fullstory.example.com \
  -- bunx -y fullstory-mcp
```

…or paste into `~/.claude.json` (user) / `.mcp.json` (project) directly:

```json
{
  "mcpServers": {
    "fullstory": {
      "command": "bunx",
      "args": ["-y", "fullstory-mcp"],
      "env": {
        "FULLSTORY_API_KEY": "fs_your_key_here",
        "FULLSTORY_API_URL": "https://fullstory.example.com"
      }
    }
  }
}
```

Restart Claude Code, then `/mcp` should list `fullstory` with all the tools.

### Cursor

Edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per-project):

```json
{
  "mcpServers": {
    "fullstory": {
      "command": "bunx",
      "args": ["-y", "fullstory-mcp"],
      "env": {
        "FULLSTORY_API_KEY": "fs_your_key_here",
        "FULLSTORY_API_URL": "https://fullstory.example.com"
      }
    }
  }
}
```

Open the Cursor settings → MCP pane to confirm the server is healthy.

### Cline (VS Code)

Open the Cline panel → MCP servers → "Edit MCP settings" — that opens
`cline_mcp_settings.json` with the same shape:

```json
{
  "mcpServers": {
    "fullstory": {
      "command": "bunx",
      "args": ["-y", "fullstory-mcp"],
      "env": {
        "FULLSTORY_API_KEY": "fs_your_key_here",
        "FULLSTORY_API_URL": "https://fullstory.example.com"
      }
    }
  }
}
```

## Verifying it works

Once configured, ask your agent:

> "Run the fullstory `ping` tool."

You should see "Connected to <url>. Accessible workspaces: …". If you see
`401 Unauthorized`, the key is wrong; if you see a connection error, the
URL doesn't resolve.

## Development

```bash
# from the repo root
bun install
bun run --filter fullstory-mcp dev      # watch mode
bun run --filter fullstory-mcp build    # produces dist/index.js
```

Smoke-test the built artifact directly over stdio:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"x","version":"0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | FULLSTORY_API_KEY=fs_your_key node dist/index.js
```

The third line should return all registered tools with their input schemas.

## See also

- [../web/API.md](../web/API.md) — the REST contract this server wraps
- [../../TASKS.md](../../TASKS.md) M5 — outstanding MCP work (rate limits,
  scopes, npm publish)
