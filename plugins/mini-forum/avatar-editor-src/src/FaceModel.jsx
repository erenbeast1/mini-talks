// src/FaceModel.jsx
// Adapted from Mini-Talks game. Path resolution via window.MF_AVATAR_GLB_BASE.

import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const AVAILABLE_DEFAULT_MODELS = {
  male:   { eyes: 'Man_Eye1.glb', eyebrows: 'Man_Eye_Brows1.glb', mouth: 'Man_Mouth1.glb' },
  female: { eyes: 'Man_Eye1.glb', eyebrows: 'Man_Eye_Brows1.glb', mouth: 'Man_Mouth1.glb' },
  child:  { eyes: 'Man_Eye1.glb', eyebrows: 'Man_Eye_Brows1.glb', mouth: 'Man_Mouth1.glb' },
};

function glbBase() {
  return (typeof window !== 'undefined' && window.MF_AVATAR_GLB_BASE)
    ? window.MF_AVATAR_GLB_BASE.replace(/\/+$/, '')
    : '';
}

const getDefaultModelPath = (gender, part) => {
  const filename = AVAILABLE_DEFAULT_MODELS[gender]?.[part];
  if (!filename) return null;
  return `${glbBase()}/face/${filename}`;
};

const getCustomModelPath = (modelName) => {
  if (!modelName) return null;
  return `${glbBase()}/face/${modelName}.glb`;
};

const resolveModelPath = (gender, part, selectedModelName) => {
  if (selectedModelName) return getCustomModelPath(selectedModelName);
  return getDefaultModelPath(gender, part);
};

function classifyMesh(meshName) {
  const n = meshName.toLowerCase();
  if (n.includes('brow') || n.includes('kas') || n.includes('kaş')) return 'eyebrow';
  if (n.includes('lash') || n.includes('kirpik') || n.includes('eyelash')) return 'eyelash';
  if (n.includes('lens') || n.includes('_cam')) return 'lens';
  if (n.includes('glasses')) return 'frame';
  if (n.includes('beard') || n.includes('mustache') || n.includes('sakal') || n.includes('biyik') || n.includes('facialhair')) return 'facialhair';
  return 'other';
}

const HIGHLIGHT_LUM_THRESHOLD = 0.75;

function isHighlightMesh(material) {
  if (!material) return false;
  if (material.map) return false;
  const c = material.color;
  const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
  return lum >= HIGHLIGHT_LUM_THRESHOLD;
}

function isHighlightByOriginal(child) {
  const origMat = child.userData._originalMaterial || child.material;
  if (origMat.map) return false;
  const c = origMat.color;
  const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
  return lum >= HIGHLIGHT_LUM_THRESHOLD;
}

function applyEyeColor(child, eyeColor) {
  const mat = child.material;
  if (!mat) return;
  if (!child.userData._originalMaterial) {
    child.userData._originalMaterial = mat.clone();
  }
  child.material = new THREE.MeshStandardMaterial({
    color: eyeColor,
    metalness: 0.1,
    roughness: 0.3,
  });
  child.material.needsUpdate = true;
}

function restoreEyeColor(child) {
  if (!child.userData._originalMaterial) return;
  child.material = child.userData._originalMaterial.clone();
  child.material.needsUpdate = true;
  delete child.userData._originalMaterial;
}

