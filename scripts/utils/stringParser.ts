export function getBlock(str: string, fromPosition: number) {
  let level = 0
  let from, to
  for (let i = fromPosition; i < str.length; i++) {
    const c = str.charAt(i)
    if (c === '{') {
      level++
      if (level === 1) from = i
    }
    if (c === '}') {
      level--
      if (level === 0) {
        to = i
        break
      }
    }
  }

  if (from && to) {
    return str.substring(from + 1, to)
  } else {
    return ''
  }
}
