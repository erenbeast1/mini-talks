// src/LegoHead.jsx
// Renders the LEGO figure with: HEAD + ARMS + HANDS + TORSO visible,
// LEGS hidden (we want a "bust" portrait, not full figure).
//
// The torso receives a UV-mapped PNG texture chosen by the user's plugin role:
//   Family    → red    (02_red)
//   Expert    → green  (04_green)
//   Volunteer → blue   (03_blue)
//   Talk-Spot → orange (05_orange)
//
// The same lego-figure-2glb.glb is used as in the game; we just selectively
// hide/show meshes by name.
//
// Camera framing is bust-aware: we look at chest height with enough vertical
// room to see the head AND the upper torso, plus extra zoom-out for tall hair.

import React, { Suspense, useRef, useLayoutEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { HairModel, EXPRESSIVE_HAIR } from './HairModels.jsx';
import { FaceModel } from './FaceModel.jsx';

// ── URLs ─────────────────────────────────────────────────────────────────
function legoBodyUrl() {
  if (typeof window === 'undefined') return '';
  if (window.MF_AVATAR_BODY_GLB_URL) return window.MF_AVATAR_BODY_GLB_URL;
  const base = (window.MF_AVATAR_GLB_BASE || '').replace(/\/+$/, '');
  return `${base}/lego-figure-2glb.glb`;
}
function torsoUvUrl(torsoId) {
  if (!torsoId) return null;
  const base = (window.MF_AVATAR_GLB_BASE || '').replace(/\/+$/, '');
  return `${base}/torso/${torsoId}/${torsoId}_uv.png`;
}

// ── Constants ────────────────────────────────────────────────────────────
const HAIR_COLORS = [
  '#6E3B1A', '#834400', '#E7CA63', '#000000', '#A8A8A8', '#F4F4F4', '#A93A1A',
];
const SKIN_COLOR = '#F2D626';
const ARM_BASE_COLOR = '#FFFFFF'; // arms default to white when no texture

// ── Texture loaders (memoized via useMemo at the call site) ──────────────
function loadTorsoTexture(torsoId) {
  const url = torsoUvUrl(torsoId);
  if (!url) return null;
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous'; // required for cross-origin fetch
  const tex = loader.load(url);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
// Arm texture is the SAME UV PNG, but with offset+repeat so we sample only
// the small "arm" sub-region in the texture atlas (matches the game's mapping)
function loadArmTexture(torsoId) {
  const url = torsoUvUrl(torsoId);
  if (!url) return null;
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';
  const tex = loader.load(url);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // From the game: small square in upper-right of the UV atlas
  tex.offset.set(0.78, 0.42);
  tex.repeat.set(0.18, 0.18);
  return tex;
}

// ── Default camera framing (can be overridden live by the calibration panel) ─
//
// Default values: targets chin area, distance keeps full hair + arms visible.
// The calibration panel (?camcal=1 in URL or localStorage.mfCamCal=1) lets you
// adjust everything with sliders and copy the final values.
//
// Read order:
//   1. window.__MF_CAM_CAL (if present — set by the live calibration UI)
//   2. fall back to the hardcoded DEFAULT_FRAMING below
//
// Screenshot framing was previously a *tighter* override. That's gone — both
// 'preview' and 'screenshot' now use the same numbers, so the saved PNG is
// always what the user sees on screen.
const DEFAULT_FRAMING = {
  wrapperY:    0.8,
  targetY:     3.3,
  camY:        3.3,
  camZ:        6.8,
  camZExpr:    6.8,
  fov:         24,
  fovExpr:     24,
};

function getCameraFraming(hairTextureIndex) {
  const isExpressive = EXPRESSIVE_HAIR.has(hairTextureIndex);
  const cal = (typeof window !== 'undefined' && window.__MF_CAM_CAL) || {};
  const f = { ...DEFAULT_FRAMING, ...cal };

  return {
    position: new THREE.Vector3(0, f.camY, isExpressive ? f.camZExpr : f.camZ),
    target:   new THREE.Vector3(0, f.targetY, 0),
    fov:      isExpressive ? f.fovExpr : f.fov,
  };
}

function getWrapperY() {
  const cal = (typeof window !== 'undefined' && window.__MF_CAM_CAL) || {};
  return cal.wrapperY ?? DEFAULT_FRAMING.wrapperY;
}

function LockedCamera({ hairTextureIndex, calVersion }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 3.3, 0));

  useFrame(() => {
    const f = getCameraFraming(hairTextureIndex);
    camera.position.lerp(f.position, 0.18);
    target.current.lerp(f.target, 0.18);
    camera.lookAt(target.current);
    if (Math.abs(camera.fov - f.fov) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, f.fov, 0.18);
      camera.updateProjectionMatrix();
    }
  });
  // calVersion prop changes whenever the calibration UI tweaks a slider,
  // forcing a re-render so useFrame picks up the new window.__MF_CAM_CAL.
  return null;
}

