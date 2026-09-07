# Mini-Talks plugins — changelog

## mini-forum 3.19.00

**A Mini's detail moved into the popup, and it is the game's real data.**

The card keeps the headline — bricks, medals, cups, streak — and a **Details**
button opens the site's own popup with the rest. A parent's card carries one per
Mini. Everything a card used to stack inline is in there, so a family of three
fits on a screen again.

What is in it, all from tables the game writes:

- **Scene by scene, level by level.** `mini_scene_levels` unlocks Sound, Word,
  Sentence and Dialogue separately within each scene, so each scene shows which
  of its four are open, its minutes, its recordings and when it was last played.
  A total would have thrown away the only thing that says where a Mini is.
- **Streak as `streak_summary` keeps it**: current, longest, total active days,
  last active — not just the running count.
- **Where the bricks came from**, counted by `mini_rewards.reward_type` and
  turned into words.
- The characters built for each scene, and the experts.

**Experts now show their own picture** when the game has one (`avatars` by
`expert_id`), falling back to the initial.

### Fixed

**The studs floated, attached to nothing.** The strip art is studs with a thin
lip; it only reads as the top of a brick when there is a brick under it. The
card is now a coloured brick with a white card inside — the same shape as the
popup and the Mini-Kits cards — and the studs sit on it.

**"Connected." after a refresh or a disconnect.** The line is now dropped by
every action that redraws the card, on top of being a one-shot flash server-side.

## mini-forum 3.17.01

**A Mini's picture comes from the avatar editor, and nowhere else.** 3.17.00
fell back to `customized_minis` when a Mini had no saved avatar — but those are
the characters a Mini builds *for a scene*, not their profile picture. The game
never treats them as one either: `MiniProfile` and `MiniManage` both read
`avatar/get.php` alone and fall back to a generic icon. The forum now reads the
same single source, and a Mini who has not made a picture yet gets their
initial rather than a character from a scene.

## mini-forum 3.17.00

**Real game data on the card, and the stud strip done properly.**

The **motivation message a parent actually set** replaces the default tagline
every Mini is born with — read from `motivation_settings`, a typed message
beating a chosen preset, the preset resolved through `motivation_presets` the
same way the game resolves it. With none set, the tagline comes back.

**Scenes**, because that is what the game records: which scenes have been
played, by name, out of how many exist, with the minutes and the recordings.
Each of a parent's Minis carries the same line in miniature.

**Experts**: the ones a parent has approved for a Mini, by name and where they
work, gathered once across the whole family. Never a pending or rejected
request, and never their address. An expert's own account shows how many Minis
they are approved for — a count, not whose children.

**A Mini's figure now actually appears.** The card was full of initials because
it looked only at the avatar editor's saved figure. Minis build a figure on a
scene long before they open that editor, so `customized_minis` is read as the
fallback — the same face the game itself shows them.

### Fixed

**The stud strip was a clipped tile.** `.mf-studs` repeats the strip art along
the card, so it was cut mid-stud wherever the card happened to end. It now uses
four placed copies at a quarter width each, the way Mini-Kits does it.

**"Connected." stayed above a card offering to connect.** The previous fix took
`?mf_game=ok` out of the address bar, but its regex missed a URL with a `#`
fragment — and this one always has `#studio`. The result of opening a link is no
longer in the address at all: it is a one-shot flash, read and thrown away in
the same breath, so it cannot survive a reload or a disconnect.

**Round figures.** The avatars on this site are circles; the game figure and the
Minis' faces were squares.

**Montserrat everywhere in the card**, including the headings and paragraphs the
theme was styling with its own font.

The e-mail button loses its studs — a plain green brick, like the game's own
CHANGE PASSWORD button.

## mini-forum 3.16.00

**Connect Profile, redrawn in the site's own language.** The generic card and
the generic popup are gone.

The popup is now the site's LEGO shell — the same overlay, stud strip, red brick
and white card as Sign in and Settings, opened and closed the same way, with the
same `.mf-btn` buttons. It carries three steps: asking for the address,
confirming the mail is sent, and **confirming a disconnect**, which used to be a
browser `confirm()` box.

