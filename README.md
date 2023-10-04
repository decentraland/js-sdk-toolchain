# Decentraland SDK 7

[![codecov](https://codecov.io/gh/decentraland/js-sdk-toolchain/branch/main/graph/badge.svg?token=F7J331CGP6)](https://codecov.io/gh/decentraland/js-sdk-toolchain)

Use the Decentraland Software Development Kit v7 to create experiences for the Decentraland ecosystem.

## Create a scene and preview it locally

1. Run `npx @dcl/sdk-commands init` on an empty folder.
2. Preview it with `npm run start`!

## Repository guide

This repository consists of the following components, packaged for the `nodejs`/`npm` ecosystem (find them under the respective subfolder in `packages`):
* `@dcl/react-ecs`: a framework to create scenes using the [React](https://reactjs.org) framework
* `@dcl/sdk`: contains all the packages that a scene needs to work.
* `@dcl/ecs`: an engine used to render things on screen
* `@dcl/sdk-commands`: contains the command line interface
* `@dcl/inspector`: Editor interface.

And some internal or maybe useful packages if you're digging deeper into how the Decentraland runtime works:
* `@dcl/js-runtime`: the `js-runtime` contains the typings for the environment variables available in the sandboxed execution environment for scenes
* `@dcl/playground-assets`: contains the files needed by the playground. https://playground.decentraland.org/


### Versioning notes

When `@dcl/sdk` is built, as it depends on new versions of `@dcl/ecs`, these are built first and `@dcl/sdk` includes the new versions.

### ECS 6 dev support
The ECS 6 lives in the `6.x.x` branch, there will no longer be new features but it's available for fixes or patches.
With a PR to `6.x.x`, you can test the build with the S3 publish, but it'll be necessary to create a release for propagating under `decentraland-ecs@latest`.

### Updating golden files (.crdt)

We use golden files to create snapshots for a series of test scenes. Most changes to the codebase impose a change in the amount of opcodes executed in the actual scene. We use a QuickJS virtual machine to benchmark how many opcodes are required. Even though this is not representative of the reallity of optimized JIT virual machines, it is a good approximation of the impact that the change would imposes on scene developers.

To re-create these golden files, run `make build update-snapshots`. In some cases, this will generate some discrepancies with the clean environment used by the continuous integration we use (CircleCI). If you run into this issue, please run `make deep-clean-and-snapshot` to invalidate all cached calculations. **Be careful**: it will clean all local changes on your git [working tree](https://git-scm.com/docs/gitglossary#Documentation/gitglossary.txt-aiddefworkingtreeaworkingtree).

## Copyright info

This repository is protected with a standard Apache 2 license. See the terms and conditions in the LICENSE file.

