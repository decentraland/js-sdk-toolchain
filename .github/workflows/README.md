# GitHub Workflows

This directory contains all GitHub Actions workflows for the Decentraland JS SDK Toolchain.

## Workflow Organization

### Main Workflows

- **`ci.yml`** - Main CI workflow for the entire SDK toolchain
  - Runs linting, testing, building, and publishing for all packages
  - Handles releases and deployments

- **`creator-hub.yml`** - Consolidated Creator Hub CI/CD workflow
  - Replaces all previous `ch-*.yml` workflows
  - Runs on the same triggers as the main CI workflow (push to main/experimental, pull requests, releases)
  - Handles linting, type checking, testing, building, and releasing for Creator Hub
  - Supports both main branch releases and PR previews
  - Includes macOS and Windows builds with code signing

### Utility Workflows

- **`ready_for_review.yml`** - Manual lint and snapshot update workflow
  - Can be triggered manually or automatically on file changes
  - Handles both main SDK and Creator Hub linting
  - Automatically commits fixes

- **`sync-main-to-experimental.yml`** - Syncs main branch to experimental
  - Runs on main branch pushes
  - Creates automated PRs to keep experimental in sync

- **`update-unity-renderer.yml`** - Updates Unity renderer dependencies
  - Scheduled to run on weekdays
  - Creates PRs for dependency updates

- **`release-docs.yml`** - Releases API documentation
  - Triggers on main branch releases
  - Deploys documentation to Cloudflare

## Creator Hub Workflow Details

The `creator-hub.yml` workflow consolidates all Creator Hub related CI/CD processes:

### Jobs

1. **Code Quality**
   - `lint` - ESLint and Prettier checks
   - `typechecking` - TypeScript type checking

2. **Testing**
   - `tests` - Runs tests on macOS and Windows
   - Includes main, preload, renderer, and E2E tests

3. **Release (Main Branch Only)**
   - `drop-pre-release` - Cleans up old pre-releases
   - `build-and-release` - Builds and publishes releases with code signing

4. **PR Preview (Pull Requests Only)**
   - `pr-preview` - Builds preview artifacts for testing
   - Uploads to S3 and posts download links in PR comments

### Features

- **Cross-platform builds** - macOS and Windows support
- **Code signing** - Automatic signing for both platforms
- **PR previews** - Automatic preview builds for pull requests
- **Concurrent execution** - Efficient parallel job execution
- **Conditional execution** - Jobs only run when needed
- **Dependency management** - Proper installation and building of all dependencies including Inspector

## Migration from Old Workflows

The following old workflows have been consolidated into `creator-hub.yml`:

- `ch.yml` - Main CH workflow (entry point)
- `ch-lint.yml` - CH linting
- `ch-typechecking.yml` - CH type checking
- `ch-tests.yml` - CH testing
- `ch-drop.yml` - CH pre-release cleanup
- `ch-release.yml` - CH release process

## Usage

### Manual Triggers

- Use "workflow_dispatch" to manually trigger any workflow
- Creator Hub workflow can be triggered independently

### Automatic Triggers

- Push to main/experimental branches
- Pull requests
- Releases
- Scheduled runs (Unity renderer updates)

### Environment Variables

All workflows use the same secrets and environment variables as before. No changes to repository secrets are required.

## Benefits of Reorganization

1. **Simplified Structure** - Single consolidated workflow instead of 6 separate files
2. **Better Organization** - Clear job grouping and documentation
3. **Improved Maintainability** - Easier to understand and modify
4. **Reduced Duplication** - Consolidated dependency installation and build steps
5. **Better Integration** - Independent workflow that runs on same triggers as main CI
6. **Enhanced Readability** - Clear comments and job descriptions
7. **Efficient Dependencies** - Single step installs both Creator Hub and Inspector dependencies
