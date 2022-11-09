
import fg from 'fast-glob'
import { ICommand } from '../protocols/ICommand'

// Função responsável por carregar todos os arquivos de rotas
export default async (): Promise<ICommand[]> => {
  const commands: ICommand[] = []
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
