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

/**
 * Four stickers to be going on with — the others Eren looked at and did not
 * think were up to it, which they were not: a shape that reads at 48px does
 * not necessarily read on a shirt. They go when Elif's pack arrives.
 *
 * A handful of stickers to be going on with, drawn here as SVG so the feature
 * works before Elif's pack arrives and so nothing has to be fetched. Her pack
 * replaces this list; the drawing code does not care where an icon came from.
 */
const svg = (body, fill) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    // width and height, not just a viewBox: an SVG with no intrinsic size
    // loads with naturalWidth 0, and drawImage then draws nothing at all.
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">` +
    `<g fill="${fill}" stroke="#1D1D1B" stroke-width="2.2" stroke-linejoin="round">${body}</g></svg>`
  )}`;

export const BUILTIN_ICONS = [
  { id: 'star',  label: 'Star',  src: svg('<path d="M24 4l6 12 13 2-9.5 9 2.3 13L24 33l-11.8 7 2.3-13L5 18l13-2z"/>', '#FFCC00') },
  { id: 'heart', label: 'Heart', src: svg('<path d="M24 42S5 29 5 17.5A9.5 9.5 0 0 1 24 13a9.5 9.5 0 0 1 19 4.5C43 29 24 42 24 42z"/>', '#E31E24') },
  { id: 'bolt',  label: 'Bolt',  src: svg('<path d="M27 3L9 27h11l-3 18 20-26H25z"/>', '#FFCC00') },
  { id: 'smile', label: 'Smiley',src: svg('<circle cx="24" cy="24" r="19"/><circle cx="17" cy="19" r="2.6" fill="#1D1D1B" stroke="none"/><circle cx="31" cy="19" r="2.6" fill="#1D1D1B" stroke="none"/><path d="M15 29a10 10 0 0 0 18 0" fill="none"/>', '#FFCC00') },
];


/* ── A child's own picture ──────────────────────────────────────────────── */

// What is accepted, and what it is turned into. The picture is not kept as the
// file that was chosen: it is drawn onto a canvas and re-encoded, which scales
// it down to something a shirt can use and, as a side effect, drops every
// scrap of metadata the original carried. A photograph taken on a phone can
// hold the place it was taken; none of that should end up saved against a
// child's Mini.
export const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const UPLOAD_MAX_BYTES = 6 * 1024 * 1024;   // before shrinking
export const UPLOAD_PX = 256;                      // after
export const MAX_UPLOADS_PER_SIDE = 4;             // these ride in the Mini's own record

/**
 * Turn a chosen file into something that can be put on a shirt: a square-ish
 * PNG data URL of at most UPLOAD_PX on its longest side, transparency kept.
 * Rejects anything that is not one of UPLOAD_TYPES or is too big to be worth
 * reading in the first place.
 */
export function fileToIconSrc(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('no file')); return; }
    if (!UPLOAD_TYPES.includes(file.type)) { reject(new Error('type')); return; }
    if (file.size > UPLOAD_MAX_BYTES) { reject(new Error('size')); return; }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
      const ratio = Math.min(1, UPLOAD_PX / longest);
      const w = Math.max(1, Math.round(img.naturalWidth * ratio));
      const h = Math.max(1, Math.round(img.naturalHeight * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

/** How many of the items on a side came from the child's own pictures. */
export function uploadCount(items, side) {
  return items.filter((i) => (i.side || 'front') === side && i.from === 'upload').length;
}

export const MAX_ITEMS_PER_SIDE = 10;
// Full panel width would never fit inside the safe margins, so the slider
// would have a dead top end. This is the largest that still fits.
export const MAX_SCALE = 0.78;
export const MAX_TEXT_LENGTH = 16;

const rad = (deg) => (deg * Math.PI) / 180;

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

/**
 * Keep an item inside the safe area, whatever the editor tried to set — and
 * the whole of it, not just its middle: dragging a word to the edge used to
 * leave half of it cut off at the seam, which is right for a sticker that is
 * meant to run off the shoulder and wrong for a name.
 *
 * An item too big to fit the safe area at all is centred rather than refused;
 * the size slider is the thing to turn down, and it is right there.
 */
export function clampItem(item) {
  const scale = Math.min(MAX_SCALE, Math.max(0.08, item.scale));
  const rotation = ((item.rotation % 360) + 360) % 360;
  const bounds = itemBounds({ ...item, scale });
  // A turned item needs the box that contains it turned, not its own box, or
  // a corner pokes out past the seam at 45°.
  const a = rad(rotation);
  const cos = Math.abs(Math.cos(a));
  const sin = Math.abs(Math.sin(a));
  const halfW = (bounds.w * cos + bounds.h * sin) / 2;
  const halfH = (bounds.w * sin + bounds.h * cos) / 2;
  const minX = SAFE.x + halfW, maxX = 1 - SAFE.x - halfW;
  const minY = SAFE.y + halfH, maxY = 1 - SAFE.y - halfH;
  return {
    ...item,
    scale,
    x: minX > maxX ? 0.5 : Math.min(maxX, Math.max(minX, item.x)),
    y: minY > maxY ? 0.5 : Math.min(maxY, Math.max(minY, item.y)),
    rotation,
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

/** Box roughly covering an item, in panel fractions — also used for hit-testing. */
export function itemBounds(item) {
  const w = Math.max(0.12, item.scale);
  const h = item.type === 'text' ? Math.max(0.10, item.scale * 0.34) : w;
  return { w, h, x0: item.x - w / 2, x1: item.x + w / 2, y0: item.y - h / 2, y1: item.y + h / 2 };
}

/**
 * Panel coordinates run 0..1 both ways, but the panel itself is wider than it
 * is tall, so a circle drawn in them would be an ellipse on the shirt. Angles
 * and distances are therefore worked out in a space corrected by this.
 */
export function panelAspect(side, atlasW = 1, atlasH = 1) {
  const p = PANELS[side] || PANELS.front;
  return ((p.u1 - p.u0) * atlasW) / ((p.v1 - p.v0) * atlasH);
}

/** A point in the item's own frame: undo its turn, so the box is square again. */
function toLocal(item, px, py, aspect) {
  const dx = (px - item.x) * aspect;
  const dy = py - item.y;
  const a = -rad(item.rotation || 0);
  return { x: (dx * Math.cos(a) - dy * Math.sin(a)) / aspect, y: dx * Math.sin(a) + dy * Math.cos(a) };
}

/** ...and back out again. */
function toPanel(item, lx, ly, aspect) {
  const dx = lx * aspect;
  const a = rad(item.rotation || 0);
  return {
    x: item.x + (dx * Math.cos(a) - ly * Math.sin(a)) / aspect,
    y: item.y + dx * Math.sin(a) + ly * Math.cos(a),
  };
}

/** The four corners of an item, turned with it. */
export function itemCorners(item, aspect) {
  const b = itemBounds(item);
  return [
    ['nw', -b.w / 2, -b.h / 2], ['ne', b.w / 2, -b.h / 2],
    ['se', b.w / 2, b.h / 2],   ['sw', -b.w / 2, b.h / 2],
  ].map(([id, lx, ly]) => ({ id, ...toPanel(item, lx, ly, aspect) }));
}

/** The turning handle, on a stem above the item — the same idea as the stud. */
export function itemRotateHandle(item, aspect) {
  const b = itemBounds(item);
  return toPanel(item, 0, -b.h / 2 - 0.09, aspect);
}

// Fingers are not precise, and this is for children.
const HANDLE_GRAB = 0.075;

/** Did a tap land on one of the selected item's handles? */
export function hitHandle(item, px, py, aspect) {
  if (!item) return null;
  const near = (p) => {
    const dx = (px - p.x) * aspect, dy = py - p.y;
    return Math.sqrt(dx * dx + dy * dy) <= HANDLE_GRAB;
  };
  const r = itemRotateHandle(item, aspect);
  if (near(r)) return 'rotate';
  const corner = itemCorners(item, aspect).find(near);
  return corner ? 'resize' : null;
}

/** Which item a tap landed on: the last drawn one wins, as on screen. */
export function hitTest(items, side, px, py, aspect = 1) {
  const onSide = items.filter((i) => (i.side || 'front') === side);
  for (let i = onSide.length - 1; i >= 0; i -= 1) {
    const item = onSide[i];
    const b = itemBounds(item);
    const local = toLocal(item, px, py, aspect);
    if (Math.abs(local.x) <= b.w / 2 && Math.abs(local.y) <= b.h / 2) return item.id;
  }
  return null;
}

/**
 * The selection, drawn into the texture: a box turned with the item, a square
 * at each corner to pull it bigger or smaller, and a handle on a stem above it
 * to turn it. They live on the shirt, so they follow the figure when it is
 * turned and need nothing projected back from 3D; and the same geometry that
 * draws them is what hitHandle tests against, so what is grabbed is exactly
 * what is seen.
 */
function drawSelection(ctx, item, rect) {
  const b = itemBounds(item);
  const cx = rect.x + item.x * rect.w;
  const cy = rect.y + item.y * rect.h;
  const w = b.w * rect.w;
  const h = b.h * rect.h;
  const unit = rect.w;
  const knob = Math.max(5, unit * 0.035);
  const line = Math.max(2, unit * 0.012);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad(item.rotation || 0));

  ctx.strokeStyle = '#0055BF';
  ctx.lineWidth = line;
  ctx.setLineDash([Math.max(4, unit * 0.022), Math.max(3, unit * 0.016)]);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([]);

  // the stem and its handle
  const stem = 0.09 * rect.h;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(0, -h / 2 - stem);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -h / 2 - stem, knob * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.stroke();

  // the corners
  ctx.fillStyle = '#FFFFFF';
  [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.rect(x - knob / 2, y - knob / 2, knob, knob);
    ctx.fill();
    ctx.stroke();
  });

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
export function drawTorsoDesign(atlas, items, icons = {}, opts = {}) {
  const { selectedId = null, target = null } = opts;
  // The chest is only about 17% of the atlas across, so whatever the atlas is
  // drawn at, the panel gets a sixth of it — at 2x a 1024 atlas that is barely
  // 350px for the whole shirt front, and writing on it came out soft. Three
  // times, up to 4096, gives the panel about 530px on a 1024 atlas. Phones get
  // half that: the memory matters more there than the last of the sharpness.
  const ceiling = (typeof window !== 'undefined' && window.innerWidth < 900) ? 2048 : 4096;
  const scale = 3;
  const w = Math.min(ceiling, (atlas.naturalWidth || atlas.width) * scale);
  const h = Math.min(ceiling, (atlas.naturalHeight || atlas.height) * scale);

  // Dragging redraws this on every frame, so the editor passes the same canvas
  // back in rather than having one allocated and thrown away sixty times a
  // second.
  const canvas = target || document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
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
      // The selection is painted into the texture rather than floated over the
      // page in HTML: it then sits on the shirt itself, follows the figure when
      // it turns, and needs nothing projected back from 3D to screen.
      if (item.id === selectedId) drawSelection(ctx, item, rect);
      ctx.restore();
    }
  }

  return canvas;
}
