import { Pool } from 'pg'
import { randomUUID } from 'node:crypto'

export interface MemoryRecord {
  id: string
  content: string
  createdAt: Date
  embedding: number[]
}

export class VectorMemoryStore {
  private readonly pool: Pool
  private readonly initialized: Promise<void>
  private readonly maxRecent: number

  constructor (maxRecent = 200) {
    const databaseUrl = process.env.DATABASE_URL
    if (databaseUrl == null || databaseUrl === '') {
      throw new Error('DATABASE_URL não definida')
    }

    this.pool = new Pool({ connectionString: databaseUrl })
    this.initialized = this.ensureSchema()
    this.maxRecent = maxRecent
  }

  private async ensureSchema (): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ai_memory (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS ai_memory_user_created_idx
      ON ai_memory (user_id, created_at DESC);
    `)
  }

  async addMemory (userId: string, content: string, embedding: number[]): Promise<void> {
    await this.initialized
    const id = randomUUID()
    await this.pool.query(
      'INSERT INTO ai_memory (id, user_id, content, embedding) VALUES ($1, $2, $3, $4)',
      [id, userId, content, JSON.stringify(embedding)]
    )
  }

  async listRecent (userId: string, limit: number = this.maxRecent): Promise<MemoryRecord[]> {
    await this.initialized
    const result = await this.pool.query(
      'SELECT id, content, embedding, created_at FROM ai_memory WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    )

    return result.rows.map((row) => ({
      id: String(row.id),
      content: String(row.content),
      createdAt: new Date(row.created_at),
      embedding: Array.isArray(row.embedding) ? row.embedding : (row.embedding ?? [])
    }))
  }
}

export const createHashEmbedding = (text: string, dimensions = 256): number[] => {
  const vector = new Array<number>(dimensions).fill(0)
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

  if (normalized === '') {
    return vector
  }

  const tokens = normalized.split(/\s+/g)
  for (const token of tokens) {
    let hash = 0
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i)
      hash |= 0
    }
    const index = Math.abs(hash) % dimensions
    vector[index] += 1
  }

  return normalizeVector(vector)
}

export const cosineSimilarity = (a: number[], b: number[]): number => {
  const size = Math.min(a.length, b.length)
  if (size === 0) return 0

  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < size; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

const normalizeVector = (vector: number[]): number[] => {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0))
  if (norm === 0) return vector
  return vector.map((value) => value / norm)
}
