import { exec } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, rm } from 'fs/promises'
import { CliComponents } from '../../../components'
import { globSync } from 'glob'

const outputPath = 'output'
const explorerPath = process.env.EXPLORER_PATH || '.'

export function runGodotExplorer(
  { logger }: Pick<CliComponents, 'logger'>,
  extraArgs: string,
  timeout: number
): Promise<{ error: boolean; stderr: string; stdout: string }> {
  return new Promise(async (resolve) => {
    if (existsSync(outputPath)) {
      await rm(outputPath, { recursive: true, force: true })
    }

    await mkdir(outputPath, { recursive: true })
    const command = `${explorerPath}/decentraland.godot.client.x86_64 --rendering-driver opengl3 ${extraArgs}`
    logger.info(
      `about to exec: explorerPath: ${explorerPath}, display: ${process.env.DISPLAY}, command: ${command}, timeout: ${timeout}`
    )

    let resolved = false

    const childProcess = exec(command, { timeout }, (error, stdout, stderr) => {
      if (resolved) {
        return
      }

      if (error) {
        for (const f of globSync('core.*')) {
          rm(f).catch(logger.error)
        }
        resolved = true
        return resolve({ error: true, stdout, stderr })
      }
      resolved = true
      resolve({ error: false, stdout, stderr })
    })

    const childProcessPid = childProcess.pid

    childProcess.on('close', (_code, signal) => {
      // timeout sends SIGTERM, we might want to kill it harder
      if (signal === 'SIGTERM') {
        childProcess.kill('SIGKILL')
      }
    })

    setTimeout(() => {
      exec(`kill -9 ${childProcessPid}`, () => {})
      if (!resolved) {
        resolve({ error: true, stdout: '', stderr: 'timeout' })
        resolved = true
      }
    }, timeout + 5_000)
  })
}
