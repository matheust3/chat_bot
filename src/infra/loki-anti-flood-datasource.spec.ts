import { LokiAntiFloodDatasource } from './loki-anti-flood-datasource'
import LokiJs from 'lokijs'
import { mock, MockProxy } from 'jest-mock-extended'

let datasource: LokiAntiFloodDatasource
let db: MockProxy<LokiJs> & LokiJs
let collection: MockProxy<LokiJs.Collection> & LokiJs.Collection

describe('loki-anti-flood-datasource.spec.ts - checkIfIsFlood', () => {
  beforeEach(() => {
    db = mock<LokiJs>()
    collection = mock<LokiJs.Collection>()

    db.getCollection.mockReturnValue(collection as never)
    collection.find.mockReturnValue([])

    datasource = new LokiAntiFloodDatasource(db, 30)
  })

  test('ensure add a collection to database', async () => {
    //! Arrange
    db = mock<LokiJs>()
    db.getCollection.mockReturnValue(null as never)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const t = new LokiAntiFloodDatasource(db, 30)
    //! Assert
    expect(db.addCollection).toHaveBeenCalledWith('anti_flood')
  })

  test('ensure not add collection if collection exists', async () => {
    //! Arrange
    db = mock<LokiJs>()
    db.getCollection.mockReturnValue(collection as never)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const t = new LokiAntiFloodDatasource(db, 30)
    //! Assert
    expect(db.addCollection).toHaveBeenCalledTimes(0)
  })

  test('ensure delete older registres', async () => {
    //! Arrange
    //! Act
    await datasource.checkIfIsFlood('')
    //! Assert
    expect(collection.removeWhere).toHaveBeenCalledTimes(1)
  })

  test('ensure return true if find more than 30 registres', async () => {
    //! Arrange
    const l = []
    for (let i = 0; i < 31; i++) {
      l.push({} as never)
    }
    collection.find.mockReturnValue(l)
    //! Act
    const result = await datasource.checkIfIsFlood('')
    //! Assert
    expect(result).toBe(true)
  })

  test('ensure return false if not have more than 30 registres', async () => {
    //! Arrange
    const l = []
    for (let i = 0; i < 30; i++) {
      l.push({} as never)
    }
    collection.find.mockReturnValue(l)
    //! Act
    const result = await datasource.checkIfIsFlood('')
    //! Assert
    expect(result).toBe(false)
  })

  test('ensure call find with correct params', async () => {
    //! Arrange
    //! Act
    await datasource.checkIfIsFlood('contactId')
    //! Assert
    expect(collection.find).toBeCalledWith({ contactId: 'contactId' })
  })

  test('ensure insert a new registry', async () => {
    //! Arrange
    //! Act
    await datasource.checkIfIsFlood('new registry')
    //! Assert
    expect(collection.insert).toHaveBeenCalledWith({ contactId: 'new registry' })
  })
})
