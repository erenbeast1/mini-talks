// src/pages/GamePage.jsx
import React, {
  useEffect,
  useState,
  useRef,
  Suspense,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { HAIR_MODEL_OFFSETS, DEFAULT_OFFSET, EXCLUDED_HAIR } from '../components/HairModels';

// ============================================
// UI ASSETS
// ============================================

// Logo & Menu
import logoImg from '../assets/logo.png';
import mainMenuIcon from '../assets/Main_Menü_İcon.png';
import mainMenuIconHover from '../assets/Main_Menü_İcon_Hover.png';

// Slot Buttons (+ butonları)
import slotButton1 from '../assets/Buton-1.png'; // Red +
import slotButton2 from '../assets/Buton-2.png'; // Blue +
import slotButton3 from '../assets/Buton-3.png'; // Green +
import slotButton4 from '../assets/Buton-4.png'; // Yellow +
import slotButtonOK1 from '../assets/Buton-OK-1.png'; // Red Tick (deaktif)
import slotButtonOK2 from '../assets/Buton-OK-2.png'; // Green Tick (aktif)

// Level Buttons
import soundButton from '../assets/Level Buton/Sound_Buton.png';
import soundButtonHover from '../assets/Level Buton/Sound_Buton_Hover.png';
import wordButton from '../assets/Level Buton/Word_Buton.png';
import wordButtonHover from '../assets/Level Buton/Word_Buton_Hover.png';
import sentenceButton from '../assets/Level Buton/Sentence_Buton.png';
import sentenceButtonHover from '../assets/Level Buton/Sentence_Buton_Hover.png';
import dialogueButton from '../assets/Level Buton/Dialogue_Buton.png';
import dialogueButtonHover from '../assets/Level Buton/Dialogue_Buton_Hover.png';
import loadingGif from '../assets/loading_animation_1.gif';

// Mini Buttons
import mini1Button from '../assets/Mini Buton/Mini-1_Buton.png';
import mini1ButtonHover from '../assets/Mini Buton/Mini-1_Buton_Hover.png';
import mini2Button from '../assets/Mini Buton/Mini-2_Buton.png';
import mini2ButtonHover from '../assets/Mini Buton/Mini-2_Buton_Hover.png';

// Talk Buttons
import talk1Button from '../assets/Talk Buton/Talk-1_Buton.png';
import talk1ButtonHover from '../assets/Talk Buton/Talk-1_Buton_Hover.png';
import talk2Button from '../assets/Talk Buton/Talk-2_Buton.png';
import talk2ButtonHover from '../assets/Talk Buton/Talk-2_Buton_Hover.png';
import demo1Button from '../assets/Talk Buton/Demo-1_Buton.png';
import demo1ButtonHover from '../assets/Talk Buton/Demo-1_Buton_Hover.png';
import demo2Button from '../assets/Talk Buton/Demo-2_Buton.png';
import demo2ButtonHover from '../assets/Talk Buton/Demo-2_Buton_Hover.png';

// Action Buttons
import playButton from '../assets/Action Buton/Play_Buton.png';
import playButtonHover from '../assets/Action Buton/Play_Buton_Hover.png';
import recordButton from '../assets/Action Buton/Record_Buton.png';
import recordButtonHover from '../assets/Action Buton/Record_Buton_Hover.png';
import resetButton from '../assets/Action Buton/Reset_Buton.png';
import resetButtonHover from '../assets/Action Buton/Reset_Buton_Hover.png';
import deleteButton from '../assets/Action Buton/Delete_Buton.png';
import deleteButtonHover from '../assets/Action Buton/Delete_Buton_Hover.png';

import { useAlert } from '../components/popups/AlertSystem';
import gameSaveBtn from '../assets/Game_Save_btn.png';
import gameSaveBtnHover from '../assets/Game_Save_btn_hover.png';
import infoIcon from '../assets/info_icon.png';
import animationIcon from '../assets/animation_icon.png';
import imageIcon from '../assets/image_icon.png';
import downloadBtn from '../assets/download_btn.png';
import downloadBtnHover from '../assets/download_btn_hover.png';
import cancelBtn from '../assets/Cancel_btn.png';
import cancelBtnHover from '../assets/Cancel_btn_hover.png';

// Recording Popup Buttons
import closeBtn from '../assets/close_btn.png';
import closeBtnHover from '../assets/close_btn_hover.png';
import resetBtn from '../assets/Reset Blue Btn.png';
import resetBtnHover from '../assets/Reset Blue Btn Hover.png';
import startBtn from '../assets/start_btn.png';
import startBtnHover from '../assets/start_btn_hover.png';
import stopBtnImg from '../assets/Stop Red Btn.png';
import stopBtnImgHover from '../assets/Stop Red Btn Hover.png';



const glbCache = new Map();

const loadGLBCached = (path) => {
  return new Promise((resolve, reject) => {
    if (glbCache.has(path)) {
      resolve(glbCache.get(path).scene.clone(true));
      return;
    }
    new GLTFLoader().load(
      path,
      (gltf) => {
        glbCache.set(path, gltf);
        resolve(gltf.scene.clone(true));
      },
      undefined,
      reject
    );
  });
};

// ============================================
// 3D MODEL PATHS
// ============================================
const sceneModelPath1 = new URL('../components/models/sahne-1.glb', import.meta.url).href;
const sceneModelPath2 = new URL('../components/models/classroom_animation_lightmapped.glb', import.meta.url).href;
const scene2BgPath = new URL('../components/models/bglego.jpg', import.meta.url).href;
const sceneModelPath3 = new URL('../components/models/untitled.glb', import.meta.url).href;
const lightmapTexturePath = new URL('../components/models/LightmapBak.png', import.meta.url).href;
const sceneModelPath4 = new URL('../components/models/untitled_lightmapped.glb', import.meta.url).href;
const lightmapTexturePath4 = new URL('../components/models/LM_scene.png', import.meta.url).href;
const lightmapTexturePath2_Duvar = new URL('../components/models/LM_Duvar.png', import.meta.url).href;
const lightmapTexturePath2_Zemin = new URL('../components/models/LM_Zemin.png', import.meta.url).href;
const lightmapTexturePath2_Sandalyeler = new URL('../components/models/LM_Sandalyeler.png', import.meta.url).href;
const lightmapTexturePath2_Kitaplik = new URL('../components/models/LM_Kitaplik.png', import.meta.url).href;
const lightmapTexturePath2_Masalar = new URL('../components/models/LM_masalar.png', import.meta.url).href;

// Sahne 27: Swimming Pool (Orijinal materyaller — real-time ışık + gölge + SSAO)
const sceneModelPath27 = new URL('../components/models/minitalks_scene.glb', import.meta.url).href;
// EKLE — sceneModelPath2'nin hemen altına:
const sceneModelPathClassroom = new URL('../components/models/classroom_animation.glb', import.meta.url).href;
 const sceneModelPathBasketball = new URL('../components/models/basketball_animation.glb', import.meta.url).href;
 const sceneModelPathCafe = new URL('../components/models/cafe_animation.glb', import.meta.url).href;
 const sceneModelPathOrchestra = new URL('../components/models/orchestra_animation.glb', import.meta.url).href;
 const sceneModelPathPlayground = new URL('../components/models/playground_animation.glb', import.meta.url).href;
 const sceneModelPathRobot = new URL('../components/models/robot_tournament_animation.glb', import.meta.url).href;
 const sceneModelPathSupermarket = new URL('../components/models/supermarket_animation.glb', import.meta.url).href;
 const sceneModelPathTennis = new URL('../components/models/tennis_animation.glb', import.meta.url).href;
// Sahne ID → GLB path eşlemesi
const SCENE_MODEL_MAP = {
    1: sceneModelPathBasketball,
    2: sceneModelPathClassroom,
    3: sceneModelPathCafe,          // Coffee Shop (idx 2)
    4: sceneModelPath4,
    5: sceneModelPathSupermarket,   // Supermarket (idx 4)
    11: sceneModelPathPlayground,   // Playground (idx 10)
    39: sceneModelPathOrchestra,    // Music Room (idx 24)
    27: sceneModelPath27,
    28: sceneModelPathTennis,       // Tennis Court (idx 27)
    38: sceneModelPathRobot,        // Robotics Tournament (idx 37)
};

const SCENE_CAMERA_CONFIG = {
  default: { fov: null, positionOffset: null, targetOffset: null },
  1:  { fov: 20, positionOffset: null, targetOffset: null },
  2:  { fov: 40, positionOffset: null, targetOffset: null },
  3:  { fov: 22, positionOffset: null, targetOffset: null },
  4:  { fov: null, positionOffset: null, targetOffset: null },
  5:  { fov: 22, positionOffset: null, targetOffset: null },
  11: { fov: 24, positionOffset: null, targetOffset: null },
  25: { fov: 22, positionOffset: null, targetOffset: null },
  27: { fov: 21, positionOffset: null, targetOffset: null },
  28: { fov: 17, positionOffset: null, targetOffset: null },
  38: { fov: 21, positionOffset: null, targetOffset: null },
};

const HOTSPOT_PARENT_NAMES = [
  'duvar', 'wall', 'zemin', 'floor', 'ground', 'tavan', 'ceiling',
  'bank', 'bench', 'masa', 'table', 'desk', 'stage', 'platform',
  'tribune', 'tribun', 'stand', 'fence', 'koridor', 'corridor',
];

// ═══════════════════════════════════════════════════════════════
// Sahne bazlı JSX ışık konfigürasyonu
// Tanımlanmayan sahneler default'a düşer
// ═══════════════════════════════════════════════════════════════
const SCENE_LIGHTING = {
  default: {
    ambient: { intensity: 0.5 },
    main: {
      position: [-30, 100, -40],
      intensity: 0.9,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [-40, 60, -30], intensity: 0.3, color: '#ddeeff' },
  },
  1: {
    ambient: { intensity: 0.5 },
    main: {
      position: [-30, 100, -40],
      intensity: 0.9,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [-40, 60, -30], intensity: 0.3, color: '#ddeeff' },
  },
  2: {
    ambient: { intensity: 0.6 },
    main: {
      position: [-30, 100, -40],
      intensity: 1.0,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [-40, 60, -30], intensity: 0.4, color: '#fff5e0' },
  },
  3: {
    ambient: { intensity: 0.55 },
    main: {
      position: [-20, 80, -30],
      intensity: 0.8,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [40, 50, 20], intensity: 0.35, color: '#ffe8cc' },
  },
  4: {
    ambient: { intensity: 0.8 },
    main: {
      position: [50, 120, 80],
      intensity: 1.5,
      shadow: true,
      shadowMapSize: 2048,
      shadowBias: -0.0005,
      shadowNormalBias: 0.02,
    },
    fill: { position: [-60, 80, -50], intensity: 0.4, color: '#cce0ff' },
  },
  5: {
    ambient: { intensity: 0.6 },
    main: {
      position: [-30, 100, -40],
      intensity: 0.9,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [-40, 60, -30], intensity: 0.3, color: '#ddeeff' },
  },
  11: {
    ambient: { intensity: 0.6 },
    main: {
      position: [0, 120, 0],
      intensity: 1.0,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [-60, 60, -40], intensity: 0.35, color: '#ddeeff' },
  },
  25: {
    ambient: { intensity: 0.6 },
    main: {
      position: [0, 120, 60],
      intensity: 1.0,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [0, 80, -100], intensity: 0.6, color: '#fff5e0' },
    extra: { position: [-80, 60, 0], intensity: 0.3, color: '#ddeeff' },
  },
  27: {
    ambient: { intensity: 0.5 },
    main: {
      position: [-30, 100, -40],
      intensity: 0.9,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.0001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [-40, 60, -30], intensity: 0.3, color: '#ddeeff' },
  },
  28: {
    ambient: { intensity: 0.55 },
    main: {
      position: [0, 120, -40],
      intensity: 1.0,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [-60, 60, 40], intensity: 0.3, color: '#ddeeff' },
  },
  38: {
    ambient: { intensity: 0.5 },
    main: {
      position: [-30, 100, -40],
      intensity: 0.9,
      shadow: true,
      shadowMapSize: 4096,
      shadowBias: -0.001,
      shadowNormalBias: 0.05,
    },
    fill: { position: [40, 60, -30], intensity: 0.35, color: '#ddeeff' },
  },
};
// ─────────────────────────────────────────────────────────────────────────────
// Yeni saç sistemi — CharacterCustomizationPage / HairModels.jsx ile eşleşir
//   male   →   1 –  44  (m_hair_01 … m_hair_44)
//   female → 101 – 152  (f_hair_01 … f_hair_52)
//   child  → 201 – 246  (c_hair_01 … c_hair_46)
//   0      → kel
// ─────────────────────────────────────────────────────────────────────────────
const HAIR_CONFIG_GAME = {
  male:   { count: 44, base: 0,   prefix: 'm' },
  female: { count: 52, base: 100, prefix: 'f' },
  child:  { count: 46, base: 200, prefix: 'c' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Spectator için scene-aware outfit dağıtıcı (deterministic)
// Aynı spectatorIndex + aynı manifest/scene → aynı outfit
// Scene'e özgü torso havuzu az ise Basic havuzundan tamamlanır
// Legs her zaman basic renklerden random
// Fallback renkler: manifest yüklenmediyse LEGO brand palette'ten seçilir
// ─────────────────────────────────────────────────────────────────────────────
// Scene'de kaç torso varsa × bu sayı kadar spectator scene kıyafeti giyer
// 2 scene torso + factor=3 → ilk 6 spectator scene'den (round-robin), 7+. basic

// LEGO brand renk paleti — torso+legs UV yüklenene kadar fallback
const SPECTATOR_FALLBACK_TORSO_COLORS = [
  '#E31E24', '#0055BF', '#237841', '#F57C1F', '#EC4899',
  '#7B1FA2', '#F4F4F4', '#1D1D1B', '#9E9E9E', '#6D4C41',
];
const SPECTATOR_FALLBACK_LEG_COLORS = [
  '#1D1D1B', '#0055BF', '#6D4C41', '#237841', '#9E9E9E', '#7B1FA2',
];

const getSpectatorOutfit = (spectatorIndex, gender, sceneId, torsoManifest, legsManifest, sessionSeed = 0) => {
  const seed = spectatorIndex * 31 + 7 + sessionSeed * 17;

  const tm = Array.isArray(torsoManifest) ? torsoManifest : [];
  // Spectator havuzu: everyday + basic (scene-specific yok, günlük kıyafetler)
  const everydayTorsos = tm.filter(t =>
    t.category === 'everyday' && t.genders?.includes(gender)
  );
  const basicTorsos = tm.filter(t =>
    t.category === 'basic' && t.genders?.includes(gender)
  );
  const torsoPool = [...everydayTorsos, ...basicTorsos];

  const torsoTextureId = torsoPool.length > 0
    ? torsoPool[seed % torsoPool.length].id
    : null;

  const lm = Array.isArray(legsManifest) ? legsManifest : [];
  const legsPool = lm.filter(l => l.genders?.includes(gender));
  const legTextureId = legsPool.length > 0
    ? legsPool[(seed * 13 + 5) % legsPool.length].id
    : null;

  const fallbackTorsoColor = SPECTATOR_FALLBACK_TORSO_COLORS[
    seed % SPECTATOR_FALLBACK_TORSO_COLORS.length
  ];
  const fallbackLegColor = SPECTATOR_FALLBACK_LEG_COLORS[
    (seed * 7 + 3) % SPECTATOR_FALLBACK_LEG_COLORS.length
  ];

  return { torsoTextureId, legTextureId, fallbackTorsoColor, fallbackLegColor };
};

const getHairGLBPath = (textureIndex) => {
  if (!textureIndex || textureIndex === 0) return null;
  let prefix, num;
  if (textureIndex >= 1 && textureIndex <= 44) {
    prefix = 'm'; num = textureIndex;
  } else if (textureIndex >= 101 && textureIndex <= 152) {
    prefix = 'f'; num = textureIndex - 100;
  } else if (textureIndex >= 201 && textureIndex <= 246) {
    prefix = 'c'; num = textureIndex - 200;
  } else {
    return null;
  }
  return new URL(
    `../components/models/hair/${prefix}_hair_${String(num).padStart(2, '0')}.glb`,
    import.meta.url
  ).href;
};

const GAME_HAIR_OFFSETS = {
   1: { position: [0,1,-0.15], scale: [0.89,0.9,1.12] },
  2: { position: [-0.1,1.2,0.9], scale: [0.94,1,1] },
  3: { position: [0,1,0.5], scale: [0.98,1,1] },
  4: { position: [0,0.95,0.55], scale: [0.99,1,1] },
  5: { position: [0,1.35,1], scale: [0.98,1,1] },
  6: { position: [0,1,0.25], scale: [0.92,0.92,1] },
  7: { position: [0,0.9,0.45], scale: [0.99,1,1] },
  8: { position: [0,1,0.75], scale: [0.99,1,1] },
  9: { position: [0,1.3,0.5], scale: [1,1,1] },
  10: { position: [0.05,1,0.3], scale: [1,1,1] },
  11: { position: [0,1.4,1], scale: [1,1,1] },
  12: { position: [0,1.2,0.8], scale: [0.96,1,1] },
  13: { position: [0,1.3,0.5], scale: [0.98,1,1] },
  15: { position: [0,1.3,0.5], scale: [1,1,1] },
  16: { position: [0.4,-0.4,1.1], scale: [0.99,1,1] },
  17: { position: [0,1,0.5], scale: [0.96,1,1] },
  19: { position: [0,1,0.5], scale: [1,1,1] },
  22: { position: [0,1,0.25], scale: [0.99,0.85,1] },
  23: { position: [0,1,0.25], scale: [0.95,1,1] },
  24: { position: [0,1,0.25], scale: [0.94,0.9,1] },
  25: { position: [0,0.9,0.25], scale: [1,1,1.02] },
  26: { position: [0.05,1.3,0.5], scale: [0.96,1,1] },
  27: { position: [0,1,0.25], scale: [0.94,0.9,1] },
  29: { position: [0.05,0.8,-1.45], scale: [0.96,0.7,1] },
  30: { position: [0.1,1.1,0.5], scale: [0.92,1,1] },
  31: { position: [0,1.5,0], scale: [0.9,0.8,1] },
  32: { position: [0,1.15,0.8], scale: [0.96,1,1] },
  33: { position: [0,1.3,1.25], scale: [0.9,1,1] },
  34: { position: [0,0.85,0.25], scale: [0.9,0.85,1] },
  35: { position: [0,0.7,0.75], scale: [0.98,1,1.08] },
  36: { position: [0,1,0.5], scale: [0.96,1,1] },
  38: { position: [0,1.5,0.8], scale: [0.9,1,1] },
  39: { position: [0,1,0.5], scale: [0.95,1,1] },
  40: { position: [0,1.05,1], scale: [0.94,1,1.02] },
  41: { position: [0,1.05,0.55], scale: [0.9,1,1] },
  44: { position: [0,0.15,-2.05], scale: [0.94,0.78,1] },
  // Export'tan gelen değerler buraya yapıştırılacak
  // { [textureIndex]: { position: [x,y,z], scale: [x,y,z] } }
};

// Cinsiyete göre rastgele saç textureIndex üret
const getRandomHairIndex = (gender) => {
  const cfg = HAIR_CONFIG_GAME[gender];
  if (!cfg) return 0;
  if (Math.random() < 0.05) return 0;
  let idx, attempts = 0;
  do {
    idx = cfg.base + Math.floor(Math.random() * cfg.count) + 1;
    attempts++;
  } while (EXCLUDED_HAIR.has(idx) && attempts < 50);
  return EXCLUDED_HAIR.has(idx) ? 0 : idx;
};

const HAIR_COLORS = [
  '#6E3B1A',  // 0: Kahverengi 1
  '#834400',  // 1: Kahverengi 2
  '#E7CA63',  // 2: Sarı
  '#000000',  // 3: Siyah
  '#A8A8A8',  // 4: Gri
  '#F4F4F4',  // 5: Beyaz
  '#A93A1A',  // 6: Kızıl
];

// ─────────────────────────────────────────────────────────────────────────────
// Cinsiyete göre yüz modeli yapılandırması
// CharacterCustomizationPage MODEL_CONFIG ile aynı klasör yapısı
// ─────────────────────────────────────────────────────────────────────────────
const FACE_CONFIG_GAME = {
  eyes: {
    male:   { prefix: 'm_head_eye', folder: 'eyes/m_head_eye_glb', count: 12 },
    female: { prefix: 'f_head_eye', folder: 'eyes/f_head_eye_glb', count: 0  },
    child:  { prefix: 'c_head_eye', folder: 'eyes/c_head_eye_glb', count: 13 },
  },
  mouth: {
    male:   { prefix: 'm_head_mouth', folder: 'mouth/m_head_mouth_glb', count: 17 },
    female: { prefix: 'f_head_mouth', folder: 'mouth/f_head_mouth_glb', count: 17 },
    child:  { prefix: 'c_head_mouth', folder: 'mouth/c_head_mouth_glb', count: 18 },
  },
};

const getRandomFaceModelName = (gender, part) => {
  const cfg = FACE_CONFIG_GAME[part]?.[gender];
  if (!cfg || cfg.count === 0) return null;
  const n = Math.floor(Math.random() * cfg.count) + 1;
  return `${cfg.folder}/${cfg.prefix}${String(n).padStart(2, '0')}`;
};

// Seyirci için cinsiyete uygun random config üret


// ─────────────────────────────────────────────────────────────────────────────
// Seyirci Havuzu — cinsiyet başına 3 random varyasyon (toplam 9)
// Sayfa açılışında bir kez üretilir → aynı GLB tekrar kullanılır → cache hızlı
// ─────────────────────────────────────────────────────────────────────────────
const SPECTATOR_POOL = (() => {
  const pool = { male: [], female: [], child: [] };
  const VARIANTS_PER_GENDER = 5;

  ['male', 'female', 'child'].forEach(gender => {
    const hairCfg  = HAIR_CONFIG_GAME[gender];
    const eyeCfg   = FACE_CONFIG_GAME.eyes[gender];
    const mouthCfg = FACE_CONFIG_GAME.mouth[gender];

    for (let i = 0; i < VARIANTS_PER_GENDER; i++) {
      // Saç — %20 kel şansı
      let hairTextureIndex = 0;
      if (Math.random() >= 0.05 && hairCfg) {
         let attempts = 0;
        do {
          hairTextureIndex = hairCfg.base + Math.floor(Math.random() * hairCfg.count) + 1;
          attempts++;
        } while (EXCLUDED_HAIR.has(hairTextureIndex) && attempts < 50);
        if (EXCLUDED_HAIR.has(hairTextureIndex)) hairTextureIndex = 0;
      }

      // Göz
      let eyeModelName = null;
      if (eyeCfg && eyeCfg.count > 0) {
        const n = Math.floor(Math.random() * eyeCfg.count) + 1;
        eyeModelName = `${eyeCfg.folder}/${eyeCfg.prefix}${String(n).padStart(2, '0')}`;
      }

      // Ağız
      let mouthModelName = null;
      if (mouthCfg && mouthCfg.count > 0) {
        const n = Math.floor(Math.random() * mouthCfg.count) + 1;
        mouthModelName = `${mouthCfg.folder}/${mouthCfg.prefix}${String(n).padStart(2, '0')}`;
      }

         const SPECTATOR_EYE_COLORS = ['#000000', '#5A3825', '#8B5A2B', '#4E8B3A', '#4682B4'];
      const SPECTATOR_BROW_COLORS = ['#4D1F00', '#834400', '#000000', '#A8A8A8', '#CC4422'];

        const newHairColor = Math.floor(Math.random() * 7);
      // Sarı saç (index 2) → kahve kaş, diğerleri saç rengiyle aynı
      const matchedBrowColor = newHairColor === 2 ? HAIR_COLORS[1] : HAIR_COLORS[newHairColor];

          pool[gender].push({
        gender,
        hairTextureIndex,
        hairColor: newHairColor,
        eyeModelName,
        mouthModelName,
        eyeColor: SPECTATOR_EYE_COLORS[Math.floor(Math.random() * SPECTATOR_EYE_COLORS.length)],
        eyebrowColor: matchedBrowColor,
      });
    }
  });

  return pool;
})();

const getPooledSpectatorConfig = (spectatorIndex) => {
  const genders = ['male', 'female', 'child'];
  const gender = genders[spectatorIndex % genders.length];
  const genderPool = SPECTATOR_POOL[gender];
  return genderPool[Math.floor(spectatorIndex / genders.length) % genderPool.length];
};

const eyeModelPath = new URL('../components/models/face/Man_Eye1.glb', import.meta.url).href;
const eyebrowsModelPath = new URL('../components/models/face/Man_Eye_Brows1.glb', import.meta.url).href;
const mouthModelPath = new URL('../components/models/face/Man_Mouth1.glb', import.meta.url).href;

const mouthFBXPaths = [];
for (let i = 2; i <= 14; i++) {
  mouthFBXPaths.push(new URL(`../components/models/face/MM${i}.fbx`, import.meta.url).href);
}

// Torso/Legs UV texture'ları artık public/models/{torso|legs}/{id}/{id}_uv.png yolundan dinamik geliyor
const getTorsoUvUrl = (id) => id ? `/models/torso/${id}/${id}_uv.png` : null;
const getLegsUvUrl  = (id) => id ? `/models/legs/${id}/${id}_uv.png`  : null;


useGLTF.preload(eyeModelPath);
useGLTF.preload(eyebrowsModelPath);
useGLTF.preload(mouthModelPath);
// Seyirci pool saçlarını + göz/ağız GLB'lerini preload et
Object.values(SPECTATOR_POOL).flat().forEach(cfg => {
  const p = getHairGLBPath(cfg.hairTextureIndex);
  if (p) useGLTF.preload(p);
  if (cfg.eyeModelName) {
    useGLTF.preload(`/models/face/${cfg.eyeModelName}.glb`);
  }
  if (cfg.mouthModelName) {
    useGLTF.preload(`/models/face/${cfg.mouthModelName}.glb`);
  }
});

// ============================================
// CONSTANTS
// ============================================
// Level-based max recording times (seconds)
const MAX_RECORDING_TIMES = {
  sound: 10,
  word: 20,
  sentence: 40,
  dialogue: 60
};


const TORSO_COLORS = ['#FF0000', '#0066CC', '#00AA00', '#FF6600', '#9900CC', '#FF69B4', '#FFFF00', '#00CCCC', '#FFFFFF', '#333333'];
const LEG_COLORS = ['#2f6ee4', '#000000', '#8B4513', '#006400', '#800000', '#4B0082', '#808080', '#FFD700'];
const SKIN_COLOR = '#f2d626';

// Brick image mappings
const LEVEL_BRICKS = {
  sound: { normal: soundButton, hover: soundButtonHover },
  word: { normal: wordButton, hover: wordButtonHover },
  sentence: { normal: sentenceButton, hover: sentenceButtonHover },
  dialogue: { normal: dialogueButton, hover: dialogueButtonHover }
};

const MINI_BRICKS = {
  mini1: { normal: mini1Button, hover: mini1ButtonHover },
  mini2: { normal: mini2Button, hover: mini2ButtonHover }
};

const TALK_BRICKS = {
  demo1: { normal: demo1Button, hover: demo1ButtonHover },
  demo2: { normal: demo2Button, hover: demo2ButtonHover },
  talk1: { normal: talk1Button, hover: talk1ButtonHover },
  talk2: { normal: talk2Button, hover: talk2ButtonHover }
};

const ACTION_BRICKS = {
  play: { normal: playButton, hover: playButtonHover },
  record: { normal: recordButton, hover: recordButtonHover },
  reset: { normal: resetButton, hover: resetButtonHover },
  delete: { normal: deleteButton, hover: deleteButtonHover }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Safari-compatible MIME type detection
function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ''; // Let browser decide
}

// Video MIME type detection for screen recording
function getSupportedVideoMimeType() {
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'video/webm';
}

function getSuffixNumber(name) {
  const match = name.match(/(\d{3})$/);
  return match ? parseInt(match[1], 10) : 0;
}

function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .toLowerCase()
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i');
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Torso texture yükleyici (ID bazlı)
function loadTorsoTexture(torsoTextureId) {
  const url = getTorsoUvUrl(torsoTextureId);
  if (!url) return null;
  const loader = new THREE.TextureLoader();
  const texture = loader.load(url);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Kol texture yükleyici (texture'daki küçük kare bölgesi, ID bazlı)
function loadArmTexture(torsoTextureId) {
  const url = getTorsoUvUrl(torsoTextureId);
  if (!url) return null;
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

// Bacak texture yükleyici (ID bazlı)
function loadLegTexture(legTextureId) {
  const url = getLegsUvUrl(legTextureId);
  if (!url) return null;
  const loader = new THREE.TextureLoader();
  const texture = loader.load(url);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// ============================================
// LIGHTING
// ============================================
function SceneLighting() {
  // Blender'daki studio görünümünü taklit eder:
  // Yukarıdan gelen ana ışık + karşı taraftan fill + arka ambient
  return (
    <>
      <ambientLight intensity={0.6} color="#ffffff" />
      {/* Ana ışık - yukarı sol */}
      <directionalLight
        intensity={1.2}
        color="#ffffff"
        position={[5, 10, 5]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Fill ışık - sağ alt */}
      <directionalLight intensity={0.4} color="#cce0ff" position={[-5, 3, -5]} />
      {/* Arka ışık - rim light */}
      <directionalLight intensity={0.1} color="#fff5e0" position={[0, 5, -10]} />
    </>
  );
}

function CinematicLighting() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <hemisphereLight skyColor="#ffffff" groundColor="#dddddd" intensity={0.6} />
      <directionalLight
        position={[80, 150, 80]}
        intensity={2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-80, 60, 100]} intensity={0.7} color="#ffffff" />
      <directionalLight position={[0, 80, 150]} intensity={0.6} color="#ffffff" />
      <pointLight position={[0, 100, -150]} intensity={800} distance={400} decay={1.2} color="#ffffff" />
      <pointLight position={[-100, 100, -100]} intensity={700} distance={350} decay={1.2} color="#ffffff" />
      <pointLight position={[-150, 100, 0]} intensity={700} distance={350} decay={1.2} color="#ffffff" />
      <pointLight position={[0, 146, 20]} intensity={600} distance={320} decay={1.5} color="#ffffff" />
      <pointLight position={[0, 146, 67]} intensity={600} distance={320} decay={1.5} color="#ffffff" />
      <pointLight position={[0, 146, -27]} intensity={600} distance={320} decay={1.5} color="#ffffff" />
      <pointLight position={[51, 146, -28]} intensity={600} distance={320} decay={1.5} color="#ffffff" />
      <pointLight position={[-47, 99, -64]} intensity={500} distance={280} decay={1.5} color="#ffffff" />
      <pointLight position={[-47, 99, 8]} intensity={500} distance={280} decay={1.5} color="#ffffff" />
    </>
  );
}

// ============================================
// SCENE GL SETTINGS - Sahne bazlı renderer ayarları
// ============================================
  /*function SceneGLSettings({ sceneId, onReady }) {
    const { gl, scene } = useThree();
    const readyCalledRef = useRef(false);
  
  useEffect(() => {
    readyCalledRef.current = false;*/
    function SceneGLSettings({ sceneId, onReady }) {
    const { gl, scene } = useThree();
    const readyCalledRef = useRef(false);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
  
  useEffect(() => {
    readyCalledRef.current = false;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;

    // envTex her zaman oluştur
    const pmrem = new THREE.PMREMGenerator(gl);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    const envTex = envRT.texture;
    pmrem.dispose();

    // Sadece cam materyaline envMap (sahne 2/3)
    if (sceneId !== 1 && sceneId !== 4) {
      scene.traverse(child => {
        if (!child.isMesh || !child.material) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat.isMeshPhysicalMaterial) {
            mat.envMap = envTex;
            mat.needsUpdate = true;
          }
        });
      });
    }

    // Anisotropy
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    scene.traverse(child => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(mat => {
        Object.values(mat).forEach(val => {
          if (val?.isTexture) {
            val.anisotropy = maxAnisotropy;
            val.needsUpdate = true;
          }
        });
      });
    });

    // Tüm sahneler için blurlu background helper — Safari uyumlu
    const setBlurredBackground = (src) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('✅ BG image loaded:', src, 'size:', img.width, 'x', img.height);
        const w = img.width;
        const h = img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // Safari ctx.filter desteklemiyor — stackBlur ile manuel uygula
         ctx.drawImage(img, 0, 0, w, h);
        // CSS filter blur — Chrome/Firefox destekler
        // Safari desteklemezse unblurred kalır (gökkuşağı olmaz)
        // Multi-pass downscale blur — kademeli küçültme ile yumuşak blur
        // Her pass yarıya indirip tekrar büyütür → piksel artefaktı olmaz
        const PASSES = 4;  // Daha fazla = daha blur (3-5 arası ideal)
        
        let srcCanvas = document.createElement('canvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        let srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(img, 0, 0, w, h);
        
        // Kademeli küçült
        for (let i = 0; i < PASSES; i++) {
          const halfW = Math.max(Math.floor(srcCanvas.width / 2), 1);
          const halfH = Math.max(Math.floor(srcCanvas.height / 2), 1);
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = halfW;
          tmpCanvas.height = halfH;
          const tmpCtx = tmpCanvas.getContext('2d');
          tmpCtx.imageSmoothingEnabled = true;
          tmpCtx.imageSmoothingQuality = 'high';
          tmpCtx.drawImage(srcCanvas, 0, 0, halfW, halfH);
          srcCanvas = tmpCanvas;
          srcCtx = tmpCtx;
        }
        
        // Kademeli büyüt (tek seferde değil, adım adım)
        for (let i = 0; i < PASSES; i++) {
          const doubleW = Math.min(srcCanvas.width * 2, w);
          const doubleH = Math.min(srcCanvas.height * 2, h);
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = doubleW;
          tmpCanvas.height = doubleH;
          const tmpCtx = tmpCanvas.getContext('2d');
          tmpCtx.imageSmoothingEnabled = true;
          tmpCtx.imageSmoothingQuality = 'high';
          tmpCtx.drawImage(srcCanvas, 0, 0, doubleW, doubleH);
          srcCanvas = tmpCanvas;
          srcCtx = tmpCtx;
        }
        
        // Final: tam boyuta çiz
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(srcCanvas, 0, 0, w, h);

       console.log('✅ BG texture created');

        const bgTex = new THREE.CanvasTexture(canvas);
        bgTex.colorSpace = THREE.SRGBColorSpace;
        scene.background = bgTex;
        if (!readyCalledRef.current) {
         readyCalledRef.current = true;
        onReadyRef.current?.();
        }
      };
      img.onerror = () => {
  console.warn('⚠️ BG image failed to load:', src);
  scene.background = new THREE.Color('#e8e8e8');
  if (!readyCalledRef.current) {
    readyCalledRef.current = true;
    onReadyRef.current?.();
  }
};
img.src = src;
    };


    if (sceneId === 27) {
      // ─── Swimming Pool (Real-time) ───
      // setBlurredBackground(scene2BgPath); // ← TEST: arka planı görmek için geçici kapalı
      scene.background = new THREE.Color('#ffffff'); // ← TEST: beyaz arka plan
      if (!readyCalledRef.current) { readyCalledRef.current = true; onReadyRef.current?.(); }
      scene.environment = envTex;
      gl.toneMappingExposure = 1.0;

      // GLB ışıkları: sadece EN GÜÇLÜ point light'a shadow ver (geri kalan shadow yok)
      // Birden fazla point light shadow → shadow acne (tarama çizgileri)
      // Tek ışık + yüksek bias → temiz gölge
      let strongestLight = null;
      let maxEnergy = 0;
      scene.traverse(child => {
        if (!child.isLight) return;
        // JSX DirectionalLight'a dokunma — shadow oradan geliyor
        if (child.isDirectionalLight) return;
        child.castShadow = false;
        // En güçlü point light'ı bul
        if (child.isPointLight && child.intensity > maxEnergy){  
            maxEnergy = child.intensity;
          strongestLight = child;
        }
      });
      if (strongestLight) {
        strongestLight.castShadow = true;
        strongestLight.shadow.mapSize.width = 2048;
        strongestLight.shadow.mapSize.height = 2048;
        strongestLight.shadow.camera.near = 0.5;
        strongestLight.shadow.camera.far = 300;
        strongestLight.shadow.bias = -0.0005;
        strongestLight.shadow.normalBias = 0.02;
        console.log('🔦 Shadow light:', strongestLight.name, 'intensity:', maxEnergy);
      }

     scene.traverse(child => {
       if (!child.isPointLight) return;
       child.intensity *= 0.8;
       if (child.distance === 0) {
         child.distance = 200;
       }
     });

      // EnvMap — tüm materyallere RoomEnvironment (yansıma)
      // Cam materyallerine DOKUNMA — GLB'den geldiği gibi bırak
      scene.traverse(child => {
        if (!child.isMesh || !child.material) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
        // ★ Cam/şeffaf materyaller: envMap verme → dalgalanma + parlama fix
         // ★ Cam materyalini tamamen değiştir — texture artefaktlarını temizle + mavi tint
         if (mat.isMeshPhysicalMaterial && mat.transmission > 0) {
          const idx = Array.isArray(child.material) ? child.material.indexOf(mat) : -1;
          const glassMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#88bbee'),
            transparent: true,
            opacity: 0.3,
            roughness: 0.4,
            metalness: 0.0,
            specularIntensity: 0,
            transmission: 0,
            envMap: null,
            envMapIntensity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          if (idx >= 0) { child.material[idx] = glassMat; }
          else { child.material = glassMat; }
          return;
        }
         if (mat.transparent && mat.opacity < 0.8) {
          const idx = Array.isArray(child.material) ? child.material.indexOf(mat) : -1;
          const glassMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#88bbee'),
            transparent: true,
            opacity: 0.3,
            roughness: 0.4,
            metalness: 0.0,
            specularIntensity: 0,
            envMap: null,
            envMapIntensity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          if (idx >= 0) { child.material[idx] = glassMat; }
          else { child.material = glassMat; }
          return;
         }
          mat.envMap = envTex;
          mat.envMapIntensity = 0.5;
          mat.needsUpdate = true;
        });
      });

      // ★ Hotspot koruması — genel
      scene.traverse(child => {
        if (!child.isMesh || !child.material) return;
        let isCharacter = false;
        let p = child.parent;
        while (p) {
          if (p.name?.startsWith('FinishedRig')) { isCharacter = true; break; }
          p = p.parent;
        }
        if (isCharacter) return;
        let isHotspot = false;
        p = child.parent;
        while (p) {
          if (p.name && HOTSPOT_PARENT_NAMES.includes(p.name.toLowerCase())) { isHotspot = true; break; }
          p = p.parent;
        }
        if (!isHotspot) {
          const mn = (child.name || '').toLowerCase();
          isHotspot = HOTSPOT_PARENT_NAMES.some(n => mn.includes(n));
        }
        if (!isHotspot) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat.isMeshPhysicalMaterial && mat.transmission > 0) return;
          if (mat.transparent && mat.opacity < 0.8) return;
          mat.roughness = Math.max(mat.roughness, 0.85);
          mat.metalness = Math.min(mat.metalness, 0.3);
          mat.envMapIntensity = Math.min(mat.envMapIntensity, 0.5);
          mat.needsUpdate = true;
        });
      });
    } else if (sceneId === 4) {
  setBlurredBackground(scene2BgPath);
  scene.environment = envTex;
  gl.toneMappingExposure = 1;

  // GLB ışıklarına castShadow
  scene.traverse(child => {
    if (!child.isLight) return;
    child.castShadow = true;
    if (child.isPointLight) {
      child.shadow.mapSize.width = 2048;
      child.shadow.mapSize.height = 2048;
      child.shadow.camera.near = 0.1;
      child.shadow.camera.far = 500;
    }
    if (child.isDirectionalLight) {
      child.shadow.mapSize.width = 2048;
      child.shadow.mapSize.height = 2048;
      child.shadow.camera.far = 1000;
    }
  });

  // Tüm mesh'lere envMap uygula
  scene.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(mat => {
      mat.envMap = envTex;
      mat.envMapIntensity = 1.0;
      mat.needsUpdate = true;
    });
  });
}  else {
  // ─── Tüm yeni sahneler: Scene 27 pipeline (real-time) ───
  // setBlurredBackground(scene2BgPath); // ← TEST: arka planı görmek için geçici kapalı
      scene.background = new THREE.Color('#ffffff'); // ← TEST: beyaz arka plan
      if (!readyCalledRef.current) { readyCalledRef.current = true; onReadyRef.current?.(); }
  scene.environment = envTex;
  gl.toneMappingExposure = 1.0;

  // GLB point light'ları: en güçlüye shadow ver
  let strongestLight = null;
  let maxEnergy = 0;
  scene.traverse(child => {
    if (!child.isLight) return;
    if (child.isDirectionalLight) return;
    child.castShadow = false;
    if (child.isPointLight && child.intensity > maxEnergy) {
      maxEnergy = child.intensity;
      strongestLight = child;
    }
  });
  if (strongestLight) {
    strongestLight.castShadow = true;
    strongestLight.shadow.mapSize.width = 2048;
    strongestLight.shadow.mapSize.height = 2048;
    strongestLight.shadow.camera.near = 0.5;
    strongestLight.shadow.camera.far = 300;
    strongestLight.shadow.bias = -0.0005;
    strongestLight.shadow.normalBias = 0.02;
  }

  // Point light hotspot yumuşatma
  scene.traverse(child => {
    if (!child.isPointLight) return;
    child.intensity *= 0.7;
    if (child.distance === 0) child.distance = 200;
  });

  // EnvMap — cam hariç tüm materyallere
  scene.traverse(child => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(mat => {
      if (mat.isMeshPhysicalMaterial && mat.transmission > 0) {
        const idx = Array.isArray(child.material) ? child.material.indexOf(mat) : -1;
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#88bbee'),
          transparent: true,
          opacity: 0.3,
          roughness: 0.05,
          metalness: 0.0,
          transmission: 0,
          envMap: null,
          envMapIntensity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        if (idx >= 0) { child.material[idx] = glassMat; }
        else { child.material = glassMat; }
        return;
      }
      if (mat.transparent && mat.opacity < 0.8) {
        const idx = Array.isArray(child.material) ? child.material.indexOf(mat) : -1;
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#88bbee'),
          transparent: true,
          opacity: 0.3,
          roughness: 0.05,
          metalness: 0.0,
          envMap: null,
          envMapIntensity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        if (idx >= 0) { child.material[idx] = glassMat; }
        else { child.material = glassMat; }
        return;
      }
      mat.envMap = envTex;
      mat.envMapIntensity = 0.5;
      mat.needsUpdate = true;
    });
  });

  // ★ Hotspot koruması — genel
  scene.traverse(child => {
    if (!child.isMesh || !child.material) return;
    let isCharacter = false;
    let p = child.parent;
    while (p) {
      if (p.name?.startsWith('FinishedRig')) { isCharacter = true; break; }
      p = p.parent;
    }
    if (isCharacter) return;
    let isHotspot = false;
    p = child.parent;
    while (p) {
      if (p.name && HOTSPOT_PARENT_NAMES.includes(p.name.toLowerCase())) { isHotspot = true; break; }
      p = p.parent;
    }
    if (!isHotspot) {
      const mn = (child.name || '').toLowerCase();
      isHotspot = HOTSPOT_PARENT_NAMES.some(n => mn.includes(n));
    }
    if (!isHotspot) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(mat => {
      if (mat.isMeshPhysicalMaterial && mat.transmission > 0) return;
      if (mat.transparent && mat.opacity < 0.8) return;
      mat.roughness = Math.max(mat.roughness, 0.85);
      mat.metalness = Math.min(mat.metalness, 0.3);
      mat.envMapIntensity = Math.min(mat.envMapIntensity, 0.5);
      mat.needsUpdate = true;
    });
  });
} /*else {
  setBlurredBackground(scene2BgPath);
  scene.environment = null;
  gl.toneMappingExposure = 1.4;
}*/

}, [sceneId, scene.children.length]);
  //  }, [sceneId, gl, scene]);
  return null;
}

