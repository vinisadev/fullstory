# Full Story API v1

REST API powering the [`fullstory-mcp`](../mcp/) server and any external
integration. All endpoints live under `/api/v1/*` and accept JSON.

## Authentication

Every request requires either:

- A logged-in browser session (cookie set by `/api/auth/*`), **or**
- An API key in the `Authorization` header:

  ```
  Authorization: Bearer fs_<your-key>
  ```

Generate keys at **Workspace settings → Your API keys** (the "Create key"
button shows the full key once — copy it then). Keys are scoped to your
user account and grant access to every workspace you're a member of.

Missing or invalid auth returns:

```http
401 Unauthorized
WWW-Authenticate: Bearer realm="Full Story API", error="invalid_token"
Content-Type: application/json

{ "error": "Unauthorized" }
```

## Base URL

```
http://localhost:3000
```

(or whatever your deployment serves the web app at)

## Error format

All errors share the same shape:

```json
{ "error": "<human-readable message>" }
```

Common HTTP statuses:

| Status | Meaning |
| ------ | ------- |
| `400`  | Bad request body, missing required field, validation failure (e.g., key already taken) |
| `401`  | No or invalid auth |
| `404`  | Resource not found, OR caller isn't a member of its workspace (no membership leak) |
| `500`  | Server error |

## DTOs

The shapes returned across list / get / create / patch endpoints stay identical.

### Workspace

```json
{
  "id": "org_abc123",
  "slug": "eldritch-logic",
  "name": "Eldritch Logic",
  "logo": null,
  "createdAt": "2026-05-07T04:23:11.000Z"
}
```

### Project

```json
{
  "id": "uuid",
  "workspaceId": "org_abc123",
  "key": "FS",
  "name": "Full Story",
  "description": "Issue tracker we eat our own dog food on.",
  "leadId": "user_xyz",
  "archivedAt": null,
  "createdAt": "2026-05-07T04:30:00.000Z",
  "updatedAt": "2026-05-07T04:30:00.000Z"
}
```

### Issue

```json
{
  "id": "uuid",
  "number": 12,
  "key": "FS-12",
  "title": "Wire MCP server to API",
  "description": "Body in plain text…",
  "type": "task",
  "status": "in_progress",
  "priority": "high",
  "assigneeId": "user_xyz",
  "reporterId": "user_xyz",
  "parentId": null,
  "cycleId": null,
  "estimate": 3,
  "projectId": "uuid",
  "projectKey": "FS",
  "createdAt": "2026-05-07T05:00:00.000Z",
  "updatedAt": "2026-05-07T05:30:00.000Z",
  "completedAt": null
}
```

Enums:

- `type`: `task` | `bug` | `epic`
- `status`: `backlog` | `todo` | `in_progress` | `in_review` | `done` | `canceled`
- `priority`: `no_priority` | `urgent` | `high` | `medium` | `low`

### Activity

```json
{
  "id": "uuid",
  "issueId": "uuid",
  "actor": { "id": "user_xyz", "name": "Vincenzo" },
  "kind": "status_changed",
  "payload": { "from": "todo", "to": "in_progress" },
  "createdAt": "2026-05-07T05:30:00.000Z"
}
```

`actor` is `null` for system-generated events. `kind` is one of:
`created`, `title_changed`, `description_changed`, `status_changed`,
`priority_changed`, `type_changed`, `estimate_changed`, `assigned`,
`unassigned`, `labeled`, `unlabeled`, `parent_changed`, `cycle_changed`,
`completed`, `reopened`, `commented`. Payload shape varies by kind — see
[src/lib/issues.ts](src/lib/issues.ts) for the writer contracts.

---

## Endpoints

### Identity

#### `GET /api/v1/me`

Return the user the current credentials belong to. Use this from the MCP
`whoami` tool to confirm which account an API key represents before
mutating data.

```json
{
  "user": {
    "id": "user_xyz",
    "email": "vincenzo@example.com",
    "name": "Vincenzo",
    "image": null,
    "emailVerified": true,
    "createdAt": "2026-04-01T00:00:00.000Z"
  }
}
```

---

### Workspaces

#### `GET /api/v1/workspaces`

List workspaces the caller belongs to.

```http
GET /api/v1/workspaces
Authorization: Bearer fs_…
```

```json
{ "workspaces": [Workspace, …] }
```

#### `GET /api/v1/workspaces/{slug}`

Get one workspace by slug.

```json
{ "workspace": Workspace }
```

