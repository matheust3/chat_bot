import { ChatsDatasource } from '../datasources/chats-datasource'
import { ChatsRepositoryImpl } from './chats-repository-impl'
import { mock, MockProxy } from 'jest-mock-extended'

describe('chats-repository-impl.spec.ts - addChatToLinksBlackList', () => {
  let mockChatsDatasource: MockProxy<ChatsDatasource>
  let chatsRepositoryImpl: ChatsRepositoryImpl

  beforeEach(() => {
    mockChatsDatasource = mock<ChatsDatasource>()
    chatsRepositoryImpl = new ChatsRepositoryImpl(mockChatsDatasource)
  })

  test('ensure call addChatsToLinksBlackList correctly', async () => {
    //! Arrange
    const chatId = 'chatId'
    //! Act
    await chatsRepositoryImpl.addChatToLinksBlackList(chatId)
    //! Assert
    expect(mockChatsDatasource.addChatToLinksBlackList).toHaveBeenCalledWith(chatId)
  })
})

describe('chats-repository-impl.spec.ts - getChatsLinksBlackList', () => {
  let mockChatsDatasource: MockProxy<ChatsDatasource>
  let chatsRepositoryImpl: ChatsRepositoryImpl

  beforeEach(() => {
    mockChatsDatasource = mock<ChatsDatasource>()
    chatsRepositoryImpl = new ChatsRepositoryImpl(mockChatsDatasource)

    const chatsList = ['chatId1', 'chatId2']
    mockChatsDatasource.getChatsLinksBlackList.mockResolvedValue(chatsList)
  })

  test('ensure call getChatsLinksBlackList correctly', async () => {
    //! Arrange
    //! Act
    const result = await chatsRepositoryImpl.getChatsLinksBlackList()
    //! Assert
    expect(result).toEqual(['chatId1', 'chatId2'])
  })
})
