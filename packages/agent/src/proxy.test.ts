import { test } from "node:test"
import { strict as assert } from "node:assert"
import { joinPath } from "./proxy.js"

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
