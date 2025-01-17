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
npx sdk-commands start --data-layer --port 8001
```

2. Serve the inspector (choose one method):

```bash
# Method 1: Development server
cd packages/@dcl/inspector
npm start

# Method 2: From node_modules
npx http-server node_modules/@dcl/inspector/public
```

3. Access the Inspector:

```
http://localhost:3000/?dataLayerRpcWsUrl=ws://127.0.0.1:8001/data-layer
```

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
  const url = `${CONTENT_URL}?${params}`

  return <iframe onLoad={handleIframeRef} src={url} />
}
```

## Configuration

Configure the Inspector through URL parameters or a global object:

```typescript
type InspectorConfig = {
  // Data Layer Configuration
  dataLayerRpcWsUrl: string | null
  dataLayerRpcParentUrl: string | null

  // Smart Items Configuration
  binIndexJsUrl: string | null
  disableSmartItems: boolean

  // Content Configuration
  contentUrl: string

  // Analytics Configuration
  segmentKey: string | null
  segmentAppId: string | null
  segmentUserId: string | null
  projectId: string | null
}

// Global configuration
globalThis.InspectorConfig = {
  dataLayerRpcWsUrl: 'ws://127.0.0.1:8001/data-layer',
  contentUrl: 'https://builder-items.decentraland.org'
}
```

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

## License

Apache 2.0
