export function debounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
  let debounceTimer: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      // the async wrapper collapses sync throws and rejections into one catchable
      // promise: escaping either one takes down the whole dev server
      // eslint-disable-next-line no-console
      void (async () => callback(...args))().catch(console.error)
    }, delay)
  }
}
