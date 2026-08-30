# Mini Devices — Mini-Kits (v3.1.2)

Adds the **Mini-Kits** section to the Mini-Forum profile.

Every Mini-Kit is made to order, so none of them are sold: a member opens a kit and
asks for it. The profile is organised **by kit, not by action** — you pick a
Mini-Kit first, and its own screen shows the one thing that fits where the request
actually is.

Each kit screen has **three top-level buttons and only three**. Mini-Designs has no
hardware, so it reads Explore | Request | My Designs; the three devices read
Request | Connect | Manage, and everything a connected kit can do lives under Manage.

| Kit | Buttons | Flow |
|---|---|---|
| **Mini-Designs** | Explore \| Request \| My Designs | Explore → Select → Request → My Designs |
| **Design-Talks** | Request \| Connect \| Manage | Request → Connect → Scenes / Recordings / Device Details |
| **Brick-Talks** | Request \| Connect \| Manage | Request → Connect → Figs / Slots / Recordings / Device Details |
| **Fig-Talks** | Request \| Connect \| Manage | Request → Personalize → Review → Connect → My Fig / Recordings / Device Details |

**Where personalization sits** differs by kit, and that is the point: a Fig-Talks
figure is manufactured, so it is designed *before* the request; Brick-Talks Figs are
digital, so they are created *after* the kit is connected, under Manage → Figs.

| Kit | Personalization | Why |
|---|---|---|
| Mini-Designs | — | the member picks available scenes |
| Design-Talks | — | request + connect + manage |
| Brick-Talks | Manage → Figs | digital Figs are made once the kit is connected |
| Fig-Talks | Request | it decides what gets physically built |

## Status

    (nothing yet) → Draft → Submitted → Contacted → Preparing → Ready to Connect → Connected

*Ready to Connect* is the point where the **Connect** button opens: the kit exists
and is waiting to be linked. Before that Connect is inert, and Manage stays shut
until the kit has actually reported in.

*Draft* is work that has not been sent — a figure designed, scenes chosen.
*Connected* is the end: the kit is made and linked to the profile. No shipping or
order words anywhere; **Connected** is what Connected Mini-Kits means.

The cards say nothing at all until there is something to say. "Not Requested" reads
as a database column, not an invitation — so a kit nobody has asked for simply shows
its name and what it is, and the request lives one click in.

Each status carries one plain sentence, defined once in PHP and used by the card,
the kit screen and the member's email, so the three cannot drift apart.

Every request takes an optional **note**.

## Mini-Designs catalogue

Mini-Designs is not one product but a library of buildable LEGO scenes. Whether one
can be built right now depends on parts, which changes week to week, so availability
is a field the team edits under **Mini-Designs** in wp-admin: *Available*,
*Currently Unavailable*, *Coming Soon*.

Unavailable scenes stay on show — hiding them would make Mini-Designs look far
smaller than it is. They read plainly, cannot be selected, and can be picked another
time.

The catalogue seeds once with the ten scenes the team confirmed they can build —
Classroom, Coffee Shop, Supermarket, Choir Performance, Robotics Tournament,
Playground, Beach, Swimming Pool, Basketball Court, Tennis Court — and those, and
only those, start *Available*. After that the catalogue is the team's to manage.

A scene with no explicit answer counts as *Currently Unavailable*, never as
available. That matters for the wider scene list in the game's own database
(minitalks-api, `select * from scenes`): it is the whole game, not what the workshop
can build. Import it with

```php
MD_Designs::import_names($names); // returns how many scenes were created
```

Every imported scene lands *Currently Unavailable* and stays there until someone
opens it in wp-admin. Import never touches a scene that already exists, so it cannot
re-open one the team closed, nor close one they opened.

## Connect

Connecting lives inside the kit, on its own **Connect** screen — there is no
site-wide "Connect a kit" button, because a kit is never connected in the abstract:
you are always connecting *this* Design-Talks, *this* Brick-Talks.

Pairing happens over the kit's USB cable: the kit reports its own id, and the site
binds that id to the profile. This is the pairing route and the only one; the
screen is a wrapper around the bind that has always been there.

Connect is open at *Ready to Connect*, at *Connected*, and for a member who has no
request on record at all — the profiles that pre-date requests must not be locked
out of their own hardware.

## Manage

| Kit | Sections |
|---|---|
| Design-Talks | Scenes (scene → level → mini) · Recordings · Device Details |
| Brick-Talks | Figs · Slots · Recordings · Device Details |
| Fig-Talks | My Fig · Recordings · Device Details |

**Figs** are Brick-Talks' digital characters. A Fig lives in one of the kit's slots —
that is how the kit itself is built — so the list is the slots that carry one:
create, rename, edit, delete, and send to the kit. A slot's Fig also sits beside its
recording under **Slots**, because the two are halves of the same object. Designing a
Fig opens the same avatar editor the site already uses; nothing about that screen
changes here.

