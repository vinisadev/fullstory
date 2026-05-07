import { headers } from "next/headers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { requireWorkspace } from "@/lib/workspace";
import { InviteForm } from "./invite-form";
import { SettingsForm } from "./settings-form";

type Params = Promise<{ workspaceSlug: string }>;

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Params;
}) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspace(workspaceSlug);

  const { members } = await auth.api.listMembers({
    headers: await headers(),
    query: { organizationId: workspace.id },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          Workspace settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace name, URL, and members.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Owners and admins can rename the workspace or change its URL slug.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            workspace={{
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite a member</CardTitle>
          <CardDescription>
            Generate a shareable link the recipient can use to join. Send it
            through any channel you like.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm workspaceId={workspace.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>
            People with access to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.user.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.user.email}
                  </TableCell>
                  <TableCell className="capitalize">{m.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
