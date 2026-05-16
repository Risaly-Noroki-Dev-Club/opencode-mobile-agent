# Security Notes

This project remotely controls a coding agent that can read files, modify code, and run shell commands. Security is a core product feature, not an optional hardening step.

## MVP Defaults

- Require token auth for all agent endpoints.
- Bind the agent to `127.0.0.1` by default.
- Document HTTPS reverse proxy setup for remote access.
- Keep `opencode serve` bound to localhost.
- Require explicit workspace allowlists.
- Never log tokens.
- Avoid exposing arbitrary filesystem paths in the mobile protocol.

## Deployment Guidance

Recommended production-ish setup:

```text
Android app -> HTTPS reverse proxy -> 127.0.0.1:2250 agent -> 127.0.0.1:4096 opencode serve
```

Users should not expose either the agent or OpenCode server over unauthenticated plain HTTP.

If the server only exposes a small public port range, expose the agent on one allowed port, such as `2250`, and keep OpenCode bound to localhost. Do not expose `4096` publicly.

## Permission Handling

OpenCode has permission APIs. The agent should pass permission requests to the phone and require a user response before continuing.

The Android UI should make high-risk actions obvious. Examples include:

- destructive file operations
- `sudo`
- recursive permission or ownership changes
- `git push`
- shell piping into an interpreter
- attempts to read secret-looking files
