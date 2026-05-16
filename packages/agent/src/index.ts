#!/usr/bin/env node
import { Hono } from "hono"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { initConfig, readConfig } from "./config.js"
import { createOpenCodeClient } from "./opencode.js"
import { proxyOpenCodeRequest } from "./proxy.js"
import { attachMobileWebSocket } from "./websocket.js"

const command = process.argv[2] ?? "start"

if (command === "init") {
  const config = initConfig()
  console.log("Created agent config")
  console.log(`Host: ${config.host}`)
  console.log(`Port: ${config.port}`)
  console.log(`Token: ${config.token}`)
  console.log("Add workspace paths to the workspaces array before exposing the agent.")
  process.exit(0)
}

if (command !== "start") {
  console.error(`Unknown command: ${command}`)
  console.error("Usage: opencode-mobile-agent [init|start]")
  process.exit(1)
}

const config = readConfig()
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
  let upstream: unknown = null
  try {
    upstream = await opencode.health()
  } catch (error) {
    upstream = { healthy: false, error: error instanceof Error ? error.message : String(error) }
  }
  return c.json({ healthy: true, upstream })
})

app.get("/workspaces", (c) => {
  return c.json({ items: workspaces })
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
  console.log(`opencode-mobile-agent listening on http://${bound}`)
  console.log(`OpenCode upstream: ${config.opencodeUrl}`)
  console.log(`OpenCode forward: ${config.opencodeForwardPrefix}/*`)
  console.log("Mobile WebSocket: /ws")
})

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
