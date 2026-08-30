# Server Configuration for Avatar Uploads

> **Cross-origin asset note**: avatar GLB models and PNG thumbnails are loaded
> from `mini-talks.com` while the forum runs on `mini-talks.org`. This requires
> CORS headers — see `CORS_SETUP.md` for that part. This document covers ONLY
> the upload-limit (413) issue.

The avatar editor uploads a base64-encoded PNG via WordPress AJAX. With the
client-side 480×480 downscaling now in place, uploads are typically 80–300 KB,
but several server defaults still cap things lower. If you see **413 Request
Entity Too Large**, one of the following limits is too tight.

## Nginx (most common cause of 413)

In `/etc/nginx/nginx.conf` (http block) or your site config:

```nginx
http {
    # …
    client_max_body_size 10M;
}
```

Or per-site in `/etc/nginx/sites-available/your-site.conf`:

```nginx
server {
    # …
    client_max_body_size 10M;
}
```

Reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## PHP (php.ini)

Find your loaded php.ini: `php --ini` or `phpinfo()` in WordPress admin.

```ini
upload_max_filesize = 10M
post_max_size       = 10M
memory_limit        = 256M
```

After editing, restart PHP-FPM:

```bash
sudo systemctl restart php8.2-fpm   # adjust version
```

## Cloudflare (if you're behind it)

Cloudflare Free plan caps body size at **100 MB**, so it shouldn't trigger 413
unless you're on a much-restricted reverse proxy. Pro/Business/Enterprise have
higher limits. Nothing to do here in most cases.

## WordPress

WordPress respects `post_max_size` from PHP. No additional setting needed.

## Verifying

After changing nginx, you should see successful saves. Browser DevTools
→ Network tab → POST `admin-ajax.php` should return **200**, not 413.

The plugin will also surface a clearer error message in the popup now if 413
hits: "Server upload limit too low (413). Ask your host to raise client_max_body_size to 10M."

## Hosting-specific notes

**cPanel / shared hosts** — there's usually a "MultiPHP INI Editor" or
"Select PHP Version → Options" panel where you can set `post_max_size` and
`upload_max_filesize`. Nginx is rarely user-configurable on shared hosts;
contact support and ask them to raise `client_max_body_size` to 10M.

**Plesk** — Tools & Settings → Apache & nginx → add custom directives.

**Managed WordPress (WP Engine, Kinsta, etc.)** — they usually set this
generously by default (32M+). If you still hit 413, open a support ticket;
they can raise it for your account.
