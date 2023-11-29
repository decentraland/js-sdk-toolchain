
# Inspector

## Development

Run `npm start` to spawn esbuild in `watch` mode. This serves the `public/` folder, every change triggers rebuilding the `bundle.js` and you'll need refresh the page. The server created is in `localhost:8000` by default, an initial message is printed but it probably quickly missed.

This also rebuilds the library section (data-layer) and exposes in `dist/` folder.

### Running with data-layer

For faster development experience, we are faking the file-system for the data-layer, if you want to use your actual file-system, you can either:

* Run the extension from VSCode on a scene
* Run `npx sdk-commands start --data-layer --port 8001` in a scene & go to localhost:8000/?ws=ws://127.0.0.1:8001/data-layer

## Build

The `make build` in the repo root builds all the necessary for package publishment.
