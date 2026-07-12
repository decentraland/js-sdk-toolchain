import { spawn } from 'child_process'

export default async function open(target: string): Promise<void> {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [target]]
      : process.platform === 'win32'
        ? // `start` treats the first quoted arg as a window title; `&` must be escaped for cmd
          ['cmd', ['/c', 'start', '""', target.replace(/&/g, '^&')]]
        : ['xdg-open', [target]]
  const child = spawn(command, args, { stdio: 'ignore', detached: true })
  child.unref()
}
