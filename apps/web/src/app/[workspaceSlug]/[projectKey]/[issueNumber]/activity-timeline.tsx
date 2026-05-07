import { formatDistanceToNow } from "date-fns";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/lib/issue-display";

type ActivityRow = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  actor: { id: string; name: string } | null;
};

type Member = {
  userId: string;
  name: string;
};

export function ActivityTimeline({
  activities,
  members,
}: {
  activities: ActivityRow[];
  members: Member[];
}) {
  if (activities.length === 0) {
    return null;
  }
  return (
    <section aria-label="Activity" className="mt-10">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Activity
      </h2>
      <ol className="flex flex-col gap-2">
        {activities.map((a) => (
          <li
            key={a.id}
            className="flex items-baseline gap-1.5 text-sm leading-relaxed"
          >
            <span className="font-medium">{a.actor?.name ?? "Someone"}</span>
            <span className="text-muted-foreground">
              {describeActivity(a, members)}
            </span>
            <time
              dateTime={a.createdAt.toISOString()}
              className="ml-auto text-xs text-muted-foreground"
              title={a.createdAt.toLocaleString()}
            >
              {formatDistanceToNow(a.createdAt, { addSuffix: true })}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}

function describeActivity(a: ActivityRow, members: Member[]): string {
  // Cast once to a generous shape — payload columns are jsonb and fields
  // vary by kind. Writers (src/lib/issue-actions.ts) own the shape contract.
  const p = a.payload as {
    from?: string | number | null;
    to?: string | number | null;
    assigneeId?: string;
    status?: string;
  };

  switch (a.kind) {
    case "created":
      return "created this issue";
    case "completed":
      return p.status === "canceled"
        ? "canceled this issue"
        : "completed this issue";
    case "reopened":
      return "reopened this issue";
    case "title_changed":
      return "changed the title";
    case "description_changed":
      return "updated the description";
    case "status_changed":
      return `changed status from ${labelFor(ISSUE_STATUS_LABELS, p.from)} to ${labelFor(ISSUE_STATUS_LABELS, p.to)}`;
    case "priority_changed":
      return `set priority to ${labelFor(ISSUE_PRIORITY_LABELS, p.to)}`;
    case "type_changed":
      return `changed type to ${labelFor(ISSUE_TYPE_LABELS, p.to)}`;
    case "assigned": {
      const member = members.find((m) => m.userId === p.assigneeId);
      return member ? `assigned this to ${member.name}` : "assigned this issue";
    }
    case "unassigned":
      return "removed the assignee";
    case "estimate_changed":
      return p.to === null || p.to === undefined
        ? "removed the estimate"
        : `set the estimate to ${p.to}`;
    case "parent_changed":
      return p.to === null || p.to === undefined
        ? "removed the parent"
        : "changed the parent";
    case "cycle_changed":
      return p.to === null || p.to === undefined
        ? "removed the cycle"
        : "moved this to a cycle";
    case "labeled":
      return "added a label";
    case "unlabeled":
      return "removed a label";
    case "commented":
      return "commented";
    default:
      return a.kind.replace(/_/g, " ");
  }
}

function labelFor(map: Record<string, string>, key: unknown): string {
  if (typeof key !== "string") return "—";
  return map[key] ?? key;
}
