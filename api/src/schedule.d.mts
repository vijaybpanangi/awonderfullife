// Types for the shared, plain-JS scheduling helpers (schedule.mjs).
export function etWallToUtc(y: number, m: number, d: number, hh: number, mm: number): Date
export function nextSaturday7pmETISO(nowMs: number): string
export function etLocalInputToISO(s: string): string | null
export function formatET(iso: string): string
