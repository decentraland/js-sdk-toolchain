import path from 'path'

import { CliComponents } from '../../components'

async function downloadFile(components: Pick<CliComponents, 'fs' | 'fetch'>, fileUrl: string, outputPath: string) {
  const fetchResponse = await components.fetch.fetch(fileUrl)
  if (!fetchResponse.ok) {
    throw new Error(`Failed to download ${fileUrl}: ${fetchResponse.status} ${fetchResponse.statusText}`)
  }

  const response = await fetchResponse.arrayBuffer()
  const buffer = Buffer.from(response)
  await components.fs.writeFile(outputPath, buffer)
}

// Function to parse GitHub URL for root or subfolder
function parseGitHubUrl(githubUrl: string) {
  const rootRegex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)$/
  const subfolderRegex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/?(.*)/
  let match = githubUrl.match(subfolderRegex)
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      branch: match[3],
      path: match[4]
    }
  } else {
    match = githubUrl.match(rootRegex)
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        branch: 'main', // Default to main if no branch is specified
        path: '' // No specific path for root
      }
    }
  }
  throw new Error("URL doesn't match the expected GitHub format.")
}

export async function downloadGithubFolder(
  components: Pick<CliComponents, 'fs' | 'fetch'>,
  githubUrl: string,
  destination: string
) {
  const { owner, repo, branch, path: subfolderPath } = parseGitHubUrl(githubUrl)
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${subfolderPath}?ref=${branch}`

  const fetchResponse = await components.fetch.fetch(apiUrl)
  if (!fetchResponse.ok) {
    throw new Error(`Failed to download ${apiUrl}: ${fetchResponse.status} ${fetchResponse.statusText}`)
  }

  const data: any = await fetchResponse.json()

  if (Array.isArray(data)) {
    for await (const file of data) {
      const filePath = path.join(destination, file.name)

      if (file.type === 'file') {
        await downloadFile(components, file.download_url, filePath)
      } else if (file.type === 'dir') {
        if (!(await components.fs.directoryExists(filePath))) {
          await components.fs.mkdir(filePath, { recursive: true })
        }
        const nextUrl = `https://github.com/${owner}/${repo}/tree/${branch}/${file.path}`

        await downloadGithubFolder(components, nextUrl, filePath)
      }
    }
  } else {
    // Handle single file or root without subfolders
    const filePath = path.join(destination, data.name)
    await downloadFile(components, data.download_url, filePath)
  }
}
