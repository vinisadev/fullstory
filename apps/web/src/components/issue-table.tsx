import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ISSUE_PRIORITY_COLORS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_COLORS,
  ISSUE_STATUS_LABELS,
} from "@/lib/issue-display";
import { cn } from "@/lib/utils";

export type IssueTableRow = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  updatedAt: Date;
  assignee: { id: string; name: string } | null;
  project: { key: string };
};

export function IssueTable({
  workspaceSlug,
  issues,
}: {
  workspaceSlug: string;
  issues: IssueTableRow[];
}) {
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background">
        <TableRow>
          <TableHead className="w-24">Key</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="w-32">Status</TableHead>
          <TableHead className="w-28">Priority</TableHead>
          <TableHead className="w-40">Assignee</TableHead>
          <TableHead className="w-24 text-right">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {issues.map((iss) => {
          const href = `/${workspaceSlug}/${iss.project.key}/${iss.number}`;
          return (
            <TableRow key={iss.id} className="hover:bg-muted/50">
              <TableCell className="py-2">
                <Link
                  href={href}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  {iss.project.key}-{iss.number}
                </Link>
              </TableCell>
              <TableCell className="py-2 max-w-0">
                <Link
                  href={href}
                  className="block truncate font-medium hover:underline"
                  title={iss.title}
                >
                  {iss.title}
                </Link>
              </TableCell>
              <TableCell className="py-2">
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      ISSUE_STATUS_COLORS[iss.status] ?? "bg-zinc-400",
                    )}
                  />
                  {ISSUE_STATUS_LABELS[iss.status] ?? iss.status}
                </span>
              </TableCell>
              <TableCell className="py-2">
                <span
                  className={cn(
                    "text-sm",
                    ISSUE_PRIORITY_COLORS[iss.priority] ??
                      "text-muted-foreground",
                  )}
                >
                  {ISSUE_PRIORITY_LABELS[iss.priority] ?? iss.priority}
                </span>
              </TableCell>
              <TableCell className="py-2">
                {iss.assignee ? (
                  <span className="text-sm">{iss.assignee.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-2 text-right">
                <time
                  dateTime={iss.updatedAt.toISOString()}
                  className="text-xs text-muted-foreground"
                  title={iss.updatedAt.toLocaleString()}
                >
                  {formatDistanceToNow(iss.updatedAt, { addSuffix: false })}
                </time>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
