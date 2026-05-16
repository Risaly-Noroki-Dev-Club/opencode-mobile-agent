# OpenCode Mobile Agent

Self-hosted server agent for controlling OpenCode sessions from the OpenCode Mobile Android app.

This project targets users who already run OpenCode on a remote server and want to control it from an Android phone without exposing the raw OpenCode server directly to the internet.

## Status

Early scaffold. The repository currently contains the architecture, protocol draft, and a minimal TypeScript agent skeleton.

## Architecture

```text
Android app
  |
  | HTTPS / WebSocket with token auth
  v
opencode-mobile-agent
  |
  | localhost HTTP / SSE
  v
opencode serve
  |
  v
workspace, git, shell, model provider
```

OpenCode already provides a headless HTTP server through `opencode serve`. The mobile agent is a small authenticated gateway that runs on the user's server, connects to the local OpenCode server, and exposes a phone-friendly API to the Android client.

## Goals

- Connect an Android phone to a user's own remote server.
- Keep code execution on the user's own machine.
- Avoid requiring a central cloud service for the first version.
- Use OpenCode's existing server API instead of parsing terminal UI output.
- Add a safer remote boundary with token auth, workspace allowlists, and explicit permission handling.

## Non-Goals For MVP

- Public SaaS hosting.
- Google Play distribution.
- Push notifications.
- Multi-user collaboration.
- Full mobile IDE features.
- Running OpenCode directly on Android.

## Repository Layout

```text
packages/agent/        Self-hosted server agent
packages/wire/         Shared TypeScript wire schemas for the agent protocol
docs/                  Architecture, protocol, and security notes
```

The Android app lives in the separate `opencode-mobile-app` repository.

## Reference Project

`slopus/happy` was inspected as a comparable remote coding-agent client. The useful patterns are its monorepo split and dedicated wire schema package. Its mobile app is Expo/React Native, so Android UI implementation details are not reused here.

## Development Notes

The upstream OpenCode repository inspected for this scaffold is:

```text
https://github.com/anomalyco/opencode
```

Relevant upstream capabilities:

- `opencode serve [--port <number>] [--hostname <string>]`
- HTTP OpenAPI endpoint at `/doc`
- SSE event streams at `/event` and `/global/event`
- session, message, permission, file, VCS, and diff APIs
- JavaScript SDK package under `packages/sdk/js`

## MVP Flow

1. User installs OpenCode on their server.
2. User installs and starts `opencode-mobile-agent`.
3. Agent starts or connects to local `opencode serve`.
4. Android app connects to the agent with a token.
5. User selects a workspace/session.
6. User sends prompts and receives streamed events.
7. Permission requests are surfaced on the phone for approval or denial.
8. User reviews session diffs from the phone.

## Security Defaults

- Agent should listen on `127.0.0.1` by default.
- Public access should go through a user-managed HTTPS reverse proxy.
- Token auth is required.
- Workspaces must be explicitly allowlisted.
- The raw OpenCode server should remain bound to localhost.
- The agent can expose OpenCode through an authenticated forwarding prefix, so only one public port is needed.

Default agent port is `2250`, matching deployments where only ports `2250-2300` are externally reachable. Keep `opencode serve` on localhost, usually `127.0.0.1:4096`, and expose the agent through one allowed port.

The Android app should connect to the agent WebSocket at `/ws` and can access forwarded OpenCode APIs through `/opencode/*` with the same Bearer token.
