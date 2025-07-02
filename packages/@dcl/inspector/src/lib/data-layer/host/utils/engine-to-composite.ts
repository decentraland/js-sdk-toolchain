import {
  ComponentData,
  ComponentType,
  Composite,
  CompositeComponent,
  DeepReadonly,
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  PutComponentOperation,
  getCompositeRootComponent,
  Name
} from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { FileSystemInterface } from '../../types'

function componentToCompositeComponentData<T>(
  $case: 'json' | 'binary',
  value: DeepReadonly<T>,
  _component: LastWriteWinElementSetComponentDefinition<T>
): ComponentData {
  if ($case === 'json') {
    return {
      data: {
        $case,
        json: value
      }
    }
  } else {
    const byteBuffer = new ReadWriteByteBuffer()
    _component.schema.serialize(value, byteBuffer)
    return {
      data: {
        $case,
        binary: byteBuffer.toBinary()
      }
    }
  }
}

export function dumpEngineToComposite(engine: IEngine, internalDataType: 'json' | 'binary'): Composite {
  const ignoreEntities: Set<Entity> = new Set()
  const composite: Composite.Definition = {
    version: 1,
    components: []
  }

  const CompositeRoot = getCompositeRootComponent(engine)
  const childrenComposite = Array.from(engine.getEntitiesWith(CompositeRoot))
  if (childrenComposite.length > 0) {
    const compositeComponent: CompositeComponent = {
      name: CompositeRoot.componentName,
      jsonSchema: CompositeRoot.schema.jsonSchema,
      data: new Map()
    }

    for (const [compositeRootEntity, compositeRootValue] of childrenComposite) {
      if (compositeRootEntity === engine.RootEntity) continue

      compositeRootValue.entities.forEach((item) => ignoreEntities.add(item.dest))

      const componentData: ComponentData = componentToCompositeComponentData(
        internalDataType,
        {
          src: compositeRootValue.src,
          entities: []
        },
        CompositeRoot
      )
      compositeComponent.data.set(compositeRootEntity, componentData)
    }

    composite.components.push(compositeComponent)
  }

  const ignoreComponentNames = ['inspector:Selection', 'editor::Toggle', CompositeRoot.componentName]

  for (const itComponentDefinition of engine.componentsIter()) {
    if (ignoreComponentNames.includes(itComponentDefinition.componentName)) continue

    // TODO: will we support APPEND components?
    if (itComponentDefinition.componentType === ComponentType.GrowOnlyValueSet) continue

    const itCompositeComponent: CompositeComponent = {
      name: itComponentDefinition.componentName,
      jsonSchema: itComponentDefinition.schema.jsonSchema,
      data: new Map()
    }

    for (const [entity, value] of engine.getEntitiesWith(itComponentDefinition)) {
      // TODO: see for overrides? check if the value has changed or not (should we tag it?)
      // For now, the entities from children composite are ignored
      if (ignoreEntities.has(entity)) continue

      const componentData: ComponentData = componentToCompositeComponentData(
        internalDataType,
        value,
        itComponentDefinition as LastWriteWinElementSetComponentDefinition<unknown>
      )
      itCompositeComponent.data.set(entity, componentData)
    }

    // TODO: should we save defined component but without entities assigned?
    if (itCompositeComponent.data.size > 0) {
      composite.components.push(itCompositeComponent)
    }
  }
  return composite
}

export function dumpEngineToCrdtCommands(engine: IEngine): Uint8Array {
  const componentBuffer = new ReadWriteByteBuffer()
  const crdtBuffer = new ReadWriteByteBuffer()
  for (const itComponentDefinition of engine.componentsIter()) {
    for (const [entity, value] of engine.getEntitiesWith(itComponentDefinition)) {
      if (value) {
        componentBuffer.resetBuffer()
        itComponentDefinition.schema.serialize(value, componentBuffer)

        PutComponentOperation.write(
          entity,
          0,
          itComponentDefinition.componentId,
          componentBuffer.toBinary(),
          crdtBuffer
        )
      }
    }
  }

  return crdtBuffer.toBinary()
}

/**
 * Generate a TypeScript declaration file with a string literal union type containing all entity names in the scene.
 * This allows for type-safe references to entities by name in scene scripts.
 *
 * @param engine The ECS engine instance
 * @param outputPath The path where the .d.ts file should be written
 * @param typeName The name for the generated type (default: "SceneEntityNames")
 * @param fs FileSystem interface for writing the file
 * @returns Promise that resolves when the file has been written
 */
export async function generateEntityNamesType(
  engine: IEngine,
  outputPath: string = 'scene-entity-names.d.ts',
  typeName: string = 'SceneEntityNames',
  fs: FileSystemInterface
): Promise<void> {
  try {
    // Find the Name component definition
    const NameComponent: typeof Name = engine.getComponentOrNull(Name.componentId) as typeof Name

    if (!NameComponent) {
      throw new Error('Name component not found in engine')
    }

    // Collect all names from entities
    const names: string[] = []
    for (const [_, nameValue] of engine.getEntitiesWith(NameComponent)) {
      if (nameValue.value) {
        names.push(nameValue.value)
      }
    }

    // Sort names for consistency
    names.sort()

    // Remove duplicates
    const uniqueNames = Array.from(new Set(names))

    // Generate valid TypeScript identifiers and handle duplicates in a single pass
    const validNameMap = new Map<string, string>()
    const finalNames: Array<{ original: string; valid: string }> = []

    for (const name of uniqueNames) {
      // Create a valid TypeScript identifier
      let validName = name
        .replace(/[^a-zA-Z0-9_]/g, '_') // Replace non-alphanumeric chars with underscore
        .replace(/^[0-9]/, '_$&') // Prepend underscore if starts with number

      // Handle collision if this valid name already exists
      if (validNameMap.has(validName)) {
        // Add numeric suffix for uniqueness
        let suffix = 1
        while (validNameMap.has(`${validName}_${suffix}`)) {
          suffix++
        }
        validName = `${validName}_${suffix}`
      }

      // Store the mapping and add to result
      validNameMap.set(validName, name)
      finalNames.push({ original: name, valid: validName })
    }

    // Generate the .d.ts file content
    let fileContent = `// Auto-generated entity names from the scene\n\n`

    // Add a constant object with name keys for IDE autocompletion
    fileContent += `\n/**\n * Object containing all entity names in the scene for autocomplete support.\n */\n`
    fileContent += `export enum ${typeName} {\n`

    for (const { original, valid } of finalNames) {
      fileContent += `  ${valid} = "${original}",\n`
    }

    fileContent += `} \n`

    // Check if file exists and compare content before writing
    const fileExists = await fs.existFile(outputPath)
    if (fileExists) {
      const existingContent = (await fs.readFile(outputPath)).toString('utf-8')
      if (existingContent === fileContent) {
        // Content is identical, no need to write
        return
      }
    }

    // Write to file only if content is different or file doesn't exist
    await fs.writeFile(outputPath, Buffer.from(fileContent, 'utf-8'))
  } catch (e) {
    console.error('Fail to generate entity names types', e)
  }
}
