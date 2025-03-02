export interface ITopLevelDomainDatasource {
  getTopLevelDomains: () => Promise<string[]>
}
