// Client for the self-hosted matchmaking API (server/). In dev, Vite proxies
// `/api` to the Node service; in production nginx reverse-proxies it.

export interface Player {
  id: string
  name: string
}

export type RoomStatus = 'open' | 'split'

export interface Room {
  id: string
  status: RoomStatus
  teamCount: number
  teams: string[][] | null
  players: Player[]
}

export interface JoinResult {
  player: Player
  room: Room
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

export function createRoom(): Promise<{ id: string }> {
  return request('/rooms', { method: 'POST' })
}

export function getRoom(id: string): Promise<Room> {
  return request(`/rooms/${id}`)
}

export function joinRoom(id: string, name: string): Promise<JoinResult> {
  return request(`/rooms/${id}/players`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function leaveRoom(id: string, playerId: string): Promise<Room> {
  return request(`/rooms/${id}/players/${playerId}`, { method: 'DELETE' })
}

export function splitTeams(id: string, teamCount: number): Promise<Room> {
  return request(`/rooms/${id}/split`, {
    method: 'POST',
    body: JSON.stringify({ teamCount }),
  })
}

export function resetRoom(id: string): Promise<Room> {
  return request(`/rooms/${id}/reset`, { method: 'POST' })
}

/**
 * Subscribe to live room updates via Server-Sent Events. `onUpdate` fires on
 * connect and on every change (check-in, leave, split, reset); `onError` fires
 * when the stream drops (EventSource then auto-reconnects). Returns a teardown
 * function that closes the stream.
 */
export function subscribeRoom(
  id: string,
  onUpdate: (room: Room) => void,
  onError?: () => void,
): () => void {
  const source = new EventSource(`/api/rooms/${id}/events`)
  source.onmessage = (event) => {
    try {
      onUpdate(JSON.parse(event.data) as Room)
    } catch {
      // Ignore malformed frames (e.g. comment pings never reach onmessage).
    }
  }
  if (onError) source.onerror = () => onError()
  return () => source.close()
}
