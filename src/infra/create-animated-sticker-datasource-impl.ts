/* eslint-disable n/no-path-concat */
import { CreateAnimatedStickerDatasource } from '../data/datasources/create-animated-sticker-datasource'
import fs from 'fs'
import { v4 } from 'uuid'
import { promisify } from 'util'
import child_process from 'child_process'
import path from 'path'

export class CreateAnimatedStickerDatasourceImpl implements CreateAnimatedStickerDatasource {
  async createSticker (data: Buffer): Promise<string | null> {
    /* istanbul ignore else */
    if (!fs.existsSync(path.join(__dirname, '/../cache'))) {
      fs.mkdirSync(path.join(__dirname, '/../cache'))
    }
    const uuid = v4()
    fs.writeFileSync(path.join(__dirname, '/../cache', uuid), data)

    const exec = promisify(child_process.exec)
    const { stdout, stderr } = await exec(`ffprobe -v quiet -print_format json -show_entries stream=tags -show_streams ${__dirname}/../cache/${uuid}`)
    if (stderr === '') {
      const mediaData = JSON.parse(stdout)
      let height: number
      let width: number
      if (mediaData.streams.length > 0) {
        const stream = mediaData.streams.find((value: { codec_type: string }) => (value.codec_type).includes('video'))
        height = stream.height
        width = stream.width
        if (stream.tags?.rotate !== undefined && (Math.abs(stream.tags.rotate) === 90 || Math.abs(stream.tags.rotate) === 270)) {
          height = stream.width
          width = stream.height
        } else if (stream.side_data_list !== undefined) {
          const sideData = stream.side_data_list.find((value: { rotation: number }) => value.rotation !== undefined)
          if (sideData !== undefined) {
            if (Math.abs(sideData.rotation) === 90 || Math.abs(sideData.rotation) === 270) {
              height = stream.width
              width = stream.height
            }
          }
        }
      } else {
        console.error('media.streams.length === 0')
        return null
      }
      const cropSize = Math.min(width, height)
      const offsetX = (width - cropSize) / 2
      const offsetY = (height - cropSize) / 2
      const command = `ffmpeg  -i ${__dirname}/../cache/${uuid} -vf "crop=${cropSize}:${cropSize}:${offsetX}:${offsetY},scale=512:512,fps=10" -loop 0 ${__dirname}/../cache/${uuid}.webp -hide_banner -loglevel error`
      const { stderr } = await exec(command)
      const err = stderr
      if (err !== '') {
        console.error(err)
        return null
      } else {
        return path.join(__dirname, '/../cache/', `${uuid}.webp`)
      }
    } else {
      console.error(stderr)
      return null
    }
  }
}
