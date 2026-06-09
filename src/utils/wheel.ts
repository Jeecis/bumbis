// Client for the shared "spin the wheel" API (server/). Mirrors matchmaking.ts:
// in dev Vite proxies `/api` to the Node service; in production nginx does.

export interface WheelPlayer {
  id: string
  name: string
}

export type WheelStatus = 'idle' | 'spinning'

export interface SpinInfo {
  id: string
  winnerName: string
  winnerIndex: number
  startedAt: number
}

export interface WheelState {
  id: string
  status: WheelStatus
  rotation: number
  dativaColors: boolean
  spin: SpinInfo | null
  players: WheelPlayer[]
}

export interface WheelJoinResult {
  player: WheelPlayer
  wheel: WheelState
}

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

export function createWheel(): Promise<{ id: string }> {
  return request('/wheels', { method: 'POST' })
}

export function getWheel(id: string): Promise<WheelState> {
  return request(`/wheels/${id}`)
}

export function joinWheel(id: string, name: string): Promise<WheelJoinResult> {
  return request(`/wheels/${id}/players`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function leaveWheel(id: string, playerId: string): Promise<WheelState> {
  return request(`/wheels/${id}/players/${playerId}`, { method: 'DELETE' })
}

export function spinWheel(id: string): Promise<WheelState> {
  return request(`/wheels/${id}/spin`, { method: 'POST' })
}

export function setWheelPalette(id: string, dativa: boolean): Promise<WheelState> {
  return request(`/wheels/${id}/palette`, {
    method: 'POST',
    body: JSON.stringify({ dativa }),
  })
}

/**
 * Subscribe to live wheel updates via Server-Sent Events. `onUpdate` fires on
 * connect and on every change (check-in, leave, spin start, winner removal);
 * `onError` fires when the stream drops (EventSource then auto-reconnects).
 * Returns a teardown function that closes the stream.
 */
export function subscribeWheel(
  id: string,
  onUpdate: (wheel: WheelState) => void,
  onError?: () => void,
): () => void {
  const source = new EventSource(`/api/wheels/${id}/events`)
  source.onmessage = (event) => {
    try {
      onUpdate(JSON.parse(event.data) as WheelState)
    } catch {
      // Ignore malformed frames (e.g. comment pings never reach onmessage).
    }
  }
  if (onError) source.onerror = () => onError()
  return () => source.close()
}
