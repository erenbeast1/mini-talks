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

## mini-devices 2.10.0

**A Fig-Talks is made with the character inside it, so the request comes first.**
The copy now says so rather than treating an unlinked Fig-Talks as a connection
problem: the locked sections read "available once your Fig-Talks has been made and
arrives", and both the card and the Personalize screen explain that the figure is
built from the design.

**Email.** Plain `wp_mail()`, the way Mini-Forum already sends its mail, so the
site's SMTP carries these too:

| When | Who | What |
|---|---|---|
| Request sent | the team | member, email, the three choices, links to the render and the request |
| Request sent | the member | confirmation, in the same words the profile shows |
| Contacted · In Preparation · Completed | the member | the new status and what it means |

Draft and Submitted raise no status mail — a draft is the member's own, and
Submitted already has its confirmation. `md_figtalks_admin_email` redirects the team
address; `md_figtalks_notify_statuses` changes which changes are worth an email.

**The status is on the member's profile**, beside Posts / Events / Kits, as soon as
a request is sent — and on the WordPress user profile as a read-only row with the
date, the render and a link to the request, for whoever answers support.

**Fixed:** the Fig-Talks flows called `renderPopup()` and `renderShelf()` directly,
which skipped the profile counters `render()` also refreshes.

## mini-devices 2.9.0

**Fig-Talks personalisation requests.** Fig-Talks is made to order, so it is not
sold from the shelf. A member personalises a figure in their profile and sends the
design to the Mini-Talks team: Personalize → Send My Request → the team contacts
you. No cart, no checkout, no prices anywhere in the copy.

The flow lives inside the Fig-Talks kit, under a **Personalize** section that is
open whether or not a Fig-Talks is connected — you personalise one before you own
it. Overview and Recordings stay visible but locked until a kit is linked, so the
card still explains what the kit does.

The design is made in Mini-Forum's avatar editor, which already offers face,
hairstyle and hair colour with a live 3D preview; its config carries the glasses
fields too, so that option slots in later without reworking this. A sent request is
frozen — designing again opens a new one rather than rewriting work the team may
already have started.

Requests are `md_fig_request` posts authored by the member, listed under **Fig-Talks
Requests** in wp-admin with the render, the member and email, the three choices and
the status (Draft → Request Submitted → Contacted → In Preparation → Completed),
filterable by status. `do_action('md_figtalks_request_submitted')` fires on submit
for a future email or Slack hook.

The section is titled **Connected Mini-Kits** now, with the brief's wording.

Also: the Fig-Talks card no longer shows "Not linked yet" beside "Status: Request
Submitted" — a kit being made for you is not a connection failure. And the
`.md-fig-acts` primary button uses a bordered box so it stands the same height as
the ghost beside it, the same mismatch fixed for slot rows in 2.5.0.

## mini-devices 2.8.1

**Stud spacing.** Copies were sized 51% and 26% — just over 100/N — so each one
overlapped its neighbour and the studs bunched at every junction. Sizing them at
exactly 100/N makes the copies abut: the position stops then land the spans edge to
edge, since `offset(i) = (100 − size) · i/(N−1)` collapses to `size · i`.

Copy counts now scale with the element so a stud is drawn at about the same size
wherever it appears — roughly 210px per three-stud copy: four on a kit card, three
on the kit popup, five on the wider editor popup.

## mini-devices 2.8.0

**The face designer's close button no longer covers the editor's own HEAD / FACE
tabs.** It floated over the canvas in 2.7.0. The popup now carries a header row of
its own — title, which kit and slot is being designed, and the × on the right —
above the editor, mirroring `.mf-avatar-popup-header` down to its measurements
(`14px 22px 10px`, `1px solid #f1f5f9`) and its 28px close button. The editor's own
chrome is untouched; this is still all in the overlay Mini-Devices owns.

**The designer wears the colour of the kit it was opened from.** Studs, frame and
close button follow: red from Fig-Talks, blue from Brick-Talks, yellow from
Design-Talks, instead of always red.

**Shelf cards show the product renders.** Passed from PHP and filterable through
`md_kit_icons`, keyed by kit code. Any aspect works, and a missing or blocked image
falls back to the built-in SVG rather than leaving an empty tile.

## mini-devices 2.7.0

