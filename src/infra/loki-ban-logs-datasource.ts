import { BanLogsDatasource } from '../data/datasources/ban-logs-datasource'
import loki from 'lokijs'
import { BanLogData } from '../domain/models/ban-log-data'

export class LokiBanLogsDatasource implements BanLogsDatasource {
  constructor (private readonly db: loki) {}

  async registryBan (contactId: string, log: string): Promise<void> {
    let collection = this.db.getCollection<BanLogData>('ban_logs')
    if (collection === null) {
      collection = this.db.addCollection<BanLogData>('ban_logs')
    }
    collection.insert({ contactId: contactId, log: log })
  }

  async getBanLog (contactId: string): Promise<BanLogData[] > {
    const collection = this.db.getCollection<BanLogData>('ban_logs')
    if (collection === null) {
      return []
    } else {
      return collection.find({ contactId: contactId }).map((result) => { return { contactId: result.contactId, log: result.log, date: (new Date(result.meta.created)).toUTCString() } })
    }
  }
}
