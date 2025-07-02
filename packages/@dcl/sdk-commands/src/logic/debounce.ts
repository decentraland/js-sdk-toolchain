export function debounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
  let debounceTimer: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => callback(...args), delay)
  }
}
