import { auth } from "@/lib/auth";
import { requireApiSession } from "@/lib/session";

// GET /api/v1/workspaces
// Lists every workspace the caller is a member of.
//
// Auth: cookie session OR Authorization: Bearer <fs_…> (the apiKey plugin
// makes both look identical to downstream code).
export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const workspaces = await auth.api.listOrganizations({
    headers: request.headers,
  });

  return Response.json({
    workspaces: workspaces.map((w) => ({
      id: w.id,
      slug: w.slug,
      name: w.name,
      logo: w.logo,
      createdAt: w.createdAt,
    })),
  });
}
