import type { Context } from "hono"

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

export async function proxyOpenCodeRequest(c: Context, opts: { baseUrl: string; prefix: string }) {
  const upstream = new URL(opts.baseUrl)
  const requestUrl = new URL(c.req.url)
  const forwardedPath = requestUrl.pathname.slice(opts.prefix.length) || "/"
  upstream.pathname = joinPath(upstream.pathname, forwardedPath)
  upstream.search = requestUrl.search

  const headers = new Headers(c.req.raw.headers)
  for (const header of hopByHopHeaders) headers.delete(header)
  headers.delete("host")
  headers.delete("authorization")

  const method = c.req.method
  const body = method === "GET" || method === "HEAD" ? undefined : c.req.raw.body
  const response = await fetch(upstream, {
    method,
    headers,
    body,
    duplex: body ? "half" : undefined,
    redirect: "manual",
  } as RequestInit & { duplex?: "half" })

  const responseHeaders = new Headers(response.headers)
  for (const header of hopByHopHeaders) responseHeaders.delete(header)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

function joinPath(basePath: string, forwardedPath: string) {
  const base = basePath === "/" ? "" : basePath.replace(/\/$/, "")
  const forwarded = forwardedPath.startsWith("/") ? forwardedPath : `/${forwardedPath}`
  return `${base}${forwarded}` || "/"
}
