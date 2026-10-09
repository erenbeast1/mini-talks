// src/components/FaceModel.jsx
import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const AVAILABLE_DEFAULT_MODELS = {
  male:   { eyes: 'Man_Eye1.glb', eyebrows: 'Man_Eye_Brows1.glb', mouth: 'Man_Mouth1.glb' },
  female: { eyes: 'Man_Eye1.glb', eyebrows: 'Man_Eye_Brows1.glb', mouth: 'Man_Mouth1.glb' },
  child:  { eyes: 'Man_Eye1.glb', eyebrows: 'Man_Eye_Brows1.glb', mouth: 'Man_Mouth1.glb' },
};

const getDefaultModelPath = (gender, part) => {
  const f = AVAILABLE_DEFAULT_MODELS[gender]?.[part];
  return f ? `/models/face/${f}` : null;
};
const getCustomModelPath = (_part, modelName) =>
  modelName ? `/models/face/${modelName}.glb` : null;
const resolveModelPath = (gender, part, sel) =>
  sel ? getCustomModelPath(part, sel) : getDefaultModelPath(gender, part);

function classifyMesh(meshName) {
  const n = meshName.toLowerCase();
  if (n.includes('brow') || n.includes('kas') || n.includes('kaş')) return 'eyebrow';
  if (n.includes('lash') || n.includes('kirpik') || n.includes('eyelash')) return 'eyelash';
  if (n.includes('lens') || n.includes('_cam')) return 'lens';
  if (n.includes('glasses')) return 'frame';
  if (n.includes('beard') || n.includes('mustache') || n.includes('sakal') || n.includes('biyik') || n.includes('facialhair')) return 'facialhair';
  return 'other';
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic log
// ─────────────────────────────────────────────────────────────────────────────
function logCloneDimensions(clone, part, modelPath) {
  if (part !== 'eyes') return;
  const eyes = [], brows = [];
  clone.traverse((c) => {
    if (!c.isMesh) return;
    const t = classifyMesh(c.name || '');
    if (t === 'other') eyes.push(c);
    if (t === 'eyebrow') brows.push(c);
  });
  clone.updateMatrixWorld(true);
  const dump = (meshes, label) => {
    if (!meshes.length) { console.log(`  📏 [${label}] yok`); return; }
    const box = new THREE.Box3();
    meshes.forEach((m) => box.expandByObject(m));
    const s = new THREE.Vector3(); box.getSize(s);
    const c = new THREE.Vector3(); box.getCenter(c);
    console.log(`  📏 [${label}] n=${meshes.length} size=[${s.x.toFixed(3)},${s.y.toFixed(3)},${s.z.toFixed(3)}] center=[${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)}]`);
  };
  console.log(`📏 ──── ${modelPath.split('/').pop()} ────`);
  dump(eyes, 'eyes');
  dump(brows, 'brows');
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-align eyes: Default Man_Eye1.glb göz boyutunu referans alır.
// Custom dosyalar (m_/f_/c_ prefix'li) bu boyuta scale edilir.
// Scale göz merkezinin etrafında uygulanır → eye dünya pozisyonu korunur,
// sadece büyür/küçülür ve brows kendiliğinden doğru yere yerleşir.
// ─────────────────────────────────────────────────────────────────────────────
const REF_EYE_SIZE_X = 4.158; // Default Man_Eye1.glb log'undan ölçüldü
const ALIGN_TOLERANCE_PCT = 0.03; // %3 altında zaten hizalı sayılır

function isCustomEyeFile(modelPath) {
  const fname = modelPath.split('/').pop() || '';
  return /^[mfc]_/.test(fname); // m_, f_, c_ prefix'li dosyalar
}

function measureEyeBbox(clone) {
  const refs = [];
  clone.traverse((c) => {
    if (c.isMesh && classifyMesh(c.name || '') === 'other') refs.push(c);
  });
  if (refs.length === 0) return null;
  clone.updateMatrixWorld(true);
  const box = new THREE.Box3();
  refs.forEach((m) => box.expandByObject(m));
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { refs, size, center };
}

function autoAlignEyes(clone, modelPath) {
  if (!isCustomEyeFile(modelPath)) return; // Default dokunulmaz

  const m = measureEyeBbox(clone);
  if (!m || m.size.x === 0) return;

  const sizeDelta = Math.abs(m.size.x - REF_EYE_SIZE_X) / REF_EYE_SIZE_X;
  if (sizeDelta < ALIGN_TOLERANCE_PCT) {
    console.log(`✓ [align skip] ${modelPath.split('/').pop()}: zaten hizalı (delta ${(sizeDelta*100).toFixed(1)}%)`);
    return;
  }

  const s = REF_EYE_SIZE_X / m.size.x;
  const eyeCenter = m.center.clone();

  // Scale uygula
  clone.scale.multiplyScalar(s);

  // Scale'i göz merkezi etrafında uygula → eye world position sabit kalsın
  // Yeni mesh-local pos = old * s, biz eski pos'a geri çekmek için clone.position'ı kaydırırız
  clone.position.sub(eyeCenter.clone().multiplyScalar(s - 1));

  console.log(
    `🔧 [align] ${modelPath.split('/').pop()}: ` +
    `eye size ${m.size.x.toFixed(3)} → ${REF_EYE_SIZE_X.toFixed(3)} ` +
    `(scale×${s.toFixed(3)} eye-center'da)`
  );
}

const HIGHLIGHT_LUM_THRESHOLD = 0.75;
function isHighlightMesh(material) {
  if (!material || material.map) return false;
  const c = material.color;
  return c.r * 0.299 + c.g * 0.587 + c.b * 0.114 >= HIGHLIGHT_LUM_THRESHOLD;
}
function isHighlightByOriginal(child) {
  const m = child.userData._originalMaterial || child.material;
  if (m.map) return false;
  const c = m.color;
  return c.r * 0.299 + c.g * 0.587 + c.b * 0.114 >= HIGHLIGHT_LUM_THRESHOLD;
}
function applyEyeColor(child, eyeColor) {
  if (!child.material) return;
  if (!child.userData._originalMaterial) child.userData._originalMaterial = child.material.clone();
  child.material = new THREE.MeshStandardMaterial({ color: eyeColor, metalness: 0.1, roughness: 0.3 });
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

  useEffect(() => { console.log('🚀 [FaceModel v15] scale-to-default-eyes'); }, []);

  useEffect(() => {
    if (groupRef.current) { groupRef.current.clear(); cloneRef.current = null; }
  }, [modelPath]);

  useEffect(() => {
    if (!groupRef.current || !scene) return;

    const clone = scene.clone(true);
    cloneRef.current = clone;
    const isGlasses = modelPath.includes('glasses');

    logCloneDimensions(clone, part, modelPath);
    if (part === 'eyes') autoAlignEyes(clone, modelPath);

    if (part === 'eyebrows') {
      const browColor = eyebrowColor || '#000000';
      clone.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({ color: browColor, metalness: 0.1, roughness: 0.8 });
          child.castShadow = true; child.receiveShadow = true;
        }
      });
    }

    if (part === 'mouth') {
      const isFacialHair = modelPath.includes('facialhair');
      clone.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true; child.receiveShadow = true;
        if (isFacialHair && eyebrowColor) {
          const n = (child.name || '').toLowerCase();
          if (!n.includes('facialhair') && !n.includes('beard') && !n.includes('mustache')) return;
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
      let hasOther = false;
      clone.traverse((c) => { if (c.isMesh && classifyMesh(c.name || '') === 'other') hasOther = true; });
      const isSunglasses = isGlasses && !hasOther;

      clone.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true; child.receiveShadow = true;
        const t = classifyMesh(child.name || '');

        if (t === 'eyebrow') {
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

        if (t === 'eyelash') {
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

        if (t === 'lens') return;

        if (t === 'frame') {
          if (glassesColor) {
            if (!child.userData._origFrameColor) {
              child.userData._origFrameColor = child.material.color.clone();
              if (child.material.map) child.userData._origFrameMap = child.material.map;
            }
            child.material = child.material.clone();
            child.material.color.set(glassesColor);
            if (!isSunglasses && child.material.map) child.material.map = null;
            child.material.metalness = 0.2; child.material.roughness = 0.4;
            child.material.needsUpdate = true;
          }
          child.userData._isSunglasses = isSunglasses;
          return;
        }

        if (isHighlightMesh(child.material)) return;
        if (eyeColor) applyEyeColor(child, eyeColor);
      });
    }

    groupRef.current.clear();
    groupRef.current.add(clone);
  }, [scene, modelPath, part, glassesColor, eyeColor]);

  useEffect(() => {
    if (part !== 'eyebrows' || !cloneRef.current) return;
    const c = eyebrowColor || '#000000';
    cloneRef.current.traverse((ch) => {
      if (ch.isMesh && ch.material) { ch.material.color.set(c); ch.material.needsUpdate = true; }
    });
  }, [eyebrowColor]);

  useEffect(() => {
    if (part !== 'eyes' || !cloneRef.current) return;
    cloneRef.current.traverse((child) => {
      if (!child.isMesh) return;
      const t = classifyMesh(child.name || '');

      if (t === 'eyelash') {
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
          delete child.userData._origLashColor; delete child.userData._origLashMap;
        }
        return;
      }

      if (t !== 'eyebrow') return;
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
        delete child.userData._origBrowColor; delete child.userData._origBrowMap;
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
      const isSun = !!child.userData._isSunglasses;
      if (glassesColor) {
        if (!child.userData._origFrameColor) {
          child.userData._origFrameColor = child.material.color.clone();
          if (child.material.map) child.userData._origFrameMap = child.material.map;
        }
        child.material = child.material.clone();
        child.material.color.set(glassesColor);
        if (!isSun && child.material.map) child.material.map = null;
        child.material.metalness = 0.2; child.material.roughness = 0.4;
        child.material.needsUpdate = true;
      } else if (child.userData._origFrameColor) {
        child.material.color.copy(child.userData._origFrameColor);
        if (child.userData._origFrameMap) child.material.map = child.userData._origFrameMap;
        child.material.needsUpdate = true;
        delete child.userData._origFrameColor; delete child.userData._origFrameMap;
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
        delete child.userData._origFHColor; delete child.userData._origFHMap;
      }
    });
  }, [eyebrowColor]);

  return <group ref={groupRef} position={position} rotation={rotation} scale={scale} />;
}

