// src/components/torsoDesign.js
//
// What is printed on a Mini's shirt: any number of pieces of writing and any
// number of icons, each placed, sized and turned where the child wants it, on
// the front of the shirt or the back.
//
// This replaces the single line of text that used to be baked into the middle
// of the chest (torsoText.js). That was the wrong shape for what was wanted:
// one string in one place, with nothing to move, re-order or delete.
//
// WHERE THINGS GO
// The torso is painted from a UV atlas, /models/torso/{id}/{id}_uv.png, so a
// drawing on the chest is really a drawing in the patch of that atlas which
// the chest is mapped to. Both patches were measured from the figure's own
// GLB rather than guessed: the torso mesh is turned 90° about X, so in its
// local space the body runs along -z, the chest faces +y and the back faces
// -y. Of its 500 triangles, 188 face each way; rasterising those into the
// atlas and taking the largest connected island gives the two rectangles
// below. Both were then checked the other way round — a block painted into
// each one was rendered on the model, landed where it should, and did not
// bleed onto the other side.
export const PANELS = {
  front: { u0: 0.0078, u1: 0.1797, v0: 0.5273, v1: 0.6719 },
  back:  { u0: 0.0078, u1: 0.1797, v0: 0.7031, v1: 0.8516 },
};

export const SIDES = ['front', 'back'];

// The panel is a trapezoid — shoulders wider than waist — so a margin is kept
// all round and items are clamped inside it rather than being allowed to slide
// under an arm or over the collar.
const SAFE = { x: 0.10, y: 0.08 };

/**
 * Fonts offered for writing. All are Google Fonts under the SIL Open Font
 * License, so they are free to use in a product, and all are heavy enough to
 * survive being read on a figure a few centimetres tall.
 *
 * `latinOnly` marks a face that has no Turkish letters: for those, and only
 * those, ş/ğ/ı fold to their ASCII shapes, because a missing glyph would be
 * substituted from some other font and look broken mid-word.
 */
export const FONTS = [
  { id: 'classic', label: 'Classic', family: 'Montserrat',    weight: 800, latinOnly: false },
  { id: 'fun',     label: 'Fun',     family: 'Luckiest Guy',  weight: 400, latinOnly: true  },
  { id: 'block',   label: 'Block',   family: 'Bungee',        weight: 400, latinOnly: false },
  { id: 'round',   label: 'Round',   family: 'Fredoka',       weight: 600, latinOnly: false },
  { id: 'hand',    label: 'Hand',    family: 'Patrick Hand',  weight: 400, latinOnly: false },
];

export const DEFAULT_FONT = FONTS[0].id;

export const fontById = (id) => FONTS.find((f) => f.id === id) || FONTS[0];

// LEGO's own brand colours, the same ones the rest of the app uses.
export const TEXT_COLOURS = [
  { id: 'black',  hex: '#1D1D1B' },
  { id: 'white',  hex: '#FFFFFF' },
  { id: 'red',    hex: '#E31E24' },
  { id: 'blue',   hex: '#0055BF' },
  { id: 'green',  hex: '#237841' },
  { id: 'yellow', hex: '#FFCC00' },
  { id: 'orange', hex: '#F57C1F' },
  { id: 'pink',   hex: '#EC4899' },
  { id: 'purple', hex: '#7B1FA2' },
  { id: 'brown',  hex: '#6D4C41' },
];

// Caps. A shirt with thirty things on it is not a design, and every item is
// carried in the Mini's saved customisation, so the count is bounded on
// purpose rather than by accident.
export const MAX_ITEMS_PER_SIDE = 10;
export const MAX_TEXT_LENGTH = 16;

