"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateIssue } from "@/lib/issue-actions";
import {
  ISSUE_PRIORITY_COLORS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_ORDER,
  ISSUE_STATUS_COLORS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
} from "@/lib/issue-display";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "canceled";
type IssuePriority = "no_priority" | "urgent" | "high" | "medium" | "low";
type IssueType = "task" | "bug" | "epic";

type IssueState = {
  id: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  assigneeId: string | null;
  parentId: string | null;
  estimate: number | null;
  cycleId: string | null;
};

type Member = {
  userId: string;
  name: string;
  email: string;
};

type Epic = {
  id: string;
  number: number;
  title: string;
};

export function IssueFields({
  projectKey,
  initial,
  members,
  epics,
  reporterName,
}: {
  projectKey: string;
  initial: IssueState;
  members: Member[];
  epics: Epic[];
  reporterName: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(
    initial,
    (state, patch: Partial<IssueState>) => ({ ...state, ...patch }),
  );

  function update(patch: Partial<IssueState>) {
    startTransition(async () => {
      applyOptimistic(patch);
      const result = await updateIssue({ issueId: initial.id, ...patch });
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <dl className="flex flex-col gap-3 text-sm">
      <FieldRow label="Status">
        <StatusPicker
          value={optimistic.status}
          onChange={(status) => update({ status })}
        />
      </FieldRow>
      <FieldRow label="Priority">
        <PriorityPicker
          value={optimistic.priority}
          onChange={(priority) => update({ priority })}
        />
      </FieldRow>
      <FieldRow label="Type">
        <TypePicker
          value={optimistic.type}
          onChange={(type) => update({ type })}
        />
      </FieldRow>
      <FieldRow label="Assignee">
        <AssigneePicker
          value={optimistic.assigneeId}
          members={members}
          onChange={(assigneeId) => update({ assigneeId })}
        />
      </FieldRow>
      <FieldRow label="Reporter">
        {reporterName ?? <span className="text-muted-foreground">—</span>}
      </FieldRow>
      <FieldRow label="Estimate">
        <EstimateInput
          value={optimistic.estimate}
          onChange={(estimate) => update({ estimate })}
        />
      </FieldRow>
      <FieldRow label="Cycle">
        {optimistic.cycleId ?? (
          <span className="text-muted-foreground">No cycle</span>
        )}
      </FieldRow>
      {optimistic.type !== "epic" && (
        <FieldRow label="Parent">
          <ParentPicker
            value={optimistic.parentId}
            epics={epics}
            projectKey={projectKey}
            onChange={(parentId) => update({ parentId })}
          />
        </FieldRow>
      )}
    </dl>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function StatusPicker({
  value,
  onChange,
}: {
  value: IssueStatus;
  onChange: (status: IssueStatus) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as IssueStatus)}>
      <SelectTrigger className="h-7 gap-1.5 border-0 bg-transparent px-2 hover:bg-muted">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn("size-2 rounded-full", STATUS_COLORS[s])}
              />
              {STATUS_LABELS[s]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PriorityPicker({
  value,
  onChange,
}: {
  value: IssuePriority;
  onChange: (priority: IssuePriority) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as IssuePriority)}>
      <SelectTrigger className="h-7 gap-1.5 border-0 bg-transparent px-2 hover:bg-muted">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_ORDER.map((p) => (
          <SelectItem key={p} value={p}>
            <span className={PRIORITY_COLORS[p]}>{PRIORITY_LABELS[p]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TypePicker({
  value,
  onChange,
}: {
  value: IssueType;
  onChange: (type: IssueType) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as IssueType)}>
      <SelectTrigger className="h-7 gap-1.5 border-0 bg-transparent px-2 capitalize hover:bg-muted">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(["task", "bug", "epic"] as const).map((t) => (
          <SelectItem key={t} value={t}>
            <span className="capitalize">{t}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AssigneePicker({
  value,
  members,
  onChange,
}: {
  value: string | null;
  members: Member[];
  onChange: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = value ? members.find((m) => m.userId === value) : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="rounded-md px-2 py-0.5 text-sm hover:bg-muted">
        {current ? (
          current.name
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandItem
              onSelect={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "size-4",
                  value === null ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="text-muted-foreground">Unassigned</span>
            </CommandItem>
            {members.map((m) => (
              <CommandItem
                key={m.userId}
                value={`${m.name} ${m.email}`}
                onSelect={() => {
                  onChange(m.userId);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "size-4",
                    value === m.userId ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="flex flex-col">
                  <span>{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.email}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ParentPicker({
  value,
  epics,
  projectKey,
  onChange,
}: {
  value: string | null;
  epics: Epic[];
  projectKey: string;
  onChange: (epicId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = value ? epics.find((e) => e.id === value) : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="rounded-md px-2 py-0.5 text-sm hover:bg-muted">
        {current ? (
          <span className="font-mono text-xs">
            {projectKey}-{current.number}
          </span>
        ) : (
          <span className="text-muted-foreground">No parent</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search epics..." />
          <CommandList>
            <CommandEmpty>
              {epics.length === 0
                ? "No epics in this project."
                : "No matching epics."}
            </CommandEmpty>
            <CommandItem
              onSelect={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "size-4",
                  value === null ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="text-muted-foreground">No parent</span>
            </CommandItem>
            {epics.map((e) => (
              <CommandItem
                key={e.id}
                value={`${projectKey}-${e.number} ${e.title}`}
                onSelect={() => {
                  onChange(e.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "size-4",
                    value === e.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {projectKey}-{e.number}
                </span>
                <span className="truncate">{e.title}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function EstimateInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (estimate: number | null) => void;
}) {
  // Local state so the field doesn't lose intermediate keystrokes during the
  // transition; commit on blur or Enter.
  const [local, setLocal] = useState(value?.toString() ?? "");

  function commit() {
    const trimmed = local.trim();
    const next = trimmed === "" ? null : Number.parseInt(trimmed, 10);
    if (next !== null && (Number.isNaN(next) || next < 0)) {
      // Bad input — revert to current value
      setLocal(value?.toString() ?? "");
      return;
    }
    if (next !== value) {
      onChange(next);
    }
  }

  return (
    <Input
      type="number"
      min={0}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setLocal(value?.toString() ?? "");
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder="—"
      className="h-7 w-20 px-2 text-right"
    />
  );
}

// Display maps moved to src/lib/issue-display.ts; aliased locally to keep
// the picker bodies short.
const STATUS_ORDER = ISSUE_STATUS_ORDER;
const STATUS_COLORS = ISSUE_STATUS_COLORS;
const STATUS_LABELS = ISSUE_STATUS_LABELS;
const PRIORITY_ORDER = ISSUE_PRIORITY_ORDER;
const PRIORITY_COLORS = ISSUE_PRIORITY_COLORS;
const PRIORITY_LABELS = ISSUE_PRIORITY_LABELS;
