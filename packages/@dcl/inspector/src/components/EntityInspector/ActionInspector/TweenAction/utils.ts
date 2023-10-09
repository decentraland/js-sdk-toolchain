import { ActionPayload } from '@dcl/asset-packs'

export function isValidTween(tween: ActionPayload['start_tween']) {
  return (
    !!tween.type &&
    !isNaN(Number(tween.end.x)) &&
    !isNaN(Number(tween.end.y)) &&
    !isNaN(Number(tween.end.z)) &&
    tween.relative !== undefined &&
    !!tween.interpolationType &&
    !isNaN(Number(tween.duration))
  )
}
