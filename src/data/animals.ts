import type { RarityId } from "./rarities.ts";

// ---------------------------------------------------------------------------
// ANIMALS
// ---------------------------------------------------------------------------
// The full progression chain. Buying an animal unlocks the NEXT one in
// `unlockOrder`. Rarity controls how often it appears in shop restocks
// (see rarities.ts spawnWeight).
//
// Art convention: drop a 1024x1024 kawaii PNG at  public/animals/<asset>.png
// and it is used automatically. Until then the `emoji` is shown as a fallback.
//
// `price`     = cost in Treats to buy from the shop (one-time).
// `saleValue` = Treats a customer pays each time the animal completes a full
//               care loop (see config.ts SALE_PROFIT_MULT). Editable per-animal
//               via the optional `saleValueOverride`.
// ---------------------------------------------------------------------------

export interface AnimalDef {
  id: string;
  name: string;
  rarity: RarityId;
  price: number;
  /** Position in the buy-unlocks-next progression chain (1 = first). */
  unlockOrder: number;
  /** Filename (without extension) under public/animals/. */
  asset: string;
  /** Fallback shown until a PNG exists at public/animals/<asset>.png */
  emoji: string;
  /** Optional hard override for the per-loop sale value. */
  saleValueOverride?: number;
}

// Raw table — kept in unlock order for easy editing.
// [name, rarity, price, emoji, assetOverride?]
type Row = [string, RarityId, number, string, string?];

const ROWS: Row[] = [
  // Stinky
  ["Fly", "stinky", 1, "🪰"],
  ["Frog", "stinky", 8, "🐸"],
  ["Caterpillar", "stinky", 25, "🐛"],
  // Common
  ["Fish", "common", 60, "🐟"],
  ["Kitten", "common", 120, "🐱"],
  ["Pigeon", "common", 220, "🕊️"],
  ["Chicken", "common", 380, "🐔"],
  ["Bunny", "common", 600, "🐰"],
  ["Pig", "common", 950, "🐷"],
  ["Turkey", "common", 1_400, "🦃"],
  // Uncommon
  ["Bear", "uncommon", 2_200, "🐻"],
  ["Pug", "uncommon", 3_400, "🐶"],
  ["Axolotl", "uncommon", 5_000, "🦎"],
  ["Turtle", "uncommon", 7_500, "🐢"],
  ["Ferret", "uncommon", 11_000, "🐾"],
  ["Otter", "uncommon", 16_000, "🦦"],
  ["Seahorse", "uncommon", 23_000, "🐡"],
  ["Blue Jay", "uncommon", 33_000, "🐦"],
  // Rare
  ["Fennec Fox", "rare", 48_000, "🦊"],
  ["Chinchilla", "rare", 68_000, "🐭"],
  ["Owl", "rare", 95_000, "🦉"],
  ["Puffin", "rare", 135_000, "🐧"],
  ["Sloth", "rare", 190_000, "🦥"],
  ["Armadillo", "rare", 270_000, "🦔"],
  ["Parrot", "rare", 380_000, "🦜"],
  // Ultra Rare
  ["Octopus", "ultraRare", 540_000, "🐙"],
  ["Jellyfish", "ultraRare", 760_000, "🪼"],
  ["Stingray", "ultraRare", 1_050_000, "🐠"],
  ["Salmon", "ultraRare", 1_500_000, "🐟"],
  ["Sea Lion", "ultraRare", 2_100_000, "🦭"],
  ["Seal", "ultraRare", 2_900_000, "🦭"],
  ["Monkey", "ultraRare", 4_100_000, "🐵"],
  ["Shark", "ultraRare", 5_700_000, "🦈"],
  // Legendary
  ["Walrus", "legendary", 8_000_000, "🦭"],
  ["Horse", "legendary", 11_000_000, "🐴"],
  ["Kangaroo", "legendary", 15_500_000, "🦘"],
  ["Zebra", "legendary", 22_000_000, "🦓"],
  ["Giraffe", "legendary", 30_000_000, "🦒"],
  ["Elephant", "legendary", 42_000_000, "🐘"],
  ["Orca", "legendary", 60_000_000, "🐋"],
  ["Whale", "legendary", 85_000_000, "🐳"],
  // Mythic
  ["Bighorn Sheep", "mythic", 120_000_000, "🐏"],
  ["Polar Bear", "mythic", 170_000_000, "🐻‍❄️"],
  ["Panda", "mythic", 240_000_000, "🐼"],
  ["Dinosaur", "mythic", 340_000_000, "🦕"],
  ["Dodo", "mythic", 480_000_000, "🦤"],
  ["Dumb Dodo", "mythic", 680_000_000, "🦤"],
  ["Rainbow Dodo", "mythic", 950_000_000, "🌈"],
  ["Golden Axolotl", "mythic", 1_350_000_000, "✨"],
  // Special
  ["Leo", "special", 2_000_000_000, "🦮"],
  ["Willow", "special", 3_000_000_000, "🐶"],
  ["Fitz", "special", 4_500_000_000, "🐕"],
  ["Lárus Dodo", "special", 7_000_000_000, "🦤", "larus-dodo"],
  ["Schaffer Dodo", "special", 11_000_000_000, "🦤", "schaffer-dodo"],
  ["Amanda Dodo", "special", 18_000_000_000, "🦤", "amanda-dodo"],
  // Impossible
  ["Megalodon", "impossible", 50_000_000_000, "🦈"],
];

/** Turn a display name into a safe lowercase asset / id slug. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (Lárus -> larus)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const ANIMALS: AnimalDef[] = ROWS.map((row, i) => {
  const [name, rarity, price, emoji, assetOverride] = row;
  const asset = assetOverride ?? slug(name);
  return {
    id: asset,
    name,
    rarity,
    price,
    unlockOrder: i + 1,
    asset,
    emoji,
  };
});

/** Quick lookup by id. */
export const ANIMAL_BY_ID: Record<string, AnimalDef> = Object.fromEntries(
  ANIMALS.map((a) => [a.id, a]),
);

/** The first animal in the chain (what the player can buy at the very start). */
export const FIRST_ANIMAL = ANIMALS[0];
