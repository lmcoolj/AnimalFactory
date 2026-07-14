import { ANIMAL_BY_ID } from "../data/animals.ts";
import { RARITIES } from "../data/rarities.ts";
import {
  UPGRADES,
  type UpgradeCategory,
  type UpgradeDef,
} from "../data/upgrades.ts";
import { saleValueFor } from "../data/config.ts";
import { formatTreats, formatTime } from "../util/format.ts";
import { currentLevel, isMaxed, nextCost } from "../game/purchases.ts";
import { totalAnimalsOnBelt } from "../game/state.ts";
import type { GameState, Modifiers } from "../game/types.ts";
import type { OfflineReport } from "../game/save.ts";

export interface UIHandlers {
  onBuyAnimal: (animalId: string) => void;
  onBuyUpgrade: (upgradeId: string) => void;
}

// element refs
let elTreats: HTMLElement;
let elAnimals: HTMLElement;
let elSales: HTMLElement;
let elRestock: HTMLElement;
let elToasts: HTMLElement;
let shopBody: HTMLElement;
let upgradesBody: HTMLElement;
let statsBody: HTMLElement;
let handlers: UIHandlers;

// live affordability tracking (updated every frame without full re-render)
interface LiveButton {
  el: HTMLButtonElement;
  cost: () => number;
  extraDisabled?: () => boolean;
}
let liveButtons: LiveButton[] = [];

const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  automation: "🤖 Automation Bots",
  belt: "🎢 Conveyor & Rows",
  station: "⭐ Station Upgrades",
  economy: "💰 Economy",
  meta: "🌙 Offline",
};

function rarityName(animalId: string): HTMLElement {
  const def = ANIMAL_BY_ID[animalId];
  const span = document.createElement("span");
  span.className = `name ${RARITIES[def.rarity].styleClass}`;
  span.textContent = def.name;
  return span;
}

function thumb(animalId: string): HTMLElement {
  const def = ANIMAL_BY_ID[animalId];
  const box = document.createElement("div");
  box.className = "thumb";
  const img = new Image();
  img.src = `${import.meta.env.BASE_URL}animals/${def.asset}.png`;
  img.onload = () => {
    box.textContent = "";
    box.appendChild(img);
  };
  img.onerror = () => {
    box.textContent = def.emoji;
  };
  box.textContent = def.emoji; // fallback until load
  return box;
}

export function mountUI(root: HTMLElement, h: UIHandlers): void {
  handlers = h;
  root.innerHTML = `
    <div class="hud">
      <div class="title"><span class="emoji">🏭</span> Animal Factory</div>
      <div class="treats"><span class="bone">🦴</span><span id="treats">1</span></div>
      <div class="stat"><span>On belt</span><b id="animals">0</b></div>
      <div class="stat"><span>Sales</span><b id="sales">0</b></div>
      <div class="spacer"></div>
      <div class="restock">Shop restocks in <b id="restock">—</b></div>
    </div>
    <div class="main">
      <div class="stage">
        <canvas id="belt"></canvas>
        <div class="toast-wrap" id="toasts"></div>
        <div class="stage-hint">Click stations to care · click the belt to nudge · click 🧑 to sell</div>
      </div>
      <div class="sidebar">
        <div class="tabs">
          <button class="tab active" data-tab="shop">🛒 Shop</button>
          <button class="tab" data-tab="upgrades">⚙️ Upgrades</button>
          <button class="tab" data-tab="stats">📊 Stats</button>
        </div>
        <div class="tab-body" id="shop-body"></div>
        <div class="tab-body" id="upgrades-body" style="display:none"></div>
        <div class="tab-body" id="stats-body" style="display:none"></div>
      </div>
    </div>
  `;

  elTreats = root.querySelector("#treats")!;
  elAnimals = root.querySelector("#animals")!;
  elSales = root.querySelector("#sales")!;
  elRestock = root.querySelector("#restock")!;
  elToasts = root.querySelector("#toasts")!;
  shopBody = root.querySelector("#shop-body")!;
  upgradesBody = root.querySelector("#upgrades-body")!;
  statsBody = root.querySelector("#stats-body")!;

  const bodies: Record<string, HTMLElement> = {
    shop: shopBody,
    upgrades: upgradesBody,
    stats: statsBody,
  };
  root.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      root.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      for (const key of Object.keys(bodies)) {
        bodies[key].style.display = key === tab.dataset.tab ? "flex" : "none";
      }
    });
  });
}

