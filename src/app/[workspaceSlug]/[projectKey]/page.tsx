import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FilterBar } from "@/components/issue-filter-bar";
import { IssueTable } from "@/components/issue-table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/drizzle";
import { issue, issueLabel, label, project } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { requireWorkspace } from "@/lib/workspace";

type Params = Promise<{ workspaceSlug: string; projectKey: string }>;
type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

export default async function ProjectIssuesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { workspaceSlug, projectKey } = await params;
  const sp = await searchParams;

  const { workspace } = await requireWorkspace(workspaceSlug);

  const proj = await db.query.project.findFirst({
    where: and(
      eq(project.workspaceId, workspace.id),
      eq(project.key, projectKey.toUpperCase()),
    ),
  });
  if (!proj) notFound();

  const statusFilters = parseList(sp.status);
  const priorityFilters = parseList(sp.priority);
  const assigneeFilters = parseList(sp.assignee);
  const labelFilters = parseList(sp.label);

  const conditions = [eq(issue.projectId, proj.id)];

  if (statusFilters.length > 0) {
    conditions.push(
      inArray(
        issue.status,
        statusFilters as (typeof issue.status.enumValues)[number][],
      ),
    );
  }
  if (priorityFilters.length > 0) {
    conditions.push(
      inArray(
        issue.priority,
        priorityFilters as (typeof issue.priority.enumValues)[number][],
      ),
    );
  }
  if (assigneeFilters.length > 0) {
    const userIds = assigneeFilters.filter((v) => v !== "unassigned");
    const includeUnassigned = assigneeFilters.includes("unassigned");
    const clauses = [];
    if (userIds.length > 0) clauses.push(inArray(issue.assigneeId, userIds));
    if (includeUnassigned) clauses.push(isNull(issue.assigneeId));
    if (clauses.length === 1) conditions.push(clauses[0]);
    else if (clauses.length > 1) {
      const orClause = or(...clauses);
      if (orClause) conditions.push(orClause);
    }
  }
  if (labelFilters.length > 0) {
    // "Has any selected label" via subquery — labels OR-semantics.
    const issueIdsWithLabel = db
      .select({ id: issueLabel.issueId })
      .from(issueLabel)
      .where(inArray(issueLabel.labelId, labelFilters));
    conditions.push(inArray(issue.id, issueIdsWithLabel));
  }

  const issues = await db.query.issue.findMany({
    where: and(...conditions),
    with: {
      assignee: { columns: { id: true, name: true } },
      project: { columns: { key: true } },
    },
    orderBy: [desc(issue.updatedAt)],
  });

  const { members } = await auth.api.listMembers({
    headers: await headers(),
    query: { organizationId: workspace.id },
  });

  const workspaceLabels = await db
    .select({ id: label.id, name: label.name, color: label.color })
    .from(label)
    .where(eq(label.workspaceId, workspace.id))
    .orderBy(asc(label.name));

  const hasFilters =
    statusFilters.length +
      priorityFilters.length +
      assigneeFilters.length +
      labelFilters.length >
    0;

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-baseline gap-3 border-b px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">{proj.name}</h1>
        <Badge variant="outline" className="font-mono text-[10px]">
          {proj.key}
        </Badge>
        <p className="ml-auto text-sm text-muted-foreground">
          {issues.length === 0
            ? hasFilters
              ? "No matches"
              : "No issues yet"
            : `${issues.length} ${issues.length === 1 ? "issue" : "issues"}`}
        </p>
      </header>

      <FilterBar
        members={members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
        }))}
        labels={workspaceLabels}
      />

      {issues.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            {hasFilters ? (
              <p className="text-sm text-muted-foreground">
                No issues match the current filters.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  No issues in this project yet.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The Create-issue keyboard shortcut lands in task 42.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <IssueTable workspaceSlug={workspaceSlug} issues={issues} />
        </div>
      )}
    </main>
  );
}

function parseList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const str = Array.isArray(value) ? value[0] : value;
  return str.split(",").filter(Boolean);
}
