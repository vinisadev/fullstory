import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { FilterBar } from "@/components/issue-filter-bar";
import { IssueTable } from "@/components/issue-table";
import { db } from "@/drizzle";
import { issue, label, project } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import {
  buildIssueFilterConditions,
  hasAnyIssueFilter,
  parseIssueFilters,
} from "@/lib/issue-filters";
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

  const filters = parseIssueFilters(sp);

  const projectIdsInWorkspace = db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.workspaceId, workspace.id));

  const issues = await db.query.issue.findMany({
    where: and(
      eq(issue.assigneeId, session.user.id),
      inArray(issue.projectId, projectIdsInWorkspace),
      ...buildIssueFilterConditions(filters),
    ),
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

  const hasFilters = hasAnyIssueFilter(filters);

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
