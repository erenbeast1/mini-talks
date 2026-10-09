// src/components/HairModels.jsx
import { useGLTF } from '@react-three/drei';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// TextureIndex aralıkları — CharacterCustomizationPage ile birebir eşleşir
//   male   →   1 –  44   (m_hair_01.glb … m_hair_44.glb)
//   female → 101 – 152   (f_hair_01.glb … f_hair_52.glb)
//   child  → 201 – 246   (c_hair_01.glb … c_hair_46.glb)
//   0      → saç yok (null render)
// ─────────────────────────────────────────────────────────────────────────────

const M_COUNT = 44;   // m_hair_01 … m_hair_44
const F_COUNT = 52;   // f_hair_01 … f_hair_52
const C_COUNT = 46;   // c_hair_01 … c_hair_46

// ─────────────────────────────────────────────────────────────────────────────
// EXCLUDED_HAIR
// Listeden çıkartmak istediğin textureIndex'leri buraya ekle.
// GLB dosyaları ve offset tanımları silinmez — sadece UI'da görünmezler.
// Geri eklemek için set'ten çıkarman yeterli.
//
// Index referansı:
//   Male:     1 – 44   (m_hair_01 … m_hair_44)
//   Female: 101 – 152  (f_hair_01 … f_hair_52)
//   Child:  201 – 246  (c_hair_01 … c_hair_46)
// ─────────────────────────────────────────────────────────────────────────────
export const EXCLUDED_HAIR = new Set([
  21,
  14,
  204,// Örnek kullanım — ihtiyacına göre düzenle:
  // 3,          // m_hair_03
  // 10,         // m_hair_10
  // 105,        // f_hair_05
  // 120,        // f_hair_20
  // 215,        // c_hair_15
]);

// ─────────────────────────────────────────────────────────────────────────────
// hairModelPaths: textureIndex → GLB URL
// ─────────────────────────────────────────────────────────────────────────────
const hairModelPaths = {};

for (let i = 1; i <= M_COUNT; i++) {
  hairModelPaths[i] = new URL(
    `./models/hair/m_hair_${String(i).padStart(2, '0')}.glb`,
    import.meta.url
  ).href;
}
for (let i = 1; i <= F_COUNT; i++) {
  hairModelPaths[100 + i] = new URL(
    `./models/hair/f_hair_${String(i).padStart(2, '0')}.glb`,
    import.meta.url
  ).href;
}
for (let i = 1; i <= C_COUNT; i++) {
  hairModelPaths[200 + i] = new URL(
    `./models/hair/c_hair_${String(i).padStart(2, '0')}.glb`,
    import.meta.url
  ).href;
}

// ─────────────────────────────────────────────────────────────────────────────
// HAIR_MODEL_OFFSETS
// Blender'da tüm origin'ler eşitlendi — artık ek offset gerekmiyor.
// İleride tek bir modelin ince ayara ihtiyacı olursa sadece o index eklenir.
// DEFAULT_OFFSET kullanmak istediğin modeli ekleme — tanımlanmayan her index
// otomatik DEFAULT_OFFSET alır.
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_OFFSET = { position: [0, -3, -1.25], rotation: [0, Math.PI, 0], scale: [1, 1, 1] };

// ─────────────────────────────────────────────────────────────────────────────
// Partial override helper — sadece değiştirmek istediğin property'yi yaz,
// geri kalanı DEFAULT_OFFSET'ten otomatik gelir.
//
// Kullanım:
//   h(5, { scale: [1.1, 1.1, 1.1] })                 → sadece scale değişir
//   h(103, { position: [0, -2, -1], scale: [0.9, 0.9, 0.9] }) → ikisi birden
//   h(210, { rotation: [0.1, Math.PI, 0] })           → sadece rotation
// ─────────────────────────────────────────────────────────────────────────────
const h = (index, partial) => {
  return [index, {
    position: partial.position ?? DEFAULT_OFFSET.position,
    rotation: partial.rotation ?? DEFAULT_OFFSET.rotation,
    scale:    partial.scale    ?? DEFAULT_OFFSET.scale,
  }];
};

