import { CheckDataTypeDatasource } from '../data/datasources/check-data-type-datasource'
import { DataType } from '../domain/models/data-types'
import fileType from 'file-type'

export class CheckDataTypeDatasourceImpl implements CheckDataTypeDatasource {
  private readonly _staticStickerTypes = ['png', 'jpg', 'jpeg']
  private readonly _animatedStickerTypes = ['mp4']

  async fromBuffer (buffer: Buffer): Promise<DataType> {
    const type = await fileType.fromBuffer(buffer)
    if (type !== undefined) {
      if (this._staticStickerTypes.includes(type.ext)) {
        return 'staticSticker'
      } else if (this._animatedStickerTypes.includes(type.ext)) {
        return 'stickerAnimated'
      } else {
        console.error('Tipo de arquivo nao mapeado -> ', type.ext)
        return 'invalidSticker'
      }
    } else {
      console.error('Tipo de arquivo nao mapeado -> arquivo nao reconhecido')
      return 'invalidSticker'
    }
  }
}
