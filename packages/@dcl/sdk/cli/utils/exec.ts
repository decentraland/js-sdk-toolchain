import { spawn } from 'child_process'

interface Options {
  env: { [key: string]: string }
  silent: boolean
}

export function exec(
  cwd: string,
  command: string,
  { env, silent }: Partial<Options> = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const [cmd, ...rest] = command.split(' ')
    const child = spawn(cmd, rest, {
      shell: true,
      cwd,
      env: { ...process.env, NODE_ENV: '', ...env }
    })

    if (!silent) {
      child.stdout.pipe(process.stdout)
      child.stderr.pipe(process.stderr)
    }

    child.on('close', (code: number) => {
      if (code !== 0) {
        const command = `${cmd} ${rest.join(' ')}`
        reject(
          new Error(
            `Command "${command}" exited with code ${code}. Please try running the command manually`
          )
        )
        return
      }

      resolve(undefined)
    })
  })
}