const FOLD = { 'Ş': 'S', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C', 'İ': 'I', 'Â': 'A', 'Î': 'I', 'Û': 'U' };

/**
 * What a child may write. Letters (Turkish included), digits, spaces and a
 * few marks that come up in a name or a shout: ! ? . , ' -
 *
 * Anything else is dropped rather than refused, so typing an emoji simply
 * leaves nothing behind instead of throwing an error at a child mid-word.
 */
export function sanitiseText(raw, fontId) {
  if (!raw) return '';
  let out = String(raw).toLocaleUpperCase('tr-TR');
  if (fontById(fontId).latinOnly) {
    out = out.split('').map((ch) => FOLD[ch] ?? ch).join('');
  }
  return out
    .split('')
    .filter((ch) => /[A-ZÇĞİÖŞÜ0-9 !?.,'-]/.test(ch))
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trimStart()
    .slice(0, MAX_TEXT_LENGTH);
}

/** A new piece of writing, dropped in the middle of the panel. */
export function newTextItem(side = 'front') {
  return {
    id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type: 'text',
    side,
    x: 0.5, y: 0.45,     // of the panel, from its top-left
    scale: 0.7,          // of the usable width
    rotation: 0,         // degrees
    text: '',
    fontId: DEFAULT_FONT,
    colour: '#1D1D1B',
    bold: false,
    italic: false,
    underline: false,
  };
}

/** A new icon, same idea. `src` is a URL the editor can load. */
export function newIconItem(src, side = 'front', meta = {}) {
  return {
    id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type: 'icon',
    side,
    x: 0.5, y: 0.45,
    scale: 0.4,
    rotation: 0,
    src,
    ...meta,              // e.g. { from: 'library' | 'upload', name }
  };
}

/** Keep an item inside the safe area, whatever the editor tried to set. */
export function clampItem(item) {
  const half = Math.max(0.02, item.scale) / 2;
  const minX = SAFE.x + half * 0.2, maxX = 1 - SAFE.x - half * 0.2;
  return {
    ...item,
    x: Math.min(maxX, Math.max(minX, item.x)),
    y: Math.min(1 - SAFE.y, Math.max(SAFE.y, item.y)),
    scale: Math.min(1.0, Math.max(0.08, item.scale)),
    rotation: ((item.rotation % 360) + 360) % 360,
  };
}

/**
 * The browser does not load a web font until something needs it, and a canvas
 * asking for a font that has not loaded silently gets a different one. So the
 * fonts a design uses are loaded, and waited for, before anything is drawn.
 */
export async function ensureFonts(items) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const families = new Set(
    items.filter((i) => i.type === 'text' && i.text)
         .map((i) => fontById(i.fontId))
         .map((f) => `${f.weight} 48px "${f.family}"`)
  );
  try {
    await Promise.all([...families].map((spec) => document.fonts.load(spec)));
  } catch {
    // A font that will not load is not worth failing a shirt over; the canvas
    // falls back and the design still appears.
  }
}

function panelRect(side, w, h) {
  const p = PANELS[side] || PANELS.front;
  return { x: p.u0 * w, y: p.v0 * h, w: (p.u1 - p.u0) * w, h: (p.v1 - p.v0) * h };
}

function drawText(ctx, item, rect) {
  const f = fontById(item.fontId);
  const text = sanitiseText(item.text, item.fontId);
  if (!text) return;

  const usable = rect.w * (1 - SAFE.x * 2);
  const target = usable * item.scale;

  // Largest size that keeps the line inside the width it was given.
  let size = Math.round(rect.h * 0.34);
  const style = `${item.italic ? 'italic ' : ''}${item.bold ? 900 : f.weight}`;
  for (; size > 5; size -= 1) {
    ctx.font = `${style} ${size}px "${f.family}", Montserrat, sans-serif`;
    if (ctx.measureText(text).width <= target) break;
  }

  ctx.save();
  ctx.translate(rect.x + item.x * rect.w, rect.y + item.y * rect.h);
  ctx.rotate((item.rotation * Math.PI) / 180);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = item.colour || '#1D1D1B';
  ctx.fillText(text, 0, 0);
  if (item.underline) {
    const width = ctx.measureText(text).width;
    ctx.fillRect(-width / 2, size * 0.42, width, Math.max(1, size * 0.08));
  }
  ctx.restore();
}

function drawIcon(ctx, item, rect, image) {
  if (!image) return;
  const usable = rect.w * (1 - SAFE.x * 2);
  const w = usable * item.scale;
  const ratio = (image.naturalHeight || image.height) / (image.naturalWidth || image.width || 1);
  const h = w * (ratio || 1);

  ctx.save();
  ctx.translate(rect.x + item.x * rect.w, rect.y + item.y * rect.h);
  ctx.rotate((item.rotation * Math.PI) / 180);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * Draw a whole design onto a copy of the shirt's atlas.
 *
 * `atlas`   an already-loaded image of {id}_uv.png
 * `items`   every item, both sides; each is drawn into its own panel
 * `icons`   id -> loaded HTMLImageElement, for the icon items
 *
 * Returns the canvas; the caller wraps it in a texture. The canvas is drawn at
 * twice the atlas size, capped at 2048, because a panel is only about 17% of
 * the atlas across and the letters would otherwise be soft; the artwork is
 * merely scaled up, and only what is drawn on top gets the extra resolution.
 */
export function drawTorsoDesign(atlas, items, icons = {}) {
  const scale = 2;
  const w = Math.min(2048, (atlas.naturalWidth || atlas.width) * scale);
  const h = Math.min(2048, (atlas.naturalHeight || atlas.height) * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(atlas, 0, 0, w, h);

  for (const side of SIDES) {
    const rect = panelRect(side, w, h);
    const onThisSide = items
      .filter((i) => (i.side || 'front') === side)
      .slice(0, MAX_ITEMS_PER_SIDE);
    // Back to front, so "move forwards" means what it says.
    for (const item of onThisSide) {
      ctx.save();
      // Nothing may escape its own panel — a letter dragged to the edge is
      // cut at the seam rather than wrapping onto a sleeve.
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      if (item.type === 'text') drawText(ctx, item, rect);
      else drawIcon(ctx, item, rect, icons[item.id] || icons[item.src]);
      ctx.restore();
    }
  }

  return canvas;
}
