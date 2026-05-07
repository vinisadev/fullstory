import { requireWorkspace } from "@/lib/workspace";

type Params = Promise<{ workspaceSlug: string }>;

export default async function WorkspaceHome({ params }: { params: Params }) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspace(workspaceSlug);

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {workspace.name}
        </h1>
      </div>
    </main>
  );
}
