import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/drizzle";
import { issue, project } from "@/drizzle/schema";
import { issueToDto } from "@/lib/api-dto";
import { auth } from "@/lib/auth";
import { createIssue } from "@/lib/issue-actions";
import {
  buildIssueFilterConditions,
  parseIssueFilters,
} from "@/lib/issue-filters";
import { requireApiSession } from "@/lib/session";

// GET /api/v1/issues?workspace=<slug>&project=<KEY>&status=&priority=&assignee=&label=
//
// `workspace` is required; `project` is optional (omit to list across all
// projects in the workspace). Filters use the same comma-separated syntax
// as the web list/board views — same parser is reused.
export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const workspaceSlug = url.searchParams.get("workspace");
  const projectKey = url.searchParams.get("project");

  if (!workspaceSlug) {
    return Response.json(
      { error: "Missing required query parameter: workspace" },
      { status: 400 },
    );
  }

  // Verify workspace membership
  const workspaces = await auth.api.listOrganizations({
    headers: request.headers,
  });
  const workspace = workspaces.find((w) => w.slug === workspaceSlug);
  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Optional project scope
  let scopedProjectId: string | undefined;
  if (projectKey) {
    const proj = await db.query.project.findFirst({
      where: and(
        eq(project.workspaceId, workspace.id),
        eq(project.key, projectKey.toUpperCase()),
      ),
      columns: { id: true },
    });
    if (!proj) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    scopedProjectId = proj.id;
  }

  // Build the filter shape parseIssueFilters expects
  const filterParams = {
    status: url.searchParams.get("status") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    assignee: url.searchParams.get("assignee") ?? undefined,
    label: url.searchParams.get("label") ?? undefined,
  };
  const filters = parseIssueFilters(filterParams);

  // Workspace projects subquery scopes to "any project in this workspace"
  // when no specific project is given.
  const workspaceProjectIds = db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.workspaceId, workspace.id));

  const conditions = [
    scopedProjectId
      ? eq(issue.projectId, scopedProjectId)
      : inArray(issue.projectId, workspaceProjectIds),
    ...buildIssueFilterConditions(filters),
  ];

  const issues = await db.query.issue.findMany({
    where: and(...conditions),
    with: {
      project: { columns: { key: true } },
    },
    orderBy: [desc(issue.updatedAt)],
  });

  return Response.json({
    issues: issues.map((i) => issueToDto(i, i.project.key)),
  });
}

// POST /api/v1/issues
// Body: { workspaceSlug, projectKey, title, description?, type?, priority?,
//          assigneeId?, parentId?, estimate? }
export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.workspaceSlug !== "string" ||
    typeof body.projectKey !== "string" ||
    typeof body.title !== "string"
  ) {
    return Response.json(
      {
        error: "workspaceSlug, projectKey, and title are required strings",
      },
      { status: 400 },
    );
  }

  const result = await createIssue({
    workspaceSlug: body.workspaceSlug,
    projectKey: body.projectKey,
    title: body.title,
    description:
      typeof body.description === "string" ? body.description : undefined,
    type: pickEnum(body.type, ["task", "bug", "epic"]),
    priority: pickEnum(body.priority, [
      "no_priority",
      "urgent",
      "high",
      "medium",
      "low",
    ]),
    assigneeId:
      body.assigneeId === null
        ? null
        : typeof body.assigneeId === "string"
          ? body.assigneeId
          : undefined,
    parentId:
      body.parentId === null
        ? null
        : typeof body.parentId === "string"
          ? body.parentId
          : undefined,
    estimate:
      body.estimate === null
        ? null
        : typeof body.estimate === "number"
          ? body.estimate
          : undefined,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json(
    { issue: issueToDto(result.issue, body.projectKey.toUpperCase()) },
    { status: 201 },
  );
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}
