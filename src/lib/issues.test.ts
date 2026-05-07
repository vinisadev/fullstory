import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/drizzle";
import { activity, issue, organization, project } from "@/drizzle/schema";
import { nextIssueNumber, writeActivity } from "@/lib/issues";

// Integration test: requires a reachable Postgres at DATABASE_URL with
// migrations applied (the project table needs `last_issue_number`). Skips
// silently when the env var is missing.
const describeMaybe = process.env.DATABASE_URL ? describe : describe.skip;

describeMaybe("nextIssueNumber concurrency", () => {
  const orgId = `test-org-${crypto.randomUUID()}`;
  const projectId = `test-project-${crypto.randomUUID()}`;

  beforeAll(async () => {
    await db.insert(organization).values({
      id: orgId,
      name: "test workspace",
      slug: `test-${orgId.slice(0, 12)}`,
      createdAt: new Date(),
    });
    await db.insert(project).values({
      id: projectId,
      workspaceId: orgId,
      key: "TST",
      name: "Test Project",
    });
  });

  afterAll(async () => {
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
  });

  it("returns N distinct, sequential numbers under N parallel calls", async () => {
    const N = 25;
    const results = await Promise.all(
      Array.from({ length: N }, () => nextIssueNumber(projectId)),
    );

    expect(new Set(results).size).toBe(N);
    const sorted = [...results].sort((a, b) => a - b);
    expect(sorted[0]).toBe(1);
    expect(sorted[N - 1]).toBe(N);
  });

  it("continues from the last number on subsequent calls", async () => {
    // Previous test consumed 1..N. The next number must be N+1.
    const next = await nextIssueNumber(projectId);
    expect(next).toBe(26);
  });

  it("throws when the project does not exist", async () => {
    await expect(nextIssueNumber("nonexistent")).rejects.toThrow(/not found/i);
  });
});

describeMaybe("writeActivity", () => {
  const orgId = `test-org-${crypto.randomUUID()}`;
  const projectId = `test-project-${crypto.randomUUID()}`;
  const issueId = `test-issue-${crypto.randomUUID()}`;

  beforeAll(async () => {
    await db.insert(organization).values({
      id: orgId,
      name: "test workspace",
      slug: `test-${orgId.slice(0, 12)}`,
      createdAt: new Date(),
    });
    await db.insert(project).values({
      id: projectId,
      workspaceId: orgId,
      key: "ACT",
      name: "Activity Test",
    });
    // No real user — actor_id is nullable and we use a fake string only when
    // needed. For most cases we pass null so we don't need a user fixture.
    await db.insert(issue).values({
      id: issueId,
      projectId,
      number: 1,
      title: "Test issue",
      reporterId: null,
    });
  });

  afterAll(async () => {
    // CASCADE delete from issue cleans up activity rows automatically.
    await db.delete(issue).where(eq(issue.id, issueId));
    await db.delete(project).where(eq(project.id, projectId));
    await db.delete(organization).where(eq(organization.id, orgId));
  });

  it("writes a row with the typed kind and payload", async () => {
    await writeActivity({
      issueId,
      actorId: null,
      kind: "status_changed",
      payload: { from: "todo", to: "in_progress" },
    });

    const rows = await db
      .select()
      .from(activity)
      .where(eq(activity.issueId, issueId))
      .orderBy(asc(activity.createdAt));

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("status_changed");
    expect(rows[0].payload).toEqual({ from: "todo", to: "in_progress" });
    expect(rows[0].actorId).toBeNull();
  });

  it("defaults missing payload to an empty object", async () => {
    await writeActivity({
      issueId,
      actorId: null,
      kind: "created",
    });

    const rows = await db
      .select()
      .from(activity)
      .where(eq(activity.issueId, issueId))
      .orderBy(asc(activity.createdAt));

    // First row from the previous test, plus this new one.
    expect(rows).toHaveLength(2);
    expect(rows[1].kind).toBe("created");
    expect(rows[1].payload).toEqual({});
  });

  it("preserves chronological order via the composite index", async () => {
    const before = await db
      .select()
      .from(activity)
      .where(eq(activity.issueId, issueId));

    await writeActivity({ issueId, actorId: null, kind: "assigned" });
    await writeActivity({ issueId, actorId: null, kind: "labeled" });
    await writeActivity({ issueId, actorId: null, kind: "completed" });

    const after = await db
      .select()
      .from(activity)
      .where(eq(activity.issueId, issueId))
      .orderBy(asc(activity.createdAt));

    const newKinds = after.slice(before.length).map((r) => r.kind);
    expect(newKinds).toEqual(["assigned", "labeled", "completed"]);
  });
});