**Device Details** carries device id, connection state, connected date, firmware,
last sync and the device name.

## Where requests go

**Mini-Kit Requests** in wp-admin: the kit, the member and their email, what was
asked for (scenes, or face/hairstyle/hair colour, plus the note), and the status.
Filter by kit or by status; set the status from the request's sidebar.

Stored per request: user id (post author), name, email, the note, the selected
scenes or the design config and render, the created and submitted dates, the status.

### Notifications

| When | Who | What |
|---|---|---|
| Request sent | the team | member, email, what was asked for, links to the render and the request |
| Request sent | the member | confirmation |
| Contacted · Preparing · Connected | the member | the new status and what it means |

Plain `wp_mail()`, the way Mini-Forum sends its own mail.

```php
add_filter('md_kit_admin_email', function () { return 'kits@example.com'; });
add_filter('md_kit_notify_statuses', function ($s) { return array('connected'); });
add_filter('md_kits', function ($k) { /* rename, retag, add a kit */ return $k; });
add_filter('md_designs_seed', function ($names) { return $names; });
```

`do_action('md_kit_request_submitted', $post_id, $user_id)` and
`do_action('md_kit_status_changed', $post_id, $status, $was)` are there for anything
else you want to hang off them.

### Where the status shows

- **The member's profile** — beside Posts / Events / Kits, once a request is sent.
- **The kit card** — status badge, that status's sentence, and the date.
- **The kit screen** — the same, plus the progress rail and what was asked for.
- **The WordPress user profile** — a row per kit, for whoever answers support.

## Connected kits

Three of the four are physical devices. Once one reaches a member it connects over
USB (WebSerial) and its own sections open up — Overview, Recordings, Slots, Scenes.
Until then those tabs are visible but locked, saying the kit has to be made first
rather than treating it as a connection failure.

## Install

1. Upload the `mini-devices` folder to `/wp-content/plugins/`
2. Plugins → **Mini Devices** → Activate

That is all. With **Mini-Forum 3.06 or newer** the shelf appears under the
profile's Mini-Kits tab automatically.

### How it attaches

Mini-Forum 3.06+ renders a Mini-Kits panel and fires `mf_profile_kits_panel`
inside it; this plugin hooks that action. Mini-Forum's own files are never
modified.

On **Mini-Forum < 3.06** there is no such panel, so the plugin falls back to its
old behaviour: it filters the forum shortcode's output and appends the shelf when
the view is `?view=profile`. The fallback is skipped as soon as the panel hook
has fired, so the two never double up.

### Placing it by hand

```
[connected_devices]
```

### Changing the fallback

In `functions.php`:

```php
// Turn the automatic fallback off
add_filter('md_is_forum_tag', '__return_false');

// Show it on a different view
add_filter('md_is_profile_view', function ($is, $view) {
    return $view === 'settings';
}, 10, 2);
```

## The shelf

All three kits are always listed, whether or not the profile owns them:

| Kit | Code | Colour | What it does |
|---|---|---|---|
| Fig-Talks | `F` | red | A minifigure that records and plays back |
| Brick-Talks | `B` | blue | A screen kit with a designable face per slot |
| Design-Talks | `D` | yellow | Scene cards and level-by-level practice |

Each card carries one of three states:

| State | Meaning | What is available |
|---|---|---|
| **Connected** | plugged in over USB right now | everything |
| **Not connected** | synced before, unplugged now | read the last sync; renaming, downloads and face transfer are disabled and say why |
| **Not linked yet** | not on this profile | the card is dashed and cannot be opened |

Opening a kit gives a colour-matched popup with its own sections:

| Kit | Sections |
|---|---|
| Fig-Talks | **Overview** · **Recordings** |
| Brick-Talks | **Overview** · **Slots** |
| Design-Talks | **Overview** · **Scenes** |

Brick-Talks gets one **Slots** section rather than separate Recordings and Faces
tabs: a slot holds one recording *and* one face, so each card shows the face, the
recording name and duration, and all three actions (design face, send face,
download audio) together.

## Admin demo mode

Anyone with `manage_options` sees an **Admin preview** bar above the shelf. Turning
it on fills the shelf with three sample kits — all reading as connected — so every
screen can be walked through without hardware: slot naming, face design and
transfer, scene trees, RFID card folders, downloads.

It is entirely front-end. `api()` is short-circuited to mutate the sample data in
memory, so nothing is written to `usermeta` and no real profile is touched.
Downloads synthesise a short chirp locally, which means the WAV that lands actually
plays. Connecting a real kit is refused while demo mode is on, and the shelf carries
a caution stripe plus a banner in every popup so sample data cannot be mistaken for a
member's real kits.

