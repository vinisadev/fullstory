import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/drizzle";
import { project } from "@/drizzle/schema";
import { requireWorkspace } from "@/lib/workspace";
import { CommandPalette } from "./_components/command-palette";
import { FocusedIssueProvider } from "./_components/focused-issue";
import { GlobalShortcuts } from "./_components/global-shortcuts";
import { NewIssueDialogProvider } from "./_components/new-issue-dialog";
import { UserMenu } from "./_components/user-menu";
import { WorkspaceSidebar } from "./_components/workspace-sidebar";
import { WorkspaceSwitcher } from "./_components/workspace-switcher";

type Params = Promise<{ workspaceSlug: string }>;

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { workspaceSlug } = await params;
  const { session, workspace, workspaces } =
    await requireWorkspace(workspaceSlug);

  const projects = await db.query.project.findMany({
    where: eq(project.workspaceId, workspace.id),
    orderBy: [sql`(${project.archivedAt} IS NOT NULL)`, asc(project.name)],
  });

  const activeProjects = projects
    .filter((p) => !p.archivedAt)
    .map((p) => ({ key: p.key, name: p.name }));

  return (
    <FocusedIssueProvider>
      <NewIssueDialogProvider
        workspaceSlug={workspaceSlug}
        projects={activeProjects}
      >
        <div className="flex flex-1 overflow-hidden">
          <WorkspaceSwitcher
            workspaces={workspaces.map((w) => ({
              id: w.id,
              slug: w.slug,
              name: w.name,
              logo: w.logo,
            }))}
            activeSlug={workspaceSlug}
          />
          <WorkspaceSidebar
            workspace={{ slug: workspace.slug, name: workspace.name }}
            projects={projects.map((p) => ({
              key: p.key,
              name: p.name,
              archivedAt: p.archivedAt,
            }))}
            userMenu={
              <UserMenu
                user={{
                  name: session.user.name,
                  email: session.user.email,
                  image: session.user.image ?? null,
                }}
              />
            }
          />
          <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
          <CommandPalette
            workspaceSlug={workspaceSlug}
            projects={activeProjects}
            currentUserId={session.user.id}
            currentUserName={session.user.name}
          />
          <GlobalShortcuts workspaceSlug={workspaceSlug} />
        </div>
      </NewIssueDialogProvider>
    </FocusedIssueProvider>
  );
}