The card wears a stud strip and a coloured bottom edge like every other card on
the profile, and leads with the **Mini-Talks mark** instead of a stock game
controller (the mark is a field on the Mini-Talks Game page, so a rebrand is one
value). The counters became brick tiles — yellow bricks, blue medals, red cups,
green streak — instead of four identical grey pills, and the game role wears the
forum's own `.mf-role-badge`.

**A parent now sees their Minis**: each one's figure, name, age band, tagline
and its own four tiles, with the parent's own headline tiles summing what the
whole family has built. The game side reads them the way the game's own
dashboard does — both by `parent_id` and by `parent_email` — approved ones only,
and fetches every figure in one query rather than one per Mini. A Mini with no
figure yet gets their initial on a yellow brick, not a broken image.

**The confirmation e-mail is the studded LEGO mail**, built like the game's own
verification and password-reset mails: stud border, red brick, white card, the
red rule under the title, the copy-this-link box, the LEGO footer — and a green
studded brick for the button, drawn in table HTML because there is no button
image for this one. The whole mail is a single editable area on the Design page.

### Fixed

**"3 hours ago" the moment you connected.** The card timed itself with
`mf_time_ago()`, which compares a *local* time string against `current_time()`;
handed a UTC timestamp it was out by the site's whole offset. Freshness now
comes from a timestamp helper of its own.

**"Connected." stayed after disconnecting.** That line answers the link that was
just opened, and it lived outside the card, so replacing the card left it on
screen — and `?mf_game=ok` in the address brought it back on every reload. The
query is taken out of the address bar on load, and the line is dropped whenever
the card is redrawn.

**A 240-pixel hole on phones.** Stacked, a flex-basis is a height: the copy
block kept its 240px basis and pushed the tiles down the screen.

Opening the App & Studio tab now refreshes the numbers in the background, and a
stored reading goes stale after five minutes instead of fifteen.

## mini-forum 3.15.02

**"Save and test" only ever said "Saved."** The test ran only when both boxes
were already filled in, and said nothing at all when they were not — so leaving
one empty looked exactly like a successful save. The page now has a **Status**
line that always says where things stand: which box is still empty, or that the
game answered and accepted the key, or what went wrong and the most likely
cause for that particular failure. It re-tests on every load, so re-checking no
longer means saving again.

Under it, **what the game actually sent back** — the URL called, the HTTP
status, the cURL error if there was one, and the first 600 characters of the
body. A 404 page, a redirect to a login, or a PHP warning ahead of the JSON are
all invisible behind "the game sent back something the forum could not read";
now they are on the screen.

The shared-key box reports what is stored — its length and last six characters —
so a paste that dropped or gained something is visible without retyping it. And
the address box is no longer `type="url"`: that let the browser silently refuse
to submit the form, which is the one failure with no message at all.

## mini-forum 3.15.01

**"Coming soon" told the person who installed it nothing.** Before the game
address and the shared key are filled in, `configured()` is false and App &
Studio falls back to its empty state — right for a member, useless for an
administrator, who had no way to know from the profile that the feature exists
or where to set it up. Administrators now see a setup card there, linking
straight to Mini-Talks Game. Members still see the plain empty state.

## mini-forum 3.15.00

**Connect Profile — the forum profile meets the game account.** Profile →
*App & Studio* gains a card: a member types the e-mail address they sign in to
the Mini-Talks game with, the forum mails a confirmation link to that address,
and opening it connects the two. What they have earned in the game — bricks,
medals, cups, their streak — then shows on their forum profile, and *Use my game
figure* copies their game avatar across as their forum one.

It is the account-verification flow the game already uses, pointed at the forum
instead of at a login. **No game password is ever typed into WordPress**, and
none crosses between the two systems: the proof is that they can read the inbox
the game knows them by.

The game side is four new files, in the plugin's `game-api/forum/` folder, that
drop in as `minitalks-api/forum/`. No screen, no edit to an existing endpoint, no
column on a table the game already writes; the one table they own is created on
first use. They answer only a POST carrying the shared key, in a header, so a
browser cannot reach them and the key stays out of access logs. `link-request.php`
answers the same "not found" for an unknown address, a deactivated account and an
unverified one, so the forum cannot be used to test who plays. Only the SHA-256 of
a token is stored, and confirming clears it, so a link works exactly once. What
comes back is a name, a role, the counters the game already puts on its own
dashboard, and the avatar — never a password hash, never anybody else's address.

