// Run: node --test src/forum.test.js
// Exercises the Friday Food Forum vote rules and deadline lock-on-read, which is
// where the logic lives. The wheel winner-weighting is verified end-to-end.
import test from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// db.js opens its database at import time from $BUMBIS_DB — point it at a throwaway
// file before importing so the test never touches real data.
process.env.BUMBIS_DB = join(tmpdir(), `bumbis-forum-test-${process.pid}-${Date.now()}.db`)
const db = await import('./db.js')

function freshForum(opts) {
  const { id } = db.createForum(opts)
  return { id, state: db.getForumState(id) }
}

test('a new forum is seeded with the six default places', () => {
  const { state } = freshForum()
  assert.deepEqual(
    state.places.map((p) => p.name),
    db.FORUM_DEFAULT_PLACES,
  )
  assert.equal(state.status, 'open')
})

test('single mode rejects voting for two places', () => {
  const { id, state } = freshForum({ selectionMode: 'single' })
  const voter = db.addVoter(id, 'Ann')
  const [a, b] = state.places
  assert.throws(() => db.setVote(id, voter.id, [a.id, b.id]), /one place/i)
})

test('switching multi -> single collapses each voter to one vote', () => {
  const { id, state } = freshForum({ selectionMode: 'multi' })
  const voter = db.addVoter(id, 'Mo')
  const [a, b, c] = state.places
  db.setVote(id, voter.id, [a.id, b.id, c.id])
  db.updateForumConfig(id, { selectionMode: 'single' })
  const total = db.getForumState(id).places.reduce((sum, p) => sum + p.votes, 0)
  assert.equal(total, 1)
})

test('multi mode accepts several places and counts them', () => {
  const { id, state } = freshForum({ selectionMode: 'multi' })
  const voter = db.addVoter(id, 'Bob')
  const [a, b, c] = state.places
  assert.equal(db.setVote(id, voter.id, [a.id, b.id, c.id]), true)
  const counts = Object.fromEntries(db.getForumState(id).places.map((p) => [p.id, p.votes]))
  assert.equal(counts[a.id], 1)
  assert.equal(counts[b.id], 1)
  assert.equal(counts[c.id], 1)
})

test('re-voting replaces the previous choice', () => {
  const { id, state } = freshForum({ selectionMode: 'single' })
  const voter = db.addVoter(id, 'Cy')
  const [a, b] = state.places
  db.setVote(id, voter.id, [a.id])
  db.setVote(id, voter.id, [b.id])
  const counts = Object.fromEntries(db.getForumState(id).places.map((p) => [p.id, p.votes]))
  assert.equal(counts[a.id], 0)
  assert.equal(counts[b.id], 1)
})

test('voting for an unknown voter fails', () => {
  const { id, state } = freshForum()
  assert.equal(db.setVote(id, 'nobody', [state.places[0].id]), false)
})

test('kicking a voter removes their votes', () => {
  const { id, state } = freshForum({ selectionMode: 'single' })
  const voter = db.addVoter(id, 'Dee')
  db.setVote(id, voter.id, [state.places[0].id])
  db.removeVoter(id, voter.id)
  const after = db.getForumState(id)
  assert.equal(after.voters.length, 0)
  assert.equal(after.places[0].votes, 0)
})

test('suggested places stay pending and unvotable until approved', () => {
  const { id } = freshForum({ selectionMode: 'multi' })
  db.addPlace(id, 'Sushi', 0) // 0 = suggestion, not auto-approved
  const sushi = db.getForumState(id).places.find((p) => p.name === 'Sushi')
  assert.equal(sushi.approved, false)

  const voter = db.addVoter(id, 'Zoe')
  db.setVote(id, voter.id, [sushi.id]) // ignored: pending places aren't votable
  assert.equal(db.getForumState(id).places.find((p) => p.name === 'Sushi').votes, 0)

  db.approvePlace(id, sushi.id)
  assert.equal(db.getForumState(id).places.find((p) => p.name === 'Sushi').approved, true)
  db.setVote(id, voter.id, [sushi.id])
  assert.equal(db.getForumState(id).places.find((p) => p.name === 'Sushi').votes, 1)
})

test('a passed deadline flips the forum to locked on read', () => {
  const { id } = freshForum()
  db.updateForumConfig(id, { deadlineAt: Date.now() - 1 }) // already expired
  assert.equal(db.getForumState(id).status, 'locked')
})

test('a future deadline leaves the forum open', () => {
  const { id } = freshForum()
  db.updateForumConfig(id, { deadlineAt: Date.now() + 60_000 })
  assert.equal(db.getForumState(id).status, 'open')
})
