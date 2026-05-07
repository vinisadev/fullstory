import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/drizzle";
import { project } from "@/drizzle/schema";
import { auth } from "@/lib/auth";
import { getRole, isAtLeast } from "@/lib/roles";
import { requireWorkspace } from "@/lib/workspace";
import { ProjectSettingsForm } from "./settings-form";

type Params = Promise<{ workspaceSlug: string; projectKey: string }>;

export default async function ProjectSettingsPage({
  params,
}: {
  params: Params;
}) {
  const { workspaceSlug, projectKey } = await params;
  const { session, workspace } = await requireWorkspace(workspaceSlug);

  // Admin or owner only — non-admins shouldn't even see the page.
  const role = await getRole(workspace.id, session.user.id);
  if (!role || !isAtLeast(role, "admin")) {
    redirect(`/${workspaceSlug}`);
  }

  const proj = await db.query.project.findFirst({
    where: and(
      eq(project.workspaceId, workspace.id),
      eq(project.key, projectKey.toUpperCase()),
    ),
  });
  if (!proj) {
    notFound();
  }

  const { members } = await auth.api.listMembers({
    headers: await headers(),
    query: { organizationId: workspace.id },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          {proj.name} settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage project name, lead, description, and archive state.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            The key is fixed at creation — changing it would break every
            existing issue URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectSettingsForm
            project={{
              id: proj.id,
              key: proj.key,
              name: proj.name,
              description: proj.description,
              leadId: proj.leadId,
              archivedAt: proj.archivedAt,
            }}
            members={members.map((m) => ({
              userId: m.userId,
              name: m.user.name,
              email: m.user.email,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
