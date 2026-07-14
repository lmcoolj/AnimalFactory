# 🏭🐾 Animal Factory

An idle / management factory game. Buy animals, care for them as they ride a
conveyor belt through five care stations, and sell them to customers for
**Treats**. Start doing everything by hand — then buy **bots** that peel away
the manual labor one piece at a time until the factory runs itself.

Built with **plain Canvas + Vite + TypeScript** (no game framework). The UI is
HTML/CSS; the conveyor and animals render on a `<canvas>`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # typecheck + production build into dist/
npm run preview  # serve the built game
```

## How to play

1. You start with **1 Treat**. Buy a **Fly** from the shop.
2. **Click each station** as the animal arrives to feed / wash / scoop / play /
   tuck it in — each service pays a small **care tip**.
3. **Click the belt** to nudge animals along; **click the 🧑 customer** at
   checkout to complete a sale (pays the full **sale value**).
4. Buy **automation bots** and **Faster Conveyor** to remove the clicking, and
   **new belt rows** to scale up. By late game it runs hands-free.

Buying an animal **unlocks the next** in the 56-animal chain. The shop
**restocks every 5 minutes** with limited, rarity-weighted stock — rarer
animals appear less often.

## Editing the game (data-driven)

All the tunable content lives in `src/data/` — edit these, no logic changes
needed:

| File | What's in it |
|------|--------------|
| `src/data/config.ts`   | Global economy & pacing knobs (prices ratios, timings, restock interval, offline). |
| `src/data/animals.ts`  | The 56 animals: name, rarity, price, unlock order, art filename, emoji fallback. |
| `src/data/rarities.ts` | The 9 rarity tiers: shop spawn weights + text style class. |
| `src/data/upgrades.ts` | Every upgrade: cost curves, levels, effects. |
| `src/data/stations.ts` | The 5 care stations and their bots. |

## Art

Animals look for a **1024×1024 kawaii PNG** at
`public/animals/<asset>.png` (the `asset` field in `animals.ts`). If none
exists, the animal's **emoji** is shown as a fallback — so the game is fully
playable before all art is drawn. Seven starter PNGs
(bear, axolotl, pug, kitten, octopus, shark, leo) are matched to the
Doggo-Clicker house style.

To add art for the rest, drop a matching PNG into `public/animals/` named after
the `asset` slug (e.g. `blue-jay.png`, `fennec-fox.png`, `larus-dodo.png`).

### Generating new animals with AI

Any image generator that does cute sticker art works. Recommended, in order:

1. **Recraft** (recraft.ai) — best fit: native **transparent-PNG** export, a
   "digital illustration / kawaii sticker" style, and it keeps a **consistent
   style across a whole set** (pin a style, then generate every animal from it).
2. **ChatGPT / GPT-image-1** — the tool the existing seven look like. Ask for a
   transparent background explicitly; great single images, style drifts a little
   across a big batch, so reference an earlier one for consistency.
3. **Midjourney v6** (`--style raw`) or **Adobe Firefly** (direct transparent
   PNG) — also great; Midjourney needs a background-removal pass (below).

**Prompt template** (swap in the animal, keep the rest fixed for consistency):

> `A cute kawaii chibi <ANIMAL>, adorable cartoon sticker, big glossy sparkly`
> `eyes, soft pink blush cheeks, bold clean dark outline, soft cel shading,`
> `chunky rounded proportions, full body, front view, centered, friendly smile,`
> `vibrant colors, transparent background, high detail, 1:1 square`

Tips: generate **1024×1024**, **transparent background**, one animal centered.
For the "Special" mascots (Leo/Willow/Fitz/the named Dodos) add the real
description (e.g. "golden retriever guide dog" for Leo). Save as
`public/animals/<slug>.png` — the game picks it up with no code change.

### Making backgrounds transparent

If your generator only outputs a **flat/solid background** (white is easiest),
`scripts/remove-bg.mjs` flood-fills the background transparent from the edges
(so interior whites like eyes are kept):

```bash
npm install --no-save pngjs
node scripts/remove-bg.mjs                 # all PNGs in public/animals
node scripts/remove-bg.mjs blue-jay.png    # just one
TOLERANCE=80 node scripts/remove-bg.mjs x.png   # raise if a halo remains
```

It works cleanly on flat backgrounds. Soft/gradient backgrounds (or a subject
colored close to the background) may leave a faint halo — prefer generating with
a **transparent background** directly when you can.

## Code layout

```
src/
  data/      # editable content (above)
  game/      # simulation: state, factory loop, shop, upgrades, save/offline
  render/    # canvas.ts — belt, animals, stations, floating payouts
  ui/        # ui.ts — HUD, shop, upgrades, stats, toasts, offline modal
  util/      # number/time formatting
  main.ts    # bootstrap + game loop
```

Progress saves to `localStorage` every 10s and on exit; offline earnings
accrue via the **Night Shift** upgrade once the whole loop is automated.
