import { requireApiSession } from "@/lib/session";

// GET /api/v1/me
// Returns the user the current credentials belong to. Useful for the MCP
// `whoami` tool so an agent can confirm which account a given API key
// represents before mutating data.
export async function GET() {
  const session = await requireApiSession();
  if (!session.ok) return session.response;

  const { user } = session;
  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
  });
}
