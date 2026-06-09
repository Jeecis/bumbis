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
 *    Provisional penalty: players with fewer than PROVISIONAL_GAMES games have
 *    their effective rating reduced linearly toward (INITIAL_RATING - PROVISIONAL_PENALTY).
 *    This treats unknowns conservatively — their team's expected strength is lower,
 *    so a win counts more and a loss costs less for everyone on that team.
 *
 * 6. "Carry" is handled structurally, not by penalising individuals.
 *    A 1600-rated player paired with a 600-rated player has a lower team avg,
 *    making the team the underdog. A win gives everyone on that team more ELO;
 *    a loss costs everyone less. The disparity is priced into the expected value.
 *
 * 7. Anonymous teams (no resolvable players) still participate in expected-value
 *    calculation at INITIAL_RATING so that named opponents get meaningful ELO
 *    changes even when the opposing team has no tracked identity.
 */

export const INITIAL_RATING = 1200

// New players are assumed to be below average until they've played enough games.
// Their effective rating for team-strength calculation is penalised by up to
// PROVISIONAL_PENALTY points, shrinking linearly to zero by PROVISIONAL_GAMES.
const PROVISIONAL_GAMES = 10
const PROVISIONAL_PENALTY = 200

function provisionalRating(rating, gamesPlayed) {
  if (gamesPlayed >= PROVISIONAL_GAMES) return rating
  return rating - PROVISIONAL_PENALTY * (1 - gamesPlayed / PROVISIONAL_GAMES)
}

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
 * Resolve the effective player list for a team.
 *
 * Priority:
 *   1. Explicit players array (if non-empty)
 *   2. Team name as a single player — only when the name is not the default
 *      "Team N" pattern, so auto-names don't pollute the rankings.
 *   3. Empty → anonymous (used for opponent strength only, no ELO update)
 */
function resolvePlayers(team) {
  if (Array.isArray(team.players) && team.players.length > 0) return team.players
  if (team.name && !/^Team \d+$/i.test(team.name.trim())) return [team.name.trim()]
  return []
}

/**
 * Compute ELO deltas for a single game.
 *
 * @param {Array<{ name?: string, players: string[], score: number }>} teams
 * @param {Map<string, { rating: number, gamesPlayed: number }>} currentRatings
 * @returns {Map<string, { delta: number, oldRating: number, won: boolean, gamesPlayed: number }>}
 */
export function computeEloChanges(teams, currentRatings) {
  if (!Array.isArray(teams) || teams.length < 2) return new Map()

  const maxScore = Math.max(...teams.map((t) => t.score))

  const enriched = teams.map((team) => {
    const players = resolvePlayers(team)
    // Anonymous teams use INITIAL_RATING as a placeholder for opponent strength.
    const ratings =
      players.length > 0
        ? players.map((name) => {
            const entry = currentRatings.get(name)
            return provisionalRating(entry?.rating ?? INITIAL_RATING, entry?.gamesPlayed ?? 0)
          })
        : [INITIAL_RATING]
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
    const size = Math.max(1, players.length)
    return {
      players,
      score: team.score,
      effRating: avgRating * Math.sqrt(size),
      won: team.score === maxScore,
      anonymous: players.length === 0,
    }
  })

  // Need at least one team with a trackable identity.
  if (enriched.every((t) => t.anonymous)) return new Map()

  const n = enriched.length
  const changes = new Map()

  for (let i = 0; i < n; i++) {
    const teamA = enriched[i]
    if (teamA.anonymous) continue

    let pairwiseSum = 0
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const teamB = enriched[j]
      const E = expectedScore(teamA.effRating, teamB.effRating)
      const total = teamA.score + teamB.score
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
