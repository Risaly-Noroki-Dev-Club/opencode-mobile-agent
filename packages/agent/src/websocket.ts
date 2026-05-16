import { WebSocketServer, type WebSocket } from "ws"
import type { Server } from "node:http"
import { ClientEvent, type ServerEventType, type WorkspaceSummaryType } from "./protocol.js"

export function attachMobileWebSocket(opts: {
  server: Server
  token: string
  workspaces: WorkspaceSummaryType[]
}) {
  const wss = new WebSocketServer({ noServer: true })

  opts.server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost")
    if (url.pathname !== "/ws") return
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request)
    })
  })

  wss.on("connection", (ws) => {
    let authenticated = false

    ws.on("message", (raw) => {
      const parsedJson = parseJson(raw.toString())
      if (!parsedJson.ok) {
        send(ws, { type: "error", message: "Invalid JSON" })
        return
      }

      const event = ClientEvent.safeParse(parsedJson.value)
      if (!event.success) {
        send(ws, { type: "error", message: "Invalid event" })
        return
      }

      if (!authenticated) {
        if (event.data.type !== "auth" || event.data.token !== opts.token) {
          send(ws, { type: "error", message: "Unauthorized" })
          ws.close(1008, "Unauthorized")
          return
        }
        authenticated = true
        send(ws, { type: "auth.ok" })
        return
      }

      if (event.data.type === "workspace.list") {
        send(ws, { type: "workspace.items", items: opts.workspaces })
        return
      }

      send(ws, { type: "error", message: `${event.data.type} is not implemented yet` })
    })
  })

  return wss
}

function send(ws: WebSocket, event: ServerEventType) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event))
}

function parseJson(value: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) }
  } catch {
    return { ok: false }
  }
}
