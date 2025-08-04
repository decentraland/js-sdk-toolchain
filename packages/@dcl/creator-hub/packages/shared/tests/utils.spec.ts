import { vi, describe, it, expect, beforeEach } from 'vitest';
import { debounce, debounceByKey } from '../utils';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should debounce function calls', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);

    // Multiple calls within delay should be debounced
    debouncedFn('test1');
    debouncedFn('test2');
    debouncedFn('test3');

    expect(mockFn).toHaveBeenCalledTimes(0); // No calls yet

    // Advance time to trigger the debounced call
    await vi.advanceTimersByTimeAsync(300);

    // Should have executed only the last call
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenLastCalledWith('test3');
  });

  it('should reset timer on each call', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);

    // First call
    debouncedFn('test1');

    // Advance halfway
    await vi.advanceTimersByTimeAsync(150);
    expect(mockFn).toHaveBeenCalledTimes(0);

    // Call again - should reset timer
    debouncedFn('test2');

    // Advance to original timeout (should not trigger)
    await vi.advanceTimersByTimeAsync(150);
    expect(mockFn).toHaveBeenCalledTimes(0);

    // Advance to new timeout
    await vi.advanceTimersByTimeAsync(150);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenLastCalledWith('test2');
  });

  it('should handle multiple separate calls', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);

    // First call
    debouncedFn('test1');
    await vi.advanceTimersByTimeAsync(300);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenLastCalledWith('test1');

    // Second call after delay
    debouncedFn('test2');
    await vi.advanceTimersByTimeAsync(300);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('test2');
  });
});

describe('debounceByKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should maintain separate debounce timers for different keys', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounceByKey(mockFn, 300, (key: string) => key);

    // Call with key 'a'
    debouncedFn('a');
    expect(mockFn).toHaveBeenCalledTimes(0);

    // Call with key 'b' - should have separate timer
    debouncedFn('b');
    expect(mockFn).toHaveBeenCalledTimes(0);

    // Advance time
    await vi.advanceTimersByTimeAsync(300);

    // Should have executed both calls
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenNthCalledWith(1, 'a');
    expect(mockFn).toHaveBeenNthCalledWith(2, 'b');
  });

  it('should debounce calls with the same key', async () => {
    const mockFn = vi.fn();
    const debouncedFn = debounceByKey(mockFn, 300, (key: string) => key);

    // Multiple calls with same key
    debouncedFn('a');
    debouncedFn('a');
    debouncedFn('a');

    expect(mockFn).toHaveBeenCalledTimes(0);

    // Advance time
    await vi.advanceTimersByTimeAsync(300);

    // Should have executed only the last call
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenLastCalledWith('a');
  });
});
