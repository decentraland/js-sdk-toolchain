import { Engine } from '../../packages/@dcl/ecs/src'
import { createTestRuntime } from '../../packages/@dcl/sdk/src/testing/runtime'
import { TestingModule } from '../../packages/@dcl/sdk/src/testing/types'

type LoggedResult = { name: string; ok: boolean; error?: string }

function makeTestingModule(results: LoggedResult[]): TestingModule {
  return {
    logTestResult: jest.fn(async (result: LoggedResult) => {
      results.push(result)
      return {}
    }),
    plan: jest.fn(async () => ({})),
    setCameraTransform: jest.fn(async () => ({}))
  } as unknown as TestingModule
}

/** Runs enough frames for the runner to pick up and finish its queue. */
async function runFrames(engine: ReturnType<typeof Engine>, frames = 8) {
  const failures: unknown[] = []
  for (let frame = 0; frame < frames; frame++) {
    await engine.update(1 / 30).catch((error) => failures.push(error))
  }
  return failures
}

describe('when a test yields a function that throws', () => {
  let engine: ReturnType<typeof Engine>
  let results: LoggedResult[]
  let updateFailures: unknown[]

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})

    engine = Engine()
    results = []
    const runtime = createTestRuntime(makeTestingModule(results), engine as any)
    runtime.test('throws inside a yielded function', function* () {
      yield () => {
        throw new Error('boom')
      }
    })

    updateFailures = await runFrames(engine)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should not let the failure escape into the engine update', () => {
    expect(updateFailures).toEqual([])
  })

  it('should report the test as failed', () => {
    expect(results).toEqual([expect.objectContaining({ name: 'throws inside a yielded function', ok: false })])
  })

  it('should report the thrown message', () => {
    expect(results[0]?.error).toContain('boom')
  })
})

describe('when a test rejects with a value that is not an error', () => {
  let engine: ReturnType<typeof Engine>
  let results: LoggedResult[]

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})

    engine = Engine()
    results = []
    const runtime = createTestRuntime(makeTestingModule(results), engine as any)
    runtime.test('throws undefined', function* () {
      throw undefined
    })
    runtime.test('runs after it', function* () {
      yield
    })

    await runFrames(engine)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should report the failing test', () => {
    expect(results[0]).toEqual(expect.objectContaining({ name: 'throws undefined', ok: false }))
  })

  it('should still run the test scheduled after it', () => {
    expect(results.map((result) => result.name)).toEqual(['throws undefined', 'runs after it'])
  })
})
