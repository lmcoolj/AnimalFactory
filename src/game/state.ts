import { CONFIG } from "../data/config.ts";
import { ANIMALS } from "../data/animals.ts";
import type { BeltAnimal, GameState } from "./types.ts";

let uidCounter = 1;
export function nextUid(): number {
  return uidCounter++;
}
/** Keep the uid counter ahead of anything loaded from a save. */
export function primeUid(fromState: GameState): void {
  let max = 0;
  for (const row of fromState.rows) {
    for (const a of row.animals) max = Math.max(max, a.uid);
  }
  uidCounter = Math.max(uidCounter, max + 1);
}

export function createNewGame(now: number): GameState {
  const rows = [];
  for (let i = 0; i < CONFIG.START_ROWS; i++) {
    rows.push({ id: i, animals: [] as BeltAnimal[] });
  }
  return {
    treats: CONFIG.START_TREATS,
    totalEarned: 0,
    totalSales: 0,
    unlockedCount: 1,
    bought: {},
    upgrades: {},
    rows,
    shop: { offers: [], nextRestockAt: now },
    lastActiveAt: now,
    createdAt: now,
  };
}

/** Animals currently unlocked (buyable) in the progression chain. */
export function unlockedAnimals(state: GameState) {
  return ANIMALS.slice(0, state.unlockedCount);
}

/** Total animal slots across all rows given per-row capacity. */
export function totalCapacity(state: GameState, rowCapacity: number): number {
  return state.rows.length * rowCapacity;
}

export function totalAnimalsOnBelt(state: GameState): number {
  return state.rows.reduce((sum, r) => sum + r.animals.length, 0);
}

/** Put a new animal instance onto the first row with a free slot. */
export function placeAnimal(
  state: GameState,
  animalId: string,
  rowCapacity: number,
): BeltAnimal | null {
  for (const row of state.rows) {
    if (row.animals.length < rowCapacity) {
      const animal: BeltAnimal = {
        uid: nextUid(),
        animalId,
        rowId: row.id,
        slot: row.animals.length,
        stationIndex: 0,
        mode: "service",
        progress: 0,
        x: 0,
        y: 0,
        bob: Math.floor(uidCounter * 137.5) % 360,
      };
      row.animals.push(animal);
      return animal;
    }
  }
  return null;
}
