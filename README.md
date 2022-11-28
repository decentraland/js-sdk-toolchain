# Decentraland SDK 7

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
