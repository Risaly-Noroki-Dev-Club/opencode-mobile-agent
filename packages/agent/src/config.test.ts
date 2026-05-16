import { test } from "node:test"
import { strict as assert } from "node:assert"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { matchesPrefix, normalizePrefix, readConfig } from "./config.js"

test("normalizePrefix strips trailing slashes but preserves root", () => {
  assert.equal(normalizePrefix("/home/erika/projects/"), "/home/erika/projects")
  assert.equal(normalizePrefix("/home/erika/projects///"), "/home/erika/projects")
  assert.equal(normalizePrefix("  /home/erika  "), "/home/erika")
  assert.equal(normalizePrefix("/"), "/")
  assert.equal(normalizePrefix(""), "")
})

test("matchesPrefix accepts exact match", () => {
  assert.equal(matchesPrefix("/home/erika/projects/foo", ["/home/erika/projects/foo"]), true)
})

test("matchesPrefix accepts descendant of prefix", () => {
  assert.equal(matchesPrefix("/home/erika/projects/foo", ["/home/erika/projects"]), true)
  assert.equal(matchesPrefix("/home/erika/projects/foo/bar", ["/home/erika/projects"]), true)
})

test("matchesPrefix rejects unrelated path", () => {
  assert.equal(matchesPrefix("/etc/passwd", ["/home/erika"]), false)
  assert.equal(matchesPrefix("/home/erika-evil", ["/home/erika"]), false)
})

test("matchesPrefix tolerates trailing slashes on prefix", () => {
  assert.equal(matchesPrefix("/home/erika/projects/foo", ["/home/erika/projects/"]), true)
})

test("matchesPrefix returns false when prefix list is empty", () => {
  assert.equal(matchesPrefix("/home/erika/projects/foo", []), false)
})

test("matchesPrefix treats root prefix as allowing everything", () => {
  assert.equal(matchesPrefix("/anywhere", ["/"]), true)
})

test("readConfig applies defaults for omitted optional fields", () => {
  const dir = mkdtempSync(join(tmpdir(), "agent-config-test-"))
  const path = join(dir, "agent.json")
  writeFileSync(path, JSON.stringify({ token: "a".repeat(32) }))
  const config = readConfig(path)
  assert.equal(config.host, "127.0.0.1")
  assert.equal(config.port, 2250)
  assert.equal(config.projectSource, "intersect")
  assert.equal(config.opencodeForwardPrefix, "/opencode")
  assert.deepEqual(config.workspaces, [])
})

test("readConfig rejects invalid projectSource", () => {
  const dir = mkdtempSync(join(tmpdir(), "agent-config-test-"))
  const path = join(dir, "agent.json")
  writeFileSync(path, JSON.stringify({ token: "a".repeat(32), projectSource: "bogus" }))
  assert.throws(() => readConfig(path))
})
