export interface CreateStaticStickerDatasource {
  createSticker: (data: Buffer, resize: boolean) => Promise<string | null>
}
