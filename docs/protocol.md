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

The agent can expose simple HTTP endpoints for non-streaming reads.

```text
GET /health
GET /workspaces
GET /sessions/:id/diff
```
