// src/utils/rewardCatalog.js
//
// The fourteen rewards, with the wording and the colours from the delivered
// designs. The names match the reward_type values the API stores, which are
// listed in game-api/rewards/add-reward.php:
//
//   bricks (blue)  daily, recording, streak, mini_creation, mission
//   medals (red)   new_scene, new_level, completion, streak, progress, achievement
//   cups   (green) gold, streak_champion, mini_champion
//
// Kept in one table so a notification, a dashboard tile and anything added
// later all say the same thing about the same reward. A type that is not in
// here still shows a notification — see fallbackFor — rather than being
// dropped, because a child who earned something should be told so even if the
// wording for it has not been written yet.

import brickIcon from '../assets/rewards/Rewards_Brick.png';
import medalIcon from '../assets/rewards/Rewards_Medal.png';
import cupIcon from '../assets/rewards/Rewards_Cup.png';

export const CATEGORY = {
  brick: { color: '#0055BF', icon: brickIcon, label: 'Brick' },
  medal: { color: '#E31E24', icon: medalIcon, label: 'Medal' },
  cup:   { color: '#237841', icon: cupIcon,   label: 'Cup'   },
};

export const REWARDS = {
  // ── Bricks ───────────────────────────────────────────────────────────────
  daily_brick: {
    category: 'brick',
    heading: 'Daily Brick',
    title: 'You earned a Daily Brick!',
    message: 'Great job showing up and playing today!',
  },
  recording_brick: {
    category: 'brick',
    heading: 'Recording Brick',
    title: 'You earned a Recording Brick!',
    message: 'Your voice recording was awesome!',
  },
  streak_brick: {
    category: 'brick',
    heading: 'Streak Brick (5-day)',
    title: 'You earned a Streak Brick!',
    message: 'Five days in a row — keep going strong!',
  },
  mini_creation_brick: {
    category: 'brick',
    heading: 'Mini Creation Brick',
    title: 'You earned a Mini Creation Brick!',
    message: 'Your new Mini looks amazing!',
  },
  mission_brick: {
    category: 'brick',
    heading: 'Mission Brick',
    title: 'You earned a Mission Brick!',
    message: "You completed today's mission — well done!",
  },

  // ── Medals ───────────────────────────────────────────────────────────────
  new_scene_medal: {
    category: 'medal',
    heading: 'New Scene Medal',
    title: 'You earned a New Scene Medal!',
    message: 'You tried a scene for the very first time — brave choice!',
  },
  new_level_medal: {
    category: 'medal',
    heading: 'New Level Medal',
    title: 'You earned a New Level Medal!',
    message: 'You were brave and tried a brand-new level!',
  },
  completion_medal: {
    category: 'medal',
    heading: 'Completion Medal',
    title: 'You earned a Completion Medal!',
    message: 'You finished a scene or level from start to finish!',
  },
  streak_medal: {
    category: 'medal',
    heading: 'Streak Medal (10-day)',
    title: 'You earned a Streak Medal!',
    message: 'Ten days in a row — what incredible progress!',
  },
  progress_medal: {
    category: 'medal',
    heading: 'Progress Medal',
    title: 'You earned a Progress Medal!',
    message: 'Your skills keep getting better every day!',
  },
  achievement_medal: {
    category: 'medal',
    heading: 'Achievement Medal',
    title: 'You earned an Achievement Medal!',
    message: 'A special reward for a unique accomplishment!',
  },

  // ── Cups ─────────────────────────────────────────────────────────────────
  gold_cup: {
    category: 'cup',
    heading: 'Gold Cup',
    title: 'You earned a Gold Cup!',
    message: 'Your hard work added up to something big!',
  },
  streak_champion_cup: {
    category: 'cup',
    heading: 'Streak Champion Cup (30+ days)',
    title: 'You earned a Streak Champion Cup!',
    message: '30 days in a row — this is truly incredible!',
  },
  mini_champion_cup: {
    category: 'cup',
    heading: 'Mini-Champion Cup',
    title: 'You earned the Mini-Champion Cup!',
    message: 'A huge reward for your dedication and courage!',
  },
};

/**
 * Wording for a reward type nobody has written copy for yet. The category is
 * still known — the API stores it next to the type — so the colour and the
 * picture are right, and the child is told they earned something.
 */
function fallbackFor(type, category) {
  const words = String(type || 'reward')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const kind = CATEGORY[category] ? CATEGORY[category].label : 'Reward';
  return {
    category: CATEGORY[category] ? category : 'brick',
    heading: words,
    title: `You earned a ${words}!`,
    message: `A new ${kind} for your collection — well done!`,
  };
}

/** Everything a notification needs for one reward row from the API. */
export function describeReward(reward) {
  const type = reward?.reward_type;
  const known = REWARDS[type];
  const d = known || fallbackFor(type, reward?.reward_category);
  const cat = CATEGORY[d.category] || CATEGORY.brick;

  return {
    type: type || 'reward',
    known: Boolean(known),
    category: d.category,
    heading: d.heading,
    title: d.title,
    message: d.message,
    color: cat.color,
    icon: cat.icon,
  };
}

export default { REWARDS, CATEGORY, describeReward };
