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
    const { stderr } = await exec(`ffmpeg  -i ${__dirname}/../cache/${uuid} -vf "fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 ${__dirname}/../cache/${uuid}.gif`)
    if (stderr !== '') {
      return null
    } else {
      return `${__dirname}/../cache/${uuid}.gif`
    }
  }
}
