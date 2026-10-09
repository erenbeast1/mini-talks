// src/components/TorsoModel.jsx
import { useGLTF } from '@react-three/drei';
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';

// Torso model yolu - models/torso/ klasöründe olmalı
const torsoModelPath = new URL('./models/torso/Torso1.glb', import.meta.url).href;

// Torso renk paleti - CharacterCustomizationPage ile senkronize
export const TORSO_COLORS = [
  '#FFFFFF',  // 0 - Beyaz (varsayılan)
  '#FF0000',  // 1 - Kırmızı
  '#0055BF',  // 2 - LEGO Mavi
  '#237841',  // 3 - Yeşil
  '#FEC401',  // 4 - Sarı
  '#000000',  // 5 - Siyah
  '#F97306',  // 6 - Turuncu
  '#9C006B',  // 7 - Mor
  '#05131D',  // 8 - Koyu Lacivert
  '#A0A0A0',  // 9 - Gri
];

export function TorsoModel({
  textureIndex = 0,
  colorIndex = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  view = 'front',
}) {
  const { scene } = useGLTF(torsoModelPath);
  
  const clonedScene = useMemo(() => {
    return scene ? scene.clone(true) : null;
  }, [scene, textureIndex]);

  useLayoutEffect(() => {
    if (!clonedScene) return;

    // colorIndex'e göre gövde rengini belirle
    const torsoColor = new THREE.Color(TORSO_COLORS[colorIndex] || TORSO_COLORS[0]);

    clonedScene.traverse((child) => {
      if (!child.isMesh) return;

      const matName = child.material?.name?.toLowerCase() || '';
      const meshName = child.name?.toLowerCase() || '';
      
      // Sadece GÖVDE materyalinin rengini değiştir
      if (matName.includes('gövde') || matName.includes('govde') || matName.includes('kıyafet')) {
        // Kollar için kontrol - kolları değiştirme
        if (matName.includes('kol')) {
          // Kolları olduğu gibi bırak veya ten rengi yap
          child.material = new THREE.MeshStandardMaterial({
            color: '#f2d626', // Ten rengi (sarı LEGO)
            metalness: 0.3,
            roughness: 0.4,
          });
        } else {
          // Ana gövde - seçilen rengi uygula
          child.material = new THREE.MeshStandardMaterial({
            color: torsoColor,
            metalness: 0.3,
            roughness: 0.4,
          });
        }
      } else if (matName.includes('el') || matName.includes('hand')) {
        // Eller - ten rengi
        child.material = new THREE.MeshStandardMaterial({
          color: '#f2d626',
          metalness: 0.3,
          roughness: 0.4,
        });
      } else {
        // Diğer parçalar - seçilen rengi uygula
        child.material = new THREE.MeshStandardMaterial({
          color: torsoColor,
          metalness: 0.3,
          roughness: 0.4,
        });
      }

      child.castShadow = true;
      child.receiveShadow = true;
    });
  }, [clonedScene, colorIndex, textureIndex]);

  if (!clonedScene) return null;

  return (
    <primitive
      object={clonedScene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

useGLTF.preload(torsoModelPath);
