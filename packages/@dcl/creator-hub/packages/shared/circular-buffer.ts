export interface CircularBufferType<T> {
  push: (data: T) => void;
  getAll: () => T[];
  getAllIterator: () => Generator<T>;
  clear: () => void;
  getLast: () => T | undefined;
  getSize: () => number;
  getAt: (index: number) => T | undefined;
  getFirst: () => T | undefined;
}

export function createCircularBuffer<T>(maxSize: number): CircularBufferType<T> {
  const buffer: T[] = new Array(maxSize);
  let start = 0;
  let end = 0;
  let size = 0;

  function push(data: T): void {
    buffer[end] = data;
    end = (end + 1) % maxSize;

    if (size < maxSize) {
      size += 1;
    } else {
      start = (start + 1) % maxSize; // Overwrite the oldest data
    }
  }

  function getSize(): number {
    return size;
  }

  function getAll(): T[] {
    const result: T[] = [];
    for (let i = 0; i < size; i++) {
      result.push(buffer[(start + i) % maxSize]);
    }
    return result;
  }

  function* getAllIterator(): Generator<T> {
    for (let i = 0; i < size; i++) {
      yield buffer[(start + i) % maxSize];
    }
  }

  function getAt(index: number): T | undefined {
    if (index < 0 || index >= size) {
      return undefined;
    }
    return buffer[(start + index) % maxSize];
  }

  function getLast(): T | undefined {
    if (size === 0) {
      return undefined;
    }
    return getAt(size - 1);
  }

  function getFirst(): T | undefined {
    if (size === 0) {
      return undefined;
    }
    return getAt(0);
  }

  function clear(): void {
    start = 0;
    end = 0;
    size = 0;
  }

  return {
    push,
    getAll,
    getAllIterator,
    clear,
    getLast,
    getSize,
    getAt,
    getFirst,
  };
}
