"use server";

// Issue mutation actions.
//
// **No deleteIssue is exported on purpose.** PLAN.md §4 declares that
// soft-delete and hard-delete are both out of scope: status="canceled" fills
// the "this was a mistake / not going to do" role while preserving the
// activity log, parent/child links, comments, attachments, and any
// notifications people might still need to find. If you reach for delete,
// reach for `updateIssue({ status: "canceled" })` instead.

import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { issue, member, organization, project } from "@/drizzle/schema";
import {
  type ActivityKind,
  nextIssueNumber,
  writeActivity,
} from "@/lib/issues";
import { requireSession } from "@/lib/session";

type IssueType = "task" | "bug" | "epic";
type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "canceled";
type IssuePriority = "no_priority" | "urgent" | "high" | "medium" | "low";

const TERMINAL_STATUSES: ReadonlySet<IssueStatus> = new Set([
  "done",
  "canceled",
]);

type CreateIssueInput = {
  workspaceSlug: string;
  projectKey: string;
  title: string;
  description?: string;
  type?: "task" | "bug" | "epic";
  priority?: "no_priority" | "urgent" | "high" | "medium" | "low";
  assigneeId?: string | null;
  parentId?: string | null;
  estimate?: number | null;
};

export type CreateIssueResult =
  | { ok: true; issue: typeof issue.$inferSelect }
  | { ok: false; error: string };

export async function createIssue(
  input: CreateIssueInput,
): Promise<CreateIssueResult> {
  const session = await requireSession();

  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "Title is required." };
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

  const proj = await db.query.project.findFirst({
    where: and(
      eq(project.workspaceId, workspace.id),
      eq(project.key, input.projectKey.toUpperCase()),
    ),
  });
  if (!proj) {
    return { ok: false, error: "Project not found." };
  }
  if (proj.archivedAt) {
    return {
      ok: false,
      error: "Cannot create issues in an archived project.",
    };
  }

  // PLAN's "single-level epics" rule: parent must be type=epic, and live in
  // the same project. Anything else is rejected.
  if (input.parentId) {
    const parent = await db.query.issue.findFirst({
      where: eq(issue.id, input.parentId),
    });
    if (!parent || parent.projectId !== proj.id) {
      return { ok: false, error: "Parent issue not found in this project." };
    }
    if (parent.type !== "epic") {
      return { ok: false, error: "Parent must be an epic." };
    }
  }

  if (input.estimate !== undefined && input.estimate !== null) {
    if (!Number.isInteger(input.estimate) || input.estimate < 0) {
      return { ok: false, error: "Estimate must be a non-negative integer." };
    }
  }

  // Reserve atomically before the transaction. If the transaction below
  // fails, the number is "lost" — fine per task 27's no-contiguity rule.
  const number = await nextIssueNumber(proj.id);

  const issueId = crypto.randomUUID();
  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(issue)
      .values({
        id: issueId,
        projectId: proj.id,
        number,
        title,
        description: input.description?.trim() || null,
        type: input.type ?? "task",
        priority: input.priority ?? "no_priority",
        assigneeId: input.assigneeId ?? null,
        reporterId: session.user.id,
        parentId: input.parentId ?? null,
        estimate: input.estimate ?? null,
      })
      .returning();

    await writeActivity(
      {
        issueId: row.id,
        actorId: session.user.id,
        kind: "created",
      },
      tx,
    );

    return row;
  });

  return { ok: true, issue: created };
}

type UpdateIssueInput = {
  issueId: string;
  title?: string;
  description?: string | null;
  status?: IssueStatus;
  priority?: IssuePriority;
  type?: IssueType;
  assigneeId?: string | null;
  parentId?: string | null;
  cycleId?: string | null;
  estimate?: number | null;
};

export type UpdateIssueResult =
  | { ok: true; issue: typeof issue.$inferSelect }
  | { ok: false; error: string };

