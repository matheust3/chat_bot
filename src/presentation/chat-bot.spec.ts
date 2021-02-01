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
  responseMessage: WhatsMessage
  fileBuffer: Buffer
  stickerRepository: StickerRepository
}

const makeSut = (): SutTypes => {
  const stickerRepository = mock<StickerRepository>()
  const whatsApp = mock<Whatsapp>()
  const message: WhatsMessage = JSON.parse(fs.readFileSync(`${__dirname}/../../fixtures/message-sticker-model.json`, 'utf8'))
  const responseMessage: WhatsMessage = JSON.parse(fs.readFileSync(`${__dirname}/../../fixtures/sticker-response-model.json`, 'utf8'))
  const fileBuffer = Buffer.from('file')
  jest.spyOn(stickerRepository, 'createSticker')
  jest.spyOn(whatsApp, 'decryptFile').mockReturnValue(new Promise(resolve => resolve(fileBuffer)))

  const chatBot = new ChatBot(whatsApp, stickerRepository)

  return { whatsApp, message, responseMessage, stickerRepository, chatBot, fileBuffer }
}

describe('ChatBot', () => {
  test('ensure remove case sensitive from captions', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot, fileBuffer } = makeSut()
    message.caption = '#sTicKer'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(fileBuffer.toString('base64'))
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
  test('ensure call sticker repository to create a sticker if body is #sticker and quotedMsgObj != null', async () => {
    //! Arrange
    const { responseMessage, stickerRepository, chatBot, fileBuffer } = makeSut()
    responseMessage.caption = undefined
    //! Act
    await chatBot.onAnyMessage(responseMessage)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(fileBuffer.toString('base64'))
  })
  test('ensure call sticker repository to create a sticker if caption is #sticker', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot, fileBuffer } = makeSut()
    message.caption = '#sticker'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(fileBuffer.toString('base64'))
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
    jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ path: 'path to image', type: 'animated', valid: true })))
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(whatsApp.sendImageAsStickerGif).toHaveBeenCalledWith(message.chatId, 'path to image')
  })
  test('ensure send static sticker if sticker is valid and is static', async () => {
    //! Arrange
    const { message, chatBot, whatsApp, stickerRepository } = makeSut()
    jest.spyOn(whatsApp, 'sendImageAsSticker')
    jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ path: 'path to image', type: 'static', valid: true })))
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(whatsApp.sendImageAsSticker).toHaveBeenCalledWith(message.chatId, 'path to image')
  })
  test('ensure send a message if sticker is invalid', async () => {
    //! Arrange
    const { message, chatBot, whatsApp, stickerRepository } = makeSut()
    jest.spyOn(whatsApp, 'sendImageAsSticker')
    jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ path: 'path to image', type: 'static', valid: false })))
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(whatsApp.sendText).toHaveBeenCalledWith(message.chatId, '😣 Não foi possível criar sua figurinha 😭')
  })
  test('ensure send a message decryptMessage throws', async () => {
    //! Arrange
    const { message, chatBot, whatsApp } = makeSut()
    jest.spyOn(whatsApp, 'decryptFile').mockReturnValue(new Promise((resolve, reject) => reject(Error('message is missing critical data needed to download the file'))))
    const wAppMock = jest.spyOn(whatsApp, 'sendText')
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(wAppMock.mock.calls).toEqual([
      [message.chatId, 'Nao consegui baixar a imagem pra fazer a figurinha 😪😪'],
      [message.chatId, 'Manda de novo! 🥺🥺']
    ])
  })
  test('ensure send a message decryptMessage throws', async () => {
    //! Arrange
    const { message, chatBot, whatsApp } = makeSut()
    const e = Error('any error test')
    jest.spyOn(global.console, 'error')
    jest.spyOn(whatsApp, 'decryptFile').mockReturnValue(new Promise((resolve, reject) => reject(e)))
    const wAppMock = jest.spyOn(whatsApp, 'sendText')
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(console.error).toHaveBeenCalledWith(e)
    expect(wAppMock.mock.calls).toEqual([
      [message.chatId, 'Nao consegui fazer sua figurinha 😓😓']
    ])
  })
})
