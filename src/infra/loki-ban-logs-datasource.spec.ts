import { LokiBanLogsDatasource } from './loki-ban-logs-datasource'
import loki from 'lokijs'
import { mock, MockProxy } from 'jest-mock-extended'
import { BanLogData } from '../domain/models/ban-log-data'

let lokiBanLogsDatasource: LokiBanLogsDatasource
let db: MockProxy<loki> & loki
let collection: MockProxy<loki.Collection<BanLogData>> & loki.Collection<BanLogData>

describe('loki-ban-logs-datasource.spec.ts - registryBan', () => {
  beforeEach(() => {
    db = mock<loki>()
    collection = mock<loki.Collection<BanLogData>>()

    db.getCollection.mockImplementation((_) => { return collection as never })

    lokiBanLogsDatasource = new LokiBanLogsDatasource(db)
  })

  test('ensure return null if collection not exists', async () => {
    //! Arrange
    db.getCollection.mockReturnValue(null as never)
    //! Act
    const result = await lokiBanLogsDatasource.getBanLog('test')
    //! Assert
    expect(result).toEqual([])
  })

  test('ensure return logs registry', async () => {
    //! Arrange
    const log1: BanLogData = {
      contactId: 'test1',
      log: 'log',
      date: (new Date(1636340261245)).toUTCString()
    }
    const log2: BanLogData = {
      contactId: 'test1',
      log: 'log',
      date: (new Date(1636340261345)).toUTCString()
    }
    collection.find.mockReturnValue([
      { contactId: 'test1', log: 'log', $loki: 1, meta: { created: 1636340261245, revision: 0, version: 0, updated: 1636340261245 } },
      { contactId: 'test1', log: 'log', $loki: 1, meta: { created: 1636340261345, revision: 0, version: 0, updated: 1636340261345 } }
    ])
    //! Act
    const result = await lokiBanLogsDatasource.getBanLog('contact id')
    //! Assert
    expect(result).toEqual(
      [
        log1,
        log2
      ]
    )
  })
})
describe('loki-ban-logs-datasource.spec.ts - registryBan', () => {
  beforeEach(() => {
    db = mock<loki>()
    collection = mock<loki.Collection<BanLogData>>()

    db.getCollection.mockImplementation((_) => { return collection as never })
    db.addCollection.mockImplementation((_) => { return collection as never })

    lokiBanLogsDatasource = new LokiBanLogsDatasource(db)
  })

  test('ensure get te ban_logs collection', async () => {
    //! Arrange
    //! Act
    await lokiBanLogsDatasource.registryBan('contact', 'test')
    //! Assert
    expect(db.getCollection).toHaveBeenCalledWith('ban_logs')
  })

  test('ensure add collection if not exists', async () => {
    //! Arrange
    db.getCollection.mockReturnValue(null as never)
    //! Act
    await lokiBanLogsDatasource.registryBan('', '')
    //! Assert
    expect(db.addCollection).toHaveBeenCalledWith('ban_logs')
  })

  test('ensure insert logs on collection', async () => {
    //! Arrange
    //! Act
    await lokiBanLogsDatasource.registryBan('cId', 'log test')
    //! Assert
    expect(collection.insert).toHaveBeenCalledWith({ contactId: 'cId', log: 'log test' })
  })
})
