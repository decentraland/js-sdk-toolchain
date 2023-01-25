import { resolve } from 'path'

import { IFileSystemComponent } from '../../components/fs'
import { exec } from '../../utils/exec'
import { Dict, hasPrimitiveKeys } from '../../utils/object'

/**
 * Required project dirs/files
 */
export const REQUIRED_FILES = {
  PACKAGE_JSON: 'package.json',
  TS_CONFIG_JSON: 'tsconfig.json',
  SCENE_JSON: 'scene.json'
}

/**
 * Required "package.json" structure
 */
export const REQUIRED_PACKAGE_JSON = {}

/**
 * Returns the required files for a project
 */
export const getProjectStructure = () => Object.values(REQUIRED_FILES)

/**
 * Returns true if the project follows a valid scene structure
 */
export const validateProjectStructure = async (
  components: { fs: IFileSystemComponent },
  dir: string,
  fileList: string[]
): Promise<boolean> => {
  const files = await components.fs.readdir(dir)
  const requiredFiles = new Set(fileList)

  for (let i = 0; i < files.length && requiredFiles.size > 0; i++) {
    if (requiredFiles.has(files[i])) {
      requiredFiles.delete(files[i])
    }
  }

  return requiredFiles.size === 0
}

/**
 * Returns true if the project's "package.json" is valid
 */
export const validatePackageJson = async (
  components: { fs: IFileSystemComponent },
  dir: string,
  deps: Dict
): Promise<boolean> => {
  const packageJson = JSON.parse(await components.fs.readFile(resolve(dir, REQUIRED_FILES.PACKAGE_JSON), 'utf-8'))
  return hasPrimitiveKeys(packageJson, deps)
}

/*
 * Returns true if the project contains an empty node_modules folder
 */
export const needsDependencies = async (components: { fs: IFileSystemComponent }, dir: string): Promise<boolean> => {
  const nodeModulesPath = resolve(dir, 'node_modules')
  const hasNodeModulesFolder = await components.fs.existPath(nodeModulesPath)
  const isNodeModulesEmpty = hasNodeModulesFolder && (await components.fs.readdir(nodeModulesPath)).length === 0

  return !hasNodeModulesFolder || isNodeModulesEmpty
}

/* istanbul ignore next */
export const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

/*
 * Runs "npm install" for desired project
 */
export async function installDependencies(dir: string): Promise<void> {
  await exec(dir, `${npm} install`)
}

/**
 * Build's Typescript using "tsconfig.json" file
 */
export const buildTypescript = async ({
  dir,
  watch,
  production
}: {
  dir: string
  watch: boolean
  production: boolean
}): Promise<void> => {
  const command = watch ? 'watch' : 'build'
  await exec(dir, `${npm} run ${command}`, {
    env: { NODE_ENV: production ? 'production' : '' }
  })
}
