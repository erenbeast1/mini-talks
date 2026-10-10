// tests/assets.mjs — every picture the game imports is actually there.
//
// Two ways this breaks, and both have happened:
//
//   Missing    an import resolves to nothing, and the build stops dead.
//              `src/assets/scenes/` arrived empty, so eleven imports in
//              Sceneselectionpage.jsx had nothing behind them.
//
//   Corrupt    a file exists but is zero bytes. Several did, out of the
//              archive they were sent in, and a zero-byte PNG builds happily
//              and then renders as a broken image in front of a child.
//
// There is also a third, quieter one: a case mismatch. Seven files imported
// `../assets/logo.png` while the file on disk was `Logo.png`. Windows and
// macOS do not care; Linux does, which is where this is deployed and built. A
// filesystem check catches it where a build on a case-insensitive machine
// never would.
//
// AWAITING is the list of files known to be missing and asked for. It keeps
// the suite honest without keeping it red: a name in here is reported, not
// failed, and removing it is how a delivered file gets enforced.
//
// Run: node tests/assets.mjs      (also run by tests/run.sh)

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const game = join(root, 'game');

// Known missing, asked for, not yet delivered. Delete a line when it arrives.
const AWAITING = new Set([
  'game/src/assets/Sahne_2_Gorsel.png',
  'game/src/assets/scenes/basketball.png',
  'game/src/assets/scenes/beach.png',
  'game/src/assets/scenes/cafe.png',
  'game/src/assets/scenes/classroom.png',
  'game/src/assets/scenes/orchestra.png',
  'game/src/assets/scenes/playground.png',
  'game/src/assets/scenes/pool_party.png',
  'game/src/assets/scenes/robot_tournament.png',
  'game/src/assets/scenes/supermarket.png',
  'game/src/assets/scenes/tennis.png',
  // Zero bytes out of the archive; the two that are actually imported.
  'game/src/assets/Cancel Red Btn 2 Hover.png',
  'game/src/assets/custommini/Mini_image.png',
]);

function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    // src/src is a stray duplicate nothing imports; skip it.
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || p.endsWith('/src/src')) continue;
      sources(p, out);
    } else if (/\.(jsx?|mjs)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const { readFileSync } = await import('node:fs');

const missing = [];
const empty = [];
const wrongCase = [];
let checked = 0;

for (const file of sources(join(game, 'src'))) {
  const text = readFileSync(file, 'utf8');
  const re = /from\s+['"](\.{1,2}\/[^'"]*assets\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text))) {
    const target = normalize(join(dirname(file), m[1]));
    const rel = relative(root, target);
    checked++;

    if (!existsSync(target)) {
      // Is it only the capitalisation that is wrong? That builds on Windows
      // and fails here, which is the hardest version of this to notice.
      const dir = dirname(target);
      const want = basename(target).toLowerCase();
      const hit = existsSync(dir)
        ? readdirSync(dir).find((f) => f.toLowerCase() === want)
        : undefined;
      if (hit) wrongCase.push(`${rel}  (on disk: ${hit})  <- ${relative(root, file)}`);
      else missing.push({ rel, from: relative(root, file) });
      continue;
    }
    if (statSync(target).size === 0) empty.push({ rel, from: relative(root, file) });
  }
}

const unexpectedMissing = missing.filter((x) => !AWAITING.has(x.rel));
const unexpectedEmpty = empty.filter((x) => !AWAITING.has(x.rel));
const awaitingSeen = new Set([...missing, ...empty].map((x) => x.rel).filter((r) => AWAITING.has(r)));
const delivered = [...AWAITING].filter((r) => !awaitingSeen.has(r));

let bad = 0;

for (const x of unexpectedMissing) {
  console.log(`  MISSING  ${x.rel}\n             imported by ${x.from}`);
  bad++;
}
for (const x of unexpectedEmpty) {
  console.log(`  EMPTY    ${x.rel}  (0 bytes — will render broken)\n             imported by ${x.from}`);
  bad++;
}
for (const x of wrongCase) {
  console.log(`  CASE     ${x}`);
  bad++;
}
// A delivered file must not stay on the waiting list, or the list stops
// meaning anything.
for (const r of delivered) {
  console.log(`  STALE    ${r} is present now — remove it from AWAITING in tests/assets.mjs`);
  bad++;
}

if (bad) {
  console.log(`assets                 ${bad} problem(s), ${checked} imports checked`);
  process.exit(1);
}

const waiting = awaitingSeen.size;
console.log(
  `assets                 no problems (${checked} imports checked` +
  (waiting ? `, ${waiting} awaiting delivery` : '') + ')'
);