// ============================================
// SCENE CAMERA CONTROLLER - GLB kamerasını uygular
// ============================================
function SceneCameraController({ cameraConfig, defaultPosition, defaultTarget, sceneId }) {
  const { camera } = useThree();
  const lockedRef = useRef(null);

  useEffect(() => {
    if (cameraConfig) {
      const camCfg = SCENE_CAMERA_CONFIG[sceneId] || SCENE_CAMERA_CONFIG.default;
      
      const pos = new THREE.Vector3(...cameraConfig.position);
      const tgt = new THREE.Vector3(...cameraConfig.target);
      const fov = camCfg.fov || cameraConfig.fov || 50;
      
      if (camCfg.positionOffset) pos.add(new THREE.Vector3(...camCfg.positionOffset));
      if (camCfg.targetOffset) tgt.add(new THREE.Vector3(...camCfg.targetOffset));
      
      lockedRef.current = { position: pos, target: tgt, fov };
      camera.position.copy(pos);
      camera.fov = fov;
      camera.updateProjectionMatrix();
      camera.lookAt(tgt);
    } else {
      lockedRef.current = null;
    }
  }, [cameraConfig, camera, sceneId]);

  useFrame(() => {
    if (!lockedRef.current) return;
    camera.position.copy(lockedRef.current.position);
    camera.fov = lockedRef.current.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(lockedRef.current.target);
  });

  if (cameraConfig) return null;

  return (
    <OrbitControls
      target={defaultTarget}
      enableRotate={false}
      enableZoom={false}
      enablePan={false}
    />
  );
}
// ============================================
// HAIR DEBUG PANEL (geliştirme aracı — production'da kaldır)
// ============================================
const HairDebugPanel = ({ characters, setCharacters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetFigure, setTargetFigure] = useState(0); // 0 = figür 1, 1 = figür 2
  const [selectedColor, setSelectedColor] = useState(0);

  const allHairs = [
    { idx: 0, label: 'Bald' },
    ...Array.from({ length: 44 }, (_, i) => ({ idx: i + 1, label: `M-${String(i + 1).padStart(2, '0')}` })),
    ...Array.from({ length: 52 }, (_, i) => ({ idx: 101 + i, label: `F-${String(i + 1).padStart(2, '0')}` })),
    ...Array.from({ length: 46 }, (_, i) => ({ idx: 201 + i, label: `C-${String(i + 1).padStart(2, '0')}` })),
  ];

  const applyHair = (hairIdx) => {
    setCharacters(prev => {
      const clone = [...prev];
      clone[targetFigure] = {
        ...clone[targetFigure],
        hairTextureIndex: hairIdx,
        hairColor: selectedColor,
      };
      return clone;
    });
  };

  const currentHair = characters[targetFigure]?.hairTextureIndex || 0;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '80px',
          right: '10px',
          zIndex: 9999,
          backgroundColor: '#ff6600',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 12px',
          fontWeight: 700,
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        🔧 Hair Debug
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '10px',
        zIndex: 9999,
        width: '280px',
        maxHeight: '70vh',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', backgroundColor: '#ff6600',
      }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>🔧 Hair Debug</span>
        <button onClick={() => setIsOpen(false)} style={{
          background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Target Figure */}
      <div style={{ display: 'flex', gap: '6px', padding: '8px 14px', backgroundColor: '#222' }}>
        {[0, 1].map(i => (
          <button
            key={i}
            onClick={() => setTargetFigure(i)}
            style={{
              flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '12px',
              backgroundColor: targetFigure === i ? '#ff6600' : '#444',
              color: '#fff',
            }}
          >
            Figure {i + 1}
          </button>
        ))}
      </div>

      {/* Hair Color */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 14px', backgroundColor: '#222', flexWrap: 'wrap' }}>
        {HAIR_COLORS.map((color, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedColor(i);
              applyHair(currentHair); // Renk değişince hemen uygula
              setCharacters(prev => {
                const clone = [...prev];
                clone[targetFigure] = { ...clone[targetFigure], hairColor: i };
                return clone;
              });
            }}
            style={{
              width: '24px', height: '24px', borderRadius: '50%', border: 'none', cursor: 'pointer',
              backgroundColor: color,
              outline: selectedColor === i ? '3px solid #ff6600' : '2px solid #666',
              outlineOffset: '1px',
            }}
          />
        ))}
      </div>

      {/* Current */}
      <div style={{
        padding: '6px 14px', backgroundColor: '#333', color: '#aaa', fontSize: '11px',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Current: <b style={{ color: '#fff' }}>{currentHair}</b></span>
        <span>({allHairs.find(h => h.idx === currentHair)?.label || '?'})</span>
      </div>

      {/* Hair List */}
      <div style={{ maxHeight: '45vh', overflowY: 'auto', padding: '6px' }}>
        {['Male (1-44)', 'Female (101-152)', 'Child (201-246)'].map((section, si) => {
          const ranges = [[0, 45], [45, 97], [97, 143]]; // allHairs index ranges
          const sectionHairs = allHairs.slice(ranges[si][0], ranges[si][1]);
          return (
            <div key={section}>
              <div style={{
                padding: '4px 8px', color: '#ff6600', fontWeight: 700, fontSize: '11px',
                borderBottom: '1px solid #333', marginTop: si > 0 ? '4px' : 0,
              }}>
                {section}
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', padding: '4px',
              }}>
                {sectionHairs.map(hair => {
                  const isActive = currentHair === hair.idx;
                  const hasOffset = HAIR_MODEL_OFFSETS[hair.idx] !== undefined;
                  return (
                    <button
                      key={hair.idx}
                      onClick={() => applyHair(hair.idx)}
                      title={`${hair.label} (idx: ${hair.idx})${hasOffset ? ' ★' : ''}`}
                      style={{
                        padding: '4px 2px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                        fontSize: '9px', fontWeight: 600,
                        backgroundColor: isActive ? '#ff6600' : hasOffset ? '#2a3a2a' : '#333',
                        color: isActive ? '#fff' : hasOffset ? '#66ff66' : '#aaa',
                        outline: isActive ? '2px solid #fff' : 'none',
                      }}
                    >
                      {hair.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick nav */}
      <div style={{
        display: 'flex', gap: '4px', padding: '8px 14px', backgroundColor: '#222',
        borderTop: '1px solid #333',
      }}>
        <button
          onClick={() => {
            const idx = allHairs.findIndex(h => h.idx === currentHair);
            if (idx > 0) applyHair(allHairs[idx - 1].idx);
          }}
          style={{
            flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            backgroundColor: '#444', color: '#fff', fontWeight: 700, fontSize: '14px',
          }}
        >◀ Prev</button>
        <button
          onClick={() => {
            const idx = allHairs.findIndex(h => h.idx === currentHair);
            if (idx < allHairs.length - 1) applyHair(allHairs[idx + 1].idx);
          }}
          style={{
            flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            backgroundColor: '#444', color: '#fff', fontWeight: 700, fontSize: '14px',
          }}
        >Next ▶</button>
      </div>
    </div>
  );
};
// ============================================
// BLENDER SCENE - LIP SYNC
// ============================================
function BlenderScene({ scenePath, character1Config, character2Config, onAnimationEnd, selectedMini, audioLevel, audioLevelRef, isPlayingAudio, onSceneReady, onCameraFound, gameHairOverrides, sceneId, torsoManifest, legsManifest, spectatorSessionSeed }) {  const { scene, animations } = useGLTF(scenePath);  const { scene: eyeScene } = useGLTF(eyeModelPath);
  const { scene: eyebrowsScene } = useGLTF(eyebrowsModelPath);
  const { scene: mouthScene } = useGLTF(mouthModelPath);

  const groupRef = useRef();
  const { actions, mixer } = useAnimations(animations, groupRef);
  const setupDoneRef = useRef(false);
  const animStartedRef = useRef(false);
  const lastConfigRef = useRef(null);
  const isReadyRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Ref'i state ile senkron tut (useFrame closure'da stale state sorunu)
  useEffect(() => { isReadyRef.current = isReady; }, [isReady]);

  // scenePath değişince (sahne geçişi) hemen gizle
  useEffect(() => {
    setIsReady(false);
  }, [scenePath]);
  
  const mouthDataRef = useRef({ mini1: null, mini2: null });
  const currentMouthIndexRef = useRef(-1);
  const lastMouthChangeRef = useRef(0);
  const prevSelectedMiniRef = useRef(null);
  
  //const configKey = JSON.stringify({ c1: character1Config, c2: character2Config, path: scenePath });
  const configKey = JSON.stringify({ c1: character1Config, c2: character2Config, path: scenePath, overrides: gameHairOverrides });
  if (lastConfigRef.current !== configKey) {
    lastConfigRef.current = configKey;
    setupDoneRef.current = false;
    mouthDataRef.current = { mini1: null, mini2: null };
    currentMouthIndexRef.current = -1;
  }
  
  // Scene hazır bilgisi artık Promise.all ile yönetiliyor (setup useEffect'inde)

  // selectedMini değiştiğinde önceki mini'nin ağzını kapat
  useEffect(() => {
    if (prevSelectedMiniRef.current && prevSelectedMiniRef.current !== selectedMini) {
      const prevMini = prevSelectedMiniRef.current;
      const mouthData = mouthDataRef.current[prevMini];
      if (mouthData) {
        mouthData.fbxMouths.forEach(fbx => { if (fbx) fbx.visible = false; });
        if (mouthData.customMouthObj) {
          mouthData.customMouthObj.visible = true;
          if (mouthData.defaultMouth) mouthData.defaultMouth.visible = false;
          mouthData.currentMouth = mouthData.customMouthObj;
        } else if (mouthData.defaultMouth) {
          mouthData.defaultMouth.visible = true;
          mouthData.currentMouth = mouthData.defaultMouth;
        }
      }
    }
    prevSelectedMiniRef.current = selectedMini;
  }, [selectedMini]);

  // LIP SYNC
  useFrame((_, delta) => {
    const safeDelta = Math.max(delta, 0.016);
    if (mixer && isReadyRef.current) mixer.update(safeDelta);
    
    // ★ DEĞIŞIKLIK: prop yerine ref'ten oku (stale closure fix)
    const currentAudioLevel = audioLevelRef?.current ?? 0;
    
    if (isPlayingAudio && selectedMini && (mouthDataRef.current.mini1 || mouthDataRef.current.mini2)) {
      
      const now = Date.now();
      if (now - lastMouthChangeRef.current < 80) return;
      
      let mouthIndex;
      if (currentAudioLevel < 0.05) mouthIndex = 0;
      else if (currentAudioLevel < 0.1) mouthIndex = 1;
      else if (currentAudioLevel < 0.15) mouthIndex = 2;
      else if (currentAudioLevel < 0.2) mouthIndex = 3;
      else if (currentAudioLevel < 0.25) mouthIndex = 4;
      else if (currentAudioLevel < 0.3) mouthIndex = 5;
      else if (currentAudioLevel < 0.35) mouthIndex = 6;
      else if (currentAudioLevel < 0.4) mouthIndex = 7;
      else if (currentAudioLevel < 0.5) mouthIndex = 8;
      else if (currentAudioLevel < 0.6) mouthIndex = 9;
      else if (currentAudioLevel < 0.7) mouthIndex = 10;
      else if (currentAudioLevel < 0.85) mouthIndex = 11;
      else if (currentAudioLevel < 0.95) mouthIndex = 12;
      else mouthIndex = 13;
      
      if (mouthIndex !== currentMouthIndexRef.current) {
        currentMouthIndexRef.current = mouthIndex;
        lastMouthChangeRef.current = now;
        
        const targetMinis = selectedMini === 'both' ? ['mini1', 'mini2'] : [selectedMini];
        
        targetMinis.forEach(mini => {
          const mouthData = mouthDataRef.current[mini];
          if (!mouthData) return;
          if (mouthData.currentMouth) mouthData.currentMouth.visible = false;
          
            if (mouthIndex === 0) {
            // Sessiz: custom mouth varsa göster, yoksa default göster
            if (mouthData.customMouthObj) {
              mouthData.customMouthObj.visible = true;
              // Sakallıysa ağız mesh'lerini de geri aç
              if (mouthData.hasFacialHair) {
                mouthData.customMouthObj.traverse(c => {
                  if (c.userData._isMouthMesh) c.visible = true;
                });
              }
              if (mouthData.defaultMouth) mouthData.defaultMouth.visible = false;
              mouthData.currentMouth = mouthData.customMouthObj;
            } else if (mouthData.defaultMouth) {
              mouthData.defaultMouth.visible = true;
              mouthData.currentMouth = mouthData.defaultMouth;
            }
                     } else if (mouthData.hasFacialHair) {
            // Sakallı: sakal görünür, ağız mesh'leri gizlenir, FBX lip-sync gösterilir
            if (mouthData.defaultMouth) mouthData.defaultMouth.visible = false;
            if (mouthData.customMouthObj) {
              mouthData.customMouthObj.visible = true;
              // Sadece ağız mesh'lerini gizle, sakal görünür kalsın
              mouthData.customMouthObj.traverse(c => {
                if (c.userData._isMouthMesh) c.visible = false;
              });
            }
            // ─── HANGİ FBX'LER KULLANILACAK ───
            // MM2=index 0, MM3=index 1, ... MM14=index 12
            // Aşağıdaki dizide: ses seviyesi (1-13) → hangi FBX index
            // -1 = o seviyede ağız açma (sakal kapalı kalır)
            const FACIAL_HAIR_MOUTH_MAP = [
//  ses:  1     2     3     4     5     6     7     8     9    10    11    12    13
         11,   11,    8,    8,    4,    4,    6,    6,    3,    3,    3,    3,    3
//  fbx: MM13  MM13  MM10  MM10  MM6   MM6   MM8   MM8   MM5   MM5   MM5   MM5   MM5
];
            // Önceki tüm FBX'leri gizle
            mouthData.fbxMouths.forEach(fbx => { if (fbx) fbx.visible = false; });
            
            const fbxIdx = FACIAL_HAIR_MOUTH_MAP[mouthIndex - 1];
            if (fbxIdx !== undefined && fbxIdx >= 0) {
              const fbxMouth = mouthData.fbxMouths[fbxIdx];
                if (fbxMouth) {
                fbxMouth.visible = true;
                const mSf = mouthData.scaleFactor || 1;
                const shrink = 0.008;
                fbxMouth.scale.set(shrink * mSf, shrink * mSf, shrink * mSf);
                fbxMouth.position.set(
                  0,            // X: sola/sağa
                  1.4 * mSf,    // Y: öne/arkaya (artır → öne, azalt → arkaya)
                  -0.25 * mSf     // Z: yukarı/aşağı (artır → yukarı, azalt → aşağı)
                );
                mouthData.currentMouth = fbxMouth;
              }
            }
          } else {
            // Normal: custom mouth gizle, FBX mouth göster
            if (mouthData.customMouthObj) mouthData.customMouthObj.visible = false;
            const fbxMouth = mouthData.fbxMouths[mouthIndex - 1];
            if (fbxMouth) {
              fbxMouth.visible = true;
              mouthData.currentMouth = fbxMouth;
            }
          }
        });
      }
    } else if ((!isPlayingAudio || !selectedMini) && currentMouthIndexRef.current !== -1) {
      currentMouthIndexRef.current = -1;
      ['mini1', 'mini2'].forEach(mini => {
        const mouthData = mouthDataRef.current[mini];
        if (mouthData) {
          mouthData.fbxMouths.forEach(fbx => { if (fbx) fbx.visible = false; });
          // Custom mouth varsa onu göster, yoksa default
               if (mouthData.customMouthObj) {
            mouthData.customMouthObj.visible = true;
            if (mouthData.hasFacialHair) {
              mouthData.customMouthObj.traverse(c => {
                if (c.userData._isMouthMesh) c.visible = true;
              });
            }
            if (mouthData.defaultMouth) mouthData.defaultMouth.visible = false;
            mouthData.currentMouth = mouthData.customMouthObj;
          } else if (mouthData.defaultMouth) {
            mouthData.defaultMouth.visible = true;
            mouthData.currentMouth = mouthData.defaultMouth;
          }
        }
      });
    }
  });

  // SCENE SETUP
  useEffect(() => {
    if (!scene || !eyeScene || !groupRef.current || setupDoneRef.current) return;
    setupDoneRef.current = true;
    setIsReady(false); // Setup başlarken gizle

    scene.traverse(obj => {
      if (obj.name?.startsWith('FinishedRig')) {
        obj.traverse(child => {
          if (child.userData?.processed) child.userData.processed = false;
          if (child.isMesh && child.name?.toLowerCase().includes('kafa')) {
            const toRemove = [];
            child.children.forEach(c => { if (c.userData?.addedPart) toRemove.push(c); });
            toRemove.forEach(c => child.remove(c));
          }
        });
      }
    });

    const figures = new Map();
    scene.traverse(obj => {
      if (obj.name?.startsWith('FinishedRig')) figures.set(getSuffixNumber(obj.name), obj);
    });

    // Figürleri suffix numarasına göre sırala
    // FinishedRig001 → mini1, FinishedRig002 → mini2, geri kalanlar → seyirci
    // Bu sayede kamera açısı/pozisyon farketmez, 50 sahne için tutarlı çalışır
    const figureEntries = Array.from(figures.entries());
    const sortedBySuffix = figureEntries.sort((a, b) => a[0] - b[0]); // Küçük suffix = önce
    
    // İlk iki figürü mini1 ve mini2 olarak ata
    const playerFigures = sortedBySuffix.slice(0, 2);
    const spectatorFigures = sortedBySuffix.slice(2);
    
    // Sahne-1: Tüm mesh'lere material ayarı uygula (özel ışıklandırma kullanıyor)
    // Sahne-2+: Sadece karakter figürlerine (FinishedRig) uygula, sahne materiallerini koru
    const isScene1 = scenePath === sceneModelPath1;
    //const isRealTimeScene = scenePath === sceneModelPath27;
    const isScene27 = scenePath === sceneModelPath27;
const isRealTimeScene = isScene27
    || scenePath === sceneModelPathBasketball
  || scenePath === sceneModelPathClassroom
  || scenePath === sceneModelPathCafe
  || scenePath === sceneModelPathOrchestra
  || scenePath === sceneModelPathPlayground
  || scenePath === sceneModelPathRobot
  || scenePath === sceneModelPathSupermarket
  || scenePath === sceneModelPathTennis;
    if (isScene1) {
     
    } else {
    
      

      scene.traverse(child => {
        if (!child.isMesh) return;
        
        // Shadow'u her zaman ata (material null olsa bile shadow cast edebilir)
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (!child.material) return;

        // FinishedRig altındaki mesh'lere dokunma (karakter)
        let isCharacterMesh = false;
        let parent = child.parent;
        while (parent) {
          if (parent.name?.startsWith('FinishedRig')) { isCharacterMesh = true; break; }
          parent = parent.parent;
        }

        // ─── Sahne 27 (Swimming Pool Real-time + SSAO) ───
        // Orijinal materyaller korunuyor — SSAO post-processing contact shadow ekler
        // ─── Sahne 27 (Swimming Pool Real-time) ───
          if (isRealTimeScene) {
          child.receiveShadow = true;
          
          // Parent adını bul
          let parentName = '';
          let p = child.parent;
          while (p) {
            if (['zemin','havuz','duvar','bank'].includes(p.name?.toLowerCase())) {
              parentName = p.name.toLowerCase();
              break;
            }
            p = p.parent;
          }
          
          // Zemin ve havuz: sadece gölge al, gölge atma
          if (parentName === 'zemin' || parentName === 'havuz') {
            child.castShadow = false;
          } else {
            child.castShadow = true;
          }
          
          // Cam/su: shadow cast etmesin
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              if (mat.isMeshPhysicalMaterial && mat.transmission > 0) {
                child.castShadow = false;
              }
              if (mat.transparent && mat.opacity < 0.5) {
                child.castShadow = false;
              }
              if (mat.isMeshStandardMaterial) {
                mat.envMapIntensity = 0.5;
              }
              mat.needsUpdate = true;
            });
          }
          return;
        }

        // ─── Diğer sahneler (2, 4, 5 vb.) ───
        child.castShadow = true;
        child.receiveShadow = true;
        if (isCharacterMesh) return;

        // Cam materyali - isimde 57895 geçen mesh'ler
        if (child.name && child.name.includes('57895')) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#88bbff'),
            transparent: true,
            opacity: 0.35,
            roughness: 0.05,
            metalness: 0.1,
            envMapIntensity: 0,
            side: THREE.DoubleSide,
          });
          child.material.needsUpdate = true;
          return;
        }

        // Sahne mesh'leri: lightmap uygula
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (isScene4) {
            if (child.geometry.attributes.uv1 || child.geometry.attributes.uv2) {
              mat.lightMap = lightmapTex;
              mat.lightMapIntensity = 1.0;
            }
            mat.roughness = 0.15;
            mat.metalness = 0.0;
            mat.envMapIntensity = 2.0;
          } else if (isScene2 && scene2LightmapMap) {
            const meshLightmap = scene2LightmapMap[child.name];
            if (meshLightmap && (child.geometry.attributes.uv1 || child.geometry.attributes.uv2)) {
              mat.lightMap = meshLightmap;
              mat.lightMapIntensity = 1.5;
            }
            mat.roughness = 0.25;
            mat.metalness = 0.0;
            mat.envMapIntensity = 0.2;
            child.castShadow = true;
            child.receiveShadow = true;
          } else {
            mat.normalMap = null;
            mat.envMapIntensity = 0;
            if (child.geometry.attributes.uv1 || child.geometry.attributes.uv2) {
              mat.lightMap = lightmapTex;
              mat.lightMapIntensity = 0.15;
            }
          }
          mat.needsUpdate = true;
        });
        }); 
    }

    const tempParent = new THREE.Object3D();
    tempParent.add(scene);
    tempParent.updateWorldMatrix(false, true);

    const getHeadScaleFactor = (kafaMesh) => {
      const ws = new THREE.Vector3();
      kafaMesh.getWorldScale(ws);
      return ws.x > 0 ? 1.0 / ws.x : 1.0;
    };

    const getHeadTopWorldY = (kafaMesh) => {
      const box = new THREE.Box3().setFromObject(kafaMesh);
      return box.max.y;
    };

    /*const addHairToFigure = (kafaMesh, config) => {
        if (!kafaMesh || !config || config.hairTextureIndex === 0) return Promise.resolve();
        const glbPath = getHairGLBPath(config.hairTextureIndex);
        if (!glbPath) return Promise.resolve();

        const sf = getHeadScaleFactor(kafaMesh);
        const hairColorHex = HAIR_COLORS[config.hairColor || 0];

        return loadGLBCached(glbPath).then((hairClone) => {
        if (!kafaMesh.parent) return;
        hairClone.userData.addedPart = true;
        hairClone.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(hairColorHex),
              metalness: 0.0,
              roughness: 0.85,
              envMapIntensity: 0.0,
            });
          }
        });
        const offset = HAIR_MODEL_OFFSETS[config.hairTextureIndex] ?? DEFAULT_OFFSET;
        hairClone.position.set(0, 1.3 * sf, 0.5 * sf);
        hairClone.rotation.set(4.6, Math.PI, 0);
        hairClone.scale.set(
          0.9 * sf * offset.scale[0],
          1.0 * sf * offset.scale[1],
          1.0 * sf * offset.scale[2]
        );
        kafaMesh.add(hairClone);
      }).catch(err => {
        console.warn('Hair yüklenemedi:', glbPath, err);
      });
    };
    */

    // ═══════════════════════════════════════════════════════════════
    // VERSİYON 2: DELTA_SCALE ayarlanabilir (0.3, 0.5, 0.7, 1.0 dene)
    // ═══════════════════════════════════════════════════════════════
   /* const addHairToFigure = (kafaMesh, config) => {
  if (!kafaMesh || !config || config.hairTextureIndex === 0) return Promise.resolve();
  const glbPath = getHairGLBPath(config.hairTextureIndex);
  if (!glbPath) return Promise.resolve();

  const sf = getHeadScaleFactor(kafaMesh);
  const hairColorHex = HAIR_COLORS[config.hairColor || 0];
  const offset = HAIR_MODEL_OFFSETS[config.hairTextureIndex] ?? DEFAULT_OFFSET;

  const dx = offset.position[0] - DEFAULT_OFFSET.position[0];
  const dy = offset.position[1] - DEFAULT_OFFSET.position[1];
  const dz = offset.position[2] - DEFAULT_OFFSET.position[2];

  return loadGLBCached(glbPath).then((hairClone) => {
    if (!kafaMesh.parent) return;
    hairClone.userData.addedPart = true;
    hairClone.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(hairColorHex),
          metalness: 0.0,
          roughness: 0.85,
          envMapIntensity: 0.0,
        });
      }
    });

    const BASE_Y = 1.3;
    const BASE_Z = 0.5;

    hairClone.position.set(
      0           + dx,
      BASE_Y * sf + dy,
      BASE_Z * sf + dz
    );

    hairClone.rotation.set(4.6, Math.PI, 0);

    hairClone.scale.set(
      0.9 * sf * offset.scale[0],
      1.0 * sf * offset.scale[1],
      1.0 * sf * offset.scale[2]
    );

    kafaMesh.add(hairClone);
  }).catch(err => {
    console.warn('Hair yüklenemedi:', glbPath, err);
  });
};*/
// ═══════════════════════════════════════════════════════════════
    // GamePage'e özel saç offset'leri
    // HAIR_MODEL_OFFSETS'e DOKUNULMAZ — CharacterCustomizationPage bozulmaz
    // Panel'den export edilen değerler buraya yapıştırılır
    //
    // Format: { [textureIndex]: { position: [x, y, z], scale: [x, y, z] } }
    // ═══════════════════════════════════════════════════════════════
    const GAME_HAIR_OFFSETS = {
      // Panel'den export edip buraya yapıştır:
      // 23: { position: [0, 1.5, 0.3], scale: [0.9, 1.0, 1.0] },
      // 118: { position: [0.2, 1.1, 0.6], scale: [0.85, 0.9, 1.0] },
      1: { position: [0,1,-0.15], scale: [0.89,0.9,1.12] },
  2: { position: [-0.1,1.2,0.9], scale: [0.94,1,1] },
  3: { position: [0,1,0.5], scale: [0.98,1,1] },
  4: { position: [0,0.95,0.55], scale: [0.99,1,1] },
  5: { position: [0,1.35,1], scale: [0.98,1,1] },
  6: { position: [0,1,0.25], scale: [0.92,0.92,1] },
  7: { position: [0,0.9,0.45], scale: [0.99,1,1] },
  8: { position: [0,1,0.75], scale: [0.99,1,1] },
  9: { position: [0,1.3,0.5], scale: [1,1,1] },
  10: { position: [0.05,1,0.3], scale: [1,1,1] },
  11: { position: [0,1.4,1], scale: [1,1,1] },
  12: { position: [0,1.2,0.8], scale: [0.96,1,1] },
  13: { position: [0,1.3,0.5], scale: [0.98,1,1] },
  15: { position: [0,1.3,0.5], scale: [1,1,1] },
  16: { position: [0.4,-0.4,1.1], scale: [0.99,1,1] },
  17: { position: [0,1,0.5], scale: [0.96,1,1] },
  19: { position: [0,1,0.5], scale: [1,1,1] },
  22: { position: [0,1,0.25], scale: [0.99,0.85,1] },
  23: { position: [0,1,0.25], scale: [0.95,1,1] },
  24: { position: [0,1,0.25], scale: [0.94,0.9,1] },
  25: { position: [0,0.9,0.25], scale: [1,1,1.02] },
  26: { position: [0.05,1.3,0.5], scale: [0.96,1,1] },
  27: { position: [0,1,0.25], scale: [0.94,0.9,1] },
  29: { position: [0.05,0.8,-1.45], scale: [0.96,0.7,1] },
  30: { position: [0.1,1.1,0.5], scale: [0.92,1,1] },
  31: { position: [0,1.5,0], scale: [0.9,0.8,1] },
  32: { position: [0,1.15,0.8], scale: [0.96,1,1] },
  33: { position: [0,1.3,1.25], scale: [0.9,1,1] },
  34: { position: [0,0.85,0.25], scale: [0.9,0.85,1] },
  35: { position: [0,0.7,0.75], scale: [0.98,1,1.08] },
  36: { position: [0,1,0.5], scale: [0.96,1,1] },
  38: { position: [0,1.5,0.8], scale: [0.9,1,1] },
  39: { position: [0,1,0.5], scale: [0.95,1,1] },
  40: { position: [0,1.05,1], scale: [0.94,1,1.02] },
  41: { position: [0,1.05,0.55], scale: [0.9,1,1] },
  44: { position: [0,0.15,-2.05], scale: [0.94,0.78,1] },
   103: { position: [0,1.25,0.6], scale: [0.97,1,1] },
  105: { position: [0,1.3,0.5], scale: [0.94,1,1] },
  106: { position: [0,0.8,0.95], scale: [0.99,1,1.04] },
  107: { position: [0.4,1,0.5], scale: [0.9,0.96,1] },
  108: { position: [0,0.65,0.9], scale: [0.9,1,1] },
  111: { position: [0.15,1,0.4], scale: [1,1,1] },
  112: { position: [0,1,0.65], scale: [0.9,1,1] },
  113: { position: [0.05,0.9,0.25], scale: [1.02,1,1] },
  114: { position: [0,1,0.3], scale: [1.02,0.9,1] },
  115: { position: [0,0.8,0.15], scale: [0.97,0.94,1] },
  116: { position: [0,0.9,0.9], scale: [0.94,1,1.02] },
  117: { position: [0.2,1,0.7], scale: [0.96,1,1] },
  118: { position: [0.5,0.7,0.5], scale: [1.03,1,1] },
  119: { position: [0,0.95,0.65], scale: [0.9,1,1.04] },
  120: { position: [0,1,0.5], scale: [0.9,1,1] },
  121: { position: [0,0.8,0.65], scale: [0.9,1,1.06] },
  122: { position: [0,1,0.5], scale: [0.94,1,1] },
  123: { position: [0,1,0.35], scale: [1,1,1.05] },
  124: { position: [0.05,1,0.5], scale: [1,1,1] },
  125: { position: [0,1,0.55], scale: [0.94,1,1] },
  126: { position: [0,0.75,-0.95], scale: [0.94,0.85,1] },
  127: { position: [0,0.7,0.4], scale: [1,0.98,1.02] },
  128: { position: [0,1,0.65], scale: [1.01,1,1] },
  129: { position: [0,1,0.5], scale: [0.9,1,1] },
  130: { position: [0.3,0.95,0.5], scale: [1.02,1,1] },
  131: { position: [0,1,0.65], scale: [0.96,1,1] },
  132: { position: [0,0.75,0.45], scale: [0.96,1,1.04] },
  133: { position: [0,1,0.25], scale: [0.99,0.85,1] },
  134: { position: [0,1,0.5], scale: [0.96,1,1] },
  135: { position: [0,0.9,0.5], scale: [1,1,1] },
  136: { position: [0,1,0.5], scale: [0.98,1,1] },
  137: { position: [0.1,1,0.5], scale: [0.96,1,1] },
  138: { position: [0,1,0.55], scale: [0.92,1,1] },
  139: { position: [0,1.1,0.5], scale: [0.96,1,1] },
  140: { position: [0,1,0.65], scale: [0.9,1,1] },
  141: { position: [0,0.9,0.5], scale: [1,1,1] },
  142: { position: [0,1,0.8], scale: [0.94,1,1] },
  143: { position: [0,0.9,0.75], scale: [1,1,1.06] },
  144: { position: [0,1,0.65], scale: [0.99,1,1] },
  145: { position: [0,0.6,-0.4], scale: [1,0.85,1.06] },
  146: { position: [0,0.65,0.25], scale: [0.99,1,1] },
  147: { position: [0,1,0.9], scale: [0.98,1,1.02] },
  148: { position: [0,1.3,0.55], scale: [0.9,1,1.1] },
  149: { position: [0,1,0.75], scale: [0.98,1,1] },
  150: { position: [0,0.9,0.5], scale: [0.9,1,1.04] },
  151: { position: [0,1,0.85], scale: [0.94,1,1.06] },
  152: { position: [0,1,0.65], scale: [0.96,1,1] },
  201: { position: [0,1,0.15], scale: [0.94,0.85,0.96] },
  202: { position: [0,1,0.6], scale: [0.9,1,1] },
  203: { position: [0,1,-0.15], scale: [0.92,0.85,1] },
  205: { position: [0,1,1.8], scale: [1,1,1] },
  206: { position: [0,1,0.5], scale: [0.9,1,1] },
  207: { position: [0,1,0.5], scale: [0.9,1,1] },
  208: { position: [0,1,0.5], scale: [0.9,1,1] },
  209: { position: [0,1,0.65], scale: [0.9,1,1] },
  210: { position: [0,1,0.5], scale: [0.99,1,1] },
  211: { position: [0,1,0.5], scale: [0.98,1,1] },
  212: { position: [0,0.4,-0.75], scale: [0.95,0.8,1] },
  213: { position: [0,1,0.5], scale: [0.9,1,1] },
  214: { position: [0,1,-1], scale: [0.97,0.85,1] },
  215: { position: [0,1,0.5], scale: [0.9,1,1] },
  216: { position: [0,1,-0.85], scale: [0.95,0.85,1] },
  217: { position: [0,0.7,-0.45], scale: [0.92,0.87,1] },
  218: { position: [0,1,0.6], scale: [0.99,1,1] },
  219: { position: [0,0.8,0.5], scale: [0.92,1,1] },
  220: { position: [0,1,0.5], scale: [0.9,1,1] },
  221: { position: [0,0.6,-0.9], scale: [0.95,0.8,1.04] },
  222: { position: [0,1,-0.95], scale: [0.95,0.8,1] },
  223: { position: [0,1,0.45], scale: [0.9,1,1] },
  224: { position: [0,0.5,-0.35], scale: [0.95,0.8,1] },
  225: { position: [0,1,-0.05], scale: [0.96,1,1] },
  226: { position: [0.2,1,0.5], scale: [1,1,1] },
  227: { position: [0,1,0.6], scale: [0.9,1,1] },
  228: { position: [0,1,0.4], scale: [0.99,1,1] },
  229: { position: [0,1,-0.4], scale: [0.92,0.9,1] },
  230: { position: [0,1,0.5], scale: [0.98,1,1] },
  231: { position: [0,1,1], scale: [0.99,1,1] },
  232: { position: [0,1,0.5], scale: [0.9,1,1] },
  233: { position: [0,1.45,0.35], scale: [0.99,0.9,1] },
  234: { position: [0,1,0], scale: [0.95,0.85,1] },
  235: { position: [0,1,0.3], scale: [0.9,1,1] },
  236: { position: [0,1,0.3], scale: [0.99,1,1] },
  237: { position: [0,1,0.7], scale: [0.9,1,1] },
  238: { position: [0,1,-0.4], scale: [0.95,0.87,1] },
  239: { position: [0,1,-0.9], scale: [0.99,0.85,1] },
  240: { position: [0,1,-0.4], scale: [0.9,0.9,1] },
  241: { position: [0,1,0.25], scale: [0.94,0.9,1] },
  242: { position: [0,1,-0.05], scale: [0.95,0.8,1] },
  243: { position: [0,1,-0.65], scale: [0.99,0.85,1] },
  244: { position: [0,1,-0.2], scale: [0.95,0.85,1] },
  245: { position: [0,0.7,-0.9], scale: [0.9,0.82,0.95] },
  246: { position: [0,0.65,0], scale: [0.99,0.9,1] },
    };

    const addHairToFigure = (kafaMesh, config) => {
      if (!kafaMesh || !config || config.hairTextureIndex === 0) return Promise.resolve();
      const glbPath = getHairGLBPath(config.hairTextureIndex);
      if (!glbPath) return Promise.resolve();

      const sf = getHeadScaleFactor(kafaMesh);
      const hairColorHex = HAIR_COLORS[config.hairColor || 0];
      const offset = HAIR_MODEL_OFFSETS[config.hairTextureIndex] ?? DEFAULT_OFFSET;

      // Öncelik: 1) Panel override  2) GAME_HAIR_OFFSETS  3) Normal hesap
      const panelOverride = gameHairOverrides[config.hairTextureIndex];
      const gameOffset = GAME_HAIR_OFFSETS[config.hairTextureIndex];

      const dx = offset.position[0] - DEFAULT_OFFSET.position[0];
      const dy = offset.position[1] - DEFAULT_OFFSET.position[1];
      const dz = offset.position[2] - DEFAULT_OFFSET.position[2];

      return loadGLBCached(glbPath).then((hairClone) => {
        if (!kafaMesh.parent) return;
        hairClone.userData.addedPart = true;
        hairClone.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          const adjustedColor = new THREE.Color(hairColorHex);
adjustedColor.multiplyScalar(0.5);

child.material = new THREE.MeshStandardMaterial({
  color: adjustedColor,
  metalness: 0.1,
  roughness: 0.4,
  envMapIntensity: 0.0,
});
          }
        });

        const BASE_Y = 1.3;
        const BASE_Z = 0.5;

        if (panelOverride) {
          // Canlı debug panel ayarı
          hairClone.position.set(panelOverride.position[0], panelOverride.position[1], panelOverride.position[2]);
          hairClone.scale.set(panelOverride.scale[0], panelOverride.scale[1], panelOverride.scale[2]);
        } else if (gameOffset) {
          // Kaydedilmiş GamePage offset
          hairClone.position.set(gameOffset.position[0], gameOffset.position[1], gameOffset.position[2]);
          hairClone.scale.set(gameOffset.scale[0], gameOffset.scale[1], gameOffset.scale[2]);
        } else {
          // Default hesap
          hairClone.position.set(0, BASE_Y * sf, BASE_Z * sf);
          hairClone.scale.set(
            0.9 * sf * offset.scale[0],
            1.0 * sf * offset.scale[1],
            1.0 * sf * offset.scale[2]
          );
        }

        hairClone.rotation.set(4.6, Math.PI, 0);
        kafaMesh.add(hairClone);
         hairClone.traverse(child => {
          child.frustumCulled = false;
        });
      }).catch(err => {
        console.warn('Hair yüklenemedi:', glbPath, err);
      });
    };
       const applyPolygonOffset = (object) => {
      object.traverse(child => {
        if (!child.isMesh || !child.material) return;
        child.renderOrder = 1;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          mat.polygonOffset = true;
          mat.polygonOffsetFactor = -1;
          mat.polygonOffsetUnits = -4;
          mat.needsUpdate = true;
        });
      });
    };
    const addFaceToFigure = (kafaMesh, isPlayer, config) => {
       
      if (!kafaMesh) return { mouthData: null, promises: [] };
      const hasCustomEye = config?.eyeModelName;
      const hasCustomMouth = config?.mouthModelName;
      const gltfFaceLoader = new GLTFLoader();
      const sf = getHeadScaleFactor(kafaMesh);
      const promises = [];

      // ===== GÖZ / GÖZLÜK =====
      if (hasCustomEye) {
        // Custom eye/glasses model yükle
        const eyePath = `/models/face/${config.eyeModelName}.glb`;
        const eyePromise = loadGLBCached(eyePath).then((eyeClone) => {
          eyeClone.userData.addedPart = true;
          const isGlasses = config.eyeModelName.includes('glasses');
          
          eyeClone.traverse(c => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              c.frustumCulled = false;

              const meshName = (c.name || '').toLowerCase();
              const isBrows = meshName.includes('brow');
              const isLash = meshName.includes('lash') || meshName.includes('kirpik');
              const isFrame = meshName.includes('glasses');
              const isLens = meshName.includes('lens') || meshName.includes('_cam');

              // Kaş rengi
              if (isBrows) {
                c.material = new THREE.MeshStandardMaterial({
                  color: config.eyebrowColor || '#4D1F00',
                  roughness: 0.8,
                  metalness: 0.0,
                });
                return;
              }

              // Kirpik rengi
              if (isLash) {
                c.material = new THREE.MeshStandardMaterial({
                  color: config.eyebrowColor || '#4D1F00',
                  roughness: 0.8,
                  metalness: 0.0,
                });
                return;
              }

              // Gözlük çerçeve rengi
              if (isFrame) {
                c.material = new THREE.MeshStandardMaterial({
                  color: config.glassesColor || '#1C1C1C',
                  metalness: 0.2,
                  roughness: 0.4,
                });
                return;
              }

              // Lens — dokunma
              if (isLens) return;

              // Göz rengi (gözlük değilse)
              if (config.eyeColor) {
                // Highlight/sclera kontrolü — map yoksa + parlaksa atla
                const origColor = c.material?.color;
                const hasMap = !!c.material?.map;
                if (origColor && !hasMap) {
                  const lum = origColor.r * 0.299 + origColor.g * 0.587 + origColor.b * 0.114;
                  if (lum >= 0.75) return;
                }
                c.material = new THREE.MeshStandardMaterial({
                  color: config.eyeColor,
                  metalness: 0.1,
                  roughness: 0.3,
                });
                return;
              }

              // Geri kalan — mipmap kapat
              if (c.material) {
                c.material.metalness = 0.0;
                c.material.roughness = 0.9;
                const mats = Array.isArray(c.material) ? c.material : [c.material];
                mats.forEach(m => {
                  if (!m) return;
                  Object.values(m).forEach(v => {
                    if (v?.isTexture) {
                      v.generateMipmaps = false;
                      v.minFilter = THREE.LinearFilter;
                      v.magFilter = THREE.LinearFilter;
                      v.anisotropy = 1;
                      v.needsUpdate = true;
                    }
                  });
                });
              }
            }
          });
          
          eyeClone.position.set(0, 0.1 * sf, 0);
          eyeClone.rotation.set(4.7, Math.PI, 0);
          eyeClone.scale.set(sf, sf, sf);
          kafaMesh.add(eyeClone);
        }).catch((err) => {
          console.warn('Custom eye model yüklenemedi:', eyePath, err);
          // Fallback: default göz ekle
addDefaultEyes(kafaMesh, config);
          addDefaultEyebrows(kafaMesh, config);
        });
        promises.push(eyePromise);
      } else {
        // Default göz + kaşlar
addDefaultEyes(kafaMesh, config);
          addDefaultEyebrows(kafaMesh, config);
      }

      // ===== AĞIZ / SAKAL =====
      let mouthData = null;
      
      if (hasCustomMouth) {
        // Custom mouth/facial hair model yükle — lip sync ile birlikte çalışacak
        const mouthPath = `/models/face/${config.mouthModelName}.glb`;
        
        // Önce default ağzı da ekle (lip sync FBX'leri buna bağlı)
        const defaultMouthForSync = addDefaultMouth(kafaMesh);
        defaultMouthForSync.visible = false; // Custom varken gizle
        
        const isFacialHair = config?.mouthModelName?.includes('facialhair');
        const mouthDataObj = isPlayer 
          ? { kafaMesh, defaultMouth: defaultMouthForSync, customMouthObj: null, fbxMouths: [], currentMouth: defaultMouthForSync, scaleFactor: sf, hasFacialHair: isFacialHair }
          : null;
        const mouthPromise = loadGLBCached(mouthPath).then((mouthClone) => {
          mouthClone.userData.addedPart = true;
          mouthClone.traverse(c => {
            if (c.isMesh) { c.castShadow = true; c.receiveShadow = true;
              c.frustumCulled = false;
              // ★ Mipmap kapat + materyal ayarı
              const mats = Array.isArray(c.material) ? c.material : [c.material];
              mats.forEach(m => {
                if (!m) return;
                if (m.metalness !== undefined) m.metalness = 0.0;
                if (m.roughness !== undefined) m.roughness = 0.8;
                Object.values(m).forEach(v => {
                  if (v?.isTexture) {
                    v.generateMipmaps = false;
                    v.minFilter = THREE.LinearFilter;
                    v.magFilter = THREE.LinearFilter;
                    v.anisotropy = 1;
                    v.needsUpdate = true;
                  }
                });
              });

              // Facialhair rengi (sakal/bıyık) — eyebrowColor ile
              if (config?.mouthModelName?.includes('facialhair') && config?.eyebrowColor) {
  const mn = (c.name || '').toLowerCase();
  if (mn.includes('facialhair') || mn.includes('beard') || mn.includes('mustache')) {
    const adjustedBeard = new THREE.Color(config.eyebrowColor);
    adjustedBeard.multiplyScalar(0.65);
    c.material = new THREE.MeshStandardMaterial({
      color: adjustedBeard,
      roughness: 0.6,
      metalness: 0.0,
    });
  }
}
            }
          });
          mouthClone.position.set(0, 0 * sf, 0.2 * sf);
          mouthClone.rotation.set(4.712, Math.PI, 0);
          mouthClone.scale.set(1 * sf, 1 * sf, 1 * sf);
          // Facialhair modelinde ağız mesh'lerini işaretle (konuşurken gizlenecek)
          if (isFacialHair) {
            mouthClone.traverse(c => {
              if (!c.isMesh) return;
              const mn = (c.name || '').toLowerCase();
              // Sakal/bıyık mesh'leri → sakal olarak işaretle
              if (mn.includes('facialhair') || mn.includes('beard') || mn.includes('mustache')) {
                c.userData._isBeardMesh = true;
              } else {
                // Geri kalan = ağız/dudak mesh'leri
                c.userData._isMouthMesh = true;
              }
            });
          }
          kafaMesh.add(mouthClone);
          
          // Referansı kaydet (lip sync toggle için)
          if (mouthDataObj) mouthDataObj.customMouthObj = mouthClone;
        }).catch((err) => {
          console.warn('Custom mouth model yüklenemedi:', mouthPath, err);
          defaultMouthForSync.visible = true;
        });
        promises.push(mouthPromise);
        
        mouthData = mouthDataObj;
      } else {
        // Default ağız
        const defaultMouthClone = addDefaultMouth(kafaMesh);
        
        if (isPlayer) {
          mouthData = { kafaMesh, defaultMouth: defaultMouthClone, fbxMouths: [], currentMouth: defaultMouthClone, scaleFactor: sf, hasFacialHair: false };
        }
      }

        // Tüm eklenen parçaların frustumCulled'ını kapat
      kafaMesh.traverse(child => {
        child.frustumCulled = false;
      });

      return { mouthData, promises };
    };
    
    // === Default model helper'ları ===
    const addDefaultEyes = (kafaMesh, config) => {
      const sf = getHeadScaleFactor(kafaMesh);
      const eyesClone = eyeScene.clone(true);
      eyesClone.userData.addedPart = true;
      eyesClone.position.set(0, 0.1 * sf, 0);
      eyesClone.rotation.set(4.7, 0, 0);
      eyesClone.scale.set(sf, sf, sf);
      eyesClone.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          c.frustumCulled = false;
          if (c.material) {
            c.material.metalness = 0.0;
            c.material.roughness = 0.9;
          }
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach(m => {
            if (!m) return;
            Object.values(m).forEach(v => {
              if (v?.isTexture) {
                v.generateMipmaps = false;
                v.minFilter = THREE.LinearFilter;
                v.magFilter = THREE.LinearFilter;
                v.needsUpdate = true;
              }
            });
          });

          // Göz rengi uygula (highlight/beyaz mesh'leri atla)
          if (config?.eyeColor) {
            const lum = c.material.color.r * 0.299 + c.material.color.g * 0.587 + c.material.color.b * 0.114;
            if (lum < 0.75) {
              c.material = new THREE.MeshStandardMaterial({
                color: config.eyeColor,
                metalness: 0.1,
                roughness: 0.3,
              });
            }
          }
        }
      });
      kafaMesh.add(eyesClone);
    };
    
    const addDefaultEyebrows = (kafaMesh, config) => {
      const sf = getHeadScaleFactor(kafaMesh);
      const eyebrowsClone = eyebrowsScene.clone(true);
      eyebrowsClone.userData.addedPart = true;
      const browColor = config?.eyebrowColor || '#4D1F00';
      eyebrowsClone.traverse(c => { 
        if (c.isMesh) { c.castShadow = true; c.frustumCulled = false; c.material = new THREE.MeshStandardMaterial({ color: browColor, roughness: 0.8, metalness: 0.0 }); }
      });
      eyebrowsClone.position.set(0, 4.7 * sf, -7 * sf);
      eyebrowsClone.rotation.set(4.6, 9.425, 0);
      eyebrowsClone.scale.set(sf, sf, sf);
      kafaMesh.add(eyebrowsClone);
    };
    
    const addDefaultMouth = (kafaMesh) => {
      const sf = getHeadScaleFactor(kafaMesh);
      const defaultMouthClone = mouthScene.clone(true);
      defaultMouthClone.userData.addedPart = true;
      defaultMouthClone.traverse(c => { 
        if (c.isMesh) { c.castShadow = true; c.frustumCulled = false; c.material = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8, metalness: 0.0 }); }
      });
      defaultMouthClone.position.set(0, 0.7 * sf, 0.5 * sf);
      defaultMouthClone.rotation.set(4.6, 0, 0);
      defaultMouthClone.scale.set(0.95 * sf, 0.95 * sf, 0.95 * sf);
      kafaMesh.add(defaultMouthClone);
      return defaultMouthClone;
    };

    const createPremiumPlasticMaterial = (color) => new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.12,
      roughness: 0.35,
      envMapIntensity: 0.3,
    });

    const applyColorsToFigure = (figureRig, config, isPlayer, playerNum, spectatorIndex) => {
      if (!figureRig) return null;

         // ─── SCENE 2/3 SEYİRCİ ──────────────────────────────────────────────────
      if (!isPlayer && !isScene1) {
        const figurePromises = [];
       const spectatorConfig = getPooledSpectatorConfig(spectatorIndex);
        const outfit = getSpectatorOutfit(
          spectatorIndex,
          spectatorConfig.gender || 'male',
          sceneId,
          torsoManifest,
          legsManifest,
          spectatorSessionSeed
        );
          const torsoTexture = loadTorsoTexture(outfit.torsoTextureId);
        const legTexture = loadLegTexture(outfit.legTextureId);

        let kafaMesh = null;
        const figureBox = new THREE.Box3().setFromObject(figureRig);
        const figureCenter = new THREE.Vector3();
        const figureSize = new THREE.Vector3();
        figureBox.getCenter(figureCenter);
        figureBox.getSize(figureSize);
        const beltYThreshold = figureCenter.y + figureSize.y * 0.05;

        figureRig.traverse(child => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          const n = normalizeText(child.name);
          if (!kafaMesh && (n.startsWith('kafa') || n.includes('head') || n === 'iconhead')) kafaMesh = child;
        });

        // Fallback: kafa bulunamazsa en yüksek mesh
        if (!kafaMesh) {
          let highestY = -Infinity;
          figureRig.traverse(child => {
            if (!child.isMesh || child.userData?.addedPart) return;
            const box = new THREE.Box3().setFromObject(child);
            const cy = (box.min.y + box.max.y) / 2;
            if (cy > highestY) { highestY = cy; kafaMesh = child; }
          });
        }

        const headTopY = kafaMesh ? getHeadTopWorldY(kafaMesh) : Infinity;
        const defaultTorsoColor = outfit.fallbackTorsoColor;
        const defaultLegColor = outfit.fallbackLegColor;

        figureRig.traverse(child => {
          if (!child.isMesh || child.userData?.addedPart) return;

          if (child === kafaMesh) {
            child.material = createPremiumPlasticMaterial(SKIN_COLOR);
            return;
          }

          const box = new THREE.Box3().setFromObject(child);
          const cy = (box.min.y + box.max.y) / 2;
          if (cy >= headTopY * 0.98) { child.visible = false; return; }

          const n = normalizeText(child.name);
          if (n.includes('bool')) { child.visible = false; return; }

          // Bacak / ayak
          if (n.includes('ayak') || n.includes('bacak') || n.includes('leg') || n.includes('bel') ||
              n.includes('hip') || n.includes('pelvis') || n.includes('don') || n.includes('pant') ||
              n.includes('foot') || n.includes('waist') || n.includes('iskelet')) {
            child.material = legTexture
              ? new THREE.MeshStandardMaterial({ map: legTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(defaultLegColor);
            return;
          }

          // El (cilt)
          if ((n.includes('larms') || n.includes('rarms') || n.includes('hand') || n.includes('parmak') ||
               (n.includes('el') && !n.includes('bel') && !n.includes('iskelet'))) && !n.includes('iskelet')) {
            child.material = createPremiumPlasticMaterial(SKIN_COLOR);
            return;
          }

          // Gövde
          if (n.startsWith('govde') || n.includes('torso') || n.includes('body') || n.includes('chest')) {
            child.material = torsoTexture
              ? new THREE.MeshStandardMaterial({ map: torsoTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(defaultTorsoColor);
            return;
          }

          // Kol
          if (n.includes('kol') || n.includes('arm')) {
            child.material = torsoTexture
              ? new THREE.MeshStandardMaterial({ map: torsoTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(defaultTorsoColor);
            return;
          }

          // Eşleşmeyen → bel altı bacak, üstü gövde
          if (cy < beltYThreshold) {
            child.material = legTexture
              ? new THREE.MeshStandardMaterial({ map: legTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(defaultLegColor);
          } else {
            child.material = torsoTexture
              ? new THREE.MeshStandardMaterial({ map: torsoTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(defaultTorsoColor);
          }
        });

        if (kafaMesh && !kafaMesh.userData.processed) {
          kafaMesh.userData.processed = true;
          const hairP = addHairToFigure(kafaMesh, spectatorConfig);
          if (hairP) figurePromises.push(hairP);
          const { promises: faceP } = addFaceToFigure(kafaMesh, false, spectatorConfig);
          figurePromises.push(...faceP);
        }
        return { mouthData: null, promises: figurePromises };
      }

      // ─── SCENE 2/3 PLAYER ───────────────────────────────────────────────────
  // ─── SCENE 2/3 PLAYER ───────────────────────────────────────────────────
      if (isPlayer && !isScene1) {
        const figurePromises = [];
        let kafaMesh = null;
        figureRig.traverse(child => {
          if (!child.isMesh || kafaMesh) return;
          const n = normalizeText(child.name);
          if (n.startsWith('kafa') || n.includes('head') || n === 'iconhead') kafaMesh = child;
        });
        if (!kafaMesh) {
          let highestY = -Infinity;
          figureRig.traverse(child => {
            if (!child.isMesh || child.userData?.addedPart) return;
            const box = new THREE.Box3().setFromObject(child);
            const cy = (box.min.y + box.max.y) / 2;
            if (cy > highestY) { highestY = cy; kafaMesh = child; }
          });
        }

        // ★ EKLENEN: Torso & Leg renk/texture (Scene 1 mantığıyla aynı)
       // ★ Torso & Leg renk/texture (ID bazlı — yeni sistem)
        const torsoColor = playerNum === 1 ? '#FF0000' : '#0066CC';
        const legColor = playerNum === 1 ? '#1a1a1a' : '#2f6ee4';
        const torsoTextureId = config?.torsoTextureId || null;
        const torsoTexture = loadTorsoTexture(torsoTextureId);
        const armTexture = loadArmTexture(torsoTextureId);
        const legTextureId = config?.legTextureId || null;
        const legTexture = loadLegTexture(legTextureId);

        const headTopY = kafaMesh ? getHeadTopWorldY(kafaMesh) : Infinity;
        const figureBox = new THREE.Box3().setFromObject(figureRig);
        const figureCenter = new THREE.Vector3();
        const figureSize = new THREE.Vector3();
        figureBox.getCenter(figureCenter);
        figureBox.getSize(figureSize);
        const beltYThreshold = figureCenter.y + figureSize.y * 0.05;

        figureRig.traverse(child => {
          if (!child.isMesh || child.userData?.addedPart) return;
          child.castShadow = true;
          child.receiveShadow = true;

          if (child === kafaMesh) {
            child.material = createPremiumPlasticMaterial(SKIN_COLOR);
            return;
          }

          const box = new THREE.Box3().setFromObject(child);
          const cy = (box.min.y + box.max.y) / 2;
          if (cy >= headTopY * 0.98) { child.visible = false; return; }

          const n = normalizeText(child.name);

          if (n.includes('bool')) { child.visible = false; return; }

          // Bacak / ayak
          // Bacak / ayak
          // Bacak / ayak
          if (n.includes('ayak') || n.includes('bacak') || n.includes('leg') || n.includes('bel') ||
              n.includes('hip') || n.includes('pelvis') || n.includes('don') || n.includes('pant') ||
              n.includes('foot') || n.includes('waist') || n.includes('iskelet')) {
            child.material = legTexture
              ? new THREE.MeshStandardMaterial({ map: legTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(legColor);
            return;
          }

          // El (cilt rengi)
          if ((n.includes('larms') || n.includes('rarms') || n.includes('hand') || n.includes('parmak') ||
               (n.includes('el') && !n.includes('bel') && !n.includes('iskelet'))) && !n.includes('iskelet')) {
            child.material = createPremiumPlasticMaterial(SKIN_COLOR);
            return;
          }

          // Gövde
          if (n.startsWith('govde') || n.includes('torso') || n.includes('body') || n.includes('chest')) {
            child.material = torsoTexture
              ? new THREE.MeshStandardMaterial({ map: torsoTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(torsoColor);
            return;
          }

          // Kol
          // Kol — LegoFigure ile aynı: tam torso texture kullan (UV mapping halleder)
          if (n.includes('kol') || n.includes('arm')) {
            child.material = torsoTexture
              ? new THREE.MeshStandardMaterial({ map: torsoTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(torsoColor);
            return;
          }

          // Eşleşmeyen mesh → bel altı = bacak, üstü = gövde
          if (cy < beltYThreshold) {
            child.material = legTexture
              ? new THREE.MeshStandardMaterial({ map: legTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(legColor);
          } else {
            child.material = torsoTexture
              ? new THREE.MeshStandardMaterial({ map: torsoTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
              : createPremiumPlasticMaterial(torsoColor);
          }
        });

        // Saç ve yüz (değişmedi)
        let mouthData = null;
        if (kafaMesh && !kafaMesh.userData.processed) {
          kafaMesh.userData.processed = true;
          const toRemove = [];
          kafaMesh.children.forEach(c => { if (c.userData?.addedPart) toRemove.push(c); });
          toRemove.forEach(c => kafaMesh.remove(c));
          const hairP = addHairToFigure(kafaMesh, { hairTextureIndex: config.hairTextureIndex, hairColor: config.hairColor });
          if (hairP) figurePromises.push(hairP);
          const { mouthData: md, promises: faceP } = addFaceToFigure(kafaMesh, true, config);
          mouthData = md;
          figurePromises.push(...faceP);
        }
        return { mouthData, promises: figurePromises };
      }

        // ─── SCENE 1 ─────────────────────────────────────────────────────────────
      // Torso & Leg texture'larını yükle — player config, spectator outfit pool
      let torsoTextureId, legTextureId;
      let spectatorTorsoFallback = null;
      let spectatorLegFallback = null;
      if (isPlayer) {
        torsoTextureId = config?.torsoTextureId || null;
        legTextureId = config?.legTextureId || null;
          } else {
        const specCfg = getPooledSpectatorConfig(spectatorIndex);
        const outfit = getSpectatorOutfit(
          spectatorIndex,
          specCfg.gender || 'male',
          sceneId,
          torsoManifest,
          legsManifest,
          spectatorSessionSeed
        );
        torsoTextureId = outfit.torsoTextureId;
        legTextureId = outfit.legTextureId;
        spectatorTorsoFallback = outfit.fallbackTorsoColor;
        spectatorLegFallback = outfit.fallbackLegColor;
      }
      const torsoColor = isPlayer
        ? (playerNum === 1 ? '#FF0000' : '#0066CC')
        : spectatorTorsoFallback;
      const legColor = isPlayer
        ? (playerNum === 1 ? '#1a1a1a' : '#2f6ee4')
        : spectatorLegFallback;

      const torsoTexture = loadTorsoTexture(torsoTextureId);
      const armTexture = loadArmTexture(torsoTextureId);
      const legTexture = loadLegTexture(legTextureId);

      const figureBox = new THREE.Box3().setFromObject(figureRig);
      const figureCenter = new THREE.Vector3();
      const figureSize = new THREE.Vector3();
      figureBox.getCenter(figureCenter);
      figureBox.getSize(figureSize);
      const beltYThreshold = figureCenter.y + figureSize.y * 0.05;

      let kafaMesh = null;
      const unmatchedMeshes = [];
      
      figureRig.traverse(child => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        const n = normalizeText(child.name);
        let matched = false;
        
        if (n.startsWith('kafa') || n.includes('head')) { 
          kafaMesh = child; 
          child.material = createPremiumPlasticMaterial(SKIN_COLOR);
          matched = true;
        }
        else if (n.includes('bool')) {
          child.visible = false;
          matched = true;
        }
        else if (n.includes('ayak') || n.includes('bacak') || n.includes('leg') || n.includes('bel') || n.includes('hip') || n.includes('pelvis') || n.includes('kalca') || n.includes('don') || n.includes('pant') || n.includes('foot') || n.includes('waist') || n.includes('belt') || n.includes('kemer') || n.includes('iskelet')) { 
          child.material = legTexture
            ? new THREE.MeshStandardMaterial({ map: legTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
            : createPremiumPlasticMaterial(legColor);
          matched = true;
        }
        else if ((n.includes('larms') || n.includes('rarms') || n.includes('hand') || n.includes('parmak') || (n.includes('el') && !n.includes('bel') && !n.includes('iskelet'))) && !n.includes('iskelet')) { 
          child.material = createPremiumPlasticMaterial(SKIN_COLOR);
          matched = true;
        }
        // GÖVDE - texture varsa uygula
        else if (n.startsWith('govde') || n.includes('torso') || n.includes('body') || n.includes('chest')) { 
          if (torsoTexture) {
            child.material = new THREE.MeshStandardMaterial({
              map: torsoTexture,
              metalness: 0.12,
              roughness: 0.35,
              envMapIntensity: 0.3,
            });
          } else {
            child.material = createPremiumPlasticMaterial(torsoColor);
          }
          matched = true;
        }
        // KOLLAR — tam torso texture kullan (LegoFigure ile aynı)
        else if (n.includes('kol') || n.includes('arm')) { 
          child.material = torsoTexture
            ? new THREE.MeshStandardMaterial({ map: torsoTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
            : createPremiumPlasticMaterial(torsoColor);
          matched = true;
        }
        
        if (!matched) unmatchedMeshes.push(child);
      });
      
       unmatchedMeshes.forEach(child => {
        const childBox = new THREE.Box3().setFromObject(child);
        const childCenter = new THREE.Vector3();
        childBox.getCenter(childCenter);
        
        if (childCenter.y < beltYThreshold) {
          child.material = legTexture
            ? new THREE.MeshStandardMaterial({ map: legTexture, metalness: 0.12, roughness: 0.35, envMapIntensity: 0.3 })
            : createPremiumPlasticMaterial(legColor);
        } else {
          // Bel üstü = torso (texture varsa uygula)
          if (torsoTexture) {
            child.material = new THREE.MeshStandardMaterial({
              map: torsoTexture,
              metalness: 0.12,
              roughness: 0.35,
              envMapIntensity: 0.3,
            });
          } else {
            child.material = createPremiumPlasticMaterial(torsoColor);
          }
        }
      });

      let mouthData = null;
      const figurePromises = [];
      if (kafaMesh && !kafaMesh.userData.processed) {
        kafaMesh.userData.processed = true;
        const toRemove = [];
        kafaMesh.children.forEach(child => { if (child.userData?.addedPart) toRemove.push(child); });
        toRemove.forEach(child => kafaMesh.remove(child));
        if (isPlayer) {
          const hairP = addHairToFigure(kafaMesh, { hairTextureIndex: config.hairTextureIndex, hairColor: config.hairColor });
          if (hairP) figurePromises.push(hairP);
          const { mouthData: md, promises: faceP } = addFaceToFigure(kafaMesh, true, config);
          mouthData = md;
          figurePromises.push(...faceP);
        } else {
          const spectatorConfig = getPooledSpectatorConfig(spectatorIndex);
          const hairP = addHairToFigure(kafaMesh, spectatorConfig);
          if (hairP) figurePromises.push(hairP);
          const { mouthData: md, promises: faceP } = addFaceToFigure(kafaMesh, false, spectatorConfig);
          mouthData = md;
          figurePromises.push(...faceP);
        }
      }
      return { mouthData, promises: figurePromises };
    };

    // ★ Tüm async asset promise'lerini topla
    const allAssetPromises = [];

    const result1 = playerFigures[0]
      ? applyColorsToFigure(playerFigures[0][1], character1Config, true, 1, 0)
      : { mouthData: null, promises: [] };
    const result2 = playerFigures[1]
      ? applyColorsToFigure(playerFigures[1][1], character2Config, true, 2, 0)
      : { mouthData: null, promises: [] };

    let mini1MouthData = result1.mouthData;
    let mini2MouthData = result2.mouthData;
    allAssetPromises.push(...result1.promises, ...result2.promises);

    let spectatorIndex = 0;
    spectatorFigures.forEach(([suffix, figureRig]) => {
      const result = applyColorsToFigure(figureRig, null, false, 0, spectatorIndex);
      if (result?.promises) allAssetPromises.push(...result.promises);
      spectatorIndex++;
    });
    // ─── GEÇICI DEBUG: Tüm statik obje bbox'ları ───
    if (isRealTimeScene) {
      ['zemin', 'havuz', 'duvar', 'bank'].forEach(name => {
        scene.traverse(child => {
          if (child.name?.toLowerCase() === name) {
            const box = new THREE.Box3().setFromObject(child);
            console.log(`📦 ${name}: Y=[${box.min.y.toFixed(1)}..${box.max.y.toFixed(1)}] X=[${box.min.x.toFixed(1)}..${box.max.x.toFixed(1)}] Z=[${box.min.z.toFixed(1)}..${box.max.z.toFixed(1)}]`);
          }
        });
      });
    }
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    tempParent.remove(scene);
    groupRef.current.add(scene);

    // GLB'den kamera bul ve bildir (sahne-2 vb. için)
    let glbCamera = null;
    scene.traverse(obj => {
      if ((obj.isCamera || obj.isPerspectiveCamera || obj.isOrthographicCamera) && !glbCamera) {
        glbCamera = obj;
      }
    });
    
    if (glbCamera && onCameraFound) {
      // Transform matrislerini hesapla (zorunlu)
      scene.updateMatrixWorld(true);

      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      glbCamera.getWorldPosition(worldPos);
      glbCamera.getWorldQuaternion(worldQuat);
      
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuat);
      const target = worldPos.clone().add(forward.multiplyScalar(100));
      
      console.log('📷 GLB Camera Debug:', {
        name: glbCamera.name,
        worldPos: worldPos.toArray().map(v => Math.round(v * 10) / 10),
        target: target.toArray().map(v => Math.round(v * 10) / 10),
        fov: glbCamera.fov,
        localPos: glbCamera.position.toArray().map(v => Math.round(v * 10) / 10),
      });
      
      onCameraFound({
        position: [worldPos.x, worldPos.y, worldPos.z],
        target: [target.x, target.y, target.z],
        fov: glbCamera.fov || 50,
      });
    } else if (!glbCamera && onCameraFound) {
      console.warn('📷 GLB Camera bulunamadı! Scene obje listesi:');
      scene.traverse(obj => {
        if (obj.isCamera || obj.isLight || obj.name === 'Camera') {
          console.log('  →', obj.type, obj.name, obj.position.toArray().map(v => Math.round(v)));
        }
      });
    }

    // Scene 2/3/27: GLB ışıklarını kalibre et
     if (!isScene1) {
      const LIGHT_DIVISOR = 2500;

      scene.traverse(obj => {
        if (!obj.isLight) return;
        
        // Scene 27: shadow ayarını SceneGLSettings'e bırak (en güçlü PointLight orada shadow aldı)
        // Diğer sahneler: eski davranış (shadow kapalı)
        if (!isRealTimeScene) {
          obj.castShadow = false;
        }

        if (obj.userData._originalIntensity === undefined) {
          obj.userData._originalIntensity = obj.intensity;
        }
        const orig = obj.userData._originalIntensity;

        if (obj.isPointLight) {
          obj.intensity = orig / LIGHT_DIVISOR;
          if (!isRealTimeScene) {
            obj.distance = 0;
          }
          obj.decay = 2;
        }
        if (obj.isDirectionalLight) {
          obj.intensity = orig / (LIGHT_DIVISOR / 10);
        }
        if (obj.isSpotLight) {
          obj.intensity = orig / LIGHT_DIVISOR;
          obj.decay = 2;
        }
      });

      // Debug - bir kez çalışınca kaldırılabilir
      console.log('=== GLB IŞIK DEĞERLERİ (sahne:', scenePath.split('/').pop(), ') ===');
      const lightData = [];
      scene.traverse(obj => {
        if (!obj.isLight) return;
        lightData.push({
          name: obj.name,
          type: obj.type,
          origIntensity: obj.userData._originalIntensity,
          finalIntensity: Math.round(obj.intensity * 100) / 100,
          position: obj.position.toArray().map(v => Math.round(v * 100) / 100),
        });
      });
      console.table(lightData);
    }

    // FBX lip-sync ağızları → promise olarak topla
    if (mini1MouthData || mini2MouthData) {
      console.log('🦷 Mouth data:', { 
        mini1: mini1MouthData ? `kafaMesh=${mini1MouthData.kafaMesh?.name}` : null,
        mini2: mini2MouthData ? `kafaMesh=${mini2MouthData.kafaMesh?.name}` : null,
        fbxPaths: mouthFBXPaths.length
      });
      const loader = new FBXLoader();
      
      // Paralel FBX yükleme (Safari performans fix)
      const loadFBXPromises = mouthFBXPaths.map((path) => 
        new Promise((resolve) => {
          loader.load(
            path, 
            (fbx) => resolve(fbx),
            undefined,
            () => resolve(null) // Hata durumunda null döndür
          );
        })
      );
      
      const fbxPromise = Promise.all(loadFBXPromises).then((loadedMouths) => {
        // Null olanları filtrele
        const validMouths = loadedMouths.filter(m => m !== null);
        
        [mini1MouthData, mini2MouthData].forEach((mouthData) => {
          if (mouthData?.kafaMesh) {
            validMouths.forEach((fbxModel) => {
              const fbxClone = fbxModel.clone(true);
              fbxClone.userData.addedPart = true;
              fbxClone.visible = false;
              fbxClone.traverse(child => {
                child.frustumCulled = false;
                if (child.isMesh && child.material) {
                  // ★ Mipmap kapat
                  const fixMipmap = (mat) => {
                    if (!mat) return;
                    Object.values(mat).forEach(v => {
                      if (v?.isTexture) {
                        v.generateMipmaps = false;
                        v.minFilter = THREE.LinearFilter;
                        v.magFilter = THREE.LinearFilter;
                        v.anisotropy = 1;
                        v.needsUpdate = true;
                      }
                    });
                  };
                  if (Array.isArray(child.material)) { child.material.forEach(fixMipmap); }
                  else { fixMipmap(child.material); }
                  if (Array.isArray(child.material)) {
                    child.material = child.material.map(mat => {
                      const color = mat.color?.clone() || new THREE.Color(0x888888);
                      return new THREE.MeshStandardMaterial({
                        color: color,
                        roughness: 0.6,
                        metalness: 0.0,
                        side: THREE.DoubleSide
                      });
                    });
                  } else {
                    const color = child.material.color?.clone() || new THREE.Color(0x888888);
                    child.material = new THREE.MeshStandardMaterial({
                      color: color,
                      roughness: 0.6,
                      metalness: 0.0,
                      side: THREE.DoubleSide
                    });
                  }
                }
              });
                  const mSf = mouthData.scaleFactor || 1;
              fbxClone.position.set(0, 0.7 * mSf, 0.5 * mSf);
              fbxClone.rotation.set(4.6, 0, 0);
              fbxClone.scale.set(0.01 * mSf, 0.01 * mSf, 0.01 * mSf);
               mouthData.kafaMesh.add(fbxClone);
              mouthData.fbxMouths.push(fbxClone);
            });
          }
        });
        mouthDataRef.current = { mini1: mini1MouthData, mini2: mini2MouthData };
      });
      allAssetPromises.push(fbxPromise);
    } else {
      mouthDataRef.current = { mini1: null, mini2: null };
    }

    Promise.all(allAssetPromises).then(() => {
      scene.traverse(child => {
        if (child.userData?.addedPart || child.isMesh) {
          child.frustumCulled = false;
        }
        if (child.userData?.addedPart) {
          applyPolygonOffset(child);
        }
      });
      setIsReady(true);
      onSceneReady?.();
    }).catch((err) => {
      console.warn('Bazı assetler yüklenemedi, sahne yine de gösteriliyor:', err);
      scene.traverse(child => {
        if (child.userData?.addedPart || child.isMesh) {
          child.frustumCulled = false;
        }
        if (child.userData?.addedPart) {
          applyPolygonOffset(child);
        }
      });
      setIsReady(true);
      onSceneReady?.();
    });
}, [scene, eyeScene, eyebrowsScene, mouthScene, character1Config, character2Config, onCameraFound, scenePath, sceneId, torsoManifest, legsManifest, spectatorSessionSeed]);
  useEffect(() => {
    if (!actions || !mixer || !isReady || animStartedRef.current) return;
    const actionNames = Object.keys(actions);
    if (actionNames.length === 0) { onAnimationEnd?.(); return; }
    animStartedRef.current = true;

    // ★ Tüm animasyonları ilk frame'e set et ama DURDUR
    actionNames.forEach(name => {
      const action = actions[name];
      if (action) {
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        action.paused = true;  // ← İlk frame'de dondur
        action.time = 0;       // ← Frame 0'a set et
      }
    });

    // ★ Mixer'ı bir kere güncelle ki pose uygulansın
    mixer.update(0);

    // ★ 1.5 saniye sonra animasyonları başlat
    const delayTimer = setTimeout(() => {
      mixer.timeScale = 2.2;

      let finishedCount = 0;
      const handleFinished = () => {
        finishedCount++;
        if (finishedCount >= actionNames.length) onAnimationEnd?.();
      };
      mixer.addEventListener('finished', handleFinished);

      actionNames.forEach(name => {
        const action = actions[name];
        if (action) {
          action.paused = false;  // ← Şimdi oynat
        }
      });
    }, 1500);

    return () => clearTimeout(delayTimer);
  }, [actions, mixer, onAnimationEnd, isReady]);

  return <group ref={groupRef} visible={isReady} />;
}

// ============================================
// LEGO BRICK BUTTON COMPONENT
// ============================================
const LegoBrickButton = ({ color, children, onClick, disabled }) => {
  const [isHovered, setIsHovered] = useState(false);
  const darkColor = color === '#000000' ? '#333333' :
                    color === '#e52828' ? '#b81e1e' :
                    color === '#237841' ? '#1a5c31' :
                    color === '#666666' ? '#444444' : color;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
      style={{ minWidth: '100px' }}
    >
      {/* Üst brick çıkıntıları */}
      <div className="flex justify-center gap-[6px] mb-[-2px]">
        {[1,2,3,4].map(i => (
          <div key={i} style={{ 
            width: '16px', 
            height: '8px', 
            backgroundColor: isHovered ? darkColor : color,
            borderRadius: '4px 4px 0 0',
            border: `1px solid ${darkColor}`
          }} />
        ))}
      </div>
      {/* Ana brick gövdesi */}
      <div 
        className="px-4 py-2.5 rounded-[10px] text-center"
        style={{ 
          backgroundColor: isHovered ? darkColor : color,
          border: `4px solid ${darkColor}`,
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{ 
          color: (color === '#000000' || color === '#e52828' || color === '#237841' || color === '#666666') ? '#fff' : '#000',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 900,
          fontSize: '16px'
        }}>
          {children}
        </span>
      </div>
    </button>
  );
};

// ============================================
// MINI BRICK COMPONENT (for popup)
// ============================================
const MiniBrick = ({ color, children }) => (
  <div className="flex flex-col items-center">
    <div className="flex gap-[3px] mb-[-1px]">
      {[1,2].map(i => (
        <div key={i} style={{ 
          width: '12px', 
          height: '6px', 
          backgroundColor: color,
          borderRadius: '3px 3px 0 0'
        }} />
      ))}
    </div>
    <div 
      className="px-3 py-1.5 rounded text-white font-black text-xs text-center"
      style={{ backgroundColor: color, minWidth: '65px' }}
    >
      {children}
    </div>
  </div>
);

// ============================================
// RECORDING BUTTON COMPONENT (PNG based)
// ============================================
const RecordingButton = ({ normalImg, hoverImg, onClick, disabled }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`transition-transform ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
    >
      <img 
        src={isHovered && !disabled ? hoverImg : normalImg} 
        alt="button" 
        className="h-12"
      />
    </button>
  );
};


// ============================================
// RECORDING POPUP COMPONENT
// ============================================
const RecordingPopup = ({ 
  isOpen, 
  onClose,
  onStop,
  onStart,
  onReset,
  isDialogue, 
  selectedLevel,
  selectedMini, 
  selectedTalk,
  selectedTalk1,
  selectedTalk2,
  recordingTime,
  mini1Time,
  mini2Time,
  currentRecordingMini,
  onSelectMini,
  isRecordingActive,
maxRecordingTime
}) => {
  const [rpScreen, setRpScreen] = useState('desktop');
  useEffect(() => {
    const upd = () => {
      const w = window.innerWidth, h = window.innerHeight;
      if (w <= 740 || h <= 440) setRpScreen('mobile');
      else if (w <= 1024 || h <= 600) setRpScreen('tablet-small');
      else setRpScreen('desktop');
    };
    upd();
    window.addEventListener('resize', upd);
    window.addEventListener('orientationchange', () => setTimeout(upd, 150));
    return () => window.removeEventListener('resize', upd);
  }, []);
  const rpMobile = rpScreen === 'mobile' || rpScreen === 'tablet-small';

  if (!isOpen) return null;

  const levelLabel = selectedLevel ? selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1) : '';
  const remainingTime = maxRecordingTime - (isDialogue ? (currentRecordingMini === 'mini1' ? mini1Time : mini2Time) : recordingTime);

return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-2" style={{ overflow: 'auto' }}>
<style>{`
        /* Yüksekliğe göre orantılı küçült — gereğinden fazla değil */
        @media (max-height: 600px) {
          .rec-popup-box { transform: scale(0.88); transform-origin: center center; }
        }
        @media (max-height: 500px) {
          .rec-popup-box { transform: scale(0.78); transform-origin: center center; }
        }
        @media (max-height: 430px) {
          .rec-popup-box { transform: scale(0.8); transform-origin: center center; }
        }
        /* Çok dar genişlikte (dialogue 580px sığmazsa) */
        @media (max-width: 620px) {
          .rec-popup-box { transform: scale(0.82); transform-origin: center center; }
        }
      `}</style>
      <div 
        className="relative rec-popup-box"
        style={{
          backgroundColor: '#ffcc00',
          borderRadius: '25px',
          padding: '10px',
          boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)',
          minWidth: isDialogue ? '580px' : '320px'
        }}
      >
        {/* Header - Sarı alan (sadece Record başlığı) */}
        <div className="text-center py-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-white font-black text-2xl" style={{ fontFamily: 'Montserrat, sans-serif', textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>
              Record
            </span>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
          </div>
        </div>

        {/* İçerik - Beyaz alan */}
        <div 
          className="bg-white rounded-[20px] p-5"
          style={{ margin: '0 2px 2px 2px' }}
        >
          {/* Level tipi ve Max süre - Beyaz alanın üstünde */}
          <div className="text-center mb-4">
            <div className="text-black font-bold text-xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {levelLabel}
            </div>
            <div className="text-gray-500 text-sm mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Max: {formatTime(maxRecordingTime)}
            </div>
          </div>

          {isDialogue ? (
            /* Dialogue - 2 kart, tıklanabilir */
            <div className="flex gap-4 justify-center">
              {/* Mini-1 Card */}
              {(() => {
                const isMini1Demo = selectedTalk1 === 'demo1' || selectedTalk1 === 'demo2';
                const canSelectMini1 = selectedTalk1 && !isMini1Demo && !isRecordingActive;
                
                return (
                  <button
                    onClick={() => canSelectMini1 && onSelectMini('mini1')}
                    className={`rounded-[20px] p-4 flex flex-col items-center transition-all ${canSelectMini1 ? 'hover:scale-[1.02] cursor-pointer' : ''}`}
                    style={{ 
                      backgroundColor: currentRecordingMini === 'mini1' ? '#ffcc00' : '#fff',
                      border: `4px solid ${currentRecordingMini === 'mini1' ? '#ffcc00' : '#e0e0e0'}`,
                      minWidth: '240px',
                      opacity: (isRecordingActive && currentRecordingMini !== 'mini1') || isMini1Demo || !selectedTalk1 ? 0.5 : 1
                    }}
                    disabled={!canSelectMini1}
                  >
                    <div className="flex gap-2 mb-3">
                      <img src={mini1Button} alt="Mini-1" className="h-12" />
                      {selectedTalk1 && <img src={TALK_BRICKS[selectedTalk1].normal} alt={selectedTalk1} className="h-12" />}
                    </div>
                    {/* Timer veya Demo */}
                    <div 
                      className="rounded-full flex items-center justify-center mb-2"
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        border: '4px solid #ffcc00',
                        backgroundColor: isMini1Demo ? '#237841' : '#fff'
                      }}
                    >
                      {isMini1Demo ? (
                        <span className="font-bold text-lg text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          DEMO
                        </span>
                      ) : (
                        <span className="font-bold text-xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {formatTime(mini1Time || 0)}
                        </span>
                      )}
                    </div>
                    {/* Status */}
                    {isMini1Demo ? (
                      <div className="text-gray-400 font-semibold text-sm">
                        Using demo audio
                      </div>
                    ) : !selectedTalk1 ? (
                      <div className="text-gray-400 font-semibold text-sm">
                        No talk selected
                      </div>
                    ) : currentRecordingMini === 'mini1' && isRecordingActive ? (
                      <div className="bg-[#e52828] text-white font-bold text-sm px-5 py-1.5 rounded-lg flex items-center gap-2">
                        <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        Recording
                      </div>
                    ) : currentRecordingMini === 'mini1' ? (
                      <div className="bg-[#237841] text-white font-bold text-sm px-5 py-1.5 rounded-lg">
                        Selected
                      </div>
                    ) : (
                      <div className="text-gray-400 font-semibold text-sm">
                        Click to select
                      </div>
                    )}
                  </button>
                );
              })()}

              {/* Mini-2 Card */}
              {(() => {
                const isMini2Demo = selectedTalk2 === 'demo1' || selectedTalk2 === 'demo2';
                const canSelectMini2 = selectedTalk2 && !isMini2Demo && !isRecordingActive;
                
                return (
                  <button
                    onClick={() => canSelectMini2 && onSelectMini('mini2')}
                    className={`rounded-[20px] p-4 flex flex-col items-center transition-all ${canSelectMini2 ? 'hover:scale-[1.02] cursor-pointer' : ''}`}
                    style={{ 
                      backgroundColor: currentRecordingMini === 'mini2' ? '#ffcc00' : '#fff',
                      border: `4px solid ${currentRecordingMini === 'mini2' ? '#ffcc00' : '#e0e0e0'}`,
                      minWidth: '240px',
                      opacity: (isRecordingActive && currentRecordingMini !== 'mini2') || isMini2Demo || !selectedTalk2 ? 0.5 : 1
                    }}
                    disabled={!canSelectMini2}
                  >
                    <div className="flex gap-2 mb-3">
                      <img src={mini2Button} alt="Mini-2" className="h-12" />
                      {selectedTalk2 && <img src={TALK_BRICKS[selectedTalk2].normal} alt={selectedTalk2} className="h-12" />}
                    </div>
                    {/* Timer veya Demo */}
                    <div 
                      className="rounded-full flex items-center justify-center mb-2"
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        border: '4px solid #ffcc00',
                        backgroundColor: isMini2Demo ? '#237841' : '#fff'
                      }}
                    >
                      {isMini2Demo ? (
                        <span className="font-bold text-lg text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          DEMO
                        </span>
                      ) : (
                        <span className="font-bold text-xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                          {formatTime(mini2Time || 0)}
                        </span>
                      )}
                    </div>
                    {/* Status */}
                    {isMini2Demo ? (
                      <div className="text-gray-400 font-semibold text-sm">
                        Using demo audio
                      </div>
                    ) : !selectedTalk2 ? (
                      <div className="text-gray-400 font-semibold text-sm">
                        No talk selected
                      </div>
                    ) : currentRecordingMini === 'mini2' && isRecordingActive ? (
                      <div className="bg-[#e52828] text-white font-bold text-sm px-5 py-1.5 rounded-lg flex items-center gap-2">
                        <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        Recording
                      </div>
                    ) : currentRecordingMini === 'mini2' ? (
                      <div className="bg-[#237841] text-white font-bold text-sm px-5 py-1.5 rounded-lg">
                        Selected
                      </div>
                    ) : (
                      <div className="text-gray-400 font-semibold text-sm">
                        Click to select
                      </div>
                    )}
                  </button>
                );
              })()}
            </div>
          ) : (
            /* Single Mini */
            <div className={rpMobile ? "flex flex-row items-center justify-center gap-6" : "flex flex-col items-center"}>
              {/* Mini + Talk — çerçeveli kart, aktifse vurgulu */}
              <div
                className="flex flex-col items-center"
                style={rpMobile ? {
                  border: `4px solid ${isRecordingActive ? '#e52828' : recordingTime > 0 ? '#237841' : '#ffcc00'}`,
                  borderRadius: '18px',
                  padding: '12px 16px',
                  backgroundColor: '#fff'
                } : undefined}
              >
                <div className="flex gap-3 mb-4">
                  <img src={selectedMini === 'mini1' ? mini1Button : mini2Button} alt="Mini" className="h-14" />
                  {selectedTalk && <img src={TALK_BRICKS[selectedTalk].normal} alt={selectedTalk} className="h-14" />}
                </div>
                {/* Status — kart içinde */}
                {isRecordingActive ? (
                  <div className="bg-[#e52828] text-white font-bold text-sm px-5 py-1.5 rounded-lg flex items-center gap-2">
                    <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    Recording
                  </div>
                ) : recordingTime > 0 ? (
                  <div className="bg-[#237841] text-white font-bold text-sm px-5 py-1.5 rounded-lg">
                    Recorded
                  </div>
                ) : (
                  <div className="text-gray-400 font-semibold text-sm">
                    Press Start to begin
                  </div>
                )}
              </div>

              {/* Timer + Remaining */}
              <div className="flex flex-col items-center">
                <div 
                  className="rounded-full flex items-center justify-center mb-2"
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    border: '5px solid #ffcc00',
                    backgroundColor: '#fff'
                  }}
                >
                  <span className="font-bold text-2xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {formatTime(recordingTime)}
                  </span>
                </div>
                <div className="text-gray-500 text-sm">
                  Remaining: {formatTime(remainingTime > 0 ? remainingTime : 0)}
                </div>
              </div>
            </div>
          )}

          {/* Remaining time info for dialogue */}
          {isDialogue && currentRecordingMini && (
            <div className="text-center text-gray-500 text-sm mt-3">
              Remaining: {formatTime(maxRecordingTime - (currentRecordingMini === 'mini1' ? mini1Time : mini2Time))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-center gap-3 mt-5">
            {/* Reset Button */}
            <RecordingButton
              normalImg={resetBtn}
              hoverImg={resetBtnHover}
              onClick={onReset}
              disabled={isRecordingActive}
            />
            
            {/* Start/Stop Button */}
            {isRecordingActive ? (
              <RecordingButton
                normalImg={stopBtnImg}
                hoverImg={stopBtnImgHover}
                onClick={onStop}
              />
            ) : (
              <RecordingButton
                normalImg={startBtn}
                hoverImg={startBtnHover}
                onClick={onStart}
                disabled={isDialogue && !currentRecordingMini}
              />
            )}
            
            {/* Close Button */}
            <RecordingButton
              normalImg={closeBtn}
              hoverImg={closeBtnHover}
              onClick={onClose}
              disabled={isRecordingActive}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SAVE MOMENT POPUP COMPONENT (Expert Only)
// ============================================
const SaveMomentPopup = ({ 
  isOpen, 
  onClose,
  onDownload,
  hasVideoRecording,
  isProcessing
}) => {
  const [selectedImage, setSelectedImage] = useState(true); // Image varsayılan seçili
  const [selectedVideo, setSelectedVideo] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);
  const [downloadHover, setDownloadHover] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    // Seçili olanları indir
    if (selectedImage) {
      onDownload('image');
    }
    if (selectedVideo && hasVideoRecording) {
      // Image indirildiyse küçük gecikme ile video indir
      setTimeout(() => {
        onDownload('video');
      }, selectedImage ? 500 : 0);
    }
    
    // Her iki indirme de tamamlandıktan sonra popup'ı kapat
    const totalDelay = (selectedImage && selectedVideo && hasVideoRecording) ? 1000 : 500;
    setTimeout(() => {
      onClose();
    }, totalDelay);
  };

  const canDownload = selectedImage || (selectedVideo && hasVideoRecording);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div 
        className="relative"
        style={{
          backgroundColor: '#0056b3',
          borderRadius: '25px',
          padding: '10px',
          boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)',
          minWidth: '500px',
          maxWidth: '550px'
        }}
      >
        {/* Header - Mavi alan */}
        <div className="text-center py-4">
          <h2 
            className="text-white font-black text-3xl"
            style={{ 
              fontFamily: 'Montserrat, sans-serif',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            Save This Moment
          </h2>
        </div>

        {/* İçerik - Beyaz alan */}
        <div 
          className="bg-white rounded-[20px] p-6"
          style={{ margin: '0 2px 2px 2px' }}
        >
          {/* Info mesajı */}
          <div className="flex items-center gap-2 mb-6 justify-center">
            <img src={infoIcon} alt="info" className="w-5 h-5" />
            <span 
              className="text-gray-600 text-sm"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              We can keep one moment at time.
            </span>
          </div>

          {/* Scene Image Option */}
          <div 
            className={`flex items-center gap-4 p-4 rounded-xl mb-4 transition-all cursor-pointer ${selectedImage ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            style={{ border: selectedImage ? '3px solid #0056b3' : '2px solid #e5e5e5' }}
            onClick={() => setSelectedImage(!selectedImage)}
          >
            {/* Checkbox */}
            <div 
              className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
              style={{ 
                backgroundColor: selectedImage ? '#22c55e' : '#fff',
                border: selectedImage ? '2px solid #16a34a' : '2px solid #d1d5db'
              }}
            >
              {selectedImage && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </div>
            
            <img src={imageIcon} alt="Scene Image" className="w-16 h-16 object-contain" />
            <div className="flex-1">
              <h3 
                className="font-bold text-lg text-gray-800"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Scene Image <span className="font-normal text-gray-500">(JPEG)</span>
              </h3>
              <p 
                className="text-gray-500 text-sm"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                A snapshot of this scene with the minis.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* Animation Option */}
          <div 
            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${hasVideoRecording ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${selectedVideo && hasVideoRecording ? 'bg-blue-50' : hasVideoRecording ? 'hover:bg-gray-50' : ''}`}
            style={{ border: selectedVideo && hasVideoRecording ? '3px solid #0056b3' : '2px solid #e5e5e5' }}
            onClick={() => hasVideoRecording && setSelectedVideo(!selectedVideo)}
          >
            {/* Checkbox */}
            <div 
              className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
              style={{ 
                backgroundColor: selectedVideo && hasVideoRecording ? '#22c55e' : '#fff',
                border: selectedVideo && hasVideoRecording ? '2px solid #16a34a' : '2px solid #d1d5db'
              }}
            >
              {selectedVideo && hasVideoRecording && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </div>
            
            <img src={animationIcon} alt="Animation" className="w-16 h-16 object-contain" />
            <div className="flex-1">
              <h3 
                className="font-bold text-lg text-gray-800"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Animation <span className="font-normal text-gray-500">(WEBM)</span>
              </h3>
              <p 
                className="text-gray-500 text-sm"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Includes scene motion and audio
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            {/* Cancel Button */}
            <button
              onClick={onClose}
              onMouseEnter={() => setCancelHover(true)}
              onMouseLeave={() => setCancelHover(false)}
              disabled={isProcessing}
              className="transition-transform hover:scale-105"
              style={{ opacity: isProcessing ? 0.5 : 1 }}
            >
              <img 
                src={cancelHover ? cancelBtnHover : cancelBtn} 
                alt="Cancel" 
                className="h-12"
              />
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              onMouseEnter={() => setDownloadHover(true)}
              onMouseLeave={() => setDownloadHover(false)}
              disabled={isProcessing || !canDownload}
              className="transition-transform hover:scale-105"
              style={{ opacity: (isProcessing || !canDownload) ? 0.5 : 1 }}
            >
              <img 
                src={downloadHover && canDownload ? downloadBtnHover : downloadBtn} 
                alt="Download" 
                className="h-12"
              />
            </button>
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span 
                className="text-gray-600 text-sm"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Processing...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// SLOT WITH DROPDOWN COMPONENT
// ============================================
const SlotWithDropdown = ({ 
  slotImage, 
  selectedValue, 
  selectedImage,
  options, 
  isOpen, 
  onToggle, 
  onSelect, 
  disabled,
  disabledOptions = [], // Kilitli/devre dışı seçenekler
  openUp = false // Mobilde yukarı açılsın
}) => {
  const [hoveredOption, setHoveredOption] = useState(null);

  return (
    <div className="relative flex items-center">
      {/* Slot Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onToggle();
        }}
        disabled={disabled}
        className={`transition-transform ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
      >
        <img 
          src={selectedValue && selectedImage ? selectedImage : slotImage} 
          alt="slot" 
          className="h-14" 
        />
      </button>

      {/* Yatay Dropdown */}
      {isOpen && (
          <div 
          className="z-50 flex flex-row gap-1 p-2 bg-white rounded-lg shadow-xl border-2 border-gray-200 whitespace-nowrap"
          style={openUp
            ? { position: 'fixed', bottom: 'calc(70px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'max-content', maxWidth: 'calc(100vw - 16px)', zIndex: 9999 }
            : { position: 'absolute', top: '100%', left: '0', marginTop: '4px', width: 'max-content' }}
          onClick={(e) => e.stopPropagation()}
        >
          {Object.entries(options).map(([key, { normal, hover }]) => {
            const isDisabled = disabledOptions.includes(key);
            return (
              <button
                key={key}
                onClick={() => !isDisabled && onSelect(key)}
                onMouseEnter={() => setHoveredOption(key)}
                onMouseLeave={() => setHoveredOption(null)}
                className={`transition-transform flex-shrink-0 relative ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                <img 
                  src={hoveredOption === key || selectedValue === key ? hover : normal} 
                  alt={key}
                  style={{ height: '56px', width: 'auto' }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
const HairCalibrationPanel = ({ characters, setCharacters, gameHairOverrides, setGameHairOverrides }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetFigure, setTargetFigure] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState('');
 
  const currentIdx = characters[targetFigure]?.hairTextureIndex || 0;
  const sf = 1.0;
 
  const getCurrentValues = () => {
    const override = gameHairOverrides[currentIdx];
    if (override) {
      return { position: [...override.position], scale: [...override.scale] };
    }
    const offset = HAIR_MODEL_OFFSETS[currentIdx] ?? DEFAULT_OFFSET;
    const dx = offset.position[0] - DEFAULT_OFFSET.position[0];
    const dy = offset.position[1] - DEFAULT_OFFSET.position[1];
    const dz = offset.position[2] - DEFAULT_OFFSET.position[2];
    return {
      position: [0 + dx, 1.3 * sf + dy, 0.5 * sf + dz],
      scale: [0.9 * sf * offset.scale[0], 1.0 * sf * offset.scale[1], 1.0 * sf * offset.scale[2]],
    };
  };
 
  const currentValues = currentIdx > 0 ? getCurrentValues() : null;
 
  const updateOverride = (field, axis, value) => {
    const current = getCurrentValues();
    const newValues = { position: [...current.position], scale: [...current.scale] };
    newValues[field][axis] = parseFloat(value);
    setGameHairOverrides(prev => ({ ...prev, [currentIdx]: newValues }));
    setCharacters(prev => {
      const clone = [...prev];
      clone[targetFigure] = { ...clone[targetFigure], _debugTick: Date.now() };
      return clone;
    });
  };
 
  const resetCurrent = () => {
    setGameHairOverrides(prev => {
      const next = { ...prev };
      delete next[currentIdx];
      return next;
    });
    setCharacters(prev => {
      const clone = [...prev];
      clone[targetFigure] = { ...clone[targetFigure], _debugTick: Date.now() };
      return clone;
    });
  };
 
  // ═══════════════════════════════════════════════════════════════
  // HairCalibrationPanel'deki exportAll ve copyCurrent fonksiyonlarını
  // aşağıdakilerle DEĞİŞTİR:
  // ═══════════════════════════════════════════════════════════════

  // Tek saçın kodunu clipboard'a kopyala
  const copyCurrent = () => {
    if (!currentValues || currentIdx === 0) return;
    const override = gameHairOverrides[currentIdx];
    if (!override) { setCopyFeedback('No changes'); setTimeout(() => setCopyFeedback(''), 1500); return; }

    const code = `  ${currentIdx}: { position: [${override.position.map(v => Number(v.toFixed(2)))}], scale: [${override.scale.map(v => Number(v.toFixed(2)))}] },`;
    navigator.clipboard.writeText(code).then(() => {
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 1500);
    });
  };

  // Tüm override'ları export
  const exportAll = () => {
    const entries = Object.entries(gameHairOverrides);
    if (entries.length === 0) { alert('No overrides!'); return; }

    const lines = entries
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([idx, vals]) => {
        return `  ${idx}: { position: [${vals.position.map(v => Number(v.toFixed(2)))}], scale: [${vals.scale.map(v => Number(v.toFixed(2)))}] },`;
      }).join('\n');

    const output = `// GAME_HAIR_OFFSETS - GamePage saç offset'leri
// ${new Date().toISOString()}
// ${entries.length} saç ayarlandı
//
// GamePage.jsx'teki GAME_HAIR_OFFSETS objesine yapıştır:

const GAME_HAIR_OFFSETS = {
${lines}
};
`;

    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game_hair_offsets_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
 
  const allHairs = [
    { idx: 0, label: 'Bald' },
    ...Array.from({ length: 44 }, (_, i) => ({ idx: i + 1, label: `M-${String(i + 1).padStart(2, '0')}` })),
    ...Array.from({ length: 52 }, (_, i) => ({ idx: 101 + i, label: `F-${String(i + 1).padStart(2, '0')}` })),
    ...Array.from({ length: 46 }, (_, i) => ({ idx: 201 + i, label: `C-${String(i + 1).padStart(2, '0')}` })),
  ];
 
  const applyHair = (hairIdx) => {
    setCharacters(prev => {
      const clone = [...prev];
      clone[targetFigure] = { ...clone[targetFigure], hairTextureIndex: hairIdx, hairColor: selectedColor };
      return clone;
    });
  };
 
  const overrideCount = Object.keys(gameHairOverrides).length;
 
  const SliderRow = ({ label, value, min, max, step, onChange, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>
      <span style={{ color: '#888', fontSize: '10px', width: '14px', fontWeight: 700 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, height: '6px', accentColor: color, cursor: 'pointer' }}
      />
      <input type="number" value={Number(value.toFixed(2))} step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: '52px', backgroundColor: '#333', color: '#fff', border: '1px solid #555',
          borderRadius: '4px', padding: '2px 4px', fontSize: '10px', textAlign: 'right',
        }}
      />
    </div>
  );
 
  if (!isOpen) {
    return (
      <div className="relative ml-auto">
        <button onClick={() => setIsOpen(true)} style={{
          backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '8px',
          padding: '6px 12px', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
          fontFamily: 'Montserrat, sans-serif',
        }}>
          🔧 Hair {overrideCount > 0 ? `(${overrideCount})` : ''}
        </button>
      </div>
    );
  }
 
  return (
    <div className="relative ml-auto">
      <button onClick={() => setIsOpen(false)} style={{
        backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '8px',
        padding: '6px 12px', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        🔧 Hair ✕
      </button>
 
      <div style={{
        position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 9999,
        width: '300px', maxHeight: '80vh', backgroundColor: '#1a1a1a', borderRadius: '12px',
        overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        fontFamily: 'Montserrat, sans-serif', display: 'flex', flexDirection: 'column',
      }} onClick={(e) => e.stopPropagation()}>
 
        {/* Figure select */}
        <div style={{ display: 'flex', gap: '6px', padding: '6px 12px', backgroundColor: '#222' }}>
          {[0, 1].map(i => (
            <button key={i} onClick={() => setTargetFigure(i)} style={{
              flex: 1, padding: '5px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '11px',
              backgroundColor: targetFigure === i ? '#ff6600' : '#444', color: '#fff',
            }}>Fig {i + 1}</button>
          ))}
        </div>
 
        {/* Color */}
        <div style={{ display: 'flex', gap: '4px', padding: '6px 12px', backgroundColor: '#222', flexWrap: 'wrap' }}>
          {HAIR_COLORS.map((color, i) => (
            <button key={i} onClick={() => {
              setSelectedColor(i);
              setCharacters(prev => { const c = [...prev]; c[targetFigure] = { ...c[targetFigure], hairColor: i }; return c; });
            }} style={{
              width: '20px', height: '20px', borderRadius: '50%', border: 'none', cursor: 'pointer',
              backgroundColor: color,
              outline: (characters[targetFigure]?.hairColor || 0) === i ? '3px solid #ff6600' : '2px solid #555',
            }} />
          ))}
        </div>
 
        {/* Current */}
        <div style={{ padding: '4px 12px', backgroundColor: '#333', color: '#aaa', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Idx: <b style={{ color: '#fff' }}>{currentIdx}</b></span>
          {gameHairOverrides[currentIdx] && <span style={{ color: '#ff6600' }}>★ modified</span>}
        </div>
 
        {/* ═══ SLIDERS ═══ */}
        {currentIdx > 0 && currentValues && (
          <div style={{ padding: '8px 12px', backgroundColor: '#2a2a2a', borderTop: '1px solid #444' }}>
            <span style={{ color: '#4fc3f7', fontSize: '10px', fontWeight: 700 }}>Position</span>
            <SliderRow label="X" value={currentValues.position[0]} min={-5} max={5} step={0.05} onChange={(v) => updateOverride('position', 0, v)} color="#ef5350" />
            <SliderRow label="Y" value={currentValues.position[1]} min={-5} max={10} step={0.05} onChange={(v) => updateOverride('position', 1, v)} color="#66bb6a" />
            <SliderRow label="Z" value={currentValues.position[2]} min={-5} max={5} step={0.05} onChange={(v) => updateOverride('position', 2, v)} color="#42a5f5" />
            <span style={{ color: '#ffb74d', fontSize: '10px', fontWeight: 700, marginTop: '6px', display: 'block' }}>Scale</span>
            <SliderRow label="X" value={currentValues.scale[0]} min={0.3} max={2.0} step={0.02} onChange={(v) => updateOverride('scale', 0, v)} color="#ef5350" />
            <SliderRow label="Y" value={currentValues.scale[1]} min={0.3} max={2.0} step={0.02} onChange={(v) => updateOverride('scale', 1, v)} color="#66bb6a" />
            <SliderRow label="Z" value={currentValues.scale[2]} min={0.3} max={2.0} step={0.02} onChange={(v) => updateOverride('scale', 2, v)} color="#42a5f5" />
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              <button onClick={resetCurrent} style={{ flex: 1, padding: '4px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: '#555', color: '#fff', fontSize: '10px', fontWeight: 700 }}>Reset</button>
              <button onClick={copyCurrent} style={{ flex: 1, padding: '4px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: '#1565c0', color: '#fff', fontSize: '10px', fontWeight: 700 }}>{copyFeedback || 'Copy h()'}</button>
            </div>
          </div>
        )}
 
        {/* Hair grid */}
        <div style={{ overflowY: 'auto', padding: '4px', flex: 1, maxHeight: '35vh' }}>
          {[
            { title: 'Male', hairs: Array.from({ length: 44 }, (_, i) => ({ idx: i + 1, label: `M-${String(i + 1).padStart(2, '0')}` })) },
            { title: 'Female', hairs: Array.from({ length: 52 }, (_, i) => ({ idx: 101 + i, label: `F-${String(i + 1).padStart(2, '0')}` })) },
            { title: 'Child', hairs: Array.from({ length: 46 }, (_, i) => ({ idx: 201 + i, label: `C-${String(i + 1).padStart(2, '0')}` })) },
          ].map((section, si) => (
            <div key={section.title}>
              <div style={{ padding: '3px 8px', color: '#ff6600', fontWeight: 700, fontSize: '10px', borderBottom: '1px solid #333' }}>{section.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '2px', padding: '3px' }}>
                {section.hairs.map(hair => (
                  <button key={hair.idx} onClick={() => applyHair(hair.idx)}
                    style={{
                      padding: '3px 1px', borderRadius: '3px', border: 'none', cursor: 'pointer',
                      fontSize: '8px', fontWeight: 600,
                      backgroundColor: currentIdx === hair.idx ? '#ff6600' : gameHairOverrides[hair.idx] ? '#1565c0' : HAIR_MODEL_OFFSETS[hair.idx] ? '#2a3a2a' : '#333',
                      color: currentIdx === hair.idx ? '#fff' : gameHairOverrides[hair.idx] ? '#90caf9' : HAIR_MODEL_OFFSETS[hair.idx] ? '#66ff66' : '#aaa',
                      outline: currentIdx === hair.idx ? '2px solid #fff' : 'none',
                    }}
                  >{hair.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
 
        {/* Nav + Export */}
        <div style={{ padding: '6px 12px', backgroundColor: '#222', borderTop: '1px solid #333' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
            <button onClick={() => { const i = allHairs.findIndex(h => h.idx === currentIdx); if (i > 0) applyHair(allHairs[i - 1].idx); }}
              style={{ flex: 1, padding: '5px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#444', color: '#fff', fontWeight: 700, fontSize: '13px' }}>◀</button>
            <button onClick={() => { const i = allHairs.findIndex(h => h.idx === currentIdx); if (i < allHairs.length - 1) applyHair(allHairs[i + 1].idx); }}
              style={{ flex: 1, padding: '5px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: '#444', color: '#fff', fontWeight: 700, fontSize: '13px' }}>▶</button>
          </div>
          <button onClick={exportAll} disabled={overrideCount === 0}
            style={{
              width: '100%', padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              backgroundColor: overrideCount > 0 ? '#2e7d32' : '#444', color: '#fff', fontWeight: 700, fontSize: '11px',
              opacity: overrideCount > 0 ? 1 : 0.5,
            }}>
            📥 Export ({overrideCount})
          </button>
        </div>
      </div>
    </div>
  );
};
// ============================================
// GAME PAGE
// ============================================
const GamePage = () => {
  const navigate = useNavigate();
  const { alert: showAlert } = useAlert();

  // ── Responsive: mobil tespiti (desktop görünümü değişmez) ──
  const [screenSize, setScreenSize] = useState('desktop');
  useEffect(() => {
    const updateScreen = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w <= 740 || h <= 440) setScreenSize('mobile');
      else if (w <= 1024 || h <= 600) setScreenSize('tablet-small');
      else if (w <= 1380) setScreenSize('tablet');
      else setScreenSize('desktop');
    };
    updateScreen();
    window.addEventListener('resize', updateScreen);
    window.addEventListener('orientationchange', () => setTimeout(updateScreen, 150));
    const t = setTimeout(updateScreen, 200);
    return () => {
      window.removeEventListener('resize', updateScreen);
      clearTimeout(t);
    };
  }, []);
  const isSmallScreen = screenSize === 'mobile' || screenSize === 'tablet-small';

const [characters, setCharacters] = useState([]);
  const [sceneData, setSceneData] = useState(null);
  const [torsoManifest, setTorsoManifest] = useState([]);
  const [legsManifest, setLegsManifest] = useState([]);
  const [spectatorSessionSeed, setSpectatorSessionSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(true);
  const [levelLocks, setLevelLocks] = useState({}); // Level kilit durumları

  // Level ID mapping
  const LEVEL_ID_MAP = {
    sound: 1,
    word: 2,
    sentence: 3,
    dialogue: 4
  };

  // Seçimler
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedMini, setSelectedMini] = useState(null);
  const [selectedTalk, setSelectedTalk] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  
  // Dialogue için ayrı Talk seçimleri
  const [selectedTalk1, setSelectedTalk1] = useState(null); // Mini-1 için Talk
  const [selectedTalk2, setSelectedTalk2] = useState(null); // Mini-2 için Talk
  
  // Dropdown states
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  const [miniDropdownOpen, setMiniDropdownOpen] = useState(false);
  const [talkDropdownOpen, setTalkDropdownOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [talk1DropdownOpen, setTalk1DropdownOpen] = useState(false);
  const [talk2DropdownOpen, setTalk2DropdownOpen] = useState(false);
  
  // Audio & Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState({}); // { key: blobUrl }
  const [recordedDurations, setRecordedDurations] = useState({}); // { key: duration in seconds }
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showRecordingPopup, setShowRecordingPopup] = useState(false);
  const [speakingMini, setSpeakingMini] = useState(null); // Hangi mini konuşuyor (lip-sync için)
  const [sceneLoaded, setSceneLoaded] = useState(false); // 3D sahne yüklendi mi
  const [settingsReady, setSettingsReady] = useState(false);

// Sahne değişince overlay'i tekrar göster + spectator session seed yenile
  useEffect(() => {
    setSceneLoaded(false);
    setSettingsReady(false);
    setSpectatorSessionSeed(Math.floor(Math.random() * 1000000));
  }, [sceneData?.scene_id]);
 
  const canShowScene = sceneLoaded && settingsReady;
  const [glbCameraConfig, setGlbCameraConfig] = useState(null); // GLB'den gelen kamera bilgisi
  
  // Dialogue recording states
  const [mini1Time, setMini1Time] = useState(0);
  const [mini2Time, setMini2Time] = useState(0);
  const [currentRecordingMini, setCurrentRecordingMini] = useState(null);
  
  const [mainMenuHover, setMainMenuHover] = useState(false);
  const [hairDebugOpen, setHairDebugOpen] = useState(false);
const [hairDebugTarget, setHairDebugTarget] = useState(0);
const [gameHairOverrides, setGameHairOverrides] = useState({});
  // Expert Only - Screen Recording States
  const [isExpertProfile, setIsExpertProfile] = useState(false);
  const [saveButtonHover, setSaveButtonHover] = useState(false);
  const [isSaveEnabled, setIsSaveEnabled] = useState(false);
  const [showSaveMomentPopup, setShowSaveMomentPopup] = useState(false);
  const [screenRecordingBlob, setScreenRecordingBlob] = useState(null);
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioLevelRef = useRef(0); 
  const animationFrameRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const currentDurationRef = useRef(0); // Son kayıt süresi

  // Screen recording refs
  const screenRecorderRef = useRef(null);
  const screenChunksRef = useRef([]);

  useEffect(() => {
    const savedCustomizations = sessionStorage.getItem('characterCustomizations');
    const savedScene = sessionStorage.getItem('currentScene');
    
    // Check if user is expert - is_expert (kendi kartı) veya selected_by === 'expert' (mini impersonate)
    const selectedMini = JSON.parse(sessionStorage.getItem('selectedMini') || '{}');
    setIsExpertProfile(selectedMini.is_expert === true || selectedMini.selected_by === 'expert');
    
    if (!savedCustomizations || !savedScene) { navigate('/scene-selection'); return; }
    try {
      const chars = JSON.parse(savedCustomizations);
      const scene = JSON.parse(savedScene);
      
      // Custom yüz modellerini önceden yükle (sahne kurulmadan)
      const preloadLoader = new GLTFLoader();
      chars.forEach(config => {
        if (config?.eyeModelName) {
          const eyePath = `/models/face/${config.eyeModelName}.glb`;
          preloadLoader.load(eyePath, () => {}, undefined, () => {});
        }
        if (config?.mouthModelName) {
          const mouthPath = `/models/face/${config.mouthModelName}.glb`;
          preloadLoader.load(mouthPath, () => {}, undefined, () => {});
        }
      });
      
      setCharacters(chars);
      setSceneData(scene);
      // Level kilit durumlarını set et
      if (scene.level_locks) {
        setLevelLocks(scene.level_locks);
      }
      setLoading(false);
    } catch (e) { 
      navigate('/scene-selection'); 
    }
  }, [navigate]);

   useEffect(() => {
    fetch('/models/torso/torso-manifest.json')
      .then(r => r.json())
      .then(data => setTorsoManifest(Array.isArray(data) ? data : []))
      .catch(err => console.error('Torso manifest load failed:', err));

    fetch('/models/legs/legs-manifest.json')
      .then(r => r.json())
      .then(data => setLegsManifest(Array.isArray(data) ? data : []))
      .catch(err => console.error('Legs manifest load failed:', err));
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setLevelDropdownOpen(false);
      setMiniDropdownOpen(false);
      setTalkDropdownOpen(false);
      setActionDropdownOpen(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Reset save button when level changes
  useEffect(() => {
    setIsSaveEnabled(false);
    setScreenRecordingBlob(null);
  }, [selectedLevel]);

  const handleAnimationEnd = useCallback(() => {}, []);
  

  // Selection Handlers
  const closeAllDropdowns = () => {
    setLevelDropdownOpen(false);
    setMiniDropdownOpen(false);
    setTalkDropdownOpen(false);
    setActionDropdownOpen(false);
    setTalk1DropdownOpen(false);
    setTalk2DropdownOpen(false);
  };

  const handleLevelSelect = (level) => {
    // Level kilit kontrolü
    const levelId = LEVEL_ID_MAP[level];
    if (levelLocks[levelId]) {
      showAlert('🔒 This level is locked!\n\nAsk your parent to unlock it from the dashboard.');
      closeAllDropdowns();
      return;
    }
    
    setSelectedLevel(level);
    closeAllDropdowns();
    setSelectedMini(null);
    setSelectedTalk(null);
    setSelectedTalk1(null);
    setSelectedTalk2(null);
    setSelectedAction(null);
    // Süreleri sıfırla (kayıtlar korunur, talk seçilince doğru süre gösterilir)
    setRecordingTime(0);
    setMini1Time(0);
    setMini2Time(0);
    // Reset save state for expert
    setIsSaveEnabled(false);
    setScreenRecordingBlob(null);
  };

  const handleMiniSelect = (mini) => {
    setSelectedMini(mini);
    closeAllDropdowns();
    setSelectedTalk(null);
    setSelectedAction(null);
    // Talk henüz seçilmedi, süre talk seçilince ayarlanacak
    setRecordingTime(0);
  };

  const handleTalkSelect = (talk) => {
    setSelectedTalk(talk);
    closeAllDropdowns();
    // Action kullanıcı tarafından seçilecek
    setSelectedAction(null);
    
    // Demo değilse süreyi ayarla
    if (talk !== 'demo1' && talk !== 'demo2') {
      const key = `${selectedLevel}-${selectedMini}-${talk}`;
      if (recordedAudio[key]) {
        setRecordingTime(recordedDurations[key] || 0);
      } else {
        setRecordingTime(0);
      }
    }
  };

  const handleActionSelect = (action) => {
    setSelectedAction(action);
    closeAllDropdowns();
  };

  // Recording Functions
  // Dialogue modunda doğru Talk'ı al
  const getDialogueTalk = (mini) => {
    if (mini === 'mini1') return selectedTalk1;
    if (mini === 'mini2') return selectedTalk2;
    return null;
  };

  const getRecordingKeyFn = (miniOverride) => {
    const mini = miniOverride || selectedMini;
    const isDialogueMode = selectedLevel === 'dialogue';
    
    if (isDialogueMode) {
      const talk = getDialogueTalk(mini);
      if (!selectedLevel || !mini || !talk) return null;
      return `${selectedLevel}-${mini}-${talk}`;
    } else {
      if (!selectedLevel || !mini || !selectedTalk) return null;
      return `${selectedLevel}-${mini}-${selectedTalk}`;
    }
  };

  // Get max recording time based on level
  const getMaxRecordingTime = () => {
    return MAX_RECORDING_TIMES[selectedLevel] || 60;
  };

  const startRecording = async (targetMini) => {
    const key = getRecordingKeyFn(targetMini);
    if (!key) return;
    
    const maxTime = getMaxRecordingTime();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Safari fix - resume suspended AudioContext
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioLevel(Math.min(dataArray.reduce((a, b) => a + b) / dataArray.length / 128, 1));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      
      mediaRecorderRef.current = new MediaRecorder(stream, { 
        mimeType: getSupportedAudioMimeType() || undefined 
      });
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      
      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const mimeType = getSupportedAudioMimeType() || 'audio/webm';
          const audioUrl = URL.createObjectURL(new Blob(audioChunksRef.current, { type: mimeType }));
          setRecordedAudio(prev => ({ ...prev, [key]: audioUrl }));
          // Kayıt süresini sakla (ref'ten al)
          const duration = currentDurationRef.current;
          setRecordedDurations(prev => ({ ...prev, [key]: duration }));
          
          // 🎤 Recording'i veritabanına kaydet ve reward al
          const currentTalk = selectedLevel === 'dialogue' ? getDialogueTalk(targetMini) : selectedTalk;
          const isDemo = currentTalk === 'demo1' || currentTalk === 'demo2';
          
          console.log('📝 Recording data:', { 
            sceneId: sceneData?.scene_id, 
            levelId: LEVEL_ID_MAP[selectedLevel],
            duration, 
            talk: currentTalk,
            isDemo 
          });
          
          const miniData = JSON.parse(sessionStorage.getItem('selectedMini') || '{}');
          const isBuilder = miniData.is_builder || false;
          const entityId = isBuilder ? miniData.builder_id : miniData.mini_id;

          if (sceneData?.scene_id && duration > 0 && entityId) {
            try {
              
              console.log('📤 Sending to API:', {
                [isBuilder ? 'builder_id' : 'mini_id']: entityId,
                scene_id: sceneData.scene_id,
                level_id: LEVEL_ID_MAP[selectedLevel] || 1,
                duration_seconds: duration,
                talk_type: currentTalk,
                isBuilder
              });
              
              // character_index: mini1 = 1, mini2 = 2
              const characterIndex = targetMini === 'mini1' ? 1 : 2;
              
              // Builder için farklı endpoint
              const apiUrl = isBuilder 
                ? 'https://mini-talks.org/minitalks-api/builder/save-recording.php'
                : 'https://mini-talks.org/minitalks-api/recording/save-recording.php';
              
              const requestBody = isBuilder ? {
                builder_id: entityId,
                scene_id: sceneData.scene_id,
                level_id: LEVEL_ID_MAP[selectedLevel] || 1,
                duration_seconds: duration,
                character_index: characterIndex,
                talk_type: currentTalk
              } : {
                mini_id: entityId,
                scene_id: sceneData.scene_id,
                level_id: LEVEL_ID_MAP[selectedLevel] || 1,
                duration_seconds: duration,
                character_index: characterIndex,
                talk_type: currentTalk
              };
              
              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
              });
              const result = await response.json();
              console.log('📥 API Response:', result);
              
              if (result.success && result.reward_given) {
                console.log('🧱 Recording Brick earned!');
              } else if (!result.success) {
                console.error('❌ API Error:', result.error);
              }
            } catch (err) {
              console.error('Failed to save recording:', err);
            }
          } else {
            console.log('⚠️ Skipping API call:', { sceneId: sceneData?.scene_id, duration });
          }
        }
        stream.getTracks().forEach(t => t.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setAudioLevel(0);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer from 0 (her yeni kayıt sıfırdan başlar)
      let currentTime = 0;
      currentDurationRef.current = 0;
        
      recordingTimerRef.current = setInterval(() => {
        currentTime++;
        currentDurationRef.current = currentTime; // Ref'i güncelle
        setRecordingTime(currentTime);
        if (selectedLevel === 'dialogue') {
          if (targetMini === 'mini1') setMini1Time(currentTime);
          else setMini2Time(currentTime);
        }
        
        // Max süreye ulaştığında otomatik durdur
        if (currentTime >= maxTime) {
          stopRecording();
        }
      }, 1000);
      
      updateLevel();
    } catch (err) { 
      showAlert('Microphone access required!'); 
    }
  };

  // Dialogue modunda popup içinden mini seçimi (sadece seçim, kayıt başlatmaz)
  const handleSelectMiniFromPopup = (mini) => {
    if (isRecording) return;
    setCurrentRecordingMini(mini);
  };

  // Start butonuna basılınca kayıt başlat
  const handleStartRecording = () => {
    const targetMini = selectedLevel === 'dialogue' ? currentRecordingMini : selectedMini;
    if (!targetMini) return;
    
    // Dialogue modunda Talk seçili mi kontrol et
    if (selectedLevel === 'dialogue') {
      const talk = getDialogueTalk(targetMini);
      if (!talk) {
        showAlert('Please select a Talk for this Mini first!');
        return;
      }
    }
    
    startRecording(targetMini);
  };

  // Reset butonu - mevcut kayıtları sıfırla
  const handleResetRecording = () => {
    if (isRecording) return;
    
    if (selectedLevel === 'dialogue') {
      // Seçili mini'nin kaydını sil
      if (currentRecordingMini) {
        const key = getRecordingKeyFn(currentRecordingMini);
        if (key && recordedAudio[key]) {
          setRecordedAudio(prev => {
            const newState = { ...prev };
            delete newState[key];
            return newState;
          });
          setRecordedDurations(prev => {
            const newState = { ...prev };
            delete newState[key];
            return newState;
          });
        }
        if (currentRecordingMini === 'mini1') setMini1Time(0);
        else setMini2Time(0);
      }
    } else {
      // Normal modda kaydı sil
      const key = getRecordingKeyFn(selectedMini);
      if (key && recordedAudio[key]) {
        setRecordedAudio(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
        setRecordedDurations(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      }
      setRecordingTime(0);
    }
  };

  // Popup'ı aç (kayıt başlatmadan)
  const openRecordingPopup = () => {
    setShowRecordingPopup(true);
    // Normal modda currentRecordingMini'yi selectedMini olarak set et
    if (selectedLevel !== 'dialogue') {
      setCurrentRecordingMini(selectedMini);
    } else {
      setCurrentRecordingMini(null);
    }
    // Timer'ları sıfırlama - mevcut kayıtları koru
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioContextRef.current?.close();
      // Popup açık kalır, kullanıcı Close ile kapatır
    }
  };

  // Popup'ı kapat ve kayıt varsa action'ı play yap
  const closeRecordingPopup = () => {
    setShowRecordingPopup(false);
    setCurrentRecordingMini(null);
    
    // Kayıt tamamlandıysa action'ı play yap
    if (selectedLevel === 'dialogue') {
      const isDemo = (talk) => talk === 'demo1' || talk === 'demo2';
      
      const mini1Key = selectedTalk1 && !isDemo(selectedTalk1) ? `dialogue-mini1-${selectedTalk1}` : null;
      const mini2Key = selectedTalk2 && !isDemo(selectedTalk2) ? `dialogue-mini2-${selectedTalk2}` : null;
      
      const hasMini1Rec = mini1Key && recordedAudio[mini1Key];
      const hasMini2Rec = mini2Key && recordedAudio[mini2Key];
      
      if (hasMini1Rec || hasMini2Rec) {
        setSelectedAction('play');
      }
    } else {
      // Normal mod - kayıt varsa play'e geç
      const key = getRecordingKeyFn(selectedMini);
      if (key && recordedAudio[key]) {
        setSelectedAction('play');
      }
    }
  };

  // ============================================
  // SCREEN RECORDING FUNCTIONS (Expert Only)
  // ============================================
  
  // Audio destination ref - ses stream'i için
  const audioDestinationRef = useRef(null);
  
  const startScreenRecording = async (audioContext) => {
    if (!isExpertProfile) {
      console.log('Not expert profile, skipping screen recording');
      return;
    }
    
    try {
      // Canvas elementini bul
      const canvasElement = document.querySelector('canvas');
      if (!canvasElement) {
        console.warn('Canvas element not found for screen recording');
        setIsSaveEnabled(true);
        return;
      }
      
      // Canvas stream al (video)
      const canvasStream = canvasElement.captureStream(30); // 30 FPS
      
      // Audio stream al (eğer audioContext varsa)
      let combinedStream;
      if (audioContext && audioDestinationRef.current) {
        const audioStream = audioDestinationRef.current.stream;
        // Video ve audio track'leri birleştir
        const videoTrack = canvasStream.getVideoTracks()[0];
        const audioTrack = audioStream.getAudioTracks()[0];
        
        if (audioTrack) {
          combinedStream = new MediaStream([videoTrack, audioTrack]);
          console.log('Combined stream with audio created');
        } else {
          combinedStream = canvasStream;
          console.log('No audio track, using video only');
        }
      } else {
        combinedStream = canvasStream;
        console.log('No audio context, using video only');
      }
      
      const mimeType = getSupportedVideoMimeType();
      screenRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      screenChunksRef.current = [];
      
      screenRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          screenChunksRef.current.push(e.data);
        }
      };
      
      screenRecorderRef.current.onstop = () => {
        console.log('Screen recording stopped, chunks:', screenChunksRef.current.length);
        if (screenChunksRef.current.length > 0) {
          const blob = new Blob(screenChunksRef.current, { type: mimeType });
          setScreenRecordingBlob(blob);
          console.log('Video blob created, size:', blob.size);
        }
        setIsScreenRecording(false);
        setIsSaveEnabled(true);
      };
      
      screenRecorderRef.current.start(100); // Her 100ms'de data al
      setIsScreenRecording(true);
      console.log('Screen recording started');
      
    } catch (err) {
      console.error('Screen recording failed:', err);
      setIsSaveEnabled(true);
    }
  };

  const stopScreenRecording = () => {
    if (screenRecorderRef.current && screenRecorderRef.current.state === 'recording') {
      console.log('Stopping screen recording...');
      screenRecorderRef.current.stop();
    } else {
      console.log('No active recording, enabling save for image only');
      setIsSaveEnabled(true);
    }
  };

  // Canvas'tan görüntü al
  const captureCanvasImage = () => {
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) {
      showAlert('Could not capture scene image');
      return null;
    }
    
    return canvasElement.toDataURL('image/jpeg', 0.95);
  };

  // Unified download handler
  const handleDownload = (type, closePopup = true) => {
    setIsProcessingSave(true);
    
    try {
      if (type === 'image') {
        const imageDataUrl = captureCanvasImage();
        if (!imageDataUrl) {
          setIsProcessingSave(false);
          return;
        }
        
        const link = document.createElement('a');
        link.download = `mini-talks-scene-${Date.now()}.jpg`;
        link.href = imageDataUrl;
        link.click();
      } else if (type === 'video') {
        if (!screenRecordingBlob) {
          showAlert('No video recording available');
          setIsProcessingSave(false);
          return;
        }
        
        const url = URL.createObjectURL(screenRecordingBlob);
        const link = document.createElement('a');
        link.download = `mini-talks-animation-${Date.now()}.webm`;
        link.href = url;
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      
    } catch (err) {
      console.error('Download failed:', err);
      showAlert('Failed to download');
    }
    
    setIsProcessingSave(false);
  };

  // Save button click handler
  const handleSaveClick = () => {
    if (!isSaveEnabled) return;
    setShowSaveMomentPopup(true);
  };
const playRecordedAudio = async () => {
    const key = getRecordingKeyFn();
    if (!key) return;
    
    const audioUrl = recordedAudio[key];
    if (!audioUrl) { showAlert('No recording for this selection!'); return; }
    
    setSpeakingMini(selectedMini);
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') await audioContext.resume();
      
      // ★ Safari fix: blob URL → ArrayBuffer → decodeAudioData → BufferSource
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      if (isExpertProfile) {
        const dest = audioContext.createMediaStreamDestination();
        source.connect(dest);
        audioDestinationRef.current = dest;
      }
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      if (isExpertProfile) await startScreenRecording(audioContext);
      
      setIsPlayingAudio(true);
      
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const level = Math.min(dataArray.reduce((a, b) => a + b) / dataArray.length / 128, 1);
        audioLevelRef.current = level;
        setAudioLevel(level);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
      
      source.onended = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        audioLevelRef.current = 0;
        setIsPlayingAudio(false);
        setAudioLevel(0);
        setSpeakingMini(null);
        if (isExpertProfile) stopScreenRecording();
        audioContext.close();
      };
      
      source.start(0);
    } catch (err) {
      console.error('Audio playback failed:', err);
      setIsPlayingAudio(false);
      setSpeakingMini(null);
      if (isExpertProfile) stopScreenRecording();
    }
  };

  // Dialogue modunda sıralı oynatma (lip-sync ile)
  const playDialogueAudio = async () => {
    const isDemo = (talk) => talk === 'demo1' || talk === 'demo2';
    
    const mini1Key = selectedTalk1 && !isDemo(selectedTalk1) ? `dialogue-mini1-${selectedTalk1}` : null;
    const mini2Key = selectedTalk2 && !isDemo(selectedTalk2) ? `dialogue-mini2-${selectedTalk2}` : null;
    
    const mini1AudioUrl = mini1Key ? recordedAudio[mini1Key] : null;
    const mini2AudioUrl = mini2Key ? recordedAudio[mini2Key] : null;
    
    // Demo için şimdilik skip (ses dosyası yok)
    // Sadece kayıtlı sesleri çal
    
    if (!mini1AudioUrl && !mini2AudioUrl) {
      showAlert('No recordings to play!');
      return;
    }
    
    // Shared AudioContext for screen recording
    const sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume();
    }
    
    // Expert için: Audio destination oluştur
    if (isExpertProfile) {
      audioDestinationRef.current = sharedAudioContext.createMediaStreamDestination();
      await startScreenRecording(sharedAudioContext);
    }
    
    // Sıralı oynatma fonksiyonu (lip-sync ile)
    const playWithLipSync = async (audioUrl, mini, onEnd) => {
      if (!audioUrl) {
        onEnd && onEnd();
        return;
      }
      
      setSpeakingMini(mini);
      
      try {
        // ★ Safari fix: decodeAudioData
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await sharedAudioContext.decodeAudioData(arrayBuffer);
        
        const analyser = sharedAudioContext.createAnalyser();
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const source = sharedAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        if (isExpertProfile && audioDestinationRef.current) {
          source.connect(audioDestinationRef.current);
        }
        
        source.connect(analyser);
        analyser.connect(sharedAudioContext.destination);
        
        setIsPlayingAudio(true);
        
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const level = Math.min(dataArray.reduce((a, b) => a + b) / dataArray.length / 128, 1);
          audioLevelRef.current = level;
          setAudioLevel(level);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
        
        source.onended = () => {
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          audioLevelRef.current = 0;
          setAudioLevel(0);
          setSpeakingMini(null);
          setTimeout(() => { onEnd && onEnd(); }, 100);
        };
        
        source.start(0);
      } catch (err) {
        console.error('Dialogue playback failed:', err);
        setIsPlayingAudio(false);
        setSpeakingMini(null);
        setAudioLevel(0);
        onEnd && onEnd();
      }
    };
    
    // Önce Mini-1 (sol figür), sonra Mini-2 (sağ figür)
    playWithLipSync(mini1AudioUrl, 'mini1', () => {
      playWithLipSync(mini2AudioUrl, 'mini2', () => {
        setIsPlayingAudio(false);
        setSpeakingMini(null);
        setAudioLevel(0);
        
        // Expert için screen recording durdur
        if (isExpertProfile) {
          stopScreenRecording();
        }
        
        // Shared context'i kapat
        sharedAudioContext.close();
      });
    });
  };

  const handleResetClick = () => {
    setSelectedLevel(null);
    setSelectedMini(null);
    setSelectedTalk(null);
    setSelectedTalk1(null);
    setSelectedTalk2(null);
    setSelectedAction(null);
    setMini1Time(0);
    setMini2Time(0);
    setRecordingTime(0);
    // Reset save state for expert
    setIsSaveEnabled(false);
    setScreenRecordingBlob(null);
    // Kayıtlar korunur, sadece seçimler sıfırlanır
  };
  
  const handleDeleteClick = () => {
    const isDialogueMode = selectedLevel === 'dialogue';
    
    if (isDialogueMode) {
      // Dialogue modunda seçili talk'lardaki kayıtları sil
      let deleted = false;
      
      // Mini-1 kaydını sil (demo değilse)
      if (selectedTalk1 && selectedTalk1 !== 'demo1' && selectedTalk1 !== 'demo2') {
        const mini1Key = `dialogue-mini1-${selectedTalk1}`;
        if (recordedAudio[mini1Key]) {
          setRecordedAudio(prev => {
            const newState = { ...prev };
            delete newState[mini1Key];
            return newState;
          });
          setRecordedDurations(prev => {
            const newState = { ...prev };
            delete newState[mini1Key];
            return newState;
          });
          setMini1Time(0);
          deleted = true;
        }
      }
      
      // Mini-2 kaydını sil (demo değilse)
      if (selectedTalk2 && selectedTalk2 !== 'demo1' && selectedTalk2 !== 'demo2') {
        const mini2Key = `dialogue-mini2-${selectedTalk2}`;
        if (recordedAudio[mini2Key]) {
          setRecordedAudio(prev => {
            const newState = { ...prev };
            delete newState[mini2Key];
            return newState;
          });
          setRecordedDurations(prev => {
            const newState = { ...prev };
            delete newState[mini2Key];
            return newState;
          });
          setMini2Time(0);
          deleted = true;
        }
      }
      
      if (deleted) {
        setSelectedAction(null);
        setIsSaveEnabled(false);
        setScreenRecordingBlob(null);
        alert.error('The recording has been removed.', 'Recording Deleted');
      }
    } else {
      // Normal mod - tek kayıt sil
      const key = getRecordingKeyFn();
      if (key && recordedAudio[key]) {
        setRecordedAudio(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
        setRecordedDurations(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
        setRecordingTime(0);
        setSelectedAction(null);
        setIsSaveEnabled(false);
        setScreenRecordingBlob(null);
        alert.error('The recording has been removed.', 'Recording Deleted');
      }
    }
  };

  // Computed Values
  const isDialogue = selectedLevel === 'dialogue';
  const canSelectMini = !!selectedLevel;
  const canSelectTalk = !!selectedLevel && !!selectedMini;
  const canSelectAction = !!selectedLevel && !!selectedMini && !!selectedTalk;
  
  const recordingKey = getRecordingKeyFn();
  const hasRecording = recordingKey && recordedAudio[recordingKey];
  
  // Dialogue modunda demo kontrolleri
  const isTalk1Demo = selectedTalk1 === 'demo1' || selectedTalk1 === 'demo2';
  const isTalk2Demo = selectedTalk2 === 'demo1' || selectedTalk2 === 'demo2';
  const bothDemo = isDialogue && isTalk1Demo && isTalk2Demo; // Her ikisi de demo
  const anyDemo = isDialogue ? (isTalk1Demo || isTalk2Demo) : (selectedTalk === 'demo1' || selectedTalk === 'demo2');
  
  // Normal mod için demo kontrolü
  const isDemo = !isDialogue && (selectedTalk === 'demo1' || selectedTalk === 'demo2');
  
  // Dialogue'da kayıt kontrolleri
  const mini1RecordKey = isDialogue && selectedTalk1 ? `dialogue-mini1-${selectedTalk1}` : null;
  const mini2RecordKey = isDialogue && selectedTalk2 ? `dialogue-mini2-${selectedTalk2}` : null;
  const hasMini1Recording = mini1RecordKey && (recordedAudio[mini1RecordKey] || isTalk1Demo);
  const hasMini2Recording = mini2RecordKey && (recordedAudio[mini2RecordKey] || isTalk2Demo);
  
  // Dialogue'da record yapılabilir mi? (en az bir non-demo Talk olmalı)
  const canRecordInDialogue = isDialogue && ((selectedTalk1 && !isTalk1Demo) || (selectedTalk2 && !isTalk2Demo));
  
  // Dialogue'da play yapılabilir mi? 
  // Seçili her talk için kayıt veya demo olmalı
  const mini1HasContent = !selectedTalk1 || isTalk1Demo || (mini1RecordKey && recordedAudio[mini1RecordKey]);
  const mini2HasContent = !selectedTalk2 || isTalk2Demo || (mini2RecordKey && recordedAudio[mini2RecordKey]);
  const canPlayInDialogue = isDialogue && (selectedTalk1 || selectedTalk2) && mini1HasContent && mini2HasContent;
  
  const calculateIsGreenTick = () => {
    if (selectedAction === 'reset') return true;
    
    if (isDialogue) {
      const hasTalk = selectedTalk1 || selectedTalk2;
      if (!selectedLevel || !hasTalk || !selectedAction) return false;
      
      switch (selectedAction) {
        case 'play':
          // Play için en az bir kayıt veya demo olmalı
          return canPlayInDialogue;
        case 'record':
          // Record için en az bir non-demo Talk olmalı
          return canRecordInDialogue;
        case 'delete':
          // Delete için en az bir kayıt olmalı
          return (mini1RecordKey && recordedAudio[mini1RecordKey]) || 
                 (mini2RecordKey && recordedAudio[mini2RecordKey]);
        default:
          return false;
      }
    } else {
      // Normal mod
      // Demo seçiliyse play veya reset action olmalı
      if (isDemo && selectedLevel && selectedMini && selectedTalk && selectedAction) {
        return selectedAction === 'play' || selectedAction === 'reset';
      }
      if (!selectedLevel || !selectedMini || !selectedTalk || !selectedAction) return false;
      
      switch (selectedAction) {
        case 'play': return hasRecording;
        case 'record': return !hasRecording;
        case 'delete': return hasRecording;
        default: return false;
      }
    }
  };
  
  const isGreenTick = calculateIsGreenTick();
  
  // Action seçeneklerini filtrele
  const getAvailableActions = () => {
    // Normal modda demo seçiliyse sadece Play ve Reset
    if (!isDialogue && isDemo) {
      return { 
        play: ACTION_BRICKS.play, 
        reset: ACTION_BRICKS.reset 
      };
    }
    
    // Dialogue modunda her ikisi de demo ise sadece Play ve Reset
    if (isDialogue && bothDemo) {
      return { 
        play: ACTION_BRICKS.play, 
        reset: ACTION_BRICKS.reset 
      };
    }
    
    // Diğer durumlarda tüm action'lar
    return ACTION_BRICKS;
  };
  
    const handleTickClick = () => {
    if (isPlayingAudio) return;
    // Normal modda demo - action'a göre davran
    if (!isDialogue && isDemo && selectedLevel && selectedMini && selectedTalk) {
      if (selectedAction === 'play') {
        alert(`Playing demo: ${selectedTalk}`);
        return;
      } else if (selectedAction === 'reset') {
        handleResetClick();
        return;
      }
    }
    
    // Dialogue'da her ikisi de demo - action'a göre davran
    if (isDialogue && bothDemo) {
      if (selectedAction === 'play') {
        playDialogueAudio();
        return;
      } else if (selectedAction === 'reset') {
        handleResetClick();
        return;
      }
    }
    
    if (!isGreenTick) {
      if (!selectedLevel) showAlert('Level selection missing!');
      else if (isDialogue && !selectedTalk1 && !selectedTalk2) showAlert('Select Talk for Mini-1 or Mini-2!');
      else if (!isDialogue && !selectedMini) showAlert('Mini selection missing!');
      else if (!isDialogue && !selectedTalk) showAlert('Talk selection missing!');
      else if (!selectedAction) showAlert('Action selection missing!');
      else if (selectedAction === 'play' && isDialogue && !canPlayInDialogue) {
        // Hangi mini için kayıt eksik?
        if (selectedTalk1 && !isTalk1Demo && !recordedAudio[mini1RecordKey]) {
          showAlert('No recording for Mini-1!');
        } else if (selectedTalk2 && !isTalk2Demo && !recordedAudio[mini2RecordKey]) {
          showAlert('No recording for Mini-2!');
        } else {
          showAlert('No recording to play!');
        }
      }
      else if (selectedAction === 'play' && !hasRecording && !isDialogue) showAlert('No recording to play!');
      else if (selectedAction === 'delete' && !hasRecording) showAlert('No recording to delete!');
      return;
    }
    
    switch (selectedAction) {
      case 'play': 
        if (isDialogue) {
          playDialogueAudio();
        } else {
          playRecordedAudio();
        }
        break;
      case 'record': 
        openRecordingPopup();
        break;
      case 'reset': handleResetClick(); break;
      case 'delete': handleDeleteClick(); break;
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <img src={loadingGif} alt="Loading..." style={{ width: '128px', height: '128px' }} />
        <span style={{ fontSize: '20px', fontWeight: 700, color: '#4b5563' }}>Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e5e5e5] overflow-hidden flex flex-col">
      {/* Recording Popup */}
      <RecordingPopup
        isOpen={showRecordingPopup}
        onClose={closeRecordingPopup}
        onStop={stopRecording}
        onStart={handleStartRecording}
        onReset={handleResetRecording}
        isDialogue={isDialogue}
        selectedLevel={selectedLevel}
        selectedMini={selectedMini}
        selectedTalk={selectedTalk}
        selectedTalk1={selectedTalk1}
        selectedTalk2={selectedTalk2}
        recordingTime={recordingTime}
        mini1Time={mini1Time}
        mini2Time={mini2Time}
        currentRecordingMini={currentRecordingMini}
        onSelectMini={handleSelectMiniFromPopup}
        isRecordingActive={isRecording}
        maxRecordingTime={getMaxRecordingTime()}
      />

      {/* Save Moment Popup (Expert Only) */}
      <SaveMomentPopup
        isOpen={showSaveMomentPopup}
        onClose={() => setShowSaveMomentPopup(false)}
        onDownload={handleDownload}
        hasVideoRecording={!!screenRecordingBlob}
        isProcessing={isProcessingSave}
      />


      {/* Mobil floating header — slot/buton küçültme */}
      {isSmallScreen && (
        <style>{`
          .mt-mobilebar img.h-14, .mt-mobilebar img.h-12 { height: 56px !important; }
          .mt-mobilebar .ml-6 { margin-left: 8px !important; }
          .mt-mobilebar .ml-1 { margin-left: 4px !important; }
          .mt-mobilebar .gap-2 { gap: 6px !important; }
          .mt-mobilebar::-webkit-scrollbar { display: none; }
          .mt-mobilebar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      )}

      {/* HEADER */}
      <div
        className={isSmallScreen ? '' : 'bg-white shadow-lg flex-shrink-0'}
        style={isSmallScreen ? {
          position: 'fixed',
          left: '50%',
          bottom: 'calc(10px + env(safe-area-inset-bottom))',
          transform: 'translateX(-50%)',
          zIndex: 40,
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderRadius: '16px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
          padding: '6px 8px',
          maxWidth: 'calc(100vw - 16px)'
        } : undefined}
      >
        <div
          className={isSmallScreen ? 'mt-mobilebar flex items-center gap-1' : 'max-w-[1920px] mx-auto px-4 py-3 flex items-center gap-4'}
          style={isSmallScreen ? { flexWrap: 'nowrap', overflow: 'visible' } : undefined}
        >
          
          {/* Main Menu + Logo */}
          <button
            onMouseEnter={() => setMainMenuHover(true)}
            onMouseLeave={() => setMainMenuHover(false)}
            onClick={() => navigate('/scene-selection')}
            className="hover:scale-105 transition-transform"
          >
            <img src={mainMenuHover ? mainMenuIconHover : mainMenuIcon} alt="Menu" className="h-14" />
          </button>
          <img src={logoImg} alt="Mini-Talks" className="h-14" />

          {/* SLOT'LAR - Dropdown'lu */}
          <div className="flex items-center gap-2 ml-6">
            
            {/* 1. RED SLOT - Level */}
            <SlotWithDropdown
              slotImage={slotButton1}
              selectedValue={selectedLevel}
              selectedImage={selectedLevel ? LEVEL_BRICKS[selectedLevel].normal : null}
              options={LEVEL_BRICKS}
              isOpen={levelDropdownOpen}
              onToggle={() => {
                setLevelDropdownOpen(!levelDropdownOpen);
                setMiniDropdownOpen(false);
                setTalkDropdownOpen(false);
                setActionDropdownOpen(false);
                setTalk1DropdownOpen(false);
                setTalk2DropdownOpen(false);
              }}
              onSelect={handleLevelSelect}
              disabledOptions={Object.entries(LEVEL_ID_MAP).filter(([_, id]) => levelLocks[id]).map(([key]) => key)}
              openUp={isSmallScreen}
            />

            {isDialogue ? (
              /* DIALOGUE MODE: Mini-1 + Talk1 + Mini-2 + Talk2 */
              <div className="flex items-center gap-2">
                {/* Mini-1 Button (sabit) */}
                <div className="flex items-center">
                  <img src={mini1Button} alt="Mini-1" className="h-14" />
                </div>
                
                {/* Talk1 Slot - Mini-1 için */}
                <SlotWithDropdown
                  slotImage={slotButton3}
                  selectedValue={selectedTalk1}
                  selectedImage={selectedTalk1 ? TALK_BRICKS[selectedTalk1].normal : null}
                  options={TALK_BRICKS}
                  isOpen={talk1DropdownOpen}
                  onToggle={() => {
                    setTalk1DropdownOpen(!talk1DropdownOpen);
                    setTalk2DropdownOpen(false);
                    setLevelDropdownOpen(false);
                    setActionDropdownOpen(false);
                  }}
                  onSelect={(talk) => {
                    setSelectedTalk1(talk);
                    setTalk1DropdownOpen(false);
                    // Action kullanıcı tarafından seçilecek
                    setSelectedAction(null);
                    // Kayıt varsa süreyi göster, yoksa sıfırla
                    const talk1IsDemo = talk === 'demo1' || talk === 'demo2';
                    if (!talk1IsDemo) {
                      const key = `dialogue-mini1-${talk}`;
                      if (recordedAudio[key]) {
                        setMini1Time(recordedDurations[key] || 0);
                      } else {
                        setMini1Time(0);
                      }
                    }
                  }}
                  openUp={isSmallScreen}
                />
                
                {/* Mini-2 Button (sabit) */}
                <div className="flex items-center">
                  <img src={mini2Button} alt="Mini-2" className="h-14" />
                </div>
                
                {/* Talk2 Slot - Mini-2 için */}
                <SlotWithDropdown
                  slotImage={slotButton3}
                  selectedValue={selectedTalk2}
                  selectedImage={selectedTalk2 ? TALK_BRICKS[selectedTalk2].normal : null}
                  options={TALK_BRICKS}
                  isOpen={talk2DropdownOpen}
                  onToggle={() => {
                    setTalk2DropdownOpen(!talk2DropdownOpen);
                    setTalk1DropdownOpen(false);
                    setLevelDropdownOpen(false);
                    setActionDropdownOpen(false);
                  }}
                  onSelect={(talk) => {
                    setSelectedTalk2(talk);
                    setTalk2DropdownOpen(false);
                    // Action kullanıcı tarafından seçilecek
                    setSelectedAction(null);
                    // Kayıt varsa süreyi göster, yoksa sıfırla
                    const talk2IsDemo = talk === 'demo1' || talk === 'demo2';
                    if (!talk2IsDemo) {
                      const key = `dialogue-mini2-${talk}`;
                      if (recordedAudio[key]) {
                        setMini2Time(recordedDurations[key] || 0);
                      } else {
                        setMini2Time(0);
                      }
                    }
                  }}
                  openUp={isSmallScreen}
                />
              </div>
            ) : (
              /* NORMAL MODE: Mini + Talk */
              <>
                {/* 2. BLUE SLOT - Mini */}
                <SlotWithDropdown
                  slotImage={slotButton2}
                  selectedValue={selectedMini}
                  selectedImage={selectedMini ? MINI_BRICKS[selectedMini].normal : null}
                  options={MINI_BRICKS}
                  isOpen={miniDropdownOpen}
                  onToggle={() => {
                    if (canSelectMini) {
                      setMiniDropdownOpen(!miniDropdownOpen);
                      setLevelDropdownOpen(false);
                      setTalkDropdownOpen(false);
                      setActionDropdownOpen(false);
                    }
                  }}
                  onSelect={handleMiniSelect}
                  disabled={!canSelectMini}
                  openUp={isSmallScreen}
                />

                {/* 3. GREEN SLOT - Talk */}
                <SlotWithDropdown
                  slotImage={slotButton3}
                  selectedValue={selectedTalk}
                  selectedImage={selectedTalk ? TALK_BRICKS[selectedTalk].normal : null}
                  options={TALK_BRICKS}
                  isOpen={talkDropdownOpen}
                  onToggle={() => {
                    if (canSelectTalk) {
                      setTalkDropdownOpen(!talkDropdownOpen);
                      setLevelDropdownOpen(false);
                      setMiniDropdownOpen(false);
                      setActionDropdownOpen(false);
                    }
                  }}
                  onSelect={handleTalkSelect}
                  disabled={!canSelectTalk}
                  openUp={isSmallScreen}
                />
              </>
            )}

            {/* 4. YELLOW SLOT - Action */}
            <SlotWithDropdown
              slotImage={slotButton4}
              selectedValue={selectedAction}
              selectedImage={selectedAction ? ACTION_BRICKS[selectedAction].normal : null}
              options={getAvailableActions()}
              isOpen={actionDropdownOpen}
              onToggle={() => {
                const canSelect = isDialogue 
                  ? (selectedTalk1 || selectedTalk2)
                  : canSelectAction;
                  
                if (canSelect) {
                  setActionDropdownOpen(!actionDropdownOpen);
                  setLevelDropdownOpen(false);
                  setMiniDropdownOpen(false);
                  setTalkDropdownOpen(false);
                  setTalk1DropdownOpen(false);
                  setTalk2DropdownOpen(false);
                }
              }}
              onSelect={handleActionSelect}
              disabled={
                isDialogue 
                  ? (!selectedTalk1 && !selectedTalk2)
                  : !canSelectAction
              }
              disabledOptions={(() => {
                const disabled = [];
                if (isDialogue) {
                  const hasMini1Rec = selectedTalk1 && selectedTalk1 !== 'demo1' && selectedTalk1 !== 'demo2' && recordedAudio[`dialogue-mini1-${selectedTalk1}`];
                  const hasMini2Rec = selectedTalk2 && selectedTalk2 !== 'demo1' && selectedTalk2 !== 'demo2' && recordedAudio[`dialogue-mini2-${selectedTalk2}`];
                  if (!hasMini1Rec && !hasMini2Rec) {
                    disabled.push('delete');
                  }
                } else {
                  if (!hasRecording) {
                    disabled.push('delete');
                  }
                }
                return disabled;
              })()}
              openUp={isSmallScreen}
            />

            {/* TICK */}
            <button
              onClick={handleTickClick}
              className="transition-transform hover:scale-110 ml-1"
            >
              <img 
                src={isGreenTick ? slotButtonOK2 : slotButtonOK1} 
                alt={isGreenTick ? "OK" : "Missing"} 
                className="h-14" 
              />
            </button>

            {/* SAVE BUTTON (Expert Only) */}
            {isExpertProfile && (
              <button
                onClick={handleSaveClick}
                onMouseEnter={() => setSaveButtonHover(true)}
                onMouseLeave={() => setSaveButtonHover(false)}
                className={`transition-all ml-1 relative ${isSaveEnabled ? 'hover:scale-110' : 'opacity-40 cursor-not-allowed'}`}
                disabled={!isSaveEnabled}
              >
                <img 
                  src={saveButtonHover && isSaveEnabled ? gameSaveBtnHover : gameSaveBtn} 
                  alt="Save" 
                  className="h-14"
                  style={{ height: '56px', width: 'auto' }}
                />
                {/* Recording indicator */}
                {isScreenRecording && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            )}
          </div>
       

          {/* Audio Level Indicator  <HairCalibrationPanel
  characters={characters}
  setCharacters={setCharacters}
  gameHairOverrides={gameHairOverrides}
  setGameHairOverrides={setGameHairOverrides}
/> */}
          {(isRecording || isPlayingAudio) && (
            <div className="flex items-center gap-2 ml-auto">
              {isRecording && (
                <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full" />
                  REC
                </div>
              )}
              <div className="w-24 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-75" style={{ width: `${audioLevel * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
          {/* Hair Debug Panel */}

{/* 3D CANVAS */}

      {/* 3D CANVAS */}
      <div className="flex-1 relative">
        {/* Loading Overlay */}
        {!canShowScene && (
          <div className="absolute inset-0 bg-[#e8e8e8] flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-gray-600 font-bold text-xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Loading Scene...
              </div>
            </div>
          </div>
        )}
        <div className="absolute inset-0" style={{ opacity: canShowScene ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          <Canvas
            camera={{ position: [100, 30, 60], fov: 50, near: 5, far: 1000 }}
            shadows
            dpr={[1, 2]} // 3x çok aşırıydı, 2x yeterli
            gl={{ 
              antialias: true, 
              alpha: false, 
              powerPreference: 'high-performance',
              preserveDrawingBuffer: true,
              failIfMajorPerformanceCaveat: false,
              precision: 'highp',
            }}
            onCreated={({ gl, scene }) => {
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.PCFSoftShadowMap;
              gl.outputColorSpace = THREE.SRGBColorSpace;
              scene.background = new THREE.Color('#e8e8e8');
              // Tone mapping SceneGLSettings component'inde sahne bazlı ayarlanıyor
            }}
          >
            <Suspense fallback={null}>
              <SceneGLSettings sceneId={sceneData?.scene_id} onReady={() => setSettingsReady(true)} />
              {/* Sahne 1: CinematicLighting | Sahne 2/3: GLB'deki kendi ışıkları + minimal ambient */}
              {(() => {
                const L = SCENE_LIGHTING[sceneData?.scene_id] || SCENE_LIGHTING.default;
                return (
                  <>
                    <ambientLight intensity={L.ambient.intensity} />
                    <directionalLight
                      position={L.main.position}
                      intensity={L.main.intensity}
                      castShadow={L.main.shadow}
                      shadow-mapSize-width={L.main.shadowMapSize || 4096}
                      shadow-mapSize-height={L.main.shadowMapSize || 4096}
                      shadow-camera-far={400}
                      shadow-camera-left={-150}
                      shadow-camera-right={150}
                      shadow-camera-top={150}
                      shadow-camera-bottom={-150}
                      shadow-bias={L.main.shadowBias || -0.001}
                      shadow-normalBias={L.main.shadowNormalBias || 0.05}
                    />
                    <directionalLight
                      position={L.fill.position}
                      intensity={L.fill.intensity}
                      color={L.fill.color || '#ffffff'}
                    />
                    {L.extra && (
                      <directionalLight
                        position={L.extra.position}
                        intensity={L.extra.intensity}
                        color={L.extra.color || '#ffffff'}
                      />
                    )}
                  </>
                );
              })()}
              
                <BlenderScene
                key={`scene-${sceneData?.scene_id || 1}-${spectatorSessionSeed}`}
                scenePath={SCENE_MODEL_MAP[sceneData?.scene_id] || sceneModelPath1}
                character1Config={characters[0]}
                character2Config={characters[1]}
                onAnimationEnd={handleAnimationEnd}
                selectedMini={isPlayingAudio ? speakingMini : null}
                audioLevel={audioLevel}
                audioLevelRef={audioLevelRef}
                isPlayingAudio={isPlayingAudio}
                //onSceneReady={() => setSceneLoaded(true)}
                onSceneReady={() => {
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      setSceneLoaded(true);
                    });
                  });
                }}
                  gameHairOverrides={gameHairOverrides}
                sceneId={sceneData?.scene_id}
                torsoManifest={torsoManifest}
                legsManifest={legsManifest}
                spectatorSessionSeed={spectatorSessionSeed}
                onCameraFound={(config) => setGlbCameraConfig(config)}
              />
              <SceneCameraController 
                cameraConfig={sceneData?.scene_id ? glbCameraConfig : null}
                defaultPosition={[100, 30, 60]}
                defaultTarget={[-110, 10, 60]}
                sceneId={sceneData?.scene_id}
              />
              {/* Contact shadow: Bu sahne yapısı için baked/SSAO/ContactShadows uygun değil.
                  DirectionalLight shadow karakterler için yeterli. */}
              {/* Cam yansıma: MeshPhysicalMaterial + RoomEnvironment envMap
                  Gerçek sahne yansıması (figürler camda) Three.js'de SSR/ray-trace 
                  paketi gerektirir. Şu an envMap ile çevre yansıması aktif. */}
            </Suspense>
          </Canvas>
        </div>
      </div>
    </div>
  );
};

export default GamePage;














