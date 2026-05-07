import Link from "next/link";
import { ISSUE_STATUS_COLORS, ISSUE_STATUS_LABELS } from "@/lib/issue-display";
import { cn } from "@/lib/utils";

type Child = {
  id: string;
  number: number;
  title: string;
  status: string;
};

export function ChildList({
  workspaceSlug,
  projectKey,
  items,
}: {
  workspaceSlug: string;
  projectKey: string;
  items: Child[];
}) {
  return (
    <section aria-label="Children" className="mt-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {items.length === 0 ? "Children" : `Children (${items.length})`}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No child issues yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${workspaceSlug}/${projectKey}/${c.number}`}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    ISSUE_STATUS_COLORS[c.status] ?? "bg-zinc-400",
                  )}
                  title={ISSUE_STATUS_LABELS[c.status] ?? c.status}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {projectKey}-{c.number}
                </span>
                <span className="truncate text-sm">{c.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
