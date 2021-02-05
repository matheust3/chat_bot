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
    const { stdout, stderr } = await exec(`ffprobe -v error -show_entries stream=width,height -of csv=p=0:s=x ${__dirname}/../cache/${uuid}`)
    if (stderr === '') {
      const height = parseFloat(stdout.split('x')[1])
      const width = parseFloat(stdout.split('x')[0])
      let err: string
      if (width > height) {
        const { stderr } = await exec(`ffmpeg  -i ${__dirname}/../cache/${uuid} -vf "crop=w=(iw+(ih-iw)):h=ih:x=(iw/2)/2:y=(ih/2)/2,scale=128:128,fps=10" -loop 0 ${__dirname}/../cache/${uuid}.webp -hide_banner -loglevel error`)
        err = stderr
      } else {
        const { stderr } = await exec(`ffmpeg  -i ${__dirname}/../cache/${uuid} -vf "crop=w=iw:h=(ih+(iw-ih)):x=(iw/2)/2:y=(ih/2)/2,scale=128:128,fps=10" -loop 0 ${__dirname}/../cache/${uuid}.webp -hide_banner -loglevel error`)
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