`404` if the slug doesn't exist or the caller isn't a member.

---

### Projects

#### `GET /api/v1/workspaces/{slug}/projects`

List projects in a workspace, sorted active-first then alphabetical.

```json
{ "projects": [Project, …] }
```

#### `POST /api/v1/workspaces/{slug}/projects`

Create a project. Caller must be admin or owner of the workspace.

```http
POST /api/v1/workspaces/eldritch-logic/projects
Authorization: Bearer fs_…
Content-Type: application/json

{ "key": "FS", "name": "Full Story", "description": "Optional" }
```

```http
201 Created
{ "project": Project }
```

`400` for validation failures (key format, key already taken, name empty),
including the "must be admin/owner" gate.

#### `GET /api/v1/projects/{id}`

Get a single project by id.

```json
{ "project": Project }
```

#### `PATCH /api/v1/projects/{id}`

Update fields and/or toggle archive state. Body accepts any subset:

```json
{
  "name": "New name",
  "description": "Or null to clear",
  "leadId": "user_xyz",
  "archived": true
}
```

- Field updates dispatch to `updateProject`.
- `archived: boolean` dispatches to `setProjectArchived`.
- Both can change in one request; the field update runs first.

```json
{ "project": Project }
```

The project `key` is **not** updatable — changing it would invalidate every
existing issue URL.

---

### Issues

#### `GET /api/v1/issues`

List issues across a workspace (or one project within).

Query params:

| Param      | Required | Notes |
| ---------- | -------- | ----- |
| `workspace`| yes      | Workspace slug |
| `project`  | no       | Project key (e.g., `FS`); restricts to that project |
| `status`   | no       | Comma-separated: `todo,in_progress,…` |
| `priority` | no       | Comma-separated: `urgent,high,…` |
| `assignee` | no       | Comma-separated user IDs; `unassigned` is a synthetic value matching null |
| `label`    | no       | Comma-separated label IDs; OR-semantics (any selected label) |

```http
GET /api/v1/issues?workspace=eldritch-logic&project=FS&status=todo,in_progress
```

```json
{ "issues": [Issue, …] }
```

Sorted by `updatedAt DESC`. No pagination yet — every matching row returns.

#### `POST /api/v1/issues`

Create an issue. Caller must be a member of the workspace.

```json
{
  "workspaceSlug": "eldritch-logic",
  "projectKey": "FS",
  "title": "Required",
  "description": "Optional",
  "type": "task",
  "priority": "no_priority",
  "assigneeId": "user_xyz",
  "parentId": null,
  "estimate": 3
}
```

```http
201 Created
{ "issue": Issue }
```

`400` for validation failures: empty title, parent must be epic in same
project, estimate must be non-negative integer, project must not be
archived.

#### `GET /api/v1/issues/{id}`

Get a single issue.

```json
{ "issue": Issue }
```

#### `PATCH /api/v1/issues/{id}`

Update any subset of fields. Each changed field writes its own activity
row (see GET activity below).

```json
{
  "title": "New title",
  "description": "or null",
  "status": "in_progress",
  "priority": "urgent",
  "type": "bug",
  "assigneeId": "user_xyz",
  "parentId": null,
  "cycleId": null,
  "estimate": 5
}
```

```json
{ "issue": Issue }
```

Server enforces the "epic can't have parent" invariant against the
post-patch state — works whether you change `type`, `parentId`, or both
in one request.

#### `GET /api/v1/issues/{id}/activity`

List activity rows for an issue, oldest-first.

```json
{ "activity": [Activity, …] }
```

---

## Versioning

The `/api/v1/` prefix is reserved. Breaking changes to a v1 endpoint won't
ship without a `/api/v2/` introduction. Adding new optional fields, new
endpoints, or new enum values is non-breaking and may happen at any time.

## Rate limits

Each API key has its own rate-limit counter (Better Auth's `apiKey` plugin
defaults: 10 requests / day per key). Counters refill on the
`refillInterval` schedule. Hitting the limit returns `429 Too Many
Requests`. The defaults are aggressive — task 110 will tune them.

## See also

- [src/lib/api-dto.ts](src/lib/api-dto.ts) — TypeScript DTO definitions
  (single source of truth for response shapes).
- [src/lib/issues.ts](src/lib/issues.ts) — `ActivityKind` union and
  payload shape conventions.
- [../../TASKS.md](../../TASKS.md) M5 — outstanding API + MCP work.
