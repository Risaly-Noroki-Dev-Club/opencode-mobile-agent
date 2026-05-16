import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import type { ProjectSummaryType, SessionSummaryType } from "./protocol.js"

export type OpenCodeHealth = {
  healthy: boolean
  version?: string
  error?: string
}

export type OpenCodeClient = {
  health(): Promise<OpenCodeHealth>
  listProjects(): Promise<ProjectSummaryType[]>
  listSessions(directory?: string): Promise<SessionSummaryType[]>
}

export function createOpenCodeClient(baseUrl: string): OpenCodeClient {
  const sdk: OpencodeClient = createOpencodeClient({ baseUrl })

  return {
    async health() {
      try {
        const response = await fetch(new URL("/global/health", baseUrl))
        if (!response.ok) {
          return { healthy: false, error: `HTTP ${response.status}` }
        }
        const body = (await response.json()) as { healthy?: boolean; version?: string }
        return { healthy: body.healthy === true, version: body.version }
      } catch (error) {
        return { healthy: false, error: error instanceof Error ? error.message : String(error) }
      }
    },

    async listProjects() {
      const { data, error } = await sdk.project.list()
      if (error || !data) throw new Error(opencodeErrorMessage("project.list", error))
      return data.map(toProjectSummary)
    },

    async listSessions(directory) {
      const { data, error } = await sdk.session.list({
        query: directory ? { directory } : undefined,
      })
      if (error || !data) throw new Error(opencodeErrorMessage("session.list", error))
      return data.map(toSessionSummary)
    },
  }
}

function toProjectSummary(project: {
  id: string
  worktree: string
  vcs?: "git"
  time: { created: number; initialized?: number }
}): ProjectSummaryType {
  // SDK type omits time.updated even though the live API returns it.
  const updated = (project.time as { updated?: number }).updated
  const lastActive = updated ?? project.time.initialized ?? project.time.created
  return {
    id: project.id,
    name: deriveProjectName(project.worktree),
    worktree: project.worktree,
    vcs: project.vcs ?? "none",
    lastActive,
  }
}

function toSessionSummary(session: {
  id: string
  projectID: string
  directory: string
  title: string
  time: { updated: number; created: number }
}): SessionSummaryType {
  return {
    id: session.id,
    projectId: session.projectID,
    directory: session.directory,
    title: session.title,
    lastActive: session.time.updated ?? session.time.created,
  }
}

function deriveProjectName(worktree: string): string {
  const trimmed = worktree.replace(/\/+$/, "")
  if (trimmed === "" || trimmed === "/") return "(root)"
  const last = trimmed.split("/").filter(Boolean).at(-1)
  return last && last.length > 0 ? last : worktree
}

function opencodeErrorMessage(scope: string, error: unknown): string {
  if (!error) return `${scope}: unknown error`
  if (error instanceof Error) return `${scope}: ${error.message}`
  if (typeof error === "object" && error && "message" in error) {
    return `${scope}: ${String((error as { message: unknown }).message)}`
  }
  return `${scope}: ${String(error)}`
}
