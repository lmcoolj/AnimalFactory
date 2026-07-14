import { CONFIG } from "../data/config.ts";
import { STATIONS, type StationId } from "../data/stations.ts";
import type { GameState, Modifiers } from "./types.ts";

/** Compute all derived multipliers from the current upgrade levels. */
export function computeModifiers(state: GameState): Modifiers {
  const lvl = (id: string) => state.upgrades[id] ?? 0;

  const serviceSpeedMult = {} as Record<StationId, number>;
  const stationQualityMult = {} as Record<StationId, number>;
  const automatedStations = {} as Record<StationId, boolean>;
  let qualityBonus = 0;

  for (const s of STATIONS) {
    serviceSpeedMult[s.id] = 1 + lvl(`speed_${s.id}`) * 0.06;
    const qLevels = lvl(`quality_${s.id}`);
    stationQualityMult[s.id] = 1 + qLevels * 0.05;
    qualityBonus += qLevels * 0.05;
    automatedStations[s.id] = lvl(s.botUpgradeId) > 0;
  }

  const treatValue = lvl("treat_value") * 0.04;
  const saleMult = 1 + treatValue + qualityBonus;

  const nightLevel = lvl("night_shift");
  const offlineRate = nightLevel > 0 ? 0.25 + (nightLevel - 1) * 0.15 : 0;
  const offlineCapSeconds =
    nightLevel > 0 ? CONFIG.OFFLINE_BASE_CAP_SECONDS * nightLevel : 0;

  return {
    beltSpeedMult: 1 + lvl("belt_speed") * 0.08,
    serviceSpeedMult,
    stationQualityMult,
    saleMult,
    customerRateMult: 1 + lvl("customer_rush") * 0.06,
    rowCapacity: CONFIG.BASE_ROW_CAPACITY + lvl("row_capacity"),
    automatedStations,
    autoCheckout: lvl("bot_checkout") > 0,
    offlineRate,
    offlineCapSeconds,
  };
}
