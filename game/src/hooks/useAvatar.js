// src/hooks/useAvatar.js
//
// The avatar of one profile, kept current.
//
//   const { avatarUrl, checked } = useAvatar(role, id);
//
// `checked` is false only while the first lookup is still out, which is what
// the dashboard screens use to fade the picture in instead of flashing the
// placeholder first.
//
// The value is read out of the shared cache during render rather than copied
// into state, so there is one answer and no stale frame when the profile being
// watched changes. The effect only subscribes and, if nothing is cached yet,
// starts the lookup; a re-render is asked for from the callbacks.
//
// That makes two things work on their own: a header following the active
// profile swaps picture the moment someone opens a Mini, and a save in the
// avatar editor reaches every screen showing that profile without a reload.

import { useEffect, useReducer } from 'react';
import {
  AVATAR_EVENT,
  avatarKey,
  fetchAvatar,
  hasAttempted,
  readAvatar,
  roleHasAvatar,
} from '../utils/avatars';

export function useAvatar(role, id) {
  const watching = roleHasAvatar(role) && id !== undefined && id !== null && id !== '';
  const key = watching ? avatarKey(role, id) : null;

  const [, rerender] = useReducer((n) => n + 1, 0);

  useEffect(() => {
    if (!key) return undefined;

    let cancelled = false;

    // undefined means "never looked up", which is different from a cached null
    // meaning "looked up, and this profile has no avatar".
    if (readAvatar(role, id) === undefined) {
      fetchAvatar(role, id).then(() => {
        if (!cancelled) rerender();
      });
    }

    const onUpdate = (e) => {
      if (e?.detail?.key === key) rerender();
    };

    window.addEventListener(AVATAR_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(AVATAR_EVENT, onUpdate);
    };
  }, [key, role, id]);

  const known = key ? readAvatar(role, id) : null;

  return {
    avatarUrl: known || null,
    checked: !key || known !== undefined || hasAttempted(role, id),
  };
}

export default useAvatar;
