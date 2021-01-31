
import { StickerRepositoryImpl } from './sticker-repository-impl'
import { CreateStaticStickerDatasource } from '../datasources/create-static-sticker-datasource'
import { mock } from 'jest-mock-extended'
import fs from 'fs'
import { CheckDataTypeDatasource } from '../datasources/check-data-type-datasource'
import { Sticker } from '../../domain/models/sticker'

interface SutTipes{
  stickerRepositoryImpl: StickerRepositoryImpl
  createStaticStickerDatasource: CreateStaticStickerDatasource
  checkDataTypeDatasource: CheckDataTypeDatasource
}

const makeSut = (): SutTipes => {
  const createStaticStickerDatasource = mock<CreateStaticStickerDatasource>()
  const checkDataTypeDatasource = mock< CheckDataTypeDatasource>()

  const stickerRepositoryImpl = new StickerRepositoryImpl(createStaticStickerDatasource, checkDataTypeDatasource)

  return { stickerRepositoryImpl, createStaticStickerDatasource, checkDataTypeDatasource }
}

describe('StickerRepositoryImpl --> static sticker', () => {
  test('ensure call createSticker from CreateStaticStickerDatasource if data is a static image', async () => {
    //! Arrange
    const { createStaticStickerDatasource, stickerRepositoryImpl, checkDataTypeDatasource } = makeSut()
    const pngBuffer = fs.readFileSync(`${__dirname}/../../../fixtures/png.png`)
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
    const pngBuffer = fs.readFileSync(`${__dirname}/../../../fixtures/png.png`)
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
    const pngBuffer = fs.readFileSync(`${__dirname}/../../../fixtures/png.png`)
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
    const pngBuffer = fs.readFileSync(`${__dirname}/../../../fixtures/png.png`)
    const base64File = pngBuffer.toString('base64')
    jest.spyOn(createStaticStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve(null)))
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('staticSticker')))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(base64File)
    //! Assert
    expect(result).toEqual({ path: null, type: 'static', valid: false } as Sticker)
  })
  test('ensure return invalid sticker if dataType is invalidSticker', async () => {
  //! Arrange
    const { createStaticStickerDatasource, stickerRepositoryImpl, checkDataTypeDatasource } = makeSut()
    const pngBuffer = fs.readFileSync(`${__dirname}/../../../fixtures/png.png`)
    const base64File = pngBuffer.toString('base64')
    jest.spyOn(createStaticStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve(null)))
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('invalidSticker')))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(base64File)
    //! Assert
    expect(result).toEqual({ path: null, type: 'static', valid: false } as Sticker)
  })
})
