// src/components/LegoFigure.jsx
import React, { Suspense, useRef, useLayoutEffect, useMemo, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import { drawTorsoText, sanitiseTorsoText } from './torsoText';
import { drawTorsoDesign, resolveIconSrc, PANELS } from './torsoDesign';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { HairModel } from './HairModels';
import { FaceModel } from './FaceModel';

const legoFigureUrl = new URL('../assets/models/lego-figure-2glb.glb', import.meta.url).href;

// Writing on the shirt — the chest patch of the atlas and the drawing live in
// torsoText.js, so the avatar editor and this figure cannot drift apart.
//
// This used to hand back a texture straight away and fill it in when the atlas
// had loaded. The placeholder it started from was a transparent canvas, and a
// transparent texture on the shirt renders BLACK — so every time someone typed,
// the shirt went black until the atlas had loaded and the canvas had been
// composed, and stayed black for good if that ever failed. What you see while
// waiting has to be the plain shirt, so the composing now happens off to one
// side and the result is swapped in only once it is ready.
function composeTorsoText(url, text) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const texture = new THREE.CanvasTexture(drawTorsoText(img, text));
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        resolve(texture);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('atlas yuklenemedi: ' + url));
    img.src = url;
  });
}

// Torso texture'ları - assets/textures/torso/ klasöründe olmalı
// index 0 = varsayılan (texture yok), index 1+ = PNG texture'lar
const getTorsoUvUrl = (torsoTextureId) =>
  torsoTextureId ? `/models/torso/${torsoTextureId}/${torsoTextureId}_uv.png` : null;

// Legs UV texture'ları artık public/models/legs/{id}/{id}_uv.png yolundan çekiliyor
const getLegsUvUrl = (legTextureId) =>
  legTextureId ? `/models/legs/${legTextureId}/${legTextureId}_uv.png` : null;

// ─────────────────────────────────────────────────────────────────────────────
// Kategori bazlı OrbitControls target — kamera pozisyonuna dokunmadan
// sadece bakış noktasını kaydırır, mouse rotasyonu engellenmez
// ─────────────────────────────────────────────────────────────────────────────
const CAMERA_TARGETS = {
  hair:    new THREE.Vector3(0, 2.2, 0),
  face:    new THREE.Vector3(0, 1.95, 0),
  // Designing the shirt: the torso runs y 0.60..2.46 and the head reaches
  // 3.02, so this looks between them and from far enough to hold both.
  design:  new THREE.Vector3(0, 1.75, 0),
  default: new THREE.Vector3(0, 1.0, 0),
};

const CAMERA_POSITIONS = {
  hair:    new THREE.Vector3(0, 2.4, 5.5),
  face:    new THREE.Vector3(0, 1.95, 5.0),
  design:  new THREE.Vector3(0, 1.75, 4.6),
  default: new THREE.Vector3(0, 1, 6),  // torso/legs için yakın + ortalanmış
};

function CameraController({ cameraMode, controlsRef }) {
  useEffect(() => {
    const target = CAMERA_TARGETS[cameraMode] ?? CAMERA_TARGETS.default;
    const position = CAMERA_POSITIONS[cameraMode] ?? CAMERA_POSITIONS.default;
    let frame;
    let interacted = false;

    // User interaction olursa animasyonu durdur — mouse/touch'a karışma
    const onStart = () => { interacted = true; };
    const controls = controlsRef.current;
    if (controls) controls.addEventListener('start', onStart);

    const animate = () => {
      if (!controlsRef.current || interacted) return;
      const c = controlsRef.current;
      const camera = c.object;

      c.target.lerp(target, 0.1);
      camera.position.lerp(position, 0.1);
      c.update();

      const targetDist = c.target.distanceTo(target);
      const posDist = camera.position.distanceTo(position);
      if (targetDist > 0.01 || posDist > 0.01) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      if (controls) controls.removeEventListener('start', onStart);
    };
  }, [cameraMode]);

  return null;
}


/**
 * A texture that only ever appears once it has actually loaded.
 *
 * TextureLoader.load() hands back a texture with no image in it yet, and a
 * texture with no image renders BLACK — which is why a white shirt flashed
 * black, and why a long-sleeved one flashed over a short-sleeved one, every
 * time the choice changed. Until the new one is ready the previous one stays
 * on the figure, and if there was none the material simply has no map and
 * shows the plain colour underneath.
 */
