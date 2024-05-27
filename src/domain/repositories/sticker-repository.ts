import { Sticker } from '../models/sticker'

export interface StickerRepository {
  /// Create a sticker from base64
  createSticker: (data: string) => Promise<Sticker>
}
