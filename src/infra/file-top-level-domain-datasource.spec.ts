import { FileTopLevelDomainDatasource } from './file-top-level-domain-datasource'

describe('file-top-level-domain-datasource.spec.ts - getTopLevelDomains', () => {
  let fileTopLevelDomainDatasource: FileTopLevelDomainDatasource

  beforeEach(() => {
    fileTopLevelDomainDatasource = new FileTopLevelDomainDatasource('../../assets/top-level-domains.txt')
  })

  test('ensure return array witch tld', async () => {
    //! Arrange
    //! Act
    const result = await fileTopLevelDomainDatasource.getTopLevelDomains()
    //! Assert
    expect(result).toContain('com')
    expect(result).toContain('org')
    expect(result).toContain('net')
  })

  test('ensure not contains space in the end and start of tld', async () => {
    //! Arrange
    //! Act
    const result = await fileTopLevelDomainDatasource.getTopLevelDomains()
    //! Assert
    expect(result).not.toContain('com ')
    expect(result).not.toContain('org ')
    expect(result).not.toContain('net ')
    expect(result).not.toContain(' com')
    expect(result).not.toContain(' org')
    expect(result).not.toContain(' net')
  })
})
