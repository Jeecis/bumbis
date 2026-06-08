import express from 'express'
import {
  addPlayer,
  createRoom,
  getRoomState,
  pruneRooms,
  removePlayer,
  resetRoom,
  roomExists,
  setSplit,
} from './db.js'

const PORT = Number(process.env.PORT) || 8787
const MAX_NAME_LEN = 40
const MAX_PLAYERS = 64
const MAX_TEAMS = 12
const ROOM_TTL_MS = 24 * 60 * 60 * 1000 // rooms expire 24h after the last change

const app = express()
app.use(express.json({ limit: '16kb' }))

// --- SSE fan-out --------------------------------------------------------------
// roomId -> Set of open response streams. Every mutation broadcasts fresh state
// so each connected device sees check-ins and team splits live.
const subscribers = new Map()

function broadcast(roomId) {
  const streams = subscribers.get(roomId)
  if (!streams || streams.size === 0) return
  const state = getRoomState(roomId)
  const payload = `data: ${JSON.stringify(state)}\n\n`
  for (const res of streams) res.write(payload)
}

function normalizeName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
}

function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Split players into `teamCount` balanced teams (round-robin after shuffle). */
function splitIntoTeams(players, teamCount) {
  const teams = Array.from({ length: teamCount }, () => [])
  shuffle(players).forEach((player, index) => {
    teams[index % teamCount].push(player.name)
  })
  return teams
}

// --- Routes -------------------------------------------------------------------
app.post('/api/rooms', (_req, res) => {
  const id = createRoom()
  res.status(201).json({ id })
})

app.get('/api/rooms/:id', (req, res) => {
  const state = getRoomState(req.params.id)
  if (!state) return res.status(404).json({ error: 'Room not found' })
  res.json(state)
})

app.get('/api/rooms/:id/events', (req, res) => {
  const { id } = req.params
  if (!roomExists(id)) return res.status(404).end()

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })
  res.write('retry: 3000\n\n')
  res.write(`data: ${JSON.stringify(getRoomState(id))}\n\n`)

  let streams = subscribers.get(id)
  if (!streams) {
    streams = new Set()
    subscribers.set(id, streams)
  }
  streams.add(res)

  // Comment ping keeps proxies from closing an idle connection.
  const ping = setInterval(() => res.write(': ping\n\n'), 25000)

  req.on('close', () => {
    clearInterval(ping)
    streams.delete(res)
    if (streams.size === 0) subscribers.delete(id)
  })
})

app.post('/api/rooms/:id/players', (req, res) => {
  const { id } = req.params
  if (!roomExists(id)) return res.status(404).json({ error: 'Room not found' })

  const name = normalizeName(req.body?.name)
  if (!name) return res.status(400).json({ error: 'Name is required' })
  if (name.length > MAX_NAME_LEN) return res.status(400).json({ error: 'Name is too long' })

  const state = getRoomState(id)
  const existing = state.players.find((p) => p.name === name)
  if (!existing && state.players.length >= MAX_PLAYERS) {
    return res.status(409).json({ error: 'Room is full' })
  }

  const player = addPlayer(id, name)
  broadcast(id)
  res.status(201).json({ player, room: getRoomState(id) })
})

app.delete('/api/rooms/:id/players/:playerId', (req, res) => {
  const { id, playerId } = req.params
  if (!roomExists(id)) return res.status(404).json({ error: 'Room not found' })
  removePlayer(id, playerId)
  broadcast(id)
  res.json(getRoomState(id))
})

app.post('/api/rooms/:id/split', (req, res) => {
  const { id } = req.params
  const state = getRoomState(id)
  if (!state) return res.status(404).json({ error: 'Room not found' })

  const requested = Number(req.body?.teamCount) || 2
  if (state.players.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players to split' })
  }
  // Never make more teams than players, and clamp to a sane ceiling.
  const teamCount = Math.max(2, Math.min(requested, MAX_TEAMS, state.players.length))

  const teams = splitIntoTeams(state.players, teamCount)
  setSplit(id, teamCount, teams)
  broadcast(id)
  res.json(getRoomState(id))
})

app.post('/api/rooms/:id/reset', (req, res) => {
  const { id } = req.params
  if (!roomExists(id)) return res.status(404).json({ error: 'Room not found' })
  resetRoom(id)
  broadcast(id)
  res.json(getRoomState(id))
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// --- Housekeeping -------------------------------------------------------------
setInterval(() => {
  const removed = pruneRooms(ROOM_TTL_MS)
  if (removed > 0) console.log(`Pruned ${removed} stale room(s)`)
}, 60 * 60 * 1000).unref()

app.listen(PORT, () => {
  console.log(`Bumbis matchmaking API listening on :${PORT}`)
})