Both halves are set up from one small page, **Mini-Talks Game**, which tests the
connection on save and lists who has connected. With nothing configured the
feature is invisible: App & Studio reads exactly as it did before, and the
script is never even requested.

Every sentence a member reads, and the confirmation e-mail itself, is on the
Design page under *Game account* — 20 new areas, so the wording and the markup
are editable like everything else, and translated by the same plugin.

### Fixed along the way

**The Design page mislabelled and mis-tracked every file-backed area.** A
manifest entry whose default lives in `design/*.html` holds the marker
`@name`; only `definition()` resolved it, while the admin page and the save
compared an area's value against the unresolved marker. So every lifted section
was labelled *One line* instead of *Whole section* — the inconsistent
granularity in the review — saving one without touching it stored an override
that froze it against future plugin updates, and every saved section grew a
permanent, false "the plugin's version of this changed in an update" warning.
One resolver, used everywhere a manifest entry is read, fixes all three.

**The avatar save dropped half of what the editor sends.** `hairCategory`,
`faceSelections`, `activeEyeSlot`, `activeMouthSlot` and `activeFaceCategory`
were not on the keep list, so reopening the editor lost the hair category and
every face-slot choice. The list now matches the editor's own save payload.

## mini-devices 3.4.0

**Mini-Kits joins the Design page.** It does not open a second one: 26 areas are
registered onto Mini-Forum's through `mf_design_blocks` — the section heading and
its paragraph, the privacy line, each kit's name and tagline, the sentence every
status carries, and the copy inside a kit (Explore, the three request intros,
Connect, Figs & Slots, the note field). A Mini-Kits stylesheet joins the CSS tab and
loads on the profile and on any page carrying a preview shortcode.

Renaming a kit on that page renames it everywhere it appears — shelf card, popup
heading, admin list, the team's mail — because `MD_Kits::all()` reads it. The status
sentences are read by `MD_Requests::status_notes()`, so rewording *Preparing* changes
what the member sees on the card, on the kit screen and in the email they receive.

The screens the script draws get their copy from `MD.text`, resolved server-side.
Every string keeps its literal as a fallback, so with Mini-Forum absent or older
nothing is editable and everything still reads exactly as before.

## mini-forum 3.14.00

Everything here comes from watching someone try to use the page.

**Every area shows itself.** "Reading markup and picturing the result" is not a
skill anyone should need to change their own site's words. Each area now opens with
a live view of itself, rendered in the site's own stylesheets, with `{{tokens}}`
drawn as labelled chips so it is clear where the real content lands.

**Every group says which screen it is,** and links straight to it. Nobody should
have to guess "probably the Mini-Kits screen" from an id.

**Every area has a CSS box.** Some had one and some did not — the box was only on
the HTML areas — which read as arbitrary. A heading is worth styling too.

**Whole section / Small block / One line.** Some areas are a page's whole block and
some are a single sentence, and there was no way to tell which before opening one.
Each now carries a badge, and a whole section opens in a taller box.

**Somewhere to put your own blocks.** Join Us had no hero and no footer, so there
was nowhere to add one. Every screen — Forum, Profile, Events, Join Us — now has an
empty area above and below it. They render nothing until something is put in them,
and they take HTML and CSS like any other area.

## mini-forum 3.13.00

**48 areas — the screens are covered.** Added here: the forum's four
"what would you like to share" cards, its filter and search row, both guidelines
boxes, the sub-heading and the notice line; the Host an Event form; the events
calendar, the section headings on the hub, the month headings and both month bars,
the three call-to-action bricks, and a header for every events sub-page including
one kind of event.

**One design wherever the same thing appears.** The month heading is a single area
used by Updates and Special Days, with a colour token — as the event card already
was for the hub and the type pages.

**What is left in the templates is scaffolding, on purpose.** The page-width
wrapper, the popup shell, the slider's viewport and track, the tab panels: invisible
containers the CSS and the scripts hold on to. Turning those into editable HTML
would offer nothing to design and plenty to break — the styling that shapes them is
on the Custom CSS tab, where changing them is safe.

