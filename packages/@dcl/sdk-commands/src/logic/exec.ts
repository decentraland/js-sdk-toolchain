import type { spawn } from 'child_process'

interface Options {
  env: { [key: string]: string }
  silent: boolean
}

export type IProcessSpawnerComponent = {
  exec(cwd: string, command: string, args: string[], options?: Partial<Options>): Promise<void>
}

export function createProcessSpawnerComponent(spawnFn: typeof spawn): IProcessSpawnerComponent {
  return {
    exec(cwd: string, command: string, args: string[], { env, silent }: Partial<Options> = {}): Promise<void> {
      return new Promise((resolve, reject) => {
        const child = spawnFn(command, args, {
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
            const _ = `${command} ${args.join(' ')}`
            reject(new Error(`Command "${_}" exited with code ${code}. Please try running the command manually`))
            return
          }

          resolve(undefined)
        })
      })
    }
  }
}
