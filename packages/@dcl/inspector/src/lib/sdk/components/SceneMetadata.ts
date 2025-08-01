import { IEngine } from '@dcl/ecs'
import { Schemas } from '@dcl/ecs/dist/schemas'

export enum SceneAgeRating {
  Teen = 'T',
  Adult = 'A'
}

export enum SceneCategory {
  ART = 'art',
  GAME = 'game',
  CASINO = 'casino',
  SOCIAL = 'social',
  MUSIC = 'music',
  FASHION = 'fashion',
  CRYPTO = 'crypto',
  EDUCATION = 'education',
  SHOP = 'shop',
  BUSINESS = 'business',
  SPORTS = 'sports'
}

export const Coords = Schemas.Map({
  x: Schemas.Int,
  y: Schemas.Int
})

export enum TransitionMode {
  TM_FORWARD = 1,
  TM_BACKWARD = 0
}

//SceneMetadata component is now versioned, to add new versions you must need to keep the previous properties and add the new ones
export const SceneMetadataV0 = {
  name: Schemas.Optional(Schemas.String),
  description: Schemas.Optional(Schemas.String),
  thumbnail: Schemas.Optional(Schemas.String),
  ageRating: Schemas.Optional(Schemas.EnumString(SceneAgeRating, SceneAgeRating.Teen)),
  categories: Schemas.Optional(Schemas.Array(Schemas.EnumString(SceneCategory, SceneCategory.GAME))),
  author: Schemas.Optional(Schemas.String),
  email: Schemas.Optional(Schemas.String),
  tags: Schemas.Optional(Schemas.Array(Schemas.String)),
  layout: Schemas.Map({
    base: Coords,
    parcels: Schemas.Array(Coords)
  }),
  silenceVoiceChat: Schemas.Optional(Schemas.Boolean),
  disablePortableExperiences: Schemas.Optional(Schemas.Boolean),
  spawnPoints: Schemas.Optional(
    Schemas.Array(
      Schemas.Map({
        name: Schemas.String,
        default: Schemas.Optional(Schemas.Boolean),
        position: Schemas.Map({
          x: Schemas.OneOf({
            single: Schemas.Int,
            range: Schemas.Array(Schemas.Int)
          }),
          y: Schemas.OneOf({
            single: Schemas.Int,
            range: Schemas.Array(Schemas.Int)
          }),
          z: Schemas.OneOf({
            single: Schemas.Int,
            range: Schemas.Array(Schemas.Int)
          })
        }),
        cameraTarget: Schemas.Optional(
          Schemas.Map({
            x: Schemas.Int,
            y: Schemas.Int,
            z: Schemas.Int
          })
        )
      })
    )
  )
}

export const SceneMetadataV1 = {
  version: Schemas.Optional(Schemas.Int),
  name: Schemas.Optional(Schemas.String),
  description: Schemas.Optional(Schemas.String),
  thumbnail: Schemas.Optional(Schemas.String),
  ageRating: Schemas.Optional(Schemas.EnumString(SceneAgeRating, SceneAgeRating.Teen)),
  categories: Schemas.Optional(Schemas.Array(Schemas.EnumString(SceneCategory, SceneCategory.GAME))),
  author: Schemas.Optional(Schemas.String),
  email: Schemas.Optional(Schemas.String),
  tags: Schemas.Optional(Schemas.Array(Schemas.String)),
  layout: Schemas.Map({
    base: Coords,
    parcels: Schemas.Array(Coords)
  }),
  silenceVoiceChat: Schemas.Optional(Schemas.Boolean),
  disablePortableExperiences: Schemas.Optional(Schemas.Boolean),
  skyboxConfig: Schemas.Optional(
    Schemas.Map({
      fixedTime: Schemas.Optional(Schemas.Int),
      transitionMode: Schemas.Optional(Schemas.EnumNumber(TransitionMode, TransitionMode.TM_FORWARD))
    })
  ),
  spawnPoints: Schemas.Optional(
    Schemas.Array(
      Schemas.Map({
        name: Schemas.String,
        default: Schemas.Optional(Schemas.Boolean),
        position: Schemas.Map({
          x: Schemas.OneOf({
            single: Schemas.Int,
            range: Schemas.Array(Schemas.Int)
          }),
          y: Schemas.OneOf({
            single: Schemas.Int,
            range: Schemas.Array(Schemas.Int)
          }),
          z: Schemas.OneOf({
            single: Schemas.Int,
            range: Schemas.Array(Schemas.Int)
          })
        }),
        cameraTarget: Schemas.Optional(
          Schemas.Map({
            x: Schemas.Int,
            y: Schemas.Int,
            z: Schemas.Int
          })
        )
      })
    )
  )
}

const SceneMetadata = 'inspector::SceneMetadata'

export const VERSIONS = [
  { key: SceneMetadata, value: SceneMetadataV0 },
  { key: `${SceneMetadata}-v1`, value: SceneMetadataV1 }
]

export function getLatestSceneComponentVersion() {
  return VERSIONS[VERSIONS.length - 1]
}

export function defineSceneComponents(engine: IEngine) {
  const components = VERSIONS.map(({ key, value }) => {
    return engine.defineComponent(key, value)
  })

  return components
}
