import express from 'express'
import {
  addPlayer,
  addWheelPlayer,
  applyEloChanges,
  createRoom,
  deleteResult,
  createWheel,
  finalizeWheelSpin,
  getAllResults,
  getLeaderboard,
  getPlayerRatingsMap,
  getResultsForRecalculation,
  getRoomState,
  getWheelState,
  pruneRooms,
  pruneWheels,
  removePlayer,
  removeWheelPlayer,
  resetElo,
  resetRoom,
  roomExists,
  saveResult,
  setSplit,
  setWheelPalette,
  setWheelSpinning,
  wheelExists,
} from './db.js'
import { INITIAL_RATING, computeEloChanges } from './elo.js'

const PORT = Number(process.env.PORT) || 8787
const MAX_NAME_LEN = 40
const MAX_PLAYERS = 64
const MAX_TEAMS = 12
const ROOM_TTL_MS = 24 * 60 * 60 * 1000 // rooms expire 24h after the last change
const SPIN_DURATION_MS = 3000 // must match the wheel's CSS transition on the client
const SPIN_GRACE_MS = 400 // small buffer before the server removes the winner

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

// wheelId -> Set of open response streams (separate fan-out from matchmaking).
const wheelSubscribers = new Map()
// wheelId -> finalize timeout, so a new spin or deletion can clear a pending one.
const spinTimers = new Map()

function broadcastWheel(wheelId) {
  const streams = wheelSubscribers.get(wheelId)
  if (!streams || streams.size === 0) return
  const state = getWheelState(wheelId)
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

// --- Spin the Wheel -----------------------------------------------------------
app.post('/api/wheels', (_req, res) => {
  const id = createWheel()
  res.status(201).json({ id })
})

app.get('/api/wheels/:id', (req, res) => {
  const state = getWheelState(req.params.id)
  if (!state) return res.status(404).json({ error: 'Wheel not found' })
  res.json(state)
})

app.get('/api/wheels/:id/events', (req, res) => {
  const { id } = req.params
  if (!wheelExists(id)) return res.status(404).end()

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })
  res.write('retry: 3000\n\n')
  res.write(`data: ${JSON.stringify(getWheelState(id))}\n\n`)

  let streams = wheelSubscribers.get(id)
  if (!streams) {
    streams = new Set()
    wheelSubscribers.set(id, streams)
  }
  streams.add(res)

  const ping = setInterval(() => res.write(': ping\n\n'), 25000)

  req.on('close', () => {
    clearInterval(ping)
    streams.delete(res)
    if (streams.size === 0) wheelSubscribers.delete(id)
  })
})

app.post('/api/wheels/:id/players', (req, res) => {
  const { id } = req.params
  if (!wheelExists(id)) return res.status(404).json({ error: 'Wheel not found' })

  const name = normalizeName(req.body?.name)
  if (!name) return res.status(400).json({ error: 'Name is required' })
  if (name.length > MAX_NAME_LEN) return res.status(400).json({ error: 'Name is too long' })

  const state = getWheelState(id)
  const existing = state.players.find((p) => p.name === name)
  if (!existing && state.players.length >= MAX_PLAYERS) {
    return res.status(409).json({ error: 'Wheel is full' })
  }

  const player = addWheelPlayer(id, name)
  broadcastWheel(id)
  res.status(201).json({ player, wheel: getWheelState(id) })
})

app.delete('/api/wheels/:id/players/:playerId', (req, res) => {
  const { id, playerId } = req.params
  if (!wheelExists(id)) return res.status(404).json({ error: 'Wheel not found' })
  removeWheelPlayer(id, playerId)
  broadcastWheel(id)
  res.json(getWheelState(id))
})

app.post('/api/wheels/:id/palette', (req, res) => {
  const { id } = req.params
  if (!wheelExists(id)) return res.status(404).json({ error: 'Wheel not found' })
  setWheelPalette(id, Boolean(req.body?.dativa))
  broadcastWheel(id)
  res.json(getWheelState(id))
})

