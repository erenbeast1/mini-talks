// tests/reward-catalog.mjs — the wording and colours a child is shown.
//
// Two things are worth holding still here. First, the fourteen reward_type
// values the API can store must all have copy: a child who earns something and
// is told "You earned a Reward!" has been let down by the table, not by the
// server. Second, a type nobody has written copy for must still produce a
// usable notification rather than a blank card or a crash — the API is where
// new rewards appear, and the client finds out afterwards.
//
// Run: node tests/reward-catalog.mjs      (also run by tests/run.sh)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// Browser ES module with three PNG imports; stub those and evaluate the rest.
const src = readFileSync(join(root, 'game/src/utils/rewardCatalog.js'), 'utf8')
  .replace(/^import .* from '.*\.png';$/gm, '')
  .replace(/export default \{[\s\S]*?\};\s*$/, '')
  .replace(/^export /gm, '');

const EXPORTS = ['REWARDS', 'CATEGORY', 'describeReward'];
const C = new Function(
  'brickIcon', 'medalIcon', 'cupIcon',
  `${src}\nreturn { ${EXPORTS.join(', ')} };`
)('brick.png', 'medal.png', 'cup.png');

let passed = 0;
const ok = (what, cond) => { assert.ok(cond, what); passed++; };

// The reward_type values listed in game-api/rewards/add-reward.php.
const API_TYPES = {
  brick: ['daily_brick', 'recording_brick', 'streak_brick', 'mini_creation_brick', 'mission_brick'],
  medal: ['new_scene_medal', 'new_level_medal', 'completion_medal', 'streak_medal',
          'progress_medal', 'achievement_medal'],
  cup:   ['gold_cup', 'streak_champion_cup', 'mini_champion_cup'],
};

// ── every type the API can store has copy, in the right category ────────────
for (const [category, types] of Object.entries(API_TYPES)) {
  for (const type of types) {
    const r = C.REWARDS[type];
    ok(`${type} has copy`, Boolean(r));
    ok(`${type} is a ${category}`, r && r.category === category);
    ok(`${type} has a heading`, r && typeof r.heading === 'string' && r.heading.length > 0);
    ok(`${type} tells the child what they earned`, r && /^You earned /.test(r.title));
    ok(`${type} has a second line`, r && typeof r.message === 'string' && r.message.length > 10);
  }
}

const apiCount = Object.values(API_TYPES).flat().length;
ok('fourteen rewards, no more and no fewer', apiCount === 14);
ok('and the table holds exactly those', Object.keys(C.REWARDS).length === apiCount);
ok('with nothing invented that the API cannot store',
   Object.keys(C.REWARDS).every((t) => Object.values(API_TYPES).flat().includes(t)));

// ── the three colours, matching the delivered designs ───────────────────────
ok('bricks are blue', C.CATEGORY.brick.color === '#0055BF');
ok('medals are red',  C.CATEGORY.medal.color === '#E31E24');
ok('cups are green',  C.CATEGORY.cup.color === '#237841');
ok('each category has its own picture',
   new Set(['brick', 'medal', 'cup'].map((k) => C.CATEGORY[k].icon)).size === 3);

// ── describeReward: what the notification actually renders ──────────────────
const rec = C.describeReward({ reward_type: 'recording_brick', reward_category: 'brick' });
ok('a known reward is marked known', rec.known === true);
ok('and carries its own words', rec.title === 'You earned a Recording Brick!');
ok('and its category colour', rec.color === '#0055BF');
ok('and its picture', rec.icon === 'brick.png');

const cup = C.describeReward({ reward_type: 'mini_champion_cup', reward_category: 'cup' });
ok('a cup is green', cup.color === '#237841');
ok('and uses the trophy', cup.icon === 'cup.png');

// The category comes from the row, so the colour is right even before anyone
// writes copy for a new type.
const future = C.describeReward({ reward_type: 'courage_medal', reward_category: 'medal' });
ok('an unknown type still produces a notification', Boolean(future.title));
ok('it is marked as having no copy yet', future.known === false);
ok('it is readable rather than snake_case', future.heading === 'Courage Medal');
ok('it still says what happened', future.title === 'You earned a Courage Medal!');
ok('it takes its colour from the category the API gave', future.color === '#E31E24');
ok('and the matching picture', future.icon === 'medal.png');

// Worst case: the row is missing things entirely.
const junk = C.describeReward({});
ok('a row with no type does not crash', Boolean(junk.title));
ok('and falls back to a brick rather than nothing', junk.category === 'brick');
const nullish = C.describeReward(null);
ok('neither does no row at all', Boolean(nullish && nullish.title));

// A category the API would never send must not pick an undefined colour.
const weird = C.describeReward({ reward_type: 'x_thing', reward_category: 'sticker' });
ok('an unknown category still has a colour', typeof weird.color === 'string' && weird.color.length > 0);
ok('and a picture', Boolean(weird.icon));

console.log(`reward catalog         no problems (${passed} checks)`);
