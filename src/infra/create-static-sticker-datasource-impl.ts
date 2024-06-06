import { CreateStaticStickerDatasource } from '../data/datasources/create-static-sticker-datasource'
import fs from 'fs'
import { v4 } from 'uuid'
import { promisify } from 'util'
import child_process from 'child_process'
import path from 'path'

export class CreateStaticStickerDatasourceImpl implements CreateStaticStickerDatasource {
  async createSticker (data: Buffer, resize: boolean): Promise<string | null> {
    /* istanbul ignore else */
    if (!fs.existsSync(path.join(__dirname, '/../cache'))) {
      fs.mkdirSync(path.join(__dirname, '/../cache'))
    }
    const uuid = v4()
    fs.writeFileSync(path.join(__dirname, '/../cache/', uuid), data)

    const exec = promisify(child_process.exec)
    let command = ''
    if (!resize) {
      command = `mogrify -format png -resize 512x512 -background none -gravity center -extent 512x512 ${path.join(__dirname, `/../cache/${uuid}`)}`
    } else {
      command = `mogrify -format png ${path.join(__dirname, `/../cache/${uuid}`)}`
    }
    const { stderr } = await exec(command)
    if (stderr !== '') {
      console.error(stderr)
      return null
    } else {
      return path.join(__dirname, '/../cache/', `${uuid}.png`)
    }
  }
}