**The face designer is a LEGO popup like every other one.** It used to be a bare
8px-bordered box floating on a dim backdrop. Now it is the site's standard shell —
stud strip → coloured brick → white inner — with the round close button the auth and
kit popups use. Red, matching Mini-Forum's own avatar editor popup, which is this
same editor. The 2.6.1 "Back" pill is gone; the × replaces it, and Escape still
works.

Studs use the full-width recipe (four whole copies at 26%), so neither edge cuts a
stud. The shell caps at the viewport and clears the WordPress admin bar at both
breakpoints, checked at 1200×820 and 390×780.

## mini-devices 2.6.1

**A way out of the face designer.** The editor offers only Save, Reset and Random,
so opening it was a one-way door — the only exit was saving. A **Back** button now
sits top right of the editor overlay, and Escape closes it too. The overlay is this
plugin's, not Mini-Forum's, so nothing in the editor bundle changed; it already
exposed an `onClose` callback that had no button behind it.

**Fixed while testing it:** one Escape press closed the face designer *and* the kit
popup underneath, because both listen on `document`. The kit popup now stands down
while a face designer is open.

## mini-devices 2.6.0

**The screen kit is Brick-Talks, not Display-Talks.** Renamed everywhere it is
shown: the shelf card, the kit popup header, connection messages. `kits="brick-talks"`
is the shortcode name (`brick`, `bricktalks` and the code `B` also work);
`display-talks` still resolves so any page already published keeps working.

The sample Brick-Talks kit no longer carries a nickname ("Classroom screen"). On a
public preview a visitor should see the product name, not someone's rename — the
rename feature is still demonstrated by the Kit name field under Overview.

## mini-devices 2.5.1

**Studs use the forum's own recipe, not an approximation of it.** 2.5.0 placed ten
copies at percentage stops — whole studs, but far too many and too small next to the
`.mf-action-card` bricks on the forum home page. Mini-Forum has exactly two stud
recipes and both place whole copies:

| Where | Copies | Size |
|---|---|---|
| `.mf-action-card` (half-width) and `.mf-popup-studs` | 2 | 51% |
| `.mf-guidelines-studs` (full width) | 4 | 26% |

Kit cards are full width, so they use the second: four copies at 26%, positioned
`left / 33% / 66% / right`. Each copy is drawn whole, so both edges land on a
complete stud, and each lands near the ~220px the forum draws them at. The kit popup
uses the two-copy recipe, matching the auth popup it sits beside.

## mini-devices 2.5.0

**`[mini_kits_demo]` takes kit names.** `kits="display-talks"` instead of
`kits="B"`; `fig-talks`, `display-talks` and `design-talks` all work, in any case,
with or without the hyphen. The old codes still work.

**Studs never get cut.** `repeat-x` always slices a stud wherever the strip ends,
whichever edge it starts from. The forum's own strips place a fixed number of whole
PNG copies at percentage stops instead (`.mf-guidelines-studs` uses 4 at 26%), so
both edges land on a complete stud. Kit cards now place ten, keeping each stud about
the size it is in the popup. The popup keeps `repeat-x`, which reads correctly there.

**Brick frame: thinner sides and top, heavier bottom.** `9px 5px 13px` instead of
`14px 8px 8px`.

**"Send face" no longer stands taller than "Edit face".** The primary button's 4px
hard shadow sits outside its box while the ghost's 5px bottom border sits inside, so
the two never matched. Small primaries use the same bordered box now — every button
in a slot row measures 36px.

**Face crop nudged down** (`center 30%` → `36%`) so a little of the body shows under
the face.

## mini-devices 2.4.2

**Kit cards are real bricks now, built the way the forum already solved it.**
`.mfe-detail-*` (the event detail popup) does two things this plugin was not:
`background-position: center bottom` on the stud strip, so a centred repeat splits
the partial stud evenly across both edges instead of leaving one cut stud on the
right; and a modal whose top padding is thicker than its sides, which is where the
coloured band under the studs comes from.

A kit card is now studs → coloured brick (14px top padding) → white inner, the same
shell. That restores the rounded outer corners lost in 2.4.0, and replaces the
gradient base band, which was a workaround for a problem the forum had already
fixed properly.

**Face previews are bigger and crop to the head.** 2.4.1 fitted the whole figure
into the thumbnail, which left it too small to recognise. The thumbnail is 78×78 and
uses `object-fit: cover` with `object-position: center 30%`, trimming top and bottom
so the face fills the tile.

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
