import { type AsyncThunk } from '@reduxjs/toolkit';
import { type AppDispatch } from '#store';

export type RetryConfig = {
  maxRetries?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onFailure?: (error: unknown, attempt: number) => Promise<void> | void;
  signal?: AbortSignal;
};

export const dispatchWithRetry = async <TReturn, TArg, TRejectValue>(
  dispatch: AppDispatch,
  thunk: AsyncThunk<TReturn, TArg, { rejectValue: TRejectValue }>,
  arg: TArg,
  config: RetryConfig = {},
): Promise<TReturn> => {
  const { maxRetries = 3, delayMs = 1000, shouldRetry = () => true, onFailure, signal } = config;

  let attempt = 0;
  while (attempt <= maxRetries) {
    if (signal?.aborted) throw new Error('Operation aborted');

    try {
      return await dispatch(thunk(arg as any)).unwrap();
    } catch (error) {
      if (attempt === maxRetries || !shouldRetry(error, attempt)) throw error;

      if (onFailure) await onFailure(error, attempt);

      await new Promise(res => setTimeout(res, delayMs));
      attempt++;
    }
  }

  throw new Error('Retry limit reached unexpectedly');
};
