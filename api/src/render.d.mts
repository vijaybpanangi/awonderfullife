// Types for the shared, plain-JS render module (render.mjs) so the Worker (TS) can import it.
export interface RenderArgs {
  subject: string
  preheader?: string
  markdown: string
  unsub: string
}
export function renderEmailHtml(args: RenderArgs): string
export function renderEmailText(args: Omit<RenderArgs, 'preheader'>): string
