
import { StickerRepositoryImpl } from './sticker-repository-impl'
import { CreateStaticStickerDatasource } from '../datasources/create-static-sticker-datasource'
import { CreateAnimatedStickerDatasource } from '../datasources/create-animated-sticker-datasource'
import { mock } from 'jest-mock-extended'
import { CheckDataTypeDatasource } from '../datasources/check-data-type-datasource'
import { Sticker } from '../../domain/models/sticker'

interface SutTipes {
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
  test('ensure call CreateStaticSticker with correct params', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createStaticStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('staticSticker')))
    //! Act
    await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'), false)
    //! Assert
    expect(createStaticStickerDatasource.createSticker).toHaveBeenCalledWith(Buffer.from('any buffer'), false)
  })

  test('ensure call CreateStaticSticker with resize parameter', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createStaticStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('staticSticker')))
    //! Act
    await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'), true)
    //! Assert
    expect(createStaticStickerDatasource.createSticker).toHaveBeenCalledWith(Buffer.from('any buffer'), true)
  })

  test('ensure return path to sticker if sticker is valid', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createStaticStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('staticSticker')))
    jest.spyOn(createStaticStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve('path to sticker')))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'), false)
    //! Assert
    const expected: Sticker = { path: 'path to sticker', type: 'static', valid: true }
    expect(result).toEqual(expected)
  })

  test('ensure return invalid sticker if datasource return null', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createStaticStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('staticSticker')))
    jest.spyOn(createStaticStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve(null)))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'), false)
    //! Assert
    const expected: Sticker = { path: '', type: 'static', valid: false }
    expect(result).toEqual(expected)
  })
})

describe('StickerRepositoryImpl --> animated sticker', () => {
  test('ensure call CreateAnimatedSticker with correct params', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createAnimatedStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('stickerAnimated')))
    //! Act
    await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'), false)
    //! Assert
    expect(createAnimatedStickerDatasource.createSticker).toHaveBeenCalledWith(Buffer.from('any buffer'), false)
  })
  test('ensure return path to sticker if sticker is valid', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createAnimatedStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('stickerAnimated')))
    jest.spyOn(createAnimatedStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve('path to sticker')))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'), false)
    //! Assert
    const expected: Sticker = { path: 'path to sticker', type: 'animated', valid: true }
    expect(result).toEqual(expected)
  })
  test('ensure return invalid sticker if datasource return null', async () => {
    //! Arrange
    const { stickerRepositoryImpl, createAnimatedStickerDatasource, checkDataTypeDatasource } = makeSut()
    jest.spyOn(checkDataTypeDatasource, 'fromBuffer').mockReturnValue(new Promise(resolve => resolve('stickerAnimated')))
    jest.spyOn(createAnimatedStickerDatasource, 'createSticker').mockReturnValue(new Promise(resolve => resolve(null)))
    //! Act
    const result = await stickerRepositoryImpl.createSticker(Buffer.from('any buffer').toString('base64'), false)
    //! Assert
    const expected: Sticker = { path: '', type: 'animated', valid: false }
    expect(result).toEqual(expected)
  })
})
