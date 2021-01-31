import { mock } from 'jest-mock-extended'
import { Whatsapp } from 'venom-bot'
import { StickerRepository } from '../domain/repositories/sticker-repository'
import { WhatsMessage } from '../domain/models/whats-message'
import { ChatBot } from './chat-bot'
import fs from 'fs'

interface SutTypes{
  whatsApp: Whatsapp
  chatBot: ChatBot
  message: WhatsMessage
  stickerRepository: StickerRepository
}

const makeSut = (): SutTypes => {
  const stickerRepository = mock<StickerRepository>()
  const whatsApp = mock<Whatsapp>()
  const message: WhatsMessage = JSON.parse(fs.readFileSync(`${__dirname}/../../fixtures/message-sticker-model.json`, 'utf8'))

  jest.spyOn(stickerRepository, 'createSticker')

  const chatBot = new ChatBot(whatsApp, stickerRepository)

  return { whatsApp, message, stickerRepository, chatBot }
}

describe('ChatBot', () => {
  test('ensure remove case sensitive from captions', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot } = makeSut()
    message.caption = '#sTicKer'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(message.body)
  })
  test('ensure load a json message model', () => {
    //! Arrange
    const { message } = makeSut()
    //! Act
    //! Assert
    expect(message.from).toEqual('556596329031@c.us')
  })
})

describe('ChatBot -- #sticker', () => {
  test('ensure call sticker repository to create a sticker if caption is #sticker', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot } = makeSut()
    message.caption = '#sticker'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(message.body)
  })
  test('ensure not call sticker repository to create a sticker if caption not is #sticker', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot } = makeSut()
    message.caption = 'any value but not #sticker'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledTimes(0)
  })
  test('ensure not call sticker repository to create a sticker if caption is undefined', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot } = makeSut()
    message.caption = undefined
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledTimes(0)
  })

  test('ensure send animated sticker if sticker is valid and is animated', async () => {
    //! Arrange
    const { message, chatBot, whatsApp, stickerRepository } = makeSut()
    jest.spyOn(whatsApp, 'sendImageAsStickerGif')
    jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ data: 'any base64 data', type: 'animated', valid: true })))
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(whatsApp.sendImageAsStickerGif).toHaveBeenCalledWith(message.from, 'any base64 data')
  })
  test('ensure send static sticker if sticker is valid and is static', async () => {
    //! Arrange
    const { message, chatBot, whatsApp, stickerRepository } = makeSut()
    jest.spyOn(whatsApp, 'sendImageAsSticker')
    jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ data: 'any base64 data', type: 'static', valid: true })))
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(whatsApp.sendImageAsSticker).toHaveBeenCalledWith(message.from, 'any base64 data')
  })
  test('ensure send a message if sticker is invalid', async () => {
    //! Arrange
    const { message, chatBot, whatsApp, stickerRepository } = makeSut()
    jest.spyOn(whatsApp, 'sendImageAsSticker')
    jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ data: 'any base64 data', type: 'static', valid: false })))
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(whatsApp.sendText).toHaveBeenCalledWith(message.from, '😣 Não foi possível criar sua figurinha 😭')
  })
})