// --- HUD (called every frame) ----------------------------------------------
export function renderHUD(state: GameState, now: number): void {
  elTreats.textContent = formatTreats(state.treats);
  elAnimals.textContent = String(totalAnimalsOnBelt(state));
  elSales.textContent = formatTreats(state.totalSales);
  const secs = Math.max(0, (state.shop.nextRestockAt - now) / 1000);
  elRestock.textContent = formatTime(secs);

  const treats = state.treats;
  for (const b of liveButtons) {
    const disabled = treats < b.cost() || (b.extraDisabled?.() ?? false);
    b.el.disabled = disabled;
  }
}

// --- Shop -------------------------------------------------------------------
export function renderShop(state: GameState, mods: Modifiers): void {
  liveButtons = liveButtons.filter((b) => b.el.closest("#shop-body") === null);
  shopBody.innerHTML = "";

  const beltFull = () =>
    totalAnimalsOnBelt(state) >= state.rows.length * mods.rowCapacity;

  const header = document.createElement("div");
  header.className = "section-label";
  header.textContent = "In stock now";
  shopBody.appendChild(header);

  if (state.shop.offers.length === 0) {
    const note = document.createElement("div");
    note.className = "locked-note";
    note.textContent = "Shop is empty — wait for the next restock!";
    shopBody.appendChild(note);
  }

  for (const offer of state.shop.offers) {
    const def = ANIMAL_BY_ID[offer.animalId];
    const card = document.createElement("div");
    card.className = "card";
    card.appendChild(thumb(offer.animalId));

    const info = document.createElement("div");
    info.className = "info";
    const nameRow = document.createElement("div");
    nameRow.appendChild(rarityName(offer.animalId));
    const pill = document.createElement("span");
    pill.className = `rarity-pill ${RARITIES[def.rarity].styleClass}`;
    pill.textContent = RARITIES[def.rarity].label;
    pill.style.marginLeft = "6px";
    nameRow.appendChild(pill);
    info.appendChild(nameRow);
    const sub = document.createElement("div");
    sub.className = "sub";
    const salePrice = Math.max(1, Math.round(saleValueFor(def.price) * mods.saleMult));
    sub.textContent = `Sells for ~${formatTreats(salePrice)} 🦴`;
    info.appendChild(sub);
    const stock = document.createElement("div");
    stock.className = "stock";
    stock.textContent = `Stock: ${offer.stock}`;
    info.appendChild(stock);
    card.appendChild(info);

    const btn = document.createElement("button");
    btn.className = "buy";
    btn.innerHTML = `Buy<span class="cost">🦴 ${formatTreats(def.price)}</span>`;
    if (offer.stock <= 0) {
      btn.disabled = true;
      btn.innerHTML = `Sold out`;
    } else {
      btn.addEventListener("click", () => handlers.onBuyAnimal(offer.animalId));
      liveButtons.push({
        el: btn,
        cost: () => def.price,
        extraDisabled: () => offer.stock <= 0 || beltFull(),
      });
    }
    card.appendChild(btn);
    shopBody.appendChild(card);
  }

  const capNote = document.createElement("div");
  capNote.className = "locked-note";
  const cap = state.rows.length * mods.rowCapacity;
  capNote.textContent = `Belt: ${totalAnimalsOnBelt(state)}/${cap} slots used${beltFull() ? " — buy more rows/capacity!" : ""}`;
  shopBody.appendChild(capNote);
}

