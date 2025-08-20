import { Entity } from '@dcl/ecs'
import { ConfigComponentType } from '../../../../lib/sdk/components/Config'

export type Props = {
  entity: Entity
}

export type Section = NonNullable<ConfigComponentType['sections']>[0]
export type SectionItem = NonNullable<Section>['items'][0]
export type WidgetProps = SectionItem & {
  entity: Entity
  component: any // TODO: This is a temporary solution to get the component by type. We need to find a better way to do this.
}
