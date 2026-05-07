import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/drizzle";
import { activity, project } from "@/drizzle/schema";

// Atomically reserves the next issue number for a project and returns it.
//
// Implemented as a single `UPDATE … SET last_issue_number = last_issue_number
// + 1 RETURNING last_issue_number` against the project row, which serializes
// concurrent callers via Postgres' row-level lock. Each caller gets a distinct
// post-increment value — that value IS the new issue's number, since
// last_issue_number always equals the highest number ever handed out.
//
// Numbers may be skipped if a caller reserves a number but then aborts the
// surrounding insert. That's acceptable — issue numbers don't need to be
// contiguous, only unique-and-monotonic per project.
export async function nextIssueNumber(projectId: string): Promise<number> {
  const [row] = await db
    .update(project)
    .set({ lastIssueNumber: sql`${project.lastIssueNumber} + 1` })
    .where(eq(project.id, projectId))
    .returning({ number: project.lastIssueNumber });

  if (!row) {
    throw new Error(`Project ${projectId} not found`);
  }
  return row.number;
}

// The closed set of activity kinds. Plain text in the DB so adding a new kind
// doesn't require a migration, but writers must use one of these strings —
// the union catches typos at the type level.
export type ActivityKind =
  | "created"
  | "title_changed"
  | "description_changed"
  | "status_changed"
  | "priority_changed"
  | "type_changed"
  | "estimate_changed"
  | "assigned"
  | "unassigned"
  | "labeled"
  | "unlabeled"
  | "parent_changed"
  | "cycle_changed"
  | "completed"
  | "reopened"
  | "commented";

type WriteActivityInput = {
  issueId: string;
  actorId: string | null;
  kind: ActivityKind;
  payload?: Record<string, unknown>;
};

// Either the top-level db handle or a transaction handle from
// db.transaction(). PgTransaction lacks `$client`, so `typeof db` alone is
// too narrow — extracting the callback-arg type lets us accept both.
type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Writes one activity row. Every issue mutation must call this — it's the
// single source of truth for the timeline view (task 36) and seeds
// notifications (task 70). See the "Activity logging" section in AGENTS.md.
//
// Accepts an optional Drizzle transaction so it can run alongside a mutation
// in the same atomic boundary; defaults to the global db when called outside
// one.
export async function writeActivity(
  input: WriteActivityInput,
  executor: DbExecutor = db,
): Promise<void> {
  await executor.insert(activity).values({
    id: crypto.randomUUID(),
    issueId: input.issueId,
    actorId: input.actorId,
    kind: input.kind,
    payload: input.payload ?? {},
  });
}
