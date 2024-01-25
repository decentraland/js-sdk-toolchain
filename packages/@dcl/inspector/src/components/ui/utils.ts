export function isErrorMessage(error?: boolean | string): boolean {
  return !!error && typeof error === 'string'
}

export function debounce<F extends (...args: any[]) => void>(func: F, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return function (...args: Parameters<F>) {
    clearTimeout(timer)
    timer = setTimeout(() => func(...args), delay)
  }
}
