import { asc, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { activity, issue } from "@/drizzle/schema";
import { activityToDto } from "@/lib/api-dto";
import { auth } from "@/lib/auth";
import { requireApiSession } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

// GET /api/v1/issues/[id]/activity
//
// Returns every activity row for the issue, oldest-first. Useful for agents
// asking "what changed on this issue" or summarizing recent updates.
export async function GET(request: Request, ctx: Context) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { id } = await ctx.params;

  // Look up issue + project for the membership check. Single query via
  // the existing relational shape.
  const iss = await db.query.issue.findFirst({
    where: eq(issue.id, id),
    columns: { id: true },
    with: { project: { columns: { workspaceId: true } } },
  });
  if (!iss) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  const workspaces = await auth.api.listOrganizations({
    headers: request.headers,
  });
  if (!workspaces.some((w) => w.id === iss.project.workspaceId)) {
    return Response.json({ error: "Issue not found" }, { status: 404 });
  }

  const activities = await db.query.activity.findMany({
    where: eq(activity.issueId, id),
    orderBy: asc(activity.createdAt),
    with: {
      actor: { columns: { id: true, name: true } },
    },
  });

  return Response.json({
    activity: activities.map(activityToDto),
  });
}
