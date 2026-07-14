// ---------------------------------------------------------------------------
// RARITY TIERS
// ---------------------------------------------------------------------------
// Each tier controls two things:
//   1. how the animal's NAME is styled in the UI (juicy text effects)
//   2. how often the animal appears when the shop restocks (spawnWeight)
//
// Rarer tiers have a much smaller spawnWeight, so they show up in stock less
// often. Tweak `spawnWeight` to make rare animals easier / harder to catch.
// ---------------------------------------------------------------------------

export type RarityId =
  | "stinky"
  | "common"
  | "uncommon"
  | "rare"
  | "ultraRare"
  | "legendary"
  | "mythic"
  | "special"
  | "impossible";

export interface Rarity {
  id: RarityId;
  label: string;
  /** Relative odds of appearing in a shop restock. Higher = more common. */
  spawnWeight: number;
  /** CSS class applied to the animal's name text for its juicy styling. */
  styleClass: string;
  /** A representative color (used for borders / glows / accents). */
  accent: string;
}

export const RARITIES: Record<RarityId, Rarity> = {
  stinky: {
    id: "stinky",
    label: "Stinky",
    spawnWeight: 1000,
    styleClass: "rarity-stinky",
    accent: "#6b7d2a",
  },
  common: {
    id: "common",
    label: "Common",
    spawnWeight: 620,
    styleClass: "rarity-common",
    accent: "#c9c9c9",
  },
  uncommon: {
    id: "uncommon",
    label: "Uncommon",
    spawnWeight: 340,
    styleClass: "rarity-uncommon",
    accent: "#8fae6a",
  },
  rare: {
    id: "rare",
    label: "Rare",
    spawnWeight: 170,
    styleClass: "rarity-rare",
    accent: "#8ecaff",
  },
  ultraRare: {
    id: "ultraRare",
    label: "Ultra Rare",
    spawnWeight: 78,
    styleClass: "rarity-ultra-rare",
    accent: "#2f8bff",
  },
  legendary: {
    id: "legendary",
    label: "Legendary",
    spawnWeight: 32,
    styleClass: "rarity-legendary",
    accent: "#f2c14e",
  },
  mythic: {
    id: "mythic",
    label: "Mythic",
    spawnWeight: 12,
    styleClass: "rarity-mythic",
    accent: "#ffd970",
  },
  special: {
    id: "special",
    label: "Special",
    spawnWeight: 4,
    styleClass: "rarity-special",
    accent: "#ff7bd5",
  },
  impossible: {
    id: "impossible",
    label: "Impossible",
    spawnWeight: 1,
    styleClass: "rarity-impossible",
    accent: "#111111",
  },
};

/** Tiers in ascending order of rarity (used for sorting / progression). */
export const RARITY_ORDER: RarityId[] = [
  "stinky",
  "common",
  "uncommon",
  "rare",
  "ultraRare",
  "legendary",
  "mythic",
  "special",
  "impossible",
];
