import * as path from 'path'
import { promises } from 'fs'

const fs = promises

const setupExport = async ({
  workDir,
  exportDir,
  mappings,
  sceneJson
}: {
  workDir: string
  exportDir: string
  mappings: any
  sceneJson: any
}): Promise<void> => {
  try {
    const ecsPath = path.dirname(
      require.resolve('decentraland-ecs/package.json', {
        paths: [workDir, __dirname + '/../../', __dirname + '/../']
      })
    )
    const dclKernelPath = path.dirname(require.resolve('@dcl/kernel/package.json', { paths: [workDir, ecsPath] }))
    const dclKernelDefaultProfilePath = path.resolve(dclKernelPath, 'default-profile')
    const dclUnityRenderer = path.dirname(
      require.resolve('@dcl/unity-renderer/package.json', { paths: [workDir, ecsPath] })
    )

    // Change HTML title name
    const content = await fs.readFile(path.resolve(dclKernelPath, 'export.html'), 'utf-8')
    const finalContent = content.replace('{{ scene.display.title }}', sceneJson.display.title)

    await Promise.all([
      // copy project
      fs.writeFile(path.resolve(exportDir, 'index.html'), finalContent, 'utf-8'),
      fs.writeFile(path.resolve(exportDir, 'mappings'), JSON.stringify(mappings), 'utf-8'),

      // copy dependencies
      copyDir(dclUnityRenderer, path.resolve(exportDir, 'unity-renderer')),
      copyDir(dclKernelDefaultProfilePath, path.resolve(exportDir, 'default-profile')),
      fs.copyFile(path.resolve(dclKernelPath, 'index.js'), path.resolve(exportDir, 'index.js'))
    ])
  } catch (err) {
    console.error('Export failed.', err)
    throw err
  }
  return
}

// instead of using fs-extra, create a custom function to no need to rollup
async function copyDir(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true })
  let entries = await fs.readdir(src, { withFileTypes: true })

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name)
    let destPath = path.join(dest, entry.name)

    entry.isDirectory() ? await copyDir(srcPath, destPath) : await fs.copyFile(srcPath, destPath)
  }
}

export = setupExport
