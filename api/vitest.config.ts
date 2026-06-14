import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// vitest-pool-workers v4 API: the Workers integration is a Vite plugin
// (`cloudflareTest`) rather than the older `defineWorkersConfig` from
// `@cloudflare/vitest-pool-workers/config`, which no longer exists in 0.16.x.
// The plugin reads bindings (e.g. D1) from the worker's wrangler.jsonc.
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
})
