// ═══════════════════════════════════════════════════════════════════
// CONFIG — toutes les constantes d'équilibrage du jeu, au même endroit.
// Pour régler la difficulté, la physique ou les dimensions : c'est ici.
// ═══════════════════════════════════════════════════════════════════

// Résolution logique du jeu (pixel-art 16:9)
export const W = 256, H = 144;

// Physique
export const GROUND_Y = 118;   // y du sol de la jungle (en pixels monde)
export const GRAVITY = 0.28;

// Puissance du pingouin (grandit à chaque sommet)
export const SPEED_BASE = 3.0;   // vitesse de base du vélo
export const JUMP_BASE = -4.5;   // impulsion de saut de base
export const PUSH_BASE = 1.7;    // force de poussée de base sur la balle

// Paliers de skills
export const FLIP_LEVEL = 15;    // niveau du salto avant (Entrée en l'air)
export const CRUSH_LEVEL = 5;    // niveau où la balle écrase les poissons

// Géographie du monde
export const MOUNTAIN_START = 700;   // x où la jungle plate devient la montagne
export const SUMMIT_X = 2800;        // x du sommet
export const SUMMIT_H = 620;         // hauteur totale à gravir (px monde)
export const WORLD_LEFT = -900;      // bord gauche de la jungle

// La balle (rocher de Sisyphe)
export const BOULDER_R = 14;                        // rayon
export const BOULDER_FOOT = MOUNTAIN_START + 40;    // là où elle attend, au pied

// Rendu du pingouin
export const PS = 2;           // échelle des pingouins (joueur + NPCs)
export const RIDE_LIFT = 11;   // hauteur de la selle : remonte le pingouin sur le vélo

// Bébé pingouin (niv 13)
export const BABY_LAG = 26;    // frames de retard sur le joueur
