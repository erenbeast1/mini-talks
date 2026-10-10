// src/utils/activeProfile.js
//
// Which profile a header is showing, and therefore whose avatar belongs on its
// pill. The rule lives here because the app has more than one header — the
// shared components/common/Header and the home page's own — and two copies of
// this would drift apart, which is how one page ends up showing a different
// face from every other.
//
// The ids are not interchangeable: parent, expert and builder avatars are
// keyed by users.user_id, a Mini's by mini_profiles.mini_id. Six of the Minis
// in the live database have no user_id at all, so getting this wrong on a Mini
// means no picture rather than the wrong one.

/** The Mini currently being looked after, if any. */
export function readSelectedMini() {
  try {
    const raw = sessionStorage.getItem('selectedMini');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return !parsed.is_parent && parsed.mini_id ? parsed : null;
  } catch {
    // Unparseable or blocked storage: no Mini is selected, which is the safe
    // reading — the pill falls back to the signed-in account.
    return null;
  }
}

/**
 * The { role, id } to ask the avatar cache for.
 *
 * Pass the selected Mini to follow it — that is what makes the pill change
 * when someone opens a Mini. Pass null to stay on the signed-in account, for a
 * header whose label does not follow the Mini either.
 */
export function avatarTarget(user, selectedMini) {
  if (selectedMini && selectedMini.mini_id) {
    return { role: 'mini', id: selectedMini.mini_id };
  }

  const role = user?.role || '';
  if (role === 'child' || role === 'mini') {
    return { role: 'mini', id: user?.profile?.mini_id || user?.mini_id };
  }
  return { role, id: user?.user_id };
}

export default { readSelectedMini, avatarTarget };
