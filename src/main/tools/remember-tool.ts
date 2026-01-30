import { IToolDefinition } from '../../domain/services/ai-tool'

const tool: IToolDefinition = {
  name: 'remember',
  description: 'Armazena uma nota curta na memória vetorial do usuário.',
  input: '{"note":"texto a lembrar"}',
  run: async (args, ctx) => {
    const note = String(args.note ?? '').trim()
    if (note === '') return 'Nada para lembrar.'
    return await ctx.remember(note)
  }
}

export default tool
