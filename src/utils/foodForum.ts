// Client for the Friday Food Forum API (server/). Mirrors wheel.ts: in dev Vite
// proxies `/api` to the Node service; in production nginx does.

import type { CelebrationVariant } from '@/components/WinnerCelebration.vue'

export type ForumStatus = 'open' | 'locked' | 'spinning' | 'decided'
export type SelectionMode = 'single' | 'multi'
export type WheelMode = 'weighted' | 'tied'

export interface ForumPlace {
  id: string
  name: string
  votes: number
}

export interface ForumVoter {
  id: string
  name: string
}

export const MESSAGE_MAX_LEN = 200

export interface ForumMessage {
  id: string
  name: string
  body: string
  created_at: number
}

export interface ForumSpin {
  id: string
  winnerName: string
  winnerIndex: number
  startedAt: number
  celebration: CelebrationVariant | null
}

export interface ForumState {
  id: string
  status: ForumStatus
  selectionMode: SelectionMode
  wheelMode: WheelMode
  dativaColors: boolean
  allowSuggestions: boolean
  deadlineAt: number | null
  winnerName: string | null
  rotation: number
  spin: ForumSpin | null
  places: ForumPlace[]
  voters: ForumVoter[]
  messages: ForumMessage[]
}

export interface ForumJoinResult {
  voter: ForumVoter
  forum: ForumState
}

async function request<T>(path: string, init?: RequestInit, adminToken?: string): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'x-admin-token': adminToken } : {}),
    },
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

export function createForum(): Promise<{ id: string; adminToken: string }> {
  return request('/forums', { method: 'POST' })
}

export function getForum(id: string): Promise<ForumState> {
  return request(`/forums/${id}`)
}

export function joinForum(id: string, name: string): Promise<ForumJoinResult> {
  return request(`/forums/${id}/voters`, { method: 'POST', body: JSON.stringify({ name }) })
}

export function leaveForum(id: string, voterId: string): Promise<ForumState> {
  return request(`/forums/${id}/voters/${voterId}`, { method: 'DELETE' })
}

export function kickVoter(id: string, voterId: string, adminToken: string): Promise<ForumState> {
  return request(`/forums/${id}/voters/${voterId}`, { method: 'DELETE' }, adminToken)
}

export function castVotes(id: string, voterId: string, placeIds: string[]): Promise<ForumState> {
  return request(`/forums/${id}/votes`, {
    method: 'PUT',
    body: JSON.stringify({ voterId, placeIds }),
  })
}

// adminToken is optional: when the admin has opened suggestions, any voter may add.
export function addPlace(id: string, name: string, adminToken?: string): Promise<ForumState> {
  return request(
    `/forums/${id}/places`,
    { method: 'POST', body: JSON.stringify({ name }) },
    adminToken,
  )
}

export function removePlace(id: string, placeId: string, adminToken: string): Promise<ForumState> {
  return request(`/forums/${id}/places/${placeId}`, { method: 'DELETE' }, adminToken)
}

export interface ForumConfig {
  selectionMode?: SelectionMode
  wheelMode?: WheelMode
  dativaColors?: boolean
  allowSuggestions?: boolean
  deadlineMinutes?: number | null
}

export function updateConfig(
  id: string,
  config: ForumConfig,
  adminToken: string,
): Promise<ForumState> {
  return request(
    `/forums/${id}/config`,
    { method: 'PATCH', body: JSON.stringify(config) },
    adminToken,
  )
}

export function sendMessage(id: string, voterId: string, body: string): Promise<ForumState> {
  return request(`/forums/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ voterId, body }),
  })
}

export function lockForum(id: string, adminToken: string): Promise<ForumState> {
  return request(`/forums/${id}/lock`, { method: 'POST' }, adminToken)
}

export function spinForum(id: string, adminToken?: string): Promise<ForumState> {
  return request(`/forums/${id}/spin`, { method: 'POST' }, adminToken)
}

/**
 * Subscribe to live forum updates via Server-Sent Events. `onUpdate` fires on
 * connect and on every change; `onError` fires when the stream drops (the browser
 * then auto-reconnects). Returns a teardown that closes the stream.
 */
export function subscribeForum(
  id: string,
  onUpdate: (forum: ForumState) => void,
  onError?: () => void,
): () => void {
  const source = new EventSource(`/api/forums/${id}/events`)
  source.onmessage = (event) => {
    try {
      onUpdate(JSON.parse(event.data) as ForumState)
    } catch {
      // Ignore malformed frames (comment pings never reach onmessage).
    }
  }
  if (onError) source.onerror = () => onError()
  return () => source.close()
}
