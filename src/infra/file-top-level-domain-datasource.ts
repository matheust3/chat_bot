import path from 'path'
import { ITopLevelDomainDatasource } from '../data/datasources/top-level-domain-datasource'
import fs from 'fs'

export class FileTopLevelDomainDatasource implements ITopLevelDomainDatasource {
  readonly topLevelDomains: string[]

  constructor (filePath: string) {
    // Lê o arquivo com a lista de domínios de primeiro nível
    const file = fs.readFileSync(path.join(__dirname, filePath))
    // Converte o arquivo em uma lista de domínios
    this.topLevelDomains = file.toString().toLocaleLowerCase().split('\n')
  }

  async getTopLevelDomains (): Promise<string[]> {
    return this.topLevelDomains
  }
}
