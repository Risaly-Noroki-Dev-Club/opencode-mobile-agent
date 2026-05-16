# OpenCode Mobile Agent

Self-hosted server agent for controlling OpenCode sessions from the OpenCode Mobile Android app.

This project targets users who already run OpenCode on a remote server and want to control it from an Android phone without exposing the raw OpenCode server directly to the internet.

## Status

MVP-complete gateway. HTTP + SSE is the working transport: the Android app talks to the agent through `/opencode/*` proxying and through agent-native endpoints like `/projects`, `/sessions`, and `/health`. The WebSocket endpoint at `/ws` is experimental scaffolding that only implements `auth` and `workspace.list`; it is kept for protocol experimentation but is not used by the current Android client and may change or be removed.

## Architecture

```text
Android app
  |
  | HTTPS with token auth
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

Install dependencies from the repository root:

```bash
npm install
```

Common checks:

```bash
npm run build
npm run typecheck
npm --workspace packages/agent run test
```

Run the agent locally:

```bash
npm --workspace packages/agent run dev -- init
npm --workspace packages/agent run dev -- start
```

The default config path is `~/.config/opencode-mobile-agent/agent.json`.

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
- Workspace prefixes must be explicitly allowlisted. Each entry in `workspaces` is a path prefix: a project is exposed if its `worktree` equals the prefix or is a descendant of it. `/` matches everything and should only be used in trusted local-only setups.
- The raw OpenCode server should remain bound to localhost.
- The agent can expose OpenCode through an authenticated forwarding prefix, so only one public port is needed.

Default agent port is `2250`, matching deployments where only ports `2250-2300` are externally reachable. Keep `opencode serve` on localhost, usually `127.0.0.1:4096`, and expose the agent through one allowed port.

The Android app accesses forwarded OpenCode APIs through `/opencode/*` and reads agent-native data from `/projects`, `/sessions`, and `/health`, all with the same Bearer token.

## Project Source

`projectSource` in `agent.json` controls how `/projects` builds its list:

- `intersect` (default): pull the live project list from OpenCode and only return projects whose `worktree` falls under one of the configured `workspaces` prefixes. Recommended for normal use — new projects under an allowed prefix appear automatically without editing config, while paths outside the allowlist stay invisible.
- `opencode`: pass through every project OpenCode knows about, with no allowlist filtering. Intended for trusted local-only setups.
- `config`: ignore OpenCode entirely and synthesize one project per `workspaces` entry. Matches the legacy behavior of the previous `/workspaces` endpoint.

## Current Agent Capabilities

- `GET /health` 返回 agent 版本、监听配置、OpenCode 健康状态、可用时的 OpenCode 版本，以及当前项目来源摘要。
- `GET /projects` 返回 OpenCode 项目；当 `projectSource` 为 `intersect` 时，会按配置的工作区路径前缀过滤。
- `GET /sessions` 返回 OpenCode 会话，可按 `projectId` 或 `directory` 过滤；除非 `projectSource` 为 `opencode`，否则会隐藏工作区 allowlist 之外的会话。
- `GET /workspaces` 继续作为旧兼容接口保留，供仍期望配置型工作区条目的客户端使用。
- `/opencode/*` 将已认证的移动端请求转发到本机 OpenCode 服务，并在转发前移除移动端 Bearer token。
- `@opencode-ai/sdk` 用于项目和会话列表；OpenCode 健康检查仍使用 raw fetch。
- 当前测试覆盖工作区前缀匹配、配置默认值、非法 `projectSource` 和代理路径拼接。
