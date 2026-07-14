import type { StationId } from "../data/stations.ts";

// ---------------------------------------------------------------------------
// RUNTIME TYPES
// ---------------------------------------------------------------------------

/** Where an animal instance is in its care loop. */
export type AnimalMode =
  | "service" // sitting at station `stationIndex`, needs servicing
  | "travel" // moving from `stationIndex` toward the next station
  | "awaitCustomer" // loop complete, a customer is walking up
  | "awaitSale"; // customer is here, waiting to pay

export interface BeltAnimal {
  uid: number;
  animalId: string;
  rowId: number;
  slot: number;
  stationIndex: number;
  mode: AnimalMode;
  /** 0..1 progress within the current mode. */
  progress: number;
  /** Interpolated render position (updated each frame). */
  x: number;
  y: number;
  /** Small visual bob offset seed. */
  bob: number;
}

export interface BeltRow {
  id: number;
  animals: BeltAnimal[];
}

export interface ShopOffer {
  animalId: string;
  stock: number;
}

export interface ShopState {
  offers: ShopOffer[];
  nextRestockAt: number; // epoch ms
}

export interface GameState {
  treats: number;
  totalEarned: number;
  totalSales: number;

  /** How many animals in the unlock chain are buyable (>=1). */
  unlockedCount: number;
  /** Lifetime purchases per animal id (stats / collection). */
  bought: Record<string, number>;

  /** Level owned per upgrade id (0 = not owned). */
  upgrades: Record<string, number>;

  rows: BeltRow[];
  shop: ShopState;

  lastActiveAt: number; // epoch ms, for offline earnings
  createdAt: number;
}

/** Derived, cached modifiers computed from upgrade levels each frame. */
export interface Modifiers {
  beltSpeedMult: number;
  serviceSpeedMult: Record<StationId, number>;
  stationQualityMult: Record<StationId, number>;
  saleMult: number; // treat value + summed station quality
  customerRateMult: number;
  rowCapacity: number;
  automatedStations: Record<StationId, boolean>;
  autoCheckout: boolean;
  offlineRate: number;
  offlineCapSeconds: number;
}
