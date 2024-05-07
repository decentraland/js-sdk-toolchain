export const toNumber = (value: string, def: number = 0) => {
  const num = Number(value)
  return isNaN(num) ? def : num
}

export const toString = (value: unknown, def: number | string = 0) => (value ?? def).toString()
