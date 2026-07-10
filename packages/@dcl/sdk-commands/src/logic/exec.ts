import type { spawn } from 'child_process'

interface Options {
  env: { [key: string]: string }
  silent: boolean
  // default true; false spawns the binary directly (no shell quoting, and kill() reaches
  // the binary itself - on Windows killing the wrapping shell leaves grandchildren alive)
  shell: boolean
}

export type IProcessSpawnerComponent = {
  exec(cwd: string, command: string, args: string[], options?: Partial<Options>): Promise<void>
}

export function createProcessSpawnerComponent(spawnFn: typeof spawn): IProcessSpawnerComponent {
  return {
    exec(cwd: string, command: string, args: string[], { env, silent, shell }: Partial<Options> = {}): Promise<void> {
      return new Promise((resolve, reject) => {
        const child = spawnFn(command, args, {
          shell: shell ?? true,
          cwd,
          env: { ...process.env, NODE_ENV: '', ...env }
        })

        if (!silent) {
          child.stdout.pipe(process.stdout)
          child.stderr.pipe(process.stderr)
        }

        const cleanup = () => {
          if (!child.killed) child.kill('SIGTERM')
        }

        process.on('SIGTERM', cleanup)
        process.on('SIGINT', cleanup)
        process.on('exit', cleanup)

        const offCleanup = () => {
          process.off('SIGTERM', cleanup)
          process.off('SIGINT', cleanup)
          process.off('exit', cleanup)
        }

        // without a shell, a missing binary emits 'error' (ENOENT) and never 'close'
        child.on('error', (error: Error) => {
          offCleanup()
          reject(new Error(`Command "${command}" failed: ${error.message}`))
        })

        child.on('close', (code: number) => {
          offCleanup()

          // Don't reject if we killed the child during shutdown
          if (code !== 0 && !child.killed) {
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
