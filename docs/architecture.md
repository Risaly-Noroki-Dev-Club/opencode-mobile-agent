# Architecture

## Decision

OpenCode Mobile is built as a separate self-hosted gateway plus Android app, not as a fork of OpenCode.

The agent runs next to OpenCode on the user's server and talks to `opencode serve` over localhost. The Android app only talks to the agent.

The Android app is implemented as native Kotlin/Compose. A comparable project, `slopus/happy`, uses Expo for its app, so it is only used as a reference for remote-agent architecture and protocol packaging.

## Why This Shape

OpenCode already has a headless server API. The inspected upstream repository, `anomalyco/opencode`, documents `opencode serve` and includes a generated JavaScript SDK. That means the mobile integration should use the existing HTTP/SSE surface instead of wrapping the terminal UI.

The gateway still matters because a phone-facing product needs a narrower and safer remote boundary than exposing the raw OpenCode server directly.

## Components

### Android App

Responsibilities:

- Store server URL and token locally.
- Connect to the agent over HTTPS/WebSocket.
- Show sessions, streamed assistant output, tool events, and permission requests.
- Send user prompts and permission responses.
- Display diffs.

Implementation direction:

- Kotlin and Jetpack Compose.
- Material 3 with Android 12+ dynamic color.
- Material 3 Expressive components and motion when the dependency surface is stable enough.
- OkHttp for HTTP/WebSocket transport.
- Kotlin Serialization for protocol models.

### Agent

Responsibilities:

- Authenticate Android clients.
- Start or connect to a local OpenCode server.
- Proxy selected OpenCode APIs.
- Subscribe to OpenCode SSE events.
- Convert OpenCode events into a stable mobile protocol.
- Enforce local workspace allowlists.

### OpenCode Server

Responsibilities:

- Own the real coding session lifecycle.
- Execute model/tool interactions.
- Emit events.
- Manage permissions, messages, files, and diffs.

## Connection Model

Initial MVP uses direct self-hosting:

```text
Android app -> user's HTTPS reverse proxy -> agent -> localhost opencode serve
```

No central relay is required for the first version.

## Open Questions

- Whether to depend on `@opencode-ai/sdk` directly or use raw HTTP initially.
- Whether the agent should always launch `opencode serve` or support connecting to an existing server first.
- How much of OpenCode's native event schema should be exposed unchanged to the Android app.
- Whether permission responses should pass through exactly or be wrapped in a mobile-specific abstraction.
- Whether protocol schemas should stay TypeScript-first with generated Kotlin models, or be maintained manually on both sides during the MVP.
