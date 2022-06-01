#!/usr/bin/env node

import { getFilePathsSync } from '../utils/getFilePathsSync'
import { checkProtoComponent, ReturnValue } from './checkProtoComponent'

function getParam(key: string) {
  const index = process.argv.findIndex((item) => item === key)
  return index !== -1 && process.argv.length > index && process.argv[index + 1]
}

async function main() {
  const definitionsPath = getParam('--definitions-path')
  if (!definitionsPath) {
    console.error('Arg --definitions-path is required.')
    process.exit(2)
  }

  const protoComponents = getFilePathsSync(definitionsPath, false)
    .filter((filePath) => filePath.toLowerCase().endsWith('.proto'))
    .map((filePath) => filePath.substring(0, filePath.length - 6))

  const protoComponentPromisesResult = await Promise.all(
    protoComponents.map(async (component) => ({
      returnType: await checkProtoComponent(definitionsPath, component),
      component
    }))
  )

  const failedTests = protoComponentPromisesResult.filter(
    (value) =>
      !(
        value.returnType === ReturnValue.FileNotExists ||
        value.returnType === ReturnValue.Ok
      )
  )
  const newFiles = protoComponentPromisesResult.filter(
    (value) => value.returnType === ReturnValue.FileNotExists
  )

  if (newFiles.length > 0) {
    console.warn(
      `> There are ${
        newFiles.length
      } new components, check every thing is OK! (amount:${newFiles.length}):
      ${newFiles.map((t) => t.component).join(' ')}
      `
    )
  }

  if (failedTests.length) {
    throw new Error(
      `${failedTests
        .map((t) => t.component)
        .join(' ')} doesn't pass the proto-compatibility-test`
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
