
import fg from 'fast-glob'
import { ICommandHandler } from '../protocols/ICommandHandler'

// Função responsável por carregar todos os arquivos de rotas
export default async (): Promise<ICommandHandler[]> => {
  const commands: ICommandHandler[] = []
  // Carrega todos os arquivos de rotas
  const files = fg.sync('./../**/commands/**/**command.*', { cwd: __dirname })

  for (const file of files) {
    if (!file.endsWith('.test.ts')) {
      const cmd = await import(file)
      commands.push((cmd.default).default)
    }
  }
  return commands
}
