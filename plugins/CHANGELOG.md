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

## mini-devices 2.4.1

Two things 2.4.0 got wrong.

**Studs vanished.** 2.4.0 painted the brick colour behind the whole stud strip to
stop the studs floating. But `yeni-3-*.png` is studs *on transparency* in that same
colour, so filling the strip with it erased their silhouette — a flat coloured bar.
The strip now layers properly: the stud image sits clear at the top and the colour
is a 9px base band beneath it, so the studs read against the page and still meet the
card.

**Face previews were cut off below the hair.** The `object-fit: contain` in 2.4.0
never took effect: inside a `display:grid; place-items:center` thumbnail the image
kept its intrinsic aspect and rendered 70×112 in a 74×74 box, so `overflow:hidden`
cropped it. Measured, not guessed. The thumbnail is portrait now (64×86) and the
image is bounded by `max-width`/`max-height` instead of `height:100%`, which does not
depend on how the parent lays its children out. The whole avatar shows — hair, face,
torso — at 45×74.

## mini-devices 2.4.0

**Display-Talks: Recordings and Faces merged into one Slots section.** A slot holds
one recording *and* one face — describing them in two tabs meant matching slot
numbers by eye. Each slot is now a single card: its face, its recording name and
duration, and all three actions side by side. Fig-Talks keeps Recordings, and
Design-Talks keeps Scenes; neither has per-slot faces.

That also retires the sideways face rail, which is the real fix for two bugs it had:
the right arrow went disabled while the last tile was still clipped (`scroll-snap-type:
mandatory` with `scroll-snap-align: start` cannot settle on the true end), and the
arrows overlapped the tiles they were meant to reveal. Stacked cards need no rail.

**Fixed: face previews were cropped.** The thumbnail used `object-fit: cover` on a
preview that is a head on empty space, so the chin was cut and the head sat low.
It uses `contain` now, and the slot number moved out of the image instead of
overlapping it.

**Fixed: studs floated off the kit cards.** The stud PNG is transparent behind the
studs — on the forum it always sits on a coloured brick, but here it sat on a white
card, so the studs read as loose blocks. The strip now carries the kit colour behind
the PNG and meets the card flush, with the top rounding on the strip.

## mini-devices 2.3.0

**The public preview loads the real avatar editor.** 2.2.0 shipped a preset face
picker as a stand-in, because Mini-Forum enqueues the editor bundle only for
signed-in users and a logged-out visitor clicking "Design face" would get nothing.
That was the wrong fix — it put a second, different personalisation flow in front of
visitors. The plugin now enqueues Mini-Forum's editor itself on a preview page and
the preset picker is gone; "Design face" opens the same screen everywhere.

Everything the editor localises works logged out (`get_config(0)` returns null,
`mf_get_user_role(0)` falls back to `Family`), and its save request is already
intercepted client-side by `MDFaces`, so a visitor's changes never leave the
browser. The preview does depend on the GLB models allowing cross-origin reads —
the same CORS setup members rely on.

If the editor is genuinely missing (Mini-Forum inactive), the Faces section says so
instead of offering a different flow.

## mini-devices 2.2.0

**Fixed: popups ran off the page.** The overlay only capped its own height, so a
long popup (Design-Talks scenes) pushed its header and footer past the viewport and
sat under the WordPress admin bar. The shell now uses the same flex pattern as the
avatar editor popup — the wrapper caps at the viewport, only the section body
scrolls, and the admin bar is accounted for at both breakpoints.

**Fixed: a stray horizontal scrollbar in every popup.** Setting `overflow-y:auto`
alone makes the other axis compute to `auto` too, so a pixel of overflow produced a
horizontal bar. `overflow-x` is now pinned off.

**Fixed: dates rendered in the browser's language** ("16 Ağu 2026") inside an
English interface. They are formatted as `en-GB` now, matching the base language
TranslatePress translates from.

**Studs.** Kit cards and popups stretched two copies of the stud PNG to half the
width each, which made a handful of enormous studs. They tile at their natural
aspect now (`repeat-x`), the same as `.mf-studs` and the avatar editor popup — many
small studs. Brick borders are heavier to match.

**Faces are a rail, not a grid.** Slots scroll sideways with snap points, prev/next
buttons for pointer users and swipe on touch, instead of wrapping into rows.

**Public preview shortcode.** `[mini_kits_demo]` renders the shelf as an always-on
preview for product and onboarding pages — sample kits, no profile access, works
logged out. Takes `kits`, `title` and `intro`.

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
