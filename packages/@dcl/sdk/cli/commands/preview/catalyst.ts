import { Entity } from '@dcl/schemas'
import { fetch } from 'undici'

export async function fetchEntityByPointer(
  baseUrl: string,
  pointers: string[]
): Promise<{
  baseUrl: string
  deployments: Entity[]
}> {
  if (pointers.length === 0)
    return {
      baseUrl,
      deployments: []
    }

  const activeEntities = baseUrl + '/content/entities/active'

  const response = await fetch(activeEntities, {
    method: 'post',
    headers: { 'content-type': 'application/json', connection: 'close' },
    body: JSON.stringify({ pointers })
  })

  const deployments: Entity[] = response.ok
    ? ((await response.json()) as Entity[])
    : []

  return {
    baseUrl,
    deployments
  }
}
