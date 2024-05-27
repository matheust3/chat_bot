import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage, client: IClient): Promise<void> => {
  if (message.body === '#test' && message.fromMe) {
    await client.sendText(message.from, 'working!')
  }
}
