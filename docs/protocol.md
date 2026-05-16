# Protocol Draft

The mobile protocol is the API between the Android app and `opencode-mobile-agent`. It should remain smaller and more stable than OpenCode's upstream API.

Inspired by `slopus/happy`, protocol schemas live in a dedicated package so the agent protocol does not drift as more clients are added.

## WebSocket Client Events

### Authenticate

```json
{
  "type": "auth",
  "token": "secret-token"
}
```

### List Workspaces

```json
{
  "type": "workspace.list"
}
```

### Create Session

```json
{
  "type": "session.create",
  "workspaceId": "project-a",
  "title": "Fix tests"
}
```

### Send Prompt

```json
{
  "type": "session.prompt",
  "sessionId": "ses_123",
  "content": "Help me fix the failing tests"
}
```

### Reply To Permission

```json
{
  "type": "permission.reply",
  "sessionId": "ses_123",
  "permissionId": "perm_123",
  "response": "allow_once"
}
```

## WebSocket Server Events

### Authenticated

```json
{
  "type": "auth.ok"
}
```

### Error

```json
{
  "type": "error",
  "message": "Invalid token"
}
```

### Workspaces

```json
{
  "type": "workspace.items",
  "items": [
    {
      "id": "project-a",
      "name": "project-a",
      "path": "/home/user/projects/project-a"
    }
  ]
}
```

### Assistant Delta

```json
{
  "type": "assistant.delta",
  "sessionId": "ses_123",
  "content": "I will inspect the test output first."
}
```

### Permission Request

```json
{
  "type": "permission.request",
  "sessionId": "ses_123",
  "permissionId": "perm_123",
  "title": "Run command",
  "summary": "npm test",
  "risk": "low"
}
```

### Session Diff Updated

```json
{
  "type": "session.diff.updated",
  "sessionId": "ses_123"
}
```

## HTTP Endpoints

HTTP is the working transport. All endpoints below require `Authorization: Bearer <token>` except `/health`.

### `GET /health`

Diagnostic snapshot. Unauthenticated. Returns agent build info, OpenCode upstream status, and project source summary.

```json
{
  "healthy": true,
  "agent": { "version": "0.0.0", "host": "127.0.0.1", "port": 2250, "forwardPrefix": "/opencode" },
  "opencode": { "url": "http://127.0.0.1:4096", "healthy": true, "version": "1.14.46" },
  "projects": { "source": "intersect", "count": 3 },
  "upstream": { "healthy": true, "version": "1.14.46" }
}
```

`upstream` duplicates the OpenCode status under a stable name kept for older clients.

### `GET /projects`

Returns the project list according to the agent's `projectSource` setting, sorted by recency (`lastActive` descending). `lastActive` is OpenCode's `time.updated` when available, otherwise falls back to `time.initialized` or `time.created`.

```json
{
  "items": [
    {
      "id": "847fe2b5cf33abb38609fea1e19e11c3260682a7",
      "name": "rakurakumusicstation-ng",
      "worktree": "/home/erika/rakurakumusicstation-ng",
      "vcs": "git",
      "lastActive": 1778910525404
    }
  ]
}
```

### `GET /sessions?projectId=<id>&directory=<path>`

Returns sessions for a project. At least one of `projectId` or `directory` is recommended; without either, the full session list visible under the configured workspace prefixes is returned. Sorted by `lastActive` descending. Sessions outside the workspace allowlist are filtered out unless `projectSource` is `opencode`.

```json
{
  "items": [
    {
      "id": "ses_1d0ab3712ffeUlO8atWhIw2Y9L",
      "projectId": "847fe2b5cf33abb38609fea1e19e11c3260682a7",
      "directory": "/home/erika/rakurakumusicstation-ng",
      "title": "重置项目计划",
      "lastActive": 1778910579157
    }
  ]
}
```

### `GET /workspaces`

Legacy endpoint that returns the raw `workspaces` config entries wrapped as `{ id, name, path }`. Kept for backward compatibility with the existing Android client. Prefer `/projects` for new clients.

### `GET /opencode/*`

Transparent forward to the local OpenCode server. The agent strips its own `Authorization` header before forwarding.
