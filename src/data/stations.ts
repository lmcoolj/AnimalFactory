// ---------------------------------------------------------------------------
// STATIONS
// ---------------------------------------------------------------------------
// The five care stations an animal passes through on the belt. Each starts
// fully MANUAL (click to service) and becomes automatic once its bot is bought.
// Order here IS the order animals visit them around the loop.
// ---------------------------------------------------------------------------

export type StationId =
  | "eating"
  | "cleaning"
  | "bathroom"
  | "playing"
  | "sleeping";

export interface StationDef {
  id: StationId;
  label: string;
  /** Verb shown on the action button, e.g. "Feed". */
  action: string;
  emoji: string;
  color: string;
  /** The automation bot that services this station (id in upgrades.ts). */
  botUpgradeId: string;
  botName: string;
}

export const STATIONS: StationDef[] = [
  {
    id: "eating",
    label: "Eating",
    action: "Feed",
    emoji: "🍖",
    color: "#ff9f5a",
    botUpgradeId: "bot_feeder",
    botName: "Feeder Bot",
  },
  {
    id: "cleaning",
    label: "Cleaning",
    action: "Wash",
    emoji: "🫧",
    color: "#5ac8fa",
    botUpgradeId: "bot_scrubber",
    botName: "Scrubber Bot",
  },
  {
    id: "bathroom",
    label: "Bathroom",
    action: "Scoop",
    emoji: "🚽",
    color: "#a3d977",
    botUpgradeId: "bot_scooper",
    botName: "Scooper Bot",
  },
  {
    id: "playing",
    label: "Playing",
    action: "Play",
    emoji: "🪀",
    color: "#ff6fb5",
    botUpgradeId: "bot_play",
    botName: "Play-Arm Bot",
  },
  {
    id: "sleeping",
    label: "Sleeping",
    action: "Tuck In",
    emoji: "😴",
    color: "#9b8cff",
    botUpgradeId: "bot_lullaby",
    botName: "Lullaby Bot",
  },
];

export const STATION_BY_ID: Record<StationId, StationDef> = Object.fromEntries(
  STATIONS.map((s) => [s.id, s]),
) as Record<StationId, StationDef>;

export const STATION_COUNT = STATIONS.length;
