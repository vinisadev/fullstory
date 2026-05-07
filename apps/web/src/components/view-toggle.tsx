import { LayoutGridIcon, LayoutListIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ViewToggle({
  workspaceSlug,
  projectKey,
  current,
  query = "",
}: {
  workspaceSlug: string;
  projectKey: string;
  current: "list" | "board";
  // Pre-formatted "?status=todo" or "" — pass through searchParamsToQueryString().
  query?: string;
}) {
  const listHref = `/${workspaceSlug}/${projectKey}${query}`;
  const boardHref = `/${workspaceSlug}/${projectKey}/board${query}`;
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border bg-background p-0.5">
      <ToggleLink href={listHref} active={current === "list"} label="List view">
        <LayoutListIcon className="size-3.5" />
        List
      </ToggleLink>
      <ToggleLink
        href={boardHref}
        active={current === "board"}
        label="Board view"
      >
        <LayoutGridIcon className="size-3.5" />
        Board
      </ToggleLink>
    </div>
  );
}

function ToggleLink({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50",
      )}
    >
      {children}
    </Link>
  );
}
