import { useCallback, useState } from 'react'

import { Button } from '../../../../Button'
import { Block } from '../../../../Block'
import { TextField } from '../../../../ui'

import { Props } from './types'

export function Advanced({ value, disabled, onChange, onSubmit, onGoBack }: Props) {
  const [coords, setCoords] = useState(value.coords)
  const [base, setBase] = useState(value.base)

  const handleCoordsChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const newValue = e.target.value
      setCoords(newValue)
      onChange({ coords: newValue, base })
    },
    [coords, value]
  )

  const handleBaseParcelChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const newValue = e.target.value
      setBase(newValue)
      onChange({ coords, base: newValue })
    },
    [base, value]
  )

  const handleSubmit = useCallback(() => {
    onSubmit({ coords, base })
  }, [coords, base])

  return (
    <Block className="advanced">
      <TextField label="Custom coordinates" value={coords} onChange={handleCoordsChange} />
      <TextField label="Base parcel" value={base} onChange={handleBaseParcelChange} />
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
