CREATE TYPE "public"."issue_priority" AS ENUM('no_priority', 'urgent', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."issue_type" AS ENUM('task', 'bug', 'epic');--> statement-breakpoint
CREATE TABLE "issue" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "issue_type" DEFAULT 'task' NOT NULL,
	"status" "issue_status" DEFAULT 'backlog' NOT NULL,
	"priority" "issue_priority" DEFAULT 'no_priority' NOT NULL,
	"assignee_id" text,
	"reporter_id" text,
	"parent_id" text,
	"cycle_id" text,
	"estimate" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_parent_id_issue_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."issue"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_projectId_number_uidx" ON "issue" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "issue_projectId_status_idx" ON "issue" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "issue_assigneeId_idx" ON "issue" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "issue_parentId_idx" ON "issue" USING btree ("parent_id");