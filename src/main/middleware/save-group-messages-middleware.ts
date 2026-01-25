import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { GroupMessagesRepositoryInstance } from '../singletons/group-messages-repository-instance'
import { DirectMessagesRepositoryInstance } from '../singletons/direct-messages-repository-instance'

export default async (message: IMessage, client: IClient, next: () => void): Promise<void> => {
  try {
    if (message.groupId !== undefined) {
      const bodyContent = message.body?.trim() ?? ''
      const captionContent = message.caption?.trim() ?? ''
      const content = bodyContent.length > 0 ? bodyContent : captionContent

      if (content.length === 0) {
        next()
        return
      }

      let senderName = message.senderName
      if (senderName === undefined || senderName.trim().length === 0) {
        senderName = await client.getContactName(message.sender)
      }

      let groupName = message.groupName
      if (groupName === undefined || groupName.trim().length === 0) {
        groupName = await client.getChatName(message.groupId)
      }

      await GroupMessagesRepositoryInstance.saveGroupMessage({
        groupExternalId: message.groupId,
        groupName,
        messageExternalId: message.id,
        senderId: message.sender,
        senderName,
        content,
        sentAt: message.sentAt ?? new Date(),
        fromMe: message.fromMe
      })
    }

    if (message.groupId === undefined) {
      const bodyContent = message.body?.trim() ?? ''
      const captionContent = message.caption?.trim() ?? ''
      const content = bodyContent.length > 0 ? bodyContent : captionContent

      if (content.length === 0) {
        next()
        return
      }

      let senderName = message.senderName
      if (senderName === undefined || senderName.trim().length === 0) {
        if (message.sender.length > 0) {
          senderName = await client.getContactName(message.sender)
        }
      }

      let chatName = await client.getContactName(message.chatId)
      if (chatName === undefined || chatName.trim().length === 0) {
        chatName = senderName
      }

      await DirectMessagesRepositoryInstance.saveDirectMessage({
        chatExternalId: message.chatId,
        chatName,
        messageExternalId: message.id,
        senderId: message.sender,
        senderName,
        content,
        sentAt: message.sentAt ?? new Date(),
        fromMe: message.fromMe
      })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error saving group message', err)
  } finally {
    next()
  }
}
