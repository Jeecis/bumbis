# Vue 3 template

## Local development

Run the backend API and frontend dev server in separate terminals.

Terminal 1:

```bash
cd server
yarn install
yarn dev
```

The API listens on `http://localhost:8787`.

Terminal 2:

```bash
yarn install
yarn dev
```

Open the Vite URL printed in the terminal, usually:

```text
http://localhost:5173
```

The frontend proxies `/api` to `http://localhost:8787`, so keep both processes
running for matchmaking features to work.

## Deploy

For the known live VPS layout, use:

```bash
bash scripts/deploy.sh
```

Optional overrides:
- `BUMBIS_REPO_DIR` to change the repo path (default `/var/www/bumbis`)
- `BUMBIS_BRANCH` to deploy a different branch (default `main`)
- `BUMBIS_NODE_BIN_DIR` to force a specific Node/Yarn bin path

Uses:
- Vue 3
- Vite
- vue-router
- Vitest
- TypeScript
- Eslint, Prettier, StyleLint
- Husky with commitlint and a pre-commit hook

---

## ELO Rating System

Player ratings are computed after every logged game and stored in SQLite.
All players start at **1200**. Ratings floor at **100** (can never go negative).

### Core formula

For each game, every team's performance is evaluated against **every other team** in a pairwise fashion. Each player receives the average of those pairwise deltas scaled by their personal K-factor.

```
Delta_player = K × average over opponents of (S − E)
```

**Expected score E** (logistic curve, 400-point scale):

```
E_A = 1 / (1 + 10 ^ ((R_B_eff − R_A_eff) / 400))
```

**Actual score S** (continuous, score-based — not binary win/loss):

```
S_A = score_A / (score_A + score_B)
```

A 10-2 win produces S ≈ 0.83 (high reward). A 10-9 squeaker produces S ≈ 0.53 (small reward). Both teams scoring 0 is treated as a draw (S = 0.5).

### Team size adjustment

Effective team rating accounts for the collective advantage of fielding more players:

```
R_eff = average_rating × √(team_size)
```

| Scenario | Solo (1200) R_eff | Duo (avg 1200) R_eff | Solo win probability |
|---|---|---|---|
| 1v2, equal ratings | 1200 | 1697 | ~5 % |
| 1v2, solo is 200 pts stronger | 1400 | 1697 | ~17 % |
| 2v2 | 1697 | 1697 | 50 % |

A solo player who beats a duo earns a huge rating gain. Losing costs very little.

### K-factor progression

| Games played | K |
|---|---|
| < 10 (provisional) | 40 |
| 10 – 29 | 30 |
| 30 + | 20 |

Infrequent players retain a higher K longer, so each rare win moves their rating faster — rewarding consistent performance regardless of activity level.

### Handling the "best player with worst player" case

When a high-rated player (e.g. 1600) is paired with a low-rated player (e.g. 600), the team average drops to 1100, making them underdogs against a balanced pair. This is encoded directly in the expected value: a win from the underdog position yields **more** ELO; a loss costs **less**. No special carry penalty is applied — the math handles it structurally.

### Multi-team games (3 or 4 teams)

Each team is compared pairwise against every other team. The per-player delta is the **average** of all pairwise results, so the total movement is normalised regardless of how many teams played.

### Edge cases

| Situation | Behaviour |
|---|---|
| New / non-default player | Starts at 1200, K = 40 |
| Team with no named players | Skipped — no ELO update for that team |
| Fewer than 2 teams with players | Entire game skipped for ELO |
| 1v2 (asymmetric team size) | Size penalised via √(team_size) effective rating |
| All scores tied at 0 | Treated as a mutual draw (S = 0.5 for all) |
| Tied winners (e.g. 7-7) | Both teams receive positive delta if they beat the expected value |
| Server restart with existing results | ELO is bootstrapped by replaying all results in chronological order |
