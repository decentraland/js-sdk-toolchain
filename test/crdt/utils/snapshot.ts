import fs from 'fs-extra'
import path from 'path'
import { createInterface } from 'readline'

import {
  CRDTMessage,
  CRDTMessageType,
  State
} from '../../../packages/@dcl/crdt/src'
import { dataToString, stateToString } from './state'

export function getDataPath(fileName: string) {
  return path.resolve(__dirname, '..', 'data', fileName)
}

export async function* readByLine(fileName: string) {
  try {
    const fileStream = fs.createReadStream(getDataPath(fileName))
    const interf = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })
    for await (const line of interf) {
      yield line
    }
  } catch (e) {
    throw new Error(`Expect ${fileName} to exists at data/ folder`)
  }
}

export function snapshotTest<T = unknown>() {
  const messages: CRDTMessage<string>[] = []

  function getDataPath(fileName: string) {
    return path.resolve(__dirname, '..', 'data', path.basename(fileName))
  }

  function getfileNameFromSpec(spec: string) {
    return path
      .relative(process.cwd(), spec)
      .replace('.ts', '')
      .replace('test/', '')
      .replace('.spec', '.test')
  }

  async function writeDataFile(fileName: string, data: string) {
    await fs.appendFile(getDataPath(fileName), data)
  }

  async function validateTestIfExists(
    testName: string,
    fileName: string,
    messages: string[]
  ) {
    let start = false
    let index = 0
    for await (const line of readByLine(fileName)) {
      if (line === messages[0]) {
        start = true
      }

      if (!start) continue

      if (start && line === messages[messages.length - 1]) {
        break
      }

      if (start && line !== messages[index]) {
        expect(line).toEqual(messages[index])
      }
      index++
    }

    if (!start) {
      throw new Error(
        `Spec ${testName} missing at ${fileName}. Update snapshots`
      )
    }
  }

  function addMessage(message: CRDTMessage<T>) {
    if (message.type === CRDTMessageType.CRDTMT_PutComponentData) {
      messages.push({ ...message, data: dataToString(message.data) })
    } else {
      messages.push({ ...message })
    }
  }

  async function validateSpec(state: State<T>) {
    const { currentTestName: testName, testPath } = expect.getState()
    const fileName = getfileNameFromSpec(testPath!)
    const messagesToPrint = [
      `# ${testName}`,
      '# Messages sent over the wire',
      ...messages.map((m) => JSON.stringify(m, null, 0)),
      '# End of messages',
      '# Final CRDT State',
      stateToString(state),
      '#'
    ]

    if (!!process.env.DEBUG) {
      messagesToPrint.forEach((m) => console.log(m, '\n'))
    }

    if (process.env.UPDATE_SNAPSHOTS) {
      await writeDataFile(fileName, messagesToPrint.join('\n') + '\n')
    } else {
      await validateTestIfExists(
        testName!,
        getDataPath(fileName),
        messagesToPrint
      )
    }
  }

  return {
    addMessage,
    validateSpec
  }
}

export default snapshotTest