function useLoadedTexture(url, configure) {
  const [texture, setTexture] = useState(null);
  const configureRef = useRef(configure);
  configureRef.current = configure;

  useEffect(() => {
    if (!url) { setTexture(null); return undefined; }
    let cancelled = false;
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (cancelled) { t.dispose(); return; }
        t.flipY = false;
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = THREE.ClampToEdgeWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        configureRef.current?.(t);
        setTexture(t);
      },
      undefined,
      () => { /* keep whatever is on the figure rather than going black */ },
    );
    return () => { cancelled = true; };
  }, [url]);

  return texture;
}

function LegoModel({ view, customization, design }) {
  const group = useRef();
  const hairGroup = useRef();
  const faceGroup = useRef();
  const { scene } = useGLTF(legoFigureUrl);
  
   const { 
    hairColor = 0,
    hairTextureIndex = 0,
    gender = 'male',
    headTextureIndex, 
    torsoTextureId = null,
    torsoText = '',
    legTextureId = null,
    eyeModelName = null,
    mouthModelName = null,
    eyeColor = null,
    eyebrowColor = null,
    glassesColor = null,
  } = customization;
  
const hairColors = [
'#6E3B1A',
  '#834400',  // 1: Kahverengi 2
  //'#834400',  // 0: Kahve
  //'#BF5B21',  // 1: Açık Kahve
  '#E7CA63',  // 2: Sarı          ← orijinal
  '#000000',  // 3: Siyah         ← orijinal
  '#A8A8A8',  // 4: Gri           ← orijinal
  '#F4F4F4',  // 5: Beyaz         ← orijinal
'#A93A1A',  // 6: Kızıl — kahve-kırmızı bakır
];

 const cleanTorsoText = sanitiseTorsoText(torsoText);

 // The shirt exactly as it has always been loaded. This is what is shown while
 // any writing is still being composed, and what it falls back to if that ever
 // fails — never a blank texture.
 const plainTorsoTexture = useLoadedTexture(getTorsoUvUrl(torsoTextureId));

 // ── Designing the shirt ────────────────────────────────────────────────
 // While the designer is open the torso is painted from the design rather
 // than from the atlas alone: the same atlas with the child's writing and
 // stickers drawn into the chest and back panels. It is redrawn onto one kept
 // canvas so dragging does not allocate a 2048px one per frame.
 const designActive = !!design?.active;
 // The items belong to the Mini, not to the editor: once they are on the
 // shirt they stay on it after Save, which is what "it went back to normal
 // when I left" was about.
 const designItems = (designActive ? design?.items : customization.torsoItems) || [];
 const designWanted = designActive || designItems.length > 0;
 const [designAtlas, setDesignAtlas] = useState(null);
 const designCanvasRef = useRef(null);
 const designTextureRef = useRef(null);
 const [, bumpDesign] = useState(0);

 // A design needs something to be drawn onto. Usually that is the chosen
 // shirt's atlas; with no shirt chosen — which is how the Torso tab opens —
 // a plain one is made in its place, the same off-white the figure wears by
 // default. Going straight into the designer without picking a shirt first
 // used to leave it with nothing to draw on.
 useEffect(() => {
    if (!designWanted) { setDesignAtlas(null); return undefined; }
    const url = getTorsoUvUrl(torsoTextureId);
    if (!url) {
      const blank = document.createElement('canvas');
      blank.width = blank.height = 512;
      const ctx = blank.getContext('2d');
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, 512, 512);
      const img = new Image();
      img.onload = () => setDesignAtlas(img);
      img.src = blank.toDataURL('image/png');
      return undefined;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (!cancelled) setDesignAtlas(img); };
    img.onerror = () => { if (!cancelled) setDesignAtlas(null); };
    img.src = url;
    return () => { cancelled = true; };
  }, [designWanted, torsoTextureId]);

 // An icon item carries the address of its picture, not the picture, so the
 // pictures in use are loaded here and kept. Splitting the designer into a
 // panel and a hook lost this, which is why a sticker could be added, counted
 // and selected, and still never appear on the shirt.
 //
 // A child's own picture is addressed as "session:..." and has to be looked up
 // in this sitting's store; one from a sitting that has ended resolves to
 // nothing, and then nothing is drawn for it.
 const [iconImages, setIconImages] = useState({});

 useEffect(() => {
    const wanted = [...new Set(designItems.filter((i) => i.type === 'icon' && i.src).map((i) => i.src))];
    const missing = wanted
      .filter((src) => !iconImages[src])
      .map((src) => [src, resolveIconSrc(src)])
      .filter(([, url]) => !!url);
    if (missing.length === 0) return undefined;
    let cancelled = false;
    Promise.all(missing.map(([src, url]) => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve([src, img]);
      img.onerror = () => resolve(null);
      img.src = url;
    }))).then((loaded) => {
      if (cancelled) return;
      const add = {};
      loaded.filter(Boolean).forEach(([src, img]) => { add[src] = img; });
      if (Object.keys(add).length) setIconImages((prev) => ({ ...prev, ...add }));
    });
    return () => { cancelled = true; };
  }, [designItems, iconImages]);

 useEffect(() => {
    if (!designWanted || !designAtlas) return;
    if (!designCanvasRef.current) designCanvasRef.current = document.createElement('canvas');
    drawTorsoDesign(designAtlas, designItems, iconImages, {
      selectedId: designActive ? design?.selectedId : null,
      target: designCanvasRef.current,
    });
    if (!designTextureRef.current) {
      const t = new THREE.CanvasTexture(designCanvasRef.current);
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      // The chest is a small part of a big texture, so the card the GPU picks
      // from the mipmap chain is a blurred one — which is what made the
      // writing and the stickers look soft. No mipmaps, and as much anisotropy
      // as the device will give, and it samples the pixels that were drawn.
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.anisotropy = 16;
      designTextureRef.current = t;
      bumpDesign((n) => n + 1);
    } else {
      designTextureRef.current.needsUpdate = true;
    }
  }, [designWanted, designActive, designAtlas, designItems, iconImages, design?.selectedId]);

 const [writtenTorsoTexture, setWrittenTorsoTexture] = useState(null);

 useEffect(() => {
    const url = getTorsoUvUrl(torsoTextureId);
    setWrittenTorsoTexture(null);
    if (!url || !cleanTorsoText) return undefined;

    let cancelled = false;
    composeTorsoText(url, cleanTorsoText)
      .then((texture) => {
        // Typing again while this was in flight — throw it away rather than
        // flashing yesterday's word onto the shirt.
        if (cancelled) { texture.dispose(); return; }
        setWrittenTorsoTexture(texture);
      })
      .catch(() => { /* the plain shirt stays */ });
    return () => { cancelled = true; };
  }, [torsoTextureId, cleanTorsoText]);

 const torsoTexture = (designWanted && designTextureRef.current)
   ? designTextureRef.current
   : (writtenTorsoTexture || plainTorsoTexture);

 const armTexture = useLoadedTexture(getTorsoUvUrl(torsoTextureId), (t) => {
    // the small square in the upper-right of the atlas that the sleeves use
    t.offset.set(0.78, 0.42);
    t.repeat.set(0.18, 0.18);
  });

  const legTexture = useLoadedTexture(getLegsUvUrl(legTextureId));

  useLayoutEffect(() => {
    if (!group.current || !scene) return;
    
    const root = scene.clone(true);
    const modelBox = new THREE.Box3().setFromObject(root);
    const modelCenter = new THREE.Vector3();
    modelBox.getCenter(modelCenter);
    const modelSize = new THREE.Vector3();
    modelBox.getSize(modelSize);
    
    const skinColor = '#f2d626';
    const torsoColor = '#f5f5f5';
    const legColor = '#2f6ee4';
    
    const legYThreshold = modelCenter.y - modelSize.y * 0.05;
    const handYMax = modelCenter.y + modelSize.y * 0.05;
    const handXThreshold = modelSize.x * 0.25;
    
    root.traverse((child) => {
      if (!child.isMesh) return;
      
      const name = (child.name || '').toLowerCase();
      const childBox = new THREE.Box3().setFromObject(child);
      const childCenter = new THREE.Vector3();
      childBox.getCenter(childCenter);
      
      let color;
      let applyTexture = false;
      let applyLegTexture = false;
      
      const isHead = name.includes('kafa') || name.includes('head');
      const isHair = name.includes('saç') || name.includes('hair') || name.includes('sac');
      const isTorsoBody = name.includes('gövde') || name.includes('govde') || name === '3814uv.002';
      // The designer needs to know which mesh is the shirt: the raycast will
      // happily hand back the uv of an arm or the head, and a design item
      // would then leap somewhere strange.
      child.userData.isTorsoBody = isTorsoBody;
      const isArm = name.includes('kol') || name.includes('arm') || name === '3818v2.001' || name === '3819v2.001';
      const isLeg = name.includes('bacak') || name.includes('leg');
      
      if (isHair) {
        child.visible = false;
        return;
      }
      else if (isHead) {
        color = skinColor;
      }
      else if (isTorsoBody) {
        color = torsoColor;
        applyTexture = true;
      }
         else if (isArm) {
        // A design counts as a texture even with no shirt chosen — that was
        // why going straight into the designer left a blank shirt.
        if (torsoTexture && (torsoTextureId || designWanted)) {
          child.material = new THREE.MeshStandardMaterial({
            map: torsoTexture,
            metalness: 0.1,
            roughness: 0.25,
            envMapIntensity: 1.5,
          });
          child.castShadow = true;
          child.receiveShadow = true;
          return;
        }
        color = torsoColor;
      }
      else if (isLeg) {
        color = legColor;
        applyLegTexture = true;
      }
      else if (
        Math.abs(childCenter.x) > handXThreshold &&
        childCenter.y < handYMax &&
        childCenter.y > modelCenter.y - modelSize.y * 0.3
      ) {
        color = skinColor;
      }
      else if (childCenter.y < legYThreshold && Math.abs(childCenter.x) <= handXThreshold) {
        color = legColor;
        applyLegTexture = true;
      }
      else {
        color = torsoColor;
      }
      
          if (applyTexture && torsoTexture && (torsoTextureId || designWanted)) {
        child.material = new THREE.MeshStandardMaterial({
          map: torsoTexture,
          metalness: 0.1,
          roughness: 0.25,
          envMapIntensity: 1.5,
        });
      } else if (applyLegTexture && legTexture && legTextureId) {
        child.material = new THREE.MeshStandardMaterial({
          map: legTexture,
          metalness: 0.1,
          roughness: 0.25,
          envMapIntensity: 1.5,
        });
      } else {
        child.material = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.1,
          roughness: 0.25,
          envMapIntensity: 1.5,
        });
      }
      
      child.castShadow = true;
      child.receiveShadow = true;
    });
    
    group.current.clear();
    group.current.add(root);
  }, [scene, headTextureIndex, torsoTextureId, torsoTexture, armTexture, legTextureId, legTexture, designWanted]);
  
  useLayoutEffect(() => {
    if (!group.current) return;
    group.current.rotation.y = view === 'back' ? Math.PI : 0;
    if (hairGroup.current) {
      hairGroup.current.rotation.y = view === 'back' ? Math.PI : 0;
    }
    if (faceGroup.current) {
      faceGroup.current.rotation.y = view === 'back' ? Math.PI : 0;
    }
  }, [view]);
  
  // Gözlük modelinin aktif olup olmadığını belirle
  const isGlassesModel = eyeModelName && eyeModelName.includes('glasses');

  // A tap on the shirt arrives with the uv of the point under the finger,
  // because the torso's geometry carries UVs. The panel rectangle turns that
  // straight into "43% across, 20% down the chest" — no projecting back from
  // 3D to the page, and it keeps working however the figure is turned.
  const designPointer = (phase) => (event) => {
    if (!designActive || !design?.onPanelPointer || !event.uv) return;
    // Only the shirt. The ray also meets arms, hands and the head, and their
    // uvs live elsewhere in the atlas — reading one of those as a position on
    // the chest is what threw items across the shirt mid-drag.
    if (!event.object?.userData?.isTorsoBody) return;
    const panel = PANELS[view === 'back' ? 'back' : 'front'];
    const px = (event.uv.x - panel.u0) / (panel.u1 - panel.u0);
    const py = (event.uv.y - panel.v0) / (panel.v1 - panel.v0);
    // The same mesh carries the other side and the sides of the body; a point
    // well outside this panel is one of those, not a slip of the finger.
    if (px < -0.4 || px > 1.4 || py < -0.4 || py > 1.4) return;
    design.onPanelPointer(phase, px, py, event);
  };

  return (
    <>
      {/* Vücut */}
      <group
        ref={group}
        position={[0, -1, 0]}
        scale={[0.1, 0.1, 0.1]}
        onPointerDown={designActive ? designPointer('down') : undefined}
        onPointerMove={designActive ? designPointer('move') : undefined}
        onPointerUp={designActive ? designPointer('up') : undefined}
      />
      
      {/* Saç */}
      <group
        ref={hairGroup}
        position={[0, -1, 0]}
        scale={[0.1, 0.1, 0.1]}
      >
        <HairModel 
          color={hairColors[hairColor]}
          textureIndex={hairTextureIndex}
          position={[0, 31.5, 1.5]}
          rotation={[0, 0, 0]}
          scale={[0.9, 1.0, 1.0]}
          view={view}
        />
      </group>
      
      {/* YÜZ PARÇALARI - Sadece ön görünümde göster */}
      {view === 'front' && (
        <group
          ref={faceGroup}
          position={[0, -1, 0]}
          scale={[0.1, 0.1, 0.1]}
        >
          {/* GÖZ veya GÖZLÜK */}
          <Suspense fallback={null}>
            <FaceModel
              gender={gender}
              part="eyes"
              position={eyeModelName 
                ? [0, 29, 0.1]
                : [0, 29, 0.05]
              }
              rotation={eyeModelName 
                ? [0, Math.PI, 0]
                : [0, 0, 0]
              }
              scale={[1.0, 1.0, 1.0]}
              selectedModelName={eyeModelName}
              eyeColor={eyeColor}
              eyebrowColor={eyebrowColor}
              glassesColor={isGlassesModel ? glassesColor : null}
            />
          </Suspense>
          
          {/* KAŞ — Sadece custom eye modeli yoksa (default eyebrows) */}
          {!eyeModelName && (
            <Suspense fallback={null}>
              <FaceModel
                gender={gender}
                part="eyebrows"
                position={[0, 35.8, 4.70]}
                rotation={[0, 9.425, 0]}
                scale={[1.0, 1.0, 1.0]}
                eyebrowColor={eyebrowColor}
              />
            </Suspense>
          )}
          
          {/* AĞIZ */}
              <Suspense fallback={null}>
            <FaceModel
              gender={gender}
              part="mouth"
              position={[0, 28.8, 0]}
              rotation={mouthModelName
                ? [0, Math.PI, 0]
                : [0, 0, 0]
              }
              scale={[1.0, 1.0, 1.0]}
              selectedModelName={mouthModelName}
              eyebrowColor={eyebrowColor}
            />
          </Suspense>
        </group>
      )}
    </>
  );
}

