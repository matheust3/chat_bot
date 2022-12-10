import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage): Promise<void> => {
  if (process.env.NODE_ENV === 'test') {
    await message.reply('edited')
  }
}
