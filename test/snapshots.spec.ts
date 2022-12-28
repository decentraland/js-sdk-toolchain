import WireMessage from '../packages/@dcl/ecs/src/serialization/wireMessage'
import { createByteBuffer } from '../packages/@dcl/ecs/src/serialization/ByteBuffer'
import {
  engine,
  WireMessageHeader,
  WireMessageEnum
} from '../packages/@dcl/ecs/src'
import { ComponentOperation } from '../packages/@dcl/ecs/src/serialization/messages/componentOperation'
import { existsSync, readFileSync, writeFileSync } from 'fs-extra'
import path from 'path'
import glob from 'glob'
import { exec } from 'child_process'
import { withQuickJsVm } from './vm'

const ENV: Record<string, string> = { ...process.env } as any
const writeToFile = process.env.UPDATE_SNAPSHOTS

describe('Runs the snapshots', () => {
  it('runs npm install in the target folder', async () => {
    await runCommand('npm install --silent', 'test/snapshots', ENV)
  }, 15000)
  glob
    .sync('test/snapshots/*.ts', { absolute: false })
    .forEach((file) => testFileSnapshot(file, 'test/snapshots'))
})

function testFileSnapshot(fileName: string, workingDirectory: string) {
  it(`tests the file ${fileName}`, async () => {
    await compile(fileName, workingDirectory)
    const result = await run(fileName.replace(/\.ts$/, '.js'))

    const compareToFileName = fileName + '.crdt'
    const compareFileExists = existsSync(compareToFileName)
    const compareTo = compareFileExists
      ? readFileSync(compareToFileName).toString().replace(/\r\n/g, '\n')
      : ''
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
        out.push('  LOG: ' + JSON.stringify(args))
      },
      error(...args) {
        out.push('  ERROR: ' + JSON.stringify(args))
      },
      require(moduleName) {
        out.push('  REQUIRE: ' + moduleName)
        if (moduleName !== '~system/EngineApi')
          throw new Error('Unknown module')
        return {
          async subscribe(event: string) {
            out.push(`  SUBSCRIBE-TO: ${event}`)
            return {}
          },
          async sendBatch() {
            return { events: [] }
          },
          async crdtSendToRenderer(payload: {
            data: Uint8Array
          }): Promise<{ data: Uint8Array[] }> {
            // console.dir(payload)

            const buffer = createByteBuffer({
              reading: {
                buffer: new Uint8Array(Object.values(payload.data)),
                currentOffset: 0
              }
            })

            let header: WireMessageHeader | null
            while ((header = WireMessage.getHeader(buffer))) {
              if (
                header.type === WireMessageEnum.PUT_COMPONENT ||
                header.type === WireMessageEnum.DELETE_COMPONENT
              ) {
                const message = ComponentOperation.read(buffer)!
                const { entityId, componentId, timestamp } = message
                const data =
                  message.type === WireMessageEnum.PUT_COMPONENT
                    ? message.data
                    : undefined

                const c = engine.getComponent(componentId)

                out.push(
                  `  CRDT: e=${entityId} c=${componentId} t=${timestamp} data=${JSON.stringify(
                    data &&
                      c.deserialize(
                        createByteBuffer({
                          reading: {
                            buffer: data,
                            currentOffset: 0
                          }
                        })
                      )
                  )}`
                )
              }
            }

            return { data: [] }
          }
        }
      }
    })

    function addStats() {
      const opcodes = vm.getStats()
      opcodes
        .sort((a, b) => {
          if (a.count > b.count) return -1
          return 1
        })
        .filter(($) => $.count > 10)

      out.push(
        '  OPCODES ~= ' +
          (
            Number(opcodes.reduce(($, $$) => $ + $$.count, 0n) / 100n) / 10
          ).toFixed(1) +
          'k'
      )

      // out.push('> STATS: ' + opcodes.slice(0,10).map(_ => `${_.opcode}=${_.count}`).join(','))
    }

    try {
      addStats()
      vm.eval(readFileSync(fileName).toString(), fileName)
      addStats()
      out.push('CALL onStart()')
      await vm.onStart()
      addStats()

      out.push('CALL onUpdate(0.0)')
      await vm.onUpdate(0.0)
      addStats()
      out.push('CALL onUpdate(0.1)')
      await vm.onUpdate(0.1)
      addStats()
      out.push('CALL onUpdate(0.1)')
      await vm.onUpdate(0.1)
      addStats()
      out.push('CALL onUpdate(0.1)')
      await vm.onUpdate(0.1)
      addStats()
    } catch (err: any) {
      if (err.stack?.includes('Host: QuickJSUnwrapError')) {
        out.push(`  ERR! ` + err.stack.split('Host: QuickJSUnwrapError')[0])
      } else {
        out.push(`  ERR! ` + err.stack)
      }
    }

    return out.join('\n')
  })
}

async function compile(filename: string, workingDirectory: string) {
  const cwd = path.resolve(workingDirectory)
  await runCommand(
    `npm run build --silent -- --single ${JSON.stringify(
      path.relative(cwd, filename)
    )}`,
    cwd,
    ENV
  )
}

export function runCommand(
  command: string,
  cwd: string,
  env?: Record<string, string>
): Promise<string> {
  return new Promise<string>((onSuccess, onError) => {
    process.stdout.write(
      '\u001b[36min ' +
        path.relative(process.cwd(), cwd) +
        ':\u001b[0m ' +
        path.relative(process.cwd(), command) +
        '\n'
    )
    exec(command, { cwd, env }, (error, stdout, stderr) => {
      stdout.trim().length &&
        process.stdout.write('  ' + stdout.replace(/\n/g, '\n  ') + '\n')
      stderr.trim().length &&
        process.stderr.write('! ' + stderr.replace(/\n/g, '\n  ') + '\n')
      if (error) {
        onError(
          stderr || stdout || 'command "' + command + '" failed to execute'
        )
      } else {
        onSuccess(stdout)
      }
    })
  })
}
