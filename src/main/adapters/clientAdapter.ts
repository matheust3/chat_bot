import { Whatsapp } from '@wppconnect-team/wppconnect'
import { IClient } from '../protocols/IClient'

export const clientAdapter = (client: Whatsapp): IClient => {
  return {
    downloadFile: async (messageId: string) => {
      // Pega a mensagem
      const message = await client.getMessageById(messageId)
      // Faz o download do arquivo
      return await client.decryptFile(message)
    },
    getGroupInviteLink: async (chatId: string) => {
      return await client.getGroupInviteLink(chatId)
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
      await client.sendText(to, content, op)
    }
  }
}