export async function updateIssue(
  input: UpdateIssueInput,
): Promise<UpdateIssueResult> {
  const session = await requireSession();

  const existing = await db.query.issue.findFirst({
    where: eq(issue.id, input.issueId),
  });
  if (!existing) {
    return { ok: false, error: "Issue not found." };
  }

  const proj = await db.query.project.findFirst({
    where: eq(project.id, existing.projectId),
  });
  if (!proj) {
    return { ok: false, error: "Project not found." };
  }

  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, proj.workspaceId),
      eq(member.userId, session.user.id),
    ),
  });
  if (!membership) {
    return { ok: false, error: "You're not a member of this workspace." };
  }

  const patch: Partial<typeof issue.$inferInsert> = {};
  const activities: Array<{
    kind: ActivityKind;
    payload?: Record<string, unknown>;
  }> = [];

  // Title
  if (input.title !== undefined) {
    const next = input.title.trim();
    if (!next) {
      return { ok: false, error: "Title cannot be empty." };
    }
    if (next !== existing.title) {
      patch.title = next;
      activities.push({
        kind: "title_changed",
        payload: { from: existing.title, to: next },
      });
    }
  }

  // Description (no diff in payload — descriptions are long, the new value
  // lives on the issue row itself)
  if (input.description !== undefined) {
    const next = input.description?.trim() || null;
    if (next !== existing.description) {
      patch.description = next;
      activities.push({ kind: "description_changed" });
    }
  }

  // Status (drives completedAt; uses completed/reopened for terminal
  // transitions instead of a generic status_changed for nicer timeline copy)
  if (input.status !== undefined && input.status !== existing.status) {
    patch.status = input.status;
    const wasTerminal = TERMINAL_STATUSES.has(existing.status as IssueStatus);
    const willBeTerminal = TERMINAL_STATUSES.has(input.status);
    if (willBeTerminal && !wasTerminal) {
      patch.completedAt = new Date();
      activities.push({
        kind: "completed",
        payload: { status: input.status },
      });
    } else if (wasTerminal && !willBeTerminal) {
      patch.completedAt = null;
      activities.push({
        kind: "reopened",
        payload: { status: input.status },
      });
    } else {
      activities.push({
        kind: "status_changed",
        payload: { from: existing.status, to: input.status },
      });
    }
  }

  // Priority
  if (input.priority !== undefined && input.priority !== existing.priority) {
    patch.priority = input.priority;
    activities.push({
      kind: "priority_changed",
      payload: { from: existing.priority, to: input.priority },
    });
  }

  // Type
  if (input.type !== undefined && input.type !== existing.type) {
    patch.type = input.type;
    activities.push({
      kind: "type_changed",
      payload: { from: existing.type, to: input.type },
    });
  }

  // Assignee (split into assigned/unassigned for cleaner timeline copy)
  if (
    input.assigneeId !== undefined &&
    input.assigneeId !== existing.assigneeId
  ) {
    patch.assigneeId = input.assigneeId;
    if (input.assigneeId === null) {
      activities.push({ kind: "unassigned" });
    } else {
      activities.push({
        kind: "assigned",
        payload: { assigneeId: input.assigneeId },
      });
    }
  }

  // Parent — fetch + validate if a non-null new parent
  if (input.parentId !== undefined && input.parentId !== existing.parentId) {
    if (input.parentId !== null) {
      const parent = await db.query.issue.findFirst({
        where: eq(issue.id, input.parentId),
      });
      if (!parent || parent.projectId !== existing.projectId) {
        return {
          ok: false,
          error: "Parent issue not found in this project.",
        };
      }
      if (parent.type !== "epic") {
        return { ok: false, error: "Parent must be an epic." };
      }
    }
    patch.parentId = input.parentId;
    activities.push({
      kind: "parent_changed",
      payload: { from: existing.parentId, to: input.parentId },
    });
  }

  // Cycle
  if (input.cycleId !== undefined && input.cycleId !== existing.cycleId) {
    patch.cycleId = input.cycleId;
    activities.push({
      kind: "cycle_changed",
      payload: { from: existing.cycleId, to: input.cycleId },
    });
  }

  // Estimate
  if (input.estimate !== undefined && input.estimate !== existing.estimate) {
    if (input.estimate !== null) {
      if (!Number.isInteger(input.estimate) || input.estimate < 0) {
        return {
          ok: false,
          error: "Estimate must be a non-negative integer.",
        };
      }
    }
    patch.estimate = input.estimate;
    activities.push({
      kind: "estimate_changed",
      payload: { from: existing.estimate, to: input.estimate },
    });
  }

  // Cross-field invariant: an epic can't have a parent. Check after computing
  // both potential changes — covers "set type=epic" alone, "set parent on
  // existing epic" alone, and "set both at once".
  const finalType = patch.type ?? existing.type;
  const finalParentId =
    "parentId" in patch ? patch.parentId : existing.parentId;
  if (finalType === "epic" && finalParentId !== null) {
    return { ok: false, error: "An epic cannot have a parent issue." };
  }

  // No-op patch
  if (Object.keys(patch).length === 0) {
    return { ok: true, issue: existing };
  }

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(issue)
      .set(patch)
      .where(eq(issue.id, input.issueId))
      .returning();

    for (const act of activities) {
      await writeActivity(
        {
          issueId: input.issueId,
          actorId: session.user.id,
          kind: act.kind,
          payload: act.payload,
        },
        tx,
      );
    }

    return row;
  });

  return { ok: true, issue: updated };
}
