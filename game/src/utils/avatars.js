// src/utils/avatars.js
//
// One place that knows a profile's avatar.
//
// Before this, every screen that showed an avatar fetched it for itself —
// ExpertProfile, BuilderProfile, MiniProfile, MiniManage, BuilderHub — and the
// header showed a fixed LEGO head and never changed at all. So saving a new
// avatar updated the page you saved it on and nothing else: the header, the
// My Mini(s) cards and the other tabs kept the old picture until a reload.
//
// Everything now reads through here:
//
//   const avatarUrl = useAvatar(role, id);          // in a component
//   publishAvatar(role, id, url, version);          // after a save
//
// A publish writes the cache and fires one window event, so every mounted
// consumer of that profile re-renders with the new picture at once — which is
// what makes switching to a Mini profile change the header on its own.

import axios from 'axios';

const API_BASE = 'https://mini-talks.org/minitalks-api';

export const AVATAR_EVENT = 'mt:avatarUpdated';

// url + version, keyed by role:id. A missing avatar is cached as null so we do
// not ask again on every render of a profile that has not made one yet.
const cache = new Map();
const inflight = new Map();

// Keys we have asked the server about, whatever came back. A lookup that
// failed on the network leaves nothing in `cache`, so that a later mount tries
// again — but the screen still has to stop waiting and show the placeholder,
// and this is how it knows the asking is over.
const attempted = new Set();

/** The API knows 'mini'; the app says 'child' in places. */
export function normalizeRole(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'child') return 'mini';
  return r;
}

/** Roles that have an avatar column. 'guest' and anything unknown do not. */
export function roleHasAvatar(role) {
  const r = normalizeRole(role);
  return r === 'parent' || r === 'expert' || r === 'builder' || r === 'mini';
}

export function avatarKey(role, id) {
  return `${normalizeRole(role)}:${id}`;
}

/** The saved PNG keeps its name between versions, so the version busts it. */
export function withVersion(url, version) {
  if (!url) return null;
  if (!version) return url;
  return url.includes('?') ? `${url}&v=${version}` : `${url}?v=${version}`;
}

function usable(role, id) {
  return roleHasAvatar(role) && id !== undefined && id !== null && id !== '';
}

/** What we already know, without asking. undefined means "not looked up yet". */
export function readAvatar(role, id) {
  if (!usable(role, id)) return null;
  return cache.get(avatarKey(role, id));
}

/**
 * Fetch once per profile and share the promise, so four components mounting
 * together make one request rather than four.
 */
export function fetchAvatar(role, id) {
  if (!usable(role, id)) return Promise.resolve(null);

  const key = avatarKey(role, id);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const req = axios
    .get(`${API_BASE}/avatar/get.php`, {
      params: { user_id: id, role: normalizeRole(role) },
    })
    .then((res) => {
      const data = res.data?.success ? res.data.data : null;
      const url = data?.avatar_url ? withVersion(data.avatar_url, data.version) : null;
      cache.set(key, url);
      return url;
    })
    .catch(() => {
      // Do not cache a network failure as "no avatar" — the next mount should
      // be allowed to try again.
      return null;
    })
    .finally(() => {
      inflight.delete(key);
      attempted.add(key);
    });

  inflight.set(key, req);
  return req;
}

/**
 * Called after a save. Writes the cache and tells every mounted consumer.
 * `url` and `version` are exactly what avatar/save.php returned.
 */
export function publishAvatar(role, id, url, version) {
  if (!usable(role, id)) return null;

  const key = avatarKey(role, id);
  const busted = withVersion(url, version);
  cache.set(key, busted);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AVATAR_EVENT, {
        detail: { key, role: normalizeRole(role), id, url: busted },
      })
    );
  }
  return busted;
}

/** Has this profile been looked up at all, however it went? */
export function hasAttempted(role, id) {
  if (!usable(role, id)) return true;
  return attempted.has(avatarKey(role, id));
}

/** Drop what we know, so the next read goes back to the server. */
export function forgetAvatar(role, id) {
  if (!usable(role, id)) return;
  const key = avatarKey(role, id);
  cache.delete(key);
  attempted.delete(key);
}

/** Everything, e.g. on sign-out so the next person does not see a stale face. */
export function clearAvatars() {
  cache.clear();
  inflight.clear();
  attempted.clear();
}

export default {
  AVATAR_EVENT,
  normalizeRole,
  roleHasAvatar,
  avatarKey,
  withVersion,
  readAvatar,
  fetchAvatar,
  publishAvatar,
  hasAttempted,
  forgetAvatar,
  clearAvatars,
};
