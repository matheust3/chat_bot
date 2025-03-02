export interface ITopLevelDomainRepository {
  getTopLevelDomains: () => Promise<string[]>
}
