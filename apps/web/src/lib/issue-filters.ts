import "server-only";

import { inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/drizzle";
import { issue, issueLabel } from "@/drizzle/schema";

export type IssueFilters = {
  status: string[];
  priority: string[];
  assignee: string[];
  label: string[];
};

type SearchParams = { [key: string]: string | string[] | undefined };

export function parseIssueFilters(sp: SearchParams): IssueFilters {
  return {
    status: parseList(sp.status),
    priority: parseList(sp.priority),
    assignee: parseList(sp.assignee),
    label: parseList(sp.label),
  };
}

export function hasAnyIssueFilter(filters: IssueFilters): boolean {
  return (
    filters.status.length +
      filters.priority.length +
      filters.assignee.length +
      filters.label.length >
    0
  );
}

// Builds an array of Drizzle WHERE conditions matching the parsed filters.
// Caller composes with their own conditions (project, workspace, etc.) via
// `and(...callerConditions, ...buildIssueFilterConditions(filters))`.
export function buildIssueFilterConditions(filters: IssueFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.status.length > 0) {
    conditions.push(
      inArray(
        issue.status,
        filters.status as (typeof issue.status.enumValues)[number][],
      ),
    );
  }
  if (filters.priority.length > 0) {
    conditions.push(
      inArray(
        issue.priority,
        filters.priority as (typeof issue.priority.enumValues)[number][],
      ),
    );
  }
  if (filters.assignee.length > 0) {
    const userIds = filters.assignee.filter((v) => v !== "unassigned");
    const includeUnassigned = filters.assignee.includes("unassigned");
    const clauses: SQL[] = [];
    if (userIds.length > 0) clauses.push(inArray(issue.assigneeId, userIds));
    if (includeUnassigned) clauses.push(isNull(issue.assigneeId));
    if (clauses.length === 1) conditions.push(clauses[0]);
    else if (clauses.length > 1) {
      const orClause = or(...clauses);
      if (orClause) conditions.push(orClause);
    }
  }
  if (filters.label.length > 0) {
    // OR-semantics: issue has at least one of the selected labels.
    const issueIdsWithLabel = db
      .select({ id: issueLabel.issueId })
      .from(issueLabel)
      .where(inArray(issueLabel.labelId, filters.label));
    conditions.push(inArray(issue.id, issueIdsWithLabel));
  }

  return conditions;
}

function parseList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const str = Array.isArray(value) ? value[0] : value;
  return str.split(",").filter(Boolean);
}

// Turn a Next.js searchParams object back into a query string for use in
// Link hrefs that should preserve filters.
export function searchParamsToQueryString(sp: SearchParams): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const x of v) params.append(k, x);
    } else {
      params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
