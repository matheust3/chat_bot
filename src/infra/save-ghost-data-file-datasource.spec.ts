import { SaveGhostDataFileDatasource } from './save-ghost-data-file-datasource'
import * as fs from 'fs'
import { GhostData } from '../domain/models/ghost-data'
import path from 'path'

jest.mock('fs')
const mockFsWriteFileSync = (fs.writeFileSync as jest.Mock)

interface SutTypes{
  datasource: SaveGhostDataFileDatasource
  ghostData: GhostData
}

const makeSut = (): SutTypes => {
  const ghostData: GhostData = { contacts: [] }

  const datasource = new SaveGhostDataFileDatasource()

  mockFsWriteFileSync.mockReset()

  return { datasource, ghostData }
}

describe('save-ghost-data-file-datasource.spec.ts - save', () => {
  test('ensure call fs with correct params', async () => {
    //! Arrange
    const { datasource, ghostData } = makeSut()

    //! Act
    await datasource.save(ghostData)
    //! Assert
    expect(mockFsWriteFileSync).toHaveBeenCalledWith(
      path.join(__dirname, '/../../database-files/ghost-data.json'), JSON.stringify(ghostData), { encoding: 'utf-8' }
    )
  })

  test('ensure throws if fs throws', async () => {
    //! Arrange
    const { datasource, ghostData } = makeSut()
    mockFsWriteFileSync.mockImplementation(() => { throw Error('any error test') })
    //! Act
    //! Assert
    await expect(datasource.save(ghostData)).rejects.toThrow()
  })
})
