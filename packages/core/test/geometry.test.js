import { describe, it, expect } from 'vitest'
import {
  clamp, lerp, boundsUnion, boundsExpand, boundsContain, boundsIntersect,
  ptsBounds, rotWith, distToSegSq, distToPolyline, pointInPolygon,
  pointInEllipse, segIntersectsBounds, seededRand, wobblePolyline,
  geoPolygon, ellipsePolygon, cloudPolygon,
} from '../src/geometry.js'

describe('scalars', () => {
  it('clamp and lerp', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
    expect(lerp(0, 10, 0.5)).toBe(5)
  })
})

describe('bounds', () => {
  it('boundsUnion handles nulls and merges', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 }
    const b = { x: 5, y: -5, w: 10, h: 10 }
    expect(boundsUnion(null, a)).toBe(a)
    expect(boundsUnion(a, null)).toBe(a)
    expect(boundsUnion(a, b)).toEqual({ x: 0, y: -5, w: 15, h: 15 })
  })

  it('boundsExpand grows symmetrically', () => {
    expect(boundsExpand({ x: 0, y: 0, w: 10, h: 10 }, 2)).toEqual({ x: -2, y: -2, w: 14, h: 14 })
  })

  it('contain / intersect', () => {
    const b = { x: 0, y: 0, w: 10, h: 10 }
    expect(boundsContain(b, 5, 5)).toBe(true)
    expect(boundsContain(b, 11, 5)).toBe(false)
    expect(boundsIntersect(b, { x: 9, y: 9, w: 5, h: 5 })).toBe(true)
    expect(boundsIntersect(b, { x: 11, y: 0, w: 5, h: 5 })).toBe(false)
  })

  it('ptsBounds respects stride 3 (draw shapes store x,y,pressure)', () => {
    const pts = [0, 0, 0.5, 10, 20, 0.7, -5, 3, 0.2]
    expect(ptsBounds(pts, 3)).toEqual({ x: -5, y: 0, w: 15, h: 20 })
  })
})

describe('points', () => {
  it('rotWith rotates about a center; zero angle is identity', () => {
    expect(rotWith(5, 0, 0, 0, 0)).toEqual({ x: 5, y: 0 })
    const r = rotWith(1, 0, 0, 0, Math.PI / 2)
    expect(r.x).toBeCloseTo(0)
    expect(r.y).toBeCloseTo(1)
  })

  it('distToSegSq measures point-to-segment distance', () => {
    expect(distToSegSq(0, 5, -10, 0, 10, 0)).toBeCloseTo(25)
    // beyond the endpoint it measures to the endpoint
    expect(distToSegSq(13, 4, -10, 0, 10, 0)).toBeCloseTo(25)
  })

  it('distToPolyline walks all segments (and closes when asked)', () => {
    const square = [0, 0, 10, 0, 10, 10, 0, 10]
    expect(distToPolyline(5, -3, square)).toBeCloseTo(3)
    // (5, 12) is 2 away only via the closing edge (0,10)-(0,0)... actually via edge (10,10)-(0,10)
    expect(distToPolyline(5, 12, square, 2, true)).toBeCloseTo(2)
  })

  it('pointInPolygon / pointInEllipse', () => {
    const tri = [0, 0, 10, 0, 5, 10]
    expect(pointInPolygon(5, 3, tri)).toBe(true)
    expect(pointInPolygon(0, 9, tri)).toBe(false)
    expect(pointInEllipse(0, 0, 0, 0, 5, 3)).toBe(true)
    expect(pointInEllipse(5.1, 0, 0, 0, 5, 3)).toBe(false)
    expect(pointInEllipse(1, 1, 0, 0, 0, 3)).toBe(false) // degenerate
  })

  it('segIntersectsBounds catches crossing and contained segments', () => {
    const r = { x: 0, y: 0, w: 10, h: 10 }
    expect(segIntersectsBounds(-5, 5, 15, 5, r)).toBe(true) // straight through
    expect(segIntersectsBounds(2, 2, 8, 8, r)).toBe(true) // inside
    expect(segIntersectsBounds(-5, -5, -1, 20, r)).toBe(false) // outside
  })
})

