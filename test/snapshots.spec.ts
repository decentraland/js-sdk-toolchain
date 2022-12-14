import WireMessage from '../packages/@dcl/ecs/src/serialization/wireMessage'
import { ByteBuffer, createByteBuffer } from '../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { ComponentOperation as Message } from '../packages/@dcl/ecs/src/serialization/crdt/componentOperation'
import { engine } from '../packages/@dcl/ecs/src'
import { existsSync, readFileSync, writeFileSync } from 'fs-extra'
import path from 'path'
import glob from 'glob'
import { exec } from 'child_process'
import { withQuickJsVm } from './vm'

const CWD = path.resolve('test/snapshots')
const ENV: Record<string, string> = { ...process.env } as any
const writeToFile = true

describe('Runs the snapshots', () => {
  it('runs npm install in the target folder', async () => {
    await runCommand('npm install --silent', CWD, ENV)
  }, 15000)
  glob.sync('test/snapshots/*.ts', { absolute: false }).forEach(testFileSnapshot)
})

function testFileSnapshot(fileName: string) {
  it(`tests the file ${fileName}`, async () => {
    await compile(fileName)
    const result = await run(fileName.replace(/\.ts$/, '.js'))

    const compareToFileName = fileName + '.crdt'
    const compareFileExists = existsSync(compareToFileName)
    const compareTo = compareFileExists ? readFileSync(compareToFileName).toString().replace(/\r\n/g, '\n') : ''
    if (writeToFile || !compareFileExists) {
      writeFileSync(compareToFileName, result)
    }
    expect(compareTo.trim().length > 0 || !compareFileExists).toEqual(true)
    expect(result.trim()).toEqual(compareTo.trim())
  }, 60000)
}

async function run(fileName: string): Promise<string> {
  return withQuickJsVm(async (vm) => {
    const out: string[] = [fileName]

    vm.provide({
      log(...args) {
        out.push('> log: ' + JSON.stringify(args))
      },
      error(...args) {
        out.push('> error: ' + JSON.stringify(args))
      },
      require(moduleName) {
        out.push('> require: ' + moduleName)
        if (moduleName !== '~system/EngineApi') throw new Error('Unknown module')
        return {
          async subscribe() {
            return {}
          },
          async sendBatch() {
            return { events: [] }
          },
          async crdtSendToRenderer(payload: { data: Uint8Array }): Promise<{ data: Uint8Array[] }> {
            console.dir(payload)

            const buffer = createByteBuffer({
              reading: { buffer: new Uint8Array(Object.values(payload.data)), currentOffset: 0 }
            })

            while (WireMessage.validate(buffer)) {
              const offset = buffer.currentReadOffset()
              const message = Message.read(buffer)!
              const { type, entity, componentId, data, timestamp } = message

              const c = engine.getComponent(componentId)

              out.push(`  CRDT: e=${entity} c=${componentId} data=${data}`)
            }

            return { data: [] }
          }
        }
      }
    })
    try {
      vm.eval(readFileSync(fileName).toString())

      out.push('> call onStart()')
      await vm.onStart()
      out.push('> call onUpdate(0.0)')
      await vm.onUpdate(0.0)
      out.push('> call onUpdate(0.1)')
      await vm.onUpdate(0.1)
      out.push('> call onUpdate(0.1)')
      await vm.onUpdate(0.1)
      out.push('> call onUpdate(0.1)')
      await vm.onUpdate(0.1)
    } catch (err: any) {
      out.push(`ERR! ` + err)
    }

    return out.join('\n')
  })
}

async function compile(filename: string) {
  await runCommand(`npm run build --silent -- --single ${path.relative(CWD, filename)}`, CWD, ENV)
}

export function runCommand(command: string, cwd: string, env?: Record<string, string>): Promise<string> {
  return new Promise<string>((onSuccess, onError) => {
    process.stdout.write(
      '\u001b[36min ' + path.relative(process.cwd(), cwd) + ':\u001b[0m ' + path.relative(process.cwd(), command) + '\n'
    )
    exec(command, { cwd, env }, (error, stdout, stderr) => {
      stdout.trim().length && process.stdout.write('  ' + stdout.replace(/\n/g, '\n  ') + '\n')
      stderr.trim().length && process.stderr.write('! ' + stderr.replace(/\n/g, '\n  ') + '\n')
      if (error) {
        onError(stderr || stdout || 'command "' + command + '" failed to execute')
      } else {
        onSuccess(stdout)
      }
    })
  })
}
