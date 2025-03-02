
import fg from 'fast-glob'
import { IMiddlewareHandler } from '../protocols/IMiddlewareHandle'

// Função responsável por carregar todos os arquivos de rotas
export default async (): Promise<IMiddlewareHandler[]> => {
  const commands: IMiddlewareHandler[] = []
  // Carrega todos os arquivos de rotas
  const files = fg.sync('./../**/middleware/**/**middleware.*', { cwd: __dirname })

  for (const file of files) {
    if (!file.endsWith('.test.ts')) {
      const cmd = await import(file)
      commands.push((cmd.default).default)
    }
  }
  return commands
}
