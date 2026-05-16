import { z } from "zod"

export const PermissionResponse = z.enum(["allow_once", "allow_always", "deny"])
export type PermissionResponse = z.infer<typeof PermissionResponse>

export const WorkspaceSummary = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
})
export type WorkspaceSummary = z.infer<typeof WorkspaceSummary>

export const ClientEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auth"), token: z.string().min(1) }),
  z.object({ type: z.literal("workspace.list") }),
  z.object({
    type: z.literal("session.create"),
    workspaceId: z.string().min(1),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal("session.prompt"),
    sessionId: z.string().min(1),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("permission.reply"),
    sessionId: z.string().min(1),
    permissionId: z.string().min(1),
    response: PermissionResponse,
  }),
])
export type ClientEvent = z.infer<typeof ClientEvent>

export const ServerEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auth.ok") }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("workspace.items"), items: z.array(WorkspaceSummary) }),
  z.object({
    type: z.literal("assistant.delta"),
    sessionId: z.string().min(1),
    content: z.string(),
  }),
  z.object({
    type: z.literal("permission.request"),
    sessionId: z.string().min(1),
    permissionId: z.string().min(1),
    title: z.string(),
    summary: z.string(),
    risk: z.enum(["low", "medium", "high"]),
  }),
  z.object({ type: z.literal("session.diff.updated"), sessionId: z.string().min(1) }),
])
export type ServerEvent = z.infer<typeof ServerEvent>
