import { AddChatToAuthorizedChatsFileDatasource } from './add-chat-to-authorized-chats-file-datasource'
import * as fs from 'fs'
import path from 'path'

interface SutTypes {
  datasource: AddChatToAuthorizedChatsFileDatasource
}

jest.mock('fs')
const mockFsExistsSync = (fs.existsSync as jest.Mock)
const mockFsWriteFileSync = (fs.writeFileSync as jest.Mock)
const mockFsMkdirSync = (fs.mkdirSync as jest.Mock)
const mockFsReadFileSync = (fs.readFileSync as jest.Mock)

const makeSut = (): SutTypes => {
  const datasource = new AddChatToAuthorizedChatsFileDatasource()

  mockFsExistsSync.mockReset()
  mockFsWriteFileSync.mockReset()
  mockFsMkdirSync.mockReset()
  mockFsReadFileSync.mockReset()

  return { datasource }
}

describe('add-chat-to-authorized-chats-file-datasource.spec.ts - addChat', () => {
  test('ensure create database folder and file if not exists', async () => {
    //! Arrange
    const { datasource } = makeSut()
    mockFsExistsSync.mockReturnValue(false)
    //! Act
    await datasource.addChat('chatId')
    //! Assert
    expect(mockFsExistsSync).toHaveBeenCalledWith(path.join(__dirname, '/../../../database-files'))
    expect(mockFsMkdirSync).toHaveBeenCalledWith(path.join(__dirname, '/../../../database-files'))
    expect(mockFsWriteFileSync).toHaveBeenCalledWith(path.join(__dirname, '/../../../database-files/authorized-chats.json'), JSON.stringify(['chatId']),
      { encoding: 'utf-8' })
  })
  test('ensure add new data if file exists', async () => {
    //! Arrange
    const { datasource } = makeSut()
    mockFsExistsSync.mockReturnValue(true)
    mockFsReadFileSync.mockReturnValue('["chatId"]')
    //! Act
    await datasource.addChat('chatId2')
    //! Assert
    expect(mockFsReadFileSync).toHaveBeenCalledWith(path.join(__dirname, '/../../../database-files/authorized-chats.json'), { encoding: 'utf-8' })
    expect(mockFsWriteFileSync).toHaveBeenCalledWith(path.join(__dirname, '/../../../database-files/authorized-chats.json'), JSON.stringify(['chatId', 'chatId2']),
      { encoding: 'utf-8' })
  })
  test('ensure create file if not exists', async () => {
    //! Arrange
    const { datasource } = makeSut()
    mockFsExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false)
    //! Act
    await datasource.addChat('chatId')
    //! Assert
    expect(mockFsWriteFileSync).toHaveBeenCalledWith(path.join(__dirname, '/../../../database-files/authorized-chats.json'), JSON.stringify(['chatId']),
      { encoding: 'utf-8' })
  })
  test('ensure throws if datasource throws', async () => {
    //! Arrange
    const { datasource } = makeSut()
    mockFsExistsSync.mockImplementation((p) => { throw Error('any error test') })
    //! Act
    //! Assert
    await expect(datasource.addChat('chatId')).rejects.toThrow()
  })
  test('ensure not add chatId again if exits if file', async () => {
    //! Arrange
    const { datasource } = makeSut()
    mockFsReadFileSync.mockReturnValue(JSON.stringify(['chat1', 'chat2', 'chat3']))
    mockFsExistsSync.mockReturnValue(true)
    //! Act
    //! Assert
    await expect(datasource.addChat('chat2')).rejects.toThrowError(Error('Has already been authorized'))
    expect(mockFsWriteFileSync).toHaveBeenCalledTimes(0)
  })
})
