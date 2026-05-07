import "server-only";

import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/drizzle";
import { member } from "@/drizzle/schema";
import { requireSession } from "@/lib/session";

export type Role = "owner" | "admin" | "member";

const RANK: Record<Role, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function isAtLeast(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

export const getRole = cache(
  async (workspaceId: string, userId: string): Promise<Role | null> => {
    const row = await db.query.member.findFirst({
      where: and(
        eq(member.organizationId, workspaceId),
        eq(member.userId, userId),
      ),
    });
    if (!row) return null;
    return row.role as Role;
  },
);

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireRole(workspaceId: string, minimum: Role) {
  const session = await requireSession();
  const role = await getRole(workspaceId, session.user.id);
  if (!role || !isAtLeast(role, minimum)) {
    throw new ForbiddenError(`Requires ${minimum} role`);
  }
  return { session, role };
}
