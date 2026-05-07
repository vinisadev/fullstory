import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./auth-schema";
import { issue } from "./issue-schema";

export const label = pgTable(
  "label",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Hex color, e.g. "#3B82F6". App-level validation; not constrained at the
    // DB level so we can change formats later without a migration.
    color: text("color").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("label_workspaceId_name_uidx").on(
      table.workspaceId,
      table.name,
    ),
  ],
);

export const issueLabel = pgTable(
  "issue_label",
  {
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => label.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.issueId, table.labelId] }),
    // The composite PK gives us (issue_id, label_id) lookup. Reverse direction
    // ("which issues have this label") needs its own index.
    index("issue_label_labelId_idx").on(table.labelId),
  ],
);

export const labelRelations = relations(label, ({ one, many }) => ({
  workspace: one(organization, {
    fields: [label.workspaceId],
    references: [organization.id],
  }),
  issueLabels: many(issueLabel),
}));

export const issueLabelRelations = relations(issueLabel, ({ one }) => ({
  issue: one(issue, {
    fields: [issueLabel.issueId],
    references: [issue.id],
  }),
  label: one(label, {
    fields: [issueLabel.labelId],
    references: [label.id],
  }),
}));
