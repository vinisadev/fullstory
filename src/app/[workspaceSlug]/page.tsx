import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/drizzle";
import { project } from "@/drizzle/schema";
import { getRole, isAtLeast } from "@/lib/roles";
import { requireWorkspace } from "@/lib/workspace";
import { NewProjectDialog } from "./new-project-dialog";

type Params = Promise<{ workspaceSlug: string }>;

export default async function WorkspaceHome({ params }: { params: Params }) {
  const { workspaceSlug } = await params;
  const { session, workspace } = await requireWorkspace(workspaceSlug);

  const role = await getRole(workspace.id, session.user.id);
  const canCreate = role !== null && isAtLeast(role, "admin");

  // Active (archivedAt IS NULL) first, then archived. Alphabetical within
  // each bucket. Postgres orders booleans false < true so the IS NOT NULL
  // expression naturally puts active rows first.
  const projects = await db.query.project.findMany({
    where: eq(project.workspaceId, workspace.id),
    orderBy: [sql`(${project.archivedAt} IS NOT NULL)`, asc(project.name)],
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {workspace.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {projects.length === 0
              ? "No projects yet."
              : `${projects.length} ${projects.length === 1 ? "project" : "projects"}.`}
          </p>
        </div>
        {canCreate && <NewProjectDialog workspaceSlug={workspaceSlug} />}
      </header>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {canCreate
                ? "Create your first project to start tracking issues."
                : "Ask a workspace admin to create a project."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/${workspaceSlug}/${p.key}`}
                className="block transition-colors"
              >
                <Card className="hover:bg-muted/40">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {p.key}
                      </Badge>
                      <CardTitle className="font-medium">{p.name}</CardTitle>
                      {p.archivedAt && (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </div>
                    {p.description && (
                      <CardDescription className="line-clamp-2">
                        {p.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
