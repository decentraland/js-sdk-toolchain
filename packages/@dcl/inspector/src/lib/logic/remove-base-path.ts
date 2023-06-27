export const removeBasePath = (basePath: string, path: string) => {
  return basePath ? path.replace(basePath + '/', '') : path
}
