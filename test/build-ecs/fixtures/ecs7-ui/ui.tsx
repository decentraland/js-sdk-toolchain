import ReactEcs, { Container, UiEntity } from '@dcl/react-ecs'

export const ui = () => (
  <Container width={500}>
    <UiEntity uiTransform={{ width: 100 }} />
    <Container width={200} />
  </Container>
)
