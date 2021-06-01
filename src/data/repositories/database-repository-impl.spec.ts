import { mock, MockProxy } from 'jest-mock-extended'
import { AddChatToAuthorizedChatsDatasource } from '../datasources/database/add-chat-to-authorized-chats-datasource'
import { LoadAuthorizedChatsDatasource } from '../datasources/database/load-authorized-chats-datasource'
import { DatabaseRepositoryImpl } from './database-repository-impl'

interface SutTypes{
  repository: DatabaseRepositoryImpl
  loadAuthorizedChatsDatasource: MockProxy< LoadAuthorizedChatsDatasource> & LoadAuthorizedChatsDatasource
  addChatToAuthorizedChatsDatasource: MockProxy<AddChatToAuthorizedChatsDatasource> & AddChatToAuthorizedChatsDatasource
}

const makeSut = (): SutTypes => {
  const loadAuthorizedChatsDatasource = mock<LoadAuthorizedChatsDatasource>()
  const addChatToAuthorizedChatsDatasource = mock<AddChatToAuthorizedChatsDatasource>()

  loadAuthorizedChatsDatasource.load.mockReturnValue(['chatId'])

  const repository = new DatabaseRepositoryImpl(loadAuthorizedChatsDatasource,
    addChatToAuthorizedChatsDatasource)

  return {
    repository,
    loadAuthorizedChatsDatasource,
    addChatToAuthorizedChatsDatasource
  }
}

describe('database-repository-impl.spec.ts - isChatAuthorized', () => {
  test('ensure return true if chat id is in chats list', async () => {
    //! Arrange
    const { repository } = makeSut()
    //! Act
    const result = await repository.isChatAuthorized('chatId')
    //! Assert
    expect(result).toEqual(true)
  })
  test('ensure return false if chat id is not in chats list', async () => {
    //! Arrange
    const { repository } = makeSut()
    //! Act
    const result = await repository.isChatAuthorized('chatIdInvalid')
    //! Assert
    expect(result).toEqual(false)
  })
})

describe('database-repository-impl.spec.ts - addChatToAuthorizedChats', () => {
  test('ensure call datasource with correct params', async () => {
    //! Arrange
    const { repository, addChatToAuthorizedChatsDatasource } = makeSut()
    //! Act
    await repository.addChatToAuthorizedChats('chatId')
    //! Assert
    expect(addChatToAuthorizedChatsDatasource.addChat).toHaveBeenCalledWith('chatId')
  })
  test('ensure reload authorized chats list', async () => {
    //! Arrange
    const { repository, loadAuthorizedChatsDatasource } = makeSut()
    loadAuthorizedChatsDatasource.load.mockReturnValue(['chat1', 'chat2'])
    //! Act
    await repository.addChatToAuthorizedChats('chatId')
    //! Assert
    expect(loadAuthorizedChatsDatasource.load).toHaveBeenCalledTimes(2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((repository as any)._authorizedChats).toEqual(['chat1', 'chat2'])
  })
})

describe('database-repository-impl.spec.ts - constructor', () => {
  test('ensure load authorized chats', async () => {
    //! Arrange
    const { repository: datasource, loadAuthorizedChatsDatasource } = makeSut()
    //! Act
    //! Assert
    expect(loadAuthorizedChatsDatasource.load).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((datasource as any)._authorizedChats).toEqual(['chatId'])
  })
})
