import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/drizzle";
import { project } from "@/drizzle/schema";
import { projectToDto } from "@/lib/api-dto";
import { auth } from "@/lib/auth";
import { createProject } from "@/lib/projects";
import { requireApiSession } from "@/lib/session";

type Context = { params: Promise<{ slug: string }> };

// GET /api/v1/workspaces/[slug]/projects
export async function GET(request: Request, ctx: Context) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { slug } = await ctx.params;

  const workspaces = await auth.api.listOrganizations({
    headers: request.headers,
  });
  const workspace = workspaces.find((w) => w.slug === slug);
  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  }

  const projects = await db.query.project.findMany({
    where: eq(project.workspaceId, workspace.id),
    orderBy: [sql`(${project.archivedAt} IS NOT NULL)`, asc(project.name)],
  });

  return Response.json({
    projects: projects.map(projectToDto),
  });
}

// POST /api/v1/workspaces/[slug]/projects
// Body: { key: string, name: string, description?: string }
export async function POST(request: Request, ctx: Context) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { slug } = await ctx.params;
  const body = (await request.json().catch(() => null)) as {
    key?: unknown;
    name?: unknown;
    description?: unknown;
  } | null;
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.key !== "string" || typeof body.name !== "string") {
    return Response.json(
      { error: "key and name are required strings" },
      { status: 400 },
    );
  }

  const result = await createProject({
    workspaceSlug: slug,
    key: body.key,
    name: body.name,
    description:
      typeof body.description === "string" ? body.description : undefined,
  });

  if (!result.ok) {
    // The action returns descriptive error strings; route handler maps all
    // action failures to 400. Distinguishing 400 vs 403 vs 404 at this layer
    // would require typed error codes from the action — not yet.
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json(
    { project: projectToDto(result.project) },
    { status: 201 },
  );
}
