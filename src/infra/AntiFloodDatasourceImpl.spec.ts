import { AntiFloodDatasourceImpl } from './AntiFloodDatasourceImpl'

interface SutTypes {
  sut: AntiFloodDatasourceImpl
}

const makeSut = (): SutTypes => {
  const sut = new AntiFloodDatasourceImpl(2)
  return { sut }
}

describe('AntiFloodDatasourceImpl.spec.ts', () => {
  afterAll(() => {
    jest.clearAllMocks()
  })

  test('ensure check if work', async () => {
    //! Arrange
    const { sut } = makeSut()
    //! Act
    const result = await sut.checkIfIsFlood('contactId')
    const result1 = await sut.checkIfIsFlood('contactId')
    const result2 = await sut.checkIfIsFlood('contactId')
    //! Assert
    expect(result).toBeFalsy()
    expect(result1).toBeFalsy()
    expect(result2).toBeTruthy()
  })

  test('ensure checkIfIsFlood returns false when user is not in floodMap', async () => {
    //! Arrange
    const { sut } = makeSut()
    const contactId = 'contactId'
    //! Act
    const result = await sut.checkIfIsFlood(contactId)
    //! Assert
    expect(result).toBeFalsy()
  })

  test('ensure not create false positive', async () => {
    //! Arrange
    const { sut } = makeSut()
    const now = Date.now()
    jest.spyOn(global.Date, 'now').mockImplementation(() => now)
    //! Act
    const result = await sut.checkIfIsFlood('contactId')
    jest.spyOn(global.Date, 'now').mockImplementation(() => now + 60000)
    const result1 = await sut.checkIfIsFlood('contactId')
    jest.spyOn(global.Date, 'now').mockImplementation(() => now + 120000)
    const result2 = await sut.checkIfIsFlood('contactId')
    jest.spyOn(global.Date, 'now').mockImplementation(() => now + 180000)
    const result3 = await sut.checkIfIsFlood('contactId')
    //! Assert
    expect(result).toBeFalsy()
    expect(result1).toBeFalsy()
    expect(result2).toBeFalsy()
    expect(result3).toBeFalsy()
  })
  test('ensure checkIfIsFlood returns true when number of eligible messages exceeds limit', async () => {
    //! Arrange
    const { sut } = makeSut()
    const contactId = 'contactId'
    const currentTime = Date.now()
    // @ts-expect-error - Acessando variável privada
    const messageTimes = Array.from({ length: sut._msgPerMinute }, (_, index) => currentTime - index * 1000)
    // @ts-expect-error - Acessando variável privada
    sut._floodMap.set(contactId, messageTimes)
    //! Act
    const result = await sut.checkIfIsFlood(contactId)
    //! Assert
    expect(result).toBeTruthy()
  })
  test('ensure checkIfIsFlood returns false when number of eligible messages does not exceed limit', async () => {
    //! Arrange
    const { sut } = makeSut()
    const contactId = 'contactId'
    const currentTime = Date.now()
    // @ts-expect-error - Acessando variável privada
    const messageTimes = Array.from({ length: sut._msgPerMinute - 1 }, (_, index) => currentTime - index * 1000)
    // @ts-expect-error - Acessando variável privada
    sut._floodMap.set(contactId, messageTimes)
    //! Act
    const result = await sut.checkIfIsFlood(contactId)
    //! Assert
    expect(result).toBeFalsy()
  })
  test('ensure checkIfIsFlood removes oldest records when number of records exceeds maximum', async () => {
    //! Arrange
    const { sut } = makeSut()
    const contactId = 'contactId'
    const currentTime = Date.now()
    // @ts-expect-error - Acessando variável privada
    const messageTimes = Array.from({ length: sut._maxRecords + 1 }, (_, index) => currentTime - index * 60000)
    // @ts-expect-error - Acessando variável privada
    sut._floodMap.set(contactId, messageTimes)
    //! Act
    await sut.checkIfIsFlood(contactId)
    //! Assert
    // @ts-expect-error - Acessando variável privada
    expect(sut._floodMap.get(contactId)?.length).toBe(sut._maxRecords)
  })
})
