import { ITopLevelDomainRepository } from '../../domain/repositories/top-level-domain-repository'
import { TopLevelDomainRepositoryImpl } from '../../data/repositories/top-level-domain-repository-impl'
import { FileTopLevelDomainDatasource } from '../../infra/file-top-level-domain-datasource'
import path from 'path'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class Singleton {
  private static instance: ITopLevelDomainRepository

  constructor () {
    if (Singleton.instance === undefined) {
      const datasource = new FileTopLevelDomainDatasource(path.join(__dirname, '../../assets/top-level-domains.txt'))
      Singleton.instance = new TopLevelDomainRepositoryImpl(datasource)
    }
    return Singleton.instance
  }

  static getInstance (): ITopLevelDomainRepository {
    if (Singleton.instance === undefined) {
      // eslint-disable-next-line no-new
      new Singleton()
    }
    return Singleton.instance
  }
}

export const FileLevelDomainRepositoryInstance = Singleton.getInstance()
