import { IToolDefinition } from '../../domain/services/ai-tool'

const tool: IToolDefinition = {
  name: 'get_time',
  description: 'Retorna a data e hora atuais no formato pt-BR.',
  input: '{"timezone":"optional"}',
  run: async () => {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  }
}

export default tool
