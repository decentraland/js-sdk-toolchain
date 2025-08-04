# Decentraland Creator Hub

Decentraland Creator Hub is an Electron-based application designed for creating, editing, and deploying Decentraland scenes. This application is distributed for both Windows and MacOS, supporting both x64 and ARM architectures.

### Features

- **Create Scenes**: create new SDK7 scenes, they will be saved the user's file system.
- **Edit Scenes**: the integrated `@dcl/inspector` allows visual editing and the scene is ran under the hood using `@dcl/sdk-commands` to allow previewing while editing.
- **Publish Scenes**: deploy scenes to Genesis City, Worlds, test or custom servers.
- **Import Scenes**: import existing SDK7 scenes into the workspace.

### Scripts

- **Install dependencies**

```bash
npm install
```

- **Start development**

```bash
npm start
```

- **Build webapp**

```bash
npm run build
```

- **Compile executable** (`.exe` in windows, `.app` in MacOS)

```bash
npm run compile
```

- **Compile installer** (`.dmg` on MacOS)

```bash
npm run compile:installer
```

### Code Architecture

There are three packages each compiled individually:

- **`renderer`**: This is the webapp that runs on the browser, all the UI lives here.
- **`preload`**: This package run in a context with most of NodeJS APIs enabled. It's where we interact with the file system for example through the `fs` module. Modules exported from this package can be imported from the `renderer` by importing from the special path `#preload`, and all the wiring necessary to connect these two packages (namely the Electron's `exposeInWorld` APIs) are going to be done automatically by the bundler.
- **`main`**: Runs the app's NodeJS process. Communication between preload and main process is handled via IPC. This is used for invoking APIs not available in the preload package, such as Electron's APIs or forking new processes required by the Decentraland CLI.

### Debugging

While developing locally you will get the Browser's logs on the DevTools and the NodeJS logs on the console running the `npm start`.

When debugging the production build (executables) you can open the DevTools via View > DevTools and the NodeJS logs are available on a logs file.

On Windows (PowerShell):

```bash
Get-Content -Path "$env:APPDATA\creator-hub\logs\main.log" -Wait
```

On MacOS:

```bash
tail -f ~/Library/Logs/creator-hub/main.log
```

## Installation Process

The Decentraland Creator Hub requires several binaries to be available, including Node.js, npm, and sdk-commands. Due to Apple's requirements for app distribution, the application must be packaged into an `.asar` file for proper signing and notarization. However, some binaries within the `node_modules` directory cannot be used from inside the `.asar` file. Therefore, certain components are left outside the `.asar` file, including `package.json` and npm binaries.

### Steps

1. **NodeJS Binary**:

   - On macOS: Create a symlink in the app's unpacked directory called `node`, pointing to the Electron binary.
   - On Windows: Create a `.cmd` file in the app's unpacked directory called `node`, pointing to the Electron binary.

2. **NPM Binaries**:

   - Leave npm binaries unpacked from the `.asar` file.

3. **Other Binaries from `node_modules`**:
   - Leave `package.json` unpacked outside the `.asar` file.
   - Install `node` binaries from point 1 and `npm` binaries from point 2 into the forked process $PATH
   - Use the forked process to run npm binaries to install all other dependencies from the unpacked `package.json`.

### Dependency Management

To minimize installation time for the end user, `package.json` should include only the dependencies used on the Node.js side (main and preload packages). Dependencies used by the renderer should be listed as `devDependencies`, as they are not required by the end user (the web application is already bundled and does not need to be built by the end user).

## Update Process

The Decentraland Creator Hub uses `electron-updater` to automatically update the production app to the latest version.

### Steps

1. **Auto Update Check**:

   - Each time the app is started, `electron-updater` fetches the latest version from this GitHub repository.

2. **Download and Notification**:

   - If a new version is available, it is downloaded in the background.
   - Once the download is complete, the user is notified that a new version is available and prompted to restart the app to apply the updates.

3. **Installation**:
   - Upon closing the app, the new version is installed automatically.

This ensures that users always have the latest features and fixes without manual intervention.

## Release Process

The CI pipeline is configured to automate the release process for the Decentraland Creator Hub.

### Steps

1. **Pre-release Creation**:

   - For every push to the main branch, the CI creates a pre-release.
   - The commit message determines the type of release:
     - Patch (fix)
     - Minor (feat)
     - Major (breaking change)

2. **Artifact Generation**:

   - Artifacts for MacOS (x64 and ARM architectures) and Windows are generated and attached to the pre-release.

3. **Publishing the Release**:
   - To publish a release, edit the pre-release and publish it as the latest release.
   - The auto updater, as mentioned in the Update Process, will pick up this new release and update the production app.

This streamlined process ensures that updates are consistently and accurately deployed to users.

## Related Architecture Decisions

For a deeper understanding of the architecture and design decisions:

- [ADR-280: Binary Management](https://adr.decentraland.org/adr/ADR-280) - Describes the approach for managing Node.js binaries and their execution within the Creator Hub, including cross-platform binary execution and process monitoring
- [ADR-281: Items in Decentraland tooling](https://adr.decentraland.org/adr/ADR-281) - Explains the Items abstraction and how it's used in the Inspector
- [ADR-282: Decentraland Inspector](https://adr.decentraland.org/adr/ADR-282) - Details the Inspector's architecture, integration approaches, and technical decisions
