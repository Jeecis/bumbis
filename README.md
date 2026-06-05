# Vue 3 template

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
