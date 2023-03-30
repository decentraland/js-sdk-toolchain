

# Cases to board in the future

## Remote Catalog
Should be download by the data layer to local

## "External" Composite Case: 

```
FileSystem = {projectFolder}
==> node_modules 
  ==> @dcl
    ==> utils-library
      ==> assets
        ==> tree1.glb
        ==> tree2.glb
        ==> tree3.glb
 	      ==> forest.composite
      ==> package.json

==> assets
  ==> main.composite
```

forest.composite
```ts
{
  "core::gltf-container": {
    512: { src: "assets/tree1.glb" },
    513: { src: "assets/tree2.glb" },
    514: { src: "assets/tree3.glb" }
  } 
}
```

main.composite
```ts
{
  "composite::root": {
    512: { id: "forest.composite" }
  } 
}
```