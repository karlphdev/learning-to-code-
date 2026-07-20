import { defineConfig } from 'vite';

// `base: './'` → tous les liens générés sont RELATIFS. Indispensable car le jeu
// est servi sur un sous-chemin (https://karlphdev.github.io/learning-to-code-/)
// et non à la racine du domaine. Sans ça, les scripts/CSS pointeraient vers `/…`
// et l'app afficherait une page blanche en ligne.
export default defineConfig({
  base: './',
});
