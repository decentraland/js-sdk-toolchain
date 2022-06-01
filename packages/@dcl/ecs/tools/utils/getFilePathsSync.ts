import fs from 'fs'
import path from 'path'

export function getFilePathsSync(
  dir: string,
  recursive: boolean = true
): string[] {
  // variables
  const fileNames = fs.readdirSync(dir)
  const filePaths = fileNames.map((fileName) => path.resolve(dir, fileName))
  const stats = filePaths.map((filePath) => fs.statSync(filePath))

  // Return value
  const files: string[] = []

  for (const [index, stat] of stats.entries()) {
    if (stat.isDirectory()) {
      if (recursive) {
        const folderFiles = getFilePathsSync(filePaths[index]).map((fileName) =>
          path.resolve(`/${fileNames[index]}`, fileName).substring(1)
        )
        files.push(...folderFiles)
      }
    } else {
      files.push(fileNames[index])
    }
  }

  return files
}

export type PathItem = { path: string; isDirectory: boolean }

export function getPathsSync(
  dir: string,
  recursive: boolean = true
): PathItem[] {
  // variables
  const fileNames = fs.readdirSync(dir)
  const filePaths = fileNames.map((fileName) => path.resolve(dir, fileName))
  const stats = filePaths.map((filePath) => fs.statSync(filePath))

  // Return value
  const files: { path: string; isDirectory: boolean }[] = []

  for (const [index, stat] of stats.entries()) {
    files.push({ path: fileNames[index], isDirectory: stat.isDirectory() })

    if (stat.isDirectory() && recursive) {
      const folderFiles = getPathsSync(filePaths[index]).map((fileName) => ({
        path: path.resolve(`/${fileNames[index]}`, fileName.path).substring(1),
        isDirectory: fileName.isDirectory
      }))
      files.push(...folderFiles)
    }
  }

  return files
}