## mini-forum 3.12.00

**The rest of the screens, as editable HTML.** 31 areas now, across nine groups.
New in this release: both popups (sign up step by step, sign in, Settings), the
write-a-post form, the post as it appears in a list, the post on its own page, a
reply — and the four cards that make up the events pages: an event with a photo, an
event without one, a community update, a special day.

**A card is one design, used everywhere it appears.** The events hub and the
event-type pages drew the same card from two copies of the same markup, which had to
be kept in step by hand. They render the same area now, so changing how an event
looks is one edit. A reply and a reply-to-a-reply likewise share one design,
rendered recursively.

**Defaults moved out of the PHP into `design/*.html`.** A screen's markup as a PHP
string literal is unreadable and a stray quote breaks the file; as a file it can be
read, diffed and edited like the template it came from. 23 of them.

**Inline icons are allowed, as a narrow subset** — shapes and their geometry, no
`<use>`, no href of any kind, no `<script>`, no `<foreignObject>`. Without it every
icon in the popups and the event cards would have been stripped the first time
someone saved.

**Every handler that lived on markup now binds by attribute.** Saving strips
`onclick`, so sign in, sign up, role choice, password toggles, Settings, Share,
emoji reactions and Reply would each have stopped working the moment their area was
edited. They bind on `data-mf-action` through one delegated listener per script, and
every area lists the attributes it must keep.

**Fixed:** `forum-create.php` was missing a closing `</div>`, leaving the page
container open. It has been closed.

## mini-forum 3.11.00

**Every change is kept, with the reason for it.** Each save takes a *Why this
change* line and records one entry: who, when, why, which areas moved, and what
each said before and after. A **History & backup** tab lists the last 60, newest
first. **Put back** restores the areas one entry touched to what they said right
after it — and is recorded as a change of its own, so nothing disappears quietly.
An entry only ever touches the areas it changed; the rest of the design is left
alone.

**A backup you can hold.** The same tab exports everything on the page — every
area's HTML, the CSS beside each one, the five area stylesheets — as one block of
text to copy somewhere safe or carry to another site. Pasting one back reads only
the areas this version knows and ignores the rest rather than half-applying it; a
paste that is not a backup is refused with a reason.

## mini-forum 3.10.00

**Join Us is editable end to end.** All three steps — the four area cards, the
account fields, the consent box and the Join button — are now areas of plain HTML
rather than three headings inside fixed markup. It is the page most likely to be
redesigned, and it was the least editable.

**The sanitiser stopped being a guess.** `wp_kses_post()` decides whether form
elements survive differently across WordPress versions, and a sign-up form whose
`<input>` tags were silently dropped is a form that collects nothing. The allowed
list is now stated outright — every tag these pages use, plus `class`, `id`,
`style`, `data-*` and the ARIA attributes — with scripts, iframes and `on*`
handlers permanently off it.

**CSS sits beside the HTML it belongs to.** Rewriting markup nearly always needs a
rule or two, and sending someone to a different tab to write them is how a
half-styled block reaches the site. Each HTML area has its own CSS box under it,
printed after the area stylesheets.

**And the rules that already style it are shown there.** Handing over the HTML
without the CSS that dresses it is half a job: nobody can rewrite a block without
knowing what `.mf-hero-desc` does to it. The plugin's own rules for the classes in
that markup are collected from its stylesheets and shown read-only above the box —
copy one down, change it there. Read-only on purpose: copying a whole stylesheet
into the database would freeze it against every future update.

**The Join Us buttons bind on `data-mf-action`** (`ju-role`, `ju-continue`,
`ju-submit`) like the others, so picking an area, continuing and joining keep
working however the markup is rearranged.

## mini-forum 3.09.01

**Design gets its own place in the menu.** It sat under *Mini-Events*, which is
where nobody would look for it: the page edits the forum, the profile, Join Us and
Mini-Kits every bit as much as it edits events. It is now a top-level
**Mini-Talks Design** item with a paintbrush icon, directly under Mini-Events —
and it no longer depends on that menu existing to be reachable.

