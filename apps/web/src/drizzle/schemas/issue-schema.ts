import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { project } from "./project-schema";

export const issueType = pgEnum("issue_type", ["task", "bug", "epic"]);

export const issueStatus = pgEnum("issue_status", [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
]);

export const issuePriority = pgEnum("issue_priority", [
  "no_priority",
  "urgent",
  "high",
  "medium",
  "low",
]);

export const issue = pgTable(
  "issue",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    type: issueType("type").default("task").notNull(),
    status: issueStatus("status").default("backlog").notNull(),
    priority: issuePriority("priority").default("no_priority").notNull(),
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reporterId: text("reporter_id").references(() => user.id, {
      onDelete: "set null",
    }),
    parentId: text("parent_id").references((): AnyPgColumn => issue.id, {
      onDelete: "set null",
    }),
    // FK to cycle.id added in task 49 (M2). Column exists now so the issue
    // schema is stable; the migration to add the FK doesn't touch row shape.
    cycleId: text("cycle_id"),
    estimate: integer("estimate"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    uniqueIndex("issue_projectId_number_uidx").on(
      table.projectId,
      table.number,
    ),
    index("issue_projectId_status_idx").on(table.projectId, table.status),
    index("issue_assigneeId_idx").on(table.assigneeId),
    index("issue_parentId_idx").on(table.parentId),
  ],
);

export const issueRelations = relations(issue, ({ one, many }) => ({
  project: one(project, {
    fields: [issue.projectId],
    references: [project.id],
  }),
  assignee: one(user, {
    fields: [issue.assigneeId],
    references: [user.id],
    relationName: "issue_assignee",
  }),
  reporter: one(user, {
    fields: [issue.reporterId],
    references: [user.id],
    relationName: "issue_reporter",
  }),
  parent: one(issue, {
    fields: [issue.parentId],
    references: [issue.id],
    relationName: "issue_parent",
  }),
  children: many(issue, { relationName: "issue_parent" }),
}));
