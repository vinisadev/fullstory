import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { fail, ok } from "../format.js";

export function registerProjectTools(
  server: McpServer,
  client: ApiClient,
): void {
  server.registerTool(
    "list_projects",
    {
      description:
        "List every project in a Full Story workspace, sorted active-first then alphabetically. " +
        "Each project has an `id` (uuid) used to fetch or update it, and a `key` (e.g. 'WEB') used as the prefix in issue keys like 'WEB-12'.",
      inputSchema: {
        workspace: z
          .string()
          .min(1)
          .describe("Workspace slug, e.g. 'eldritch-logic'"),
      },
    },
    async ({ workspace }) => {
      try {
        const data = await client.get<{ projects: unknown[] }>(
          `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects`,
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_project",
    {
      description:
        "Get a single Full Story project by id (uuid). To look up a project by its short key (e.g. 'WEB') use list_projects and filter the results.",
      inputSchema: {
        id: z.string().min(1).describe("Project id (uuid)"),
      },
    },
    async ({ id }) => {
      try {
        const data = await client.get<{ project: unknown }>(
          `/api/v1/projects/${encodeURIComponent(id)}`,
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "create_project",
    {
      description:
        "Create a new project in a workspace. The API key's owner must be an admin or owner of the workspace. " +
        "`key` becomes the prefix for issue keys (e.g. key='WEB' → issues are 'WEB-1', 'WEB-2', …) and cannot be changed later — pick carefully. " +
        "Keys must be uppercase letters/digits, 2–10 chars; the API rejects duplicates within a workspace.",
      inputSchema: {
        workspace: z
          .string()
          .min(1)
          .describe("Workspace slug to create the project in"),
        key: z
          .string()
          .min(2)
          .max(10)
          .describe("Short uppercase key, e.g. 'WEB' or 'API'"),
        name: z.string().min(1).describe("Human-readable project name"),
        description: z
          .string()
          .optional()
          .describe("Optional longer description"),
      },
    },
    async ({ workspace, key, name, description }) => {
      try {
        const data = await client.post<{ project: unknown }>(
          `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects`,
          { key, name, description },
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "update_project",
    {
      description:
        "Update a project's name, description, or lead. Pass `null` to clear `description` or `leadId`; omit a field to leave it unchanged. " +
        "The project's `key` is immutable — use archive_project + create_project if you need to rename. To toggle archive state, use archive_project / unarchive_project.",
      inputSchema: {
        id: z.string().min(1).describe("Project id (uuid)"),
        name: z.string().min(1).optional().describe("New project name"),
        description: z
          .string()
          .nullable()
          .optional()
          .describe("New description, or null to clear"),
        leadId: z
          .string()
          .nullable()
          .optional()
          .describe("New lead user id, or null to clear"),
      },
    },
    async ({ id, name, description, leadId }) => {
      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (description !== undefined) body.description = description;
      if (leadId !== undefined) body.leadId = leadId;
      try {
        const data = await client.patch<{ project: unknown }>(
          `/api/v1/projects/${encodeURIComponent(id)}`,
          body,
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "archive_project",
    {
      description:
        "Archive a project. Archived projects don't appear in default list views and reject new issue creation, but existing issues and history remain queryable. Reverse with unarchive_project.",
      inputSchema: {
        id: z.string().min(1).describe("Project id (uuid)"),
      },
    },
    async ({ id }) => {
      try {
        const data = await client.patch<{ project: unknown }>(
          `/api/v1/projects/${encodeURIComponent(id)}`,
          { archived: true },
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "unarchive_project",
    {
      description: "Restore an archived project so it accepts new issues again.",
      inputSchema: {
        id: z.string().min(1).describe("Project id (uuid)"),
      },
    },
    async ({ id }) => {
      try {
        const data = await client.patch<{ project: unknown }>(
          `/api/v1/projects/${encodeURIComponent(id)}`,
          { archived: false },
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );
}
