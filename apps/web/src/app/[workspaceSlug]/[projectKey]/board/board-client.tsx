"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { updateIssue } from "@/lib/issue-actions";
import {
  ISSUE_PRIORITY_COLORS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_COLORS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_ORDER,
} from "@/lib/issue-display";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

export type BoardIssue = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  assignee: { id: string; name: string } | null;
};

type ByStatus = Record<string, BoardIssue[]>;

type MoveAction = {
  issueId: string;
  toStatus: string;
};

export function BoardClient({
  workspaceSlug,
  projectKey,
  initialByStatus,
}: {
  workspaceSlug: string;
  projectKey: string;
  initialByStatus: ByStatus;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeIssue, setActiveIssue] = useState<BoardIssue | null>(null);
  const [optimistic, applyMove] = useOptimistic(
    initialByStatus,
    (state: ByStatus, action: MoveAction): ByStatus => {
      // Find the card and its current bucket. We don't trust the drag event
      // to tell us source — the optimistic state is canonical.
      let card: BoardIssue | undefined;
      let fromStatus: string | undefined;
      for (const s of ISSUE_STATUS_ORDER) {
        const found = state[s]?.find((c) => c.id === action.issueId);
        if (found) {
          card = found;
          fromStatus = s;
          break;
        }
      }
      if (!card || !fromStatus || fromStatus === action.toStatus) {
        return state;
      }
      return {
        ...state,
        [fromStatus]: (state[fromStatus] ?? []).filter(
          (c) => c.id !== action.issueId,
        ),
        [action.toStatus]: [
          { ...card, status: action.toStatus },
          ...(state[action.toStatus] ?? []),
        ],
      };
    },
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Distinguish click (no drag) from drag — pointerdown without 5px
      // movement falls through to the card's onClick → router.push.
      activationConstraint: { distance: 5 },
    }),
  );

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    for (const s of ISSUE_STATUS_ORDER) {
      const found = optimistic[s]?.find((c) => c.id === id);
      if (found) {
        setActiveIssue(found);
        return;
      }
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;
    const issueId = String(active.id);
    const toStatus = String(over.id);

    startTransition(async () => {
      applyMove({ issueId, toStatus });
      const result = await updateIssue({
        issueId,
        status: toStatus as Parameters<typeof updateIssue>[0]["status"],
      });
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onDragCancel() {
    setActiveIssue(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="flex flex-1 gap-3 overflow-x-auto p-4">
        {ISSUE_STATUS_ORDER.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            issues={optimistic[status] ?? []}
            workspaceSlug={workspaceSlug}
            projectKey={projectKey}
          />
        ))}
      </div>
      {/* Portal-rendered overlay that follows the cursor and floats above
          everything — solves the "card hides behind column boundary" issue
          caused by per-column overflow-y-auto. */}
      <DragOverlay dropAnimation={null}>
        {activeIssue ? (
          <CardBody
            issue={activeIssue}
            projectKey={projectKey}
            className="cursor-grabbing rotate-2 shadow-lg"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  status,
  issues,
  workspaceSlug,
  projectKey,
}: {
  status: string;
  issues: BoardIssue[];
  workspaceSlug: string;
  projectKey: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section className="flex w-72 shrink-0 flex-col gap-2">
      <header className="flex items-center gap-2 px-2">
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            ISSUE_STATUS_COLORS[status] ?? "bg-zinc-400",
          )}
        />
        <h2 className="text-sm font-medium">
          {ISSUE_STATUS_LABELS[status] ?? status}
        </h2>
        <span className="text-xs text-muted-foreground">{issues.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 overflow-y-auto rounded-md p-2 transition-colors",
          isOver ? "bg-muted/60 ring-2 ring-foreground/20" : "bg-muted/30",
        )}
      >
        {issues.length === 0 ? (
          <p className="px-1 py-2 text-xs italic text-muted-foreground">
            {isOver ? "Drop to set status" : "Empty"}
          </p>
        ) : (
          issues.map((iss) => (
            <IssueCard
              key={iss.id}
              issue={iss}
              workspaceSlug={workspaceSlug}
              projectKey={projectKey}
            />
          ))
        )}
      </div>
    </section>
  );
}

function IssueCard({
  issue: iss,
  workspaceSlug,
  projectKey,
}: {
  issue: BoardIssue;
  workspaceSlug: string;
  projectKey: string;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: iss.id,
  });

  const href = `/${workspaceSlug}/${projectKey}/${iss.number}`;

  return (
    <CardBody
      asButton
      ref={setNodeRef}
      issue={iss}
      projectKey={projectKey}
      className={cn(
        "cursor-grab text-left active:cursor-grabbing",
        // Hide the original while the overlay shows the floating clone.
        // Visibility (not opacity) so the slot still occupies space, keeping
        // sibling cards' positions stable while dragging.
        isDragging && "invisible",
      )}
      onClick={() => {
        if (isDragging) return;
        router.push(href);
      }}
      buttonProps={{ ...attributes, ...listeners }}
    />
  );
}

const CardBody = function CardBody({
  asButton,
  ref,
  issue: iss,
  projectKey,
  className,
  onClick,
  buttonProps,
}: {
  asButton?: boolean;
  ref?: React.Ref<HTMLButtonElement | HTMLDivElement>;
  issue: BoardIssue;
  projectKey: string;
  className?: string;
  onClick?: () => void;
  buttonProps?: Record<string, unknown>;
}) {
  const showPriority = iss.priority !== "no_priority";
  const baseClass = cn(
    "block w-full rounded-md border bg-background p-2.5 shadow-xs",
    "transition-colors hover:border-foreground/20",
    className,
  );
  const inner = (
    <>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          {projectKey}-{iss.number}
        </span>
        {showPriority && (
          <span
            className={cn(
              "text-[10px] font-medium",
              ISSUE_PRIORITY_COLORS[iss.priority] ?? "text-muted-foreground",
            )}
          >
            {ISSUE_PRIORITY_LABELS[iss.priority] ?? iss.priority}
          </span>
        )}
      </span>
      <span className="mt-1 line-clamp-2 block text-sm leading-snug">
        {iss.title}
      </span>
      {iss.assignee && (
        <span className="mt-2 block truncate text-xs text-muted-foreground">
          {iss.assignee.name}
        </span>
      )}
    </>
  );
  if (asButton) {
    return (
      <button
        type="button"
        ref={ref as React.Ref<HTMLButtonElement>}
        className={baseClass}
        onClick={onClick}
        {...buttonProps}
      >
        {inner}
      </button>
    );
  }
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={baseClass}>
      {inner}
    </div>
  );
};
