import { IMessage } from '../protocols/IMessage'

export default async (message: IMessage): Promise<void> => {
  message.body = 'edited'
}
