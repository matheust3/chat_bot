export interface CreateStaticStickerDatasource{
  createSticker: (data: Buffer) => Promise<string>
}
