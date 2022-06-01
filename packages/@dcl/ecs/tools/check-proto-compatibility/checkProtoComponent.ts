import fetch from 'node-fetch'
import path from 'path'
import { FileDescriptorStandardOption, runCommand } from '../utils/shellCommand'

export enum ReturnValue {
  Ok = 0,
  RequestNotOk = 1,
  ThrownUnexpectedError = 2,
  FetchedFileNotProto = 3,
  FileNotExists = 4
}

export async function checkProtoComponent(
  definitionsPath: string,
  component: string
): Promise<ReturnValue> {
  const remoteComponentBasePath =
    'https://raw.githubusercontent.com/decentraland/ecs/main/src/components/definitions/'

  const remoteComponentPath = `${remoteComponentBasePath}${component}.proto`
  const localComponentPath = path.resolve(definitionsPath, `${component}.proto`)
  try {
    const request = await fetch(remoteComponentPath)

    if (!request.ok) {
      if (request.status === 404) {
        return ReturnValue.FileNotExists
      } else {
        return ReturnValue.RequestNotOk
      }
    }

    const protoContent = await request.text()
    const indexSyntax = protoContent.indexOf('syntax = "proto3";')

    if (indexSyntax === -1) {
      console.error(`${component} remote ${remoteComponentPath} returns the next content without \`syntax = "proto3";\`
      ${protoContent}
      `)

      return ReturnValue.FetchedFileNotProto
    }

    await runCommand({
      command: path.resolve(
        process.cwd(),
        'node_modules',
        '.bin',
        'proto-compatibility-tool'
      ),
      args: [remoteComponentPath, localComponentPath],
      workingDir: process.cwd(),
      fdStandards: FileDescriptorStandardOption.PIPE
    })
  } catch (err) {
    console.error(
      `Error fetching from ${remoteComponentPath} the component ${component}`,
      err
    )
    return ReturnValue.ThrownUnexpectedError
  }

  return ReturnValue.Ok
}
