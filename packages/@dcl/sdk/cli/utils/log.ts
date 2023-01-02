class _Console {
  text: string | null
  constructor() {
    this.text = null
  }

  start(message?: string) {
    this.text = message || null
    this.text && console.log(this.text)
  }

  stop() {}

  fail(message: string) {
    console.log(`🔴 ${message}`)
  }

  warn(message: string) {
    console.log(`🟠 ${message}`)
  }

  info(message: string) {
    console.log(`🔵 ${message}`)
  }

  succeed(message: string) {
    console.log(`🟢 ${message}`)
  }
}

export const log = new _Console()
