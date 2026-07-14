import { STATIONS, type StationId } from "./stations.ts";

// ---------------------------------------------------------------------------
// UPGRADES
// ---------------------------------------------------------------------------
// Two kinds:
//   - "oneTime"  : bought once (automation bots, belt rows, night-shift unlock)
//   - "leveled"  : bought repeatedly, cost grows each level
//
// Effects are data. The game (upgrades-logic.ts) reads `effect.type` and
// applies the math, so you can retune everything here without touching logic.
// ---------------------------------------------------------------------------

export type UpgradeCategory =
  | "automation"
  | "belt"
  | "station"
  | "economy"
  | "meta";

export type EffectType =
  | "automateStation" // one-time: this station now self-services
  | "automateCheckout" // one-time: sales complete automatically
  | "beltSpeed" // +% belt travel speed / level
  | "stationSpeed" // -% service time at a station / level
  | "stationQuality" // +% sale value contribution from a station / level
  | "rowCapacity" // +N animal slots per row / level
  | "customerRate" // +% customer spawn speed / level
  | "treatValue" // +% all sale payouts / level
  | "buyRow" // one-time-per-level: unlock another belt row
  | "nightShift"; // meta: offline earnings, scales per level

export interface UpgradeEffect {
  type: EffectType;
  /** Per-level magnitude (fraction for %, integer for counts). */
  amount: number;
  stationId?: StationId;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  emoji: string;
  kind: "oneTime" | "leveled";
  baseCost: number;
  /** Leveled only: cost multiplier per level. */
  costGrowth?: number;
  /** Leveled only: hard cap on levels (omit for unbounded). */
  maxLevel?: number;
  /** Leveled only: explicit cost table (overrides baseCost/costGrowth). */
  costTable?: number[];
  effect: UpgradeEffect;
}

// --- Automation bot costs (one-time), keyed by station bot id --------------
const BOT_COSTS: Record<string, number> = {
  bot_feeder: 60,
  bot_scooper: 200,
  bot_scrubber: 500,
  bot_play: 1_200,
  bot_lullaby: 3_000,
};

// --- Build per-station automation bots -------------------------------------
const stationBots: UpgradeDef[] = STATIONS.map((s) => ({
  id: s.botUpgradeId,
  name: s.botName,
  description: `Automatically ${s.action.toLowerCase()}s animals at the ${s.label} station — no more clicking there.`,
  category: "automation",
  emoji: "🤖",
  kind: "oneTime",
  baseCost: BOT_COSTS[s.botUpgradeId] ?? 500,
  effect: { type: "automateStation", amount: 1, stationId: s.id },
}));

// --- Build per-station leveled Speed + Quality tracks ----------------------
const stationSpeed: UpgradeDef[] = STATIONS.map((s) => ({
  id: `speed_${s.id}`,
  name: `${s.label} Speed`,
  description: `Service animals faster at the ${s.label} station (−6% service time / level).`,
  category: "station",
  emoji: s.emoji,
  kind: "leveled",
  baseCost: 80,
  costGrowth: 1.18,
  maxLevel: 25,
  effect: { type: "stationSpeed", amount: 0.06, stationId: s.id },
}));

const stationQuality: UpgradeDef[] = STATIONS.map((s) => ({
  id: `quality_${s.id}`,
  name: `${s.label} Quality`,
  description: `Happier animals sell for more (+5% sale value / level from ${s.label}).`,
  category: "station",
  emoji: s.emoji,
  kind: "leveled",
  baseCost: 120,
  costGrowth: 1.18,
  maxLevel: 25,
  effect: { type: "stationQuality", amount: 0.05, stationId: s.id },
}));

// --- Belt rows (one-time per level, bespoke escalating cost) ---------------
const ROW_COSTS = [
  5_000, 40_000, 300_000, 2_000_000, 14_000_000, 100_000_000, 700_000_000,
];

// --- The full catalog ------------------------------------------------------
export const UPGRADES: UpgradeDef[] = [
  ...stationBots,
  {
    id: "bot_checkout",
    name: "Checkout Bot",
    description:
      "A mechanical cashier closes every sale automatically — no more clicking the customer.",
    category: "automation",
    emoji: "🤖",
    kind: "oneTime",
    baseCost: 2_000,
    effect: { type: "automateCheckout", amount: 1 },
  },
  {
    id: "belt_speed",
    name: "Faster Conveyor",
    description:
      "Speeds up the belt (+8% / level). Fast enough and you never need to nudge animals along by hand.",
    category: "belt",
    emoji: "🏎️",
    kind: "leveled",
    baseCost: 100,
    costGrowth: 1.18,
    maxLevel: 40,
    effect: { type: "beltSpeed", amount: 0.08 },
  },
  {
    id: "row_capacity",
    name: "Wider Rows",
    description: "Fit more animals on each belt row (+1 slot / level).",
    category: "belt",
    emoji: "↔️",
    kind: "leveled",
    baseCost: 300,
    costGrowth: 1.3,
    maxLevel: 16,
    effect: { type: "rowCapacity", amount: 1 },
  },
  {
    id: "buy_row",
    name: "New Belt Row",
    description: "Add another conveyor row so more animals cycle in parallel.",
    category: "belt",
    emoji: "➕",
    kind: "leveled",
    baseCost: ROW_COSTS[0],
    costTable: ROW_COSTS,
    maxLevel: ROW_COSTS.length,
    effect: { type: "buyRow", amount: 1 },
  },
  {
    id: "customer_rush",
    name: "Customer Rush",
    description: "Customers arrive sooner to buy your animals (+6% / level).",
    category: "economy",
    emoji: "🛎️",
    kind: "leveled",
    baseCost: 400,
    costGrowth: 1.18,
    maxLevel: 30,
    effect: { type: "customerRate", amount: 0.06 },
  },
  {
    id: "treat_value",
    name: "Treat Value",
    description: "Every sale pays more Treats (+4% / level, applies globally).",
    category: "economy",
    emoji: "🦴",
    kind: "leveled",
    baseCost: 1_000,
    costGrowth: 1.18,
    effect: { type: "treatValue", amount: 0.04 },
  },
  {
    id: "night_shift",
    name: "Night Shift",
    description:
      "Bots keep working while you're away. Level 1 earns 25% of active income offline; each level adds +15% and extends the offline cap.",
    category: "meta",
    emoji: "🌙",
    kind: "leveled",
    baseCost: 10_000,
    costGrowth: 3,
    maxLevel: 6,
    effect: { type: "nightShift", amount: 0.15 },
  },
  ...stationSpeed,
  ...stationQuality,
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

/** Cost of the NEXT level of an upgrade given how many are already owned. */
export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  if (def.costTable) {
    return def.costTable[currentLevel] ?? Infinity;
  }
  const growth = def.costGrowth ?? 1;
  return Math.round(def.baseCost * Math.pow(growth, currentLevel));
}
