import { SectionItem } from './types'

export function getInputType(constraints: SectionItem['constraints']): string {
  if (constraints?.format === 'number' || constraints?.min !== undefined || constraints?.max !== undefined) {
    return 'number'
  }
  if (constraints?.format === 'email') {
    return 'email'
  }
  if (constraints?.format === 'password') {
    return 'password'
  }
  return 'text'
}

export function getStep(constraints: SectionItem['constraints']): number {
  return constraints?.step || 1
}

export function getMin(constraints: SectionItem['constraints']): number {
  return constraints?.min || constraints?.minExclusive || 0
}

export function getMax(constraints: SectionItem['constraints']): number {
  return constraints?.max || constraints?.maxExclusive || 100
}

export function validateConstraints(value: any, constraints: SectionItem['constraints']): boolean {
  if (!constraints) return true

  if (typeof value === 'number') {
    if (constraints.min !== undefined && value < constraints.min) return false
    if (constraints.max !== undefined && value > constraints.max) return false
    if (constraints.minExclusive !== undefined && value <= constraints.minExclusive) return false
    if (constraints.maxExclusive !== undefined && value >= constraints.maxExclusive) return false
    if (constraints.multipleOf !== undefined && value % constraints.multipleOf !== 0) return false
  }

  if (typeof value === 'string') {
    if (constraints.minLength !== undefined && value.length < constraints.minLength) return false
    if (constraints.maxLength !== undefined && value.length > constraints.maxLength) return false
    if (constraints.pattern !== undefined) {
      const regex = new RegExp(constraints.pattern)
      if (!regex.test(value)) return false
    }
  }

  return true
}