// ── v3.05: sahneyi disariya bildiren yardimci (export modulu icin) ───────
// Hicbir mevcut davranisi degistirmez; yalnizca onSceneReady verilirse calisir.
function SceneReporter({ onReady }) {
  const three = useThree();
  React.useEffect(() => {
    if (typeof onReady === 'function') onReady(three);
  }, [onReady, three]);
  return null;
}

// ── Body GLB renderer ────────────────────────────────────────────────────
//
// Strategy per mesh (name-based, lowercase compared):
//   kafa / head        → SKIN_COLOR (yellow)
//   el   / hand        → SKIN_COLOR (yellow)
//   kol  / arm         → arm texture (UV sub-region of torso PNG) OR white
//   gövde / govde / torso / 3814uv  → torso UV texture
//   bacak / leg / ayak / foot       → HIDDEN
//   saç / sac / hair                → HIDDEN (we render hair separately on top)
//
// Anything else → hidden (defensive — the GLB has some helper meshes).
function FullBodyFromGLB({ torsoId }) {
  const group = useRef();
  const { scene } = useGLTF(legoBodyUrl());

  const torsoTexture = useMemo(() => loadTorsoTexture(torsoId), [torsoId]);
  const armTexture   = useMemo(() => loadArmTexture(torsoId),   [torsoId]);

  useLayoutEffect(() => {
    if (!group.current || !scene) return;

    const root = scene.clone(true);

    root.traverse((child) => {
      if (!child.isMesh) return;

      const name = (child.name || '').toLowerCase();

      const isHead   = name.includes('kafa') || name.includes('head');
      const isHair   = name.includes('saç') || name.includes('sac') || name.includes('hair');
      const isHand   = name.includes('el')  && !name.includes('elbi') && (name === 'el' || name.endsWith(' el') || name.includes('sol el') || name.includes('sağ el') || name.includes('sag el') || name.includes('hand'));
      const isArm    = (name.includes('kol') && !isHand) || name.includes('arm');
      const isTorso  = name.includes('gövde') || name.includes('govde') || name.includes('torso') || name === '3814uv.002' || name === '3814uv';
      const isLeg    = name.includes('bacak') || name.includes('leg')  || name.includes('ayak') || name.includes('foot');

      // Hide hair (we render our chosen hair model on top), legs (bust portrait),
      // and unrecognized meshes (skeleton helpers etc).
      if (isHair || isLeg) {
        child.visible = false;
        return;
      }
      if (!isHead && !isHand && !isArm && !isTorso) {
        child.visible = false;
        return;
      }

      // Pick material based on body part
      let material;
      if (isTorso && torsoTexture) {
        material = new THREE.MeshStandardMaterial({
          map: torsoTexture,
          metalness: 0.2,
          roughness: 0.45,
          envMapIntensity: 1.2,
        });
      } else if (isArm && armTexture) {
        material = new THREE.MeshStandardMaterial({
          map: armTexture,
          metalness: 0.2,
          roughness: 0.45,
          envMapIntensity: 1.2,
        });
      } else if (isArm) {
        // Fallback when texture failed to load: white arms
        material = new THREE.MeshStandardMaterial({
          color: ARM_BASE_COLOR,
          metalness: 0.2,
          roughness: 0.45,
          envMapIntensity: 1.2,
        });
      } else {
        // Head + Hands → skin color
        material = new THREE.MeshStandardMaterial({
          color: SKIN_COLOR,
          metalness: 0.1,
          roughness: 0.25,
          envMapIntensity: 1.5,
        });
      }
      child.material = material;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    group.current.clear();
    group.current.add(root);
  }, [scene, torsoTexture, armTexture]);

  // Same scale + position as the game's body group so hair/face offsets line up
  return <group ref={group} position={[0, -1, 0]} scale={[0.1, 0.1, 0.1]} />;
}

function HeadAndAccessories({ customization, torsoId }) {
  const {
    hairColor = 0,
    hairTextureIndex = 0,
    gender = 'female',
    eyeModelName = null,
    mouthModelName = null,
    eyeColor = null,
    eyebrowColor = null,
    glassesColor = null,
  } = customization;

  const isGlassesModel = eyeModelName && eyeModelName.includes('glasses');

  return (
    <>
      <Suspense fallback={null}>
        <FullBodyFromGLB torsoId={torsoId} />
      </Suspense>

      {/* Hair — same offsets as the game's LegoFigure */}
      <group position={[0, -1, 0]} scale={[0.1, 0.1, 0.1]}>
        <HairModel
          color={HAIR_COLORS[hairColor]}
          textureIndex={hairTextureIndex}
          position={[0, 31.5, 1.5]}
          rotation={[0, 0, 0]}
          scale={[0.9, 1.0, 1.0]}
          view="front"
        />
      </group>

      {/* Face parts */}
      <group position={[0, -1, 0]} scale={[0.1, 0.1, 0.1]}>
        <Suspense fallback={null}>
          <FaceModel
            gender={gender}
            part="eyes"
            position={eyeModelName ? [0, 29, 0.1] : [0, 29, 0.05]}
            rotation={eyeModelName ? [0, Math.PI, 0] : [0, 0, 0]}
            scale={[1, 1, 1]}
            selectedModelName={eyeModelName}
            eyeColor={eyeColor}
            eyebrowColor={eyebrowColor}
            glassesColor={isGlassesModel ? glassesColor : null}
          />
        </Suspense>

        {!eyeModelName && (
          <Suspense fallback={null}>
            <FaceModel
              gender={gender}
              part="eyebrows"
              position={[0, 35.8, 4.70]}
              rotation={[0, 9.425, 0]}
              scale={[1, 1, 1]}
              eyebrowColor={eyebrowColor}
            />
          </Suspense>
        )}

        <Suspense fallback={null}>
          <FaceModel
            gender={gender}
            part="mouth"
            position={[0, 28.8, 0]}
            rotation={mouthModelName ? [0, Math.PI, 0] : [0, 0, 0]}
            scale={[1, 1, 1]}
            selectedModelName={mouthModelName}
            eyebrowColor={eyebrowColor}
          />
        </Suspense>
      </group>
    </>
  );
}

/**
 * Main component.
 *
 * Props:
 *   customization     — { gender, hairColor, hairTextureIndex, eyeModelName, ... }
 *   zoomMode          — 'preview' (default) | 'screenshot'
 *   torsoId           — folder name under /models/torso/ (set from PHP based on role)
 */
// ── Calibration UI ──────────────────────────────────────────────────────
//
// Activated by one of:
//   - URL has ?camcal=1
//   - localStorage.mfCamCal === '1'
//
// Renders a small floating panel over the canvas with sliders for every
// framing parameter. Each slider writes to window.__MF_CAM_CAL and bumps
// a version counter so the camera/wrapper re-evaluate.
//
// The "Copy values" button drops a JS object to console + clipboard that
// you can paste back into DEFAULT_FRAMING when you've found numbers you like.

function isCalibrationEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.location.search.indexOf('camcal=1') !== -1) return true;
    if (window.localStorage && window.localStorage.getItem('mfCamCal') === '1') return true;
  } catch (e) {}
  return false;
}

