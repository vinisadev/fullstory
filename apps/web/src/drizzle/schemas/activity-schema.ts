import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { issue } from "./issue-schema";

export const activity = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    // Kind is plain text rather than a pgEnum: the set of activity kinds will
    // grow over time and we don't want a migration for each new one. The
    // writeActivity() helper in src/lib/issues.ts is the single point of
    // validation.
    kind: text("kind").notNull(),
    // Kind-specific shape, e.g. { from: "todo", to: "in_progress" } for a
    // status_changed event. Empty object default so the TS type is
    // non-nullable and writers can ignore it for kinds that carry no data.
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Composite covers both "all activity for this issue" and the natural
    // chronological ordering of the timeline view. Single index, two queries.
    index("activity_issueId_createdAt_idx").on(table.issueId, table.createdAt),
  ],
);

export const activityRelations = relations(activity, ({ one }) => ({
  issue: one(issue, {
    fields: [activity.issueId],
    references: [issue.id],
  }),
  actor: one(user, {
    fields: [activity.actorId],
    references: [user.id],
  }),
}));
