import { FlatCompat } from '@eslint/eslintrc'
import path from 'path'
import { fileURLToPath } from 'url'

// @dcl/eslint-config still publishes an eslintrc-style config; wrap it for eslint 9.
const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) })

export default [
  ...compat.config({
    extends: '@dcl/eslint-config/sdk',
    parserOptions: {
      project: [
        'packages/@dcl/ecs/tsconfig.json',
        'packages/@dcl/sdk-commands/tsconfig.json',
        'packages/@dcl/sdk/tsconfig.json',
        'packages/@dcl/playground-assets/tsconfig.json',
        'packages/@dcl/react-ecs/tsconfig.json',
        'scripts/tsconfig.json',
        'test/tsconfig.json',
        'test/ecs/snippets/tsconfig.json'
      ]
    }
  }),
  { ignores: ['**/*.gen.ts', '**/dist/**', '**/node_modules/**', '**/*.d.ts', '**/*.js', 'packages/@dcl/ecs/dist/**', 'packages/@dcl/ecs/src/components/generated', 'packages/@dcl/js-runtime', 'packages/@dcl/playground-assets/dist', 'packages/@dcl/sdk/dist/**', 'packages/@dcl/sdk/internal/**', 'packages/@dcl/sdk/testing/**', 'test/sdk/simple-scene', 'tmp'] }
]
