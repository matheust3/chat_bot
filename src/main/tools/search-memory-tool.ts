import { IToolDefinition } from '../../domain/services/ai-tool'

const tool: IToolDefinition = {
  name: 'search_memory',
  description: 'Busca notas relevantes na memória vetorial do usuário.',
  input: '{"query":"texto de busca","limit":5}',
  run: async (args, ctx) => {
    const query = String(args.query ?? '').trim()
    if (query === '') return 'Consulta vazia.'
    const limit = typeof args.limit === 'number' && Number.isFinite(args.limit)
      ? Math.min(Math.max(args.limit, 1), 20)
      : 5
    const results = await ctx.search(query, limit)
    if (results.length === 0) return 'Nenhuma memória relevante encontrada.'
    return results.map((item, index) => `${index + 1}. ${item}`).join('\n')
  }
}

export default tool
