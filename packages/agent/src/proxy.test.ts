import { test } from "node:test"
import { strict as assert } from "node:assert"
import { joinPath, sanitizeProxyRequestHeaders, sanitizeProxyResponseHeaders } from "./proxy.js"

test("joinPath uses forwarded path when base is root", () => {
  assert.equal(joinPath("/", "/project"), "/project")
  assert.equal(joinPath("/", "/"), "/")
})

test("joinPath concatenates non-root base with forwarded path", () => {
  assert.equal(joinPath("/api", "/project"), "/api/project")
  assert.equal(joinPath("/api/", "/project"), "/api/project")
})

test("joinPath adds leading slash to relative forwarded path", () => {
  assert.equal(joinPath("/api", "project"), "/api/project")
})

test("sanitizeProxyRequestHeaders strips encodings that fetch may transparently decode", () => {
  const headers = sanitizeProxyRequestHeaders({
    host: "mobile-agent",
    authorization: "Bearer secret",
    "accept-encoding": "gzip, deflate, br",
    connection: "keep-alive",
    accept: "application/json",
  })

  assert.equal(headers.has("host"), false)
  assert.equal(headers.has("authorization"), false)
  assert.equal(headers.has("accept-encoding"), false)
  assert.equal(headers.has("connection"), false)
  assert.equal(headers.get("accept"), "application/json")
})

test("sanitizeProxyResponseHeaders strips stale compressed body metadata", () => {
  const headers = sanitizeProxyResponseHeaders({
    "content-type": "application/json",
    "content-encoding": "gzip",
    "content-length": "1234",
    "transfer-encoding": "chunked",
  })

  assert.equal(headers.get("content-type"), "application/json")
  assert.equal(headers.has("content-encoding"), false)
  assert.equal(headers.has("content-length"), false)
  assert.equal(headers.has("transfer-encoding"), false)
})
