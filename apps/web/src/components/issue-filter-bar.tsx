"use client";

import { ChevronDown, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ISSUE_PRIORITY_COLORS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_ORDER,
  ISSUE_STATUS_COLORS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
} from "@/lib/issue-display";
import { cn } from "@/lib/utils";

type Member = {
  userId: string;
  name: string;
};

type LabelOption = {
  id: string;
  name: string;
  color: string;
};

type Option = {
  value: string;
  label: string;
  // Optional render extras for the checkbox row.
  swatch?: { kind: "bg"; className: string } | { kind: "color"; hex: string };
  textClass?: string;
};

const FILTER_KEYS = ["status", "priority", "assignee", "label"] as const;

export function FilterBar({
  members,
  labels,
  hide = [],
}: {
  members: Member[];
  labels: LabelOption[];
  hide?: ReadonlyArray<(typeof FILTER_KEYS)[number]>;
}) {
  const visible = (key: (typeof FILTER_KEYS)[number]) => !hide.includes(key);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selected: Record<(typeof FILTER_KEYS)[number], string[]> = {
    status: parseList(searchParams.get("status")),
    priority: parseList(searchParams.get("priority")),
    assignee: parseList(searchParams.get("assignee")),
    label: parseList(searchParams.get("label")),
  };

  function commit(key: (typeof FILTER_KEYS)[number], next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 0) {
      params.delete(key);
    } else {
      params.set(key, next.join(","));
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_KEYS) params.delete(key);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  const statusOptions: Option[] = ISSUE_STATUS_ORDER.map((s) => ({
    value: s,
    label: ISSUE_STATUS_LABELS[s] ?? s,
    swatch: { kind: "bg", className: ISSUE_STATUS_COLORS[s] ?? "bg-zinc-400" },
  }));

  const priorityOptions: Option[] = ISSUE_PRIORITY_ORDER.map((p) => ({
    value: p,
    label: ISSUE_PRIORITY_LABELS[p] ?? p,
    textClass: ISSUE_PRIORITY_COLORS[p],
  }));

  const assigneeOptions: Option[] = [
    { value: "unassigned", label: "Unassigned" },
    ...members.map((m) => ({ value: m.userId, label: m.name })),
  ];

  const labelOptions: Option[] = labels.map((l) => ({
    value: l.id,
    label: l.name,
    swatch: { kind: "color", hex: l.color },
  }));

  const totalActive =
    selected.status.length +
    selected.priority.length +
    selected.assignee.length +
    selected.label.length;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-6 py-2">
      {visible("status") && (
        <FilterDropdown
          label="Status"
          options={statusOptions}
          selected={selected.status}
          onToggle={(value) => commit("status", toggle(selected.status, value))}
        />
      )}
      {visible("priority") && (
        <FilterDropdown
          label="Priority"
          options={priorityOptions}
          selected={selected.priority}
          onToggle={(value) =>
            commit("priority", toggle(selected.priority, value))
          }
        />
      )}
      {visible("assignee") && (
        <FilterDropdown
          label="Assignee"
          options={assigneeOptions}
          selected={selected.assignee}
          onToggle={(value) =>
            commit("assignee", toggle(selected.assignee, value))
          }
        />
      )}
      {visible("label") && (
        <FilterDropdown
          label="Label"
          options={labelOptions}
          selected={selected.label}
          emptyText="No labels in this workspace yet."
          onToggle={(value) => commit("label", toggle(selected.label, value))}
        />
      )}
      {totalActive > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="ml-1 h-7 px-2 text-muted-foreground"
        >
          <X className="size-3" />
          Clear
        </Button>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  options,
  selected,
  emptyText,
  onToggle,
}: {
  label: string;
  options: Option[];
  selected: string[];
  emptyText?: string;
  onToggle: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            {emptyText ?? "No options available."}
          </p>
        ) : (
          options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selected.includes(opt.value)}
              onSelect={(e) => {
                // Keep the menu open across multiple toggles.
                e.preventDefault();
                onToggle(opt.value);
              }}
              className={opt.textClass}
            >
              {opt.swatch?.kind === "bg" && (
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", opt.swatch.className)}
                />
              )}
              {opt.swatch?.kind === "color" && (
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: opt.swatch.hex }}
                />
              )}
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}
