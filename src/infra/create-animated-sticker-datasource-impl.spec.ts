import fs from 'fs'
import { CreateAnimatedStickerDatasourceImpl } from './create-animated-sticker-datasource-impl'

jest.mock('uuid', () => ({
  v4: (): string => 'uId'
}))

interface SutTypes{
  datasource: CreateAnimatedStickerDatasourceImpl
}

const makeSut = (): SutTypes => {
  const datasource = new CreateAnimatedStickerDatasourceImpl()
  return { datasource }
}

jest.mock('fs')
const execFunc = jest.fn().mockResolvedValue({ stdout: 'ok', stderr: '' })
jest.mock('util', () => ({
  promisify: jest.fn(() => {
    return execFunc
  })
}))

describe('CreateAnimatedStickerDatasourceImpl', () => {
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
  test('ensure convert file to a gif', async () => {
    //! Arrange
    const { datasource } = makeSut()
    //! Act
    await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(execFunc).toHaveBeenCalledWith(`ffmpeg  -i ${__dirname}/../cache/uId -vf "fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 ${__dirname}/../cache/uId.gif -hide_banner -loglevel error`)
  })
  test('ensure return path to new file', async () => {
    //! Arrange
    const { datasource } = makeSut()
    //! Act
    const result = await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(result).toEqual(`${__dirname}/../cache/uId.gif`)
  })
  test('ensure return null if stderr', async () => {
    //! Arrange
    const { datasource } = makeSut()
    jest.spyOn(global.console, 'error')
    execFunc.mockResolvedValue({ stdout: '', stderr: 'err' })
    //! Act
    const result = await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(console.error).toHaveBeenCalledWith('err')
    expect(result).toEqual(null)
  })
})
