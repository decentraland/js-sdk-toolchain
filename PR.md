# Add Custom Assets support

Adds the ability to create and reuse custom assets in the Inspector. Custom assets are created from existing entities in the scene and can be reused later.

## Implementation Details

### Custom Asset Creation ([0903ef5e](0903ef5e))

The main logic for creating custom assets is in `create-custom-asset.ts`:

- Creates a composite from selected entities
- Handles entity hierarchies and parent-child relationships
- Processes components and their values
- Maps resource paths to use `{assetPath}` notation
- Handles references between components using `{self}` and `{entityId}` notation

Changes:

1. Added filtering of editor components ([acfa2504](acfa2504))
2. Added support for entity hierarchies ([4bd98235](4bd98235))
3. Added resource path mapping ([2080e5de](2080e5de))
4. Added support for nested properties ([559b4d43](559b4d43))
5. Added reference system ([be27465](be27465))
6. Fixed component value copying ([6a62445](6a62445))

### Asset Loading

The logic for loading custom assets is in `add-asset/index.ts`:

- Reconstructs entities from composites
- Maps component IDs
- Resolves resource paths
- Handles sync components

### Data Layer

Added RPC methods in `rpc-methods.ts`:

- **`createCustomAsset`**: Creates a new custom asset

  ```typescript
  - Stores metadata in data.json
  - Stores composite in composite.json
  - Copies resources to asset folder
  - Handles thumbnails
  ```

- **`getCustomAssets`**: Lists available custom assets
  ```typescript
  - Reads metadata and composites
  - Loads thumbnails
  - Returns assets in format needed by UI
  ```

### Storage Structure

Custom assets are stored in the `custom/` directory:

```
custom/
  asset-name/
    data.json      # metadata
    composite.json # entity data
    thumbnail.png  # preview image
    resource1.glb  # copied resources
    resource2.png
```

### UI Integration

Added UI components ([6898118](6898118)):

- Custom assets tab in Assets panel
- Asset tiles with thumbnails
- Context menu for creating custom assets

## Testing

To test:

1. Select entities in scene
2. Create custom asset from context menu
3. Check custom assets tab
4. Try to instance the custom asset
5. Verify all resources are loaded correctly
