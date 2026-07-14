// Regenerate the animal art as consistent emoji images from Twemoji.
// Downloads one PNG per animal into public/animals/<asset>.png so every animal
// looks identical on every device (the "Fly / Leo" emoji style).
//
// Twemoji graphics: © Twitter / jdecked, licensed CC-BY 4.0.
// Source: https://github.com/jdecked/twemoji
//
// Usage:  node scripts/fetch-emoji.mjs
// Requires internet access (uses fetch). Change SIZE to "svg" for vector.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "animals");
const BASE = "https://raw.githubusercontent.com/jdecked/twemoji/main/assets/72x72";

// asset slug -> emoji (must match the `emoji` field in src/data/animals.ts)
const MAP = {
  fly: "🪰", frog: "🐸", caterpillar: "🐛", fish: "🐟", kitten: "🐱",
  pigeon: "🕊️", chicken: "🐔", bunny: "🐰", pig: "🐷", turkey: "🦃",
  bear: "🐻", pug: "🐶", axolotl: "🦎", turtle: "🐢", ferret: "🐾",
  otter: "🦦", seahorse: "🐡", "blue-jay": "🐦", "fennec-fox": "🦊", chinchilla: "🐭",
  owl: "🦉", puffin: "🐧", sloth: "🦥", armadillo: "🦔", parrot: "🦜",
  octopus: "🐙", jellyfish: "🪼", stingray: "🐠", salmon: "🐟", "sea-lion": "🦭",
  seal: "🦭", monkey: "🐵", shark: "🦈", walrus: "🦭", horse: "🐴",
  kangaroo: "🦘", zebra: "🦓", giraffe: "🦒", elephant: "🐘", orca: "🐋",
  whale: "🐳", "bighorn-sheep": "🐏", "polar-bear": "🐻‍❄️", panda: "🐼", dinosaur: "🦕",
  dodo: "🦤", "dumb-dodo": "🦤", "rainbow-dodo": "🌈", "golden-axolotl": "✨", leo: "🦮",
  willow: "🐶", fitz: "🐕", "larus-dodo": "🦤", "schaffer-dodo": "🦤", "amanda-dodo": "🦤",
  megalodon: "🦈",
};

// Twemoji's own codepoint algorithm (keeps FE0F only inside ZWJ sequences).
function toCodePoint(s) {
  const r = [];
  let c = 0, p = 0, i = 0;
  while (i < s.length) {
    c = s.charCodeAt(i++);
    if (p) {
      r.push((0x10000 + ((p - 0xd800) << 10) + (c - 0xdc00)).toString(16));
      p = 0;
    } else if (0xd800 <= c && c <= 0xdbff) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join("-");
}
function twemojiFile(e) {
  return toCodePoint(e.indexOf("‍") < 0 ? e.replace(/️/g, "") : e);
}

mkdirSync(OUT, { recursive: true });
let ok = 0;
const fail = [];
for (const [asset, emoji] of Object.entries(MAP)) {
  const url = `${BASE}/${twemojiFile(emoji)}.png`;
  const res = await fetch(url);
  if (!res.ok) { fail.push(`${asset} (${res.status})`); continue; }
  writeFileSync(join(OUT, `${asset}.png`), Buffer.from(await res.arrayBuffer()));
  ok++;
}
console.log(`Downloaded ${ok}/${Object.keys(MAP).length} emoji.`);
if (fail.length) console.log("Failed:", fail.join(", "));
