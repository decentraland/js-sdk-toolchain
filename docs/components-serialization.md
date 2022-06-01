
# Intro

TODO 

## Raw types

It consists of directly writing in the buffer to be sent through the wire. Ideally to types that
probably never change and need to be fast. E.g: transform component

TODO:
- typescript
- c#
- json definition?

## Built-in-types

It's possible to build complex data structure with built-in-types. This has a low
the capacity of maintainability just as raw types, but it's fast and another layer behind can be
built to improve its maintainability. E.g: user defined component (because it's easy to use)

Without keys, almost raw types.
TODO:
- typescript
- c#
- json definition?


## Flat Buffers
Flatbuffer has many language supports, it's fast and it has tools for forward-backwards compatibility.
- typescript: flatbuffer compiler auto-generation and post processing
- c#: flatbuffer compiler auto-generation and post processing
- json definition: flatbuffer compiler auto-generation

The goal of post processing is to auto-generated a data-type for typescript and C#
TODO

### Generation and maintain
TODO

### Tests
TODO