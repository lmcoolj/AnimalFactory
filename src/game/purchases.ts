import { UPGRADE_BY_ID, upgradeCost, type UpgradeDef } from "../data/upgrades.ts";
import type { BeltAnimal, GameState } from "./types.ts";

export function currentLevel(state: GameState, id: string): number {
  return state.upgrades[id] ?? 0;
}

export function isMaxed(state: GameState, def: UpgradeDef): boolean {
  const lvl = currentLevel(state, def.id);
  if (def.kind === "oneTime") return lvl >= 1;
  return def.maxLevel !== undefined && lvl >= def.maxLevel;
}

export function nextCost(state: GameState, def: UpgradeDef): number {
  return upgradeCost(def, currentLevel(state, def.id));
}

export type UpgradeResult =
  | { ok: true }
  | { ok: false; reason: "maxed" | "too-expensive" };

export function buyUpgrade(state: GameState, id: string): UpgradeResult {
  const def = UPGRADE_BY_ID[id];
  if (!def) return { ok: false, reason: "maxed" };
  if (isMaxed(state, def)) return { ok: false, reason: "maxed" };

  const cost = nextCost(state, def);
  if (state.treats < cost) return { ok: false, reason: "too-expensive" };

  state.treats -= cost;
  state.upgrades[id] = currentLevel(state, id) + 1;

  if (def.effect.type === "buyRow") {
    const newId = state.rows.length;
    state.rows.push({ id: newId, animals: [] as BeltAnimal[] });
  }
  return { ok: true };
}
