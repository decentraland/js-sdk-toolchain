import { Props } from "./types";

export function getLargestAxis(coords: Props['coords']): number {
  const [first, last] = [coords[0], coords[coords.length - 1]]
  return Math.max(Math.abs(last.x - first.x), Math.abs(last.y - first.y)) + 1 // zero-based
}

export function getNumberOfRows(coords: Props['coords']): number {
  const [first, last] = [coords[0], coords[coords.length - 1]]
  return Math.max(Math.abs(last.y - first.y)) + 1 // zero-based
}

export function chunkCoords(coords: Props['coords'], chunkSize: number): Props['coords'][] {
  if (chunkSize <= 0 || chunkSize >= coords.length) return [coords]

  const chunks = [];
  for (let i = 0; i < coords.length; i += chunkSize) {
    const tmp = []
    for (let j = i; j < i + chunkSize; j++) {
      tmp.push(coords[j])
    }
    chunks.push(tmp)
  }

  return chunks;
}
