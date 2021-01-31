export interface CreateStaticStickerDatasource{
  createSticker: (data: Buffer) => Promise<Buffer>
}
