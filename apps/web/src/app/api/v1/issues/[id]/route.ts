import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { issue, project } from "@/drizzle/schema";
import { issueToDto } from "@/lib/api-dto";
import { auth } from "@/lib/auth";
import { updateIssue } from "@/lib/issue-actions";
import { requireApiSession } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

// GET /api/v1/issues/[id]
export async function GET(request: Request, ctx: Context) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { id } = await ctx.params;

  const iss = await db.query.issue.findFirst({
    where: eq(issue.id, id),
    with: { project: { columns: { id: true, key: true, workspaceId: true } } },
  });
  if (!iss) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  // Membership check via the project's workspace.
  const workspaces = await auth.api.listOrganizations({
    headers: request.headers,
  });
  if (!workspaces.some((w) => w.id === iss.project.workspaceId)) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  return Response.json({ issue: issueToDto(iss, iss.project.key) });
}

// PATCH /api/v1/issues/[id]
// Body accepts any subset of: title, description, status, priority, type,
// assigneeId, parentId, cycleId, estimate. All field semantics — including
// the "epic can't have parent" invariant and per-field activity rows — live
// in the updateIssue action; this handler is a thin translator.
export async function PATCH(request: Request, ctx: Context) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await updateIssue({
    issueId: id,
    title: typeof body.title === "string" ? body.title : undefined,
    description:
      body.description === null
        ? null
        : typeof body.description === "string"
          ? body.description
          : undefined,
    status: pickEnum(body.status, [
      "backlog",
      "todo",
      "in_progress",
      "in_review",
      "done",
      "canceled",
    ]),
    priority: pickEnum(body.priority, [
      "no_priority",
      "urgent",
      "high",
      "medium",
      "low",
    ]),
    type: pickEnum(body.type, ["task", "bug", "epic"]),
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
    cycleId:
      body.cycleId === null
        ? null
        : typeof body.cycleId === "string"
          ? body.cycleId
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

  // updateIssue's result doesn't include the project's key, so look it up.
  const proj = await db.query.project.findFirst({
    where: eq(project.id, result.issue.projectId),
    columns: { key: true },
  });
  const projectKey = proj?.key ?? "";

  return Response.json({ issue: issueToDto(result.issue, projectKey) });
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
