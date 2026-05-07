import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { FilterBar } from "@/components/issue-filter-bar";
import { IssueTable } from "@/components/issue-table";
import { db } from "@/drizzle";
import { issue, issueLabel, label, project } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { requireWorkspace } from "@/lib/workspace";

type Params = Promise<{ workspaceSlug: string }>;
type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

export default async function MyIssuesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { workspaceSlug } = await params;
  const sp = await searchParams;
  const { session, workspace } = await requireWorkspace(workspaceSlug);

  const statusFilters = parseList(sp.status);
  const priorityFilters = parseList(sp.priority);
  const labelFilters = parseList(sp.label);

  // Issues in any project that belongs to this workspace, assigned to me.
  const projectIdsInWorkspace = db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.workspaceId, workspace.id));

  const conditions = [
    eq(issue.assigneeId, session.user.id),
    inArray(issue.projectId, projectIdsInWorkspace),
  ];

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
  if (labelFilters.length > 0) {
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
    statusFilters.length + priorityFilters.length + labelFilters.length > 0;

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-baseline gap-3 border-b px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">My issues</h1>
        <p className="ml-auto text-sm text-muted-foreground">
          {issues.length === 0
            ? hasFilters
              ? "No matches"
              : "Nothing assigned to you"
            : `${issues.length} ${issues.length === 1 ? "issue" : "issues"}`}
        </p>
      </header>

      <FilterBar
        members={members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
        }))}
        labels={workspaceLabels}
        hide={["assignee"]}
      />

      {issues.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "No assigned issues match the current filters."
              : "Nothing's assigned to you in this workspace."}
          </p>
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