// ─────────────────────────────────────────────────────────────────────────────
// HAIR_MODEL_OFFSETS
// Sadece default'tan farklı olan modelleri ekle.
//
// Index referansı:
//   Male:     1 – 44   (m_hair_01 … m_hair_44)
//   Female: 101 – 152  (f_hair_01 … f_hair_52)
//   Child:  201 – 246  (c_hair_01 … c_hair_46)
//
// Örnekler (aktif etmek için yorum satırını kaldır):
//   ...Object.fromEntries([
//     h(5,   { scale: [1.1, 1.1, 1.1] }),                          // m_hair_05 biraz büyük
//     h(12,  { position: [0, -2.5, -1.25] }),                      // m_hair_12 yukarı kaydır
//     h(103, { position: [0, -3, -1.5], scale: [0.95, 0.95, 0.95] }), // f_hair_03 küçült + geri it
//     h(210, { scale: [0.85, 0.85, 0.85] }),                       // c_hair_10 küçült
//   ]),
// ─────────────────────────────────────────────────────────────────────────────
export const HAIR_MODEL_OFFSETS = Object.fromEntries([
  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │ DEFAULT değerler: position: [0, -3, -1.25]  scale: [1, 1, 1]          │
  // │                   rotation: [0, Math.PI, 0]                            │
  // │                                                                         │
  // │ position: [X, Y, Z]  → X: sola(-)/sağa(+)                             │
  // │                        Y: aşağı(-)/yukarı(+)  (default -3)            │
  // │                        Z: öne(-)/arkaya(+)     (default -1.25)         │
  // │ scale:    [X, Y, Z]  → 1=normal, 1.1=%10 büyük, 0.9=%10 küçük        │
  // │                                                                         │
  // │ Kopyala → yorum kaldır → index ve değerleri değiştir:                  │
  // │ h(1, { position: [0, -3, -1.25], scale: [1, 1, 1] }),  // m_hair_01   │
  // └─────────────────────────────────────────────────────────────────────────┘
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

// ─────────────────────────────────────────────────────────────────────────────
// HairModelInner
// Geçerli bir modelPath her zaman alır → useGLTF hook koşulsuz çağrılır.
// React Hooks kuralı ihlali bu şekilde önlenir.
// ─────────────────────────────────────────────────────────────────────────────
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
        // Orijinal materyal korunur; sadece PBR parametreleri güncellenir
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

// ─────────────────────────────────────────────────────────────────────────────
// HairModel  ← CharacterCustomizationPage bu component'i kullanır
// Props:
//   textureIndex  → CharacterCustomizationPage'deki hairTextureIndex
//   color         → hairColors[hairColor] değeri (hex string)
//   position/rotation/scale → LegoFigure'dan geçen offset
// ─────────────────────────────────────────────────────────────────────────────
export function HairModel({
  color = '#511800',
  textureIndex = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  view = 'front',
}) {
  if (textureIndex === 0) return null;

  const modelPath = hairModelPaths[textureIndex];

  if (!modelPath) {
    console.warn(`[HairModel] textureIndex ${textureIndex} için GLB path yok.`);
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

// ─────────────────────────────────────────────────────────────────────────────
// Preload — uygulama açılırken tüm GLB'ler arka planda yüklenir
// ─────────────────────────────────────────────────────────────────────────────
Object.values(hairModelPaths).forEach((path) => {
  useGLTF.preload(path);
});

// ─────────────────────────────────────────────────────────────────────────────
// HAIR_LIST — ihtiyaç duyulursa başka bileşenlerden import edilebilir
// EXCLUDED_HAIR set'indeki index'ler otomatik filtrelenir.
// ─────────────────────────────────────────────────────────────────────────────
export const HAIR_LIST = [
  ...Array.from({ length: M_COUNT }, (_, i) => ({
    textureIndex: i + 1,
    label: `M-Hair ${String(i + 1).padStart(2, '0')}`,
    prefix: 'm',
  })),
  ...Array.from({ length: F_COUNT }, (_, i) => ({
    textureIndex: 101 + i,
    label: `F-Hair ${String(i + 1).padStart(2, '0')}`,
    prefix: 'f',
  })),
  ...Array.from({ length: C_COUNT }, (_, i) => ({
    textureIndex: 201 + i,
    label: `C-Hair ${String(i + 1).padStart(2, '0')}`,
    prefix: 'c',
  })),
].filter((item) => !EXCLUDED_HAIR.has(item.textureIndex));