app.post('/api/wheels/:id/spin', (req, res) => {
  const { id } = req.params
  const state = getWheelState(id)
  if (!state) return res.status(404).json({ error: 'Wheel not found' })
  if (state.status === 'spinning') {
    return res.status(409).json({ error: 'Wheel is already spinning' })
  }
  if (state.players.length < 1) {
    return res.status(400).json({ error: 'Add someone to the wheel first' })
  }

  // Server decides the winner so every client lands on the same result. The
  // rotation math mirrors the client wheel: pointer sits at 90° (3 o'clock).
  const winnerIndex = Math.floor(Math.random() * state.players.length)
  const winnerName = state.players[winnerIndex].name
  const segmentAngle = 360 / state.players.length
  const centerAngle = segmentAngle * winnerIndex + segmentAngle / 2
  const pointerAngle = 90
  const targetWithinTurn = (((pointerAngle - centerAngle - state.rotation) % 360) + 360) % 360
  const rotation = state.rotation + 360 * 6 + targetWithinTurn
  const startedAt = Date.now()
  const spinId = `${id}-${startedAt}`

  setWheelSpinning(id, { rotation, winnerName, winnerIndex, spinId, startedAt })
  broadcastWheel(id)

  // After the animation, remove the winner and return to idle (server-side so it
  // happens once and stays in sync regardless of which clients are connected).
  const existing = spinTimers.get(id)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    spinTimers.delete(id)
    finalizeWheelSpin(id)
    broadcastWheel(id)
  }, SPIN_DURATION_MS + SPIN_GRACE_MS)
  timer.unref?.()
  spinTimers.set(id, timer)

  res.json(getWheelState(id))
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// --- Game Results -------------------------------------------------------------
app.get('/api/results', (_req, res) => {
  res.json(getAllResults())
})

app.post('/api/results', (req, res) => {
  const { teams, source } = req.body || {}
  if (!Array.isArray(teams) || teams.length < 2) {
    return res.status(400).json({ error: 'At least 2 teams required' })
  }
  for (const team of teams) {
    if (typeof team.score !== 'number' || team.score < 0) {
      return res.status(400).json({ error: 'Each team must have a valid score' })
    }
  }
  const maxScore = Math.max(...teams.map((t) => t.score))
  const topTeams = teams.filter((t) => t.score === maxScore)
  const winnerName = topTeams
    .map((t, i) => t.name || `Team ${teams.indexOf(t) + 1}`)
    .join(' & ')
  const entry = saveResult({ teams, winner: winnerName, source: source || 'custom' })

  // Update ELO ratings based on this result. Ratings are decayed up to the
  // moment of the game first, so the delta builds on the inactivity-adjusted base.
  try {
    const currentRatings = getPlayerRatingsMap(entry.createdAt)
    const changes = computeEloChanges(teams, currentRatings)
    if (changes.size > 0) applyEloChanges(changes, entry.createdAt)
  } catch (err) {
    console.error('ELO update failed:', err)
  }

  const { createdAt: _omit, ...response } = entry
  res.status(201).json(response)
})

app.delete('/api/results/:id', (req, res) => {
  const deleted = deleteResult(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Result not found' })
  recalculateElo()
  res.json({ ok: true })
})

app.get('/api/elo', (_req, res) => {
  res.json(getLeaderboard())
})

// --- Housekeeping -------------------------------------------------------------
setInterval(() => {
  const removed = pruneRooms(ROOM_TTL_MS)
  if (removed > 0) console.log(`Pruned ${removed} stale room(s)`)
  const removedWheels = pruneWheels(ROOM_TTL_MS)
  if (removedWheels > 0) console.log(`Pruned ${removedWheels} stale wheel(s)`)
}, 60 * 60 * 1000).unref()

function recalculateElo() {
  resetElo()
  for (const { teams, playedAt } of getResultsForRecalculation()) {
    const changes = computeEloChanges(teams, getPlayerRatingsMap(playedAt))
    if (changes.size > 0) applyEloChanges(changes, playedAt)
  }
}

// Always recalculate ELO from scratch on startup so algorithm changes take effect.
function bootstrapElo() {
  const allTeams = getResultsForRecalculation()
  if (allTeams.length === 0) return
  console.log(`Recalculating ELO from ${allTeams.length} result(s)…`)
  recalculateElo()
  console.log(`ELO ready — ${getLeaderboard().length} ranked player(s).`)
}

app.listen(PORT, () => {
  console.log(`Bumbis matchmaking API listening on :${PORT}`)
  bootstrapElo()
})
