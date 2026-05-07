// Shared DTO serializers for /api/v1/* response shapes. Centralized so list
// + get + create + patch endpoints stay in lockstep — the MCP server's tools
// rely on identical shapes across operations.
//
// Keep DTOs narrow: only fields that external consumers should see. Internal
// counters (e.g., last_issue_number) and server-only IDs stay off the wire.

import type { activity, issue, project } from "@/drizzle/schema";

export type ProjectDto = {
  id: string;
  workspaceId: string;
  key: string;
  name: string;
  description: string | null;
  leadId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function projectToDto(p: typeof project.$inferSelect): ProjectDto {
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    key: p.key,
    name: p.name,
    description: p.description,
    leadId: p.leadId,
    archivedAt: p.archivedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export type IssueDto = {
  id: string;
  number: number;
  // Composite key like "WEB-12" — included for API consumers that show
  // issues in chat/CLI contexts and want a human-readable identifier
  // without joining tables themselves.
  key: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  reporterId: string | null;
  parentId: string | null;
  cycleId: string | null;
  estimate: number | null;
  projectId: string;
  projectKey: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export function issueToDto(
  iss: typeof issue.$inferSelect,
  projectKey: string,
): IssueDto {
  return {
    id: iss.id,
    number: iss.number,
    key: `${projectKey}-${iss.number}`,
    title: iss.title,
    description: iss.description,
    type: iss.type,
    status: iss.status,
    priority: iss.priority,
    assigneeId: iss.assigneeId,
    reporterId: iss.reporterId,
    parentId: iss.parentId,
    cycleId: iss.cycleId,
    estimate: iss.estimate,
    projectId: iss.projectId,
    projectKey,
    createdAt: iss.createdAt,
    updatedAt: iss.updatedAt,
    completedAt: iss.completedAt,
  };
}

export type ActivityDto = {
  id: string;
  issueId: string;
  actor: { id: string; name: string } | null;
  kind: string;
  // Shape varies by kind. Writers in src/lib/issues.ts own the contract;
  // see the ActivityKind union for the closed set of recognized values.
  payload: Record<string, unknown>;
  createdAt: Date;
};

export function activityToDto(
  a: typeof activity.$inferSelect & {
    actor: { id: string; name: string } | null;
  },
): ActivityDto {
  return {
    id: a.id,
    issueId: a.issueId,
    actor: a.actor,
    kind: a.kind,
    payload: a.payload,
    createdAt: a.createdAt,
  };
}
