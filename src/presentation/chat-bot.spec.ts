import { mock } from 'jest-mock-extended'
import { Message, Whatsapp } from 'venom-bot'
import fs from 'fs'

interface SutTypes{
  whatsApp: Whatsapp
  message: Message
}

const makeSut = (): SutTypes => {
  const whatsApp = mock<Whatsapp>()
  const message = JSON.parse(fs.readFileSync('../../fixtures/message-sticker-model.json', 'utf8'))

  return { whatsApp, message }
}
