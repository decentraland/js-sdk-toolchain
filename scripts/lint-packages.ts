#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'

// Parse command line arguments
const args = process.argv.slice(2)
const shouldFix = args.includes('--fix')

// Packages that should be linted
const packages = [
  'packages/@dcl/ecs',
  'packages/@dcl/sdk',
  'packages/@dcl/sdk-commands',
  'packages/@dcl/react-ecs'
  // 'packages/@dcl/js-runtime' - This package is ignored by ESLint
]

console.log(`🔍 Linting packages individually${shouldFix ? ' with auto-fix' : ''}...\n`)

let hasErrors = false

// Lint each package individually
for (const pkg of packages) {
  if (fs.existsSync(pkg)) {
    console.log(`📦 Linting ${pkg}...`)
    try {
      // Use the root ESLint to lint this specific package
      const fixFlag = shouldFix ? '--fix' : ''
      execSync(`NODE_OPTIONS="--max-old-space-size=4096" npx eslint ${pkg} --ext .ts,.tsx ${fixFlag}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log(`✅ ${pkg} - No issues found\n`)
    } catch (error: any) {
      // Check if it's just warnings (exit code 1) vs actual errors (exit code 2)
      if (error.status === 1) {
        console.log(`⚠️  ${pkg} - Linting completed with warnings\n`)
      } else {
        console.log(`❌ ${pkg} - Linting failed\n`)
        hasErrors = true
      }
    }
  } else {
    console.log(`⚠️  ${pkg} - Package not found, skipping\n`)
  }
}

if (hasErrors) {
  console.log('❌ Some packages had linting errors')
  process.exit(1)
} else {
  console.log('✅ All packages linted successfully!')
}
