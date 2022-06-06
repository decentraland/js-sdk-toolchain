---
title: "Component definition"
slug: "contributor/sdk/new-ecs/component-definition"
---

# Definition of a component

A component is a fundamental piece in the ECS paradigm, and for its definition, we will have two properties. The most important is the data structure it houses, and the second is how it can go beyond the context where this component is being dealt with. The component in the same context will be represented natively, but to travel through wires it must have a definition in its serialization.

## Data structure
The data structure must be as it is called, strictly data-oriented, since data will travel through the network. That is, methods/functions cannot be serialized and sent over the network.

For example, the data structure of BoxShape component in the current version 6 of the ECS, can be defined as:
```ts
type BoxShapeType = {
  withCollisions: boolean
  isPointerBlocker: boolean
  visible: boolean
  uvs: number[]
}
```
This only illustrates what type of fields and their representative names, but it is typescript (or javascript) that takes care of its internal representation when it is used in that context at runtime.

## Component serialization

Before talking about how to serialize a component, it is necessary to take into account that we will need a common interface for all of them. Just as letters are needed to form words, and these words in turn can be in different languages, you must have a discrete definition of those letters.

In this case, the letters are declared in the ByteBuffer interface that encompasses a low-level resource that writes and reads well-defined types assimilated by the processor, in C/C++ you can find them: uint8_t, int16_t, float, double, etc. As an addition to this layer, there are arrays of bytes and UTF-8 strings.

Since ByteBuffer provides the letters to make up our words, serialization is left to the component definition. For this, it is necessary to implement both a way to pack the component and another to unpack it, having ByteBuffer available as the builder of this package.

In the current project, implementing this definition is implementing `EcsType<T>`:
```ts
type EcsType<T = any> = {
  serialize(value: T, builder: ByteBuffer): void
  deserialize(reader: ByteBuffer): T
}
```

Following the previous example, and assuming that we decide to use JSON, we can define BoxShape as follows:
```ts
type BoxShapeType = {
  withCollisions: boolean
  isPointerBlocker: boolean
  visible: boolean
  uvs: number[]
}

const BoxShape: EcsType<BoxShapeType> = {
  serialize(value: BoxShapeType, builder: ByteBuffer): void {
    builder.writeString(JSON.stringify(value))
  }
  deserialize(reader: ByteBuffer): BoxShapeType {
    return JSON.parse(builder.readString())
  }
}
```

Here the job of serializing falls entirely on JSON, as the opposite extreme we can have:

```ts
const BoxShape: EcsType<BoxShapeType> = {
  serialize(value: BoxShapeType, builder: ByteBuffer): void {
    builder.writeInt8(value.visible ? 1 : 0)
    builder.writeInt8(value.withCollisions ? 1 : 0)
    builder.writeInt8(value.isPointerBlocker ? 1 : 0)
    builder.writeUint16(value.uvs.length)
    for (let i = 0; i < value.uvs.length; i++) {
      builder.writeFloat32(value.uvs[i])
    }
  }
  deserialize(reader: ByteBuffer): BoxShapeType {
    return {
      visible: reader.readByte() === 1,
      isPointerBlocker: reader.readByte() === 1,
      withCollisions: reader.readByte() === 1,
      uvs: Array.from({ length: reader.readUint16() }, () => reader.readFloat32())
    }
  }
}
```

This last implementation has the advantage of being faster in both directions and also of a much shorter length since the schema is not serialized. However, in the face of a future modification, it is very limited, especially in deprecating existing fields, and maintaining compatibility between versions would become exhausting.

There are intermediate solutions such as proto buffer, flatbuffer, or cap'n proto, each with its advantages and disadvantages.