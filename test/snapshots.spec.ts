import { exec } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs-extra'
import glob from 'glob'
import path from 'path'
import {
  CrdtMessageType,
  CrdtMessageHeader,
  engine
} from '../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../packages/@dcl/ecs/src/serialization/ByteBuffer'
import CrdtMessageProtocol, {
  DeleteComponent,
  DeleteEntity,
  PutComponentOperation
} from '../packages/@dcl/ecs/src/serialization/crdt'
import { withQuickJsVm } from './vm'
import { version as vmVersion } from '@dcl/quickjs-emscripten/package.json'

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
    const { result, leaking } = await run(fileName.replace(/\.ts$/, '.js'))

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
    if (leaking) throw new Error('Ran successfully but leaking memory')
  }, 60000)
}

async function run(fileName: string) {
  return withQuickJsVm(async (vm) => {
    const out: string[] = [`(start empty vm ${vmVersion})`]

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

            const buffer = new ReadWriteByteBuffer(
              new Uint8Array(Object.values(payload.data))
            )

            let header: CrdtMessageHeader | null
            while ((header = CrdtMessageProtocol.getHeader(buffer))) {
              if (
                header.type === CrdtMessageType.PUT_COMPONENT ||
                header.type === CrdtMessageType.DELETE_COMPONENT
              ) {
                const message =
                  header.type === CrdtMessageType.DELETE_COMPONENT
                    ? DeleteComponent.read(buffer)!
                    : PutComponentOperation.read(buffer)!
                const { entityId, componentId, timestamp } = message
                const data =
                  message.type === CrdtMessageType.PUT_COMPONENT
                    ? message.data
                    : undefined

                const c = engine.getComponent(componentId)

                out.push(
                  `  CRDT: e=0x${entityId.toString(
                    16
                  )} c=${componentId} t=${timestamp} data=${JSON.stringify(
                    data && c.deserialize(new ReadWriteByteBuffer(data))
                  )}`
                )
              } else if (header.type === CrdtMessageType.DELETE_ENTITY) {
                const entityId = DeleteEntity.read(buffer)!.entityId
                out.push(`  CRDT: e=0x${entityId?.toString(16)} deleted`)
              } else {
                throw new Error('Unknown CrdtMessageType')
              }
            }

            return { data: [] }
          }
        }
      }
    })

    let prevAllocations = 0
    let prevObjects = 0

    function hundredsNotation(num: number | bigint, resolution = 1) {
      return (Number(num) / 100 / 10).toFixed(resolution) + 'k'
    }

    function addStats() {
      const { opcodes, memory } = vm.getStats()
      opcodes
        .sort((a, b) => {
          if (a.count > b.count) return -1
          return 1
        })
        .filter(($) => $.count > 10)

      out.push(
        '  OPCODES ~= ' +
          hundredsNotation(opcodes.reduce(($, $$) => $ + $$.count, 0n), 0)
      )

      const deltaAllocations = memory.malloc_count - prevAllocations
      prevAllocations = memory.malloc_count
      out.push(`  MALLOC_COUNT = ${deltaAllocations}`)

      const deltaObjects = memory.obj_count - prevObjects
      prevObjects = memory.obj_count
      out.push(`  ALIVE_OBJS_DELTA ~= ${hundredsNotation(deltaObjects, 2)}`)

      // out.push('> STATS: ' + opcodes.slice(0,10).map(_ => `${_.opcode}=${_.count}`).join(','))
    }

    try {
      addStats()
      out.push('EVAL ' + fileName)
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

    console.log(vm.dumpMemory())

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
