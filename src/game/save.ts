import { CONFIG } from "../data/config.ts";
import { STATIONS, STATION_COUNT } from "../data/stations.ts";
import { computeModifiers } from "./modifiers.ts";
import { effectiveSale } from "./factory.ts";
import { primeUid } from "./state.ts";
import type { GameState, Modifiers } from "./types.ts";

export function saveGame(state: GameState): void {
  try {
    state.lastActiveAt = Date.now();
    localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable / quota — ignore, game keeps running in memory
  }
}

export interface OfflineReport {
  seconds: number;
  earned: number;
  fullyAutomated: boolean;
}

/**
 * Offline income. Animals leave the belt when sold, so (without an auto-buyer)
 * the bots can at most finish and sell the animals currently on the belt ONCE.
 * We pay that one cycle's worth, scaled by how much of a full loop the elapsed
 * time covers, and only when the whole loop is automatable. The animals are
 * left on the belt as a courtesy, so you don't return to an empty factory.
 */
function automatedOneCycleValue(state: GameState, mods: Modifiers): { value: number; loopTime: number } {
  const allStationsAuto = STATIONS.every((s) => mods.automatedStations[s.id]);
  if (!allStationsAuto || !mods.autoCheckout) return { value: 0, loopTime: 0 };

  let serviceTotal = 0;
  for (const s of STATIONS) {
    serviceTotal += CONFIG.BASE_SERVICE_SECONDS / mods.serviceSpeedMult[s.id];
  }
  const travelTotal =
    (STATION_COUNT - 1) * (CONFIG.BASE_TRAVEL_SECONDS / mods.beltSpeedMult);
  const customerTime = CONFIG.BASE_CUSTOMER_SECONDS / mods.customerRateMult;
  const loopTime = serviceTotal + travelTotal + customerTime;

  let value = 0;
  for (const row of state.rows) {
    for (const a of row.animals) {
      const sale = effectiveSale(a.animalId, mods);
      const careTips = STATION_COUNT * Math.max(1, Math.round(sale * CONFIG.CARE_TIP_RATIO));
      value += sale + careTips;
    }
  }
  return { value, loopTime };
}

export function computeOffline(
  state: GameState,
  now: number,
): OfflineReport | null {
  const mods = computeModifiers(state);
  if (mods.offlineRate <= 0) return null;

  const elapsed = Math.max(0, (now - state.lastActiveAt) / 1000);
  const seconds = Math.min(elapsed, mods.offlineCapSeconds);
  if (seconds < 1) return null;

  const { value, loopTime } = automatedOneCycleValue(state, mods);
  const fullyAutomated = value > 0 && loopTime > 0;
  const progress = fullyAutomated ? Math.min(1, seconds / loopTime) : 0;
  const earned = Math.floor(value * progress * mods.offlineRate);
  if (earned <= 0) return { seconds, earned: 0, fullyAutomated };

  state.treats += earned;
  state.totalEarned += earned;
  return { seconds, earned, fullyAutomated };
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(CONFIG.SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !Array.isArray(parsed.rows) || typeof parsed.treats !== "number") {
      return null;
    }
    // Backfill any fields a future/older save might miss.
    parsed.upgrades ??= {};
    parsed.bought ??= {};
    parsed.totalSales ??= 0;
    parsed.totalEarned ??= 0;
    parsed.unlockedCount ??= 1;
    primeUid(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(CONFIG.SAVE_KEY);
  } catch {
    /* ignore */
  }
}
