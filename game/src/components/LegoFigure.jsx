// src/components/LegoFigure.jsx
import React, { Suspense, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { HairModel } from './HairModels';
import { FaceModel } from './FaceModel';

const legoFigureUrl = new URL('../assets/models/lego-figure-2glb.glb', import.meta.url).href;

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
  default: new THREE.Vector3(0, 1.0, 0),
};

const CAMERA_POSITIONS = {
  hair:    new THREE.Vector3(0, 2.4, 5.5),
  face:    new THREE.Vector3(0, 1.95, 5.0),
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

function LegoModel({ view, customization }) {
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

 const torsoTexture = useMemo(() => {
    const url = getTorsoUvUrl(torsoTextureId);
    if (url) {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(url);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    }
    return null;
  }, [torsoTextureId]);

 const armTexture = useMemo(() => {
    const url = getTorsoUvUrl(torsoTextureId);
    if (url) {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(url);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.offset.set(0.78, 0.42);
      texture.repeat.set(0.18, 0.18);
      return texture;
    }
    return null;
  }, [torsoTextureId]);

   const legTexture = useMemo(() => {
    const url = getLegsUvUrl(legTextureId);
    if (url) {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(url);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    }
    return null;
  }, [legTextureId]);

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
        if (torsoTexture && torsoTextureId) {
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
      
          if (applyTexture && torsoTexture && torsoTextureId) {
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
  }, [scene, headTextureIndex, torsoTextureId, torsoTexture, armTexture, legTextureId, legTexture]);
  
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

  return (
    <>
      {/* Vücut */}
      <group
        ref={group}
        position={[0, -1, 0]}
        scale={[0.1, 0.1, 0.1]}
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

const LegoFigure = ({ view = 'front', activeCategory = 'hair', customization = {} }) => {
  const controlsRef = useRef();

  const { hairTextureIndex = 0, eyeTextureIndex = 0, glassesTextureIndex = 0, mouthTextureIndex = 0, facialHairTextureIndex = 0 } = customization;
  const hasFaceSelection = eyeTextureIndex > 0 || glassesTextureIndex > 0 || mouthTextureIndex > 0 || facialHairTextureIndex > 0;

  const cameraMode =
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
          
          <LegoModel view={view} customization={customization} />

                   <OrbitControls
            ref={controlsRef}
            target={[0, 1, 0]}
            enableRotate={true}
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