function FaceModelInner({ modelPath, part, position, rotation, scale, eyeColor, eyebrowColor, glassesColor }) {
  const groupRef = useRef();
  const cloneRef = useRef(null);
  const { scene } = useGLTF(modelPath);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.clear();
      cloneRef.current = null;
    }
  }, [modelPath]);

  useEffect(() => {
    if (!groupRef.current || !scene) return;
    const clone = scene.clone(true);
    cloneRef.current = clone;
    const isGlasses = modelPath.includes('glasses');

    if (part === 'eyebrows') {
      const browColor = eyebrowColor || '#000000';
      clone.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: browColor,
            metalness: 0.1,
            roughness: 0.8,
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }

    if (part === 'mouth') {
      const isFacialHair = modelPath.includes('facialhair');
      clone.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;

        if (isFacialHair && eyebrowColor) {
          const n = (child.name || '').toLowerCase();
          const isFHMesh = n.includes('facialhair') || n.includes('beard') || n.includes('mustache');
          if (!isFHMesh) return;
          if (!child.userData._origFHColor) {
            child.userData._origFHColor = child.material.color.clone();
            if (child.material.map) child.userData._origFHMap = child.material.map;
          }
          child.material = child.material.clone();
          child.material.color.set(eyebrowColor);
          if (child.material.map) child.material.map = null;
          child.material.needsUpdate = true;
        }
      });
    }

    if (part === 'eyes') {
      let hasOtherMesh = false;
      clone.traverse((child) => {
        if (child.isMesh && classifyMesh(child.name || '') === 'other') hasOtherMesh = true;
      });
      const isSunglasses = isGlasses && !hasOtherMesh;

      clone.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;

        const meshType = classifyMesh(child.name || '');

        if (meshType === 'eyebrow') {
          if (eyebrowColor) {
            if (!child.userData._origBrowColor) {
              child.userData._origBrowColor = child.material.color.clone();
              if (child.material.map) child.userData._origBrowMap = child.material.map;
            }
            child.material = child.material.clone();
            child.material.color.set(eyebrowColor);
            if (child.material.map) child.material.map = null;
            child.material.needsUpdate = true;
          }
          return;
        }

        if (meshType === 'eyelash') {
          const lashColor = eyebrowColor || '#4D1F00';
          if (!child.userData._origLashColor) {
            child.userData._origLashColor = child.material.color.clone();
            if (child.material.map) child.userData._origLashMap = child.material.map;
          }
          child.material = child.material.clone();
          child.material.color.set(lashColor);
          if (child.material.map) child.material.map = null;
          child.material.needsUpdate = true;
          return;
        }

        if (meshType === 'lens') return;

        if (meshType === 'frame') {
          if (glassesColor) {
            if (!child.userData._origFrameColor) {
              child.userData._origFrameColor = child.material.color.clone();
              if (child.material.map) child.userData._origFrameMap = child.material.map;
            }
            child.material = child.material.clone();
            child.material.color.set(glassesColor);
            if (!isSunglasses && child.material.map) child.material.map = null;
            child.material.metalness = 0.2;
            child.material.roughness = 0.4;
            child.material.needsUpdate = true;
          }
          child.userData._isSunglasses = isSunglasses;
          return;
        }

        // Other (eye iris/sclera)
        if (isHighlightMesh(child.material)) return;
        if (eyeColor) applyEyeColor(child, eyeColor);
      });
    }

    groupRef.current.clear();
    groupRef.current.add(clone);
  }, [scene, modelPath, part, glassesColor, eyeColor]);

  // Dynamic eyebrow color updates
  useEffect(() => {
    if (part !== 'eyebrows' || !cloneRef.current) return;
    const browColor = eyebrowColor || '#000000';
    cloneRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.color.set(browColor);
        child.material.needsUpdate = true;
      }
    });
  }, [eyebrowColor]);

  useEffect(() => {
    if (part !== 'eyes' || !cloneRef.current) return;
    cloneRef.current.traverse((child) => {
      if (!child.isMesh) return;
      const meshType = classifyMesh(child.name || '');

      if (meshType === 'eyelash') {
        if (eyebrowColor) {
          if (!child.userData._origLashColor) {
            child.userData._origLashColor = child.material.color.clone();
            if (child.material.map) child.userData._origLashMap = child.material.map;
          }
          child.material = child.material.clone();
          child.material.color.set(eyebrowColor);
          if (child.material.map) child.material.map = null;
          child.material.needsUpdate = true;
        } else if (child.userData._origLashColor) {
          child.material.color.copy(child.userData._origLashColor);
          if (child.userData._origLashMap) child.material.map = child.userData._origLashMap;
          child.material.needsUpdate = true;
          delete child.userData._origLashColor;
          delete child.userData._origLashMap;
        }
        return;
      }

      if (meshType !== 'eyebrow') return;

      if (eyebrowColor) {
        if (!child.userData._origBrowColor) {
          child.userData._origBrowColor = child.material.color.clone();
          if (child.material.map) child.userData._origBrowMap = child.material.map;
        }
        child.material = child.material.clone();
        child.material.color.set(eyebrowColor);
        if (child.material.map) child.material.map = null;
        child.material.needsUpdate = true;
      } else if (child.userData._origBrowColor) {
        child.material.color.copy(child.userData._origBrowColor);
        if (child.userData._origBrowMap) child.material.map = child.userData._origBrowMap;
        child.material.needsUpdate = true;
        delete child.userData._origBrowColor;
        delete child.userData._origBrowMap;
      }
    });
  }, [eyebrowColor]);

  useEffect(() => {
    if (part !== 'eyes' || !cloneRef.current) return;
    cloneRef.current.traverse((child) => {
      if (!child.isMesh) return;
      if (classifyMesh(child.name || '') !== 'other') return;
      if (isHighlightByOriginal(child)) return;
      if (eyeColor) applyEyeColor(child, eyeColor);
      else restoreEyeColor(child);
    });
  }, [eyeColor]);

  useEffect(() => {
    if (part !== 'eyes' || !cloneRef.current || !modelPath.includes('glasses')) return;
    cloneRef.current.traverse((child) => {
      if (!child.isMesh) return;
      if (classifyMesh(child.name || '') !== 'frame') return;
      const isSunglasses = !!child.userData._isSunglasses;

      if (glassesColor) {
        if (!child.userData._origFrameColor) {
          child.userData._origFrameColor = child.material.color.clone();
          if (child.material.map) child.userData._origFrameMap = child.material.map;
        }
        child.material = child.material.clone();
        child.material.color.set(glassesColor);
        if (!isSunglasses && child.material.map) child.material.map = null;
        child.material.metalness = 0.2;
        child.material.roughness = 0.4;
        child.material.needsUpdate = true;
      } else if (child.userData._origFrameColor) {
        child.material.color.copy(child.userData._origFrameColor);
        if (child.userData._origFrameMap) child.material.map = child.userData._origFrameMap;
        child.material.needsUpdate = true;
        delete child.userData._origFrameColor;
        delete child.userData._origFrameMap;
      }
    });
  }, [glassesColor]);

  useEffect(() => {
    if (part !== 'mouth' || !cloneRef.current || !modelPath.includes('facialhair')) return;
    cloneRef.current.traverse((child) => {
      if (!child.isMesh) return;
      const n = (child.name || '').toLowerCase();
      if (!n.includes('facialhair') && !n.includes('beard') && !n.includes('mustache')) return;

      if (eyebrowColor) {
        if (!child.userData._origFHColor) {
          child.userData._origFHColor = child.material.color.clone();
          if (child.material.map) child.userData._origFHMap = child.material.map;
        }
        child.material = child.material.clone();
        child.material.color.set(eyebrowColor);
        if (child.material.map) child.material.map = null;
        child.material.needsUpdate = true;
      } else if (child.userData._origFHColor) {
        child.material.color.copy(child.userData._origFHColor);
        if (child.userData._origFHMap) child.material.map = child.userData._origFHMap;
        child.material.needsUpdate = true;
        delete child.userData._origFHColor;
        delete child.userData._origFHMap;
      }
    });
  }, [eyebrowColor]);

  // v3.05: export modulu bu grubu bulabilsin diye isaretlenir (davranis degismez)
  return <group ref={groupRef} userData={{ mfPart: part }} position={position} rotation={rotation} scale={scale} />;
}

