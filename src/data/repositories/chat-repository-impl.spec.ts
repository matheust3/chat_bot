import { Chat, Message } from 'whatsapp-web.js'
import { ChatRepositoryImpl } from './chat-repository-impl'
import { mock, MockProxy } from 'jest-mock-extended'
import { ClientDataSource } from '../datasources/client-datasource'

interface SutTypes {

  repository: ChatRepositoryImpl
  message: MockProxy<Message> & Message
  chat: MockProxy<Chat> & Chat
  clientDatasource: MockProxy<ClientDataSource> & ClientDataSource

}

const makeSut = (): SutTypes => {
  const message = mock<Message>()
  const chat = mock<Chat>()
  const clientDatasource = mock<ClientDataSource>()

  message.getChat.mockResolvedValue(chat)
  chat.id._serialized = 'chatId'

  const repository = new ChatRepositoryImpl(clientDatasource)

  return { message, repository, chat, clientDatasource }
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

describe('chat-repository-impl.spec.ts - getAllChats', () => {
  test('ensure get all chats', async () => {
    //! Arrange
    const { repository, clientDatasource } = makeSut()
    //! Act
    await repository.getAllChats()
    //! Assert
    expect(clientDatasource.getAllChats).toHaveBeenCalledTimes(1)
  })

  test('ensure return all chats', async () => {
    //! Arrange
    const { repository, clientDatasource } = makeSut()
    const chats = [{ id: 'chatId', name: 'chatName', isAdmin: true }]
    clientDatasource.getAllChats.mockResolvedValueOnce(chats)
    //! Act
    const result = await repository.getAllChats()
    //! Assert
    expect(result).toEqual(chats)
  })
})
