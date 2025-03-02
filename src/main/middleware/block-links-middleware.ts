import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { ChatsRepositoryInstance } from '../singletons/chats-repository-instance'
import { FileLevelDomainRepositoryInstance } from '../singletons/file-top-level-domain-repository'

export default async (message: IMessage, client: IClient, next: () => void): Promise<void> => {
  // Verifica se a mensagem é de um grupo e se não foi enviada por mim
  if (message.groupId !== undefined && !message.fromMe) {
    const chatId = message.groupId
    // Pega a lista de grupos que estão com os links bloqueados
    const blockedLinks = await ChatsRepositoryInstance.getChatsLinksBlackList()
    // Verifica se o grupo atual está na lista de grupos com links bloqueados
    if (blockedLinks.includes(chatId)) {
      // Pega a lista de TLD
      const tld = await FileLevelDomainRepositoryInstance.getTopLevelDomains()
      // Cria uma expressão regular para verificar se a mensagem contém um link
      const linkRegex = new RegExp(`\\b[^\\s]+\\.(${tld.join('|')})\\b`, 'i')
      // Verifica se a mensagem é um link
      if (linkRegex.test(message.body)) {
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
