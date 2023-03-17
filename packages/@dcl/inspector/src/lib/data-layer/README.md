# Data layer
See `architecture.excalidraw.svg` to a diagram.

- `client/`: contains the RpcClient constructor to expose the Data-Layer API
- `host/`: contains the RpcServer logic
- `proto/`: the `data-layer.proto` contains the interface definition of the Data-Layer API 

## How it works?
Currently, the two clients available is `local` and `ws`.
- `Local`: it instances the wrapper to a local host in the same app, it needs a FileSystemInterface: in web this could be an in-memory (like `memfs` or the `in-memory-storage`), and in a server it just could be a wrapper to the FileSystem.
- `Ws`: instance a RpcClient by a WebSocket transport
