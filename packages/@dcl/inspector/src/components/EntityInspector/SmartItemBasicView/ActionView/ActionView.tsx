import React, { useCallback, useEffect, useMemo } from 'react'
import { Entity } from '@dcl/ecs'
import { Action, ActionType, getActionSchema, getJson, getPayload } from '@dcl/asset-packs'
import { WithSdkProps, withSdk } from '../../../../hoc/withSdk'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { useArrayState } from '../../../../hooks/useArrayState'
import { ConfigComponent, EditorComponentsTypes } from '../../../../lib/sdk/components'
import { capitalize, transformPropertyToLabel } from '../../../../lib/utils/strings'
import { Block } from '../../../Block'
import { Dropdown, RangeField, TextField } from '../../../ui'

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity; field: ConfigComponent['fields'][0] }>(
    ({ sdk, entity, field: configField }) => {
      const { Actions } = sdk.components
      const [actionComponent, setActionComponentValue, isActionComponentEqual] = useComponentValue<
        EditorComponentsTypes['Actions']
      >(entity, Actions)
      const [actions, , modifyAction] = useArrayState<Action>(actionComponent === null ? [] : actionComponent.value)

      const getAction = useCallback(
        (basicViewId: string) => {
          return actions.find((action) => action.basicViewId === basicViewId)
        },
        [actions]
      )

      useEffect(() => {
        if (isActionComponentEqual({ ...actionComponent, value: actions })) return

        setActionComponentValue({ ...actionComponent, value: actions })
      }, [actionComponent, actions])

      const action = useMemo(() => getAction(configField.basicViewId!), [configField, getAction])

      const handlePropertyChange = useCallback(
        (
          _action: Action,
          property: string,
          { target: { value } }: React.ChangeEvent<Partial<HTMLInputElement | HTMLSelectElement>>
        ) => {
          const newPayload = getJson({ ...getPayload<ActionType>(_action), [property]: value })
          const newAction = { ..._action, jsonPayload: newPayload }
          const index = actions.findIndex((a) => a.basicViewId === _action.basicViewId)
          modifyAction(index, newAction)
        },
        [actions, modifyAction]
      )

      const renderField = useCallback(
        (action: Action, schemaProperties: Record<string, any>, property: string, field: Record<string, any> = {}) => {
          const payload = getPayload<ActionType>(action)
          const { field: htmlField, ...props } = field
          const label = capitalize(props.label ?? property)
          const value = payload[property as keyof typeof payload]
          switch (htmlField) {
            case 'RangeField': {
              return (
                <RangeField
                  {...props}
                  label={label}
                  value={value}
                  onChange={(e) => handlePropertyChange(action, property, e)}
                />
              )
            }
            case 'Dropdown': {
              const options = (
                schemaProperties[property]?.enum ?? schemaProperties[property]?.optionalJsonSchema?.enum
              ).map((value: string) => ({
                label: transformPropertyToLabel(value),
                value
              }))
              return (
                <Dropdown
                  {...props}
                  label={label}
                  value={value}
                  options={options}
                  onChange={(e) => handlePropertyChange(action, property, e)}
                />
              )
            }
            case 'TextField':
            default: {
              return (
                <TextField
                  {...props}
                  label={label}
                  type={field?.type ?? 'text'}
                  value={value}
                  onChange={(e) => handlePropertyChange(action, property, e)}
                />
              )
            }
          }
        },
        []
      )

      if (action) {
        const schema = getActionSchema(sdk.engine as any, action.type)
        const schemaProperties = schema.jsonSchema.properties!
        const properties = configField.layout ? JSON.parse(configField.layout) : schemaProperties

        return (
          <>
            {properties &&
              Object.entries(properties).map(([property, value]) => {
                return (
                  <Block key={property}>{renderField(action, schemaProperties as any, property, value as any)}</Block>
                )
              })}
          </>
        )
      }

      return null
    }
  )
)
