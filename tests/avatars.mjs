// tests/avatars.mjs — the game's shared avatar layer, without a browser.
//
// What is worth pinning down here is not the rendering, it is the sharing:
// four screens asking for one profile must produce one request, a save must
// reach every screen, a cached "no avatar" must not be asked for again, and a
// network failure must not get remembered as "this profile has no avatar".
//
// Run: node tests/avatars.mjs      (also run by tests/run.sh)

import assert from 'node:assert/strict';

// ── a window and an axios, just enough of each ──────────────────────────────
const listeners = new Map();
globalThis.window = {
  addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
  },
  removeEventListener(type, fn) {
    listeners.get(type)?.delete(fn);
  },
  dispatchEvent(e) {
    for (const fn of listeners.get(e.type) ?? []) fn(e);
    return true;
  },
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

const calls = [];
let nextReply = () => ({ data: { success: true, data: { avatar_url: null, version: 0 } } });

const axiosStub = {
  default: {
    get(url, config) {
      calls.push({ url, params: config?.params });
      return Promise.resolve().then(() => {
        const reply = nextReply(calls.length);
        if (reply instanceof Error) throw reply;
        return reply;
      });
    },
  },
};

// The module under test is browser ES module code with one import. Rather than
// stand up a bundler, read it, swap that import for our stub and evaluate it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'game', 'src', 'utils', 'avatars.js'), 'utf8')
  .replace("import axios from 'axios';", 'const axios = __axios;')
  // `new Function` is a script, not a module: drop the default-export object
  // and the `export` keyword from the named ones, then hand them back instead.
  .replace(/export default \{[\s\S]*?\};\s*$/, '')
  .replace(/^export /gm, '');

const EXPORTS = [
  'AVATAR_EVENT', 'normalizeRole', 'roleHasAvatar', 'avatarKey', 'withVersion',
  'readAvatar', 'fetchAvatar', 'publishAvatar', 'hasAttempted', 'forgetAvatar',
  'clearAvatars',
];

const A = new Function('__axios', `${src}\nreturn { ${EXPORTS.join(', ')} };`)(axiosStub.default);

