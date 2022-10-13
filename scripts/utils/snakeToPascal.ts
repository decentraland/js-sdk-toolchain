export function snakeToPascal(str: string) {
  return str
    .split('_')
    .map(($) => {
      return upperFirst($.split('/').map(upperFirst).join('/'))
    })
    .join('')
}

function upperFirst(str: string) {
  return str.slice(0, 1).toUpperCase() + str.slice(1, str.length)
}
