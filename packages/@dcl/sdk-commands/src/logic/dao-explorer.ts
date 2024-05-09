import { CliComponents } from '../components'
import { download, extract } from './fs'
import path from 'path'
import { platform } from 'os'
import { CliError } from './error'
import { printProgressInfo } from './beautiful-logs'
import * as tar from 'tar'
import child_process from 'child_process'

enum SupportedPlatform {
  SP_MACOS_ARM64,
  SP_MACOS_X64,
  SP_LINUX_X64,
  SP_WINDOWS_X64,
  SP_UNSUPPORTED
}

const BEVY_BASE_URL =
  'https://github.com/decentraland/bevy-explorer/releases/download/alpha-2024-04-30-22-15-12/bevy-explorer-2024-04-30-22-15-12'
const BEVY_URL_PLATFORM_SUFFIX: Record<SupportedPlatform, string> = {
  [SupportedPlatform.SP_LINUX_X64]: 'linux-x86_64.tar.gz',
  [SupportedPlatform.SP_MACOS_ARM64]: 'macos-m1m2.tar.gz',
  [SupportedPlatform.SP_MACOS_X64]: 'macos-x86_64.tar.gz',
  [SupportedPlatform.SP_WINDOWS_X64]: 'windows-x86_64.zip',
  [SupportedPlatform.SP_UNSUPPORTED]: 'empty'
}

function getPlatform(): SupportedPlatform {
  const os = platform()
  const arch = process.arch
  switch (os) {
    case 'darwin':
      if (arch === 'arm64') {
        return SupportedPlatform.SP_MACOS_ARM64
      } else if (arch === 'x64') {
        return SupportedPlatform.SP_MACOS_ARM64
      } else {
        return SupportedPlatform.SP_UNSUPPORTED
      }
    case 'win32':
      if (arch === 'x64') {
        return SupportedPlatform.SP_WINDOWS_X64
      } else {
        return SupportedPlatform.SP_UNSUPPORTED
      }
    case 'linux':
      if (arch === 'x64') {
        return SupportedPlatform.SP_LINUX_X64
      } else {
        return SupportedPlatform.SP_UNSUPPORTED
      }
    default:
      return SupportedPlatform.SP_UNSUPPORTED
  }
}

function getDaoExplorerPath(workingDirectory: string) {
  return path.resolve(workingDirectory, 'node_modules', '.bin', 'dao-explorer')
}

function getDaoExplorerExecutablePath(workingDirectory: string) {
  const platform = getPlatform()
  if (platform === SupportedPlatform.SP_UNSUPPORTED) {
    throw new CliError('This platform is not supported to run the DAO Explorers.')
  }

  if (platform === SupportedPlatform.SP_WINDOWS_X64) {
    return path.resolve(getDaoExplorerPath(workingDirectory), 'decentra-bevy.exe')
  } else {
    return path.resolve(getDaoExplorerPath(workingDirectory), 'decentra-bevy')
  }
}

export async function ensureDaoExplorer(
  components: Pick<CliComponents, 'logger' | 'fs' | 'fetch'>,
  workingDirectory: string
) {
  const daoExplorerFolderPath = getDaoExplorerPath(workingDirectory)
  const platform = getPlatform()

  if (platform === SupportedPlatform.SP_UNSUPPORTED) {
    throw new CliError('This platform is not supported to run the DAO Explorers.')
  }

  const url = `${BEVY_BASE_URL}-${BEVY_URL_PLATFORM_SUFFIX[platform]}`
  const versionFilePath = path.resolve(daoExplorerFolderPath, 'version')
  if (await components.fs.fileExists(versionFilePath)) {
    const versionContent = await components.fs.readFile(versionFilePath, 'utf-8')
    if (versionContent === url) {
      return
    }
  }

  const tempPackagePath = path.resolve(daoExplorerFolderPath, BEVY_URL_PLATFORM_SUFFIX[platform])
  printProgressInfo(components.logger, `Downloading DAO Explorer ${BEVY_URL_PLATFORM_SUFFIX[platform]} from ${url}`)
  if (await components.fs.fileExists(tempPackagePath)) {
    await components.fs.unlink(tempPackagePath)
  }
  if (await components.fs.directoryExists(daoExplorerFolderPath)) {
    await components.fs.rmdir(daoExplorerFolderPath)
  }
  await components.fs.mkdir(daoExplorerFolderPath, { recursive: true })

  await download(components, url, tempPackagePath)

  if (tempPackagePath.endsWith('.zip')) {
    await extract(tempPackagePath, daoExplorerFolderPath)
  } else if (tempPackagePath.endsWith('.tar.gz') || tempPackagePath.endsWith('.tgz')) {
    await tar.extract({
      C: daoExplorerFolderPath,
      f: tempPackagePath
    })
  }

  await components.fs.writeFile(versionFilePath, url)
}

export function runDaoExplorer(
  components: Pick<CliComponents, 'logger' | 'fs' | 'fetch'>,
  realmUrl: string,
  locationCoords: string,
  workingDirectory: string
) {
  const daoExplorerFolderPath = getDaoExplorerPath(workingDirectory)
  const executablePath = getDaoExplorerExecutablePath(workingDirectory)
  executablePath
  const ts = child_process.spawn(executablePath, ['--server', realmUrl, '--location', locationCoords], {
    env: process.env,
    cwd: daoExplorerFolderPath
  })

  ts.on('close', (code) => {
    /* istanbul ignore else */
    if (code === 0) {
      printProgressInfo(components.logger, `Type checking completed without errors`)
    } else {
      return
    }
  })

  ts.stdout.pipe(process.stdout)
  ts.stderr.pipe(process.stderr)
}
