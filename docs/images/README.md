# Images pour la documentation

Ce dossier contient les captures d’écran utilisées dans le README :

- **read-mode.png** — Vue en mode lecture (sans barre d’outils ni palettes)
- **edit-mode.png** — Vue en mode édition (toolbar, palette gauche, panneau propriétés)

Pour régénérer les captures (via Playwright, en Docker) :

```bash
docker compose -f docker/docker-compose.yml run --rm e2e sh -lc "npm install && npm run docs:screenshots"
```
