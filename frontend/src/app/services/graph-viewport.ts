interface Point {
  x: number
  y: number
}

interface PanViewportInput {
  offset: Point
  delta: Point
}

interface ZoomAtPointInput {
  offset: Point
  scale: number
  cursor: Point
  zoomFactor: number
  minScale: number
  maxScale: number
}

export function zoomAtPoint({
  offset,
  scale,
  cursor,
  zoomFactor,
  minScale,
  maxScale,
}: ZoomAtPointInput) {
  const nextScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor))

  if (nextScale === scale) {
    return { offset, scale }
  }

  const worldX = (cursor.x - offset.x) / scale
  const worldY = (cursor.y - offset.y) / scale

  return {
    scale: nextScale,
    offset: {
      x: cursor.x - worldX * nextScale,
      y: cursor.y - worldY * nextScale,
    },
  }
}

export function panViewport({ offset, delta }: PanViewportInput) {
  return {
    x: offset.x + delta.x,
    y: offset.y + delta.y,
  }
}
