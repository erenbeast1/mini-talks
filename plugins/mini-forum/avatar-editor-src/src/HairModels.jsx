// src/HairModels.jsx
// Adapted from Mini-Talks game for plugin use.
// Only difference: GLB paths resolved via window.MF_AVATAR_GLB_BASE
// (set by main.jsx from PHP-localized config), not import.meta.url.

import { useGLTF } from '@react-three/drei';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';

// ─── TextureIndex ranges (must match the customization page exactly) ────────
//   male   →   1 –  44
//   female → 101 – 152
//   child  → 201 – 246
//   0      → bald (only male)
const M_COUNT = 44;
const F_COUNT = 52;
const C_COUNT = 46;

// ─── EXCLUDED_HAIR — same as game (UI-level filter) ──────────────────────────
export const EXCLUDED_HAIR = new Set([
  21,
  14,
  204,
]);

// ─── EXPRESSIVE_HAIR — same as game (Simple/Expressive filter) ───────────────
export const EXPRESSIVE_HAIR = new Set([
  // Male
  6, 15, 16, 22, 24, 26, 29, 30, 31, 32, 34, 35, 37, 44,
  // Female
  103, 105, 106, 107, 112, 113, 114, 116, 117, 118, 119,
  122, 123, 125, 127, 128, 129, 130, 135, 136, 137, 139,
  141, 142, 143, 144, 145, 146, 147,
  // Child
  208, 212, 214, 217, 218, 219, 220, 221, 222, 224, 225, 229, 242,
]);

// ─── HAIR_CATEGORY — globalId → category ──────────────────────────────────────
// Categories: 'short', 'medium', 'long', 'tied', 'curly', 'fun', 'bun'
// Built from Eren's manual classification of all 139 active hairs
// (44 male - 2 excluded) + 52 female + (46 child - 1 excluded).
// Used by the new category-based UI in AvatarEditor.jsx.
export const HAIR_CATEGORY = {
  // ─── MALE (1-44, excl. 14 and 21) ───
  1: 'short',  2: 'curly',  3: 'short',  4: 'short',  5: 'short',
  6: 'fun',    7: 'short',  8: 'fun',    9: 'short',  10: 'short',
  11: 'short', 12: 'curly', 13: 'short', 15: 'short', 16: 'medium',
  17: 'short', 18: 'curly', 19: 'short', 20: 'short', 22: 'short',
  23: 'short', 24: 'short', 25: 'short', 26: 'short', 27: 'short',
  28: 'short', 29: 'fun',   30: 'fun',   31: 'fun',   32: 'tied',
  33: 'short', 34: 'short', 35: 'tied',  36: 'short', 37: 'short',
  38: 'short', 39: 'short', 40: 'short', 41: 'short', 42: 'short',
  43: 'short', 44: 'short',

  // ─── FEMALE (101-152) ───
  101: 'long',   102: 'long',   103: 'tied',  104: 'curly', 105: 'tied',
  106: 'tied',   107: 'curly',  108: 'long',  109: 'long',  110: 'long',
  111: 'long',   112: 'medium', 113: 'tied',  114: 'tied',  115: 'long',
  116: 'tied',   117: 'curly',  118: 'curly', 119: 'bun',   120: 'medium',
  121: 'long',   122: 'curly',  123: 'tied',  124: 'long',  125: 'tied',
  126: 'long',   127: 'tied',   128: 'tied',  129: 'tied',  130: 'tied',
  131: 'medium', 132: 'bun',    133: 'curly', 134: 'short', 135: 'bun',
  136: 'bun',    137: 'curly',  138: 'medium',139: 'bun',   140: 'curly',
  141: 'tied',   142: 'bun',    143: 'bun',   144: 'bun',   145: 'bun',
  146: 'bun',    147: 'bun',    148: 'long',  149: 'long',  150: 'long',
  151: 'long',   152: 'long',

  // ─── CHILD (201-246, excl. 204) ───
  201: 'curly',  202: 'long',   203: 'curly', 205: 'medium', 206: 'medium',
  207: 'curly',  208: 'tied',   209: 'tied',  210: 'tied',   211: 'tied',
  212: 'fun',    213: 'medium', 214: 'fun',   215: 'long',   216: 'medium',
  217: 'fun',    218: 'tied',   219: 'fun',   220: 'fun',    221: 'fun',
  222: 'fun',    223: 'fun',    224: 'fun',   225: 'bun',    226: 'medium',
  227: 'medium', 228: 'medium', 229: 'medium',230: 'long',   231: 'medium',
  232: 'medium', 233: 'fun',    234: 'short', 235: 'medium', 236: 'short',
  237: 'short',  238: 'medium', 239: 'short', 240: 'short',  241: 'medium',
  242: 'fun',    243: 'fun',    244: 'medium',245: 'long',   246: 'medium',
};

