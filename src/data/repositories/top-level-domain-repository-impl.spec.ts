import { ITopLevelDomainDatasource } from '../datasources/top-level-domain-datasource'
import { TopLevelDomainRepositoryImpl } from './top-level-domain-repository-impl'
import { mock, MockProxy } from 'jest-mock-extended'

describe('top-level-domain-repository-impl.spec.ts - getTopLevelDomains', () => {
  let sut: TopLevelDomainRepositoryImpl
  let db: MockProxy<ITopLevelDomainDatasource>

  beforeAll(() => {
    db = mock<ITopLevelDomainDatasource>()
    db.getTopLevelDomains.mockResolvedValue(['com', 'org', 'net'])
    sut = new TopLevelDomainRepositoryImpl(db)
  })

  test('ensure call datasource correctly', async () => {
    //! Arrange
    //! Act
    const result = await sut.getTopLevelDomains()
    //! Assert
    expect(result).toEqual(['com', 'org', 'net'])
    expect(db.getTopLevelDomains).toHaveBeenCalledTimes(1)
  })
})
