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
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '{"streams":[{"width": 1920,"height": 1080}]}', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: '' })
    //! Act
    await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(fs.existsSync).toHaveBeenCalledWith(`${__dirname}/../cache`)
  })
  test('ensure create cache folder if not exists', async () => {
    //! Arrange
    const { datasource } = makeSut()
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '{"streams":[{"width": 1920,"height": 1080}]}', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: '' })
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
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '{"streams":[{"width": 1920,"height": 1080}]}', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: '' })
    const buffer = Buffer.from('any buffer')
    //! Act
    await datasource.createSticker(buffer)
    //! Assert
    expect(fs.writeFileSync).toHaveBeenCalledWith(`${__dirname}/../cache/uId`, buffer)
  })
  test('ensure convert file to a webp if width>height', async () => {
    //! Arrange
    const { datasource } = makeSut()
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '{"streams":[{"width": 1920,"height": 1080}]}', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: '' })
    //! Act
    await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(execFunc.mock.calls).toEqual([
      [`ffprobe -v quiet -print_format json -show_streams ${__dirname}/../cache/uId`],
      [`ffmpeg  -i ${__dirname}/../cache/uId -vf "crop=w=ih:h=ih:x=(iw/2)/2:y=(ih/2)/2,scale=128:128,fps=10" -loop 0 ${__dirname}/../cache/uId.webp -hide_banner -loglevel error`]
    ])
  })
  test('ensure convert file to a webp if width<height', async () => {
    //! Arrange
    const { datasource } = makeSut()
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '{"streams":[{"width": 1080,"height": 1920}]}', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: '' })
    //! Act
    await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(execFunc.mock.calls).toEqual([
      [`ffprobe -v quiet -print_format json -show_streams ${__dirname}/../cache/uId`],
      [`ffmpeg  -i ${__dirname}/../cache/uId -vf "crop=w=iw:h=iw:x=(iw/2)/2:y=(ih/2)/2,scale=128:128,fps=10" -loop 0 ${__dirname}/../cache/uId.webp -hide_banner -loglevel error`]
    ])
  })
  test('ensure return null if mediaData.streams[0] is null', async () => {
    //! Arrange
    const { datasource } = makeSut()
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '{"streams":[]}', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: '' })
    jest.spyOn(global.console, 'error')
    //! Act
    const result = await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(result).toEqual(null)
    expect(console.error).toHaveBeenCalledWith('media.streams.length === 0')
  })
  test('ensure convert file and invert height and width if tag rotate=90', async () => {
    //! Arrange
    const { datasource } = makeSut()
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '{"streams":[{"width": 1080,"height": 1920,"tags":{"rotate":"90"}}]}', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: '' })
    //! Act
    await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(execFunc.mock.calls).toEqual([
      [`ffprobe -v quiet -print_format json -show_streams ${__dirname}/../cache/uId`],
      [`ffmpeg  -i ${__dirname}/../cache/uId -vf "crop=w=ih:h=ih:x=(iw/2)/2:y=(ih/2)/2,scale=128:128,fps=10" -loop 0 ${__dirname}/../cache/uId.webp -hide_banner -loglevel error`]
    ])
  })
  test('ensure return path to new file', async () => {
    //! Arrange
    const { datasource } = makeSut()
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '{"streams":[{"width": 1920,"height": 1080}]}', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: '' })
    //! Act
    const result = await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(result).toEqual(`${__dirname}/../cache/uId.webp`)
  })
  test('ensure return null if stderr to get resolution', async () => {
    //! Arrange
    const { datasource } = makeSut()
    jest.spyOn(global.console, 'error')
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '', stderr: 'err' })
      .mockResolvedValue({ stdout: '', stderr: '' })
    //! Act
    const result = await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(console.error).toHaveBeenCalledWith('err')
    expect(result).toEqual(null)
  })
  test('ensure return null if stderr in convert file', async () => {
    //! Arrange
    const { datasource } = makeSut()
    jest.spyOn(global.console, 'error')
    execFunc.mockClear().mockResolvedValueOnce({ stdout: '{"streams":[{"width": 1920,"height": 1080}]}', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: 'err' })
    //! Act
    const result = await datasource.createSticker(Buffer.from('any buffer'))
    //! Assert
    expect(console.error).toHaveBeenCalledWith('err')
    expect(result).toEqual(null)
  })
})
