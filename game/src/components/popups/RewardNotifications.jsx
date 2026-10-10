// src/components/popups/RewardNotifications.jsx
//
// The slide-in notification a child gets the moment they earn something.
//
// The card is the delivered reward design: a coloured header bar with the
// reward's name, a white body with the brick / medal / cup picture on the left
// and two lines beside it. Blue for bricks, red for medals, green for cups —
// the same three colours the dashboard already uses.
//
// It arrives open, because the point is that the child sees it without doing
// anything. After a few seconds it folds itself down to a slim bar so it stops
// covering the game; tapping that opens it again, and OK or × sends it away.
//
// Where the rewards come from
// ---------------------------
// Not from the call the child just made. Rewards are created on the server,
// and reward-triggers.php can hand out a daily brick, a streak brick and a
// new-level medal off the back of one recording — while save-recording.php
// answers only reward_given:true, naming none of them. So instead the client
// keeps a high-water mark of the last reward id it has shown and asks
// rewards/get-recent.php what is newer. Whatever awarded it, it gets found.
//
// The first check for a Mini shows nothing: it only records where to start,
// so nobody opening the game is buried under a year of history.
//
//   App.jsx           <RewardNotificationProvider> around the routes
//   anywhere          const { checkRewards } = useRewardNotifications();
//                     checkRewards(miniId);        // after anything that may award
//                     notifyReward('daily_brick'); // or show one directly

import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import axios from 'axios';
import { describeReward } from '../../utils/rewardCatalog';

const API_BASE = 'https://mini-talks.org/minitalks-api';

const OPEN_MS = 7000;   // how long it stays open before folding down
const MAX_ON_SCREEN = 3; // older ones drop off rather than filling the screen

const RewardNotificationContext = createContext(null);

const seenKey = (miniId) => `mt-rewards-seen-${miniId}`;

function readMark(miniId) {
  try {
    const raw = localStorage.getItem(seenKey(miniId));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeMark(miniId, id) {
  try {
    localStorage.setItem(seenKey(miniId), String(id));
  } catch {
    // Private window or blocked storage. The mark is a convenience; without it
    // the next check seeds again and shows nothing, which is the safe failure.
  }
}

/* ── one card ──────────────────────────────────────────────────────────── */

const RewardCard = ({ item, onDismiss }) => {
  const [open, setOpen] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setTimeout(() => setOpen(false), OPEN_MS);
    return () => clearTimeout(timer.current);
  }, []);

  const dismiss = () => {
    clearTimeout(timer.current);
    setLeaving(true);
    setTimeout(() => onDismiss(item.key), 260);   // let the slide-out finish
  };

  const reopen = () => {
    clearTimeout(timer.current);
    setOpen(true);
    timer.current = setTimeout(() => setOpen(false), OPEN_MS);
  };

  const { color, icon, heading, title, message } = item.reward;

  return (
    <div
      className={`mt-rn-card${leaving ? ' mt-rn-leaving' : ''}`}
      style={{ borderColor: color }}
      role="status"
      aria-live="polite"
    >
      {/* Coloured header bar — also the handle that folds it back open */}
      <button
        type="button"
        className="mt-rn-head"
        style={{ backgroundColor: color }}
        onClick={open ? dismiss : reopen}
        aria-expanded={open}
        aria-label={open ? `Dismiss: ${title}` : `Open: ${title}`}
      >
        <span className="mt-rn-heading">{heading}</span>
        <span className="mt-rn-x" aria-hidden="true">{open ? '✕' : '▾'}</span>
      </button>

      {open && (
        <div className="mt-rn-body">
          <img className="mt-rn-icon" src={icon} alt="" />
          <div className="mt-rn-text">
            <div className="mt-rn-title">{title}</div>
            <div className="mt-rn-message">{message}</div>
          </div>
          <button type="button" className="mt-rn-ok" style={{ backgroundColor: color }} onClick={dismiss}>
            OK
          </button>
        </div>
      )}
    </div>
  );
};

/* ── the provider ──────────────────────────────────────────────────────── */

