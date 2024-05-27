export interface IClient {
  /**
   * Faz o download de um arquivo
   *
   * @param messageId Id da mensagem
   * @returns Buffer do arquivo
   */
  downloadFile: (messageId: string) => Promise<Buffer>
  sendImageAsSticker: (to: string, pathOrBase64: string, type: 'static' | 'animated', op?: { quotedMsg: string }) => Promise<void>
  sendText: (to: string, content: string, op?: { quotedMsg: string }) => Promise<void>
}
