export type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

export type Async<T extends Record<any, any>> = T & {
  status: Status;
  error: string | null;
};
