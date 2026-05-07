import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { db } from "@/drizzle";
import { activity, issue, issueLabel, label, project } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { requireWorkspace } from "@/lib/workspace";
import { FocusIssue } from "../../_components/focused-issue";
import { ActivityTimeline } from "./activity-timeline";
import { ChildList } from "./child-list";
import { IssueFields } from "./issue-fields";

type Params = Promise<{
  workspaceSlug: string;
  projectKey: string;
  issueNumber: string;
}>;

export default async function IssuePage({ params }: { params: Params }) {
  const { workspaceSlug, projectKey, issueNumber } = await params;

  const number = Number.parseInt(issueNumber, 10);
  if (Number.isNaN(number) || number <= 0) notFound();

  const { workspace } = await requireWorkspace(workspaceSlug);

  const proj = await db.query.project.findFirst({
    where: and(
      eq(project.workspaceId, workspace.id),
      eq(project.key, projectKey.toUpperCase()),
    ),
  });
  if (!proj) notFound();

  const iss = await db.query.issue.findFirst({
    where: and(eq(issue.projectId, proj.id), eq(issue.number, number)),
    with: {
      assignee: true,
      reporter: true,
      parent: true,
    },
  });
  if (!iss) notFound();

  const labelRows = await db
    .select({ id: label.id, name: label.name, color: label.color })
    .from(issueLabel)
    .innerJoin(label, eq(issueLabel.labelId, label.id))
    .where(eq(issueLabel.issueId, iss.id));

  const activities = await db.query.activity.findMany({
    where: eq(activity.issueId, iss.id),
    orderBy: asc(activity.createdAt),
    with: {
      actor: { columns: { id: true, name: true } },
    },
  });

  const { members } = await auth.api.listMembers({
    headers: await headers(),
    query: { organizationId: workspace.id },
  });

  // Epics in this project drive the parent picker (only renders for non-epic
  // issues, but we always fetch — the list is small and the optimistic UI
  // can flip type without a refetch).
  const epics = await db.query.issue.findMany({
    where: and(eq(issue.projectId, proj.id), eq(issue.type, "epic")),
    columns: { id: true, number: true, title: true },
    orderBy: asc(issue.number),
  });

  // Children only for epics; empty list otherwise.
  const children =
    iss.type === "epic"
      ? await db.query.issue.findMany({
          where: eq(issue.parentId, iss.id),
          columns: {
            id: true,
            number: true,
            title: true,
            status: true,
          },
          orderBy: asc(issue.number),
        })
      : [];

  const issueKey = `${proj.key}-${iss.number}`;

  return (
    <main className="flex flex-1 overflow-hidden">
      <FocusIssue id={iss.id} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl p-6">
          <header className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Link
                href={`/${workspaceSlug}/${proj.key}`}
                className="hover:opacity-80"
              >
                <Badge variant="outline" className="font-mono">
                  {issueKey}
                </Badge>
              </Link>
              <span className="text-sm text-muted-foreground">
                in {proj.name}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {iss.title}
            </h1>
          </header>
          <article className="mt-6">
            {iss.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {iss.description}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No description.
              </p>
            )}
          </article>
          {iss.type === "epic" && (
            <ChildList
              workspaceSlug={workspaceSlug}
              projectKey={proj.key}
              items={children}
            />
          )}
          <ActivityTimeline
            activities={activities}
            members={members.map((m) => ({
              userId: m.userId,
              name: m.user.name,
            }))}
          />
        </div>
      </div>

      <aside className="sticky top-0 w-72 shrink-0 self-start overflow-y-auto border-l p-4">
        <h2 className="sr-only">Issue details</h2>
        <IssueFields
          projectKey={proj.key}
          initial={{
            id: iss.id,
            status: iss.status,
            priority: iss.priority,
            type: iss.type,
            assigneeId: iss.assigneeId,
            parentId: iss.parentId,
            estimate: iss.estimate,
            cycleId: iss.cycleId,
          }}
          members={members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
          }))}
          epics={epics}
          reporterName={iss.reporter?.name ?? null}
        />
        {labelRows.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Labels
            </span>
            <div className="flex flex-wrap justify-end gap-1">
              {labelRows.map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  {l.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
