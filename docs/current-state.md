# 当前状态

本文总结 agent 最新实现状态，可作为当前 MVP 成品形态的交接说明。

## 总结

agent 现在是一个运行在本机 `opencode serve` 前面的轻量认证 HTTP 网关。当前成品路径是 HTTP 加 OpenCode 原生 SSE，并通过 `/opencode/*` 转发给 Android 客户端；自定义 `/ws` 端点仍是实验脚手架，Android App 当前不使用它。

关键变化是：移动端不再需要直接暴露或理解原始 OpenCode 服务。它只连接 agent，用同一个 Bearer token 认证，读取 agent 自己提供的发现接口，并通过 `/opencode/*` 访问需要代理的 OpenCode API。这样只需要对外暴露 agent 一个入口。

## 最新更改

- 接入 `@opencode-ai/sdk`，用于读取 OpenCode 的项目和会话列表。
- 新增 `GET /projects`，把 OpenCode 项目转换为稳定的移动端项目摘要。
- 新增 `GET /sessions`，支持按 `projectId` 或 `directory` 过滤 OpenCode 会话。
- 增强 `GET /health`，返回 agent 版本、监听配置、OpenCode URL、OpenCode 状态、OpenCode 版本和项目来源摘要。
- 新增 `projectSource` 配置，支持 `intersect`、`opencode`、`config` 三种模式。
- 将 `workspaces` 从固定工作区列表改成路径前缀 allowlist，用于项目和会话过滤。
- 保留 `GET /workspaces` 作为旧 Android 客户端的兼容接口。
- 明确 `/ws` 只是实验脚手架，不是当前 Android App 的主传输路径。
- 在共享 wire 包里新增项目、会话、健康检查摘要 schema。
- 新增测试覆盖配置默认值、非法 `projectSource`、路径前缀匹配和代理路径拼接。

## 运行模型

```text
Android app
  |
  | HTTPS + Bearer token
  v
opencode-mobile-agent
  |
  | http://127.0.0.1:4096
  v
opencode serve
```

推荐部署方式是只通过反向代理或受控公网端口暴露 agent。`opencode serve` 应继续绑定在 localhost。

## 当前支持的端点

- `GET /health`：无需认证的诊断端点，用于检查 agent 和 OpenCode 状态。
- `GET /projects`：需要认证的项目列表，用于移动端选择项目。
- `GET /sessions`：需要认证的会话列表，可按项目或目录过滤。
- `GET /workspaces`：需要认证的旧兼容接口，返回配置里的工作区条目。
- `/opencode/*`：需要认证的透明代理，转发到本机 OpenCode 服务。
- `/ws`：实验 WebSocket 端点，目前只实现 `auth` 和 `workspace.list`。

## 项目来源模式

`agent.json` 中的 `projectSource` 决定 `/projects` 如何生成：

- `intersect`：默认模式。读取 OpenCode 的实时项目列表，只返回 `worktree` 等于某个工作区前缀或位于其内部的项目。
- `opencode`：返回 OpenCode 知道的所有项目。该模式绕过工作区过滤，只应在可信本地环境使用。
- `config`：忽略 OpenCode 项目列表，按配置里的每个工作区前缀合成一个项目，用于保留旧的静态工作区行为。

## 安全边界

除 `/health` 外，所有端点都需要 `Authorization: Bearer <token>`。agent 转发请求到 OpenCode 前会移除该 header，避免移动端 token 泄露给上游 OpenCode 服务。

工作区 allowlist 基于路径前缀。配置的前缀允许精确路径匹配和子目录匹配。`/` 会允许所有路径，只应在可信本地开发环境使用。

## 验证

发布前建议运行：

```bash
npm run build
npm run typecheck
npm --workspace packages/agent run test
```

本地开发可运行：

```bash
npm --workspace packages/agent run dev -- start
```
