import fg from 'fast-glob'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { IToolDefinition } from '../../domain/services/ai-tool'

export default async (): Promise<IToolDefinition[]> => {
  const tools: IToolDefinition[] = []
  const files = fg.sync('./../**/tools/**/**-tool.*', { cwd: __dirname })

  for (const file of files) {
    if (!file.endsWith('.test.ts')) {
      const resolved = path.resolve(__dirname, file)
      const toolModule = await import(pathToFileURL(resolved).href)
      const resolvedModule = (toolModule.default ?? toolModule) as unknown
      const tool = (resolvedModule as { default?: IToolDefinition }).default ?? (resolvedModule as IToolDefinition)
      if (tool != null && typeof tool.name === 'string' && tool.name.trim() !== '') {
        tools.push(tool)
      }
    }
  }

  return tools
}
