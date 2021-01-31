import { Sticker } from '../../domain/models/sticker'
import { StickerRepository } from '../../domain/repositories/sticker-repository'
import { CheckDataTypeDatasource } from '../datasources/check-data-type-datasource'
import { CreateStaticStickerDatasource } from '../datasources/create-static-sticker-datasource'

export class StickerRepositoryImpl implements StickerRepository {
  private readonly _createStaticStickerDatasource: CreateStaticStickerDatasource
  private readonly _checkDataTypeDatasource: CheckDataTypeDatasource

  constructor (createStaticStickerDatasource: CreateStaticStickerDatasource, checkDataTypeDatasource: CheckDataTypeDatasource) {
    this._createStaticStickerDatasource = createStaticStickerDatasource
    this._checkDataTypeDatasource = checkDataTypeDatasource
  }

  async createSticker (data: string): Promise<Sticker> {
    const dataBuffer = Buffer.from(data, 'base64')
    const dataType = await this._checkDataTypeDatasource.fromBuffer(dataBuffer)
    if (dataType === 'staticSticker') {
      const result = await this._createStaticStickerDatasource.createSticker(dataBuffer)
      if (result !== undefined && result !== null) {
        return { data: result.toString('base64'), type: 'static', valid: true }
      } else {
        return { data: null, type: 'static', valid: false }
      }
    }
    return { data: null, type: 'static', valid: false }
  }
}
