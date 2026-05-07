import { Inbox, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Workspace = {
  slug: string;
  name: string;
};

type Project = {
  key: string;
  name: string;
  archivedAt: Date | null;
};

export function WorkspaceSidebar({
  workspace,
  projects,
  userMenu,
}: {
  workspace: Workspace;
  projects: Project[];
  userMenu: React.ReactNode;
}) {
  const activeProjects = projects.filter((p) => !p.archivedAt);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar">
      <header className="flex items-center justify-between gap-2 px-3 py-3">
        <h2 className="truncate text-sm font-semibold tracking-tight">
          {workspace.name}
        </h2>
        <Link
          href={`/${workspace.slug}/settings`}
          aria-label="Workspace settings"
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="size-4" />
        </Link>
      </header>

      <nav
        aria-label={`${workspace.name} navigation`}
        className="flex-1 overflow-y-auto px-2 py-1"
      >
        <SidebarLink
          href={`/${workspace.slug}/my-issues`}
          icon={<UserIcon className="size-4" />}
          label="My issues"
        />
        <SidebarLink
          href={`/${workspace.slug}/inbox`}
          icon={<Inbox className="size-4" />}
          label="Inbox"
        />

        <div className="mt-4 px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Projects
        </div>
        {activeProjects.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No projects yet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {activeProjects.map((p) => (
              <li key={p.key}>
                <Link
                  href={`/${workspace.slug}/${p.key}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
                >
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase"
                  >
                    {p.key}
                  </Badge>
                  <span className="truncate">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t p-2">{userMenu}</div>
    </aside>
  );
}

function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-sidebar-accent"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
