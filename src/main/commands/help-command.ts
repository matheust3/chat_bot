import { IClient, IMessage } from '../protocols'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.command?.command === 'help' || message.command?.command === 'ajuda') {
    let text = `💬 *Comandos Disponíveis* 💬

*#️⃣help ->* Esta mensagem de ajuda
*#️⃣ajuda ->* Esta mensagem de ajuda
*#️⃣sticker [argumentos] ->* Faz figurinhas
       *Argumentos:*
       \`-o\` *->* Não recorta a figurinha
*#️⃣link ->* Retorna o link do grupo`

    if (message.fromMe) {
      text += `\n\n🎩*Comandos de root*🎩\n 
*#️⃣group_info [argumentos] ->* Retorna informações do grupo
       *Argumentos:*
       \`-id\` *->* Retorna o ID do grupo
*#️⃣block [argumentos] ->* Bloqueia conteúdo de um grupo
       *Argumentos:*
       \`-links\` *->* Bloqueia links no grupo`
    }

    await client.sendText(message.groupId ?? message.from, text, { quotedMsg: message.id })
  }
}
