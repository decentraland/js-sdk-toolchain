import React, { useMemo, useCallback } from 'react'
import { Vector3 } from '@dcl/ecs-math'
import { getValue, setValue } from '../../../../lib/logic/get-set-value'
import { useComponentInput } from '../../../../hooks/sdk/useComponentInput'
import {
  TextField,
  CheckboxField,
  RangeField,
  ColorField,
  FileUploadField,
  Dropdown,
  TextArea,
  Vector3Field,
  EntityField,
  ColorPicker
} from '../../../ui'
import { isBooleanValue } from '../utils'
import { getInputType, getStep, getMin, getMax, validateConstraints } from './constraints'
import { applyTransform } from './utils'
import { getDataSourceOptions } from './dataSources'
import { TriggerSection } from './TriggerSection'
import { WidgetProps } from './types'

const DynamicField: React.FC<WidgetProps> = ({
  entity,
  component,
  widget,
  path,
  label,
  constraints,
  transform,
  dataSource,
  props,
  basicViewId
}) => {
  const { getInputProps } = useComponentInput(
    entity,
    component,
    // Convert component value to input format
    (value: Record<string, any>) => {
      const raw = getValue(value, path || '')
      const inputValue = applyTransform(raw, transform, 'in')
      return setValue(value, path || '', inputValue)
    },
    // Convert input back to component value format
    (input: Record<string, any>) => {
      const raw = getValue(input, path || '')
      const converted = applyTransform(raw, transform, 'out')

      // Apply constraints validation
      if (!validateConstraints(converted, constraints)) {
        throw new Error('Value does not meet constraints')
      }

      return setValue(input, path || '', converted)
    },
    // Is valid input
    (input: Record<string, any>) => {
      const raw = getValue(input, path || '')

      // Basic type validation
      if (constraints?.format === 'number' || constraints?.min !== undefined || constraints?.max !== undefined) {
        return typeof raw === 'number' || !isNaN(parseFloat(String(raw)))
      }

      if (constraints?.format === 'boolean') {
        return isBooleanValue(raw)
      }

      return true
    }
  )

  const fieldLabel = useMemo(() => {
    return label?.trim() || path
  }, [label, path])

  const renderWidget = useCallback(() => {
    const commonProps = {
      label: fieldLabel,
      ...(path ? getInputProps(path) : {}),
      ...props
    }

    switch (widget) {
      case 'TriggerSection':
        return <TriggerSection entity={entity} label={fieldLabel} basicViewId={basicViewId} />

      case 'CheckboxField':
        return (
          <CheckboxField
            {...commonProps}
            checked={path ? !!getInputProps(path).value : false}
            {...(path ? getInputProps(path, (e) => e.target.checked) : {})}
          />
        )

      case 'RangeField':
        return (
          <RangeField
            {...commonProps}
            step={getStep(constraints)}
            min={getMin(constraints)}
            max={getMax(constraints)}
          />
        )

      case 'ColorField':
        return <ColorField {...commonProps} />

      case 'ColorPicker':
        return <ColorPicker {...commonProps} />

      case 'FileUploadField':
        return <FileUploadField {...commonProps} />

      case 'Vector3Field':
        return (
          <Vector3Field
            {...commonProps}
            {...(path
              ? (getInputProps(path, (e) => {
                  return {
                    x: e.target.value,
                    y: e.target.value,
                    z: e.target.value
                  }
                }) as any)
              : {})}
            // value={getInputProps(path).value as unknown as Vector3}
            // onChange={(value: Vector3) => {
            //   getInputProps(path)?.onChange?.({ target: { value } } as React.ChangeEvent<{
            //     targer: { value: Vector3 }
            //   }>)
            // }}
          />
        )

      case 'EntityField':
        return <EntityField {...commonProps} />

      case 'Dropdown':
        return <Dropdown {...commonProps} options={getDataSourceOptions(dataSource?.kind)} />

      case 'TextArea':
        return <TextArea {...commonProps} maxLength={constraints?.maxLength} minLength={constraints?.minLength} />

      default:
        return (
          <TextField
            {...commonProps}
            type={getInputType(constraints) as any}
            maxLength={constraints?.maxLength}
            minLength={constraints?.minLength}
            pattern={constraints?.pattern}
          />
        )
    }
  }, [constraints, fieldLabel, getInputProps, widget])

  return renderWidget()
}

export default React.memo(DynamicField)
