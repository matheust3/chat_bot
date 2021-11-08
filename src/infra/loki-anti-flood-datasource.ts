import { AntiFloodDatasource } from '../data/datasources/anti-flood-datasource'
import LokiJs from 'lokijs'

export class LokiAntiFloodDatasource implements AntiFloodDatasource {
  private readonly _collection: LokiJs.Collection<{contactId: string}>

  constructor (private readonly _db: LokiJs, private readonly _msgPerMinute: number) {
    this._collection = _db.getCollection('anti_flood')
    if (this._collection === null) {
      this._collection = _db.addCollection('anti_flood')
    }
  }

  async checkIfIsFlood (contactId: string): Promise<boolean> {
    const timeNow = Date.now() - 60000
    // insere o novo registro
    this._collection.insert({ contactId: contactId })
    // apaga os registros com mais de 1 min
    this._collection.removeWhere({
      meta: {
        $where: (value: { created: number }) => {
          return value.created < timeNow
        }
      }
    })
    // pega os registros desse contato
    const result = this._collection.find({ contactId: contactId })
    // verifica se esta floodando
    return result.length > this._msgPerMinute
  }
}
