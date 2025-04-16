import React, { useMemo, useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { getValue, setValue } from '../../../../lib/logic/get-set-value'
import { withSdk } from '../../../../hoc/withSdk'
import { useComponentInput } from '../../../../hooks/sdk/useComponentInput'
import { Block } from '../../../Block'
import { Container } from '../../../Container'
import { TextField, CheckboxField, RangeField } from '../../../ui'
import { getComponentByType, isBooleanValue, isTrueValue } from './utils'
import { DefaultBasicViewFieldProps, FieldConfig, FieldComponentType, FieldType } from './types'

import './DefaultBasicViewField.css'

export const DefaultBasicViewField = withSdk<DefaultBasicViewFieldProps>(({ sdk, entity, field }) => {
  const layout = useMemo(() => {
    if (!field.layout) return null
    try {
      return JSON.parse(field.layout) as Record<string, FieldConfig>
    } catch (e) {
      return null
    }
  }, [field.layout])

  // Get the component based on field type using our utility function
  const component = useMemo(() => {
    return getComponentByType(sdk, field.type)
  }, [sdk, field.type])

  // If layout or component is missing, we can't render the field
  if (!layout || !component) return null

  return (
    <div className="DefaultBasicViewField">
      <Container label={field.name} border>
        {Object.entries(layout).map(([propName, config]) => (
          <Block key={`${field.name}-${propName}`}>{renderField(entity, component, propName, config)}</Block>
        ))}
      </Container>
    </div>
  )
})

function renderField(entity: Entity, component: any, propName: string, config: FieldConfig) {
  const { getInputProps } = useComponentInput(
    entity,
    component,
    // Convert component value to input format
    (value: Record<string, any>) => {
      const raw = getValue(value, propName)

      let inputValue: any = raw
      switch (config.type) {
        case FieldType.Number:
          inputValue = typeof raw === 'number' ? raw.toFixed(0) : ''
          break
        case FieldType.Decimal:
        case FieldType.Float:
          inputValue = typeof raw === 'number' ? raw.toFixed(2) : ''
          break
        case FieldType.Boolean:
          inputValue = Boolean(raw)
          break
        default:
          inputValue = raw ?? ''
          break
      }

      return setValue(value, propName, inputValue)
    },
    // Convert input back to component value format
    (input: Record<string, any>) => {
      const raw = getValue(input, propName)

      let converted: any = raw
      switch (config.type) {
        case FieldType.Number:
          converted = parseInt(raw as string)
          break
        case FieldType.Decimal:
        case FieldType.Float:
          converted = parseFloat(raw as string)
          break
        case FieldType.Boolean:
          converted = isTrueValue(raw) ? 1 : 0
          break
        default:
          converted = raw
          break
      }

      return setValue(input, propName, converted)
    },
    // Is valid input
    (input: Record<string, any>) => {
      const raw = getValue(input, propName)

      switch (config.type) {
        case FieldType.Number:
        case FieldType.Decimal:
        case FieldType.Float:
          return typeof raw === 'number' || !isNaN(parseFloat(String(raw)))
        case FieldType.Boolean:
          return isBooleanValue(raw)
        default:
          return true
      }
    }
  )

  const getInputLabel = useMemo(() => {
    return config?.label?.trim() || propName
  }, [config?.label, propName])

  const getInputType = useCallback((type: FieldType) => {
    switch (type) {
      case FieldType.Number:
      case FieldType.Decimal:
      case FieldType.Float:
        return 'number'
      default:
        return 'text'
    }
  }, [])

  switch (config.field) {
    case FieldComponentType.CheckboxField:
      return (
        <CheckboxField
          label={getInputLabel}
          checked={!!getInputProps(propName).value}
          {...getInputProps(propName, (e) => e.target.checked)}
        />
      )
    case FieldComponentType.RangeField:
      return (
        <RangeField
          label={getInputLabel}
          step={isNaN(Number(config.step)) ? 1 : Number(config.step)}
          min={isNaN(Number(config.min)) ? 0 : Number(config.min)}
          max={isNaN(Number(config.max)) ? 100 : Number(config.max)}
          {...getInputProps(propName)}
        />
      )
    default:
      return <TextField label={getInputLabel} type={getInputType(config.type)} {...getInputProps(propName)} />
  }
}

export default React.memo(DefaultBasicViewField)
