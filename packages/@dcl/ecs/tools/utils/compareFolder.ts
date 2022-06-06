import { readFileSync } from 'fs-extra'
import { getFilePathsSync } from './getFilePathsSync'
import path from 'path'

/**
 *
 * @param folderA
 * @param folderB
 *
 * @return true if the folder is the same struct and content
 */
export function compareFolders(folderA: string, folderB: string) {
  const filesA = getFilePathsSync(folderA)
  const filesB = getFilePathsSync(folderB)

  console.log(`Comparing folders: 
  -> Folder A: ${folderA}
  -> Folder B: ${folderB}
  `)
  const filesInAButB: string[] = []
  let ok: boolean = true

  for (const file of filesA) {
    const fileBIndex = filesB.findIndex(($) => $ === file)
    if (fileBIndex === -1) {
      filesInAButB.push(file)
      ok = false
    } else {
      filesB.splice(fileBIndex, 1)

      const fileContentA = readFileSync(path.resolve(folderA, file)).toString()
      const fileContentB = readFileSync(path.resolve(folderB, file)).toString()
      if (fileContentA !== fileContentB) {
        console.error(
          `The file ${file} has a difference. Please run \`make build-components\` and commit it.`
        )
        ok = false
      }
    }
  }

  if (filesB.length > 0) {
    console.error(
      `The folder ${folderB} has the next files but ${folderA} doesn't: ${filesB.toString()}`
    )
    ok = false
  }
  if (filesInAButB.length > 0) {
    console.error(
      `The folder ${folderA} has the next files but ${folderB} doesn't: ${filesInAButB.toString()}`
    )
    ok = false
  }

  return ok
}