export function FaceModel({
  gender = 'male', part = 'eyes',
  position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1],
  selectedModelName = null, eyeColor = null, eyebrowColor = null, glassesColor = null,
}) {
  const modelPath = resolveModelPath(gender, part, selectedModelName);
  if (!modelPath || modelPath === 'undefined' || modelPath.includes('/undefined')) return null;
  return (
    <FaceModelInner
      modelPath={modelPath} part={part}
      position={position} rotation={rotation} scale={scale}
      eyeColor={eyeColor} eyebrowColor={eyebrowColor} glassesColor={glassesColor}
    />
  );
}

export const preloadFaceModels = () => {
  Object.entries(AVAILABLE_DEFAULT_MODELS).forEach(([gender, parts]) => {
    Object.entries(parts).forEach(([part, filename]) => {
      if (filename) {
        const path = getDefaultModelPath(gender, part);
        if (path) { try { useGLTF.preload(path); } catch (e) {} }
      }
    });
  });
};

const MODEL_CONFIG_PRELOAD = {
  eyes: {
    male:   { prefix: 'm_head_eye', folder: 'eyes/m_head_eye_glb', count: 12 },
    female: { prefix: 'f_head_eye', folder: 'eyes/f_head_eye_glb', count: 1  },
    child:  { prefix: 'c_head_eye', folder: 'eyes/c_head_eye_glb', count: 13 },
  },
  glasses: {
    male:   { prefix: 'm_head_eye_glasses', folder: 'eyes/m_head_eye_glasses_glb', count: 14 },
    female: { prefix: 'f_head_eye_glasses', folder: 'eyes/f_head_eye_glasses_glb', count: 14 },
    child:  { prefix: 'c_head_eye_glasses', folder: 'eyes/c_head_eye_glasses_glb', count: 14 },
  },
  mouth: {
    male:   { prefix: 'm_head_mouth', folder: 'mouth/m_head_mouth_glb', count: 18 },
    female: { prefix: 'f_head_mouth', folder: 'mouth/f_head_mouth_glb', count: 18 },
    child:  { prefix: 'c_head_mouth', folder: 'mouth/c_head_mouth_glb', count: 19 },
  },
  facialhair: {
    male:   { prefix: 'm_head_mouth_facialhair', folder: 'mouth/m_head_mouth_facialhair_glb', count: 13 },
  },
};

export const preloadCustomFaceModels = (gender = 'male') => {
  const cfgs = [
    ...(MODEL_CONFIG_PRELOAD.eyes?.[gender] ? [MODEL_CONFIG_PRELOAD.eyes[gender]] : []),
    ...(MODEL_CONFIG_PRELOAD.glasses?.[gender] ? [MODEL_CONFIG_PRELOAD.glasses[gender]] : []),
    ...(MODEL_CONFIG_PRELOAD.mouth?.[gender] ? [MODEL_CONFIG_PRELOAD.mouth[gender]] : []),
    ...(MODEL_CONFIG_PRELOAD.facialhair?.[gender] ? [MODEL_CONFIG_PRELOAD.facialhair[gender]] : []),
  ];
  cfgs.forEach(c => {
    for (let i = 1; i <= c.count; i++) {
      const num = String(i).padStart(2, '0');
      const path = getCustomModelPath(null, `${c.folder}/${c.prefix}${num}`);
      if (path && !path.includes('/undefined')) { try { useGLTF.preload(path); } catch (e) {} }
    }
  });
};