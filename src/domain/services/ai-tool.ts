export interface IToolContext {
  userId: string
  integrationId: string
  remember: (note: string) => Promise<string>
  search: (query: string, limit?: number) => Promise<string[]>
}

export interface IToolDefinition {
  name: string
  description: string
  input: string
  run: (args: Record<string, unknown>, ctx: IToolContext) => Promise<string>
}
