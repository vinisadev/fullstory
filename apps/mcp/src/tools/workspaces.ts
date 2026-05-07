import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { fail, ok } from "../format.js";

export function registerWorkspaceTools(
  server: McpServer,
  client: ApiClient,
): void {
  server.registerTool(
    "list_workspaces",
    {
      description:
        "List every Full Story workspace the API key's owner is a member of. " +
        "Returns each workspace's slug, name, and id — the slug is what other tools take as input.",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await client.get<{ workspaces: unknown[] }>(
          "/api/v1/workspaces",
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_workspace",
    {
      description:
        "Get a single Full Story workspace by slug. Returns 404 if the workspace doesn't exist or the API key's owner isn't a member.",
      inputSchema: {
        slug: z.string().min(1).describe("Workspace slug, e.g. 'eldritch-logic'"),
      },
    },
    async ({ slug }) => {
      try {
        const data = await client.get<{ workspace: unknown }>(
          `/api/v1/workspaces/${encodeURIComponent(slug)}`,
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
