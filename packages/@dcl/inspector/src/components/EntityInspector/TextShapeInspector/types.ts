import { Entity } from '@dcl/ecs'

export interface Props {
  entity: Entity
}

export type TextShapeInput = {
  text: string
  font: string
  fontSize: string
  fontAutoSize: boolean
  width: string
  height: string
  textAlign: string
  textWrapping: boolean
  paddingTop: string
  paddingRight: string
  paddingBottom: string
  paddingLeft: string
  shadowBlur: string
  shadowOffsetX: string
  shadowOffsetY: string
  outlineWidth: string
  lineSpacing: string
  lineCount: string
  // shadowColor: string
  // outlineColor: string
  // textColor: string
}
