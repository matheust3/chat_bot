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
    sendImageAsSticker: async (to: string, pathOrBase64: string, type: 'static' | 'animated', op?: { quotedMsg: string }) => {
      if (type === 'static') {
        await client.sendImageAsSticker(to, pathOrBase64)
      } else {
        await client.sendImageAsStickerGif(to, pathOrBase64)
      }
    },
    sendText: async (to: string, content: string, op?: { quotedMsg: string }) => {
      await client.sendText(to, content, op)
    }
  }
}