// Ordered list of category keys for tab/sidebar UI
export const HAIR_CATEGORIES = ['short', 'medium', 'long', 'tied', 'curly', 'fun', 'bun'];

// Display labels (capitalized)
export const HAIR_CATEGORY_LABELS = {
  short:  'Short',
  medium: 'Medium',
  long:   'Long',
  tied:   'Tied',
  curly:  'Curly',
  fun:    'Fun',
  bun:    'Bun',
};

export const TERS_YONLU_SACLAR = new Set([
  2, 6, 17,
  104, 112, 116, 117, 118, 122, 133, 136, 137, 140, 149,
  201, 203, 206, 216, 224, 232,
]);

// Path resolver — uses window.MF_AVATAR_GLB_BASE set by WordPress
function glbBase() {
  return (typeof window !== 'undefined' && window.MF_AVATAR_GLB_BASE)
    ? window.MF_AVATAR_GLB_BASE.replace(/\/+$/, '')
    : '';
}

const hairModelPaths = {};
function buildHairPaths() {
  const base = glbBase();
  // Re-build only if needed
  if (hairModelPaths.__base === base && hairModelPaths.__filled) return hairModelPaths;
  for (const k of Object.keys(hairModelPaths)) delete hairModelPaths[k];
  for (let i = 1; i <= M_COUNT; i++) {
    hairModelPaths[i] = `${base}/hair/m_hair_${String(i).padStart(2, '0')}.glb`;
  }
  for (let i = 1; i <= F_COUNT; i++) {
    hairModelPaths[100 + i] = `${base}/hair/f_hair_${String(i).padStart(2, '0')}.glb`;
  }
  for (let i = 1; i <= C_COUNT; i++) {
    hairModelPaths[200 + i] = `${base}/hair/c_hair_${String(i).padStart(2, '0')}.glb`;
  }
  hairModelPaths.__base = base;
  hairModelPaths.__filled = true;
  return hairModelPaths;
}

// Default offset (game-tuned values)
export const DEFAULT_OFFSET = {
  position: [0, -3, -1.25],
  rotation: [0, Math.PI, 0],
  scale: [1, 1, 1],
};

const h = (index, partial) => [index, {
  position: partial.position ?? DEFAULT_OFFSET.position,
  rotation: partial.rotation ?? DEFAULT_OFFSET.rotation,
  scale:    partial.scale    ?? DEFAULT_OFFSET.scale,
}];

