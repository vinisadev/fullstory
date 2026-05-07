import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../client.js";
import { fail, ok } from "../format.js";

const STATUS_VALUES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
] as const;

const PRIORITY_VALUES = [
  "no_priority",
  "urgent",
  "high",
  "medium",
  "low",
] as const;

const TYPE_VALUES = ["task", "bug", "epic"] as const;

export function registerIssueTools(
  server: McpServer,
  client: ApiClient,
): void {
  server.registerTool(
    "list_issues",
    {
      description:
        "List issues across a workspace, optionally scoped to a single project. " +
        "Filter arrays use OR semantics within a field and AND across fields. " +
        "For `assignee`, the synthetic value 'unassigned' matches issues with no assignee. " +
        "Issues are returned sorted by `updatedAt` DESC.",
      inputSchema: {
        workspace: z
          .string()
          .min(1)
          .describe("Workspace slug, e.g. 'eldritch-logic'"),
        project: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Project key (e.g. 'WEB'). Omit to list across all projects in the workspace.",
          ),
        status: z
          .array(z.enum(STATUS_VALUES))
          .optional()
          .describe("Filter to one or more status values"),
        priority: z
          .array(z.enum(PRIORITY_VALUES))
          .optional()
          .describe("Filter to one or more priority values"),
        assignee: z
          .array(z.string().min(1))
          .optional()
          .describe(
            "Filter to one or more assignee user IDs. Use 'unassigned' to match issues with no assignee.",
          ),
        label: z
          .array(z.string().min(1))
          .optional()
          .describe("Filter to one or more label IDs (OR semantics)"),
      },
    },
    async ({ workspace, project, status, priority, assignee, label }) => {
      const params = new URLSearchParams({ workspace });
      if (project) params.set("project", project);
      if (status?.length) params.set("status", status.join(","));
      if (priority?.length) params.set("priority", priority.join(","));
      if (assignee?.length) params.set("assignee", assignee.join(","));
      if (label?.length) params.set("label", label.join(","));

      try {
        const data = await client.get<{ issues: unknown[] }>(
          `/api/v1/issues?${params.toString()}`,
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "create_issue",
    {
      description:
        "Create a new issue in a project. `title` is the only required content field; everything else has sensible defaults (`type`='task', `priority`='no_priority', no assignee). " +
        "An issue's `key` (like 'WEB-12') is assigned by the server using the project's monotonic counter — you can't pick it. " +
        "Setting `parentId` requires the parent to be an `epic` in the same project; the API enforces this.",
      inputSchema: {
        workspace: z
          .string()
          .min(1)
          .describe("Workspace slug, e.g. 'eldritch-logic'"),
        project: z
          .string()
          .min(1)
          .describe("Project key, e.g. 'WEB' (case-insensitive)"),
        title: z.string().min(1).describe("Issue title"),
        description: z
          .string()
          .optional()
          .describe("Optional issue body (plain text)"),
        type: z
          .enum(TYPE_VALUES)
          .optional()
          .describe("Issue type — defaults to 'task'"),
        priority: z
          .enum(PRIORITY_VALUES)
          .optional()
          .describe("Priority — defaults to 'no_priority'"),
        assigneeId: z
          .string()
          .nullable()
          .optional()
          .describe("User id to assign, or null/omit for unassigned"),
        parentId: z
          .string()
          .nullable()
          .optional()
          .describe(
            "Parent epic's id (must be an epic in the same project). Null/omit for no parent.",
          ),
        estimate: z
          .number()
          .int()
          .min(0)
          .nullable()
          .optional()
          .describe("Non-negative integer point estimate, or null"),
      },
    },
    async ({ workspace, project, ...fields }) => {
      try {
        const data = await client.post<{ issue: unknown }>("/api/v1/issues", {
          workspaceSlug: workspace,
          projectKey: project,
          ...fields,
        });
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "update_issue",
    {
      description:
        "Update any subset of an issue's mutable fields. Each changed field writes its own row to the activity timeline (visible in get_issue). " +
        "Pass `null` to clear nullable fields (description, assigneeId, parentId, cycleId, estimate); omit a field to leave it unchanged. " +
        "The 'epic can't have a parent' invariant is enforced against the post-update state — flipping `type` to 'epic' while `parentId` is set will fail.",
      inputSchema: {
        id: z.string().min(1).describe("Issue id (uuid)"),
        title: z.string().min(1).optional(),
        description: z
          .string()
          .nullable()
          .optional()
          .describe("New description, or null to clear"),
        status: z.enum(STATUS_VALUES).optional(),
        priority: z.enum(PRIORITY_VALUES).optional(),
        type: z.enum(TYPE_VALUES).optional(),
        assigneeId: z
          .string()
          .nullable()
          .optional()
          .describe("New assignee user id, or null to unassign"),
        parentId: z
          .string()
          .nullable()
          .optional()
          .describe("New parent epic id, or null to detach"),
        cycleId: z
          .string()
          .nullable()
          .optional()
          .describe("New cycle id, or null to remove from cycle"),
        estimate: z
          .number()
          .int()
          .min(0)
          .nullable()
          .optional()
          .describe("New point estimate, or null to clear"),
      },
    },
    async ({ id, ...rest }) => {
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) body[k] = v;
      }
      try {
        const data = await client.patch<{ issue: unknown }>(
          `/api/v1/issues/${encodeURIComponent(id)}`,
          body,
        );
        return ok(data);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_issue",
    {
      description:
        "Get a single issue by id, including its full activity timeline (oldest first). " +
        "The activity log captures every status/priority/title/assignee/etc. change with actor and timestamp — the same data the web UI's issue detail timeline uses.",
      inputSchema: {
        id: z.string().min(1).describe("Issue id (uuid)"),
      },
    },
    async ({ id }) => {
      const encoded = encodeURIComponent(id);
      try {
        // Fetch issue + activity in parallel — both endpoints already
        // verified the caller's workspace membership, so failure of either
        // means a real error worth surfacing.
        const [issueData, activityData] = await Promise.all([
          client.get<{ issue: unknown }>(`/api/v1/issues/${encoded}`),
          client.get<{ activity: unknown[] }>(
            `/api/v1/issues/${encoded}/activity`,
          ),
        ]);
        return ok({
          issue: issueData.issue,
          activity: activityData.activity,
        });
      } catch (err) {
        return fail(err);
      }
    },
  );
}
