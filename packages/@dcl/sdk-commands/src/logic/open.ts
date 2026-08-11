import { spawn } from 'child_process'
import { release } from 'os'

function isWsl(): boolean {
  return process.platform === 'linux' && release().toLowerCase().includes('microsoft')
}

export default async function open(target: string): Promise<void> {
  const protocol = new URL(target).protocol
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`Refusing to open non-http(s) URL: ${target}`)
  }
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [target]]
      : process.platform === 'win32' || isWsl()
        ? // `start` treats the first quoted arg as a window title; `&` must be escaped for cmd
          [isWsl() ? 'cmd.exe' : 'cmd', ['/c', 'start', '""', target.replace(/&/g, '^&')]]
        : ['xdg-open', [target]]
  const child = spawn(command, args, { stdio: 'ignore', detached: true })
  // opening the browser is best-effort: without this handler a missing
  // xdg-open/open/cmd (headless, containers) crashes the CLI
  child.on('error', () => {})
  child.unref()
}
