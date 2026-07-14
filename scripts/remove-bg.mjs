// Remove a flat/near-flat background from animal PNGs by flood-filling inward
// from the image borders. Only the background region connected to the edges is
// made transparent, so interior whites (eyes, bellies, highlights) are kept.
//
// Usage:
//   node scripts/remove-bg.mjs                 # process every PNG in public/animals
//   node scripts/remove-bg.mjs bear.png leo.png  # process specific files
//   TOLERANCE=70 node scripts/remove-bg.mjs    # override colour tolerance
//
// Requires: npm install --no-save pngjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PNG } from "pngjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "animals");
const TOL = Number(process.env.TOLERANCE ?? 62); // core "is background" threshold
const FEATHER = TOL * 1.7; // outer band for soft anti-halo edges

function dist2(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

function processFile(file) {
  const png = PNG.sync.read(readFileSync(join(DIR, file)));
  const { width: w, height: h, data } = png;

  // Reference background colour = median-ish of the four corners + edge mids.
  const samples = [
    [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
    [(w / 2) | 0, 0], [(w / 2) | 0, h - 1], [0, (h / 2) | 0], [w - 1, (h / 2) | 0],
  ];
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of samples) {
    const i = (y * w + x) * 4;
    br += data[i]; bg += data[i + 1]; bb += data[i + 2];
  }
  br /= samples.length; bg /= samples.length; bb /= samples.length;

  const tol2 = TOL * TOL;
  const feather2 = FEATHER * FEATHER;
  const visited = new Uint8Array(w * h);
  const stack = [];

  const pushIfBg = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    const i = p * 4;
    if (dist2(data[i], data[i + 1], data[i + 2], br, bg, bb) <= feather2) {
      visited[p] = 1;
      stack.push(p);
    }
  };

  // Seed from every border pixel.
  for (let x = 0; x < w; x++) { pushIfBg(x, 0); pushIfBg(x, h - 1); }
  for (let y = 0; y < h; y++) { pushIfBg(0, y); pushIfBg(w - 1, y); }

  let cleared = 0;
  while (stack.length) {
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    const i = p * 4;
    const d2 = dist2(data[i], data[i + 1], data[i + 2], br, bg, bb);
    if (d2 <= tol2) {
      data[i + 3] = 0; // fully background -> transparent
      cleared++;
    } else {
      // feather band: partially transparent for a soft edge
      const t = (d2 - tol2) / (feather2 - tol2); // 0..1 across the band
      data[i + 3] = Math.round(Math.min(255, Math.max(0, t)) * 255);
    }
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
  }

  writeFileSync(join(DIR, file), PNG.sync.write(png));
  const pct = ((cleared / (w * h)) * 100).toFixed(1);
  console.log(`${file}: bg=(${br | 0},${bg | 0},${bb | 0}) cleared ${pct}%`);
}

const args = process.argv.slice(2);
const files = args.length ? args : readdirSync(DIR).filter((f) => f.endsWith(".png"));
for (const f of files) processFile(f);
console.log(`Done (${files.length} file${files.length === 1 ? "" : "s"}).`);
