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

export default db
