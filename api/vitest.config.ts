import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

// vitest-pool-workers v4 API: the Workers integration is a Vite plugin
// (`cloudflareTest`) rather than the older `defineWorkersConfig` from
// `@cloudflare/vitest-pool-workers/config`, which no longer exists in 0.16.x.
// The plugin reads bindings (e.g. D1) from the worker's wrangler.jsonc.
export default defineConfig({
  // miniflare prints "AI bindings always access remote resources…" at startup because
  // wrangler.jsonc declares the `AI` binding (used by production comment moderation). It's
  // benign here: the suite builds its own env WITHOUT the AI binding and injects a `classify`
  // stub, so tests never call Workers AI — no remote calls, no charges. (Guarded by the
  // "runs offline (heuristics only)" test in test/comments.test.ts.)
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
})
