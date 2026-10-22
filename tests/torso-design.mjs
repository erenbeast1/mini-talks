// tests/torso-design.mjs — what a child prints on a Mini's shirt, without a browser.
//
// Two things here are worth pinning down. The first is where an uploaded
// picture lives: it belongs to the sitting, not to the saved record, so a
// shirt item may only ever carry a reference to one and a reference from a
// sitting that has ended must resolve to nothing rather than to a broken
// address. The second is the writing itself — what a child may type, and the
// promise that nothing can be dragged off the edge of the shirt.
//
// Run: node tests/torso-design.mjs      (also run by tests/run.sh)

import assert from 'node:assert/strict';

// ── a sessionStorage, just enough of one ───────────────────────────────────
let store = new Map();
let refuse = false;                       // private browsing, or simply full
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { if (refuse) throw new Error('QuotaExceededError'); store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

const T = await import('../game/src/components/torsoDesign.js');

let passed = 0;
const ok = (what, cond) => { assert.ok(cond, what); passed += 1; };
const reset = () => { store = new Map(); refuse = false; };

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

// ── an uploaded picture belongs to the sitting ─────────────────────────────
reset();
const ref = T.putSessionIcon(PNG, 'kedim.png');
ok('an upload hands back a reference, not the picture', ref.startsWith('session:') && !ref.includes('base64'));
ok('and that is what the shirt item would carry', T.isSessionIcon(ref));
ok('a sticker from the pack is not one of them', !T.isSessionIcon(T.BUILTIN_ICONS[0].src));
ok('the reference resolves while the sitting lasts', T.resolveIconSrc(ref) === PNG);
ok('a sticker from the pack resolves to itself', T.resolveIconSrc(T.BUILTIN_ICONS[0].src) === T.BUILTIN_ICONS[0].src);
ok('the picture is in the tray', T.sessionIcons().length === 1);
ok('under the name it came with', T.sessionIcons()[0].label === 'kedim.png');

// A new day is a new sitting: the store is empty and the reference is dead.
store = new Map();
ok('next time, the reference resolves to nothing', T.resolveIconSrc(ref) === null);
ok('and the tray is empty again', T.sessionIcons().length === 0);
ok('which is not an error', T.resolveIconSrc(undefined) === null);

// ── the store is bounded, and says so rather than silently dropping ────────
reset();
for (let i = 0; i < T.MAX_SESSION_ICONS; i += 1) T.putSessionIcon(PNG, `p${i}.png`);
ok('as many pictures as the cap allows', T.sessionIcons().length === T.MAX_SESSION_ICONS);
assert.throws(() => T.putSessionIcon(PNG, 'one too many'), /full/);
passed += 1;
T.removeSessionIcon(T.sessionIcons()[0].src);
ok('removing one makes room', T.sessionIcons().length === T.MAX_SESSION_ICONS - 1);
T.putSessionIcon(PNG, 'now it fits.png');
ok('and the next one is kept', T.sessionIcons().length === T.MAX_SESSION_ICONS);
ok('oldest first, so the tray does not shuffle itself', T.sessionIcons()[0].label === 'p1.png');

// A browser that will not keep it says so, rather than leaving a sticker
// behind whose picture was never saved.
reset();
refuse = true;
assert.throws(() => T.putSessionIcon(PNG, 'nowhere.png'), /store/);
passed += 1;
refuse = false;

// Nonsense in the store is not worth a crash on a child's screen.
reset();
store.set('miniTalks.torsoIcons', '{not json');
ok('a store full of rubbish reads as empty', T.sessionIcons().length === 0);

// ── what a child may write ─────────────────────────────────────────────────
ok('writing is upper case', T.sanitiseText('eren', 'classic') === 'EREN');
ok('Turkish letters survive on a font that has them', T.sanitiseText('çiğdem', 'classic') === 'ÇİĞDEM');
ok('and fold on a font that has not', T.sanitiseText('çiğdem', 'fun') === 'CIGDEM');
ok('an emoji simply leaves nothing behind', T.sanitiseText('ses 🙂', 'classic').trim() === 'SES');
ok('and the line cannot outgrow the shirt',
   T.sanitiseText('a'.repeat(40), 'classic').length === T.MAX_TEXT_LENGTH);

// ── nothing may be dragged off the edge ────────────────────────────────────
const item = T.clampItem({ ...T.newTextItem('front'), x: 2.5, y: -3, scale: 0.4 });
ok('an item dragged past the seam is brought back', item.x <= 1 && item.x >= 0 && item.y <= 1 && item.y >= 0);
ok('and one blown up past the panel is capped', T.clampItem({ ...T.newTextItem(), scale: 9 }).scale === T.MAX_SCALE);
ok('a turn is kept to one lap', T.clampItem({ ...T.newTextItem(), rotation: 730 }).rotation === 10);

// ── which item a tap lands on ──────────────────────────────────────────────
const a = { ...T.newTextItem('front'), id: 'a', x: 0.5, y: 0.45 };
const b = { ...T.newIconItem(PNG, 'front'), id: 'b', x: 0.5, y: 0.45, scale: 0.4 };
ok('the last one drawn is the one picked up', T.hitTest([a, b], 'front', 0.5, 0.45, 1) === 'b');
ok('a tap on the other side of the shirt picks up nothing', T.hitTest([a, b], 'back', 0.5, 0.45, 1) === null);
ok('nor does one on bare cloth', T.hitTest([a, b], 'front', 0.02, 0.95, 1) === null);

console.log(`torso design           no problems (${passed} checks)`);
