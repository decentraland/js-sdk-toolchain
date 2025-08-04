import { type Scene } from '@dcl/schemas';

const decoder = new TextDecoder();

export function bufferToJson(buffer: Buffer) {
  return JSON.parse(decoder.decode(buffer));
}

export function bufferToScene(buffer: Buffer): Scene {
  return bufferToJson(buffer) as Scene;
}
