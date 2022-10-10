# Add or modify components in SDK 7

Adding a new component to the SDK is an important change, because it will need to be supported in the future. This also must contemplated avoiding breaking existing components by mistake.

This is why adding or modifying a component introduces some friction, to make sure it will always work. 

The development of any component needs to cover three stages:

1. Protocol definition
2. Component behavior
3. Add the component to the SDK
 
## Protocol Definition

To define a component, we need to create a PR in the [protocol repository](https://github.com/decentraland/protocol). This repository only publishes the definitions of the interfaces used for messages. During the build process of this PR, if all goes well (backward compatibility is not broken), the CI will throw us a command that we can use to run a local installation of the `@dcl/protocol` package in the project where we want to use the definitions.

### Adding optional behavior
At the protocol level, each component field can be serialized or deduced. For primitives types like numbers, strings, or arrays the default values taken are the [protocol buffer defaults](https://developers.google.com/protocol-buffers/docs/proto3#default). Suppose we need to explicit a custom behavior when the field is not serialized (because maybe it wasn't defined). In that case, we can add the `optional` key, and explicitly the default value must be taken in this case.

## Component behavior

The component behavior refers to how the data of the component is deserialized, interpreted and used by systems.
As an example, we are going to use the [unity renderer repository](https://github.com/decentraland/unity-renderer), that uses multiple components to manage the rendering of the world.

In `unity-renderer` it is possible to update definitions from the `@dcl/protocol` package version `next`. This version corresponds to the latest commit merged into `main` of that repository. You can also choose the package from a specific PR, using the constant `FIXED_NPM_PACKAGE_LINK` (you can do a global search to find this constant definition). The source of what is supplied in the PR `npm install XXXXX` is copied, leaving `FIXED_NPM_PACKAGE_LINK = " xxxx"`.

With the protocol definitions already acquired, the code is generated. Now you can use it in the local environment of `unity-renderer`. The building of a scene with this same local environment will be replicated in the next subsection.

To get more information you can visit the [unity-renderer guide](https://github.com/decentraland/unity-renderer/blob/dev/docs/ecs7-component-creation.md), it's more focused on the unity side.



## Add the component to the SDK

In order for a component to be used in the creation of a scene, it is necessary to update the SDK to include it. For this we must:

1. Go to the [sdk-toolchain repository](https://github.com/decentraland/js-sdk-toolchain), and clone it.
2. Navigate to the `packages/@dcl/ecs` folder and run the PR-supplied command of the style `npm install "https://sdk-team.....`, referencing a version of the `@dcl/protocol` repository that includes definitions for your new component.
3. Go back to the root of the repository and run the following commands: `make build` and `make test`

If all goes well, we can now create our PR. If you are adding a new component, you should create a test to make sure that the serialization and deserialization are working well. For this:

1. Copy and paste an existing component test, for example `MeshRenderer.spec.ts` found in `packages/@dcl/ecs/test/components/`
2. Adapt it to test our new component

If you are modifying an existing component, it's probable that the test doesn't need any modifications.

Once the PR has been created and the CI has been successfully run, the GitHub bot will post an installation command similar to that of `@dcl/protocol`. Use this new command to install the modified version of the SDK in a scene project, to test the usage of the component.

If you want to run an integration test, it's necessary to run this new scene and also run it on the renderer with unity.
