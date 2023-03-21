
# Inspector

## Developing 
Run `npm start` to spawn esbuild in `watch` mode. This serves the `public/` folder, every change triggers rebuilding the `bundle.js` and you'll need refresh the page. The server created is in `localhost:8000` by default, an initial message is printed but it probably quickly missed. 

This also rebuilds the library section (data-layer) and exposes in `dist/` folder.

## Build
The `make build ` in the repo root builds all the necessary for package publishment. 