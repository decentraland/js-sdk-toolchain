import { Entity } from '@dcl/ecs'
import { ConfigComponent, EditorComponents, SdkComponents } from '../../../../lib/sdk/components'

export enum FieldComponentType {
  CheckboxField = 'CheckboxField',
  TextField = 'TextField',
  RangeField = 'RangeField'
}

export enum FieldType {
  Text = 'text',
  Number = 'number',
  Decimal = 'decimal',
  Float = 'float',
  Boolean = 'boolean'
}

export type FieldConfig = {
  field: FieldComponentType
  type: FieldType
  label?: string
  step?: string | number
  min?: string | number
  max?: string | number
  default?: string
}

export type DefaultBasicViewFieldProps = {
  entity: Entity
  field: ConfigComponent['fields'][0]
}

export type Components = EditorComponents & SdkComponents
