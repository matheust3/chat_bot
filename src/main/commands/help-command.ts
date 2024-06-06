import { IClient, IMessage } from '../protocols'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.command?.command === 'help' || message.command?.command === 'ajuda') {
    const text = `💬 *Comandos de Ajuda* 💬

    🔹 \`#help\` -> Esta mensagem de ajuda
    🔹 \`#ajuda\` -> Esta mensagem de ajuda
    
    🔹 \`#sticker\` -> Faz uma figurinha quadrada
    🔹 \`#sticker -o\` -> Faz uma figurinha com a proporção original
    
    🔹 \`#link\` -> Retorna o link do grupo`

    await client.sendText(message.groupId ?? message.from, text, { quotedMsg: message.id })
  }
}
