import { SaveGhostDataDatasource } from '../data/datasources/save-ghost-data-datasource'
import { GhostData } from '../domain/models/ghost-data'
import * as fs from 'fs'
import path from 'path'

export class SaveGhostDataFileDatasource implements SaveGhostDataDatasource {
  async save (data: GhostData): Promise<void> {
    fs.writeFileSync(path.join(__dirname, '/../../database-files/ghost-data.json'), JSON.stringify(data), { encoding: 'utf-8' })
  }
}
