import { LoadAuthorizedChatsFileDatasource } from './load-authorized-chats-file-datasource'
import * as fs from 'fs'
import path from 'path'

interface SutTypes{
  datasource: LoadAuthorizedChatsFileDatasource
}

jest.mock('fs')
const mockFsExistsSync = (fs.existsSync as jest.Mock)
const mockFsReadFileSync = (fs.readFileSync as jest.Mock)

const makeSut = (): SutTypes => {
  const datasource = new LoadAuthorizedChatsFileDatasource()

  mockFsExistsSync.mockReset()
  mockFsReadFileSync.mockReset()

  return { datasource }
}

describe('load-authorized-chats-file-datasource.spec.ts - load', () => {
  test('ensure return empty if file not exists', async () => {
    //! Arrange
    const { datasource } = makeSut()
    mockFsExistsSync.mockReturnValue(false)
    //! Act
    const result = datasource.load()
    //! Assert
    expect(result).toEqual([])
    expect(mockFsExistsSync).toHaveBeenCalledWith(
      path.join(__dirname, '/../../../database-files/authorized-chats.json')
    )
  })
  test('ensure return chats from file', () => {
    //! Arrange
    const { datasource } = makeSut()
    mockFsExistsSync.mockReturnValue(true)
    mockFsReadFileSync.mockReturnValue(JSON.stringify(['ChatId']))
    //! Act
    const result = datasource.load()
    //! Assert
    expect(result).toEqual(['ChatId'])
    expect(mockFsReadFileSync).toHaveBeenCalledWith(path.join(__dirname, '/../../../database-files/authorized-chats.json'), { encoding: 'utf-8' })
  })
  test('ensure throws if fs throws', async () => {
    //! Arrange
    const { datasource } = makeSut()
    mockFsExistsSync.mockImplementation((p) => { throw Error('any error test') })
    //! Act
    //! Assert
    try {
      datasource.load()
      expect(false).toBe(true)
    } catch {
      expect(true).toBe(true)
    }
  })
})
