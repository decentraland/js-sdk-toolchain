import { useSdk } from '../hooks/sdk/useSdk'
import { SdkContextValue } from '../lib/sdk/engine'

export type WithSdkProps = {
  sdk: SdkContextValue
}

export type WithSdk<P extends object> = P & WithSdkProps

/**
 * This can be used to wrap a component with a higher order component that will only render the children when the SDK is initialized and will pass it as a prop
 * @param Component
 * @returns
 */
export function withSdk<P extends object>(Component: React.ComponentType<P>): React.FC<Omit<P, 'loading'>> {
  // add typings to wrapped component
  const sdk = useSdk()
  const ComponentWithSdk = Component as React.ComponentType<WithSdk<P>>
  return ({ ...props }) => (sdk ? <ComponentWithSdk sdk={sdk} {...(props as P)} /> : null)
}
