export function toStringList(strs: string[]): string {
  return strs.map(($) => `\t* ${$}\n`).join('')
}
