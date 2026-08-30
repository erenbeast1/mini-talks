import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Build output → ../assets/avatar-editor/
 *   - mf-avatar-editor.js   (bundled, IIFE — exposes window.MFAvatarEditor)
 *   - mf-avatar-editor.css
 *
 * In production, WordPress enqueues these and the React app mounts into
 * #mf-avatar-editor-root when MFAvatarEditor.mount(rootEl, opts) is called
 * from mini-forum-avatar.js.
 *
 * GLB assets are NOT bundled — they live in ../models/ and are fetched at
 * runtime via window.MF_AVATAR_GLB_BASE (set by PHP via wp_localize_script).
 */
export default defineConfig({
  plugins: [react()],

  /*
   * `define` replaces these tokens at build time. React (and many other libs)
   * read process.env.NODE_ENV at runtime to decide between dev/prod paths;
   * in a browser bundle there's no `process` object, so without this define
   * the bundle throws "ReferenceError: process is not defined" on first run.
   *
   * We hard-code 'production' since this Vite config is only used for prod
   * builds (npm run build). The dev server (npm run dev) doesn't use the
   * library output, so this is safe.
   */
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({}),
    'process.platform': JSON.stringify(''),
    'process.version': JSON.stringify(''),
    'global': 'globalThis',
  },

  build: {
    outDir: path.resolve(__dirname, '../assets/avatar-editor'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: false,

    lib: {
      entry: path.resolve(__dirname, 'src/main.jsx'),
      name: 'MFAvatarEditor',
      formats: ['iife'],
      fileName: () => 'mf-avatar-editor.js',
    },

    rollupOptions: {
      output: {
        // Single CSS file
        assetFileNames: (asset) => {
          if (asset.name && asset.name.endsWith('.css')) return 'mf-avatar-editor.css';
          return 'assets/[name][extname]';
        },
        // Inline dynamic imports — single JS file
        inlineDynamicImports: true,
      },
    },
  },

  server: {
    port: 5173,
  },
});
