import "./style.css";
import { CONFIG } from "./data/config.ts";
import { computeModifiers } from "./game/modifiers.ts";
import { createNewGame } from "./game/state.ts";
import { maybeRestock, buyAnimal } from "./game/shop.ts";
import { buyUpgrade } from "./game/purchases.ts";
import {
  updateFactory,
  serviceClick,
  nudgeRow,
  sellClick,
  type Payout,
} from "./game/factory.ts";
import { loadGame, saveGame, computeOffline } from "./game/save.ts";
import {
  initCanvas,
  drawScene,
  hitTest,
  screenToCanvas,
  spawnFloat,
} from "./render/canvas.ts";
import {
  mountUI,
  renderHUD,
  renderShop,
  renderUpgrades,
  renderStats,
  toast,
  showOffline,
} from "./ui/ui.ts";
import { ANIMAL_BY_ID, ANIMALS } from "./data/animals.ts";
import { formatTreats } from "./util/format.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;
const now0 = Date.now();

// --- Load / new game --------------------------------------------------------
let state = loadGame();
let offlineReport = null as ReturnType<typeof computeOffline> | null;
if (state) {
  offlineReport = computeOffline(state, now0);
} else {
  state = createNewGame(now0);
}
maybeRestock(state, now0);

// --- Payout float helper ----------------------------------------------------
function emit(p: Payout): void {
  const color = p.kind === "sale" ? "#7cff9b" : "#6be3ff";
  spawnFloat(p.x, p.y, `+${formatTreats(p.amount)}`, color);
}

// --- UI + canvas ------------------------------------------------------------
mountUI(app, {
  onBuyAnimal: (id) => {
    const mods = computeModifiers(state!);
    const res = buyAnimal(state!, id, mods);
    if (res.ok) {
      toast(`Bought a ${ANIMAL_BY_ID[id].name}! 🐾`, "good");
      if (res.unlockedNew) {
        const next = ANIMALS[state!.unlockedCount - 1];
        toast(`Unlocked: ${next?.name ?? "a new animal"}! ✨`, "good");
      }
      refreshPanels();
    } else {
      const msg =
        res.reason === "belt-full"
          ? "Belt is full — buy more rows or Wider Rows!"
          : res.reason === "too-expensive"
            ? "Not enough Treats!"
            : "Out of stock!";
      toast(msg, "bad");
    }
  },
  onBuyUpgrade: (id) => {
    const res = buyUpgrade(state!, id);
    if (res.ok) {
      refreshPanels();
    } else {
      toast(res.reason === "maxed" ? "Already maxed!" : "Not enough Treats!", "bad");
    }
  },
});

const canvasEl = app.querySelector<HTMLCanvasElement>("#belt")!;
initCanvas(canvasEl);

function refreshPanels(): void {
  const mods = computeModifiers(state!);
  renderShop(state!, mods);
  renderUpgrades(state!);
  renderStats(state!);
}
refreshPanels();

if (offlineReport) showOffline(offlineReport);

// --- Pointer interaction ----------------------------------------------------
canvasEl.addEventListener("pointerdown", (e) => {
  const { x, y } = screenToCanvas(e.clientX, e.clientY);
  const target = hitTest(x, y);
  if (!target) return;
  const mods = computeModifiers(state!);
  if (target.type === "station" && target.stationIndex !== undefined) {
    serviceClick(state!, mods, target.rowId, target.stationIndex, emit);
  } else if (target.type === "sell") {
    sellClick(state!, mods, target.rowId, emit);
  } else if (target.type === "belt") {
    nudgeRow(state!, target.rowId);
  }
});

// --- Main loop --------------------------------------------------------------
let last = performance.now();
let saveAcc = 0;

function frame(t: number): void {
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  const now = Date.now();

  if (maybeRestock(state!, now)) {
    toast("Shop restocked! 🛒", "good");
    refreshPanels();
  }

  const mods = computeModifiers(state!);
  updateFactory(state!, mods, dt, emit);

  renderHUD(state!, now);
  drawScene(state!, mods, dt);

  saveAcc += dt * 1000;
  if (saveAcc >= CONFIG.SAVE_INTERVAL_MS) {
    saveAcc = 0;
    saveGame(state!);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- Persist on exit --------------------------------------------------------
window.addEventListener("beforeunload", () => saveGame(state!));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveGame(state!);
});
