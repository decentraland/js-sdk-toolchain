import { AllComponents } from '../../../../lib/sdk/components'
import { SdkContextValue } from '../../../../lib/sdk/context'
import { Components } from './types'

export function getEnumKeyByValue(value: string): keyof typeof AllComponents | undefined {
  return Object.entries(AllComponents).find(([_, v]) => v === value)?.[0] as keyof typeof AllComponents | undefined
}

export function isBooleanValue(value: any): boolean {
  return value === 'true' || value === true || value === false || value === 'false'
}

export function isTrueValue(value: any): boolean {
  return value === 'true' || value === true || value === 1 || value === '1'
}

export function getComponentByType(sdk: SdkContextValue, type: string) {
  if (!type || !sdk) return null

  try {
    const parts = type.split('::')
    if (parts.length !== 2) {
      return null
    }

    const [_, componentName] = parts

    const component = getEnumKeyByValue(type)
    if (!component) return null

    return sdk.components[componentName as keyof Components] || null
  } catch (error) {
    return null
  }
}
