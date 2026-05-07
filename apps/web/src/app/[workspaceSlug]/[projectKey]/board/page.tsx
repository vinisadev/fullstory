import { and, asc, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FilterBar } from "@/components/issue-filter-bar";
import { Badge } from "@/components/ui/badge";
import { ViewToggle } from "@/components/view-toggle";
import { db } from "@/drizzle";
import { issue, label, project } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { ISSUE_STATUS_ORDER } from "@/lib/issue-display";
import {
  buildIssueFilterConditions,
  parseIssueFilters,
  searchParamsToQueryString,
} from "@/lib/issue-filters";
import { requireWorkspace } from "@/lib/workspace";
import { BoardClient, type BoardIssue } from "./board-client";

type Params = Promise<{ workspaceSlug: string; projectKey: string }>;
type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

export default async function BoardPage({
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

  const queryString = searchParamsToQueryString(sp);

  // Pre-bucket on the server so empty columns still render with headers
  // and the BoardClient receives a fully-formed initial state.
  const byStatus: Record<string, BoardIssue[]> = Object.fromEntries(
    ISSUE_STATUS_ORDER.map((s) => [s, []]),
  );
  for (const iss of issues) {
    byStatus[iss.status]?.push(iss);
  }

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
          current="board"
          query={queryString}
        />
        <p className="ml-auto text-sm text-muted-foreground">
          {issues.length} {issues.length === 1 ? "issue" : "issues"}
        </p>
      </header>

      <FilterBar
        members={members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
        }))}
        labels={workspaceLabels}
        // Status is the board's column axis — filtering by it would hide
        // columns, which is confusing. Priority is omitted per PLAN's
        // explicit "(assignee, label)" wording. Both still apply via URL
        // when present, just not surfaced in the bar.
        hide={["status", "priority"]}
      />

      <BoardClient
        workspaceSlug={workspaceSlug}
        projectKey={proj.key}
        initialByStatus={byStatus}
      />
    </main>
  );
}