export function FaceModel({
  gender = 'male',  // Only used as fallback for the *default* mesh when no
                    // selectedModelName is provided. Always 'male' is fine —
                    // the gender system is gone. The default face mesh files
                    // (Man_Eye1.glb etc.) are gender-neutral in look.
  part = 'eyes',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  selectedModelName = null,
  eyeColor = null,
  eyebrowColor = null,
  glassesColor = null,
}) {
  const modelPath = resolveModelPath(gender, part, selectedModelName);
  if (!modelPath || modelPath.includes('/undefined')) return null;
  return (
    <FaceModelInner
      modelPath={modelPath}
      part={part}
      position={position}
      rotation={rotation}
      scale={scale}
      eyeColor={eyeColor}
      eyebrowColor={eyebrowColor}
      glassesColor={glassesColor}
    />
  );
}

// ─── Face model config (for the editor UI) — same as game ──────────────────
export const FACE_MODEL_CONFIG = {
  eyes: {
    male: {
      prefix: 'm_head_eye',
      folder: 'eyes/m_head_eye_glb',
      pngFolder: 'eyes/m_head_eye_png',
      count: 12,
      extras: [{ suffix: '13_(wrinkles)', label: 'Wrinkles' }],
    },
    female: { prefix: 'f_head_eye', folder: 'eyes/f_head_eye_glb', pngFolder: 'eyes/f_head_eye_png', count: 1 },
    child: {
      prefix: 'c_head_eye',
      folder: 'eyes/c_head_eye_glb',
      pngFolder: 'eyes/c_head_eye_png',
      count: 13,
      extras: [
        { suffix: '14_(pink blush)', label: 'Pink Blush' },
        { suffix: '15', label: 'Eyes 15' },
      ],
    },
  },
  glasses: {
    male:   { prefix: 'm_head_eye_glasses', folder: 'eyes/m_head_eye_glasses_glb', pngFolder: 'eyes/m_head_eye_glasses_png', count: 14 },
    female: { prefix: 'f_head_eye_glasses', folder: 'eyes/f_head_eye_glasses_glb', pngFolder: 'eyes/f_head_eye_glasses_png', count: 14 },
    child:  { prefix: 'c_head_eye_glasses', folder: 'eyes/c_head_eye_glasses_glb', pngFolder: 'eyes/c_head_eye_glasses_png', count: 14 },
  },
  mouth: {
    male:   { prefix: 'm_head_mouth', folder: 'mouth/m_head_mouth_glb', pngFolder: 'mouth/m_head_mouth_png', count: 18 },
    female: { prefix: 'f_head_mouth', folder: 'mouth/f_head_mouth_glb', pngFolder: 'mouth/f_head_mouth_png', count: 18 },
    child:  { prefix: 'c_head_mouth', folder: 'mouth/c_head_mouth_glb', pngFolder: 'mouth/c_head_mouth_png', count: 19 },
  },
  facialhair: {
    male:   { prefix: 'm_head_mouth_facialhair', folder: 'mouth/m_head_mouth_facialhair_glb', pngFolder: 'mouth/m_head_mouth_facialhair_png', count: 13 },
  },
};

