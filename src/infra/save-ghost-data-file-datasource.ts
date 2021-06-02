import { SaveGhostDataDatasource } from '../data/datasources/save-ghost-data-datasource'
import { GhostData } from '../domain/models/ghost-data'
import * as fs from 'fs'

export class SaveGhostDataFileDatasource implements SaveGhostDataDatasource {
  async save (data: GhostData): Promise<void> {
    fs.writeFileSync(`${__dirname}/../../database-files/ghost-data.json`, JSON.stringify(data), { encoding: 'utf-8' })
  }
}
