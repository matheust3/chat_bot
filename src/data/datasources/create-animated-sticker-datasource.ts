export interface CreateAnimatedStickerDatasource {
  createSticker: (data: Buffer) => Promise<string>
}
