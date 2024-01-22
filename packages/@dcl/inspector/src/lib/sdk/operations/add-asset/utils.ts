import { IEngine, PBMaterial, TextureUnion } from '@dcl/ecs'

export function isSelf(value: any) {
  return `${value}` === `{self}`
}

export function parseMaterial(base: string, material: PBMaterial): PBMaterial {
  switch (material.material?.$case) {
    case 'unlit':
      return {
        material: {
          $case: 'unlit',
          unlit: {
            ...material.material.unlit,
            texture: parseTexture(base, material.material.unlit.texture)
          }
        }
      }
    case 'pbr':
      return {
        material: {
          $case: 'pbr',
          pbr: {
            ...material.material.pbr,
            texture: parseTexture(base, material.material.pbr.texture),
            alphaTexture: parseTexture(base, material.material.pbr.alphaTexture),
            bumpTexture: parseTexture(base, material.material.pbr.bumpTexture),
            emissiveTexture: parseTexture(base, material.material.pbr.emissiveTexture)
          }
        }
      }
  }

  return material
}

export function parseTexture(base: string, texture?: TextureUnion): TextureUnion | undefined {
  if (texture?.tex?.$case === 'texture') {
    return {
      tex: {
        $case: 'texture',
        texture: {
          ...texture.tex.texture,
          src: texture.tex.texture.src.replace('{assetPath}', base)
        }
      }
    }
  }

  return texture
}

export function parseSyncComponents(engine: IEngine, componentNames: string[]): number[] {
  return componentNames.reduce((acc: number[], $) => {
    // try/catch it since the component might not exist in engine...
    try {
      const component = engine.getComponent($)
      return [...acc, component.componentId]
    } catch (e) {
      console.error(`Component ${$} does not exist in engine`)
      return acc
    }
  }, [])
}
