// src/components/torsoText.js
//
// Writing on a Mini's t-shirt.
//
// The torso is textured from a UV atlas, /models/torso/{id}/{id}_uv.png, so the
// text cannot simply be drawn "on the chest" — it has to be drawn into the
// patch of that atlas which the chest happens to be mapped to. This file knows
// where that patch is, and is the only place that does.
//
// HOW THE PATCH WAS FOUND (so it can be redone if the model changes):
// the figure's own GLB carries the UVs, so nothing had to be guessed. The
// torso mesh (Gövde in lego-figure-2glb.glb) is rotated 90° about X, which
// means in its local space the body runs along -z and the chest faces +y. Of
// its 500 triangles, 188 face the chest direction; rasterising those into the
// atlas and taking the largest connected island gives the rectangle below.
// It was then checked the other way round: a test texture with a red block in
// this rectangle was applied to the model and rendered — the block landed on
// the chest, covered it, and nothing appeared on the back.
export const CHEST_UV = { u0: 0.0078, u1: 0.1797, v0: 0.5273, v1: 0.6719 };

// The caps are deliberate. The shirt is read at 30px in the header pill and on
// a figure a few centimetres tall in a scene, so anything longer stops being
// legible; and this is a children's product where the text a Mini writes is
// seen by their parent and expert, so the alphabet stays narrow on purpose.
export const TORSO_TEXT_MAX = 10;

/**
 * Letters, digits and spaces only, upper case, length capped. Everything else
 * is dropped rather than rejected, so typing an emoji simply does not appear
 * instead of throwing an error at a child.
 *
 * Turkish letters are folded to their ASCII shapes (Ş→S, Ğ→G …) because the
 * atlas patch is small and the diacritics turn to mush at this size.
 */
const FOLD = { 'Ş': 'S', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C', 'İ': 'I', 'I': 'I', 'Â': 'A', 'Î': 'I', 'Û': 'U' };

export function sanitiseTorsoText(raw) {
  if (!raw) return '';
  return String(raw)
    .toLocaleUpperCase('tr-TR')
    .split('')
    .map((ch) => FOLD[ch] ?? ch)
    .filter((ch) => /[A-Z0-9 ]/.test(ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, TORSO_TEXT_MAX);
}

// Where inside the chest patch the writing sits. The patch is a trapezoid —
// the shoulders are wider than the waist — so the text is kept away from the
// sides, and placed a little above the middle, where a slogan sits on a real
// shirt rather than across the belly.
const INSET_X = 0.17;   // of the patch width, each side
const CENTRE_Y = 0.54;  // of the patch height, measured from its top
const MAX_HEIGHT = 0.20;

/**
 * Average luminance of the patch, so the writing can be dark on a light shirt
 * and light on a dark one without anyone having to choose a colour.
 */
function patchIsDark(ctx, x, y, w, h) {
  try {
    const { data } = ctx.getImageData(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    let sum = 0, n = 0;
    // every 4th pixel is plenty for an average and keeps this cheap
    for (let i = 0; i < data.length; i += 16) {
      if (data[i + 3] < 8) continue;
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      n++;
    }
    return n > 0 && sum / n < 140;
  } catch {
    return false; // tainted canvas — assume a light shirt, black text
  }
}

/**
 * Draw `text` into the chest patch of an already-loaded atlas image, on a
 * canvas of its own. Returns the canvas; the caller wraps it in a texture.
 *
 * The canvas is drawn at twice the atlas size: the chest patch is only about
 * 17% of the atlas across, so at 1024 the writing would have ~150px to live in
 * and would come out soft. The artwork is merely scaled up, the letters are
 * drawn at the larger size, and only they get sharper.
 */
export function drawTorsoText(image, text) {
  const clean = sanitiseTorsoText(text);
  const scale = 2;
  const w = Math.min(2048, (image.naturalWidth || image.width) * scale);
  const h = Math.min(2048, (image.naturalHeight || image.height) * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, w, h);
  if (!clean) return canvas;

  // The atlas is sampled with flipY = false everywhere in this project, so v
  // runs down from the top of the image, the same way canvas y does.
  const px = CHEST_UV.u0 * w;
  const py = CHEST_UV.v0 * h;
  const pw = (CHEST_UV.u1 - CHEST_UV.u0) * w;
  const ph = (CHEST_UV.v1 - CHEST_UV.v0) * h;

  const dark = patchIsDark(ctx, px, py, pw, ph);
  const boxW = pw * (1 - INSET_X * 2);
  const boxH = ph * MAX_HEIGHT;

  // Largest size that fits the box in both directions.
  let size = Math.round(boxH);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (; size > 6; size -= 1) {
    ctx.font = `900 ${size}px Montserrat, Arial, sans-serif`;
    if (ctx.measureText(clean).width <= boxW) break;
  }

  const cx = px + pw / 2;
  const cy = py + ph * CENTRE_Y;

  // A soft halo in the opposite colour, so the writing survives a patterned
  // shirt without a box drawn around it.
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(2, size * 0.14);
  ctx.strokeStyle = dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)';
  ctx.strokeText(clean, cx, cy);
  ctx.fillStyle = dark ? '#FFFFFF' : '#1D1D1B';
  ctx.fillText(clean, cx, cy);

  return canvas;
}
