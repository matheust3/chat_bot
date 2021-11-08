import { mock, MockProxy } from 'jest-mock-extended'
import { Contact, Message } from 'whatsapp-web.js'
import { AntiFloodDatasource } from '../datasources/anti-flood-datasource'
import { AntiSpamRepositoryImpl } from './anti-spam-repository-impl'

let antiFloodDatasource: MockProxy<AntiFloodDatasource> &AntiFloodDatasource
let repository: AntiSpamRepositoryImpl
let message: MockProxy<Message> & Message
let contact: MockProxy<Contact> & Contact

describe('anti-spam-repository-impl.spec.ts - checkMessage', () => {
  beforeEach(() => {
    antiFloodDatasource = mock<AntiFloodDatasource>()
    message = mock<Message>()
    contact = mock<Contact>()

    antiFloodDatasource.checkIfIsFlood.mockResolvedValue(false)

    contact.id._serialized = 'contact'
    message.getContact.mockResolvedValue(contact)

    repository = new AntiSpamRepositoryImpl(antiFloodDatasource)
  })

  test('ensure check if is flood', async () => {
    //! Arrange
    //! Act
    await repository.checkMessage(message)
    //! Assert
    expect(antiFloodDatasource.checkIfIsFlood).toHaveBeenCalledWith(contact.id._serialized)
  })

  test('ensure return true if antiFlood returns true', async () => {
    //! Arrange
    antiFloodDatasource.checkIfIsFlood.mockResolvedValue(true)
    //! Act
    const result = await repository.checkMessage(message)
    //! Assert
    expect(result).toBe(true)
  })

  test('ensure return false by default', async () => {
    //! Arrange
    //! Act
    const result = await repository.checkMessage(message)
    //! Assert
    expect(result).toBe(false)
  })
})
