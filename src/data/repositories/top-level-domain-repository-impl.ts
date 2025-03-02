import { ITopLevelDomainRepository } from '../../domain/repositories/top-level-domain-repository'
import { ITopLevelDomainDatasource } from '../datasources/top-level-domain-datasource'

export class TopLevelDomainRepositoryImpl implements ITopLevelDomainRepository {
  constructor (private readonly db: ITopLevelDomainDatasource) {}

  async getTopLevelDomains (): Promise<string[]> {
    const result = await this.db.getTopLevelDomains()
    return result
  }
}
