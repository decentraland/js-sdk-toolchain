export type ErrorAsValue = {
  name: string;
  message: string;
};

/**
 * A function that wraps a promise in a try-catch block.
 * @param promise - The promise to be wrapped.
 * @returns A promise that resolves to an array with the error as the first element and the data as the second element,
 * or the other way around if the promise resolves successfully.
 */
export async function tryCatch<T, E = Error>(promise: Promise<T>): Promise<[null, T] | [E, null]> {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    return [error as E, null];
  }
}

/**
 * A function that wraps a promise in a try-catch block and returns the error as a value.
 * @param promise - The promise to be wrapped.
 * @returns A promise that resolves to an array with the error as the first element and the data as the second element,
 * or the other way around if the promise resolves successfully.
 */
export async function tryCatchAsValue<T>(
  promise: Promise<T>,
): Promise<[null, T] | [ErrorAsValue, null]> {
  const [error, data] = await tryCatch(promise);
  if (error) return [{ name: error.name, message: error.message }, null];
  return [null, data];
}
