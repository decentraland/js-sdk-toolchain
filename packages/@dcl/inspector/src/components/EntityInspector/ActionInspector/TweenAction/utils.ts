import { ActionPayload } from '@dcl/asset-packs'

export function isValidTween(tween: ActionPayload['start_tween']) {
  return (
    !!tween.type &&
    !isNaN(parseInt(tween.end.x)) &&
    !isNaN(parseInt(tween.end.y)) &&
    !isNaN(parseInt(tween.end.z)) &&
    tween.relative !== undefined &&
    !!tween.interpolationType &&
    !!tween.duration
  )
}
