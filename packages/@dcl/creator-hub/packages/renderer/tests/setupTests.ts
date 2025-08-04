import { afterEach, vi } from 'vitest';

// Mock preload modules
vi.mock('#preload', async () => {
  const actual = await import('../../preload/src/index');

  const deepMockObject = (obj: Record<string, any>) => {
    const result: Record<string, any> = {};

    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'function') {
        result[key] = vi.fn(); // mock functions
      } else if (value && typeof value === 'object') {
        result[key] = deepMockObject(value); // recurse for nested modules
      } else {
        result[key] = value; // passthrough for constants if needed
      }
    }

    return result;
  };

  return deepMockObject(actual);
});

afterEach(() => {
  vi.clearAllMocks();
});
