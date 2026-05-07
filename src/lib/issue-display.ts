// Display-only constants for issue status/priority/type. Imported by
// every component that renders issue fields (detail sidebar, list view,
// activity timeline, child list, board view). Keep this in sync with the
// pgEnum values in src/drizzle/schemas/issue-schema.ts.

export const ISSUE_STATUS_ORDER = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
] as const;

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  canceled: "Canceled",
};

export const ISSUE_STATUS_COLORS: Record<string, string> = {
  backlog: "bg-zinc-400",
  todo: "bg-zinc-500",
  in_progress: "bg-blue-500",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
  canceled: "bg-red-500",
};

export const ISSUE_PRIORITY_ORDER = [
  "no_priority",
  "urgent",
  "high",
  "medium",
  "low",
] as const;

export const ISSUE_PRIORITY_LABELS: Record<string, string> = {
  no_priority: "No priority",
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ISSUE_PRIORITY_COLORS: Record<string, string> = {
  no_priority: "text-muted-foreground",
  urgent: "text-red-600 dark:text-red-400",
  high: "text-orange-600 dark:text-orange-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-blue-600 dark:text-blue-400",
};

export const ISSUE_TYPE_ORDER = ["task", "bug", "epic"] as const;

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  task: "Task",
  bug: "Bug",
  epic: "Epic",
};
