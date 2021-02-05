import { CreateAnimatedStickerDatasource } from '../data/datasources/create-animated-sticker-datasource'
import fs from 'fs'
import { v4 } from 'uuid'
import { promisify } from 'util'
import child_process from 'child_process'

export class CreateAnimatedStickerDatasourceImpl implements CreateAnimatedStickerDatasource {
  async createSticker (data: Buffer): Promise<string> {
    /* istanbul ignore else */
    if (!fs.existsSync(`${__dirname}/../cache`)) {
      fs.mkdirSync(`${__dirname}/../cache`)
    }
    const uuid = v4()
    fs.writeFileSync(`${__dirname}/../cache/${uuid}`, data)

    const exec = promisify(child_process.exec)
    const { stdout, stderr } = await exec(`ffprobe -v quiet -print_format json -show_streams ${__dirname}/../cache/${uuid}`)
    if (stderr === '') {
      const mediaData = JSON.parse(stdout)
      let height = mediaData.streams[0].height
      let width = mediaData.streams[0].width
      if (mediaData.streams[0]?.tags?.rotate !== undefined && Math.abs(mediaData.streams[0].tags.rotate) === 90) {
        height = mediaData.streams[0].width
        width = mediaData.streams[0].height
      }
      let err: string
      if (width > height) {
        const { stderr } = await exec(`ffmpeg  -i ${__dirname}/../cache/${uuid} -vf "crop=w=ih:h=ih:x=(iw/2)/2:y=(ih/2)/2,scale=128:128,fps=10" -loop 0 ${__dirname}/../cache/${uuid}.webp -hide_banner -loglevel error`)
        err = stderr
      } else {
        const { stderr } = await exec(`ffmpeg  -i ${__dirname}/../cache/${uuid} -vf "crop=w=iw:h=iw:x=(iw/2)/2:y=(ih/2)/2,scale=128:128,fps=10" -loop 0 ${__dirname}/../cache/${uuid}.webp -hide_banner -loglevel error`)
        err = stderr
      }
      if (err !== '') {
        console.error(err)
        return null
      } else {
        return `${__dirname}/../cache/${uuid}.webp`
      }
    } else {
      console.error(stderr)
      return null
    }
  }
}