// --- Upgrades ---------------------------------------------------------------
export function renderUpgrades(state: GameState): void {
  liveButtons = liveButtons.filter((b) => b.el.closest("#upgrades-body") === null);
  upgradesBody.innerHTML = "";

  const order: UpgradeCategory[] = ["automation", "belt", "station", "economy", "meta"];
  for (const cat of order) {
    const defs = UPGRADES.filter((u) => u.category === cat);
    const label = document.createElement("div");
    label.className = "section-label";
    label.textContent = CATEGORY_LABELS[cat];
    upgradesBody.appendChild(label);
    for (const def of defs) upgradesBody.appendChild(upgradeCard(state, def));
  }
}

function upgradeCard(state: GameState, def: UpgradeDef): HTMLElement {
  const card = document.createElement("div");
  card.className = "card";

  const icon = document.createElement("div");
  icon.className = "thumb";
  icon.textContent = def.emoji;
  card.appendChild(icon);

  const info = document.createElement("div");
  info.className = "info";
  const name = document.createElement("div");
  name.className = "name";
  const lvl = currentLevel(state, def.id);
  name.textContent =
    def.kind === "leveled" && lvl > 0 ? `${def.name} (Lv${lvl})` : def.name;
  info.appendChild(name);
  const sub = document.createElement("div");
  sub.className = "sub";
  sub.textContent = def.description;
  info.appendChild(sub);
  card.appendChild(info);

  if (isMaxed(state, def)) {
    const badge = document.createElement("span");
    badge.className = "owned-badge";
    badge.textContent = def.kind === "oneTime" ? "Owned ✓" : "MAX";
    card.appendChild(badge);
  } else {
    const cost = nextCost(state, def);
    const btn = document.createElement("button");
    btn.className = "buy";
    const verb = def.kind === "oneTime" ? "Buy" : "Upgrade";
    btn.innerHTML = `${verb}<span class="cost">🦴 ${formatTreats(cost)}</span>`;
    btn.addEventListener("click", () => handlers.onBuyUpgrade(def.id));
    liveButtons.push({ el: btn, cost: () => nextCost(state, def) });
    card.appendChild(btn);
  }
  return card;
}

// --- Stats ------------------------------------------------------------------
export function renderStats(state: GameState): void {
  const collected = Object.keys(state.bought).length;
  const total = Object.keys(ANIMAL_BY_ID).length;
  statsBody.innerHTML = `
    <div class="section-label">Lifetime</div>
    <div class="card"><div class="info"><div class="name">🦴 Total Treats earned</div>
      <div class="sub">${formatTreats(state.totalEarned)}</div></div></div>
    <div class="card"><div class="info"><div class="name">🧑 Total sales</div>
      <div class="sub">${formatTreats(state.totalSales)}</div></div></div>
    <div class="card"><div class="info"><div class="name">🐾 Species unlocked</div>
      <div class="sub">${state.unlockedCount} / ${total}</div></div></div>
    <div class="card"><div class="info"><div class="name">📦 Species owned</div>
      <div class="sub">${collected} / ${total}</div></div></div>
    <div class="card"><div class="info"><div class="name">🎢 Belt rows</div>
      <div class="sub">${state.rows.length}</div></div></div>
  `;
}

// --- Toasts + offline modal -------------------------------------------------
export function toast(message: string, kind: "good" | "bad" = "good"): void {
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = message;
  elToasts.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .4s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 400);
  }, 1800);
}

export function showOffline(report: OfflineReport): void {
  const back = document.createElement("div");
  back.className = "modal-back";
  const body = report.earned > 0
    ? `<div class="big">🦴 ${formatTreats(report.earned)}</div>
       <p>Your bots kept the factory running for <b>${formatTime(report.seconds)}</b> while you were away.</p>`
    : `<p>You were away for <b>${formatTime(report.seconds)}</b>, but the belt stalled — automate <b>every</b> station and the Checkout Bot (plus Night Shift) to earn while offline.</p>`;
  back.innerHTML = `<div class="modal"><h2>Welcome back! 🌙</h2>${body}<button>Collect</button></div>`;
  back.querySelector("button")!.addEventListener("click", () => back.remove());
  document.body.appendChild(back);
}
