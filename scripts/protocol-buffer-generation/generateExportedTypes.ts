import fs from 'fs'
import path from 'path'
import { snakeToPascal } from '../utils/snakeToPascal'

function generaeteTypes(files: { name: string; path: string }[]) {
  return `${files
    .map(
      (f) => `import * as ${f.name} from '.${f.path}.gen'
export type { ${f.name} }
`
    )
    .join('\n')}`
}

const sdkCommonPath = '/pb/decentraland/sdk/components/common'
const commonPath = '/pb/decentraland/common'

export default function generateTypes(pathDir: string) {
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
  ].filter((f) => f.name !== 'PbId')

  const typesContent = generaeteTypes(files)
  fs.writeFileSync(path.resolve(pathDir, 'types.gen.ts'), typesContent)
}
