import Ajv, { JTDDataType } from "ajv/dist/jtd"
import { FileSystemInterface } from "../../data-layer/types"
import { InspectorPreferences, getDefaultInspectorPreferences } from "./types"

function fromPartialToFull<Type extends object>(partial: Partial<Type>, defaultFull: Type): Type {
  const result = {...defaultFull}
  for (let key in partial) {
    const value = partial[key]
    if (value !== undefined && value !== null)
      result[key] = value
  }
  return result
}

/*
  Preferences file is a JSON dictionary with version and data fields.
  This outer structure is called 'shell'.
  Version 1's data is a 1-level deep dictionary, i.e.
  type dataV1 = {[key: string]: string | number | boolean}.
  Every preference (key) is treated as optional.
  Example of valid file:
  {
    "version": 1,
    "data": {
      "autosaveEnabled": true
    }
  }
*/
const shellSchema = {
  properties: {
    version: {type: 'uint16'},
    data: {properties: {}, additionalProperties: true}
  }
}
const v1Schema = {
  optionalProperties: {
    cameraInvertXAxis: {type: 'boolean'},
    cameraInvertYAxis: {type: 'boolean'},
    autosaveEnabled: {type: 'boolean'}
  }
} as const
type JsonPreferencesV1 = JTDDataType<typeof v1Schema>

const ajv = new Ajv()
const validateShell = ajv.compile<JTDDataType<typeof shellSchema>>(shellSchema)
const validateV1 = ajv.compile<JsonPreferencesV1>(v1Schema)

export class InvalidPreferences extends Error {}

export function parseInspectorPreferences(content: string): InspectorPreferences {
  let jsonContent
  try {
    jsonContent = JSON.parse(content)
  } catch (err) {
    throw new InvalidPreferences(`invalid json: ${err}`)
  }

  if (!validateShell(jsonContent)) {
    throw new InvalidPreferences(`invalid shell: ${ajv.errorsText(validateShell.errors)}`)
  }

  if (jsonContent.version === 1) {
    if (validateV1(jsonContent.data)) {
      return fromPartialToFull(jsonContent.data, getDefaultInspectorPreferences())
    } else {
      throw new InvalidPreferences(`invalid v1 data: ${ajv.errorsText(validateV1.errors)}`)
    }
  } else {
    throw new InvalidPreferences(`invalid version: ${jsonContent.version}`)
  }
}

export async function readPreferencesFromFile(fs: FileSystemInterface, path: string): Promise<InspectorPreferences> {
  const fileExists = await fs.existFile(path)
  if (!fileExists)
    return getDefaultInspectorPreferences()

  const fileContent = await fs.readFile(path)
  try {
    return parseInspectorPreferences(fileContent.toString('utf-8'))
  } catch (error) {
    if (error instanceof InvalidPreferences) {
      console.log(`bad preferences file: ${error}, returning default preferences`)
      return getDefaultInspectorPreferences()
    } else {
      throw error
    }
  }  
}

export function serializeInspectorPreferences(value: InspectorPreferences): Buffer {
  return Buffer.from(JSON.stringify({version: 1, data: value}, null, 2), 'utf-8')
}
