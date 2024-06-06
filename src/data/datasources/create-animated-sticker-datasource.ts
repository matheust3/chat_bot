export interface CreateAnimatedStickerDatasource {
  createSticker: (data: Buffer, resize: boolean) => Promise<string | null>
}