## mini-forum 3.09.00

**A guide on the Design page,** open the first time and collapsible after that: what
the page changes and what it cannot, the three tabs, what `{{tokens}}` are, what the
"keep these" list means, why updating the plugin cannot overwrite your work, and four
habits for working safely.

`mf_design_css_areas_list` lets another plugin add its own stylesheet area, and
`mf_block_exists()` lets one check an id before relying on it — both are what
Mini-Devices uses to put Mini-Kits on this page.

## mini-forum 3.08.01

**An area now says what the code needs from it.** Editing HTML cannot break the
plugin's logic, but it can quietly switch off a behaviour attached to the markup:
delete the Settings button and the Settings popup has nothing to open it; delete
`.mf-stats-row` and Mini-Devices has nowhere to put the Mini-Kit request count.
Each area lists those hooks under its box, and if the saved HTML no longer contains
one, the page says which behaviour stopped and that Reset brings it back. It warns
rather than refuses — removing a button on purpose is a fair thing to want.

**The avatar editor gained an attribute hook** to match the others:
`data-mf-action="avatar"` calls `MFAvatar.open()` directly, so a rewritten profile
header can open the editor without keeping the original classes.

## mini-forum 3.08.00

**Whole areas, edited as HTML.** 3.07.00 made the words editable; this makes the
markup editable. A screen's chrome is now one area rather than a handful of strings:
the forum's signed-out hero, its Forum Access block with both cards, the signed-in
hero, the profile header, the events hero, the empty sub-page card, the Host an Event
hero. Each opens in wp-admin as plain HTML — every tag, class and inline style — and
what is saved is what renders.

**Dynamic content survives a rewrite,** because an area declares tokens and the
template hands their values in. The profile header takes `{{avatar}}`, `{{nickname}}`,
`{{badges}}`, `{{stats}}` and the two icons; the heroes take `{{logo}}`; the empty
sub-page takes `{{events_url}}`. Put a token where you like, or leave it out. Token
values are inserted after sanitising, so markup the plugin built (a member's role
badges, an inline SVG) passes through whole while anything typed into the box is
still filtered.

**Buttons keep working when their HTML is rewritten.** `wp_kses_post` strips
`onclick`, which would have quietly broken Sign In and Settings the moment someone
edited those areas. They bind on `data-mf-action` now — `login`, `register`,
`settings` — through one delegated listener, so the handler survives any rearranging
of the markup.

**An update cannot overwrite someone's work.** Overrides live in the options table,
never in the plugin's files, and rendering always prefers them. Each override also
records a hash of the default it was written against: when an update changes that
default, the Design page says so beside that area, shows the plugin's new version,
and leaves the choice to a human. Nothing is applied automatically.

**Whole templates** get a third tab, listing all thirteen screens and where each is
currently loaded from. `mf_template()` now searches
`wp-content/mini-forum-templates/<name>.php` before the theme's `mini-forum/` folder
— outside the plugin, so an update cannot touch it, and outside the theme, so
switching themes does not lose it.

## mini-forum 3.07.00

**A Design page in wp-admin** (Mini-Events → Design), in three parts, in order of
how far each one goes.

**Text & HTML.** Every fixed piece of copy on the front end is now a named block:
headings, intros, empty states, card bodies, button labels — 30 of them across the
forum (signed in and out), the profile, the events hub and its empty sub-page, Host
an Event, and Join Us. Each is editable in place; the ones marked HTML take markup,
so a paragraph can become two, a word can be wrapped in a `<span>`, a link can be
added. Templates print them with `mf_block('id')`. Saving is `wp_kses_post()`, so
scripts and iframes are stripped. Every block has a Reset, and writing the default
back is not recorded as a customisation — so that line keeps following the plugin
rather than freezing at today's wording.

**Custom CSS,** one stylesheet per area — Global, Forum, Events, Profile, Join Us —
printed after the plugin's own so a rule here wins, and only on the pages that area
belongs to. Angle brackets are stripped, which CSS never needs and which is the only
way stored CSS could escape its `<style>` element.

