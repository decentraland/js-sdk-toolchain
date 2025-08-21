import { Entity } from '@dcl/ecs'
import { EditorComponents, SdkComponents } from '../../../../../lib/sdk/components'
import { ConfigComponentType } from '../../../../../lib/sdk/components/Config'

export enum FieldComponentType {
  CheckboxField = 'CheckboxField',
  TextField = 'TextField',
  RangeField = 'RangeField',
  ColorField = 'ColorField',
  FileUploadField = 'FileUploadField',
  GroupField = 'GroupField'
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
  multiplier?: number
  default?: string
  layout?: Record<string, FieldConfig>
}

export type DefaultBasicViewFieldProps = {
  entity: Entity
  field: ConfigComponentType['fields'][0]
}

export type Components = EditorComponents & SdkComponents
