import { Sticker } from '../../domain/models/sticker'
import { StickerRepository } from '../../domain/repositories/sticker-repository'
import { CheckDataTypeDatasource } from '../datasources/check-data-type-datasource'
import { CreateAnimatedStickerDatasource } from '../datasources/create-animated-sticker-datasource'
import { CreateStaticStickerDatasource } from '../datasources/create-static-sticker-datasource'

export class StickerRepositoryImpl implements StickerRepository {
  private readonly _createStaticStickerDatasource: CreateStaticStickerDatasource
  private readonly _createAnimatedStickerDatasource: CreateAnimatedStickerDatasource
  private readonly _checkDataTypeDatasource: CheckDataTypeDatasource

  constructor (createStaticStickerDatasource: CreateStaticStickerDatasource, checkDataTypeDatasource: CheckDataTypeDatasource
    , createAnimatedStickerDatasource: CreateAnimatedStickerDatasource) {
    this._createStaticStickerDatasource = createStaticStickerDatasource
    this._checkDataTypeDatasource = checkDataTypeDatasource
    this._createAnimatedStickerDatasource = createAnimatedStickerDatasource
  }

  async createSticker (data: string, resize: boolean): Promise<Sticker> {
    const dataBuffer = Buffer.from(data, 'base64')
    const dataType = await this._checkDataTypeDatasource.fromBuffer(dataBuffer)
    if (dataType === 'staticSticker') {
      const result = await this._createStaticStickerDatasource.createSticker(dataBuffer, resize)
      if (result !== undefined && result !== null) {
        return { path: result, type: 'static', valid: true }
      } else {
        return { path: '', type: 'static', valid: false }
      }
    } else if (dataType === 'stickerAnimated') {
      const result = await this._createAnimatedStickerDatasource.createSticker(dataBuffer)
      if (result !== null) {
        return { path: result, type: 'animated', valid: true }
      } else {
        return { path: '', type: 'animated', valid: false }
      }
    } else {
      return { path: '', type: 'static', valid: false }
    }
  }
}