// ─── HAIR_MODEL_OFFSETS — copied verbatim from game ─────────────────────────
export const HAIR_MODEL_OFFSETS = Object.fromEntries([
  h(1, { position: [0, -2.7, -1.50], scale: [1.1, 0.9, 1] }),
  h(4, { position: [0, -2.7, -1.30], scale: [1.1, 1, 1] }),
  h(6, { position: [0, -2.2, -1.50], scale: [1, 0.9, 1] }),
  h(7, { position: [0, -2.85, -1.30], scale: [1.1, 1, 1] }),
  h(8, { position: [0, -3, -1.30], scale: [1.1, 1, 1] }),
  h(16, { position: [0.2, -3.2, -3.1], scale: [1.1, 1, 1] }),
  h(18, { position: [0, -2.3, -1.50], scale: [1.1, 0.9, 1] }),
  h(20, { position: [0, -2.3, -1.50], scale: [1.1, 0.9, 1] }),
  h(22, { position: [0, -1.8, -1.50], scale: [1.1, 0.85, 1] }),
  h(23, { position: [0, -2.3, -1.50], scale: [1.05, 0.9, 1] }),
  h(24, { position: [0, -2.3, -1.50], scale: [1, 0.9, 1] }),
  h(25, { position: [0, -2, -1.50], scale: [1.1, 0.9, 1] }),
  h(27, { position: [0, -2.3, -1.50], scale: [1, 0.9, 1] }),
  h(29, { position: [0, -1, -1.50], scale: [1, 0.7, 1] }),
  h(31, { position: [0, -2, -1.2], scale: [1.1, 0.8, 1] }),
  h(34, { position: [0, -2.3, -1.50], scale: [1, 0.85, 1] }),
  h(39, { position: [0, -3.1, -1.30], scale: [1.1, 1, 1] }),
  h(43, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(44, { position: [0, -1.5, -1.50], scale: [1, 0.9, 1] }),
  h(118, { position: [0.5, -3, -1.30], scale: [1.15, 1, 1] }),
  h(115, { position: [0, -2.3, -1.50], scale: [1.1, 0.90, 1] }),
  h(103, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(106, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(111, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(113, { position: [0, -3, -1.50], scale: [1.13, 1, 1] }),
  h(114, { position: [0, -2.6, -1.50], scale: [1.13, 0.9, 1] }),
  h(123, { position: [0, -3.2, -1.50], scale: [1.13, 1, 1.05] }),
  h(126, { position: [0, -1.8, -1.50], scale: [1, 0.85, 1] }),
  h(128, { position: [0, -3, -1.50], scale: [1.12, 1, 1] }),
  h(133, { position: [0, -2, -1.50], scale: [1.1, 0.85, 1] }),
  h(143, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(144, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(145, { position: [0, -2, -1.50], scale: [1.1, 0.85, 1] }),
  h(146, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(201, { position: [0, -2, -1.50], scale: [1, 0.85, 1] }),
  h(203, { position: [0, -1.8, -1.50], scale: [1, 0.85, 1] }),
  h(205, { position: [0, -4.5, -1.50], scale: [1.1, 1, 1] }),
  h(210, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(212, { position: [0, -1.5, -1.50], scale: [1.05, 0.8, 1] }),
  h(214, { position: [0, -1.5, -1.50], scale: [1.05, 0.85, 1] }),
  h(216, { position: [0, -1.5, -1.50], scale: [1.05, 0.85, 1] }),
  h(217, { position: [0, -2.2, -1.50], scale: [1.0, 0.87, 1] }),
  h(218, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(221, { position: [0, -1.2, -1.50], scale: [1.05, 0.8, 1] }),
  h(222, { position: [0, -1.2, -1.50], scale: [1.05, 0.8, 1] }),
  h(224, { position: [0, -1.8, -1.50], scale: [1.05, 0.8, 1] }),
  h(228, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(229, { position: [0, -2, -1.50], scale: [1.0, 0.9, 1] }),
  h(231, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(233, { position: [0, -2.4, -1.20], scale: [1.1, 0.9, 1] }),
  h(234, { position: [0, -2, -1.20], scale: [1.05, 0.85, 1] }),
  h(236, { position: [0, -3, -1.50], scale: [1.1, 1, 1] }),
  h(238, { position: [0, -2.3, -1.15], scale: [1.06, 0.87, 1] }),
  h(239, { position: [0, -1.5, -1.35], scale: [1.1, 0.85, 1] }),
  h(240, { position: [0, -2.1, -1.50], scale: [1.0, 0.9, 1] }),
  h(241, { position: [0, -2, -1.50], scale: [1.0, 0.9, 1] }),
  h(242, { position: [0, -2, -1.50], scale: [1.05, 0.8, 1] }),
  h(243, { position: [0, -1.8, -1.50], scale: [1.1, 0.85, 1] }),
  h(244, { position: [0, -2, -1.25], scale: [1.05, 0.85, 1] }),
  h(245, { position: [0, -1.8, -1.5], scale: [1.0, 0.82, 0.95] }),
  h(246, { position: [0, -2.4, -1.20], scale: [1.1, 0.9, 1] }),
]);

function HairModelInner({ modelPath, offset, color, position, rotation, scale, textureIndex }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = scene ? scene.clone(true) : null;

  const finalPosition = [
    position[0] + offset.position[0],
    position[1] + offset.position[1],
    position[2] + offset.position[2],
  ];
  const finalRotation = [
    rotation[0] + offset.rotation[0],
    rotation[1] + offset.rotation[1],
    rotation[2] + offset.rotation[2],
  ];
  const finalScale = [
    scale[0] * offset.scale[0],
    scale[1] * offset.scale[1],
    scale[2] * offset.scale[2],
  ];

  useLayoutEffect(() => {
    if (!clonedScene) return;
    const colorObj = new THREE.Color(color);
    const isDefaultColor = color.toLowerCase() === '#511800';

    clonedScene.traverse((child) => {
      if (!child.isMesh) return;

      if (isDefaultColor) {
        if (child.material) {
          child.material = child.material.clone();
          child.material.metalness = 0.2;
          child.material.roughness = 0.6;
        }
      } else {
        child.material = new THREE.MeshPhysicalMaterial({
          color: colorObj,
          metalness: 0.0,
          roughness: 0.22,
          clearcoat: 0.15,
          clearcoatRoughness: 0.20,
          specularIntensity: 0.5,
          envMapIntensity: 0.15,
        });
      }
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }, [clonedScene, color, textureIndex]);

  if (!clonedScene) return null;

  return (
    <primitive
      object={clonedScene}
      position={finalPosition}
      rotation={finalRotation}
      scale={finalScale}
    />
  );
}

export function HairModel({
  color = '#511800',
  textureIndex = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  view = 'front',
}) {
  if (textureIndex === 0) return null;
  buildHairPaths();
  const modelPath = hairModelPaths[textureIndex];
  if (!modelPath) {
    console.warn(`[HairModel] textureIndex ${textureIndex} → no GLB path`);
    return null;
  }
  const offset = HAIR_MODEL_OFFSETS[textureIndex] ?? DEFAULT_OFFSET;

  return (
    <HairModelInner
      modelPath={modelPath}
      offset={offset}
      color={color}
      position={position}
      rotation={rotation}
      scale={scale}
      textureIndex={textureIndex}
    />
  );
}

// Hair config helper (kept for backwards compat with thumb URL building)
export const HAIR_CONFIG = {
  male:   { count: M_COUNT, base: 0,   prefix: 'm' },
  female: { count: F_COUNT, base: 100, prefix: 'f' },
  child:  { count: C_COUNT, base: 200, prefix: 'c' },
};

// Single default hair — used when a user has no saved customization yet.
// Was per-gender before; gender system is gone.
export const DEFAULT_HAIR = 1; // m_hair_01 (short)

// PNG thumbnail base URL — globalId aware (no gender param needed).
//
// Resolves to one of:
//   .../hair/png/m_hair_NN   (globalId 1-99)
//   .../hair/png/f_hair_NN   (globalId 101-199)
//   .../hair/png/c_hair_NN   (globalId 201-299)
//
// The full thumbnail URL adds _{angle}_{colorIdx}.png at the call site.
export function hairThumbBaseById(globalId) {
  if (globalId === 0) return null; // bald has no thumb
  const base = glbBase();
  let prefix, localNum;
  if (globalId >= 200) {        // child
    prefix = 'c';
    localNum = globalId - 200;
  } else if (globalId >= 100) { // female
    prefix = 'f';
    localNum = globalId - 100;
  } else {                       // male
    prefix = 'm';
    localNum = globalId;
  }
  const num = String(localNum).padStart(2, '0');
  return `${base}/hair/png/${prefix}_hair_${num}`;
}

// Legacy helper — used by older code that still passes (gender, hairNum).
// Kept for backwards compat during the transition; new code should use
// hairThumbBaseById() instead.
export function hairThumbBase(gender, hairNum) {
  const cfg = HAIR_CONFIG[gender];
  if (!cfg) return null;
  const base = glbBase();
  const num = String(hairNum).padStart(2, '0');
  return `${base}/hair/png/${cfg.prefix}_hair_${num}`;
}

// ─── Build the full hair item list — flat, category-aware, gender-agnostic ──
//
// Each item: { textureIndex, category, basePath, type }
//   textureIndex — globalId (used to load GLB + PNG thumbnails)
//   category     — one of HAIR_CATEGORIES (or 'bald' for the no-hair sentinel)
//   basePath     — URL prefix for thumbnail PNGs (null for bald)
//   type         — same as category, except 'bald' (used by the editor)
//
// The list is built ONCE per glbBase change. Excluded hairs (14, 21, 204)
// are filtered out automatically because they're absent from HAIR_CATEGORY.
let _hairItemsCache = null;
let _hairItemsCacheBase = '';

export function getAllHairItems() {
  const base = glbBase();
  if (_hairItemsCache && _hairItemsCacheBase === base) return _hairItemsCache;

  const items = [];
  // Sentinel "bald" item — shown at the top of every category in the UI.
  items.push({
    textureIndex: 0,
    category: 'bald',
    type: 'bald',
    basePath: null,
    label: 'Bald',
  });

  // All other hairs come from HAIR_CATEGORY (which defines what's selectable).
  const sortedIds = Object.keys(HAIR_CATEGORY)
    .map(s => parseInt(s, 10))
    .sort((a, b) => a - b);

  for (const globalId of sortedIds) {
    if (EXCLUDED_HAIR.has(globalId)) continue;
    items.push({
      textureIndex: globalId,
      category:     HAIR_CATEGORY[globalId],
      type:         HAIR_CATEGORY[globalId],
      basePath:     hairThumbBaseById(globalId),
      label:        `${HAIR_CATEGORY[globalId]}-${globalId}`,
    });
  }

  _hairItemsCache = items;
  _hairItemsCacheBase = base;
  return items;
}

// Filter helper — returns items for a single category, with bald prepended.
// Used by the editor when the user picks a tab.
export function getHairItemsByCategory(category) {
  const all = getAllHairItems();
  const bald = all.find(h => h.type === 'bald');
  const inCat = all.filter(h => h.category === category);
  return bald ? [bald, ...inCat] : inCat;
}
