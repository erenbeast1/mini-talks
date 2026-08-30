# CORS Setup — mini-talks.com (asset host)

The forum lives on `mini-talks.org` (WordPress), but avatar assets (GLB models,
PNG thumbnails) are served from `mini-talks.com` (the game site). This is a
**cross-origin** setup. Browsers block cross-origin asset loads by default — we
need to add CORS headers on `mini-talks.com` so the forum is allowed to fetch
them.

## What needs CORS

Two paths on mini-talks.com need CORS headers:

1. **`/models/`** — hair, face, eye, mouth GLB models and PNG thumbnails
2. **`/assets/`** — the main LEGO body GLB built by Vite (`lego-figure-2glb-{hash}.glb`)

Specifically these patterns:
- `https://mini-talks.com/models/hair/*.glb`
- `https://mini-talks.com/models/hair/png/*.png`
- `https://mini-talks.com/models/face/**/*.glb`
- `https://mini-talks.com/models/face/**/*.png`
- `https://mini-talks.com/assets/lego-figure-2glb-*.glb`

## What headers to add

```
Access-Control-Allow-Origin: https://mini-talks.org
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Range, Content-Type
```

(For maximum safety we limit `Allow-Origin` to forum domain only, not `*`. If
you ever add another forum domain, list both with comma-separated values OR
use a small Plesk rule that mirrors the request `Origin` header.)

## How to add them in Plesk

You're on Plesk (based on the File Manager screenshot). Two ways:

### Option 1: Plesk "Additional nginx directives" (easiest)

1. Plesk → **Domains** → `mini-talks.com`
2. **Apache & nginx Settings** (or "Web Server Settings")
3. Find the field labeled **"Additional nginx directives"**
4. Paste this:

```nginx
# CORS for the asset folders consumed by the forum's avatar editor.
# Both blocks share identical headers; only the path differs.

location ^~ /models/ {
    add_header 'Access-Control-Allow-Origin' 'https://mini-talks.org' always;
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Range, Content-Type' always;
    add_header 'Access-Control-Max-Age' '86400' always;

    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://mini-talks.org' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Range, Content-Type' always;
        add_header 'Access-Control-Max-Age' '86400' always;
        add_header 'Content-Length' '0';
        add_header 'Content-Type' 'text/plain';
        return 204;
    }
    try_files $uri =404;
}

location ^~ /assets/ {
    add_header 'Access-Control-Allow-Origin' 'https://mini-talks.org' always;
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Range, Content-Type' always;
    add_header 'Access-Control-Max-Age' '86400' always;

    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://mini-talks.org' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Range, Content-Type' always;
        add_header 'Access-Control-Max-Age' '86400' always;
        add_header 'Content-Length' '0';
        add_header 'Content-Type' 'text/plain';
        return 204;
    }
    try_files $uri =404;
}
```

5. Click **OK** / **Apply** — Plesk reloads nginx automatically.

### Option 2: `.htaccess` (only works if Apache is in the chain)

Some Plesk setups run Apache behind nginx. If Option 1 doesn't show the field
or doesn't work, try this:

1. Open `httpdocs/models/.htaccess` (create if it doesn't exist)
2. Paste:

```apache
<IfModule mod_headers.c>
    SetEnvIf Origin "^https://mini-talks\.org$" CORS_ORIGIN=$0
    Header set Access-Control-Allow-Origin "%{CORS_ORIGIN}e" env=CORS_ORIGIN
    Header set Access-Control-Allow-Methods "GET, OPTIONS"
    Header set Access-Control-Allow-Headers "Range, Content-Type"
    Header set Access-Control-Max-Age "86400"
</IfModule>
```

## How to verify it's working

1. Open mini-talks.org in browser, log in, click "Customize Avatar"
2. F12 DevTools → **Network** tab
3. Look at any request to `mini-talks.com/models/...`
4. Click on it → **Headers** tab → **Response Headers**
5. You should see:
   ```
   Access-Control-Allow-Origin: https://mini-talks.org
   ```

If you DON'T see that header, CORS isn't set up yet. If a request fails with
"CORS policy" error in the Console tab, that's the same problem — the header
is missing.

## Common pitfalls

**"It works for GLBs but PNG thumbnails fail"**
→ Make sure the location block matches **all** files under `/models/`, not just
`.glb`. The `^~` prefix in the example does this.

**"Preflight (OPTIONS) request returns 405"**
→ The `if ($request_method = 'OPTIONS')` block handles this. Make sure it's
included exactly as above.

**"Sometimes works, sometimes doesn't (caching weirdness)"**
→ Cloudflare or another CDN may strip CORS headers. Whitelist the `Origin`
header in CDN settings, or ensure CDN forwards CORS response headers.
Cloudflare's "Browser Cache TTL" can also cache responses without the CORS
header for a while — purge cache after first setting up.

## Plan B if you can't add CORS

If for some reason nginx CORS doesn't work in your setup, the simplest
alternative is to **proxy** assets through mini-talks.org. Add a redirect or
reverse proxy:

```nginx
# On mini-talks.org's nginx config
location /game-assets/ {
    proxy_pass https://mini-talks.com/models/;
    proxy_set_header Host mini-talks.com;
}
```

Then in WordPress, add this to your `functions.php` or as a snippet:

```php
add_filter('mf_avatar_glb_base', function() {
    return 'https://mini-talks.org/game-assets';
});
```

That way the browser sees same-origin requests, no CORS needed at all.
