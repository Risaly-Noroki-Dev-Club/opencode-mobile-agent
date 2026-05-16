#!/usr/bin/env node
import { Hono } from "hono"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { initConfig, readConfig, matchesPrefix, type AgentConfig } from "./config.js"
import { createOpenCodeClient, type OpenCodeClient } from "./opencode.js"
import type { ProjectSummaryType, SessionSummaryType } from "./protocol.js"
import { proxyOpenCodeRequest } from "./proxy.js"
import { attachMobileWebSocket } from "./websocket.js"

const command = process.argv[2] ?? "start"

if (command === "init") {
  const config = initConfig()
  console.log("Created agent config")
  console.log(`Host: ${config.host}`)
  console.log(`Port: ${config.port}`)
  console.log(`Token: ${config.token}`)
  console.log("Add workspace path prefixes to the workspaces array before exposing the agent.")
  process.exit(0)
}

if (command !== "start") {
  console.error(`Unknown command: ${command}`)
  console.error("Usage: opencode-mobile-agent [init|start]")
  process.exit(1)
}

const config = readConfig()
const agentVersion = readAgentVersion()
const opencode = createOpenCodeClient(config.opencodeUrl)
const app = new Hono()

const workspaces = config.workspaces.map((path, index) => ({
  id: `workspace-${index + 1}`,
  name: path.split("/").filter(Boolean).at(-1) ?? path,
  path,
}))

app.use("*", async (c, next) => {
  if (c.req.path === "/health") return next()
  const header = c.req.header("authorization")
  if (header !== `Bearer ${config.token}`) return c.json({ error: "Unauthorized" }, 401)
  return next()
})

app.get("/health", async (c) => {
  const upstream = await opencode.health()
  let projectCount = 0
  try {
    projectCount = (await listProjects(config, opencode)).length
  } catch {
    projectCount = 0
  }
  return c.json({
    healthy: true,
    agent: {
      version: agentVersion,
      host: config.host,
      port: config.port,
      forwardPrefix: config.opencodeForwardPrefix,
    },
    opencode: {
      url: config.opencodeUrl,
      healthy: upstream.healthy,
      version: upstream.version,
      error: upstream.error,
    },
    projects: {
      source: config.projectSource,
      count: projectCount,
    },
    upstream: {
      healthy: upstream.healthy,
      version: upstream.version,
      error: upstream.error,
    },
  })
})

app.get("/workspaces", (c) => {
  return c.json({ items: workspaces })
})

app.get("/projects", async (c) => {
  try {
    const items = await listProjects(config, opencode)
    return c.json({ items })
  } catch (error) {
    return c.json({ error: errorMessage(error) }, 502)
  }
})

app.get("/sessions", async (c) => {
  const projectId = c.req.query("projectId") || undefined
  const directoryParam = c.req.query("directory") || undefined
  try {
    const items = await listSessions(config, opencode, { projectId, directory: directoryParam })
    return c.json({ items })
  } catch (error) {
    return c.json({ error: errorMessage(error) }, 502)
  }
})

app.all(`${config.opencodeForwardPrefix}/*`, (c) => {
  return proxyOpenCodeRequest(c, {
    baseUrl: config.opencodeUrl,
    prefix: config.opencodeForwardPrefix,
  })
})

const server = createServer((request, response) => {
  void handleHttpRequest(request, response)
})

attachMobileWebSocket({ server, token: config.token, workspaces })

server.listen(config.port, config.host, () => {
  const address = server.address()
  const bound = typeof address === "string" ? address : `${address?.address}:${address?.port}`
  console.log(`opencode-mobile-agent ${agentVersion} listening on http://${bound}`)
  console.log(`OpenCode upstream: ${config.opencodeUrl}`)
  console.log(`OpenCode forward: ${config.opencodeForwardPrefix}/*`)
  console.log(`Project source: ${config.projectSource} (${workspaces.length} workspace prefix(es))`)
  console.log("Mobile WebSocket: /ws (experimental, not used by the Android app yet)")
})

async function listProjects(cfg: AgentConfig, client: OpenCodeClient): Promise<ProjectSummaryType[]> {
  if (cfg.projectSource === "config") return configProjects(cfg)
  const projects = await client.listProjects()
  const filtered =
    cfg.projectSource === "intersect"
      ? projects.filter((project) => matchesPrefix(project.worktree, cfg.workspaces))
      : projects
  return [...filtered].sort((a, b) => b.lastActive - a.lastActive)
}

function configProjects(cfg: AgentConfig): ProjectSummaryType[] {
  return cfg.workspaces.map((prefix, index) => ({
    id: `workspace-${index + 1}`,
    name: prefix.split("/").filter(Boolean).at(-1) ?? prefix,
    worktree: prefix,
    vcs: "none",
    lastActive: 0,
  }))
}

async function listSessions(
  cfg: AgentConfig,
  client: OpenCodeClient,
  filters: { projectId?: string; directory?: string },
): Promise<SessionSummaryType[]> {
  const sessions = await client.listSessions(filters.directory)
  const filtered = sessions.filter((session) => {
    if (filters.projectId && session.projectId !== filters.projectId) return false
    if (cfg.projectSource !== "opencode" && !matchesPrefix(session.directory, cfg.workspaces)) {
      return false
    }
    return true
  })
  return filtered.sort((a, b) => b.lastActive - a.lastActive)
}

function readAgentVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const pkgPath = join(here, "..", "package.json")
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string }
    return pkg.version ?? "0.0.0"
  } catch {
    return "0.0.0"
  }
}

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === "string") return value
  return "Internal error"
}

async function handleHttpRequest(request: IncomingMessage, response: ServerResponse) {
  try {
    const result = await app.fetch(toFetchRequest(request))
    response.writeHead(result.status, Object.fromEntries(result.headers.entries()))
    if (!result.body) {
      response.end()
      return
    }
    await result.body.pipeTo(
      new WritableStream({
        write(chunk) {
          response.write(chunk)
        },
        close() {
          response.end()
        },
        abort() {
          response.destroy()
        },
      }),
    )
  } catch (error) {
    response.writeHead(500, { "content-type": "application/json" })
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
  }
}

function toFetchRequest(request: IncomingMessage) {
  const host = request.headers.host ?? "localhost"
  const url = new URL(request.url ?? "/", `http://${host}`)
  const method = request.method ?? "GET"
  const hasBody = method !== "GET" && method !== "HEAD"
  return new Request(url, {
    method,
    headers: request.headers as HeadersInit,
    body: hasBody ? request : undefined,
    duplex: hasBody ? "half" : undefined,
  } as RequestInit & { duplex?: "half" })
}
