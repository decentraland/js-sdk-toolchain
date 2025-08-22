import React, { useMemo, useCallback } from 'react'
import {
  TextField,
  CheckboxField,
  RangeField,
  ColorField,
  FileUploadField,
  Dropdown,
  TextArea,
  EntityField,
  ColorPicker
} from '../../../ui'
import { getInputType, getStep, getMin, getMax } from './constraints'
import { applyTransform } from './utils'
import { getDataSourceOptions } from './dataSources'
import { TriggerSection } from './TriggerSection'
import { WidgetProps } from './types'

const DynamicField: React.FC<WidgetProps> = ({
  entity,
  inputProps,
  widget,
  label,
  constraints,
  props,
  transform,
  dataSource,
  basicViewId
}) => {
  const fieldLabel = useMemo(() => {
    return label?.trim() || ''
  }, [label])

  const renderWidget = useCallback(() => {
    const commonProps = {
      label: fieldLabel,
      ...inputProps,
      ...props
    }

    switch (widget) {
      case 'TriggerSection':
        return <TriggerSection entity={entity} label={fieldLabel} basicViewId={basicViewId} />

      case 'CheckboxField':
        return <CheckboxField {...commonProps} checked={!!inputProps.value} />

      case 'RangeField':
        // Transform constraints to work with stored values
        const transformedConstraints = constraints
          ? {
              ...constraints,
              min: constraints.min !== undefined ? applyTransform(constraints.min, transform, 'in') : undefined,
              max: constraints.max !== undefined ? applyTransform(constraints.max, transform, 'in') : undefined,
              step: constraints.step !== undefined ? applyTransform(constraints.step, transform, 'in') : undefined
            }
          : constraints

        return (
          <RangeField
            {...commonProps}
            step={getStep(transformedConstraints)}
            min={getMin(transformedConstraints)}
            max={getMax(transformedConstraints)}
          />
        )

      case 'ColorField':
        return <ColorField {...commonProps} />

      case 'ColorPicker':
        return <ColorPicker {...commonProps} />

      case 'FileUploadField':
        return <FileUploadField {...commonProps} />

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
  }, [fieldLabel, inputProps, widget, props, basicViewId, constraints, transform, dataSource])

  return renderWidget()
}

export default React.memo(DynamicField)