// If the module grows an export the harness does not know about, that is fine;
// if it loses one these tests use, say so plainly rather than failing on
// "undefined is not a function" twenty lines later.
for (const name of EXPORTS) {
  if (typeof A[name] === 'undefined') {
    throw new Error(`avatars.js no longer exports ${name}`);
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────
let passed = 0;
function ok(what, cond) {
  assert.ok(cond, what);
  passed++;
}
const reset = () => {
  A.clearAvatars();
  calls.length = 0;
};

// ── role handling ───────────────────────────────────────────────────────────
ok("'child' is the same profile as 'mini'", A.normalizeRole('child') === 'mini');
ok('a mini key does not depend on which word was used',
   A.avatarKey('child', 7) === A.avatarKey('mini', 7));
ok('all four profile types have avatars',
   ['parent', 'expert', 'builder', 'mini'].every(A.roleHasAvatar));
ok('a guest has none', !A.roleHasAvatar('guest'));
ok('an unknown role has none', !A.roleHasAvatar('wizard'));

// ── cache busting ───────────────────────────────────────────────────────────
ok('the version is appended so a replaced PNG is not served from cache',
   A.withVersion('https://x/a.png', 3) === 'https://x/a.png?v=3');
ok('a url that already has a query keeps it',
   A.withVersion('https://x/a.png?w=1', 3) === 'https://x/a.png?w=1&v=3');
ok('no version, no query', A.withVersion('https://x/a.png', 0) === 'https://x/a.png');

// ── one request for one profile, however many screens ask ───────────────────
reset();
nextReply = () => ({ data: { success: true, data: { avatar_url: 'https://x/p.png', version: 2 } } });

const together = await Promise.all([
  A.fetchAvatar('parent', 10),
  A.fetchAvatar('parent', 10),
  A.fetchAvatar('parent', 10),
  A.fetchAvatar('parent', 10),
]);
ok('four screens asking at once make one request', calls.length === 1);
ok('and all four get the same busted url',
   together.every((u) => u === 'https://x/p.png?v=2'));
ok('the request asks for the right profile',
   calls[0].params.user_id === 10 && calls[0].params.role === 'parent');

await A.fetchAvatar('parent', 10);
ok('a later screen is served from the cache', calls.length === 1);
ok('and can read it without waiting', A.readAvatar('parent', 10) === 'https://x/p.png?v=2');

// ── a profile with no avatar yet is not asked about twice ───────────────────
reset();
nextReply = () => ({ data: { success: true, data: { avatar_url: null, version: 0 } } });
ok('nothing is known before asking', A.readAvatar('mini', 55) === undefined);
ok('and the asking has not happened', !A.hasAttempted('mini', 55));
await A.fetchAvatar('mini', 55);
ok('"no avatar" comes back as null', A.readAvatar('mini', 55) === null);
await A.fetchAvatar('mini', 55);
ok('and is remembered rather than asked again', calls.length === 1);
ok('the lookup counts as done', A.hasAttempted('mini', 55));

// ── a failure must not be remembered as "no avatar" ─────────────────────────
reset();
nextReply = () => new Error('network down');
const failed = await A.fetchAvatar('expert', 11);
ok('a failed lookup answers null so the placeholder shows', failed === null);
ok('but nothing is cached, so a later mount tries again',
   A.readAvatar('expert', 11) === undefined);
ok('and the screen still stops waiting', A.hasAttempted('expert', 11));

nextReply = () => ({ data: { success: true, data: { avatar_url: 'https://x/e.png', version: 1 } } });
const retried = await A.fetchAvatar('expert', 11);
ok('the retry really goes out', calls.length === 2);
ok('and this time it works', retried === 'https://x/e.png?v=1');

// ── a save reaches every screen ─────────────────────────────────────────────
reset();
const heard = [];
const onUpdate = (e) => heard.push(e.detail);
window.addEventListener(A.AVATAR_EVENT, onUpdate);

A.publishAvatar('parent', 10, 'https://x/new.png', 4);
ok('publishing announces the change once', heard.length === 1);
ok('with the key the screens are watching', heard[0].key === 'parent:10');
ok('and the busted url', heard[0].url === 'https://x/new.png?v=4');
ok('a later read gets it with no request',
   A.readAvatar('parent', 10) === 'https://x/new.png?v=4');
await A.fetchAvatar('parent', 10);
ok('and no request is made', calls.length === 0);

// A mini saved under either spelling must land on the one key the cards watch.
A.publishAvatar('child', 7, 'https://x/m.png', 1);
ok("publishing a 'child' lands on the mini key", heard[1].key === 'mini:7');
ok('and a screen watching the mini sees it',
   A.readAvatar('mini', 7) === 'https://x/m.png?v=1');

window.removeEventListener(A.AVATAR_EVENT, onUpdate);

// ── nothing is published for a profile that cannot have one ─────────────────
reset();
const guestHeard = [];
const onGuest = (e) => guestHeard.push(e.detail);
window.addEventListener(A.AVATAR_EVENT, onGuest);
A.publishAvatar('guest', 1, 'https://x/g.png', 1);
A.publishAvatar('parent', undefined, 'https://x/g.png', 1);
A.publishAvatar('parent', '', 'https://x/g.png', 1);
ok('a guest and a missing id are ignored rather than cached', guestHeard.length === 0);
await A.fetchAvatar('guest', 1);
await A.fetchAvatar('parent', null);
ok('and neither is asked about', calls.length === 0);
window.removeEventListener(A.AVATAR_EVENT, onGuest);

// ── signing out must not leave the next person someone else's face ──────────
reset();
A.publishAvatar('parent', 10, 'https://x/p.png', 1);
A.publishAvatar('mini', 7, 'https://x/m.png', 1);
A.clearAvatars();
ok('nothing survives a sign-out', A.readAvatar('parent', 10) === undefined);
ok('for any profile', A.readAvatar('mini', 7) === undefined);
ok('and the lookups are forgotten too', !A.hasAttempted('parent', 10));

// forgetAvatar is the single-profile version of the same thing.
A.publishAvatar('builder', 12, 'https://x/b.png', 1);
A.forgetAvatar('builder', 12);
ok('one profile can be dropped on its own', A.readAvatar('builder', 12) === undefined);

console.log(`avatars                no problems (${passed} checks)`);
