import ReactEcs, { Container, Entity } from '@dcl/react-ecs'

export const ui = () => (
  <Container width={500}>
    <Entity uiTransform={{ width: 100 }} />
    <Container width={200} />
  </Container>
)
