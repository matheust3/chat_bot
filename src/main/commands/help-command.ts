import { IClient, IMessage } from '../protocols'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.command?.command === 'help' || message.command?.command === 'ajuda') {
    let text = `💬 *Comandos Disponíveis* 💬

*#️⃣ban ->* O ADM remove um usuário do grupo
*#️⃣delete ->* O ADM deleta uma mensagem
*#️⃣help ->* Esta mensagem de ajuda
*#️⃣ajuda ->* Esta mensagem de ajuda
*#️⃣sticker [argumentos] ->* Faz figurinhas
       *Argumentos:*
       \`-o\` *->* Não recorta a figurinha
*#️⃣link ->* Retorna o link do grupo`

    if (message.fromAdmin) {
      text += `\n\n🎩*Comandos de root*🎩\n 
*#️⃣block [argumentos] ->* Bloqueia conteúdo de um grupo
        *Argumentos:*
        \`-links\` *->* Bloqueia links no grupo
*#️⃣debug [argumentos] ->* Bloqueia conteúdo de um grupo
        *Argumentos:*
        \`-message\` *->* Usado para analisar mensagens
*#️⃣group_info [argumentos] ->* Retorna informações do grupo
       *Argumentos:*
       \`-id\` *->* Retorna o ID do grupo
*#️⃣get_message_d ->* Retorna o id de uma mensagem`
    }

    await client.sendText(message.groupId ?? message.from, text, { quotedMsg: message.id })
  }
}
