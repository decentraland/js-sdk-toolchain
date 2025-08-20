import { AllComponents } from '../../../lib/sdk/components/types'
import { SdkContextValue, SdkContextComponents } from '../../../lib/sdk/context'

export function getEnumKeyByValue(value: string): keyof typeof AllComponents | undefined {
  return Object.entries(AllComponents).find(([_, v]) => v === value)?.[0] as keyof typeof AllComponents | undefined
}

export function isBooleanValue(value: unknown): boolean {
  return value === 'true' || value === true || value === false || value === 'false'
}

export function isTrueValue(value: unknown): boolean {
  return value === 'true' || value === true || value === 1 || value === '1'
}

// TODO: This is a temporary solution to get the component by type. We need to find a better way to do this.
export function getComponentByType(sdk: SdkContextValue, type: string): any {
  if (!type || !sdk) return null

  try {
    const parts = type.split('::')
    if (parts.length !== 2) {
      return null
    }

    const [_, componentName] = parts

    const component = getEnumKeyByValue(type)
    if (!component) return null

    return sdk.components[componentName as keyof SdkContextComponents] || null
  } catch (error) {
    return null
  }
}