Leaving demo mode restores whatever was on the profile before.

## Public preview shortcode

For a product or onboarding page, `[mini_kits_demo]` renders the same shelf as a
public, always-on preview. It shows sample kits only, never reads or writes a
profile, and works for logged-out visitors.

```
[mini_kits_demo]
[mini_kits_demo kits="brick-talks"]
[mini_kits_demo kits="fig-talks,brick-talks" title="Try it yourself" intro="Open a kit and design a face."]
```

| Attribute | Default | Notes |
|---|---|---|
| `kits` | all three | Comma-separated kit names — `fig-talks`, `brick-talks`, `design-talks`. The internal codes `F`, `B`, `D` also work, as does the former name `display-talks`. Unknown values are ignored. |
| `title` | `Try a Mini-Kit` | Pass an empty string to drop the heading. |
| `intro` | see plugin | Pass an empty string to drop the paragraph. |

"Design face" opens the same avatar editor members use. Mini-Forum enqueues that
bundle only for signed-in users, so this plugin enqueues it itself on a preview
page. Everything it needs works logged out: `get_config(0)` returns null and
`mf_get_user_role(0)` falls back to `Family`. The editor's save request is
intercepted client-side by `MDFaces`, so a visitor's changes never leave the
browser.

This does mean the preview needs the GLB models on `mini-talks.com` to allow
cross-origin reads — the same CORS setup members already rely on (see
`CORS_SETUP.md`).

If a page builder keeps the shortcode out of `post_content`, the assets may not be
detected. The shortcode enqueues them itself as a fallback, and
`add_filter('md_page_has_preview', '__return_true')` forces it.

## Fig-Talks personalisation requests

Fig-Talks is made to order, so it is not sold from the shelf. A member personalises
a figure inside their profile and sends the design to the Mini-Talks team, who get
in touch: **Personalize → Send My Request → the team contacts you**. No cart, no
checkout, no prices.

The flow lives inside the Fig-Talks kit itself, under a **Personalize** section.
That section is open whether or not a Fig-Talks is connected — you personalise one
before you own it — while Overview and Recordings stay visible but locked until a
kit is linked.

| State | What the member sees |
|---|---|
| Nothing designed | *Create Your Fig-Talks*, the four steps, **Personalize Fig-Talks** |
| Designed, not sent | The render, *Your Fig-Talks is ready.*, **Send My Request** + Edit design |
| Sent | *Request sent!*, the status badge, the date, the progress rail, **Start a new design** |

The design itself is made in Mini-Forum's avatar editor, which already offers face,
hairstyle and hair colour with a live 3D preview. Its config carries `glassesColor`
and `glassesTextureIndex` too, so glasses slot in later without changing this flow.

A sent request is frozen. Designing again opens a new request rather than rewriting
one the team may already be acting on.

### Notifications

| When | Who | What |
|---|---|---|
| Request sent | the team | member, email, the three choices, a link to the render and to the request |
| Request sent | the member | confirmation, in the same words the profile shows |
| Contacted · Preparing · Connected | the member | the new status and what it means |

Plain `wp_mail()`, the way Mini-Forum sends its own mail, so whatever SMTP the site
uses carries these too. Draft and Submitted raise no status mail — a draft is the
member's own, and Submitted already has its confirmation.

```php
add_filter('md_figtalks_admin_email', function () { return 'kits@example.com'; });
add_filter('md_figtalks_notify_statuses', function ($s) { return array('completed'); });
```

### Where the status shows

- **The member's profile** — beside Posts / Events / Kits, once a request is sent.
- **The Fig-Talks card** — *Personalized Fig-Talks · Status: …* and **View My Design**.
- **The WordPress user profile** — a read-only Fig-Talks row with the status, the
  date it was sent, the render and a link to the request, for whoever answers support.

### Where requests go

Each request is a `md_fig_request` post authored by the member, listed under
**Fig-Talks Requests** in wp-admin with the render, the member and their email, the
three choices, and the status. Statuses: Draft, Submitted, Contacted,
Preparing, Connected — set from the sidebar of a request, filterable from the list.

The journey reads **Personalized → Submitted → Contacted → Preparing → Connected**.
No shipping or order words: the end state is *Connected*, which is what Connected
Mini-Kits means. Each status carries one plain sentence, shown on the card and in
the member's mail, so the two never drift apart.

Stored per request: user id (post author), name, email, face, hairstyle, hair
colour, the full editor config, the render, the created and submitted dates, and the
status.

`do_action('md_figtalks_request_submitted', $post_id, $user_id)` fires on submit, if
you later want an email or a Slack ping.

## Kit artwork

Shelf cards show the product renders, passed from PHP and filterable:

```php
add_filter('md_kit_icons', function ($icons) {
    $icons['B'] = 'https://example.com/brick-talks.png';
    return $icons;
});
```