const CAL_SLIDERS = [
  { key: 'wrapperY',  label: 'Figure Y (lift)',     min: -2,  max: 5,    step: 0.05 },
  { key: 'targetY',   label: 'Camera target Y',     min:  0,  max: 6,    step: 0.05 },
  { key: 'camY',      label: 'Camera Y',            min:  0,  max: 6,    step: 0.05 },
  { key: 'camZ',      label: 'Camera Z (normal)',   min:  2,  max: 12,   step: 0.1  },
  { key: 'camZExpr',  label: 'Camera Z (long hair)',min:  2,  max: 14,   step: 0.1  },
  { key: 'fov',       label: 'FOV (normal)',        min: 10,  max: 60,   step: 1    },
  { key: 'fovExpr',   label: 'FOV (long hair)',     min: 10,  max: 60,   step: 1    },
];

function CalibrationPanel({ values, onChange, onCopy, onReset }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 30,
        background: 'rgba(15, 23, 42, 0.92)',
        color: '#fff',
        padding: '12px 14px',
        borderRadius: 10,
        fontFamily: 'monospace',
        fontSize: 11,
        width: 240,
        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8, letterSpacing: 0.5, fontSize: 11 }}>
        📷 CAMERA CALIBRATION
      </div>
      {CAL_SLIDERS.map(s => (
        <div key={s.key} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ opacity: 0.85 }}>{s.label}</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>{values[s.key].toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={values[s.key]}
            onChange={e => onChange(s.key, parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#E52828' }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          type="button"
          onClick={onCopy}
          style={{
            flex: 1, padding: '6px 8px', fontSize: 10, fontWeight: 800,
            background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.3,
          }}
        >
          COPY VALUES
        </button>
        <button
          type="button"
          onClick={onReset}
          style={{
            flex: 1, padding: '6px 8px', fontSize: 10, fontWeight: 800,
            background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.3,
          }}
        >
          RESET
        </button>
      </div>
      <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6, lineHeight: 1.3 }}>
        URL: <code>?camcal=1</code><br/>
        or <code>localStorage.mfCamCal=1</code>
      </div>
    </div>
  );
}

