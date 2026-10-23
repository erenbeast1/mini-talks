// src/components/torsoInGame.js
//
// The shirt a child designed, on the figure that wears it in a scene.
//
// What was customised used to reach the game only as far as "which shirt": the
// writing and the stickers were in the saved customisation all along and
// nothing in GamePage ever drew them, so a Mini walked into every scene in a
// plain shirt. This draws them with the very same code the customisation
// screen uses, so the two cannot drift apart.
//
// It lives in its own file rather than inside GamePage so it can be run
// against a figure in a test without loading a 5,000-line page and a scene
// with it.

import * as THREE from 'three';
// Written with their extensions, unlike the rest of the app: this module is
// also loaded straight by node in tests/torso-design.mjs, and node will not
// guess at a missing one.
import { composeTorsoDesign, loadTorsoAtlas } from './torsoDesign.js';
import { drawTorsoText, sanitiseTorsoText } from './torsoText.js';

const getTorsoUvUrl = (torsoTextureId) =>
  torsoTextureId ? `/models/torso/${torsoTextureId}/${torsoTextureId}_uv.png` : null;

/** Is there anything printed on this Mini's shirt at all? */
export function hasShirtDesign(config) {
  if ((config?.torsoItems?.length || 0) > 0) return true;
  return !!sanitiseTorsoText(config?.torsoText || '');
}

/**
 * The finished shirt, as one canvas. It is drawn once — a scene does not
 * redraw it sixty times a second the way the editor does, it only ever needs
 * the finished thing.
 */
export async function composeShirtCanvas(config) {
  const url = getTorsoUvUrl(config?.torsoTextureId || null);
  const items = config?.torsoItems || [];
  if (items.length > 0) return composeTorsoDesign(url, items);
  // Minis made before the designer carry a single line of writing instead.
  const text = sanitiseTorsoText(config?.torsoText || '');
  if (!text) return null;
  const atlas = await loadTorsoAtlas(url);
  return atlas ? drawTorsoText(atlas, text) : null;
}

/**
 * Draw it, and hang it on the figure: every mesh the scene marked as this
 * Mini's shirt gets the finished texture. Returns a promise the scene waits
 * on with the hair and the face, or null when there is nothing to draw.
 */
export function applyTorsoDesign(figureRig, config) {
  if (!figureRig || !hasShirtDesign(config)) return null;
  return composeShirtCanvas(config)
    .then((canvas) => {
      if (!canvas) return;
      const texture = new THREE.CanvasTexture(canvas);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      // Same reasoning as the customisation screen: the chest is a small part
      // of a big texture, so a mipmap would hand the GPU a blurred copy.
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 16;
      // Sleeves included, always. With no shirt chosen the design is drawn
      // onto a plain one, and leaving the sleeves out of that left a Mini in
      // a white shirt with red arms: the body had become the shirt the child
      // designed and the arms were still the figure's default plastic.
      figureRig.traverse((child) => {
        if (!child.userData?.miniSkin) return;
        child.material = new THREE.MeshStandardMaterial({
          map: texture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3,
        });
      });
    })
    .catch(() => { /* the plain shirt stays on; a scene is not worth failing */ });
}
