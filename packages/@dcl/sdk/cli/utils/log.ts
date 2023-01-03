export function raw(message: string) {
  console.log(message)
}

export function fail(message: string) {
  console.log(`🔴 ${message}`)
}

export function warn(message: string) {
  console.log(`🟠 ${message}`)
}

export function info(message: string) {
  console.log(`🔵 ${message}`)
}

export function succeed(message: string) {
  console.log(`🟢 ${message}`)
}

export default {
  raw,
  fail,
  warn,
  info,
  succeed
}