**Template overrides.** Every screen now loads through `mf_template()`, which looks
in the active theme first: drop `mini-forum/events-home.php` into the theme and it
replaces the plugin's copy, with every variable the plugin prepared still in scope.
That is the way to redesign a whole screen, and it survives plugin updates.

Deliberately not built: a box that stores PHP and runs it. That turns every admin
account into a way to execute code on the server, and it breaks on the next update.
Copy and styling live in the database; logic stays in files, where a theme can
replace it properly.

`mf_design_blocks` lets another plugin add its own screens to the same page, so the
Mini-Kits panel can join it rather than starting a second design screen.

## mini-forum 3.06.01

**Fixed:** with a fourth box in it, the profile stats row broke every label
across two lines — `Posts: / 1`, `Fig-Talks: / Submitted`. `.mf-stats-row` is
`display:flex` with no `flex-wrap` above 900px, so the boxes shrank until their
text wrapped instead. Labels now stay on one line and whole boxes wrap to a
second row when the header column is too narrow.

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

## mini-devices 3.3.0

**`[fig_designer_demo]` — the personalization screen on its own.** The existing
preview puts the whole shelf on a page and asks a visitor to find their way into a
kit; sometimes the designer *is* the pitch. This shortcode is one card and one
button: press it and the same editor a member uses opens over the page, in the
kit's own frame. `auto="1"` opens it on load. After a save the block shows the
render beside the choices it was built from — hair, face, eye colour, brows — read
out of the editor's config by the same reader the request uses.

Nothing is saved: `MDFaces` already keeps the editor's save request in the browser,
and this block holds the result in memory only. It works logged out — the avatar
bundle is enqueued for the page, as it is for the shelf preview.

## mini-devices 3.2.2

**Fixed: a second request looked as though it had deleted the first.** Nothing was
ever deleted — both requests were in the database — but the Request screen read only
the newest one, so the earlier request vanished from view while its scenes stayed
marked in Explore. Two views of the same thing, disagreeing. The state now carries
every request for a kit that takes several (`MD_Requests::all_requests()`), and the
Request screen lists them newest first, each with its own scenes, note, status and
progress rail.

**Requested no longer looks like selected.** A scene already with the team was drawn
in the same green as a scene ticked for sending, so it read as "still selected". It
is now quiet — grey card, muted title, a green tick and *Requested · Submitted* —
plainly settled rather than plainly chosen.

## mini-devices 3.2.1

**Fixed: a second Mini-Designs request was refused.** 3.2.0 added the "Another
request" screen, but the server still allowed exactly one request per kit, so
sending returned *That request has already been sent.* How many requests a kit takes
is now a property of the kit: Mini-Designs is a catalogue and takes as many as the
member likes, each its own batch, while the three devices take one at a time —
someone owns one Brick-Talks, so a second request while the first is in flight is a
mistake rather than an intention. Scenes already requested are dropped from a new
batch, so the same scene is never asked for twice.

**Fixed: the refusal appeared behind the popup.** Every message went to the shelf's
status line, which sits under the overlay — a refusal nobody could see, at the top
of the page, away from the button that caused it. Messages raised while a kit is open
now render inside that kit's popup, right under its buttons.

## mini-devices 3.2.0

**Brick-Talks' Manage is one list, not three.** Figs, Slots and Recordings were the
same five objects shown three times over — a slot holds one Fig and one recording,
so you had to match slot numbers by eye to see what belonged with what. Manage is
now **Figs & Slots** and **Device Details**, and each slot card carries the Fig, the
recording and every action on either: Assign/Change Fig, Delete Fig, Send Fig,
Download audio. The separate Figs tab and its per-Fig naming are gone with it.

**Fixed: picking a design threw you back to the top of the catalogue.** Choosing a
scene re-renders the popup, and rebuilding the body reset its scroll — so ticking the
ninth scene sent you back to the first. The scroll position is carried across the
rebuild, while moving to another section still starts at its top.

**Fixed: sending a request left the same scenes ticked.** With the selection still
live, Explore looked as though nothing had been sent and Continue to Request led back
to a screen showing the old request. Now the picker clears on send, scenes already
requested are marked in Explore with the status they carry and cannot be re-picked,
and choosing new ones opens an explicit **Another request** screen: your earlier
request is not changed, this adds a second one.

