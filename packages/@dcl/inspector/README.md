# @dcl/inspector

A React-based scene editor interface for Decentraland, providing a modular architecture for scene editing and manipulation.

## Features

- **Entity Hierarchy**: Tree-based scene management with component operations
- **Component Inspector**: Specialized editors for all component types
- **Level Editor**: 3D scene visualization with Babylon.js
- **Asset Management**: Local assets, custom items, and asset packs support

## Installation

```bash
npm install @dcl/inspector
```

## Quick Start

1. Start the CLI server:

```bash
npx @dcl/sdk-commands start --data-layer --port 8001
```

2. Serve the inspector (choose one method):

```bash
# Method 1: Development server
git clone https://github.com/decentraland/js-sdk-toolchain.git
cd packages/@dcl/inspector
npm start

# Method 2: From node_modules
npm install @dcl/inspector
npx http-server node_modules/@dcl/inspector/public
```

3. Access the Inspector:

```
http://localhost:3000/?dataLayerRpcWsUrl=ws://127.0.0.1:8001/data-layer
```

Where `http://localhost:3000` is the URL of the Inspector and `ws://127.0.0.1:8001/data-layer` is the WebSocket URL of the CLI server.

## Integration

The Inspector supports two integration approaches:

### WebSocket Integration

For development environments using the CLI:

```typescript
// Connect to CLI's WebSocket server
const inspectorUrl = `http://localhost:3000/?dataLayerRpcWsUrl=ws://127.0.0.1:8001/data-layer`
```

### IFrame Integration

For web applications embedding the Inspector:

```typescript
function initRpc(iframe: HTMLIFrameElement) {
  const transport = new MessageTransport(window, iframe.contentWindow!)
  const storage = new StorageRPC(transport)

  // Handle file operations
  storage.handle('read_file', async ({ path }) => {
    return fs.readFile(path)
  })

  storage.handle('write_file', async ({ path, content }) => {
    await fs.writeFile(path, content)
  })

  // ... other handlers

  return {
    storage,
    dispose: () => storage.dispose()
  }
}

function InspectorComponent() {
  const iframeRef = useRef()

  const handleIframeRef = useCallback((iframe) => {
    if (iframe) {
      iframeRef.current = initRpc(iframe)
    }
  }, [])

  useEffect(() => {
    return () => iframeRef.current?.dispose()
  }, [])

  const params = new URLSearchParams({
    dataLayerRpcParentUrl: window.location.origin
  })
  const inspectorUrl = `http://localhost:3000/`
  const url = `${inspectorUrl}?${params}`

  return <iframe onLoad={handleIframeRef} src={url} />
}
```

## Configuration

Configure the Inspector through URL parameters or a global object. All configuration options can be set using either method:

```typescript
type InspectorConfig = {
  // Data Layer Configuration
  dataLayerRpcWsUrl: string | null // ?dataLayerRpcWsUrl=ws://...
  dataLayerRpcParentUrl: string | null // ?dataLayerRpcParentUrl=https://...

  // Smart Items Configuration
  binIndexJsUrl: string | null // ?binIndexJsUrl=https://...
  disableSmartItems: boolean // ?disableSmartItems=true

  // Content Configuration
  contentUrl: string // ?contentUrl=https://...

  // Analytics Configuration
  segmentKey: string | null // ?segmentKey=...
  segmentAppId: string | null // ?segmentAppId=...
  segmentUserId: string | null // ?segmentUserId=...
  projectId: string | null // ?projectId=...
}

// Method 1: Global configuration
globalThis.InspectorConfig = {
  dataLayerRpcWsUrl: 'ws://127.0.0.1:8001/data-layer',
  contentUrl: 'https://builder-items.decentraland.org'
}

// Method 2: URL parameters
// http://localhost:3000/?dataLayerRpcWsUrl=ws://127.0.0.1:8001/data-layer&contentUrl=https://builder-items.decentraland.org&disableSmartItems=true
```

Configuration options are resolved in the following order:

1. URL parameters (highest priority)
2. Global object
3. Default values (lowest priority)

## Testing

Run all inspector tests:

```bash
make test-inspector
```

Run specific test files in watch mode:

```bash
make test-inspector FILES="--watch packages/@dcl/inspector/src/path/to/some-test.spec.ts"
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection**

   - Verify CLI server is running with `--data-layer` flag
   - Check WebSocket URL matches CLI server port
   - Ensure no firewall blocking connection

2. **File System Access**

   - Check file permissions
   - Verify CLI has necessary access rights
   - Ensure paths are correctly formatted

3. **Asset Loading**
   - Verify `contentUrl` is correctly configured
   - Check network access to content server
   - Ensure asset paths are valid

## Development Tips

1. **Debugging**

   - Use Chrome DevTools for WebSocket inspection
   - Enable React DevTools
   - Monitor browser console for RPC messages

2. **Testing**
   - Use in-memory implementation for unit tests
   - Mock RPC calls for integration testing
   - Test both WebSocket and IFrame transport

## Related Architecture Decisions

For a deeper understanding of the architecture and design decisions:

- [ADR-281: Items in Decentraland tooling](https://adr.decentraland.org/adr/ADR-281) - Explains the Items abstraction and how it's used in the Inspector
- [ADR-282: Decentraland Inspector](https://adr.decentraland.org/adr/ADR-282) - Details the Inspector's architecture, integration approaches, and technical decisions

## License

Apache 2.0
