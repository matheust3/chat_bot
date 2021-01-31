import { CreateStaticStickerDatasource } from '../data/datasources/create-static-sticker-datasource'
import fs from 'fs'
import { v4 } from 'uuid'
import { promisify } from 'util'
import child_process from 'child_process'

export class CreateStaticStickerDatasourceImpl implements CreateStaticStickerDatasource {
  async createSticker (data: Buffer): Promise<string> {
    /* istanbul ignore else */
    if (!fs.existsSync(`${__dirname}/../cache`)) {
      fs.mkdirSync(`${__dirname}/../cache`)
    }
    const uuid = v4()
    fs.writeFileSync(`${__dirname}/../cache/${uuid}`, data)

    const exec = promisify(child_process.exec)
    const { stderr } = await exec(`mogrify -format png ${__dirname}/../cache/${uuid}`)
    if (stderr !== '') {
      return null
    } else {
      return `${__dirname}/../cache/${uuid}.png`
    }
  }
}
