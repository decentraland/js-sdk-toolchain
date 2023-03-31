import type {
  logTestResult,
  plan,
  setCameraPosition,
  TestPlan,
  TestResult,
  SetCameraPositionTestCommand
} from '~system/Testing'

export type TestingModule = {
  logTestResult: typeof logTestResult
  plan: typeof plan
  setCameraPosition: typeof setCameraPosition
}

export function prepareTestingFramework(options: { log: (message: string) => void }) {
  const testResults: TestResult[] = []

  const pendingTests = new Set<string>()

  const module: TestingModule = {
    async logTestResult(result: TestResult) {
      options.log('  ~system/Testing: logTestResult ' + JSON.stringify(result))
      testResults.push(result)
      pendingTests.delete(result.name)
      return {}
    },
    async plan(data: TestPlan) {
      options.log('   ~system/Testing: plan ' + JSON.stringify(data))
      data.testName.forEach((test) => pendingTests.add(test))
      return {}
    },
    async setCameraPosition(transform: SetCameraPositionTestCommand) {
      options.log('   ~system/Testing: setCameraPosition ' + JSON.stringify(transform))

      return {}
    }
  }

  return {
    hasPendingTests() {
      return pendingTests.size > 0
    },
    // Run this after all tests are done
    assert() {
      const failures = testResults.filter(($) => !$.ok)
      const errors: string[] = []

      if (failures.length) {
        for (const failedTest of failures) {
          errors.push(`! Test failed: ${failedTest.name}`)
          errors.push(`  Error ${failedTest.error}`)
          console.error(failedTest.error)
          options.log(`  🔴 Test failed ${failedTest.name}`)
          options.log(`  ${JSON.stringify(failedTest.error)}`)
        }
      }

      if (pendingTests.size) {
        for (const pendingTest of pendingTests) {
          errors.push(`Test timed out: ${pendingTest}`)
          options.log(`  🔴 Test timed out ${pendingTest}`)
        }
      }

      if (!pendingTests.size && testResults.length === 0) throw new Error('There are no planned test')

      if (errors.length) {
        throw new Error(errors.join('\n'))
      }
    },
    module
  }
}