const CATEGORY_LABELS = { eyes: 'Eyes', glasses: 'Glasses', mouth: 'Mouth', facialhair: 'Facial Hair' };

// ─── generateFaceItemsByCategory — visual-driven face categories ─────────────
//
// Replaces the old "gender + face-part" model with category names users see
// in the UI. The category determines which gender bucket(s) contribute items:
//
//   eyes              → male + child  (plain LEGO eyes, no eyelashes)
//   lashes            → female only   (f_head_eye — has eyelash meshes)
//   glasses           → male + child  (plain LEGO glasses)
//   lashes-glasses    → female only   (f_head_eye_glasses)
//   mouth             → male + child  (plain LEGO mouths)
//   lips              → female only   (f_head_mouth — painted lips)
//   beard             → male only     (m_head_mouth_facialhair)
//
// Each item starts with a "Default" sentinel (the original LEGO smile face)
// so users can always un-select. The modelName carries the full path so
// LegoHead routes to the correct GLB regardless of category.
const FACE_CATEGORY_SOURCES = {
  eyes:            { part: 'eyes',       genders: ['male', 'child']   },
  lashes:          { part: 'eyes',       genders: ['female']          },
  glasses:         { part: 'glasses',    genders: ['male', 'child']   },
  'lashes-glasses':{ part: 'glasses',    genders: ['female']          },
  mouth:           { part: 'mouth',      genders: ['male', 'child']   },
  lips:            { part: 'mouth',      genders: ['female']          },
  beard:           { part: 'facialhair', genders: ['male']            },
};

