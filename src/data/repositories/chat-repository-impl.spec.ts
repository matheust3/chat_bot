import { Chat, Message } from 'whatsapp-web.js'
import { ChatRepositoryImpl } from './chat-repository-impl'
import { mock, MockProxy } from 'jest-mock-extended'

interface SutTypes{

  repository: ChatRepositoryImpl
  message: MockProxy<Message> & Message
  chat: MockProxy<Chat> & Chat

}

const makeSut = (): SutTypes => {
  const message = mock<Message>()
  const chat = mock<Chat>()

  message.getChat.mockResolvedValue(chat)
  chat.id._serialized = 'chatId'

  const repository = new ChatRepositoryImpl()

  return { message, repository, chat }
}

describe('chat-repository-impl.spec.ts - getChatId', () => {
  test('ensure get chat', async () => {
    //! Arrange
    const { repository, message } = makeSut()
    //! Act
    await repository.getChatId(message)
    //! Assert
    expect(message.getChat).toHaveBeenCalledTimes(1)
  })

  test('ensure return chat id', async () => {
    //! Arrange
    const { repository, message } = makeSut()
    //! Act
    const result = await repository.getChatId(message)
    //! Assert
    expect(result).toEqual('chatId')
  })
})
