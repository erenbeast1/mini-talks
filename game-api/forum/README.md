# Connect Profile — the game side

Four endpoints that let a Mini-Talks forum member connect their forum profile to
their Mini-Talks **game** account. Copy this folder into the game's API so that
it sits at:

```
minitalks-api/
├── auth/
├── avatar/
├── config/
└── forum/          ← this folder
    ├── _lib.php
    ├── config.php          (you create this — see below)
    ├── link-request.php
    ├── link-confirm.php
    ├── link-profile.php
    └── link-revoke.php
```

Nothing else in the game changes. No screen, no edit to an existing endpoint, no
column added to a table the game already writes. The one table these endpoints
own, `forum_links`, is created automatically the first time one of them runs.

## Setting it up

1. Copy the folder to the server as `minitalks-api/forum/`.
2. Generate a shared key:

   ```
   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
   ```

3. Copy `config.sample.php` to `config.php` and paste the key into it.
4. In WordPress, open **Mini-Talks Game** and put the same key in **Shared key**,
   with the API address (e.g. `https://mini-talks.org/minitalks-api`) above it.
   Saving runs a connection test and says whether the game answered.

Treat the key like a password. If it ever leaks, change it in both places at the
same time — nothing else breaks, and no existing link is lost.

## How a member connects

1. Profile → **App & Studio** → *Connect Profile*.
2. They type the e-mail address they sign in to the **game** with.
3. The forum calls `link-request.php`. If that address has a game account, the
   game hands back a one-time token and the account's display name — and nothing
   else. No user id, no role, no profile.
4. The forum e-mails the confirmation link to that address, so the only person
   who can finish is whoever reads that inbox.
5. Opening the link brings them back to the forum, which calls
   `link-confirm.php`. Only now does the game hand over the account.

No game password is ever typed into WordPress, and none crosses between the two
systems.

## What the endpoints will not do

- **Say who has a game account.** `link-request.php` answers `found: false` for an
  unknown address, a deactivated account and an unverified one alike, so the
  forum cannot be used to test whether somebody plays.
- **Answer a browser.** They send no CORS headers and reject anything that is not
  a POST carrying `X-Forum-Key`, so a page in a browser cannot reach them. The
  key travels in a header, never in a URL, so it stays out of access logs.
- **Store a usable token.** Only the SHA-256 of it is written, and confirming
  clears it, so the link works exactly once.
- **Let one game account sit on two forum profiles.** `link-request.php` refuses
  with `code: taken`, and the forum refuses again on its own side.
- **Hand over anything private.** The snapshot is a name, a role, the counters the
  game already shows on its own dashboard, and the avatar. Never a password hash,
  never a token, never anybody else's e-mail, and for a child never a parent's
  address.

## The endpoints

All four are `POST`, all four need `X-Forum-Key`, all four answer JSON.

| Endpoint | Body | Answers |
|---|---|---|
| `link-request.php` | `{email, forum_user_id, forum_nickname}` | `{success, found, token, name, role, expires_in}` |
| `link-confirm.php` | `{token, forum_user_id, forum_nickname}` | `{success, account}` |
| `link-profile.php` | `{user_id, forum_user_id}` | `{success, account}` |
| `link-revoke.php` | `{user_id, forum_user_id}` | `{success}` |

`account` looks like:

```json
{
  "user_id": 42, "email": "…", "role": "child", "active": true, "verified": true,
  "name": "Ada",
  "profile": { "mini_name": "Ada", "age_range": "7-9", "tagline": "…",
               "bricks": 34, "medals": 5, "cups": 1,
               "current_streak": 3, "longest_streak": 9, "approval": "approved" },
  "avatar":  { "url": "…", "config": { … }, "version": 4 }
}
```

`profile` carries different keys per role: `minis` for a parent,
`username`/`organization`/`profession` for an expert,
`username`/`age_range` for a builder.

## Removing it

Delete the folder and drop the `forum_links` table. Nothing else in the game
refers to either.
