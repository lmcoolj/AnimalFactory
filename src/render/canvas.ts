import { STATIONS, STATION_COUNT } from "../data/stations.ts";
import { ANIMAL_BY_ID } from "../data/animals.ts";
import { RARITIES } from "../data/rarities.ts";
import type { BeltAnimal, GameState, Modifiers } from "../game/types.ts";

// Station positions along a lane, as fractions of lane width.
const STATION_FRAC = [0.07, 0.24, 0.41, 0.58, 0.75];
const CHECKOUT_FRAC = 0.9;
const READY_FRAC = 0.83;

export interface HitTarget {
  type: "station" | "sell" | "belt";
  rowId: number;
  stationIndex?: number;
}

interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
}

interface RowGeom {
  rowId: number;
  top: number;
  height: number;
  midY: number;
  laneLeft: number;
  laneWidth: number;
}

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let cssW = 0;
let cssH = 0;
let rowGeoms: RowGeom[] = [];
const floats: FloatText[] = [];
const imgCache = new Map<string, HTMLImageElement | "missing">();

export function initCanvas(el: HTMLCanvasElement): void {
  canvas = el;
  ctx = el.getContext("2d")!;
  resize();
  window.addEventListener("resize", resize);
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  cssW = rect.width;
  cssH = rect.height;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getImage(asset: string): HTMLImageElement | null {
  const cached = imgCache.get(asset);
  if (cached === "missing") return null;
  if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;
  const img = new Image();
  img.onerror = () => imgCache.set(asset, "missing");
  img.src = `${import.meta.env.BASE_URL}animals/${asset}.png`;
  imgCache.set(asset, img);
  return null;
}

function computeGeom(state: GameState): void {
  rowGeoms = [];
  const pad = 14;
  const rows = state.rows.length;
  const usableH = cssH - pad * 2;
  const rowH = Math.max(110, Math.min(190, usableH / rows));
  for (let i = 0; i < rows; i++) {
    const top = pad + i * rowH;
    rowGeoms.push({
      rowId: state.rows[i].id,
      top,
      height: rowH,
      midY: top + rowH * 0.5,
      laneLeft: pad + 8,
      laneWidth: cssW - (pad + 8) * 2,
    });
  }
}

function stationX(g: RowGeom, i: number): number {
  return g.laneLeft + g.laneWidth * STATION_FRAC[i];
}

/** Logical position of an animal in CSS pixels. Also writes back to a.x/a.y. */
function positionAnimal(a: BeltAnimal, g: RowGeom): void {
  let x: number;
  const y = g.midY + ((a.uid % 3) - 1) * 10;
  switch (a.mode) {
    case "service":
      x = stationX(g, a.stationIndex);
      break;
    case "travel": {
      const from = stationX(g, a.stationIndex);
      const to = stationX(g, Math.min(a.stationIndex + 1, STATION_COUNT - 1));
      x = from + (to - from) * a.progress;
      break;
    }
    case "awaitCustomer":
    case "awaitSale":
      x = g.laneLeft + g.laneWidth * READY_FRAC;
      break;
  }
  a.x = x;
  a.y = y;
}

function roundRect(x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBelt(g: RowGeom): void {
  const beltY = g.midY + 34;
  const beltH = 20;
  ctx.fillStyle = "#3a3550";
  roundRect(g.laneLeft, beltY, g.laneWidth, beltH, 8);
  ctx.fill();
  // belt tread marks
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 3;
  const step = 26;
  for (let x = g.laneLeft + 8; x < g.laneLeft + g.laneWidth - 6; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, beltY + 3);
    ctx.lineTo(x - 8, beltY + beltH - 3);
    ctx.stroke();
  }
}

function drawStation(g: RowGeom, index: number, level: number, botOwned: boolean): void {
  const st = STATIONS[index];
  const cx = stationX(g, index);
  const w = Math.min(74, g.laneWidth * 0.12);
  const h = 58;
  const x = cx - w / 2;
  const y = g.midY - 44;

  ctx.save();
  roundRect(x, y, w, h, 12);
  ctx.fillStyle = "#241f38";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = st.color;
  ctx.stroke();

  // colored header bar
  roundRect(x, y, w, 14, 12);
  ctx.fillStyle = st.color;
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(st.emoji, cx, y + 34);

  // level badge
  if (level > 0) {
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillStyle = "#ffe08a";
    ctx.fillText(`Lv${level}`, cx, y + h - 8);
  }

  // bot indicator
  if (botOwned) {
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("🤖", x + w - 8, y + 8);
  }

  // label
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(st.label, cx, y - 8);
  ctx.restore();
}

function drawAnimal(a: BeltAnimal, mods: Modifiers): void {
  const def = ANIMAL_BY_ID[a.animalId];
  const size = 52;
  const img = getImage(def.asset);

  // waiting-for-service pulse when at a manual station
  const st = STATIONS[a.stationIndex];
  const needsClick = a.mode === "service" && !mods.automatedStations[st.id];
  const pulse = needsClick ? 1 + Math.sin(performance.now() / 180) * 0.06 : 1;

  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.scale(pulse, pulse);

  // soft shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.42, size * 0.34, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  if (img) {
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } else {
    ctx.font = `${size * 0.8}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.emoji, 0, 2);
  }
  ctx.restore();

  // need bubble
  if (needsClick) {
    ctx.font = "16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(st.emoji, a.x, a.y - size * 0.6);
  }

  // name label in rarity accent
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = RARITIES[def.rarity].accent;
  ctx.fillText(def.name, a.x, a.y + size * 0.62);
}

function drawCheckout(g: RowGeom, row: GameState["rows"][number]): void {
  const cx = g.laneLeft + g.laneWidth * CHECKOUT_FRAC;
  const readyX = g.laneLeft + g.laneWidth * READY_FRAC;

  const waiting = row.animals.find((a) => a.mode === "awaitSale");
  const arriving = row.animals.find((a) => a.mode === "awaitCustomer");

  // checkout pad
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Checkout", cx + 6, g.midY - 40);

  if (waiting) {
    const bob = Math.sin(performance.now() / 200) * 3;
    ctx.font = "34px system-ui, sans-serif";
    ctx.fillText("🧑", cx + 18, g.midY + bob);
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillStyle = "#7CFF9B";
    ctx.fillText("SELL!", cx + 18, g.midY - 22);
  } else if (arriving) {
    const t = arriving.progress;
    const startX = g.laneLeft + g.laneWidth * 1.02;
    const x = startX + (readyX + 42 - startX) * t;
    ctx.font = "30px system-ui, sans-serif";
    ctx.fillText("🧑", x, g.midY);
  }
}

/**
 * Push clustered animals apart along the belt so they read as a queue instead
 * of stacking on top of each other. Only nudges animals that are too close;
 * well-separated ones keep their positions. The gap shrinks to guarantee the
 * whole row fits within the lane even when it's very crowded.
 */
function spreadRow(animals: BeltAnimal[], g: RowGeom): void {
  const n = animals.length;
  if (n < 2) return;
  const leftBound = g.laneLeft + 24;
  const rightBound = g.laneLeft + g.laneWidth - 24;
  const gap = Math.min(50, (rightBound - leftBound) / (n - 1));
  const ordered = [...animals].sort((a, b) => a.x - b.x);
  let last = -Infinity;
  for (const a of ordered) {
    if (a.x < last + gap) a.x = last + gap;
    last = a.x;
  }
  const overflow = last - rightBound;
  if (overflow > 0) for (const a of ordered) a.x -= overflow;
}

export function drawScene(state: GameState, mods: Modifiers, dt: number): void {
  computeGeom(state);
  ctx.clearRect(0, 0, cssW, cssH);

  for (let i = 0; i < state.rows.length; i++) {
    const g = rowGeoms[i];
    const row = state.rows[i];

    // row backdrop
    roundRect(g.laneLeft - 6, g.top + 4, g.laneWidth + 12, g.height - 8, 16);
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)";
    ctx.fill();

    drawBelt(g);

    for (let s = 0; s < STATION_COUNT; s++) {
      const st = STATIONS[s];
      const level = state.upgrades[`speed_${st.id}`] ?? 0;
      drawStation(g, s, level, mods.automatedStations[st.id]);
    }

    drawCheckout(g, row);

    for (const a of row.animals) {
      positionAnimal(a, g);
    }
    spreadRow(row.animals, g);
    // draw in y order so lower animals overlap on top
    const sorted = [...row.animals].sort((p, q) => p.y - q.y);
    for (const a of sorted) drawAnimal(a, mods);
  }

  drawFloats(dt);
}

// --- Floating payout text ---------------------------------------------------
export function spawnFloat(x: number, y: number, text: string, color: string): void {
  floats.push({ x, y, vy: -32, life: 1, text, color });
  if (floats.length > 120) floats.splice(0, floats.length - 120);
}

function drawFloats(dt: number): void {
  ctx.textAlign = "center";
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= dt * 0.9;
    f.y += f.vy * dt;
    if (f.life <= 0) {
      floats.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// --- Hit testing ------------------------------------------------------------
export function screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

export function hitTest(px: number, py: number): HitTarget | null {
  for (const g of rowGeoms) {
    if (py < g.top || py > g.top + g.height) continue;

    // sell zone (checkout, right side)
    const checkoutX = g.laneLeft + g.laneWidth * CHECKOUT_FRAC;
    if (Math.abs(px - (checkoutX + 12)) < 44) {
      return { type: "sell", rowId: g.rowId };
    }

    // stations
    for (let s = 0; s < STATION_COUNT; s++) {
      const cx = stationX(g, s);
      const w = Math.min(74, g.laneWidth * 0.12);
      if (Math.abs(px - cx) < w / 2 + 6 && Math.abs(py - g.midY) < 40) {
        return { type: "station", rowId: g.rowId, stationIndex: s };
      }
    }

    // otherwise: nudge the belt
    return { type: "belt", rowId: g.rowId };
  }
  return null;
}
