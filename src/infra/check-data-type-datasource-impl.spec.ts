
import { CheckDataTypeDatasource } from '../data/datasources/check-data-type-datasource'
import { CheckDataTypeDatasourceImpl } from './check-data-type-datasource-impl'
import fs from 'fs'
import { DataType } from '../domain/models/data-types'

interface SutTypes{
  datasource: CheckDataTypeDatasource
}

const makeSut = (): SutTypes => {
  const datasource = new CheckDataTypeDatasourceImpl()

  return { datasource }
}

describe('CheckDataTypeDatasourceImpl', () => {
  test('ensure return staticSticker if data is png', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const buffer = fs.readFileSync(`${__dirname}/../../fixtures/png.png`)
    //! Act
    const result = await datasource.fromBuffer(buffer)
    //! Assert
    expect(result).toBe('staticSticker' as DataType)
  })
  test('ensure return staticSticker if data is jpeg', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const buffer = fs.readFileSync(`${__dirname}/../../fixtures/jpeg.jpeg`)
    //! Act
    const result = await datasource.fromBuffer(buffer)
    //! Assert
    expect(result).toBe('staticSticker' as DataType)
  })
  test('ensure return staticSticker if data is jpg', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const buffer = fs.readFileSync(`${__dirname}/../../fixtures/jpg.jpg`)
    //! Act
    const result = await datasource.fromBuffer(buffer)
    //! Assert
    expect(result).toBe('staticSticker' as DataType)
  })
  test('ensure return animatedSticker if data is mp4', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const buffer = fs.readFileSync(`${__dirname}/../../fixtures/video.mp4`)
    //! Act
    const result = await datasource.fromBuffer(buffer)
    //! Assert
    expect(result).toBe('stickerAnimated' as DataType)
  })
  test('ensure return animatedSticker if data is gif', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const buffer = fs.readFileSync(`${__dirname}/../../fixtures/gif.gif`)
    //! Act
    const result = await datasource.fromBuffer(buffer)
    //! Assert
    expect(result).toBe('stickerAnimated' as DataType)
  })
  test('ensure return animatedSticker if data is webp', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const buffer = fs.readFileSync(`${__dirname}/../../fixtures/webp.webp`)
    //! Act
    const result = await datasource.fromBuffer(buffer)
    //! Assert
    expect(result).toBe('stickerAnimated' as DataType)
  })
  test('ensure return invalid if data is not a static image and not a animated/video', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const buffer = fs.readFileSync(`${__dirname}/../../fixtures/text.txt`)
    jest.spyOn(global.console, 'error')
    //! Act
    const result = await datasource.fromBuffer(buffer)
    //! Assert
    expect(result).toBe('invalidSticker' as DataType)
    expect(console.error).toHaveBeenCalledWith('Tipo de arquivo nao mapeado -> arquivo nao reconhecido')
  })
  test('ensure return invalid if data is not a static image and not a animated/video', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const buffer = fs.readFileSync(`${__dirname}/../../fixtures/pdf.pdf`)
    jest.spyOn(global.console, 'error')
    //! Act
    const result = await datasource.fromBuffer(buffer)
    //! Assert
    expect(result).toBe('invalidSticker' as DataType)
    expect(console.error).toHaveBeenCalledWith('Tipo de arquivo nao mapeado -> ', 'pdf')
  })
})