export const RewardNotificationProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  // Rewards already turned into a card, so two checks landing together cannot
  // show the same one twice.
  const shown = useRef(new Set());
  const nextKey = useRef(1);
  const inFlight = useRef(new Set());

  const push = useCallback((reward) => {
    const key = nextKey.current++;
    setItems((list) => [...list, { key, reward }].slice(-MAX_ON_SCREEN));
  }, []);

  const dismiss = useCallback((key) => {
    setItems((list) => list.filter((i) => i.key !== key));
  }, []);

  /** Show one straight away, by reward_type. */
  const notifyReward = useCallback((rewardType, category) => {
    push(describeReward({ reward_type: rewardType, reward_category: category }));
  }, [push]);

  /**
   * Ask what is new for this Mini and show it. Safe to call after anything
   * that might have awarded something — it is one small GET, it de-duplicates
   * against itself, and it shows nothing when there is nothing new.
   */
  const checkRewards = useCallback(async (miniId) => {
    if (!miniId) return;
    if (inFlight.current.has(miniId)) return;     // one check at a time per Mini
    inFlight.current.add(miniId);

    try {
      const after = readMark(miniId);
      const res = await axios.get(`${API_BASE}/rewards/get-recent.php`, {
        params: after > 0
          ? { mini_id: miniId, after_id: after }
          : { mini_id: miniId },
      });

      const data = res.data;
      if (!data?.success) return;

      const latest = parseInt(data.latest_reward_id, 10) || 0;

      // First time we have looked at this Mini: remember where we are and say
      // nothing, so opening the game is not a wall of old rewards.
      if (data.seeded) {
        if (latest > 0) writeMark(miniId, latest);
        (data.rewards || []).forEach((r) => shown.current.add(r.reward_id));
        return;
      }

      let highest = after;
      (data.rewards || []).forEach((r) => {
        if (r.reward_id > highest) highest = r.reward_id;
        if (shown.current.has(r.reward_id)) return;
        shown.current.add(r.reward_id);
        push(describeReward(r));
      });

      if (latest > highest) highest = latest;
      if (highest > after) writeMark(miniId, highest);
    } catch {
      // A reward notification is not worth interrupting play for. The mark is
      // untouched, so the next check picks the same rewards up again.
    } finally {
      inFlight.current.delete(miniId);
    }
  }, [push]);

  /** Mark everything as seen without showing it — e.g. when switching Mini. */
  const seedRewards = useCallback(async (miniId) => {
    if (!miniId) return;
    try {
      const res = await axios.get(`${API_BASE}/rewards/get-recent.php`, {
        params: { mini_id: miniId, limit: 1 },
      });
      const latest = parseInt(res.data?.latest_reward_id, 10) || 0;
      if (latest > 0) writeMark(miniId, latest);
    } catch {
      /* same as above: nothing to do about it */
    }
  }, []);

  return (
    <RewardNotificationContext.Provider
      value={{ notifyReward, checkRewards, seedRewards }}
    >
      {children}
      <style>{STYLES}</style>
      <div className="mt-rn-stack" aria-label="Rewards">
        {items.map((item) => (
          <RewardCard key={item.key} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </RewardNotificationContext.Provider>
  );
};

export function useRewardNotifications() {
  const ctx = useContext(RewardNotificationContext);
  // Callable without the provider mounted, so a screen used outside the app
  // shell — or a test — does not crash on it.
  return ctx || {
    notifyReward: () => {},
    checkRewards: () => Promise.resolve(),
    seedRewards: () => Promise.resolve(),
  };
}

const STYLES = `
.mt-rn-stack {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  pointer-events: none;
  max-width: min(390px, calc(100vw - 28px));
}
.mt-rn-card {
  pointer-events: auto;
  width: min(380px, calc(100vw - 28px));
  background: #fff;
  border: 3px solid #0055BF;
  border-radius: 12px;
  overflow: hidden;
  font-family: 'Montserrat', sans-serif;
  box-shadow: 0 8px 26px rgba(0,0,0,0.28);
  animation: mt-rn-in 260ms cubic-bezier(.17,.84,.44,1) both;
}
.mt-rn-leaving { animation: mt-rn-out 240ms ease-in forwards; }

@keyframes mt-rn-in  { from { transform: translateX(115%); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes mt-rn-out { from { transform: none; opacity: 1; } to { transform: translateX(115%); opacity: 0; } }

.mt-rn-head {
  width: 100%;
  border: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 7px 34px;
  font-family: inherit;
  min-height: 34px;
}
.mt-rn-heading {
  color: #fff;
  font-weight: 900;
  font-size: 13.5px;
  line-height: 1.25;
  text-align: center;
}
.mt-rn-x {
  position: absolute;
  right: 11px;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  opacity: .85;
}
.mt-rn-body {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  background: #fff;
}
.mt-rn-icon { width: 44px; height: 44px; object-fit: contain; flex: 0 0 auto; }
.mt-rn-text { min-width: 0; flex: 1 1 auto; }
.mt-rn-title   { font-weight: 900; font-size: 12.5px; color: #1D1D1B; line-height: 1.3; }
.mt-rn-message { font-weight: 600; font-size: 11.5px; color: #555; line-height: 1.35; margin-top: 2px; }
.mt-rn-ok {
  flex: 0 0 auto;
  border: 0;
  border-radius: 6px;
  color: #fff;
  font-family: inherit;
  font-weight: 900;
  font-size: 11px;
  letter-spacing: .5px;
  padding: 8px 15px;
  min-height: 34px;
  cursor: pointer;
}
.mt-rn-ok:hover { filter: brightness(.92); }

@media (max-width: 640px) {
  .mt-rn-stack { top: 10px; right: 10px; left: 10px; max-width: none; align-items: stretch; }
  .mt-rn-card  { width: auto; }
  .mt-rn-icon  { width: 36px; height: 36px; }
}

/* A card that flies in is the whole point, but not for someone who has asked
   the system to stop moving things. */
@media (prefers-reduced-motion: reduce) {
  .mt-rn-card, .mt-rn-leaving { animation: none; }
}
`;

export default RewardNotificationProvider;
