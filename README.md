# Decentraland SDK 7

[![codecov](https://codecov.io/gh/decentraland/js-sdk-toolchain/branch/main/graph/badge.svg?token=F7J331CGP6)](https://codecov.io/gh/decentraland/js-sdk-toolchain)

## This project tree
```
js-sdk-toolchain
│   README.md
│   Makefile
└───scripts
└───test
└───docs
└───packages/@dcl
    └───sdk
    └───dcl-rollup
    └───ecs
    └───js-runtime

```
When the package `@dcl/sdk` is built, `@dcl/rollup` and `@dcl/ecs` are versioned.
`@dcl/sdk` collects a dependency of these three packages to be able to build scenes and libraries.

## ECS 6 dev support
The ECS 6 lives in the `6.x.x` branch, there will no longer be new features but it's available for fixes or patches.
With a PR to `6.x.x`, you can test the build with the S3 publish, but it'll be necessary to create a release for propagating under `decentraland-ecs@latest`.

## Updating golden files (.crdt)

Most changes to the codebase impose a change in the amount of opcodes executed in the actual scene. We use a QuickJS virtual machine to benchmark opcodes. Although, it is not representative of the reallity of optimized JIT virual machines, it is a good measurement to generate awareness of the impact of the pull requests across SDK developers.

To re-create the files, running `make build update-snapshots` should suffice. If an discrepancy between the local results and the CI results appears, there is a heavier command `make deep-clean-and-snapshot` that will do the trick. **Execute it with extreme care**, since it will clean your git state.
