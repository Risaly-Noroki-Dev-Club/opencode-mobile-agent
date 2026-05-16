export type OpenCodeClient = {
  health(): Promise<{ healthy: boolean; version?: string }>
}

export function createOpenCodeClient(baseUrl: string): OpenCodeClient {
  return {
    async health() {
      const response = await fetch(new URL("/global/health", baseUrl))
      if (!response.ok) throw new Error(`OpenCode health check failed: ${response.status}`)
      return response.json() as Promise<{ healthy: boolean; version?: string }>
    },
  }
}
