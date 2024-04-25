import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type TextShapeInput = {
  text: string
  fontSize: string
  fontAutoSize: boolean
  textAlign: string
  paddingTop: string
  paddingRight: string
  paddingBottom: string
  paddingLeft: string
  outlineWidth: string
  lineSpacing: string
  lineCount: string
  outlineColor: string
  textColor: string
}
