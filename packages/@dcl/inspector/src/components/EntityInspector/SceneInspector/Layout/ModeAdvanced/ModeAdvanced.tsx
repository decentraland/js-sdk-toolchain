import { useCallback, useEffect, useState } from 'react'

import { Button } from '../../../../Button'
import { Block } from '../../../../Block'
import { TextField } from '../../../../ui'

import { Props } from './types'

export function ModeAdvanced({ value, onSubmit, onGoBack }: Props) {
  const [coords, setCoords] = useState(value.coords)
  const [base, setBase] = useState(value.base)

  useEffect(() => {
    setCoords(value.coords)
    setBase(value.base)
  }, [value])

  const handleCoordsChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setCoords(e.target.value.trim())
    },
    [coords, value]
  )

  const handleBaseParcelChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setBase(e.target.value.trim())
    },
    [base, value]
  )

  const handleSubmit = useCallback(() => {
    onSubmit({ coords, base })
  }, [value, coords, base])

  const disabled = !coords.length || !base.length

  return (
    <Block className="advanced">
      <TextField label="Custom Coordinates" value={coords} onChange={handleCoordsChange} />
      <TextField label="Origin Point" value={base} onChange={handleBaseParcelChange} />
      <Block>
        <Button type="dark" onClick={onGoBack}>
          Back
        </Button>
        <Button type="blue" onClick={handleSubmit} disabled={disabled}>
          Confirm
        </Button>
      </Block>
    </Block>
  )
}
