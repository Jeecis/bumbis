// Client for the ELO gambling API (server/). Mirrors matchmaking.ts / wheel.ts:
// in dev Vite proxies `/api` to the Node service; in production nginx does.

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const message = await res
      .json()
      .then((body) => body?.error)
      .catch(() => null)
    throw new Error(message || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export type GambleOutcome = 'win' | 'lose'

export interface Gamble {
  id: string
  name: string
  wager: number
  outcome: GambleOutcome
  /** Signed net ELO change: +wager on a win, -wager on a loss. */
  delta: number
  ratingBefore: number
  ratingAfter: number
  createdAt: number
}

/** Place a 50/50 double-or-nothing wager of `wager` ELO for `name`. */
export function placeGamble(name: string, wager: number): Promise<Gamble> {
  return request('/gamble', {
    method: 'POST',
    body: JSON.stringify({ name, wager }),
  })
}

export function getGambleHistory(): Promise<Gamble[]> {
  return request('/gamble/history')
}
