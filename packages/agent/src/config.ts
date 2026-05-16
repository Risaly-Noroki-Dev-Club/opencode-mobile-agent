import { randomBytes } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { homedir } from "node:os"
import { z } from "zod"

export const ProjectSource = z.enum(["config", "opencode", "intersect"])
export type ProjectSource = z.infer<typeof ProjectSource>

const ConfigSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.number().int().min(2250).max(2300).default(2250),
  token: z.string().min(16),
  opencodeUrl: z.string().url().default("http://127.0.0.1:4096"),
  opencodeForwardPrefix: z.string().min(1).default("/opencode"),
  workspaces: z.array(z.string()).default([]),
  projectSource: ProjectSource.default("intersect"),
})

export type AgentConfig = z.infer<typeof ConfigSchema>

export function defaultConfigPath() {
  return join(homedir(), ".config", "opencode-mobile", "agent.json")
}

export function createDefaultConfig(): AgentConfig {
  return {
    host: "127.0.0.1",
    port: 2250,
    token: randomBytes(32).toString("hex"),
    opencodeUrl: "http://127.0.0.1:4096",
    opencodeForwardPrefix: "/opencode",
    workspaces: [],
    projectSource: "intersect",
  }
}

export function readConfig(path = defaultConfigPath()): AgentConfig {
  const raw = readFileSync(path, "utf8")
  return ConfigSchema.parse(JSON.parse(raw))
}

export function initConfig(path = defaultConfigPath()): AgentConfig {
  if (existsSync(path)) return readConfig(path)
  const config = createDefaultConfig()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 })
  return config
}

export function normalizePrefix(prefix: string): string {
  const trimmed = prefix.trim()
  if (trimmed === "" || trimmed === "/") return trimmed
  return trimmed.replace(/\/+$/, "")
}

export function matchesPrefix(worktree: string, prefixes: readonly string[]): boolean {
  if (prefixes.length === 0) return false
  const normalizedWorktree = worktree.replace(/\/+$/, "") || "/"
  for (const raw of prefixes) {
    const prefix = normalizePrefix(raw)
    if (prefix === "") continue
    if (prefix === "/") return true
    if (normalizedWorktree === prefix) return true
    if (normalizedWorktree.startsWith(prefix + "/")) return true
  }
  return false
}
