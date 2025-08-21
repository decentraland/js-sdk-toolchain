import React, { useCallback, useMemo } from 'react'
import { BsFillLightningChargeFill as SmartItemIcon } from 'react-icons/bs'
import { withSdk } from '../../../../hoc/withSdk'
import { Container } from '../../../Container'
import DynamicField from './DynamicField'
import { getComponentByType } from '../utils'
import { Props, Section, SectionItem } from './types'

import './SmartItemBasicView.css'
import { Block } from '../../../Block'

const SmartItemBasicView = withSdk<Props>(({ sdk, entity }) => {
  const { Config } = sdk.components

  const renderSmartItemIndicator = useCallback(() => {
    return (
      <div className="SmartItemBadge">
        <SmartItemIcon size={12} />
      </div>
    )
  }, [])

  const config = useMemo(() => {
    return Config.getOrNull(entity)
  }, [entity, Config])

  if (!config) return null

  // If no sections defined, fall back to legacy v1 behavior
  if (!config.sections || config.sections.length === 0) {
    return null // You might want to render the v1 component here
  }

  const renderSectionItem = useCallback(
    (item: SectionItem, itemIndex: number) => {
      const component = getComponentByType(sdk, item.component)

      if (!component) {
        // eslint-disable-next-line no-console
        console.warn(`Component not found: ${item.component}`)
        return null
      }

      return (
        <DynamicField
          key={`${item.component}-${item.path}-${itemIndex}`}
          entity={entity}
          component={component}
          widget={item.widget}
          path={item.path}
          label={item.label}
          constraints={item.constraints}
          props={item.props}
          transform={item.transform}
          dataSource={item.dataSource}
          basicViewId={item.basicViewId}
        />
      )
    },
    [sdk, entity]
  )

  const renderSection = useCallback(
    (section: Section, sectionIndex: number) => {
      return (
        <Container key={`${section.id}-${sectionIndex}`} label={section.label} className="SmartItemBasicViewSection">
          {section.columns && section.columns > 1 ? (
            <Block>
              {section.items.map((item: SectionItem, itemIndex: number) => renderSectionItem(item, itemIndex))}
            </Block>
          ) : (
            <>{section.items.map((item: SectionItem, itemIndex: number) => renderSectionItem(item, itemIndex))}</>
          )}
        </Container>
      )
    },
    [renderSectionItem]
  )

  return (
    <Container
      label={config.label || 'Smart Item'}
      indicator={renderSmartItemIndicator()}
      className="SmartItemBasicViewInspector"
    >
      {config.sections.map((section, sectionIndex) => renderSection(section as Section, sectionIndex))}
    </Container>
  )
})

export default React.memo(SmartItemBasicView)
