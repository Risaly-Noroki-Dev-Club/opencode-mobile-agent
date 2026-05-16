import { randomBytes } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { homedir } from "node:os"
import { z } from "zod"

const ConfigSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.number().int().min(2250).max(2300).default(2250),
  token: z.string().min(16),
  opencodeUrl: z.string().url().default("http://127.0.0.1:4096"),
  opencodeForwardPrefix: z.string().min(1).default("/opencode"),
  workspaces: z.array(z.string()).default([]),
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