export const FACE_CATEGORIES = ['eyes', 'lashes', 'glasses', 'lashes-glasses', 'mouth', 'lips', 'beard'];

export const FACE_CATEGORY_LABELS = {
  eyes:             'Eyes',
  lashes:           'Lashes',
  glasses:          'Glasses',
  'lashes-glasses': 'Lashes & Glasses',
  mouth:            'Mouth',
  lips:             'Lips',
  beard:            'Beard',
};

// Which underlying face PART a category belongs to. Used when sending
// the final modelName to LegoHead — Eyes/Lashes/Glasses/Lashes-Glasses all
// resolve to LegoHead's "eyes" slot, etc.
export const FACE_CATEGORY_PARTS = {
  eyes:             'eyes',
  lashes:           'eyes',
  glasses:          'eyes',     // glasses are rendered ON the eye slot too
  'lashes-glasses': 'eyes',
  mouth:            'mouth',
  lips:             'mouth',
  beard:            'mouth',    // facialhair lives in the mouth slot
};

export function generateFaceItemsByCategory(category) {
  const cfg = FACE_CATEGORY_SOURCES[category];
  if (!cfg) return [{ type: 'default', img: null, label: 'Default', modelName: null }];
  const items = [{ type: 'default', img: null, label: 'Default', modelName: null }];
  for (const gender of cfg.genders) {
    const list = generateFaceItems(gender, cfg.part);
    for (const item of list) {
      if (item.type === 'default') continue;
      items.push(item);
    }
  }
  return items;
}

export function generateFaceItems(gender, category) {
  const config = FACE_MODEL_CONFIG[category]?.[gender];
  if (!config || config.count === 0) {
    return [{ type: 'default', img: null, label: 'Default', modelName: null }];
  }
  const label = CATEGORY_LABELS[category];
  const base = glbBase();
  const items = [{ type: 'default', img: null, label: 'Default', modelName: null }];

  for (let i = 1; i <= config.count; i++) {
    const num = String(i).padStart(2, '0');
    items.push({
      type: category,
      img: `${base}/face/${config.pngFolder}/${config.prefix}${num}.png`,
      label: `${label} ${i}`,
      modelName: `${config.folder}/${config.prefix}${num}`,
    });
  }
  if (config.extras) {
    config.extras.forEach((extra) => {
      items.push({
        type: category,
        img: `${base}/face/${config.pngFolder}/${config.prefix}${extra.suffix}.png`,
        label: extra.label,
        modelName: `${config.folder}/${config.prefix}${extra.suffix}`,
      });
    });
  }
  return items;
}

// ─── generateFaceItemsAll — gender-agnostic version ───────────────────────────
//
// Combines male + female + child variants of a given face category into a
// single flat list, prefixed by ONE shared "Default" sentinel. Used by the
// new editor UI where gender doesn't exist anymore — every user sees all
// available eyes/glasses/mouth/facialhair regardless of original gender.
//
// IMPORTANT: each item has a unique `modelName` because it includes the
// per-gender folder/prefix, so applying it on the LEGO head still routes to
// the correct GLB file.
const GENDER_ORDER = ['male', 'female', 'child']; // display order

export function generateFaceItemsAll(category) {
  const items = [{ type: 'default', img: null, label: 'Default', modelName: null }];
  for (const gender of GENDER_ORDER) {
    const list = generateFaceItems(gender, category);
    // generateFaceItems already prepends a Default — skip it (we have ours)
    for (const item of list) {
      if (item.type === 'default') continue;
      items.push(item);
    }
  }
  return items;
}
