/** Hex-encode a buffer so golden-byte snapshots stay readable. */
export function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
