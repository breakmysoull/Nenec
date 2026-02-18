type Key = string
type Value = string | Record<string, unknown> | string[]
export class LRUCache<K extends Key, V extends Value> {
  private capacity: number
  private map: Map<K, V>
  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity)
    this.map = new Map()
  }
  get(key: K): V | undefined {
    const v = this.map.get(key)
    if (v === undefined) return undefined
    this.map.delete(key)
    this.map.set(key, v)
    return v
  }
  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key)
    this.map.set(key, value)
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
  }
  has(key: K): boolean {
    return this.map.has(key)
  }
  size(): number {
    return this.map.size
  }
  keys(): K[] {
    return Array.from(this.map.keys())
  }
}
export type Block = {
  id: string
  start: number
  end: number
  text: string
}
function tokenize(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 0)
}
function detokenize(tokens: string[]): string {
  return tokens.join(" ").trim()
}
export function estimateTokens(text: string): number {
  return tokenize(text).length
}
export class BlockManager {
  private maxTokens: number
  private overlapTokens: number
  constructor(maxTokens: number, overlapTokens: number) {
    this.maxTokens = Math.max(8, maxTokens)
    this.overlapTokens = Math.max(0, Math.min(overlapTokens, this.maxTokens - 1))
  }
  segment(text: string): Block[] {
    const tokens = tokenize(text)
    const blocks: Block[] = []
    let i = 0
    let idx = 0
    while (i < tokens.length) {
      const start = i
      const endExclusive = Math.min(tokens.length, i + this.maxTokens)
      const slice = tokens.slice(start, endExclusive)
      const id = `blk_${idx}`
      blocks.push({ id, start, end: endExclusive - 1, text: detokenize(slice) })
      idx += 1
      if (endExclusive >= tokens.length) break
      i = endExclusive - this.overlapTokens
    }
    return blocks
  }
}
function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ +/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}
function jaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a.toLowerCase()))
  const tb = new Set(tokenize(b.toLowerCase()))
  const inter = new Set([...ta].filter((t) => tb.has(t)))
  const union = new Set([...ta, ...tb])
  return inter.size / Math.max(1, union.size)
}
export class TokenCompressor {
  static compress(text: string, targetTokens: number): string {
    const lines = normalizeLines(text)
    const kept: string[] = []
    const seen = new Set<string>()
    for (const line of lines) {
      const key = line.toLowerCase()
      if (seen.has(key)) continue
      let isDuplicate = false
      for (const k of kept) {
        if (jaccard(k, line) >= 0.9) {
          isDuplicate = true
          break
        }
      }
      if (isDuplicate) continue
      kept.push(line)
      seen.add(key)
      const tokensNow = estimateTokens(kept.join(" "))
      if (tokensNow > targetTokens) break
    }
    if (estimateTokens(kept.join(" ")) <= targetTokens) return kept.join("\n")
    const tokens = tokenize(kept.join(" "))
    return detokenize(tokens.slice(0, targetTokens))
  }
}
export class TransitionBuffer<T> {
  private buffer: T[]
  private capacity: number
  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity)
    this.buffer = []
  }
  push(value: T): void {
    this.buffer.push(value)
    if (this.buffer.length > this.capacity) this.buffer.shift()
  }
  snapshot(): T[] {
    return [...this.buffer]
  }
  clear(): void {
    this.buffer = []
  }
}
export type ContextRecord = {
  id: string
  blocks: Block[]
  summary: string
  metadata?: Record<string, unknown>
}
export class ContextEngine {
  private cache: LRUCache<string, ContextRecord>
  private blockManager: BlockManager
  constructor(cacheCapacity: number, maxTokensPerBlock: number, overlapTokens: number) {
    this.cache = new LRUCache<string, ContextRecord>(cacheCapacity)
    this.blockManager = new BlockManager(maxTokensPerBlock, overlapTokens)
  }
  ingest(id: string, text: string, summaryTokens = 256, metadata?: Record<string, unknown>): ContextRecord {
    const blocks = this.blockManager.segment(text)
    const summary = TokenCompressor.compress(text, summaryTokens)
    const record: ContextRecord = { id, blocks, summary, metadata }
    this.cache.set(id, record)
    return record
  }
  get(id: string): ContextRecord | undefined {
    return this.cache.get(id)
  }
  has(id: string): boolean {
    return this.cache.has(id)
  }
  keys(): string[] {
    return this.cache.keys()
  }
}
