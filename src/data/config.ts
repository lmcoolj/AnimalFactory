// ---------------------------------------------------------------------------
// GLOBAL TUNABLES
// ---------------------------------------------------------------------------
// One place to tune the whole economy & pacing. Every number here is safe to
// edit — the game reads these at runtime.
// ---------------------------------------------------------------------------

export const CONFIG = {
  // --- Starting state -------------------------------------------------------
  START_TREATS: 1,

  // --- Economy --------------------------------------------------------------
  /**
   * Sale price a customer pays, as a multiple of the animal's purchase price.
   * The animal LEAVES the belt when sold, so this must be > 1 to turn a profit.
   * e.g. 1.6 => you roughly recoup the cost plus ~60%, before care tips/upgrades.
   */
  SALE_PROFIT_MULT: 1.6,
  /** Minimum sale value, so the 1-Treat Fly still pays out. */
  SALE_VALUE_FLOOR: 2,
  /** Each station service pays this fraction of the animal's sale value. */
  CARE_TIP_RATIO: 0.05,

  // --- Belt & stations ------------------------------------------------------
  /** Baseline seconds for an animal to travel between two stations. */
  BASE_TRAVEL_SECONDS: 2.2,
  /** How much a single belt "nudge" click advances travel progress (0..1). */
  NUDGE_AMOUNT: 0.34,
  /** Baseline seconds a bot/hand takes to service one station need. */
  BASE_SERVICE_SECONDS: 0.9,
  /** Animal slots available on a freshly-bought belt row. */
  BASE_ROW_CAPACITY: 4,
  /** Rows the player starts with. */
  START_ROWS: 1,

  // --- Customers ------------------------------------------------------------
  /** Baseline seconds for a customer to arrive once an animal is "ready". */
  BASE_CUSTOMER_SECONDS: 3.0,

  // --- Shop -----------------------------------------------------------------
  /** Shop restocks on this interval (ms). Prompt spec: every 5 minutes. */
  SHOP_RESTOCK_MS: 5 * 60 * 1000,
  /** Number of distinct slots offered each restock. */
  SHOP_SLOTS: 6,
  /** Stock range per offered item [min, max]. */
  SHOP_STOCK_MIN: 1,
  SHOP_STOCK_MAX: 5,
  /** How many not-yet-unlocked animals ahead of the frontier can appear. */
  SHOP_LOOKAHEAD: 0,

  // --- Offline earnings (Night Shift upgrade) -------------------------------
  /** Fraction of active income earned while away (before Night Shift levels). */
  OFFLINE_BASE_RATE: 0.0, // 0 until Night Shift is purchased
  /** Max seconds of offline time that can accrue at base (Night Shift raises). */
  OFFLINE_BASE_CAP_SECONDS: 60 * 60 * 2,

  // --- Save -----------------------------------------------------------------
  SAVE_KEY: "animal-factory-save-v1",
  SAVE_INTERVAL_MS: 10 * 1000,

  // --- Rendering ------------------------------------------------------------
  TICK_HZ: 60,
} as const;

/** Derived: sale value for an animal price. */
export function saleValueFor(price: number): number {
  return Math.max(
    CONFIG.SALE_VALUE_FLOOR,
    Math.round(price * CONFIG.SALE_PROFIT_MULT),
  );
}

/** Derived: care tip paid per station service for a given sale value. */
export function careTipFor(saleValue: number): number {
  return Math.max(1, Math.round(saleValue * CONFIG.CARE_TIP_RATIO));
}
