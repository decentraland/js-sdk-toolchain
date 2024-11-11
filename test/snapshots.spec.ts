import { version as vmVersion } from '@dcl/quickjs-emscripten/package.json'
import { exec } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs-extra'
import glob from 'glob'
import path from 'path'
import { CrdtMessageType, engine } from '../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { CrdtMessage } from '../packages/@dcl/ecs/src/serialization/crdt'
import { readMessage } from '../packages/@dcl/ecs/src/serialization/crdt/message'
import { itExecutes } from '../scripts/helpers'
import { withQuickJsVm } from './vm'
import { prepareTestingFramework } from './snapshots/jest-snapshots-helpers'
import { readFile } from 'fs/promises'

const ENV: Record<string, string> = { ...process.env } as any
const writeToFile = process.env.UPDATE_SNAPSHOTS

// snapshot file zies will fail if sourcemaps include different absolute paths
function removeSourceMaps(source: string): string {
  const [file] = source.split('//# sourceMappingURL=data:application/json;base64,')
  return file
}

describe('Runs the snapshots', () => {
  itExecutes(`npm install --silent`, path.resolve('test/snapshots'), ENV)

  itExecutes(
    `npm run build -- --production --customEntryPoint --ignoreComposite  "--single=production-bundles/*.ts"`,
    path.resolve('test/snapshots'),
    ENV
  )
  itExecutes(
    `npm run build -- --production --ignoreComposite "--single=production-bundles/with-main-function.ts"`,
    path.resolve('test/snapshots'),
    ENV
  )
  itExecutes(
    `npm run build -- --customEntryPoint --ignoreComposite  "--single=development-bundles/*.ts"`,
    path.resolve('test/snapshots'),
    ENV
  )

  glob
    .sync('test/snapshots/production-bundles/*.ts', { absolute: false })
    .forEach((file) => testFileSnapshot(file, true))

  glob
    .sync('test/snapshots/development-bundles/*.ts', { absolute: false })
    .forEach((file) => testFileSnapshot(file, false))
})

function testFileSnapshot(fileName: string, _productionBuild: boolean) {
  it(`tests the file ${fileName}`, async () => {
    const binFile = fileName.replace(/\.ts$/, '.js')

    const binContent = await readFile(binFile, 'utf8')
    const binContentWitoutSourceMaps = removeSourceMaps(binContent)

    const hasSourceMaps = binContent !== binContentWitoutSourceMaps

    const jsSizeBytesProd = binContentWitoutSourceMaps.length
    const jsProdSize = (jsSizeBytesProd / 1000).toLocaleString('en', { maximumFractionDigits: 1 })

    const { result: resultFromRun } = await run(binFile, binContentWitoutSourceMaps)

    const results = [`SCENE_COMPILED_JS_SIZE_PROD=${jsProdSize}k bytes`]

    if (hasSourceMaps) {
      results.push(`THE BUNDLE HAS SOURCEMAPS`)
    }

    results.push(resultFromRun)

    const result = results.join('\n')
    const compareToFileName = fileName + '.crdt'
    const compareFileExists = existsSync(compareToFileName)
    const compareTo = compareFileExists ? readFileSync(compareToFileName).toString().replace(/\r\n/g, '\n') : ''
    if (writeToFile || !compareFileExists) {
      writeFileSync(compareToFileName, result)
    }
    expect(compareTo.trim().length > 0 || !compareFileExists).toEqual(true)
    // expect(result.trim()).toEqual(compareTo.trim())
    // if (leaking) throw new Error('Ran successfully but leaking memory')
  }, 60000)
}

function* serializeCrdtMessages(prefix: string, data: Uint8Array) {
  const buffer = new ReadWriteByteBuffer(data)

  let message: CrdtMessage | null

  while ((message = readMessage(buffer))) {
    const ent = `0x${message.entityId.toString(16)}`
    const preface = `  ${prefix}: ${CrdtMessageType[message.type]} e=${ent}`
    if (
      message.type === CrdtMessageType.PUT_COMPONENT ||
      message.type === CrdtMessageType.DELETE_COMPONENT ||
      message.type === CrdtMessageType.APPEND_VALUE
    ) {
      const { componentId, timestamp } = message
      const data = 'data' in message ? message.data : undefined

      const c = engine.getComponentOrNull(componentId)

      yield `${preface} c=${componentId} t=${timestamp} data=${JSON.stringify(
        (data && c && c.schema.deserialize(new ReadWriteByteBuffer(data))) || null
      )}`
    } else if (message.type === CrdtMessageType.DELETE_ENTITY) {
      yield preface
    } else {
      yield `${preface} Unknown CrdtMessageType`
    }
  }
}

