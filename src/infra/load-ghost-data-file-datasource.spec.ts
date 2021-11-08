import { LoadGhostDataFileDatasource } from './load-ghost-data-file-datasource'
import * as fs from 'fs'
import { GhostData } from '../domain/models/ghost-data'
import path from 'path'

jest.mock('fs')
const mockFsExistsSync = (fs.existsSync as jest.Mock)
const mockFsReadFileSync = (fs.readFileSync as jest.Mock)

interface SutTypes{
  datasource: LoadGhostDataFileDatasource
}

const makeSut = (): SutTypes => {
  const datasource = new LoadGhostDataFileDatasource()

  mockFsExistsSync.mockReset()
  mockFsReadFileSync.mockReset()

  return { datasource }
}

describe('load-ghost-data-file-datasource.spec.ts - load', () => {
  test('ensure return empty data if file do not exists', async () => {
    //! Arrange
    const { datasource } = makeSut()
    mockFsExistsSync.mockReturnValue(false)
    //! Act
    const result = await datasource.load()
    //! Assert
    expect(result).toEqual({ contacts: [] } as GhostData)
    expect(mockFsExistsSync).toHaveBeenCalledWith(path.join(__dirname, '/../../database-files/ghost-data.json'))
  })
  test('ensure load file is exists', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const data: GhostData = { contacts: [{ id: 'anyId', lastTimeSeen: 123 }] }
    mockFsExistsSync.mockReturnValue(true)
    mockFsReadFileSync.mockReturnValue(JSON.stringify(data))
    //! Act
    const result = await datasource.load()
    //! Assert
    expect(mockFsReadFileSync).toHaveBeenCalledWith(path.join(__dirname, '/../../database-files/ghost-data.json'), { encoding: 'utf-8' })
    expect(result).toEqual(data)
  })
})
