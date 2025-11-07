import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { ChatsRepositoryInstance } from '../singletons/chats-repository-instance'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.fromAdmin) {
    if (message.command?.command === 'block') {
      if (message.groupId === undefined) {
        await client.sendText(message.from, 'Esse comando só pode ser usado em grupos', { quotedMsg: message.id })
      } else {
        const groupId = message.groupId
        if (message.command.args === undefined || message.command.args.length === 0) {
          await client.sendText(message.groupId, 'É necessário fornecer um argumento para o comanda', { quotedMsg: message.id })
        } else {
          if (message.command.args.includes('links')) {
            // Verifica se o grupo já está na lista de grupos bloqueados
            const chatsLinksBlocked = await ChatsRepositoryInstance.getChatsLinksBlackList()
            if (chatsLinksBlocked.includes(groupId)) {
              await client.sendText(message.groupId, 'Os links já estão bloqueados', { quotedMsg: message.id })
            } else {
              // Adiciona o grupo na lista de grupos bloqueados
              await ChatsRepositoryInstance.addChatToLinksBlackList(groupId)
              await client.sendText(message.groupId, 'Os links foram bloqueados', { quotedMsg: message.id })
            }
          }
        }
      }
    }
  }
}