const LegoHead = ({ customization = {}, torsoId = '', onSceneReady = null }) => {
  const { hairTextureIndex = 0 } = customization;
  const [calEnabled] = React.useState(isCalibrationEnabled);
  const [calValues, setCalValues] = React.useState(() => ({ ...DEFAULT_FRAMING }));
  const [calVersion, setCalVersion] = React.useState(0);

  // Push slider values into window.__MF_CAM_CAL so getCameraFraming + wrapper
  // pick them up. Done on every state change.
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__MF_CAM_CAL = calEnabled ? calValues : null;
    }
  }, [calEnabled, calValues]);

  const handleCalChange = React.useCallback((key, value) => {
    setCalValues(v => ({ ...v, [key]: value }));
    setCalVersion(n => n + 1);
  }, []);

  const handleCalCopy = React.useCallback(() => {
    const out = JSON.stringify(calValues, null, 2);
    const text = 'const DEFAULT_FRAMING = ' + out + ';';
    console.log('%c[Camera Calibration] Copy these values:', 'color:#16a34a;font-weight:bold');
    console.log(text);
    try { navigator.clipboard.writeText(text); } catch (e) {}
    alert('Values copied to clipboard + logged to console.\nPaste into LegoHead.jsx → DEFAULT_FRAMING.');
  }, [calValues]);

  const handleCalReset = React.useCallback(() => {
    setCalValues({ ...DEFAULT_FRAMING });
    setCalVersion(n => n + 1);
  }, []);

  const wrapperY = calEnabled ? calValues.wrapperY : DEFAULT_FRAMING.wrapperY;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, DEFAULT_FRAMING.camY, DEFAULT_FRAMING.camZ], fov: DEFAULT_FRAMING.fov }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        gl={{
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        dpr={[1, 2.5]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.4}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-5, 5, 5]} intensity={0.5} />
          <pointLight position={[0, -1, 3]} intensity={0.3} />
          <hemisphereLight skyColor="#ffffff" groundColor="#444444" intensity={0.5} />

          <Environment preset="city" environmentIntensity={0.5} />

          <LockedCamera hairTextureIndex={hairTextureIndex} calVersion={calVersion} />
          <SceneReporter onReady={onSceneReady} />

          <group position={[0, wrapperY, 0]}>
            <HeadAndAccessories customization={customization} torsoId={torsoId} />
          </group>

          <EffectComposer>
            <Bloom intensity={0.1} luminanceThreshold={0.7} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {calEnabled && (
        <CalibrationPanel
          values={calValues}
          onChange={handleCalChange}
          onCopy={handleCalCopy}
          onReset={handleCalReset}
        />
      )}
    </div>
  );
};

export default LegoHead;
