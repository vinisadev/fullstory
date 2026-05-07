import { auth } from "@/lib/auth";
import { requireApiSession } from "@/lib/session";

type Context = { params: Promise<{ slug: string }> };

// GET /api/v1/workspaces/[slug]
// Returns one workspace by slug, scoped to the caller's memberships.
// 404s for both "doesn't exist" and "not a member" (no membership leak).
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

  return Response.json({
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      logo: workspace.logo,
      createdAt: workspace.createdAt,
    },
  });
}
