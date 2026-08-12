import { spawn, SpawnOptions } from 'child_process'
import { release } from 'os'

function isWsl(): boolean {
  return process.platform === 'linux' && release().toLowerCase().includes('microsoft')
}

export default async function open(target: string): Promise<void> {
  const protocol = new URL(target).protocol
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`Refusing to open non-http(s) URL: ${target}`)
  }
  const spawnOptions: SpawnOptions = { stdio: 'ignore', detached: true }
  let command: string
  let args: string[]
  if (process.platform === 'darwin') {
    command = 'open'
    args = [target]
  } else if (process.platform === 'win32') {
    // libuv's CRT-style quoting mangles the '""' title arg, so hand cmd the exact line
    command = 'cmd'
    args = ['/c', `start "" "${target}"`]
    spawnOptions.windowsVerbatimArguments = true
  } else if (isWsl()) {
    command = 'cmd.exe'
    args = ['/c', 'start', '""', target.replace(/&/g, '^&')]
  } else {
    command = 'xdg-open'
    args = [target]
  }
  const child = spawn(command, args, spawnOptions)
  // opening the browser is best-effort: without this handler a missing
  // xdg-open/open/cmd (headless, containers) crashes the CLI
  child.on('error', () => {})
  child.unref()
}
