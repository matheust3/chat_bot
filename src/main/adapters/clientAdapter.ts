import { Whatsapp } from '@wppconnect-team/wppconnect'
import { IClient } from '../protocols/IClient'

export const clientAdapter = (client: Whatsapp): IClient => {
  return {
    ban: async (chatId: string, contactId: string) => {
      await client.removeParticipant(chatId, contactId)
    },
    botIsAdmin: async (groupId: string) => {
      const group = await client.getGroupAdmins(groupId)
      // Pega os dados dos contatos do grupo
      for (const admin of group) {
        const contact = await client.getContact(admin._serialized)
        if (contact.isMe) {
          return true
        }
      }
      return false
    },
    downloadFile: async (messageId: string) => {
      // Pega a mensagem
      const message = await client.getMessageById(messageId)
      // Faz o download do arquivo
      return await client.decryptFile(message)
    },
    getGroupInviteLink: async (chatId: string) => {
      return await client.getGroupInviteLink(chatId)
    },
    deleteMessage: async (chatId: string, messageId: string) => {
      await client.deleteMessage(chatId, messageId, false, true)
    },
    sendImageAsSticker: async (to: string, pathOrBase64: string, type: 'static' | 'animated', op?: { quotedMsg: string }) => {
      if (type === 'static') {
        await client.sendImageAsSticker(to, pathOrBase64)
      } else {
        const res = await client.sendImageAsStickerGif(to, pathOrBase64)
        const msg = await client.getMessageById(res.id)
        if (msg?.mediaData?.mediaStage === 'ERROR_TOO_LARGE') {
          throw new Error('ERROR_TOO_LARGE')
        }
      }
    },
    sendText: async (to: string, content: string, op?: { quotedMsg: string }) => {
      const msg = await client.sendText(to, content, op)
      return msg.id
    }
  }
}