**My Designs rolls up every request.** `MD_Requests::kit_designs()` gathers the
scenes across all of a member's requests for the kit, newest first, so a second
request cannot hide the first. Each card carries its own status and date.

## mini-devices 3.1.2

**Connect is the cable, and only the cable.** The docs floated a pairing code or QR
route as a later option; there is no such plan. The kit is in the child's hands and
the cable is what they have, so the wording says that plainly now.

**Manage → Content is gone.** It listed animation, visual and Fig assets that have no
source and no owner — an empty tab promising a feature nobody had agreed to build.
Brick-Talks' Manage is Figs · Slots · Recordings · Device Details.

**Figs stay per slot.** A Fig lives in one of the kit's slots because that is how the
kit is built, and designing one opens the avatar editor the site already has. No
separate Fig library, and no change to the personalization screen.

## mini-devices 3.1.1

**The site-wide "Connect a kit" button is gone.** With Connect living inside each
kit it was a second, contradictory way in: it asked the member to connect a kit in
the abstract, before the section had established *which* kit. The shelf header is
now just the title and the four cards. The USB-support warning moved with it — it
shows on the kit's own Connect screen, where someone is actually trying to connect,
instead of sitting above the shelf for a member who only wants Mini-Designs.

## mini-devices 3.1.0

**Every kit screen now has three top-level buttons, and only three.** Mini-Designs
reads Explore | Request | My Designs; Design-Talks, Brick-Talks and Fig-Talks read
Request | Connect | Manage. What used to be a flat row of tabs (Request, Overview,
Recordings, Slots, Scenes) is now one Manage section with its own quieter sub-nav,
so the hierarchy reads at a glance.

**Ready to Connect** joins the lifecycle between Preparing and Connected:

    Draft → Submitted → Contacted → Preparing → Ready to Connect → Connected

It is the point where the Connect button opens. Statuses saved as
`ready_to_connect` normalise to it, and it raises its own mail telling the member to
open Mini-Kits and connect. Manage stays shut until the kit has actually reported in.

**Mini-Designs is three screens instead of one.** Explore is the catalogue and
nothing else; Request reviews what was picked, takes the note and sends; My Designs
lists what was asked for, each card carrying the request's status and date.

**Connect** is its own screen: what to plug in, what the browser will ask, and the
bind. Once linked it shows device id, firmware and the connected date, and hands you
straight to Manage. A pairing code or QR route lands on the same bind and can be
added without touching this.

