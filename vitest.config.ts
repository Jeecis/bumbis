import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // server/ has its own Node test runner (node --test); keep it out of the jsdom suite.
      exclude: [...configDefaults.exclude, 'e2e/*', 'server/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
