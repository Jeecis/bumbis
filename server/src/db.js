import Database from 'better-sqlite3'
import { randomBytes } from 'node:crypto'
import { decayedRating, graceDaysFor, RATING_FLOOR } from './elo.js'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = fileURLToPath(new URL('..', import.meta.url))
const DB_PATH = process.env.BUMBIS_DB || join(serverRoot, 'data', 'bumbis.db')

mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id          TEXT PRIMARY KEY,
    status      TEXT NOT NULL DEFAULT 'open',
    team_count  INTEGER NOT NULL DEFAULT 2,
    teams_json  TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS players (
    id         TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (room_id, name)
  );

  CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id, created_at);

  CREATE TABLE IF NOT EXISTS game_results (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,
    teams_json TEXT NOT NULL,
    winner     TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'custom',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS player_elo (
    name         TEXT PRIMARY KEY,
    rating       REAL NOT NULL DEFAULT 1200,
    games_played INTEGER NOT NULL DEFAULT 0,
    wins         INTEGER NOT NULL DEFAULT 0,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wheels (
    id              TEXT PRIMARY KEY,
    status          TEXT NOT NULL DEFAULT 'idle',   -- 'idle' | 'spinning'
    rotation        REAL NOT NULL DEFAULT 0,         -- resting absolute rotation (deg)
    winner_name     TEXT,                            -- last chosen name (for modal/state)
    winner_index    INTEGER,
    spin_id         TEXT,                            -- identifies the current spin event
    spin_started_at INTEGER,                         -- ms; for recovery guard
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wheel_players (
    id         TEXT PRIMARY KEY,
    wheel_id   TEXT NOT NULL REFERENCES wheels(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (wheel_id, name)
  );

  CREATE INDEX IF NOT EXISTS idx_wheel_players_wheel ON wheel_players(wheel_id, created_at);
`)

// Migration: add the shared palette flag to wheels created before it existed.
try {
  db.exec(`ALTER TABLE wheels ADD COLUMN use_dativa INTEGER NOT NULL DEFAULT 0`)
} catch {
  // Column already exists.
}

// Migration: track when each player last played, for inactivity decay.
try {
  db.exec(`ALTER TABLE player_elo ADD COLUMN last_played_at INTEGER`)
} catch {
  // Column already exists.
}

// URL-safe id from a restricted alphabet (no ambiguous chars like 0/O/1/l/I).
const ID_ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz'

function genId(length = 7) {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length]
  }
  return out
}

const insertRoomStmt = db.prepare(
  `INSERT INTO rooms (id, status, team_count, teams_json, created_at, updated_at)
   VALUES (?, 'open', 2, NULL, ?, ?)`,
)
const getRoomStmt = db.prepare(`SELECT * FROM rooms WHERE id = ?`)
const getPlayersStmt = db.prepare(
  `SELECT id, name FROM players WHERE room_id = ? ORDER BY created_at ASC`,
)
const touchRoomStmt = db.prepare(`UPDATE rooms SET updated_at = ? WHERE id = ?`)
const insertPlayerStmt = db.prepare(
  `INSERT OR IGNORE INTO players (id, room_id, name, created_at) VALUES (?, ?, ?, ?)`,
)
const getPlayerByNameStmt = db.prepare(
  `SELECT id, name FROM players WHERE room_id = ? AND name = ?`,
)
const deletePlayerStmt = db.prepare(`DELETE FROM players WHERE room_id = ? AND id = ?`)
const setSplitStmt = db.prepare(
  `UPDATE rooms SET status = 'split', team_count = ?, teams_json = ?, updated_at = ? WHERE id = ?`,
)
const resetRoomStmt = db.prepare(
  `UPDATE rooms SET status = 'open', teams_json = NULL, updated_at = ? WHERE id = ?`,
)
const pruneStmt = db.prepare(`DELETE FROM rooms WHERE updated_at < ?`)

const getPlayerEloStmt = db.prepare(
  `SELECT name, rating, games_played, wins, last_played_at FROM player_elo WHERE name = ?`,
)
const getAllPlayerEloStmt = db.prepare(
  `SELECT name, rating, games_played, wins, last_played_at FROM player_elo ORDER BY rating DESC`,
)
const upsertPlayerEloStmt = db.prepare(`
  INSERT INTO player_elo (name, rating, games_played, wins, last_played_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET
    rating         = excluded.rating,
    games_played   = excluded.games_played,
    wins           = excluded.wins,
    last_played_at = excluded.last_played_at,
    updated_at     = excluded.updated_at
`)
const resetAllEloStmt = db.prepare(`DELETE FROM player_elo`)

const insertResultStmt = db.prepare(
  `INSERT INTO game_results (id, date, teams_json, winner, source, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`,
)
const getAllResultsStmt = db.prepare(
  `SELECT id, date, teams_json, winner, source FROM game_results ORDER BY created_at DESC`,
)
const deleteResultStmt = db.prepare(`DELETE FROM game_results WHERE id = ?`)

// --- Wheel statements ---------------------------------------------------------
const insertWheelStmt = db.prepare(
  `INSERT INTO wheels (id, status, rotation, created_at, updated_at)
   VALUES (?, 'idle', 0, ?, ?)`,
)
const getWheelStmt = db.prepare(`SELECT * FROM wheels WHERE id = ?`)
const getWheelPlayersStmt = db.prepare(
  `SELECT id, name FROM wheel_players WHERE wheel_id = ? ORDER BY created_at ASC`,
)
const touchWheelStmt = db.prepare(`UPDATE wheels SET updated_at = ? WHERE id = ?`)
const insertWheelPlayerStmt = db.prepare(
  `INSERT OR IGNORE INTO wheel_players (id, wheel_id, name, created_at) VALUES (?, ?, ?, ?)`,
)
const getWheelPlayerByNameStmt = db.prepare(
  `SELECT id, name FROM wheel_players WHERE wheel_id = ? AND name = ?`,
)
const deleteWheelPlayerStmt = db.prepare(`DELETE FROM wheel_players WHERE wheel_id = ? AND id = ?`)
const deleteWheelPlayerByNameStmt = db.prepare(
  `DELETE FROM wheel_players WHERE wheel_id = ? AND name = ?`,
)
const setWheelSpinningStmt = db.prepare(
  `UPDATE wheels SET status = 'spinning', rotation = ?, winner_name = ?, winner_index = ?,
   spin_id = ?, spin_started_at = ?, updated_at = ? WHERE id = ?`,
)
const setWheelIdleStmt = db.prepare(
  `UPDATE wheels SET status = 'idle', spin_id = NULL, spin_started_at = NULL, updated_at = ?
   WHERE id = ?`,
)
const setWheelPaletteStmt = db.prepare(
  `UPDATE wheels SET use_dativa = ?, updated_at = ? WHERE id = ?`,
)
const pruneWheelsStmt = db.prepare(`DELETE FROM wheels WHERE updated_at < ?`)

export function createRoom() {
  const now = Date.now()
  // Retry on the astronomically unlikely id collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = genId()
    if (getRoomStmt.get(id)) continue
    insertRoomStmt.run(id, now, now)
    return id
  }
  throw new Error('Could not allocate a unique room id')
}

export function roomExists(roomId) {
  return Boolean(getRoomStmt.get(roomId))
}

/** Assemble the full client-facing state for a room, or null if it is gone. */
export function getRoomState(roomId) {
  const room = getRoomStmt.get(roomId)
  if (!room) return null
  return {
    id: room.id,
    status: room.status,
    teamCount: room.team_count,
    teams: room.teams_json ? JSON.parse(room.teams_json) : null,
    players: getPlayersStmt.all(roomId),
  }
}

/** Idempotent check-in: returns the player row (existing or freshly inserted). */
export function addPlayer(roomId, name) {
  const now = Date.now()
  const id = genId(10)
  insertPlayerStmt.run(id, roomId, name, now)
  touchRoomStmt.run(now, roomId)
  return getPlayerByNameStmt.get(roomId, name)
}

export function removePlayer(roomId, playerId) {
  const info = deletePlayerStmt.run(roomId, playerId)
  if (info.changes > 0) touchRoomStmt.run(Date.now(), roomId)
  return info.changes > 0
}

export function setSplit(roomId, teamCount, teams) {
  setSplitStmt.run(teamCount, JSON.stringify(teams), Date.now(), roomId)
}

export function resetRoom(roomId) {
  resetRoomStmt.run(Date.now(), roomId)
}

/** Delete rooms untouched for longer than maxAgeMs. Returns rows removed. */
export function pruneRooms(maxAgeMs) {
  return pruneStmt.run(Date.now() - maxAgeMs).changes
}

export function getPlayerRatingsMap(asOf = Date.now()) {
  const rows = getAllPlayerEloStmt.all()
  const map = new Map()
  for (const row of rows) {
    map.set(row.name, {
      rating: decayedRating(row.rating, row.last_played_at, asOf, graceDaysFor(row.name)),
      gamesPlayed: row.games_played,
    })
  }
  return map
}

export function getLeaderboard(asOf = Date.now()) {
  return (
    getAllPlayerEloStmt
      .all()
      .map((r) => ({
        name: r.name,
        rating: Math.round(decayedRating(r.rating, r.last_played_at, asOf, graceDaysFor(r.name))),
        games_played: r.games_played,
        wins: r.wins,
      }))
      // Decay can reorder players relative to the stored-rating ordering.
      .sort((a, b) => b.rating - a.rating)
  )
}

/**
 * Apply a game's ELO deltas. `playedAt` (epoch ms) is when the game happened —
 * it becomes each participant's new last-played time, and any inactivity decay
 * accrued up to that moment is banked into the base rating before the delta is
 * added (so returning after a long break does not refund the decayed points).
 */
export function applyEloChanges(changes, playedAt = Date.now()) {
  const apply = db.transaction(() => {
    for (const [name, { delta, oldRating, won, gamesPlayed }] of changes) {
      const currentRow = getPlayerEloStmt.get(name)
      const baseRating = currentRow
        ? decayedRating(currentRow.rating, currentRow.last_played_at, playedAt, graceDaysFor(name))
        : oldRating
      const currentGames = currentRow?.games_played ?? gamesPlayed
      const currentWins = currentRow?.wins ?? 0
      upsertPlayerEloStmt.run(
        name,
        Math.max(RATING_FLOOR, baseRating + delta),
        currentGames + 1,
        currentWins + (won ? 1 : 0),
        playedAt,
        playedAt,
      )
    }
  })
  apply()
}

export function deleteResult(id) {
  return deleteResultStmt.run(id).changes > 0
}

export function getResultsForRecalculation() {
  return db
    .prepare(`SELECT teams_json, created_at FROM game_results ORDER BY created_at ASC`)
    .all()
    .map((r) => ({ teams: JSON.parse(r.teams_json), playedAt: r.created_at }))
}

export function resetElo() {
  resetAllEloStmt.run()
}

export function getAllResults() {
  return getAllResultsStmt.all().map((row) => ({
    id: row.id,
    date: row.date,
    teams: JSON.parse(row.teams_json),
    winner: row.winner,
    source: row.source,
  }))
}

export function saveResult({ teams, winner, source }) {
  const now = Date.now()
  const id = genId(10)
  const date = new Date(now).toISOString()
  insertResultStmt.run(id, date, JSON.stringify(teams), winner, source || 'custom', now)
  return { id, date, teams, winner, source: source || 'custom', createdAt: now }
}

// --- Wheel helpers ------------------------------------------------------------
// A spin animates for ~3s on every client; after that the winner is removed and
// the wheel returns to idle. The grace guards against the finalize timer being
// lost (e.g. server restart) — getWheelState then finalizes lazily.
const SPIN_DURATION_MS = 3000
const SPIN_GRACE_MS = 1500

export function createWheel() {
  const now = Date.now()
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = genId()
    if (getWheelStmt.get(id)) continue
    insertWheelStmt.run(id, now, now)
    return id
  }
  throw new Error('Could not allocate a unique wheel id')
}

export function wheelExists(wheelId) {
  return Boolean(getWheelStmt.get(wheelId))
}

/** Assemble the full client-facing wheel state, or null if it is gone. */
export function getWheelState(wheelId) {
  const wheel = getWheelStmt.get(wheelId)
  if (!wheel) return null
  // Recovery guard: if a spin's finalize timer was lost, settle it lazily so the
  // wheel never stays stuck in 'spinning'.
  if (
    wheel.status === 'spinning' &&
    wheel.spin_started_at &&
    Date.now() - wheel.spin_started_at > SPIN_DURATION_MS + SPIN_GRACE_MS
  ) {
    finalizeWheelSpin(wheelId)
    return getWheelState(wheelId)
  }
  return {
    id: wheel.id,
    status: wheel.status,
    rotation: wheel.rotation,
    dativaColors: Boolean(wheel.use_dativa),
    spin:
      wheel.status === 'spinning' && wheel.spin_id
        ? {
            id: wheel.spin_id,
            winnerName: wheel.winner_name,
            winnerIndex: wheel.winner_index,
            startedAt: wheel.spin_started_at,
          }
        : null,
    players: getWheelPlayersStmt.all(wheelId),
  }
}

/** Idempotent check-in: returns the player row (existing or freshly inserted). */
export function addWheelPlayer(wheelId, name) {
  const now = Date.now()
  const id = genId(10)
  insertWheelPlayerStmt.run(id, wheelId, name, now)
  touchWheelStmt.run(now, wheelId)
  return getWheelPlayerByNameStmt.get(wheelId, name)
}

export function removeWheelPlayer(wheelId, playerId) {
  const info = deleteWheelPlayerStmt.run(wheelId, playerId)
  if (info.changes > 0) touchWheelStmt.run(Date.now(), wheelId)
  return info.changes > 0
}

export function setWheelSpinning(wheelId, { rotation, winnerName, winnerIndex, spinId, startedAt }) {
  setWheelSpinningStmt.run(rotation, winnerName, winnerIndex, spinId, startedAt, startedAt, wheelId)
}

/** Remove the chosen player and return the wheel to idle. */
export function finalizeWheelSpin(wheelId) {
  const wheel = getWheelStmt.get(wheelId)
  if (!wheel || wheel.status !== 'spinning') return
  if (wheel.winner_name) deleteWheelPlayerByNameStmt.run(wheelId, wheel.winner_name)
  setWheelIdleStmt.run(Date.now(), wheelId)
}

/** Toggle the shared colour palette (Dativa brand colours vs. default). */
export function setWheelPalette(wheelId, useDativa) {
  setWheelPaletteStmt.run(useDativa ? 1 : 0, Date.now(), wheelId)
}

/** Delete wheels untouched for longer than maxAgeMs. Returns rows removed. */
export function pruneWheels(maxAgeMs) {
  return pruneWheelsStmt.run(Date.now() - maxAgeMs).changes
}

export default db
