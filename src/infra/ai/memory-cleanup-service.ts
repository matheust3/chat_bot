import { VectorMemoryStore } from './vector-memory-store'

interface MemoryCleanupConfig {
  intervalMs: number
  maxConversationPerUser: number
}

export class MemoryCleanupService {
  private readonly store: VectorMemoryStore
  private readonly config: MemoryCleanupConfig
  private timer: NodeJS.Timeout | null = null

  constructor (store: VectorMemoryStore, config: MemoryCleanupConfig) {
    this.store = store
    this.config = config
  }

  start (): void {
    if (this.timer != null) return
    this.timer = setInterval(() => {
      void this.runOnce()
    }, this.config.intervalMs)
  }

  stop (): void {
    if (this.timer == null) return
    clearInterval(this.timer)
    this.timer = null
  }

  async runOnce (): Promise<void> {
    await this.store.pruneByMaxPerUser('conversation', this.config.maxConversationPerUser)
  }
}

export const loadMemoryCleanupConfig = (): MemoryCleanupConfig => {
  const intervalMinutes = Number(process.env.AI_MEMORY_CLEANUP_INTERVAL_MINUTES ?? '60')
  const maxConversation = Number(process.env.AI_MEMORY_MAX_CONVERSATION ?? '200')

  return {
    intervalMs: Math.max(intervalMinutes, 1) * 60_000,
    maxConversationPerUser: Number.isFinite(maxConversation) ? maxConversation : 200
  }
}
