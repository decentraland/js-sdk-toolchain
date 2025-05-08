export function isValidHttpsUrl(url: string): boolean {
  const regex = new RegExp(
    /https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
  )
  return !!url.match(regex)
}
