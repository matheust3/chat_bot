import { CreateStaticStickerDatasourceImpl } from './create-static-sticker-datasource-impl'
import fs from 'fs'

jest.mock('uuid', () => ({
  v4: (): string => 'uId'
}))

interface SutTypes{
  datasource: CreateStaticStickerDatasourceImpl
}

const makeSut = (): SutTypes => {
  const datasource = new CreateStaticStickerDatasourceImpl()
  return { datasource }
}

jest.mock('fs')
const execFunc = jest.fn().mockResolvedValue({ stdout: 'ok' })
jest.mock('util', () => ({
  promisify: jest.fn(() => {
    return execFunc
  })
}))

describe('CreateStaticStickerDatasourceImpl', () => {
  test('ensure check if cache exists', async () => {
    //! Arrange
    const { datasource } = makeSut()
    //! Act
    await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(fs.existsSync).toHaveBeenCalledWith(`${__dirname}/../cache`)
  })
  test('ensure create cache folder if not exists', async () => {
    //! Arrange
    const { datasource } = makeSut()
    jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    jest.spyOn(fs, 'mkdirSync')
    //! Act
    await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(fs.mkdirSync).toHaveBeenCalledWith(`${__dirname}/../cache`)
  })
  test('ensure save file in cache folder to convert to png image', async () => {
    //! Arrange
    const { datasource } = makeSut()
    const buffer = Buffer.from('any buffer')
    //! Act
    await datasource.createSticker(buffer)
    //! Assert
    expect(fs.writeFileSync).toHaveBeenCalledWith(`${__dirname}/../cache/uId`, buffer)
  })
  test('ensure convert file to png', async () => {
    //! Arrange
    const { datasource } = makeSut()
    //! Act
    await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(execFunc).toHaveBeenCalledWith(`mogrify -format png ${__dirname}/../cache/uId`)
  })
  test('ensure return new file buffer', async () => {
    //! Arrange
    const { datasource } = makeSut()
    jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('new buffer'))
    //! Act
    const result = await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(fs.readFileSync).toHaveBeenCalledWith(`${__dirname}/../cache/uId.png`)
    expect(result).toEqual(Buffer.from('new buffer'))
  })
})
