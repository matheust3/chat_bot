import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { ChatsRepositoryInstance } from '../singletons/chats-repository-instance'

export default async (message: IMessage, client: IClient, next: () => void): Promise<void> => {
  if (message.groupId !== undefined) {
    const chatId = message.groupId
    // Pega a lista de grupos que estão com os links bloqueados
    const blockedLinks = await ChatsRepositoryInstance.getChatsLinksBlackList()
    // Verifica se o grupo atual está na lista de grupos com links bloqueados
    if (blockedLinks.includes(chatId)) {
      // Verifica se a mensagem é um link
      if (message.body.match(/https?:\/\/[^\s]+/) != null) {
        // Se for um link, remove a mensagem
        await client.deleteMessage(chatId, message.id)
      } else {
        // Se não for um link, passa para o próximo middleware
        next()
      }
    } else {
      // Se o grupo não estiver na lista de grupos com links bloqueados, passa para o próximo middleware
      next()
    }
  } else {
    // Se a mensagem não for de um grupo, passa para o próximo middleware
    next()
  }
}
