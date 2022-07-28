# Add or modify components in SDK 7
Adding a component to the SDK is an important fact because it will need to be supported in the future. This also implies avoiding breaking existing components by mistake.

This is why adding and modifying a component introduces some friction, to make sure it will always work. 

Today, the development of components are present in three stages:
1. Definition
2. The use of the component
3. Add the component to SDK

## Definition
To define a component, we need to go to the repository https://github.com/decentraland/protocol and create a PR. This repository publishes only the definitions that will be used. In the creation of the PR, if all goes well (backward compatibility is not broken) the CI will throw us a command to do a local installation of the `@dcl/protocol` package where we want to use the definitions.

## The use of the component
The use of the components refers to who must serialize and deserialize it in order to implement systems that use this data.
As an example, we are going to use the https://github.com/decentraland/unity-renderer repository that uses these components for their rendering and interaction with each other.

In `unity-renderer` it is possible to update definitions from the `@dcl/protocol` package version `next`, which corresponds to the latest merged into `main` definition repository. You can also choose the package from the PR using the constant `FIXED_NPM_PACKAGE_LINK` (you can do a global search to find it), that is, the source of what is supplied in the PR `npm install XXXXX` is copied, leaving `FIXED_NPM_PACKAGE_LINK = " xxxx"`.

With the definitions already acquired, the code is generated and now, it can be used in the local environment of `unity-renderer`. The building of a scene with this same local environment will be replicated in the next subsection.

## Add the component to SDK
In order for the components to be used in the creation of a scene, it is necessary to update the SDK. For this we must:
1. Go to the https://github.com/decentraland/js-sdk-toolchain repository, clone it and go inside it to the `packages/@dcl/ecs` folder.
2. Run there the PR-supplied command of the style `npm install "https://sdk-team.....` from `@dcl/protocol` repository.
3. Go back to the root of the repository and run the following commands: `make build` and `make test`

If all goes well, we can now create our PR. It is possible that if we are adding a new component, we should create the Test to make sure that the serialization and deserialization are working well. For this:
1. Copy and paste an existing component test, for example `BoxShape.spec.ts` found in `packages/@dcl/ecs/test/components/`
2. Adapt it to test our new component

If we are modifying a component, it's probable that the test doesn't need a modification.

Once the PR has been created and the CI has been successfully run, the GitHub bot will post an installation command similar to that of `@dcl/protocol` but to install on the scene where we want to test the component.

If we wanted to do an integration test, it would be necessary to run this new scene and also run it on the renderer with unity.
