export type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never;

export function isUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (_error) {
    return false;
  }
}

export const throttle = <T, K extends any[]>(
  fn: (...args: K) => T,
  delay: number,
  waitFor?: number,
): [(...args: K) => T | undefined, () => void] => {
  let wait = !!waitFor;
  let timeout: number | undefined;
  let cancelled = false;
  waitFor = waitFor
    ? window.setTimeout(() => {
        wait = false;
      }, waitFor)
    : undefined;

  return [
    (...args: K) => {
      if (cancelled || wait) return undefined;

      const val = fn(...args);
      wait = true;
      timeout = window.setTimeout(() => {
        wait = false;
      }, delay);

      return val;
    },
    () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      if (waitFor) clearTimeout(waitFor);
    },
  ];
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const CLIENT_NOT_INSTALLED_ERROR = 'Decentraland Desktop Client failed with';

export function debounce<F extends (...args: any[]) => void>(func: F, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<F>) {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

export function debounceByKey<F extends (...args: any[]) => void>(
  func: F,
  delay: number,
  keySelector: (...args: Parameters<F>) => string,
): (...args: Parameters<F>) => void {
  const debouncedFunctions = new Map<string, ReturnType<typeof debounce>>();

  return (...args: Parameters<F>): void => {
    const key = keySelector(...args);

    if (!debouncedFunctions.has(key)) {
      debouncedFunctions.set(key, debounce(func, delay));
    }

    debouncedFunctions.get(key)!(...args);
  };
}
