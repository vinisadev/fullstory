import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "../client.js";
import { fail, ok } from "../format.js";

export function registerMeTools(server: McpServer, client: ApiClient): void {
  server.registerTool(
    "whoami",
    {
      description:
        "Return the Full Story user the configured API key belongs to. Use this to confirm which account an MCP-driven mutation will be attributed to before creating or updating issues/projects.",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await client.get<{ user: unknown }>("/api/v1/me");
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
