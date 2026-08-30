# Mini-Talks plugins — changelog

## mini-forum 3.06.00

**Profile tabs are real.** `Mini-Forum`, `Mini-Kits` and `App & Studio` were dead
`<button>`s with no handler. They now switch panels (`assets/js/mini-forum-profile.js`),
carry an active state, and accept a `#kits` URL hash for deep links.

**Settings works.** `<a href="#">Settings</a>` became a popup built on the same LEGO
shell as the auth popup — stud strip, red brick frame, white inner. It holds password
change: current password required, 8-character minimum, confirm field, strength meter,
and a link to WordPress's own email reset for people who cannot recall the current one.
Backed by a new `mf_change_password` AJAX action that re-issues the auth cookie, since
`wp_set_password()` otherwise signs the user straight out.

**A Mini-Kits panel other plugins can fill.** The kits panel fires
`do_action('mf_profile_kits_panel')`, so Mini-Devices no longer has to inject itself
into the profile's rendered HTML.

**Fixed:** the password eye toggle showed both the open and struck-through icons at
once — `.mf-pwd-toggle svg{display:block!important}` outranked the inline `display:none`
the JS writes. Affected the sign-in and sign-up popups too.

**Fixed:** the plugin header advertised `Version: 1.0.0` while `MF_VERSION` was
`3.05.45`, so WordPress showed the wrong version and update checks compared the wrong
number.

## mini-devices 2.1.0

**Admin demo mode.** Users with `manage_options` get an "Admin preview" bar above
the shelf. It loads three sample kits, all reading as connected, so every screen —
slot naming, face design and transfer, scene trees, card folders, downloads — can be
walked through without hardware.

The mode is front-end only: `api()` is short-circuited to mutate the samples in
memory, so nothing reaches `usermeta`. Downloads synthesise a short chirp locally so
the WAV that lands actually plays. "Connect a kit" is disabled while it is on, and a
caution stripe plus a per-popup banner keep sample data from reading as real.

**Also in this release**

- Long popups (Design-Talks scenes) scrolled the header, section nav and footer off
  the screen. The body scrolls on its own now, capped at 52vh.
- Slot rows put their buttons in a right-aligned cluster with Download always last,
  so rows with and without a Demo button line up. Demo buttons are outlined rather
  than bare text, which read as a label before.

## mini-devices 2.0.0

**Lives under Mini-Kits.** The block used to append itself to the profile through a
`do_shortcode_tag` filter and add its own purple "Connected Devices" tab. It now hooks
`mf_profile_kits_panel` and renders inside the forum's Mini-Kits panel. The old
injection is kept only as a fallback for Mini-Forum < 3.06 and is skipped once the
panel hook has fired.

**A shelf, not a list.** All three kits are always shown — Fig-Talks (red),
Display-Talks (blue), Design-Talks (yellow) — each as a LEGO card with a stud strip,
its own artwork, a status pill and its recording facts. Three states:

| State | Meaning | What you can do |
|---|---|---|
| Connected | plugged in over USB | everything |
| Not connected | synced before | read the last sync; renaming, downloads and face transfer are disabled with a reason |
| Not linked yet | not on this profile | dashed card, opening is blocked |

**Each kit has its own popup.** Opening a kit gives a colour-matched LEGO popup with
its own section nav: Overview (stats, slot capacity, kit name), Recordings (numbered
slots, naming, per-slot WAV download), Faces (Display-Talks — design and send per
slot), Scenes (Design-Talks — scene and RFID card folders, level-by-level rows).

**English throughout.** The interface was entirely Turkish inside an English forum.
Every user-facing string is now English so TranslatePress can translate from one base.

**Design language.** Montserrat, LEGO brick colours and stud strips taken from
Mini-Forum's `:root`, thick bottom borders, brick-press button feedback — replacing
Nunito and the amber `--color-accent` palette that matched nothing on the site.

**Fixed:** assets were cache-busted with a constant, so an in-place update kept
serving stale CSS/JS. They use `filemtime()` now, like Mini-Forum.
