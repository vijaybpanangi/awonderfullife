// Load the `cloudflare:test` module declarations shipped by vitest-pool-workers.
// In v4 these live in the package's ./types entry, not its main types, so we
// reference the file directly.
/// <reference path="../node_modules/@cloudflare/vitest-pool-workers/types/cloudflare-test.d.ts" />
import type { Env as WorkerEnv } from '../src/index'

// In v4, `cloudflare:test`'s `env` is typed as `Cloudflare.Env`. Map that namespace
// to this worker's Env so test bindings (e.g. DB) are typed correctly.
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {}
  }
}
