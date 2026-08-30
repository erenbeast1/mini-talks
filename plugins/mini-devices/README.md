# Mini Devices — Mini-Kits (v2.0.0)

Adds the **Mini-Kits** shelf to the Mini-Forum profile. Kits connect over USB
(WebSerial); recording stats sync to the profile and audio is downloaded as WAV.
Each kit opens its own detail popup.

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
| Display-Talks | `B` | blue | A screen kit with a designable face per slot |
| Design-Talks | `D` | yellow | Scene cards and level-by-level practice |

Each card carries one of three states:

| State | Meaning | What is available |
|---|---|---|
| **Connected** | plugged in over USB right now | everything |
| **Not connected** | synced before, unplugged now | read the last sync; renaming, downloads and face transfer are disabled and say why |
| **Not linked yet** | not on this profile | the card is dashed and cannot be opened |

Opening a kit gives a colour-matched popup with its own sections: **Overview**
(stats, slot capacity, kit name), **Recordings** (numbered slots, naming, per-slot
WAV download), **Faces** (Display-Talks only) and **Scenes** (Design-Talks only).

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
on mobile the page still opens and stored data still shows, but "Connect a kit" is
disabled and the reason is stated.

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
