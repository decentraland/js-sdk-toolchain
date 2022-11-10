import fs from 'fs'
import path from 'path'
import { snakeToPascal } from '../utils/snakeToPascal'

function generaeteTypes(files: { name: string; path: string }[]) {
  return `${files
    .map(
      (f) => `export * from '.${f.path}.gen'
// export { ${f.name} }
`
    )
    .join('\n')}`
}

const sdkCommonPath = '/pb/decentraland/sdk/components/common'
const commonPath = '/pb/decentraland/common'

export default function generateTypes(pathDir: string) {
  return
  const getFiles = (dir: string, pathname: string) =>
    fs.readdirSync(dir + pathname).map((file) => {
      const filename = file.replace('.gen.ts', '')
      return {
        filename,
        path: pathname + '/' + filename,
        name: `Pb${snakeToPascal(filename)}`
      }
    })

  const files = [
    ...getFiles(pathDir, sdkCommonPath),
    ...getFiles(pathDir, commonPath)
  ].filter((f) => !['PbId'].includes(f.name))

  const typesContent = generaeteTypes(files)
  fs.writeFileSync(path.resolve(pathDir, 'types.gen.ts'), typesContent)
}
