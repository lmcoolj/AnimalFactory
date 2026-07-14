import { CONFIG, saleValueFor } from "../data/config.ts";
import { ANIMAL_BY_ID } from "../data/animals.ts";
import { STATIONS, STATION_COUNT } from "../data/stations.ts";
import type { BeltAnimal, GameState, Modifiers } from "./types.ts";

/** A payout worth showing as floating text. */
export interface Payout {
  x: number;
  y: number;
  amount: number;
  kind: "care" | "sale";
}

function baseSale(animalId: string): number {
  return saleValueFor(ANIMAL_BY_ID[animalId].price);
}

function effectiveSale(animalId: string, mods: Modifiers): number {
  return Math.max(1, Math.round(baseSale(animalId) * mods.saleMult));
}

function careTip(animalId: string, mods: Modifiers): number {
  return Math.max(1, Math.round(effectiveSale(animalId, mods) * CONFIG.CARE_TIP_RATIO));
}

// --- Completing a single station service -----------------------------------
function completeService(
  a: BeltAnimal,
  state: GameState,
  mods: Modifiers,
  emit: (p: Payout) => void,
): void {
  const tip = careTip(a.animalId, mods);
  state.treats += tip;
  state.totalEarned += tip;
  emit({ x: a.x, y: a.y, amount: tip, kind: "care" });

  a.progress = 0;
  if (a.stationIndex >= STATION_COUNT - 1) {
    a.mode = "awaitCustomer";
  } else {
    a.mode = "travel";
  }
}

// --- Completing a sale ------------------------------------------------------
function sellAnimal(
  a: BeltAnimal,
  state: GameState,
  mods: Modifiers,
  emit: (p: Payout) => void,
): void {
  const pay = effectiveSale(a.animalId, mods);
  state.treats += pay;
  state.totalEarned += pay;
  state.totalSales += 1;
  emit({ x: a.x, y: a.y, amount: pay, kind: "sale" });

  // The customer takes the animal home — it leaves the belt.
  a.sold = true;
}

/** Drop animals that were just sold from a row. */
function removeSold(row: GameState["rows"][number]): void {
  if (row.animals.some((a) => a.sold)) {
    row.animals = row.animals.filter((a) => !a.sold);
  }
}

// --- Per-frame simulation ---------------------------------------------------
export function updateFactory(
  state: GameState,
  mods: Modifiers,
  dt: number,
  emit: (p: Payout) => void,
): void {
  for (const row of state.rows) {
    for (const a of row.animals) {
      switch (a.mode) {
        case "service": {
          const st = STATIONS[a.stationIndex];
          if (mods.automatedStations[st.id]) {
            const serviceTime =
              CONFIG.BASE_SERVICE_SECONDS / mods.serviceSpeedMult[st.id];
            a.progress += dt / serviceTime;
            if (a.progress >= 1) completeService(a, state, mods, emit);
          }
          // manual: waits for a click (handled in serviceClick)
          break;
        }
        case "travel": {
          const travelTime = CONFIG.BASE_TRAVEL_SECONDS / mods.beltSpeedMult;
          a.progress += dt / travelTime;
          if (a.progress >= 1) {
            a.stationIndex += 1;
            a.mode = "service";
            a.progress = 0;
          }
          break;
        }
        case "awaitCustomer": {
          const custTime = CONFIG.BASE_CUSTOMER_SECONDS / mods.customerRateMult;
          a.progress += dt / custTime;
          if (a.progress >= 1) {
            a.mode = "awaitSale";
            a.progress = 1;
          }
          break;
        }
        case "awaitSale": {
          if (mods.autoCheckout) sellAnimal(a, state, mods, emit);
          break;
        }
      }
    }
    removeSold(row);
  }
}

// --- Player interactions ----------------------------------------------------

/** Service every animal waiting at the given station in a row. Returns total. */
export function serviceClick(
  state: GameState,
  mods: Modifiers,
  rowId: number,
  stationIndex: number,
  emit: (p: Payout) => void,
): number {
  const row = state.rows.find((r) => r.id === rowId);
  if (!row) return 0;
  let gained = 0;
  const before = state.treats;
  for (const a of row.animals) {
    if (a.mode === "service" && a.stationIndex === stationIndex) {
      completeService(a, state, mods, emit);
    }
  }
  gained = state.treats - before;
  return gained;
}

/** Nudge all travelling animals in a row further along the belt. */
export function nudgeRow(state: GameState, rowId: number): boolean {
  const row = state.rows.find((r) => r.id === rowId);
  if (!row) return false;
  let moved = false;
  for (const a of row.animals) {
    if (a.mode === "travel") {
      a.progress = Math.min(1, a.progress + CONFIG.NUDGE_AMOUNT);
      moved = true;
    }
  }
  return moved;
}

/** Complete sales for every animal with a waiting customer in a row. */
export function sellClick(
  state: GameState,
  mods: Modifiers,
  rowId: number,
  emit: (p: Payout) => void,
): number {
  const row = state.rows.find((r) => r.id === rowId);
  if (!row) return 0;
  const before = state.treats;
  for (const a of row.animals) {
    if (a.mode === "awaitSale") sellAnimal(a, state, mods, emit);
  }
  removeSold(row);
  return state.treats - before;
}

export { baseSale, effectiveSale };
