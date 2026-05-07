import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { project } from "@/drizzle/schema";
import { projectToDto } from "@/lib/api-dto";
import { auth } from "@/lib/auth";
import { setProjectArchived, updateProject } from "@/lib/projects";
import { requireApiSession } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

// GET /api/v1/projects/[id]
export async function GET(request: Request, ctx: Context) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { id } = await ctx.params;

  const proj = await db.query.project.findFirst({
    where: eq(project.id, id),
  });
  if (!proj) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Membership check: caller must be in the project's workspace. 404 (not
  // 403) so non-members can't probe for project IDs.
  const workspaces = await auth.api.listOrganizations({
    headers: request.headers,
  });
  if (!workspaces.some((w) => w.id === proj.workspaceId)) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  return Response.json({ project: projectToDto(proj) });
}

// PATCH /api/v1/projects/[id]
// Body: { name?, description?, leadId?, archived? }
//
// `archived: boolean` toggles archive state; everything else is a field
// patch. Fields and archive-state can change in one request — handled by
// dispatching to setProjectArchived after updateProject.
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

  let current: typeof project.$inferSelect | null = null;

  // Field updates (name / description / leadId)
  const hasFieldUpdate =
    "name" in body || "description" in body || "leadId" in body;
  if (hasFieldUpdate) {
    const result = await updateProject({
      projectId: id,
      name: typeof body.name === "string" ? body.name : undefined,
      description:
        body.description === null
          ? null
          : typeof body.description === "string"
            ? body.description
            : undefined,
      leadId:
        body.leadId === null
          ? null
          : typeof body.leadId === "string"
            ? body.leadId
            : undefined,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    current = result.project;
  }

  // Archive state toggle
  if (typeof body.archived === "boolean") {
    const result = await setProjectArchived({
      projectId: id,
      archived: body.archived,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    current = result.project;
  }

  // No-op patch — fetch and return current state. Permission-checked
  // identically to GET above.
  if (!current) {
    const proj = await db.query.project.findFirst({
      where: eq(project.id, id),
    });
    if (!proj) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const workspaces = await auth.api.listOrganizations({
      headers: request.headers,
    });
    if (!workspaces.some((w) => w.id === proj.workspaceId)) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    current = proj;
  }

  return Response.json({ project: projectToDto(current) });
}