const LegoFigure = ({ view = 'front', activeCategory = 'hair', customization = {}, design = null }) => {
  const controlsRef = useRef();

  const { hairTextureIndex = 0, eyeTextureIndex = 0, glassesTextureIndex = 0, mouthTextureIndex = 0, facialHairTextureIndex = 0 } = customization;
  const hasFaceSelection = eyeTextureIndex > 0 || glassesTextureIndex > 0 || mouthTextureIndex > 0 || facialHairTextureIndex > 0;

  const cameraMode =
    design?.active ? 'design' :
    activeCategory === 'hair' && hairTextureIndex > 0 ? 'hair' :
    activeCategory === 'head' ? 'face' :
    'default';

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ 
          position: [0, 3, 20],
          fov: 45
        }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        gl={{ 
          alpha: true, 
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          physicallyCorrectLights: true,
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
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          
          <pointLight position={[-5, 5, 5]} intensity={0.5} />
          <pointLight position={[0, -1, 3]} intensity={0.3} />
          
          <hemisphereLight 
            skyColor="#ffffff" 
            groundColor="#444444" 
            intensity={0.5} 
          />

          <Environment preset="city" environmentIntensity={0.5} />

          <CameraController cameraMode={cameraMode} controlsRef={controlsRef} />
          
          <LegoModel view={view} customization={customization} design={design} />

                   <OrbitControls
            ref={controlsRef}
            target={[0, 1, 0]}
            // While the shirt is being designed, a finger on the figure is
            // moving a sticker, not spinning the camera.
            enableRotate={!design?.active}
            enablePan={false}
            enableZoom={true}
            minDistance={2}
            maxDistance={10}
          />


          <EffectComposer>
            <Bloom intensity={0.1} luminanceThreshold={0.7} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default LegoFigure;

useGLTF.preload(legoFigureUrl);