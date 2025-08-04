import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { dispatchWithRetry } from './utils';

const TEST_DELAY_MS = 1;

describe('dispatchWithRetry', () => {
  const mockDispatch = vi.fn();
  const mockThunk = createAsyncThunk('test/thunk', async (arg: string) => {
    if (arg === 'fail') throw new Error('Failed');
    return 'success';
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when the thunk succeeds', () => {
    beforeEach(() => {
      mockDispatch.mockImplementationOnce(_action => ({
        unwrap: () => Promise.resolve('success'),
      }));
    });

    it('should return the success value', async () => {
      const result = await dispatchWithRetry(mockDispatch, mockThunk, 'success');
      expect(result).toBe('success');
    });

    it('should dispatch only once', async () => {
      await dispatchWithRetry(mockDispatch, mockThunk, 'success');
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the thunk fails and retries', () => {
    beforeEach(() => {
      mockDispatch
        .mockImplementationOnce(() => ({
          unwrap: () => Promise.reject(new Error('Failed')),
        }))
        .mockImplementationOnce(() => ({
          unwrap: () => Promise.resolve('success'),
        }));
    });

    it('should eventually succeed', async () => {
      const result = await dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
        delayMs: TEST_DELAY_MS,
      });
      expect(result).toBe('success');
    });

    it('should dispatch twice', async () => {
      await dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
        delayMs: TEST_DELAY_MS,
      });
      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });

    it('should wait for the specified delay between retries', async () => {
      vi.useFakeTimers();
      const promise = dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
        delayMs: TEST_DELAY_MS,
      });

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(TEST_DELAY_MS);
      expect(mockDispatch).toHaveBeenCalledTimes(2);

      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('when the thunk fails and reaches max retries', () => {
    beforeEach(() => {
      mockDispatch.mockImplementation(() => ({
        unwrap: () => Promise.reject(new Error('Failed')),
      }));
    });

    it('should throw the error', async () => {
      await expect(
        dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
          maxRetries: 2,
          delayMs: TEST_DELAY_MS,
        }),
      ).rejects.toThrow('Failed');
    });

    it('should attempt the specified number of retries', async () => {
      await expect(
        dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
          maxRetries: 2,
          delayMs: TEST_DELAY_MS,
        }),
      ).rejects.toThrow('Failed');

      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });
  });

  describe('when the operation is aborted', () => {
    let controller: AbortController;

    beforeEach(() => {
      controller = new AbortController();
      controller.abort();
    });

    it('should throw an abort error', async () => {
      await expect(
        dispatchWithRetry(mockDispatch, mockThunk, 'success', { signal: controller.signal }),
      ).rejects.toThrow('Operation aborted');
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('when using custom retry logic', () => {
    beforeEach(() => {
      mockDispatch.mockImplementation(() => ({
        unwrap: () => Promise.reject(new Error('Failed')),
      }));
    });

    it('should respect the custom retry logic', async () => {
      const shouldRetry = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
      await expect(
        dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
          shouldRetry,
          maxRetries: 2,
          delayMs: TEST_DELAY_MS,
        }),
      ).rejects.toThrow('Failed');

      expect(shouldRetry).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('when using failure callbacks', () => {
    let onFailure: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onFailure = vi.fn();
      mockDispatch
        .mockImplementationOnce(() => ({
          unwrap: () => Promise.reject(new Error('Failed')),
        }))
        .mockImplementationOnce(() => ({
          unwrap: () => Promise.resolve('success'),
        }));
    });

    it('should call the onFailure callback with error and attempt number', async () => {
      await dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
        onFailure: onFailure as (error: unknown, attempt: number) => void | Promise<void>,
        delayMs: TEST_DELAY_MS,
      });
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error), 0);
    });

    it('should handle async onFailure callbacks', async () => {
      vi.useFakeTimers();
      onFailure.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const promise = dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
        onFailure: onFailure as (error: unknown, attempt: number) => void | Promise<void>,
        delayMs: TEST_DELAY_MS,
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(onFailure).toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(TEST_DELAY_MS);
      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('when handling edge cases', () => {
    describe('and the error is undefined', () => {
      beforeEach(() => {
        mockDispatch.mockImplementation(() => ({
          unwrap: () => Promise.reject(undefined),
        }));
      });

      it('should propagate the undefined error', async () => {
        await expect(
          dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
            maxRetries: 1,
            delayMs: TEST_DELAY_MS,
          }),
        ).rejects.toBeUndefined();
      });
    });

    describe('and the error is null', () => {
      beforeEach(() => {
        mockDispatch.mockImplementation(() => ({
          unwrap: () => Promise.reject(null),
        }));
      });

      it('should propagate the null error', async () => {
        await expect(
          dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
            maxRetries: 1,
            delayMs: TEST_DELAY_MS,
          }),
        ).rejects.toBeNull();
      });
    });

    describe('and the error is a custom type', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      beforeEach(() => {
        mockDispatch.mockImplementation(() => ({
          unwrap: () => Promise.reject(new CustomError('Custom error')),
        }));
      });

      it('should propagate the custom error', async () => {
        await expect(
          dispatchWithRetry(mockDispatch, mockThunk, 'fail', {
            maxRetries: 1,
            delayMs: TEST_DELAY_MS,
          }),
        ).rejects.toThrow('Custom error');
      });
    });
  });
});
