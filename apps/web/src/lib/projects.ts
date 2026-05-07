"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { member, organization, project } from "@/drizzle/schema";
import { isAtLeast, type Role } from "@/lib/roles";
import { requireSession } from "@/lib/session";

// 2-5 chars, leading letter then letters/digits, e.g. WEB, API, V2.
const KEY_PATTERN = /^[A-Z][A-Z0-9]{1,4}$/;

type CreateProjectInput = {
  workspaceSlug: string;
  key: string;
  name: string;
  description?: string;
};

export type ProjectMutationResult =
  | { ok: true; project: typeof project.$inferSelect }
  | { ok: false; error: string };

// Loads a project by id and asserts the current session is an admin or owner
// of its workspace. Used by every mutating action below. Not exported because
// "use server" would force it through the server-action boundary.
async function loadProjectForAdmin(
  projectId: string,
  userId: string,
): Promise<ProjectMutationResult> {
  const existing = await db.query.project.findFirst({
    where: eq(project.id, projectId),
  });
  if (!existing) {
    return { ok: false, error: "Project not found." };
  }
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, existing.workspaceId),
      eq(member.userId, userId),
    ),
  });
  if (!membership) {
    return { ok: false, error: "You're not a member of this workspace." };
  }
  if (!isAtLeast(membership.role as Role, "admin")) {
    return {
      ok: false,
      error: "Only workspace admins and owners can modify projects.",
    };
  }
  return { ok: true, project: existing };
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ProjectMutationResult> {
  const session = await requireSession();

  const key = input.key.trim().toUpperCase();
  const name = input.name.trim();

  if (!KEY_PATTERN.test(key)) {
    return {
      ok: false,
      error:
        "Key must be 2–5 characters: a leading letter followed by letters or digits.",
    };
  }
  if (!name) {
    return { ok: false, error: "Name is required." };
  }

  const workspace = await db.query.organization.findFirst({
    where: eq(organization.slug, input.workspaceSlug),
  });
  if (!workspace) {
    return { ok: false, error: "Workspace not found." };
  }

  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, workspace.id),
      eq(member.userId, session.user.id),
    ),
  });
  if (!membership) {
    return { ok: false, error: "You're not a member of this workspace." };
  }
  if (!isAtLeast(membership.role as Role, "admin")) {
    return {
      ok: false,
      error: "Only workspace admins and owners can create projects.",
    };
  }

  try {
    const [created] = await db
      .insert(project)
      .values({
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        key,
        name,
        description: input.description?.trim() || null,
      })
      .returning();
    return { ok: true, project: created };
  } catch (e) {
    // Postgres unique_violation. Surface the conflict cleanly instead of
    // leaking the constraint name.
    if (
      e instanceof Error &&
      "code" in e &&
      (e as { code: unknown }).code === "23505"
    ) {
      return {
        ok: false,
        error: `A project with key "${key}" already exists in this workspace.`,
      };
    }
    throw e;
  }
}

type UpdateProjectInput = {
  projectId: string;
  name?: string;
  description?: string | null;
  leadId?: string | null;
};

export async function updateProject(
  input: UpdateProjectInput,
): Promise<ProjectMutationResult> {
  const session = await requireSession();
  const guard = await loadProjectForAdmin(input.projectId, session.user.id);
  if (!guard.ok) return guard;

  const patch: Partial<typeof project.$inferInsert> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      return { ok: false, error: "Name cannot be empty." };
    }
    patch.name = name;
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.leadId !== undefined) {
    patch.leadId = input.leadId;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true, project: guard.project };
  }

  const [updated] = await db
    .update(project)
    .set(patch)
    .where(eq(project.id, input.projectId))
    .returning();
  return { ok: true, project: updated };
}

export async function setProjectArchived(input: {
  projectId: string;
  archived: boolean;
}): Promise<ProjectMutationResult> {
  const session = await requireSession();
  const guard = await loadProjectForAdmin(input.projectId, session.user.id);
  if (!guard.ok) return guard;

  const [updated] = await db
    .update(project)
    .set({ archivedAt: input.archived ? new Date() : null })
    .where(eq(project.id, input.projectId))
    .returning();
  return { ok: true, project: updated };
}
