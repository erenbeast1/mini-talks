# Mini-Forum Avatar Editor — Build Guide

The avatar editor is a React + Three.js app bundled with Vite. Build output lives at
`../assets/avatar-editor/` and is loaded by WordPress when a logged-in user opens the
"Customize Avatar" popup.

## Folder layout

```
mini-forum/
├── avatar-editor-src/             ← THIS folder (React source)
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx               (entry point — exposes window.MFAvatarEditor)
│       ├── AvatarEditor.jsx       (head-only customizer)
│       ├── AvatarEditor.css
│       ├── LegoHead.jsx           (3D head component)
│       ├── HairModels.jsx         (copied from game, paths via window.MF_AVATAR_GLB_BASE)
│       └── FaceModel.jsx          (copied from game)
└── assets/
    └── avatar-editor/             ← BUILD OUTPUT (don't edit by hand)
        ├── mf-avatar-editor.js    (~1.7MB — bundled IIFE)
        └── mf-avatar-editor.css
```

> **No `models/` folder in the plugin.** GLB models and PNG thumbnails are
> served from the Mini-Talks game origin (`https://mini-talks.com/models/`).
> The forum (mini-talks.org) loads them cross-origin — see `CORS_SETUP.md`.
>
> If you ever want to host the assets somewhere else (e.g. a CDN, or
> self-contained inside the plugin), use the `mf_avatar_glb_base` filter:
>
> ```php
> add_filter('mf_avatar_glb_base', function() {
>     return 'https://your-cdn.example.com/models';
> });
> ```

## Steps

### 1. Install dependencies (one-time)

```bash
cd avatar-editor-src
npm install
```

### 2. Build the bundle

```bash
npm run build
```

This produces:
- `../assets/avatar-editor/mf-avatar-editor.js`  (bundled JS, IIFE format)
- `../assets/avatar-editor/mf-avatar-editor.css` (bundled CSS)

WordPress automatically picks these up via `filemtime()` cache-busting in `mini-forum.php`.

### 3. Set up CORS on the asset host

See `../CORS_SETUP.md`. Without this, the browser blocks all GLB/PNG loads
and the editor canvas stays blank.

### 4. Test

1. Activate plugin in WordPress
2. Log in as any user
3. Visit forum profile → click "Customize Avatar"
4. First click → gender modal appears
5. Pick gender → editor mounts, you can customize and save
6. After save → all avatar images on the page refresh with the new PNG

## Development workflow (optional)

For hot reload during development:

```bash
npm run dev
```

This starts Vite on `http://localhost:5173`. You'd need to manually point WordPress to
this URL during development (not implemented — easier to just `npm run build` after changes).

## Troubleshooting

**"Editor not loaded" message in popup**
→ The bundle is missing. Run `npm run build` and verify
  `assets/avatar-editor/mf-avatar-editor.js` exists.

**Hair/face GLBs 404 in browser console**
→ The `models/` folder is missing or incomplete. Copy from the game's `public/models/`.

**Hair thumbnails don't show**
→ The `models/hair/png/` folder doesn't have the angle×color permutations.
  Each hair model needs files like `m_hair_01_front_0.png`, `m_hair_01_back_0.png`, etc.
  for all 7 colors × 4 angles = 28 thumbnails per hair.

**Save succeeds but old avatar still visible**
→ Hard refresh (Ctrl+Shift+R). If still wrong, check `wp_usermeta` for
  `mf_avatar_url` and `mf_avatar_version`.
