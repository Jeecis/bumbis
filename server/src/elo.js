/**
 * Bumbis Score-Weighted Team ELO
 *
 * Key design decisions:
 *
 * 1. Score-based result (not binary win/loss)
 *    S_A = score_A / (score_A + score_B) per pairwise comparison.
 *    A 10-2 win counts far more than a 10-9 squeaker.
 *
 * 2. Effective team rating accounts for team size
 *    R_eff = avg_rating * sqrt(team_size)
 *    A solo player facing a duo is a significant underdog even at equal ratings.
 *    Winning alone against two earns a large ELO boost; losing costs little.
 *
 * 3. Multi-team games handled via pairwise averaging
 *    Each team is compared against every other team.
 *    Per-player delta = K * average(S - E over all opponents).
 *
 * 4. Individual K-factor progression
 *    K=40 (< 10 games) → K=30 (10-29) → K=20 (30+)
 *    Infrequent but always-winning players keep high K longer, so their
 *    rating rises faster per game — rewarding consistent winners.
 *
 * 5. New / non-default players start at INITIAL_RATING (1200).
 *    No special treatment — they earn their true rating through play.
 *
 * 6. "Carry" is handled structurally, not by penalising individuals.
 *    A 1600-rated player paired with a 600-rated player has a lower team avg,
 *    making the team the underdog. A win gives everyone on that team more ELO;
 *    a loss costs everyone less. The disparity is priced into the expected value.
 */

export const INITIAL_RATING = 1200

export function kFactor(gamesPlayed) {
  if (gamesPlayed < 10) return 40
  if (gamesPlayed < 30) return 30
  return 20
}

/**
 * Expected score for team A vs team B using their effective ratings.
 * Standard logistic formula on a 400-point scale.
 */
function expectedScore(effA, effB) {
  return 1 / (1 + Math.pow(10, (effB - effA) / 400))
}

/**
 * Compute ELO deltas for a single game.
 *
 * @param {Array<{ players: string[], score: number }>} teams
 * @param {Map<string, { rating: number, gamesPlayed: number }>} currentRatings
 * @returns {Map<string, { delta: number, oldRating: number, won: boolean, gamesPlayed: number }>}
 */
export function computeEloChanges(teams, currentRatings) {
  // Only consider teams that have at least one named player.
  const valid = teams.filter((t) => Array.isArray(t.players) && t.players.length > 0)
  if (valid.length < 2) return new Map()

  const maxScore = Math.max(...valid.map((t) => t.score))

  // Enrich each team with derived metrics.
  const enriched = valid.map((team) => {
    const ratings = team.players.map(
      (name) => currentRatings.get(name)?.rating ?? INITIAL_RATING,
    )
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
    return {
      players: team.players,
      score: team.score,
      avgRating,
      // Size adjustment: solo player has R_eff = R; a duo has R_eff = R*√2 ≈ R*1.41
      effRating: avgRating * Math.sqrt(team.players.length),
      won: team.score === maxScore,
    }
  })

  const n = enriched.length
  const changes = new Map()

  for (let i = 0; i < n; i++) {
    const teamA = enriched[i]

    // Average the pairwise (S - E) across all opponents.
    let pairwiseSum = 0
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const teamB = enriched[j]
      const E = expectedScore(teamA.effRating, teamB.effRating)
      const total = teamA.score + teamB.score
      // If somehow both scores are 0, treat as a draw (S = 0.5).
      const S = total > 0 ? teamA.score / total : 0.5
      pairwiseSum += S - E
    }
    const pairwiseDelta = pairwiseSum / (n - 1)

    for (const name of teamA.players) {
      const gp = currentRatings.get(name)?.gamesPlayed ?? 0
      changes.set(name, {
        delta: kFactor(gp) * pairwiseDelta,
        oldRating: currentRatings.get(name)?.rating ?? INITIAL_RATING,
        won: teamA.won,
        gamesPlayed: gp,
      })
    }
  }

  return changes
}
