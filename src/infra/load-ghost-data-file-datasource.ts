import { LoadGhostDataDatasource } from '../data/datasources/load-ghost-data-datasource'
import { GhostData } from '../domain/models/ghost-data'
import * as fs from 'fs'

export class LoadGhostDataFileDatasource implements LoadGhostDataDatasource {
  async load (): Promise<GhostData> {
    if (fs.existsSync(`${__dirname}/../../database-files/ghost-data.json`)) {
      return JSON.parse(fs.readFileSync(`${__dirname}/../../database-files/ghost-data.json`, { encoding: 'utf-8' }))
    } else {
      return { contacts: [] }
    }
  }
}
