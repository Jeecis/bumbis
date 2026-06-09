import Database from 'better-sqlite3'
import { randomBytes } from 'node:crypto'
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
`)

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

const getPlayerEloStmt = db.prepare(`SELECT name, rating, games_played FROM player_elo WHERE name = ?`)
const getAllPlayerEloStmt = db.prepare(
  `SELECT name, rating, games_played, wins FROM player_elo ORDER BY rating DESC`,
)
const upsertPlayerEloStmt = db.prepare(`
  INSERT INTO player_elo (name, rating, games_played, wins, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET
    rating       = excluded.rating,
    games_played = excluded.games_played,
    wins         = excluded.wins,
    updated_at   = excluded.updated_at
`)
const resetAllEloStmt = db.prepare(`DELETE FROM player_elo`)

const insertResultStmt = db.prepare(
  `INSERT INTO game_results (id, date, teams_json, winner, source, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`,
)
const getAllResultsStmt = db.prepare(
  `SELECT id, date, teams_json, winner, source FROM game_results ORDER BY created_at DESC`,
)

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

export function getPlayerRatingsMap() {
  const rows = getAllPlayerEloStmt.all()
  const map = new Map()
  for (const row of rows) {
    map.set(row.name, { rating: row.rating, gamesPlayed: row.games_played })
  }
  return map
}

export function getLeaderboard() {
  return getAllPlayerEloStmt.all().map((r) => ({
    name: r.name,
    rating: Math.round(r.rating),
    games_played: r.games_played,
    wins: r.wins,
  }))
}

export function applyEloChanges(changes) {
  const now = Date.now()
  const apply = db.transaction(() => {
    for (const [name, { delta, oldRating, won, gamesPlayed }] of changes) {
      const currentRow = getPlayerEloStmt.get(name)
      const currentRating = currentRow?.rating ?? oldRating
      const currentGames = currentRow?.games_played ?? gamesPlayed
      const currentWins = currentRow?.wins ?? 0
      upsertPlayerEloStmt.run(
        name,
        Math.max(100, currentRating + delta),
        currentGames + 1,
        currentWins + (won ? 1 : 0),
        now,
      )
    }
  })
  apply()
}

export function getResultsForRecalculation() {
  return db
    .prepare(`SELECT teams_json FROM game_results ORDER BY created_at ASC`)
    .all()
    .map((r) => JSON.parse(r.teams_json))
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
  return { id, date, teams, winner, source: source || 'custom' }
}

export default db
