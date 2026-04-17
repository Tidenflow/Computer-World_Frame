import { describe, expect, test } from 'vitest'

import { panViewport, zoomAtPoint } from '../graph-viewport'

describe('graph viewport zoom', () => {
  test('keeps the world point under the cursor fixed while zooming in', () => {
    const viewport = zoomAtPoint({
      offset: { x: 0, y: 0 },
      scale: 1,
      cursor: { x: 200, y: 120 },
      zoomFactor: 1.1,
      minScale: 0.5,
      maxScale: 2,
    })

    expect(viewport.scale).toBeCloseTo(1.1)
    expect(viewport.offset.x).toBeCloseTo(-20)
    expect(viewport.offset.y).toBeCloseTo(-12)
  })

  test('keeps the same world point fixed when an existing pan offset is present', () => {
    const viewport = zoomAtPoint({
      offset: { x: 50, y: -30 },
      scale: 1,
      cursor: { x: 200, y: 120 },
      zoomFactor: 1.1,
      minScale: 0.5,
      maxScale: 2,
    })

    expect(viewport.scale).toBeCloseTo(1.1)
    expect(viewport.offset.x).toBeCloseTo(35)
    expect(viewport.offset.y).toBeCloseTo(-45)
  })

  test('clamps the scale to the provided min and max bounds', () => {
    expect(
      zoomAtPoint({
        offset: { x: 0, y: 0 },
        scale: 2,
        cursor: { x: 100, y: 80 },
        zoomFactor: 1.1,
        minScale: 0.5,
        maxScale: 2,
      }).scale,
    ).toBe(2)

    expect(
      zoomAtPoint({
        offset: { x: 0, y: 0 },
        scale: 0.5,
        cursor: { x: 100, y: 80 },
        zoomFactor: 0.9,
        minScale: 0.5,
        maxScale: 2,
      }).scale,
    ).toBe(0.5)
  })

  test('pans the viewport by adding the pointer delta to the offset', () => {
    expect(
      panViewport({
        offset: { x: 20, y: -10 },
        delta: { x: 15, y: 8 },
      }),
    ).toEqual({ x: 35, y: -2 })
  })
})
