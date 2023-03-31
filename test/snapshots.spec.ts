import { version as vmVersion } from '@dcl/quickjs-emscripten/package.json'
import { exec } from 'child_process'
import { existsSync, readFileSync, stat, writeFileSync } from 'fs-extra'
import glob from 'glob'
import path from 'path'
import { CrdtMessageType, engine } from '../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { CrdtMessage } from '../packages/@dcl/ecs/src/serialization/crdt'
import { readMessage } from '../packages/@dcl/ecs/src/serialization/crdt/message'
import { itExecutes } from '../scripts/helpers'
import { withQuickJsVm } from './vm'
import type { TestPlan, TestResult } from '~system/Testing'

const ENV: Record<string, string> = { ...process.env } as any
const writeToFile = process.env.UPDATE_SNAPSHOTS

describe('Runs the snapshots', () => {
  itExecutes(`npm install --silent`, path.resolve('test/snapshots/production-bundles'), ENV)
  itExecutes(`npm run build -- --production "--single=*.ts"`, path.resolve('test/snapshots/production-bundles'), ENV)

  itExecutes(`npm install --silent`, path.resolve('test/snapshots/development-bundles'), ENV)
  itExecutes(`npm run build -- "--single=*.ts"`, path.resolve('test/snapshots/development-bundles'), ENV)

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

    const jsSizeBytesProd = (await stat(binFile)).size
    const jsProdSize = (jsSizeBytesProd / 1000).toLocaleString('en', { maximumFractionDigits: 1 })

    const { result: resultFromRun, leaking } = await run(binFile)

    const result = `SCENE_COMPILED_JS_SIZE_PROD=${jsProdSize}k bytes\n` + resultFromRun

    const compareToFileName = fileName + '.crdt'
    const compareFileExists = existsSync(compareToFileName)
    const compareTo = compareFileExists ? readFileSync(compareToFileName).toString().replace(/\r\n/g, '\n') : ''
    if (writeToFile || !compareFileExists) {
      writeFileSync(compareToFileName, result)
    }
    expect(compareTo.trim().length > 0 || !compareFileExists).toEqual(true)
    expect(result.trim()).toEqual(compareTo.trim())
    if (leaking) throw new Error('Ran successfully but leaking memory')
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

      const c = engine.getComponent(componentId)

      yield `${preface} c=${componentId} t=${timestamp} data=${JSON.stringify(
        (data && c.schema.deserialize(new ReadWriteByteBuffer(data))) || null
      )}`
    } else if (message.type === CrdtMessageType.DELETE_ENTITY) {
      yield preface
    } else {
      yield `${preface} Unknown CrdtMessageType`
    }
  }
}

async function run(fileName: string) {
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

    const testResults: TestResult[] = []
    const pendingTests = new Set<string>()

    // this function asserts that there are no pending tests, no tests at all or failed tests
    function assertTests() {
      if (!shouldRunTests) return

      if (testResults.length === 0) throw new Error('There are no planned test')

      const failures = testResults.filter(($) => !$.ok)
      const errors: string[] = []

      if (failures.length) {
        for (const failedTest of failures) {
          errors.push(`! Test failed: ${failedTest.name}`)
          errors.push(`  Error ${failedTest.error}`)
          console.error(failedTest.error)
          out.push(`  🔴 Test failed ${failedTest.name}`)
          out.push(`     ${JSON.stringify(failedTest.error)}`)
        }
      }

      if (pendingTests.size) {
        for (const pendingTest of pendingTests) {
          errors.push(`Test timed out: ${pendingTest}`)
          out.push(`  🔴 Test timed out ${pendingTest}`)
        }
      }

      if (errors.length) {
        throw new Error(errors.join('\n'))
      }
    }

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
            async crdtGetState(_payload: { data: Uint8Array }): Promise<{ data: Uint8Array[] }> {
              const serverUpdates = await runRendererFrame(new Uint8Array())
              return { data: serverUpdates }
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
          return {
            async logTestResult(result: TestResult) {
              out.push('  logTestResult: ' + JSON.stringify(result))
              testResults.push(result)
              return {}
            },
            async plan(data: TestPlan) {
              out.push('  testPlan: ' + JSON.stringify(data))
              data.testName.forEach((testName) => pendingTests.add(testName))
              return {}
            },
            async setCameraPosition(transform: any) {
              out.push('   setCameraPosition: ' + JSON.stringify(transform))
              return {}
            }
          }
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
      vm.eval(readFileSync(fileName).toString(), fileName)
      addStats()
      out.push('CALL onStart()')
      await vm.onStart()
      addStats()

      if (!pendingTests.size) {
        // if there are no tests, then run 4 frames
        await runUpdate(0.0)
        await runUpdate(0.1)
        await runUpdate(0.1)
        await runUpdate(0.1)
      } else {
        // otherwise run until it finishes, with a total timeout of 5sec
        const now = Date.now()
        while (pendingTests.size && Date.now() - now < 5000) {
          await runUpdate(0.1)
        }
      }

      assertTests()

      addMemoryUsage()
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
