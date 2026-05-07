import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Workspace = {
  id: string;
  slug: string;
  name: string;
  logo: string | null | undefined;
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function WorkspaceSwitcher({
  workspaces,
  activeSlug,
}: {
  workspaces: Workspace[];
  activeSlug: string;
}) {
  return (
    <nav
      aria-label="Workspaces"
      className="flex w-[72px] shrink-0 flex-col items-center gap-2 border-r bg-sidebar py-3"
    >
      {workspaces.map((w) => {
        const active = w.slug === activeSlug;
        return (
          <Link
            key={w.id}
            href={`/${w.slug}`}
            aria-current={active ? "page" : undefined}
            aria-label={w.name}
            title={w.name}
            className="group relative flex size-12 items-center justify-center"
          >
            {/* Discord-style left-edge pill. -left-3 (-12px) places it flush
                with the rail's left border. h-0 hidden → h-4 small dot on
                hover → h-10 full pill when active. */}
            <span
              aria-hidden
              className={cn(
                "absolute -left-3 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all duration-150",
                active ? "h-10" : "h-0 group-hover:h-4",
              )}
            />
            <div
              className={cn(
                "flex size-12 select-none items-center justify-center overflow-hidden text-sm font-semibold transition-all duration-150",
                active
                  ? "rounded-xl bg-primary text-primary-foreground"
                  : "rounded-3xl bg-sidebar-accent text-sidebar-accent-foreground group-hover:rounded-xl group-hover:bg-primary group-hover:text-primary-foreground",
              )}
            >
              {w.logo ? (
                // biome-ignore lint/performance/noImgElement: external URLs not in remotePatterns
                <img
                  src={w.logo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(w.name)
              )}
            </div>
          </Link>
        );
      })}

      <div aria-hidden className="my-1 h-px w-8 bg-border" />

      <Link
        href="/onboarding"
        aria-label="Create workspace"
        title="Create workspace"
        className={cn(
          "flex size-12 items-center justify-center rounded-3xl border-2 border-dashed border-muted-foreground/40 text-muted-foreground transition-all duration-150",
          "hover:rounded-xl hover:border-solid hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500",
        )}
      >
        <Plus className="size-5" />
      </Link>
    </nav>
  );
}
