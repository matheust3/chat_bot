import fg from 'fast-glob'
import { IToolDefinition } from '../../domain/services/ai-tool'

export default async (): Promise<IToolDefinition[]> => {
  const tools: IToolDefinition[] = []
  const files = fg.sync('./../**/tools/**/**-tool.*', { cwd: __dirname })

  for (const file of files) {
    if (!file.endsWith('.test.ts')) {
      const toolModule = await import(file)
      const tool = (toolModule.default ?? toolModule) as IToolDefinition | undefined
      if (tool != null) {
        tools.push(tool)
      }
    }
  }

  return tools
}
