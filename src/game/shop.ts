import { CONFIG } from "../data/config.ts";
import { ANIMALS, ANIMAL_BY_ID } from "../data/animals.ts";
import { RARITIES } from "../data/rarities.ts";
import { placeAnimal } from "./state.ts";
import type { GameState, Modifiers, ShopOffer } from "./types.ts";

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Weighted pick (by rarity spawnWeight) without replacement. */
function weightedPick(pool: string[], count: number): string[] {
  const chosen: string[] = [];
  const remaining = [...pool];
  while (chosen.length < count && remaining.length > 0) {
    let total = 0;
    for (const id of remaining) total += RARITIES[ANIMAL_BY_ID[id].rarity].spawnWeight;
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < remaining.length; idx++) {
      r -= RARITIES[ANIMAL_BY_ID[remaining[idx]].rarity].spawnWeight;
      if (r <= 0) break;
    }
    idx = Math.min(idx, remaining.length - 1);
    chosen.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return chosen;
}

/** Build a fresh shop stock. */
export function restockShop(state: GameState, now: number): void {
  const unlocked = ANIMALS.slice(0, state.unlockedCount).map((a) => a.id);

  const offers: ShopOffer[] = [];
  const used = new Set<string>();

  // Always guarantee the current frontier animal (if not yet bought) so the
  // progression chain never hard-stalls behind rarity odds.
  const frontier = ANIMALS[state.unlockedCount - 1];
  if (frontier && !state.bought[frontier.id]) {
    offers.push({ animalId: frontier.id, stock: randInt(CONFIG.SHOP_STOCK_MIN, CONFIG.SHOP_STOCK_MAX) });
    used.add(frontier.id);
  }

  const pool = unlocked.filter((id) => !used.has(id));
  const picks = weightedPick(pool, CONFIG.SHOP_SLOTS - offers.length);
  for (const id of picks) {
    offers.push({ animalId: id, stock: randInt(CONFIG.SHOP_STOCK_MIN, CONFIG.SHOP_STOCK_MAX) });
  }

  state.shop.offers = offers;
  state.shop.nextRestockAt = now + CONFIG.SHOP_RESTOCK_MS;
}

/** Restock if the timer elapsed. */
export function maybeRestock(state: GameState, now: number): boolean {
  if (now >= state.shop.nextRestockAt) {
    restockShop(state, now);
    return true;
  }
  return false;
}

export type BuyResult =
  | { ok: true; unlockedNew: boolean }
  | { ok: false; reason: "no-stock" | "too-expensive" | "belt-full" };

export function buyAnimal(
  state: GameState,
  animalId: string,
  mods: Modifiers,
): BuyResult {
  const def = ANIMAL_BY_ID[animalId];
  const offer = state.shop.offers.find((o) => o.animalId === animalId);
  if (!offer || offer.stock <= 0) return { ok: false, reason: "no-stock" };
  if (state.treats < def.price) return { ok: false, reason: "too-expensive" };

  const placed = placeAnimal(state, animalId, mods.rowCapacity);
  if (!placed) return { ok: false, reason: "belt-full" };

  state.treats -= def.price;
  offer.stock -= 1;
  state.bought[animalId] = (state.bought[animalId] ?? 0) + 1;

  // Unlock the next animal in the chain the first time we buy the frontier.
  let unlockedNew = false;
  const frontierIndex = state.unlockedCount - 1;
  if (def.unlockOrder - 1 === frontierIndex && state.unlockedCount < ANIMALS.length) {
    state.unlockedCount += 1;
    unlockedNew = true;
  }
  return { ok: true, unlockedNew };
}
