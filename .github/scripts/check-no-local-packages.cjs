const fs = require('fs')
const path = require('path')

// Function to recursively find all package.json files
function findPackageJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      findPackageJsonFiles(filePath, fileList)
    } else if (file === 'package.json') {
      fileList.push(filePath)
    }
  }

  return fileList
}

// Check for local package dependencies
function checkNoLocalPackages(packageJsonPath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    const errors = []

    // Check both dependencies and devDependencies
    for (const deps of [packageJson.dependencies, packageJson.devDependencies]) {
      if (!deps) continue

      for (const [key, value] of Object.entries(deps)) {
        if (
          value.startsWith('file:') ||
          value.startsWith('http:') ||
          value.startsWith('https:') ||
          value.startsWith('git:')
        ) {
          errors.push(`Dependency ${key} is not pointing to a published version: ${value}`)
        }
      }
    }

    if (errors.length) {
      console.error(`\n\nErrors in ${packageJsonPath}:`)
      errors.forEach((error) => console.error(`- ${error}`))
      return false
    }

    return true
  } catch (error) {
    console.error(`Error processing ${packageJsonPath}: ${error.message}`)
    return false
  }
}

// Main function
function main() {
  // Check if a directory was passed as an argument
  const targetDir = process.argv[2] || '.'

  console.log(`Checking for local package dependencies in ${targetDir}...`)
  const packageJsonFiles = findPackageJsonFiles(targetDir)
  console.log(`Found ${packageJsonFiles.length} package.json files to check.`)

  let hasErrors = false

  for (const packageJsonPath of packageJsonFiles) {
    console.log(`Checking ${packageJsonPath}...`)
    if (!checkNoLocalPackages(packageJsonPath)) {
      hasErrors = true
    }
  }

  if (hasErrors) {
    console.error(
      `\n\nFound packages with local dependencies in ${targetDir}. Please publish these dependencies instead of using local references.`
    )
    process.stdout.write('', () => process.exit(1))
  } else {
    console.log(`\n\nNo local dependencies found in ${targetDir}. All good!`)
  }
}

main()
