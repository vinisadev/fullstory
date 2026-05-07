import { and, asc, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FilterBar } from "@/components/issue-filter-bar";
import { IssueTable } from "@/components/issue-table";
import { Badge } from "@/components/ui/badge";
import { ViewToggle } from "@/components/view-toggle";
import { db } from "@/drizzle";
import { issue, label, project } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import {
  buildIssueFilterConditions,
  hasAnyIssueFilter,
  parseIssueFilters,
  searchParamsToQueryString,
} from "@/lib/issue-filters";
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

  const filters = parseIssueFilters(sp);
  const issues = await db.query.issue.findMany({
    where: and(
      eq(issue.projectId, proj.id),
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
  const queryString = searchParamsToQueryString(sp);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-baseline gap-3 border-b px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">{proj.name}</h1>
        <Badge variant="outline" className="font-mono text-[10px]">
          {proj.key}
        </Badge>
        <ViewToggle
          workspaceSlug={workspaceSlug}
          projectKey={proj.key}
          current="list"
          query={queryString}
        />
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
                  Press{" "}
                  <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">
                    c
                  </kbd>{" "}
                  to create one.
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