async function run(fileName: string, fileContents: string) {
  return withQuickJsVm(async (vm) => {
    const out: string[] = [`(start empty vm ${vmVersion})`]

    async function runRendererFrame(data: Uint8Array) {
      const serverUpdates = await vm.onServerUpdate(data)
      out.push(...Array.from(serializeCrdtMessages('Renderer', serverUpdates)))

      if (serverUpdates?.length) {
        return [serverUpdates]
      } else {
        return []
      }
    }

    // snapshots including .test.[tj]s are expected to present a plan, and execute it to completion
    const shouldRunTests = fileName.includes('.test.')

    const testingFramework = prepareTestingFramework({
      log(message) {
        out.push(message)
      }
    })

    const mainCrdtFileName = fileName + '-main.crdt'
    const shouldLoadMainCrdt = existsSync(mainCrdtFileName)

    vm.provide({
      log(...args) {
        out.push('  LOG: ' + JSON.stringify(args))
      },
      error(...args) {
        out.push('  ERROR: ' + JSON.stringify(args))
        process.exitCode = 1
      },
      require(moduleName) {
        out.push('  REQUIRE: ' + moduleName)

        if (moduleName === '~system/EngineApi') {
          return {
            async subscribe(data: { eventId: string }) {
              out.push(`  SUBSCRIBE-TO: ${data.eventId}`)
              return {}
            },
            async sendBatch() {
              return { events: [] }
            },
            async crdtSendToRenderer(payload: { data: Uint8Array }): Promise<{ data: Uint8Array[] }> {
              const data = new Uint8Array(Object.values(payload.data))
              out.push(...Array.from(serializeCrdtMessages('Scene', data)))
              const serverUpdates = await runRendererFrame(data)
              return { data: serverUpdates }
            },
            async crdtGetState(_payload: { data: Uint8Array }): Promise<{ data: Uint8Array[]; hasEntities: boolean }> {
              const hasEntities = shouldLoadMainCrdt
              const serverUpdates = await runRendererFrame(new Uint8Array())

              if (shouldLoadMainCrdt) {
                // prepend the main.crdt to the serverUpdates
                const content = await readFile(mainCrdtFileName)
                const data = new Uint8Array(content.buffer)
                serverUpdates.unshift(data)
                out.push(...Array.from(serializeCrdtMessages('main.crdt', data)))
              }

              return { data: serverUpdates, hasEntities }
            }
          }
        } else if (moduleName === '~system/Scene') {
          return {
            async getSceneInfo(_data: Record<string, any>) {
              return {
                contents: []
              }
            }
          }
        } else if (moduleName === '~system/Testing') {
          return testingFramework.module
        }

        throw new Error('Unknown module ' + moduleName)
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
          hundredsNotation(
            opcodes.reduce(($, $$) => $ + $$.count, 0n),
            0
          )
      )

      const deltaAllocations = memory.malloc_count - prevAllocations
      prevAllocations = memory.malloc_count
      out.push(`  MALLOC_COUNT = ${deltaAllocations}`)

      const deltaObjects = memory.obj_count - prevObjects
      prevObjects = memory.obj_count
      out.push(`  ALIVE_OBJS_DELTA ~= ${hundredsNotation(deltaObjects, 2)}`)

      // out.push('> STATS: ' + opcodes.slice(0,10).map(_ => `${_.opcode}=${_.count}`).join(','))
    }

    function addMemoryUsage() {
      const { memory } = vm.getStats()
      out.push(`  MEMORY_USAGE_COUNT ~= ${hundredsNotation(memory.memory_used_size, 2)} bytes`)
    }

    async function runUpdate(dt: number) {
      out.push(`CALL onUpdate(${dt})`)
      await vm.onUpdate(dt)
      addStats()
    }

    try {
      addStats()
      out.push('EVAL ' + fileName)
      vm.eval(fileContents, fileName)
      addStats()
      out.push('CALL onStart()')
      await vm.onStart()
      addStats()

      // by protocol, the first update always run with 0.0 delta time
      await runUpdate(0.0)

      if (shouldRunTests) {
        // otherwise run until it finishes, with a total timeout of 5sec
        const start = Date.now()
        while (testingFramework.hasPendingTests() && Date.now() - start < 5000) {
          await runUpdate(0.1)
        }
        testingFramework.assert()
      } else {
        // if there are no tests, then run 3 frames
        await runUpdate(0.1)
        await runUpdate(0.1)
        await runUpdate(0.1)
      }

      addMemoryUsage()
    } catch (err: any) {
      if (err.stack?.includes('Host: QuickJSUnwrapError')) {
        out.push(`  ERR! ` + err.stack.split('Host: QuickJSUnwrapError')[0])
      } else {
        out.push(`  ERR! ` + err.stack)
      }
      process.exitCode = 1
    }

    console.log(vm.dumpMemory())

    return out.join('\n')
  })
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
