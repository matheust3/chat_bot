import { mock, MockProxy } from 'jest-mock-extended'
import command from '../commands/__integration-command'
import { ICommand, IMessage } from '../protocols'
import commands from './commands'

interface SutTypes {
  sut: ICommand
  message: MockProxy<IMessage> & IMessage
}

const makeSut = (): SutTypes => {
  const message = mock<IMessage>({ body: '__integration-command' })
  const sut: ICommand = command
  return {
    sut,
    message
  }
}

describe('commands.test.ts - commands', () => {
  let sut: SutTypes['sut']
  let message: SutTypes['message']

  beforeEach(() => {
    ({ sut, message } = makeSut())
  })

  test('ensure load integration command', async () => {
    //! Arrange
    //! Act
    const cmds = await commands()
    //! Assert
    expect(cmds[0]).toEqual(sut)
  })

  test('ensure edit message', async () => {
    //! Arrange
    //! Act
    await sut(message)
    //! Assert
    expect(message.body).toBe('edited')
  })
})