**Brick-Talks Manage → Figs.** Figs are the kit's digital characters: create,
rename, edit, delete and send to the kit. `POST /faces` gained `remove` (delete a
Fig, leaving that slot's recording alone) and a rename that no longer needs the
config resent. Terminology follows the team's standard — every "face" in Brick-Talks
is now a Fig.

**Fig-Talks Manage → My Fig** shows the figure that was designed for the request,
with hair, face and colours read out of the editor's config; the draft screen is now
Review My Fig, listing the same lines with Edit Personalization beside Send.

**Device Details** carries device id, connection state, connected date, firmware and
last sync. `connected_at` is stamped on a device's first sync and never moves after.

**Fixed:** a Fig-Talks request sent from the review screen carried whatever
Mini-Designs scenes were selected at the time, because the draft screen posted
`designs` for every kit. Only a catalogue kit sends them now.

## mini-devices 3.0.2

**Fixed: the request read "Hair colour: 0".** The summary was written against
guessed key names. The editor actually saves `hairCategory`, `hairTextureIndex`,
a numeric `hairColor` index into its own palette, `eyeModelName`/`mouthModelName`
(null while the member keeps the default face), and hex `eyeColor`,
`eyebrowColor`, `glassesColor`. Every one of those is now translated, so a
request sent without changing anything reads

    Hair: Short — style 1, Dark brown (#4D1F00)
    Face: Eyes: default · Mouth: default
    Eye colour: Black (#000000)
    Brows & lashes: Black (#000000)

instead of two dashes and a zero. Colours carry both the name and the hex the
workshop needs; glasses only appear when there are glasses. Requests already in
the database re-read their stored config, so the fix is retroactive.

## mini-devices 3.0.1

**Only the confirmed scenes are available.** Availability now has one reader,
`MD_Designs::availability()`, and a scene with no explicit answer counts as
*Currently Unavailable* rather than *Available*. The seed asserts *Available* on
exactly the ten scenes the team confirmed; everything else has to be opened by hand
in wp-admin.

**An import path for the game's scenes.** `MD_Designs::import_names()` brings names
in from the game's own database (minitalks-api, `select * from scenes`). Every
imported scene arrives *Currently Unavailable* — that list is the whole game, not
what the workshop can build. Existing scenes are left alone, so an import can never
re-open a scene the team closed.

## mini-devices 3.0.0

**The section is organised by Mini-Kit, not by action.** It used to be a shelf of
devices with a Fig-Talks request bolted on. It is now four kits — **Mini-Designs**,
**Design-Talks**, **Brick-Talks**, **Fig-Talks** — where you pick one first and its
own screen shows the single action that fits where its request actually is.

    Mini-Kits → Mini-Designs → choose scenes → note → Send Request → status
              → Design-Talks → note → Send Request → status
              → Brick-Talks  → note → Send Request → status
              → Fig-Talks    → personalize → review → note → Send Request → status

All four share one lifecycle — Draft → Submitted → Contacted → Preparing →
Connected — and every request takes an optional note. Only Fig-Talks personalises;
only Mini-Designs picks from a catalogue.

**The cards say nothing until there is something to say.** "Not Requested" reads as
a database column rather than an invitation, so a kit nobody has asked for shows its
name and what it is, and the request lives one click in. The whole card opens the
kit.

**Mini-Designs is a catalogue, not a product.** A new **Mini-Designs** post type
holds the buildable scenes, each with an availability the team edits: Available,
Currently Unavailable, Coming Soon. Unavailable scenes stay on show — hiding them
would make Mini-Designs look far smaller than it is — reading plainly and not
selectable. It seeds once with the scenes that can be built today; the wider list
from the game's database can be imported later, arriving unavailable until the team
says otherwise.

**Requests are generalised.** One admin screen, **Mini-Kit Requests**, filterable by
kit and by status, showing what was asked for — scenes, or face/hairstyle/hair
colour — plus the note. The post type keeps its original slug so Fig-Talks requests
made before the other kits existed are not orphaned; they carry `kit = fig-talks`.
`md_kit_request_submitted` and `md_kit_status_changed` replace the Fig-Talks-only
hooks, and `md_kits` lets a kit be renamed, retagged or added without touching the
plugin.

**Device features moved under their kit.** Overview, Recordings, Slots and Scenes
are sections of the kit that owns them, visible but locked until the kit is made and
reaches its member — a kit made to order cannot be connected before it exists, so
saying "not connected" was the wrong shape.

## mini-devices 2.11.0

**Status names that read as a community request, not an order.**
Draft → Submitted → Contacted → **Preparing** → **Connected**, replacing "In
Preparation" and "Completed". *Connected* as the end state is what Connected
Mini-Kits means, and it keeps shipping language out entirely. Rows written under the
old keys still read correctly.

Each status carries one plain sentence, defined once in PHP and used by the card,
the popup and the member's email, so the three cannot drift apart:

| Status | Sentence |
|---|---|
| Draft | Your Fig-Talks design is still being personalized. |
| Submitted | Your Fig-Talks design has been shared with the Mini-Talks team. |
| Contacted | Our team has contacted you about the next steps. |
| Preparing | Your personalized Fig-Talks is being prepared. |
| Connected | Your Fig-Talks is now connected to your profile. |

**The card follows the layout asked for**: name, *Your personalized Mini-Kit*, a
status badge, that sentence, the date it was sent, and **View My Design**. The
popup adds a progress rail — Personalized → Submitted → Contacted → Preparing →
Connected — where there is room for it.

**Fixed:** a Fig-Talks with a request in flight was still drawn as an empty slot —
faded, dashed, captioned "Not linked yet" beside its own "Submitted" badge. A kit
being made for you is not a kit you lack, so the card is a solid brick now and the
duplicate pill is gone from the card and the popup header alike.

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
