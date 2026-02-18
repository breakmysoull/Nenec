import { describe, it, expect } from "vitest"
import { LRUCache, BlockManager, TokenCompressor, TransitionBuffer, estimateTokens, ContextEngine } from "@/lib/contextEngine"

describe("LRUCache", () => {
  it("evicts oldest item", () => {
    const c = new LRUCache<string, string>(2)
    c.set("a", "1")
    c.set("b", "2")
    c.set("c", "3")
    expect(c.has("a")).toBe(false)
    expect(c.has("b")).toBe(true)
    expect(c.has("c")).toBe(true)
  })
})

describe("BlockManager", () => {
  it("segments with overlap", () => {
    const text = Array.from({ length: 50 }, (_, i) => `t${i}`).join(" ")
    const bm = new BlockManager(10, 3)
    const blocks = bm.segment(text)
    expect(blocks.length).toBeGreaterThan(1)
    expect(estimateTokens(blocks[0].text)).toBeLessThanOrEqual(10)
  })
})

describe("TokenCompressor", () => {
  it("compresses while keeping key lines", () => {
    const text = ["A", "A", "B", "C", "C", "D"].join("\n")
    const out = TokenCompressor.compress(text, 3)
    expect(estimateTokens(out)).toBeLessThanOrEqual(3)
  })
})

describe("TransitionBuffer", () => {
  it("keeps last N values", () => {
    const buf = new TransitionBuffer<number>(3)
    buf.push(1); buf.push(2); buf.push(3); buf.push(4)
    expect(buf.snapshot()).toEqual([2, 3, 4])
  })
})

describe("ContextEngine", () => {
  it("ingests and retrieves contexts", () => {
    const ce = new ContextEngine(2, 10, 2)
    const rec = ce.ingest("id1", "a b c d e f g h i j k l", 5)
    expect(rec.blocks.length).toBeGreaterThan(0)
    expect(estimateTokens(rec.summary)).toBeLessThanOrEqual(5)
    const got = ce.get("id1")
    expect(got?.id).toBe("id1")
  })
})
