#!/usr/bin/env node

// Full Story MCP server entry point.
//
// Reads FULLSTORY_API_URL (defaults to http://localhost:3000) and
// FULLSTORY_API_KEY (required) at startup. Each tool module receives the
// shared `ApiClient` and registers its tools on the server.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ApiError, createApiClient } from "./client.js";
import { readEnv } from "./env.js";
import { registerIssueTools } from "./tools/issues.js";
import { registerMeTools } from "./tools/me.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";

const env = readEnv();
const client = createApiClient(env);

const server = new McpServer({
  name: "fullstory-mcp",
  version: "0.1.0",
});

server.registerTool(
  "ping",
  {
    description:
      "Verify the MCP server can reach the Full Story API and the supplied API key works. Returns the names of workspaces accessible to the key's owner.",
    inputSchema: {},
  },
  async () => {
    try {
      const data = await client.get<{
        workspaces: { slug: string; name: string }[];
      }>("/api/v1/workspaces");
      const list =
        data.workspaces.length === 0
          ? "no workspaces"
          : data.workspaces.map((w) => `${w.name} (${w.slug})`).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Connected to ${env.apiUrl}. Accessible workspaces: ${list}.`,
          },
        ],
      };
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `${err.status} — ${err.body || err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      return {
        content: [
          { type: "text", text: `Failed to reach Full Story API: ${message}` },
        ],
        isError: true,
      };
    }
  },
);

registerMeTools(server, client);
registerWorkspaceTools(server, client);
registerProjectTools(server, client);
registerIssueTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
