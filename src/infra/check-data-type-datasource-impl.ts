import { CheckDataTypeDatasource } from '../data/datasources/check-data-type-datasource'
import { DataType } from '../domain/models/data-types'
import { loadEsm } from 'load-esm'

export class CheckDataTypeDatasourceImpl implements CheckDataTypeDatasource {
  private readonly _staticStickerTypes = ['png', 'jpg', 'jpeg']
  private readonly _animatedStickerTypes = ['mp4', 'gif']

  async fromBuffer (buffer: Buffer): Promise<DataType> {
    const type = await this.getFileTypeFromBuffer(buffer)
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

  private async getFileTypeFromBuffer (buffer: Buffer): Promise<{ ext: string, mime: string } | undefined> {
    const { fileTypeFromBuffer } = await loadEsm('file-type')
    return fileTypeFromBuffer(buffer)
  }
}
