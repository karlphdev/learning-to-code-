# Penguin World 🐧🏔

Un jeu 2D pixel-art centré autour de la philosophie de l'absurde : un pingouin
à vélo pousse éternellement une balle vers le sommet d'une montagne enneigée.
À chaque sommet atteint, il monte d'un niveau et débloque de nouveaux pouvoirs
— et le rocher redescend. Il faut imaginer le pingouin heureux.

## Lancer le jeu

```bash
npm install     # une seule fois
npm run dev     # puis ouvrir l'URL affichée (http://localhost:5173)
```

`npm run build` génère la version optimisée dans `dist/`.

## Contrôles

| Touche | Action |
|--------|--------|
| Q / D ou ← / → | rouler |
| Z / ↑ / Espace | sauter (dès le niv 2 : avec la balle) |
| E | pousser la balle en avant (niv 3+) |
| R | lance-missile (niv 11+) |
| U (maintenu) | geyser (niv 12+) |
| Entrée (en l'air) | salto (niv 15+) |
| I puis 1-5 | inventaire des vélos |
| M | couper / remettre la musique |
| P / O | **triche de test** : niveau +1 / −1 |

## Architecture (`src/`)

| Fichier | Rôle |
|---------|------|
| `main.js` | point d'entrée : boucle à pas de temps fixe (60 pas/s) + composition du rendu |
| `config.js` | toutes les constantes d'équilibrage |
| `state.js` | le canvas et l'état global mutable `G` |
| `input.js` | clavier : état des touches + raccourcis |
| `world.js` | le profil du terrain (`groundY`) |
| `progression.js` | niveaux, puissance, level-up, triche |
| `player.js` | le pingouin : sprite, physique, dessin |
| `boulder.js` | la balle de Sisyphe |
| `skills.js` | l'arbre de pouvoirs (coup de lame, missile, geyser, bébé) |
| `enemies.js` | les poissons à pattes en Air Force 1 |
| `obstacles.js` | les pics de glace |
| `aura.js` | l'aura colorée qui grossit niveau après niveau |
| `bikes.js` | les 5 vélos |
| `background.js` | ciel, soleil, nuages, brouillard, vignette |
| `terrain.js` | sol, jungle, végétation |
| `decor.js` | NPCs, chèvres, Sisyphe miniature, murmures |
| `audio.js` | musique 8-bit procédurale (Web Audio) |
| `ui.js` | HUD, bannière de sommet, inventaire |
