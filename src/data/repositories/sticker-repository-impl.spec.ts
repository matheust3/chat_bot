
import { StickerRepositoryImpl } from './sticker-repository-impl'
import { CreateStaticStickerDatasource } from '../datasources/create-static-sticker-datasource'
import { CreateAnimatedStickerDatasource } from '../datasources/create-animated-sticker-datasource'
import { mock } from 'jest-mock-extended'
import fs from 'fs'
import { CheckDataTypeDatasource } from '../datasources/check-data-type-datasource'
import { Sticker } from '../../domain/models/sticker'
import path from 'path'

interface SutTipes{
  stickerRepositoryImpl: StickerRepositoryImpl
  createStaticStickerDatasource: CreateStaticStickerDatasource
  createAnimatedStickerDatasource: CreateAnimatedStickerDatasource
  checkDataTypeDatasource: CheckDataTypeDatasource
}

const makeSut = (): SutTipes => {
  const createStaticStickerDatasource = mock<CreateStaticStickerDatasource>()
  const checkDataTypeDatasource = mock<CheckDataTypeDatasource>()
  const createAnimatedStickerDatasource = mock<CreateAnimatedStickerDatasource>()

  const stickerRepositoryImpl = new StickerRepositoryImpl(createStaticStickerDatasource, checkDataTypeDatasource, createAnimatedStickerDatasource)

  return { stickerRepositoryImpl, createStaticStickerDatasource, checkDataTypeDatasource, createAnimatedStickerDatasource }
}

describe('StickerRepositoryImpl --> static sticker', () => {
  test('ensure call createSticker from CreateStaticStickerDatasource if data is a static image', async () => {
    //! Arrange
    const { createStaticStickerDatasource, stickerRepositoryImpl, checkDataTypeDatasource } = makeSut()
    const pngBuffer = fs.readFileSync(path.join(__dirname, '/../../../fixtures/png.png'))
    const base64File = pngBuffer.toString('base64')
    jest.spyOn(createStaticStickerDatasource, 'createSticker')
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('staticSticker')))
    //! Act
    await stickerRepositoryImpl.createSticker(base64File)
    //! Assert
    expect(checkDataTypeDatasource.fromBuffer).toHaveBeenCalledWith(pngBuffer)
    expect(createStaticStickerDatasource.createSticker).toHaveBeenCalledWith(pngBuffer)
  })

  test('ensure not call createSticker from CreateStaticStickerDatasource if not is a static image', async () => {
    //! Arrange
    const { createStaticStickerDatasource, stickerRepositoryImpl, checkDataTypeDatasource } = makeSut()
    const pngBuffer = fs.readFileSync(path.join(__dirname, '/../../../fixtures/png.png'))
    const base64File = pngBuffer.toString('base64')
    jest.spyOn(createStaticStickerDatasource, 'createSticker')
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('invalidSticker')))
    //! Act
    await stickerRepositoryImpl.createSticker(base64File)
    //! Assert
    expect(checkDataTypeDatasource.fromBuffer).toHaveBeenCalledWith(pngBuffer)
    expect(createStaticStickerDatasource.createSticker).toHaveBeenCalledTimes(0)
  })

  test('ensure return static sticker if sticker is valid', async () => {
  //! Arrange
    const { createStaticStickerDatasource, stickerRepositoryImpl, checkDataTypeDatasource } = makeSut()
    const pngBuffer = fs.readFileSync(path.join(__dirname, '/../../../fixtures/png.png'))
    const base64File = pngBuffer.toString('base64')
    jest.spyOn(createStaticStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve('path to image')))
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('staticSticker')))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(base64File)
    //! Assert
    expect(result).toEqual({ path: 'path to image', type: 'static', valid: true } as Sticker)
  })
  test('ensure return not valid sticker if sticker is not valid', async () => {
  //! Arrange
    const { createStaticStickerDatasource, stickerRepositoryImpl, checkDataTypeDatasource } = makeSut()
    const pngBuffer = fs.readFileSync(path.join(__dirname, '/../../../fixtures/png.png'))
    const base64File = pngBuffer.toString('base64')
    jest.spyOn(createStaticStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve(null)))
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('staticSticker')))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(base64File)
    //! Assert
    expect(result).toEqual({ path: '', type: 'static', valid: false } as Sticker)
  })
  test('ensure return invalid sticker if dataType is invalidSticker', async () => {
  //! Arrange
    const { createStaticStickerDatasource, stickerRepositoryImpl, checkDataTypeDatasource } = makeSut()
    const pngBuffer = fs.readFileSync(path.join(__dirname, '/../../../fixtures/png.png'))
    const base64File = pngBuffer.toString('base64')
    jest.spyOn(createStaticStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve(null)))
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('invalidSticker')))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(base64File)
    //! Assert
    expect(result).toEqual({ path: '', type: 'static', valid: false } as Sticker)
  })
})

describe('StickerRepositoryImpl --> animated sticker', () => {
  test('ensure call CreateAnimatedSticker with correct params', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createAnimatedStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('stickerAnimated')))
    //! Act
    await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'))
    //! Assert
    expect(createAnimatedStickerDatasource.createSticker).toHaveBeenCalledWith(Buffer.from('any buffer'))
  })
  test('ensure return path to sticker if sticker is valid', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createAnimatedStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('stickerAnimated')))
    jest.spyOn(createAnimatedStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve('path to sticker')))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'))
    //! Assert
    expect(result).toEqual({ path: 'path to sticker', type: 'animated', valid: true } as Sticker)
  })
  test('ensure return invalid sticker if datasource return null', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createAnimatedStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('stickerAnimated')))
    jest.spyOn(createAnimatedStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve(null)))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'))
    //! Assert
    expect(result).toEqual({ path: '', type: 'animated', valid: false } as Sticker)
  })
})
