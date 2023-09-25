import { useComponentInput } from '../../../../hooks/sdk/useComponentInput'
import { TransformConfig } from '../../../../lib/sdk/components/TransformConfig'

export type Props = {
  field: keyof TransformConfig
  getInputProps: ReturnType<typeof useComponentInput>['getInputProps']
}
