import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    leadId: text("lead_id").references(() => user.id, { onDelete: "set null" }),
    // Highest issue number used in this project. Incremented atomically by
    // nextIssueNumber() in src/lib/issues.ts to derive PROJ-N keys.
    lastIssueNumber: integer("last_issue_number").default(0).notNull(),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("project_workspaceId_key_uidx").on(
      table.workspaceId,
      table.key,
    ),
    index("project_leadId_idx").on(table.leadId),
  ],
);

export const projectRelations = relations(project, ({ one }) => ({
  workspace: one(organization, {
    fields: [project.workspaceId],
    references: [organization.id],
  }),
  lead: one(user, {
    fields: [project.leadId],
    references: [user.id],
  }),
}));