Keys are the kit codes `F`, `B`, `D`. Any aspect ratio works — the tile fits the
image rather than cropping it. If an image is missing or fails to load, the card
falls back to the built-in SVG, so a bad URL never leaves an empty tile.

## Kit ↔ profile link

Firmware v1.2+ gives each kit an immutable id derived from its MAC address
(`F-3C71BF2A`) and stores which WordPress profile it belongs to in `/owner.json`.

1. The page sends `hello`; the kit returns `uid` + `profile`
2. `profile` empty → the user is asked whether to link it; on confirmation `bind`
   writes the user id and name to the kit
3. `profile` belongs to someone else → a warning; the user may take ownership
   (recordings are not deleted)
4. The server enforces it too: a `sync` from a kit bound elsewhere is rejected
   with **409**

"Remove from profile" deletes the server record *and* sends `unbind` to the kit.

Kit data is **keyed by uid**, so one person can own several Version_F kits without
them colliding. Older firmware that sends no uid still works, keyed by type code.

## Recording history

The kit appends every recording to `/log.jsonl` (last ~100, wrapping):

```
{"slot":2,"ts":1786649100,"len":4200}
```

Read with `{"cmd":"history"}`. The interface does not surface this yet — the data
is there.

## Where the data lives

`usermeta` → key **`md_devices`** (JSON). No new tables.

```
{
  "F-3C71BF2A": {
    "type": "F",
    "fw": "1.1",
    "last_sync": 1786650000,
    "stats": { "total_s": 84, "count": 6, "longest_s": 22, "last_ts": 1786649100 },
    "slots": [ { "i": 1, "full": 1, "len_ms": 4200, "name": "Mum" } ]
  },
  "D-91A0C4": {
    "cards": { "04A1B2": { "name": "Café", "stats": {} } }
  }
}
```

Slot and card names **belong to the user**, not the kit. They survive every sync
and stay on the profile even if the kit is wiped.

Slot faces live under a separate key, `md_faces`, with the preview PNG written to
`uploads/mf-avatars/`.

## REST endpoints

| Path | Method | Purpose |
|---|---|---|
| `/wp-json/mini-devices/v1/data` | GET | The user's kit data |
| `/wp-json/mini-devices/v1/sync` | POST | Stats + slot list coming off a kit |
| `/wp-json/mini-devices/v1/name` | POST | Rename a slot, card or kit |
| `/wp-json/mini-devices/v1/faces` | GET/POST | Read or save a slot face |
| `/wp-json/mini-devices/v1/whoami` | GET | The identity used for binding |
| `/wp-json/mini-devices/v1/forget` | POST | Unlink a kit from the profile |

All are limited to signed-in users and protected with `X-WP-Nonce`.

## Kit protocol

One JSON object per line, 115200 baud:

| Sent | Returned |
|---|---|
| `{"cmd":"hello"}` | `{"dev":"F","fw":"1.1","slots":5}` |
| `{"cmd":"time","epoch":1786650000}` | `{"ok":1}` |
| `{"cmd":"stats"}` | `{"total_s":..,"count":..,"longest_s":..,"last_ts":..,"slots":[...]}` |
| `{"cmd":"dump","slot":1}` | `{"dump":1,"samples":N,"sr":16000}` + sample stream + `EOF` |
| `{"cmd":"bind","profile":12,"owner":"Eren"}` | `{"ok":1,"uid":"F-...","profile":12}` |
| `{"cmd":"unbind"}` | `{"ok":1,"profile":0}` |
| `{"cmd":"history"}` | `{"history":1}` + one record per line + `EOF` |

The `dev` field: **F** = Version_F · **B** = Version_B · **D** = Version_D. The
page derives the kit name from that code.

## Browser support

WebSerial runs only in **desktop Chrome, Edge and Opera**. In Safari, Firefox and
on mobile the page still opens and stored data still shows, but the kit's **Connect**
button is disabled and the reason is stated on that screen.

The site must be served over **HTTPS** (localhost excepted) — WebSerial requires a
secure context.

## Where the audio is

**Not on the server.** Recordings sit in the kit's flash. The site reads them with
`dump` only while the kit is plugged in, converts to WAV in the browser and
downloads. No audio is ever uploaded.

That is why download buttons are disabled when a kit is unplugged. The only things
that persist on the profile are **stats, names and faces** — those survive a kit
reset.

## Known limits

- Audio streams over the serial link as text: a 30-second recording takes ~15-20
  seconds. A binary transfer would speed this up.
- "Download all" fetches recordings one at a time; if the browser blocks multiple
  downloads they have to be taken individually.
- Version_D per-card audio dumps switch on once the firmware reports card folders
  — the structure is ready and the `cards` field is waiting.
