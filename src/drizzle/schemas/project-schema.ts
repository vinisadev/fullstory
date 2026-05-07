import { relations } from "drizzle-orm";
import {
  index,
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