describe('seeded wobble', () => {
  it('seededRand is deterministic per seed and varies across seeds', () => {
    const a1 = seededRand('shape:1'), a2 = seededRand('shape:1'), b = seededRand('shape:2')
    const seqA1 = [a1(), a1(), a1()]
    const seqA2 = [a2(), a2(), a2()]
    const seqB = [b(), b(), b()]
    expect(seqA1).toEqual(seqA2)
    expect(seqA1).not.toEqual(seqB)
    for (const v of seqA1) expect(v).toBeGreaterThanOrEqual(0)
    for (const v of seqA1) expect(v).toBeLessThan(1)
  })

  it('wobblePolyline is deterministic and stays near the source polygon', () => {
    const rect = [0, 0, 100, 0, 100, 100, 0, 100]
    const w1 = wobblePolyline(rect, 'seed', { step: 20, amp: 2 })
    const w2 = wobblePolyline(rect, 'seed', { step: 20, amp: 2 })
    expect(w1).toEqual(w2)
    expect(w1.length).toBeGreaterThan(rect.length)
    for (let i = 0; i < w1.length; i += 2) {
      expect(w1[i]).toBeGreaterThan(-5)
      expect(w1[i]).toBeLessThan(105)
    }
  })
})

describe('geo polygon builders', () => {
  it('builds each kind with the right vertex count', () => {
    expect(geoPolygon('rectangle', 10, 10).length).toBe(8)
    expect(geoPolygon('triangle', 10, 10).length).toBe(6)
    expect(geoPolygon('diamond', 10, 10).length).toBe(8)
    expect(geoPolygon('hexagon', 10, 10).length).toBe(12)
    expect(geoPolygon('star', 10, 10).length).toBe(20)
    expect(geoPolygon('unknown', 10, 10).length).toBe(8) // falls back to rect
  })

  it('cloudPolygon closes without a repeated point and scales with the box', () => {
    const pts = cloudPolygon(100, 80)
    expect(pts.length).toBeGreaterThan(40)
    expect(pts.length % 2).toBe(0)
    // the final curve lands back on the start, so it must not be emitted twice
    const n = pts.length
    expect(pts[n - 2] === pts[0] && pts[n - 1] === pts[1]).toBe(false)
    // every sample scales linearly with the box
    const big = cloudPolygon(200, 160)
    for (let i = 0; i < pts.length; i++) expect(big[i]).toBeCloseTo(pts[i] * 2, 6)
  })

  it('geoPolygon routes cloud through cloudPolygon', () => {
    expect(geoPolygon('cloud', 60, 40)).toEqual(cloudPolygon(60, 40))
  })

  it('polygons stay inside their box', () => {
    for (const kind of ['rectangle', 'triangle', 'diamond', 'hexagon', 'star', 'cloud']) {
      const pts = geoPolygon(kind, 40, 30)
      for (let i = 0; i < pts.length; i += 2) {
        expect(pts[i]).toBeGreaterThanOrEqual(0)
        expect(pts[i]).toBeLessThanOrEqual(40)
        expect(pts[i + 1]).toBeGreaterThanOrEqual(0)
        expect(pts[i + 1]).toBeLessThanOrEqual(30)
      }
    }
  })

  it('ellipsePolygon samples n points on the ellipse', () => {
    const pts = ellipsePolygon(20, 10, 16)
    expect(pts.length).toBe(32)
    for (let i = 0; i < pts.length; i += 2) {
      const dx = (pts[i] - 10) / 10, dy = (pts[i + 1] - 5) / 5
      expect(dx * dx + dy * dy).toBeCloseTo(1)
    }
  })
})
