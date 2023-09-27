import fs from 'fs'
import path from 'path'
import { snakeToPascal } from '../utils/snakeToPascal'

function generateIndex(files: { name: string; path: string }[]) {
  return `
  export type { Position as PBPosition, Vector2 as PBVector2, Vector3 as PBVector3, Quaternion as PBQuaternion } from './pb/decentraland/common/vectors.gen';
  export type { Color3 as PBColor3, Color4 as PBColor4 } from './pb/decentraland/common/colors.gen';
  ${files
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
  const getFiles = (dir: string, pathname: string) =>
    fs.readdirSync(dir + pathname).map((file) => {
      const filename = file.replace('.gen.ts', '')
      return {
        filename,
        path: pathname + '/' + filename,
        name: `Pb${snakeToPascal(filename)}`
      }
    })

  const files = [...getFiles(pathDir, sdkCommonPath), ...getFiles(pathDir, commonPath)].filter(
    (f) => !['PbId', 'PbColors', 'PbVectors'].includes(f.name)
  )

  const typesContent = generateIndex(files)
  fs.writeFileSync(path.resolve(pathDir, 'types.gen.ts'), typesContent)
}
