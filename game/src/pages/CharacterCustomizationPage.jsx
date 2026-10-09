// src/pages/CharacterCustomizationPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LegoFigure from '../components/LegoFigure';
import Header from '../components/common/Header';
import axios from 'axios';
import { EXCLUDED_HAIR } from '../components/HairModels'; // ← EXCLUDED_HAIR import

const EXPRESSIVE_HAIR = new Set([
  // Male
  6, 15, 16, 22, 24, 26, 29, 30, 31, 32, 34, 35, 37, 44,
  // Female
  103, 105, 106, 107, 112, 113, 114, 116, 117, 118, 119,
  122, 123, 125, 127, 128, 129, 130, 135, 136, 137, 139,
  141, 142, 143, 144, 145, 146, 147,
  // Child
  208, 212, 214, 217, 218, 219, 220, 221, 222, 224, 225, 229, 242,
]);

// ─────────────────────────────────────────────────────────────────────────────
// HAIR_CATEGORY — globalId → kategori (gender-agnostic, yalnızca GÖRSEL sınıflama)
// Sıra numarası "label" string'inden parse edilir; sadece kategori-içi görsel
// sıralama için kullanılır. Arka plan Simple/Expressive mantığını HİÇ etkilemez.
// Gender kalkınca bu tablo aynen kalır — globalId bazlı olduğu için.
// ─────────────────────────────────────────────────────────────────────────────
const HAIR_CAT_RAW = {
  101: 'long1', 109: 'long2', 102: 'long3', 104: 'curly', 108: 'long4', 110: 'long5',
  111: 'long6', 115: 'long7', 120: 'medium1', 121: 'long13', 124: 'long14', 126: 'long12',
  131: 'medium2', 132: 'bun9', 133: 'curly3', 134: 'short37', 138: 'medium3', 140: 'curly4',
  148: 'long15', 149: 'long16', 150: 'long17', 151: 'long18', 152: 'long19',
  103: 'tied13', 105: 'tied12', 106: 'tied04', 107: 'curly10', 112: 'medium11', 113: 'tied05',
  114: 'tied06', 116: 'tied14', 117: 'curly11', 118: 'curly12', 119: 'bun12', 122: 'curly13',
  123: 'tied15', 125: 'tied19', 127: 'tied11', 128: 'tied17', 129: 'tied07', 130: 'tied16',
  135: 'bun04', 136: 'bun03', 137: 'curly14', 139: 'bun05', 141: 'tied08', 142: 'bun11',
  143: 'bun06', 144: 'bun07', 145: 'bun08', 146: 'bun02', 147: 'bun01',
  1: 'short01', 2: 'curly07', 3: 'short02', 4: 'short03', 5: 'short04', 7: 'short05',
  8: 'fun04', 9: 'short06', 10: 'short07', 11: 'short08', 12: 'curly06', 13: 'short09',
  17: 'short10', 18: 'curly08', 19: 'short11', 20: 'short12', 23: 'short18', 25: 'short14',
  27: 'short15', 28: 'short16', 33: 'short17', 36: 'short13', 38: 'short19', 39: 'short20',
  40: 'short21', 41: 'short22', 42: 'short23', 43: 'short24', 6: 'fun05', 15: 'short25',
  16: 'medium10', 22: 'short26', 24: 'short27', 26: 'short28', 29: 'fun06', 30: 'fun07',
  31: 'fun08', 32: 'tied10', 34: 'short29', 35: 'tied09', 37: 'short30', 44: 'short31',
  211: 'tied01', 201: 'curly01', 202: 'long08', 203: 'curly02', 205: 'medium04',
  206: 'medium05', 207: 'curly05', 209: 'tied02', 210: 'tied03', 213: 'medium06',
  215: 'long09', 216: 'medium07', 223: 'fun01', 226: 'medium08', 227: 'medium09',
  228: 'medium12', 230: 'long10', 231: 'medium13', 232: 'medium14', 233: 'fun02',
  234: 'short32', 235: 'medium15', 236: 'short33', 237: 'short34', 238: 'medium16',
  239: 'short35', 240: 'short36', 241: 'medium17', 243: 'fun03', 244: 'medium18',
  245: 'long11', 246: 'medium19', 208: 'tied19', 212: 'fun10', 214: 'fun11', 217: 'fun12',
  218: 'tied18', 219: 'fun13', 220: 'fun14', 221: 'fun15', 222: 'fun16', 224: 'fun17',
  225: 'bun10', 229: 'medium20', 242: 'fun19',
};

const HAIR_CATEGORIES = ['short', 'medium', 'long', 'tied', 'curly', 'fun', 'bun'];
const HAIR_CATEGORY_LABELS = {
  short: 'Short', medium: 'Medium', long: 'Long',
  tied: 'Tied', curly: 'Curly', fun: 'Fun', bun: 'Bun',
};

// globalId → { category, order }  (order = kategori-içi görsel sıra numarası)
const HAIR_CATEGORY = {};
Object.entries(HAIR_CAT_RAW).forEach(([gid, raw]) => {
  const m = /^([a-z]+)(\d+)?$/.exec(raw);
  HAIR_CATEGORY[Number(gid)] = {
    category: m[1],
    order: m[2] ? Number(m[2]) : 0,
  };
});

const getHairCategory = (textureIndex) => HAIR_CATEGORY[textureIndex]?.category ?? null;
const getHairOrder = (textureIndex) => HAIR_CATEGORY[textureIndex]?.order ?? 9999;

// Safari viewport fix - inline version
const useSafariViewportFix = () => {
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);
};

import miniFigureIconRed from '../assets/mini_figure_icon_red.png';
import miniFigureIconWhite from '../assets/mini_figure_icon_white.png';
import saveBtnImg from '../assets/Save Yazi Buton.png';
import saveBtnHoverImg from '../assets/Save Yazi Buton_Hover.png';
import resetBtnImg from '../assets/Reset Yazi Buton.png';
import resetBtnHoverImg from '../assets/Reset Yazi Buton_Hover.png';
import surpriseBtnImg from '../assets/Surprise Me Yazi Buton.png';
import surpriseBtnHoverImg from '../assets/Surprise Me Yazi Buton_Hover.png';
import hairIconRed from '../assets/Hair_Icon_Red.png';
import headIconRed from '../assets/Head_Icon_Red.png';
import torsoIconRed from '../assets/Torso_Icon_Red.png';
import legsIconRed from '../assets/Legs_Icon_Red.png';
import hairIconWhite from '../assets/Hair_Icon_White.png';
import headIconWhite from '../assets/Head_Icon_White.png';
import torsoIconWhite from '../assets/Torso_Icon_White.png';
import legsIconWhite from '../assets/Legs_Icon_White.png';
import femaleIcon from '../assets/female_icon.png';
import maleIcon from '../assets/male_icon.png';
import childIcon from '../assets/child_icon.png';
import frontIcon from '../assets/Front_Icon.png';
import backIcon from '../assets/Back_Icon.png';
import logoImg from '../assets/logo.png';
import hairProduct1 from '../assets/Sac_Kategori_Gorsel_1.png';
import hairProduct2 from '../assets/Sac_Kategori_Gorsel_2.png';
import customizeBtnImg from '../assets/buttons/customize btn.png';
import customizeBtnHoverImg from '../assets/buttons/customize btn hover.png';
import useReadyBtnImg from '../assets/buttons/use ready btn.png';
import useReadyBtnHoverImg from '../assets/buttons/use ready btn hover.png';

// Popup için LEGO head ve butonlar
import legoHead from '../assets/5.png';
import okBtn from '../assets/Ok_Buton.png';
import okBtnHover from '../assets/Ok_Buton_Hover.png';

// Loading GIF
import loadingGif from '../assets/loading_animation_1.gif';

// Quick-access button icon
import addIcon from '../assets/add_icon.png';

// Torso texture thumbnail'leri
import torsoThumb1 from '../assets/textures/torso/thumb_1.png';
import torsoThumb2 from '../assets/textures/torso/thumb_2.png';
import torsoThumb3 from '../assets/textures/torso/thumb_3.png';

// Legs texture thumbnail'leri

// ============================================================
// HEAD - EYES & MOUTH thumbnail'leri
// Şimdilik sabit placeholder kullanılıyor
// Gerçek thumbnail'lar hazır olunca ayrı ayrı import edilecek
// ============================================================

const hairColors = [
'#4D1F00',  // 0: Kahverengi 1
  '#834400',  // 1: Kahverengi 2
  '#E7CA63',  // 2: Sarı          ← orijinal
  '#000000',  // 3: Siyah         ← orijinal
  '#A8A8A8',  // 4: Gri           ← orijinal
  '#F4F4F4',  // 5: Beyaz         ← orijinal
  '#CC4422',  // 6: Kızıl         ← yeni
];

// Kaş renkleri = Saç renkleri ile aynı
const eyebrowColors = [
  '#000000',  // Siyah
  '#A8A8A8',  // Gri
  '#F4F4F4',  // Beyaz
  '#4D1F00',  // Koyu Kahve
  '#834400',  // Açık Kahve
  '#CC4422',  // Kızıl
];
const getMatchingEyebrowColor = (hairColorIndex) => {
  if (hairColorIndex === 2) return '#834400'; // Sarı saç → açık kahve kaş
  return hairColors[hairColorIndex];
};

// Göz iris renkleri
const eyeColors = [
  '#000000',  // Siyah
  '#5A3825',  // Kahve
  '#8B5A2B',  // Açık Kahve
  '#4E8B3A',  // Yeşil (göz yeşili)
  '#4682B4',  // Mavi (göz mavisi)
];

// Gözlük çerçeve renkleri
const glassesColors = [
  '#1C1C1C',  // Siyah
  '#6B3E26',  // Kahverengi
  '#274C9B',  // Mavi
  '#D62828',  // Kırmızı
  '#2E7D32',  // Yeşil
  '#FF6F00',  // Turuncu
  '#EC4899',  // Pembe
  '#8E63C7',  // Mor
  '#B0B0B0',  // Gri
];

const DEFAULT_HAIR = { female: 109, child: 211, male: 1 };

const TERS_YONLU_SACLAR = new Set([
  2, 6, 17,                                          // male
  104, 112, 116, 117, 118, 122, 133, 136, 137, 140, 149, // female
  201, 203, 206, 216, 224, 232,                       // child
]);

const TERS_ACI = { front: 'back', back: 'front', left: 'right', right: 'left' };
// ─────────────────────────────────────────────────────────────────────────────
// Cinsiyete göre saç listesi üretici
// textureIndex aralıkları HairModels.jsx ile eşleşir:
//   male   →  1 –  32  (m_hair_01 … m_hair_32)
//   female → 101 – 149 (f_hair_01 … f_hair_49)
//   child  → 201 – 249 (c_hair_01 … c_hair_49)
//   0      → kel (saçsız)
// ─────────────────────────────────────────────────────────────────────────────
// Gerçek GLB sayıları: male=44, female=52, child=46
// PNG'ler: /models/hair/png/m_hair_01.png  (aynı isim, tek png alt klasörü)
const HAIR_CONFIG = {
  male:   { count: 44, base: 0,   prefix: 'm' },
  female: { count: 52, base: 100, prefix: 'f' },
  child:  { count: 46, base: 200, prefix: 'c' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Saç thumbnail açıları: front, right, back, left
// Dosya adı: m_hair_01_front.png, m_hair_01_back.png vs.
// ─────────────────────────────────────────────────────────────────────────────
const HAIR_ANGLES = ['front', 'right', 'back', 'left'];
const HAIR_ANGLE_INTERVAL = 700; // ms - her açı arası geçiş süresi

const getHairList = (gender) => {
  const list = [];
  if (gender === 'male') {
    list.push({ textureIndex: 0, type: 'bald', img: hairProduct1, label: 'Bald', basePath: null });
  }
  const cfg = HAIR_CONFIG[gender];
  if (!cfg) return list;

  for (let i = 1; i <= cfg.count; i++) {
    const idx = cfg.base + i;
    if (EXCLUDED_HAIR.has(idx)) continue;

    const num = String(i).padStart(2, '0');
    const base = `/models/hair/png/${cfg.prefix}_hair_${num}`;
    list.push({
      textureIndex: idx,
      type: 'hair',
      basePath: base,
      label: `${cfg.prefix.toUpperCase()}-Hair ${num}`,
    });
  }

  // Default saçı başa al
  const defIdx = DEFAULT_HAIR[gender];
  if (defIdx) {
    const pos = list.findIndex(h => h.textureIndex === defIdx);
    if (pos > 0) {
      const [item] = list.splice(pos, 1);
      const insertAt = gender === 'male' ? 1 : 0;
      list.splice(insertAt, 0, item);
    }
  }

  return list;
};

// ─────────────────────────────────────────────────────────────────────────────
// getAllHairList — CİNSİYETTEN BAĞIMSIZ tüm saç havuzu (male + female + child)
// Tüm cinsiyetlerin saçları tek listede. Bald sentinel başta tutulur.
// Görsel kategori filtresi (Short/Medium/Long/...) bu havuzun üstüne biner.
// ─────────────────────────────────────────────────────────────────────────────
const getAllHairList = () => {
  const list = [{ textureIndex: 0, type: 'bald', img: hairProduct1, label: 'Bald', basePath: null }];

  Object.values(HAIR_CONFIG).forEach((cfg) => {
    for (let i = 1; i <= cfg.count; i++) {
      const idx = cfg.base + i;
      if (EXCLUDED_HAIR.has(idx)) continue;
      const num = String(i).padStart(2, '0');
      const base = `/models/hair/png/${cfg.prefix}_hair_${num}`;
      list.push({
        textureIndex: idx,
        type: 'hair',
        basePath: base,
        label: `${cfg.prefix.toUpperCase()}-Hair ${num}`,
      });
    }
  });

  return list;
};

// Surprise Me / randomize için cinsiyete göre rastgele textureIndex
// ── EXCLUDED_HAIR'deki index'ler rastgele seçimden de çıkarılır ──
const getRandomHairTextureIndex = (g) => {
  const cfg = HAIR_CONFIG[g];
  if (!cfg) return 0;
  const validIndexes = g === 'male' ? [0] : []; // 0 = kel sadece male
  for (let i = 1; i <= cfg.count; i++) {
    const idx = cfg.base + i;
    if (!EXCLUDED_HAIR.has(idx)) validIndexes.push(idx);
  }
  return validIndexes[Math.floor(Math.random() * validIndexes.length)];
};

// ─────────────────────────────────────────────────────────────────────────────
// HairThumbnail — hover'da / mobilde long-press'te açı döndüren thumbnail
// ─────────────────────────────────────────────────────────────────────────────
const HairThumbnail = React.memo(({ item, isSelected, onClick, flexStyles, hairColorIndex }) => {
    const [angleIdx, setAngleIdx] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const intervalRef = useRef(null);
  const touchTimerRef = useRef(null);
  const isBald = item.type === 'bald';
  const hasAngles = !!item.basePath;

  // Açı döndürmeye başla
  const startRotation = useCallback(() => {
    if (!hasAngles) return;
    setIsRotating(true);
    setAngleIdx(0);
    intervalRef.current = setInterval(() => {
      setAngleIdx(prev => (prev + 1) % HAIR_ANGLES.length);
    }, HAIR_ANGLE_INTERVAL);
  }, [hasAngles]);

  // Açı döndürmeyi durdur
  const stopRotation = useCallback(() => {
    setIsRotating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    setAngleIdx(0);
  }, []);

  // Desktop hover
  const handleMouseEnter = useCallback(() => startRotation(), [startRotation]);
  const handleMouseLeave = useCallback(() => stopRotation(), [stopRotation]);

  // Mobil: long-press (300ms) ile döndür, bırakınca dur
  const handleTouchStart = useCallback((e) => {
    if (!hasAngles) return;
    touchTimerRef.current = setTimeout(() => {
      startRotation();
    }, 300);
  }, [hasAngles, startRotation]);

  const handleTouchEnd = useCallback((e) => {
    stopRotation();
  }, [stopRotation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  // Aktif görsel
  const isTers = TERS_YONLU_SACLAR.has(item.textureIndex);
const rawAngle = isRotating ? HAIR_ANGLES[angleIdx] : 'front';
const angle = isTers ? TERS_ACI[rawAngle] : rawAngle;
const currentImg = hasAngles
  ? `${item.basePath}_${angle}_${hairColorIndex}.png`
  : null;

  // Açı göstergesi (küçük dot'lar)
  const angleIndicator = hasAngles && isRotating && (
    <div
      style={{
        position: 'absolute',
        bottom: '3px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '3px',
        zIndex: 2,
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderRadius: '8px',
        padding: '2px 5px',
      }}
    >
      {HAIR_ANGLES.map((angle, i) => (
        <div
          key={angle}
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: i === angleIdx ? '#fff' : 'rgba(255,255,255,0.4)',
            transition: 'background-color 0.15s',
          }}
        />
      ))}
    </div>
  );

  // Açı etiketi (F/R/B/L)
  const angleLabel = hasAngles && isRotating && (
    <div
      style={{
        position: 'absolute',
        top: '3px',
        right: '3px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: '#fff',
        fontSize: '9px',
        fontWeight: 700,
        borderRadius: '4px',
        padding: '1px 4px',
        zIndex: 2,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      {HAIR_ANGLES[angleIdx].charAt(0)}
    </div>
  );

  if (isBald) {
    return (
      <button
        onClick={onClick}
        style={{
          ...flexStyles.flexCenter,
          backgroundColor: '#fff',
          borderRadius: '10px',
          padding: '4px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: isSelected ? '0 0 0 4px #16a34a, 0 0 12px rgba(22, 163, 74, 0.5)' : 'none',
          WebkitTransition: 'all 0.2s',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ ...flexStyles.flexColumn, ...flexStyles.flexCenter, width: '100%', height: '100%', borderRadius: '8px', backgroundColor: '#f5f5f5', minHeight: '40px' }}>
          <span style={{ fontWeight: 700, color: '#4b5563', fontSize: 'clamp(9px, 0.9vw, 11px)' }}>Bald</span>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        ...flexStyles.flexCenter,
        position: 'relative',
        backgroundColor: '#fff',
        borderRadius: '10px',
        padding: '4px',
        border: 'none',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: isSelected
          ? '0 0 0 4px #16a34a, 0 0 12px rgba(22, 163, 74, 0.5)'
          : isRotating
            ? '0 0 0 2px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.3)'
            : 'none',
        WebkitTransition: 'box-shadow 0.2s',
        transition: 'box-shadow 0.2s',
      }}
    >
<img
  src={currentImg}
  alt={item.label}
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  }}
  onError={(e) => { e.target.style.display = 'none'; }}
/>
      {angleIndicator}
      {angleLabel}
    </button>
  );
});
HairThumbnail.displayName = 'HairThumbnail';

// Torso sub-tab kategorileri — Scene en başta
const TORSO_CATEGORIES = [
  { key: 'scene',      label: 'Scene' },
  { key: 'basic',      label: 'Basic' },
  { key: 'everyday',   label: 'Everyday' },
  { key: 'formal',     label: 'Formal' },
  { key: 'roles',      label: 'Roles' },
  { key: 'activities', label: 'Activities' },
];

// Basic tab renk paleti — LEGO brand hex
const TORSO_BASIC_COLORS = [
  { key: 'white',  hex: '#F4F4F4' },
  { key: 'red',    hex: '#E31E24' },
  { key: 'blue',   hex: '#0055BF' },
  { key: 'green',  hex: '#237841' },
  { key: 'orange', hex: '#F57C1F' },
  { key: 'pink',   hex: '#EC4899' },
  { key: 'purple', hex: '#7B1FA2' },
  { key: 'gray',   hex: '#9E9E9E' },
  { key: 'black',  hex: '#1D1D1B' },
  { key: 'brown',  hex: '#6D4C41' },
];

// Path helper'ları
const torsoFrontUrl = (id) => `/models/torso/${id}/${id}.png`;
const torsoBackUrl  = (id) => `/models/torso/${id}/${id}_b.png`;

const TORSO_ITEMS_PER_PAGE = 16;
const TORSO_ROTATE_INTERVAL = 700;

// Normal kategori + scene filter
const getTorsoList = (manifest, gender, category, sceneId) => {
  if (!Array.isArray(manifest)) return [];

  // Cinsiyet IGNORE — rol/kategoriye göre listele, uniq id ile tekrar engelle
  const uniqById = (arr) => {
    const seen = new Set();
    return arr.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  };

  if (category === 'scene') {
    if (!sceneId) return [];
    return uniqById(manifest.filter(t =>
      Array.isArray(t.scene_ids) && t.scene_ids.includes(sceneId)
    ));
  }

  // Basic render'ı getBasicDesigns üzerinden yapılıyor, buradan boş döner
  if (category === 'basic') return [];

  return uniqById(manifest.filter(t => t.category === category));
};

// Basic tab için design-grouped: her design'ın color varyantları (cinsiyet IGNORE)
const getBasicDesigns = (manifest, gender) => {
  if (!Array.isArray(manifest)) return [];
  const filtered = manifest.filter(t =>
    t.category === 'basic' && t.design_key
  );
  const map = new Map();
  filtered.forEach(t => {
    if (!map.has(t.design_key)) {
      map.set(t.design_key, { design_key: t.design_key, variants: {} });
    }
    // İlk gelen color_name kazanır (varyant zaten id taşır)
    if (!(t.color_name in map.get(t.design_key).variants)) {
      map.get(t.design_key).variants[t.color_name] = t.id;
    }
  });
  return Array.from(map.values()).sort((a, b) => a.design_key.localeCompare(b.design_key));
};

// Tab'ın içinde item var mı (cinsiyet IGNORE)
const tabHasItems = (manifest, gender, categoryKey, sceneId) => {
  if (categoryKey === 'scene') {
    return !!sceneId && manifest.some(t =>
      Array.isArray(t.scene_ids) && t.scene_ids.includes(sceneId)
    );
  }
  if (categoryKey === 'basic') {
    return manifest.some(t =>
      t.category === 'basic' && t.design_key
    );
  }
  return manifest.some(t => t.category === categoryKey);
};

// ─────────────────────────────────────────────────────────────────────────────
// TorsoThumbnail — torsoId + label prop'u alır (design için de, normal için de)
// ─────────────────────────────────────────────────────────────────────────────
const TorsoThumbnail = React.memo(({ torsoId, label, isSelected, isDefault, onClick, flexStyles }) => {
  const [showBack, setShowBack] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const intervalRef = useRef(null);
  const touchTimerRef = useRef(null);

  const startRotation = useCallback(() => {
    if (isDefault) return;
    setIsRotating(true);
    setShowBack(false);
    intervalRef.current = setInterval(() => {
      setShowBack(prev => !prev);
    }, TORSO_ROTATE_INTERVAL);
  }, [isDefault]);

  const stopRotation = useCallback(() => {
    setIsRotating(false);
    setShowBack(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
  }, []);

  const handleTouchStart = useCallback(() => {
    if (isDefault) return;
    touchTimerRef.current = setTimeout(() => startRotation(), 300);
  }, [isDefault, startRotation]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  }, []);

  // torsoId değişince (renk değişimiyle de tetiklenir) açıyı sıfırla
  useEffect(() => { setShowBack(false); }, [torsoId]);

  if (isDefault) {
    return (
      <button
        onClick={onClick}
        style={{
          ...flexStyles.flexCenter,
          backgroundColor: '#fff',
          borderRadius: '10px',
          padding: '4px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: isSelected ? '0 0 0 4px #16a34a, 0 0 12px rgba(22, 163, 74, 0.5)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        <div style={{
          ...flexStyles.flexColumn, ...flexStyles.flexCenter,
          width: '100%', height: '100%', borderRadius: '8px',
          backgroundColor: '#f5f5f5', minHeight: '60px',
        }}>
          <span style={{ fontSize: 'clamp(24px, 2.5vw, 32px)' }}>👤</span>
          <span style={{
            fontWeight: 700, color: '#4b5563',
            fontSize: 'clamp(10px, 1vw, 12px)', marginTop: '4px',
          }}>Default</span>
        </div>
      </button>
    );
  }

  const imgUrl = showBack ? torsoBackUrl(torsoId) : torsoFrontUrl(torsoId);

  return (
    <button
      onClick={onClick}
      onMouseEnter={startRotation}
      onMouseLeave={stopRotation}
      onTouchStart={handleTouchStart}
      onTouchEnd={stopRotation}
      onTouchCancel={stopRotation}
      style={{
        ...flexStyles.flexCenter,
        position: 'relative',
        backgroundColor: '#fff',
        borderRadius: '10px',
        padding: '4px',
        border: 'none',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: isSelected
          ? '0 0 0 4px #16a34a, 0 0 12px rgba(22, 163, 74, 0.5)'
          : isRotating
            ? '0 0 0 2px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.3)'
            : 'none',
        transition: 'box-shadow 0.2s',
      }}
    >
      <img
        src={imgUrl}
        alt={label}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      {isRotating && (
        <div style={{
          position: 'absolute', top: '3px', right: '3px',
          backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: '9px', fontWeight: 700, borderRadius: '4px',
          padding: '1px 4px', zIndex: 2, letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          {showBack ? 'B' : 'F'}
        </div>
      )}
    </button>
  );
});
TorsoThumbnail.displayName = 'TorsoThumbnail';
// ─────────────────────────────────────────────────────────────────────────────
// HScrollIndicator — yatay scroll için soft underline slider
// ─────────────────────────────────────────────────────────────────────────────
const HScrollIndicator = ({ scrollRef }) => {
  const [st, setSt] = useState({ visible: false, thumbWidth: 0, thumbLeft: 0, trackWidth: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const trackWidth = Math.max(0, clientWidth - 4);
      if (scrollWidth <= clientWidth + 1) {
        setSt(s => s.visible ? { ...s, visible: false } : s);
        return;
      }
      const thumbWidth = Math.max(20, trackWidth * (clientWidth / scrollWidth));
      const maxThumbLeft = trackWidth - thumbWidth;
      const scrollRatio = scrollLeft / Math.max(1, scrollWidth - clientWidth);
      const thumbLeft = scrollRatio * maxThumbLeft;
      setSt({ visible: true, thumbWidth, thumbLeft, trackWidth });
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [scrollRef]);

  if (!st.visible) return null;

  return (
    <>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 2,
        width: st.trackWidth,
        height: '2px',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: '2px',
        pointerEvents: 'none',
        zIndex: 5,
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: `${2 + st.thumbLeft}px`,
        width: `${st.thumbWidth}px`,
        height: '2px',
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: '2px',
        pointerEvents: 'none',
        transition: 'left 0.12s, width 0.12s',
        zIndex: 5,
      }} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EdgeFade — yatay scroll'da SADECE kesik gözüken kenarda hafif gölge/fade
// İçerik sağa taşıyorsa sağda, sola taşıyorsa solda fade gösterir.
// Sona/başa ulaşınca o kenardaki fade kaybolur.
// ─────────────────────────────────────────────────────────────────────────────
const EdgeFade = ({ scrollRef, color = '#ddd', width = 28 }) => {
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const overflowing = scrollWidth > clientWidth + 1;
      setEdges({
        left: overflowing && scrollLeft > 2,
        right: overflowing && scrollLeft < scrollWidth - clientWidth - 2,
      });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [scrollRef]);

  const toRGBA = (hex, a) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  return (
    <>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: `${width}px`,
        background: `linear-gradient(to right, ${toRGBA(color, 0.9)}, ${toRGBA(color, 0)})`,
        pointerEvents: 'none', zIndex: 6,
        opacity: edges.left ? 1 : 0,
        transition: 'opacity 0.15s',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0,
        width: `${width}px`,
        background: `linear-gradient(to left, ${toRGBA(color, 0.9)}, ${toRGBA(color, 0)})`,
        pointerEvents: 'none', zIndex: 6,
        opacity: edges.right ? 1 : 0,
        transition: 'opacity 0.15s',
      }} />
    </>
  );
};
// ─────────────────────────────────────────────────────────────────────────────
// Legs — torso basic pattern'iyle birebir (design_key + color_name)
// ─────────────────────────────────────────────────────────────────────────────
const LEGS_BASIC_COLORS = TORSO_BASIC_COLORS; // 10 LEGO rengi birebir aynı

const legsFrontUrl = (id) => `/models/legs/${id}/${id}.png`;
const legsBackUrl  = (id) => `/models/legs/${id}/${id}_b.png`;

// Design-grouped legs listesi (Basic design pattern)
const getLegsDesigns = (manifest, gender) => {
  if (!Array.isArray(manifest)) return [];
  const filtered = manifest.filter(l =>
    l.genders.includes(gender) && l.design_key
  );
  const map = new Map();
  filtered.forEach(l => {
    if (!map.has(l.design_key)) {
      map.set(l.design_key, { design_key: l.design_key, variants: {} });
    }
    map.get(l.design_key).variants[l.color_name] = l.id;
  });
  return Array.from(map.values()).sort((a, b) => a.design_key.localeCompare(b.design_key));
};

// ─────────────────────────────────────────────────────────────────────────────
// LegsThumbnail — torso ile aynı mantık (hover/long-press ile front↔back)
// ─────────────────────────────────────────────────────────────────────────────
const LegsThumbnail = React.memo(({ legsId, label, isSelected, isDefault, onClick, flexStyles }) => {
  const [showBack, setShowBack] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const intervalRef = useRef(null);
  const touchTimerRef = useRef(null);

  const startRotation = useCallback(() => {
    if (isDefault) return;
    setIsRotating(true);
    setShowBack(false);
    intervalRef.current = setInterval(() => setShowBack(p => !p), TORSO_ROTATE_INTERVAL);
  }, [isDefault]);

  const stopRotation = useCallback(() => {
    setIsRotating(false);
    setShowBack(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
  }, []);

  const handleTouchStart = useCallback(() => {
    if (isDefault) return;
    touchTimerRef.current = setTimeout(() => startRotation(), 300);
  }, [isDefault, startRotation]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  }, []);

  useEffect(() => { setShowBack(false); }, [legsId]);

  if (isDefault) {
    return (
      <button onClick={onClick} style={{
        ...flexStyles.flexCenter,
        backgroundColor: '#fff', borderRadius: '10px', padding: '4px', border: 'none', cursor: 'pointer',
        boxShadow: isSelected ? '0 0 0 4px #16a34a, 0 0 12px rgba(22, 163, 74, 0.5)' : 'none',
        transition: 'all 0.2s',
      }}>
        <div style={{
          ...flexStyles.flexColumn, ...flexStyles.flexCenter,
          width: '100%', height: '100%', borderRadius: '8px',
          backgroundColor: '#f5f5f5', minHeight: '60px',
        }}>
          <span style={{ fontSize: 'clamp(24px, 2.5vw, 32px)' }}>👖</span>
          <span style={{ fontWeight: 700, color: '#4b5563', fontSize: 'clamp(10px, 1vw, 12px)', marginTop: '4px' }}>Default</span>
        </div>
      </button>
    );
  }

  const imgUrl = showBack ? legsBackUrl(legsId) : legsFrontUrl(legsId);
  return (
    <button
      onClick={onClick}
      onMouseEnter={startRotation}
      onMouseLeave={stopRotation}
      onTouchStart={handleTouchStart}
      onTouchEnd={stopRotation}
      onTouchCancel={stopRotation}
      style={{
        ...flexStyles.flexCenter,
        position: 'relative',
        backgroundColor: '#fff', borderRadius: '10px', padding: '4px', border: 'none', cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: isSelected
          ? '0 0 0 4px #16a34a, 0 0 12px rgba(22, 163, 74, 0.5)'
          : isRotating ? '0 0 0 2px #3b82f6, 0 0 8px rgba(59, 130, 246, 0.3)' : 'none',
        transition: 'box-shadow 0.2s',
      }}
    >
      <img src={imgUrl} alt={label}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      {isRotating && (
        <div style={{
          position: 'absolute', top: '3px', right: '3px',
          backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: '9px', fontWeight: 700, borderRadius: '4px',
          padding: '1px 4px', zIndex: 2, letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          {showBack ? 'B' : 'F'}
        </div>
      )}
    </button>
  );
});
LegsThumbnail.displayName = 'LegsThumbnail';

// ============================================================
// Gender-based model yapılandırması
// prefix: dosya adı öneki, folder: glb klasörü, pngFolder: thumbnail klasörü
// count: normal dosya sayısı, extras: özel dosyalar (wrinkles vb.)
// ============================================================
const MODEL_CONFIG = {
  eyes: {
    male: {
      prefix: 'm_head_eye',
      folder: 'eyes/m_head_eye_glb',
      pngFolder: 'eyes/m_head_eye_png',
      count: 12,
      extras: [{ suffix: '13_(wrinkles)', label: 'Wrinkles' }],
    },
    female: {
      prefix: 'f_head_eye',
      folder: 'eyes/f_head_eye_glb',
      pngFolder: 'eyes/f_head_eye_png',
      count: 1,
    },
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
    male: {
      prefix: 'm_head_eye_glasses',
      folder: 'eyes/m_head_eye_glasses_glb',
      pngFolder: 'eyes/m_head_eye_glasses_png',
      count: 14,
    },
    female: {
      prefix: 'f_head_eye_glasses',
      folder: 'eyes/f_head_eye_glasses_glb',
      pngFolder: 'eyes/f_head_eye_glasses_png',
      count: 14,
    },
    child: {
      prefix: 'c_head_eye_glasses',
      folder: 'eyes/c_head_eye_glasses_glb',
      pngFolder: 'eyes/c_head_eye_glasses_png',
      count: 14,
    },
  },
  mouth: {
    male: {
      prefix: 'm_head_mouth',
      folder: 'mouth/m_head_mouth_glb',
      pngFolder: 'mouth/m_head_mouth_png',
      count: 18,
    },
    female: {
      prefix: 'f_head_mouth',
      folder: 'mouth/f_head_mouth_glb',
      pngFolder: 'mouth/f_head_mouth_png',
      count: 18,
    },
    child: {
      prefix: 'c_head_mouth',
      folder: 'mouth/c_head_mouth_glb',
      pngFolder: 'mouth/c_head_mouth_png',
      count: 19,
    },
  },
  facialhair: {
    male: {
      prefix: 'm_head_mouth_facialhair',
      folder: 'mouth/m_head_mouth_facialhair_glb',
      pngFolder: 'mouth/m_head_mouth_facialhair_png',
      count: 13,
    },
  },
};

// Label prefixi
const CATEGORY_LABELS = { eyes: 'Eyes', glasses: 'Glasses', mouth: 'Mouth', facialhair: 'Facial Hair' };

// Gender + category'ye göre seçenek listesi üret
const generateItems = (gender, category) => {
  const config = MODEL_CONFIG[category]?.[gender];
  if (!config || config.count === 0) {
    return [{ type: 'default', img: null, label: 'Default', modelName: null }];
  }

  const label = CATEGORY_LABELS[category];
  const items = [{ type: 'default', img: null, label: 'Default', modelName: null }];

  for (let i = 1; i <= config.count; i++) {
    const num = String(i).padStart(2, '0');
    const thumbPath = `/models/face/${config.pngFolder}/${config.prefix}${num}.png`;
    
    items.push({
      type: category,
      img: thumbPath,
      label: `${label} ${i}`,
      modelName: `${config.folder}/${config.prefix}${num}`,
    });
  }

  if (config.extras) {
    config.extras.forEach((extra, idx) => {
      const thumbPath = `/models/face/${config.pngFolder}/${config.prefix}${extra.suffix}.png`;
      
      items.push({
        type: category,
        img: thumbPath,
        label: extra.label,
        modelName: `${config.folder}/${config.prefix}${extra.suffix}`,
      });
    });
  }

  return items;
};

// 5x4 grid = 20 item per page
const ITEMS_PER_PAGE = 20;

// Saç rengi index → kaş rengi eşlemesi
const HAIR_TO_EYEBROW = {
  0: '#000000',  // Kahverengi 1 → Siyah
  1: '#834400',  // Kahverengi 2 → Açık Kahve
  2: '#834400',  // Sarı → Açık Kahve
  3: '#000000',  // Siyah → Siyah
  4: '#A8A8A8',  // Gri → Gri
  5: '#F4F4F4',  // Beyaz → Beyaz
  6: '#CC4422',  // Kızıl → Kızıl
};

// Safari-safe flex styles
const flexStyles = {
  flexCenter: {
    display: 'flex',
    WebkitDisplay: '-webkit-flex',
    WebkitBoxAlign: 'center',
    WebkitAlignItems: 'center',
    alignItems: 'center',
    WebkitBoxPack: 'center',
    WebkitJustifyContent: 'center',
    justifyContent: 'center'
  },
  flexColumn: {
    display: 'flex',
    WebkitDisplay: '-webkit-flex',
    WebkitBoxOrient: 'vertical',
    WebkitBoxDirection: 'normal',
    WebkitFlexDirection: 'column',
    flexDirection: 'column'
  },
  flexBetween: {
    display: 'flex',
    WebkitDisplay: '-webkit-flex',
    WebkitBoxAlign: 'center',
    WebkitAlignItems: 'center',
    alignItems: 'center',
    WebkitBoxPack: 'justify',
    WebkitJustifyContent: 'space-between',
    justifyContent: 'space-between'
  },
  flex1: {
    WebkitBoxFlex: 1,
    WebkitFlex: '1 1 0%',
    flex: '1 1 0%',
    minHeight: 0,
    WebkitMinHeight: 0
  },
  flexShrink0: {
    WebkitFlexShrink: 0,
    flexShrink: 0
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FaceColorPanel — Kaş, Göz iris, Gözlük renk seçim paneli
// ─────────────────────────────────────────────────────────────────────────────
const FaceColorPanel = React.memo(({ 
  eyebrowColor, eyeColor, glassesColor, 
  hasGlasses, hasEyebrows, gender,
  onEyebrowColorChange, onEyeColorChange, onGlassesColorChange,
  onClose 
}) => {
  // SVG ikonlar
  const EyebrowIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12C6 8 10 7 14 8C16 8.5 18 9.5 20 12" stroke={eyebrowColor || '#333'} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  );

  const EyeIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="12" rx="8" ry="5" stroke="#333" strokeWidth="1.5" fill="white"/>
      <circle cx="12" cy="12" r="3" fill={eyeColor || '#000'}/>
      <circle cx="13" cy="11" r="1" fill="white"/>
    </svg>
  );

  const GlassesIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="12" r="4" stroke={glassesColor || '#333'} strokeWidth="2" fill="none"/>
      <circle cx="17" cy="12" r="4" stroke={glassesColor || '#333'} strokeWidth="2" fill="none"/>
      <path d="M11 12H13" stroke={glassesColor || '#333'} strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 12H3.5" stroke={glassesColor || '#333'} strokeWidth="2" strokeLinecap="round"/>
      <path d="M20.5 12H21" stroke={glassesColor || '#333'} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  const renderColorRow = (label, icon, colors, selectedColor, onChange) => (
    <div style={{
      display: 'flex',
      WebkitDisplay: '-webkit-flex',
      alignItems: 'center',
      gap: 'clamp(6px, 0.8vw, 10px)',
      padding: 'clamp(4px, 0.5vh, 8px) 0',
    }}>
      {/* İkon */}
      <div style={{
        ...flexStyles.flexCenter,
        width: 'clamp(32px, 3vw, 40px)',
        height: 'clamp(32px, 3vw, 40px)',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '2px solid #e0e0e0',
        ...flexStyles.flexShrink0,
      }}>
        {icon}
      </div>

      {/* Renk seçenekleri */}
      <div style={{
        display: 'flex',
        WebkitDisplay: '-webkit-flex',
        flexWrap: 'wrap',
        gap: 'clamp(3px, 0.4vw, 5px)',
        alignItems: 'center',
      }}>
        {colors.map((color, i) => {
          const isSelected = selectedColor === color;
          const displayColor = color || '#888';
          return (
            <button
              key={i}
              onClick={() => onChange(color)}
              style={{
                width: 'clamp(20px, 2.2vw, 28px)',
                height: 'clamp(20px, 2.2vw, 28px)',
                borderRadius: '50%',
                border: isSelected ? '3px solid #16a34a' : '2px solid #bbb',
                backgroundColor: displayColor,
                cursor: 'pointer',
                padding: 0,
                boxShadow: isSelected ? '0 0 6px rgba(22,163,74,0.5)' : 'none',
                position: 'relative',
                transition: 'all 0.15s',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
              }}
              title={color ? color : 'Default'}
            >
              {!color && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 'clamp(12px, 1.2vw, 16px)',
                  color: '#fff',
                  fontWeight: 700,
                  lineHeight: 1,
                }}>⊘</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
      backgroundColor: '#f0f0f0',
      ...flexStyles.flexColumn,
      overflow: 'hidden',
    }}>
      {/* Panel Header */}
      <div style={{
        ...flexStyles.flexBetween,
        ...flexStyles.flexShrink0,
        padding: 'clamp(6px, 0.8vh, 10px) clamp(12px, 1.2vw, 16px)',
        backgroundColor: '#ddd',
        borderBottom: '2px solid #ccc',
      }}>
         <div style={{ ...flexStyles.flexColumn }}>
          <span style={{
            fontWeight: 800,
            fontSize: 'clamp(12px, 1.2vw, 15px)',
            color: '#333',
          }}>
            Customize Your Mini
          </span>
          <span style={{
            fontWeight: 500,
            fontSize: 'clamp(9px, 0.9vw, 11px)',
            color: '#666',
          }}>
            Choose colors that feel right for your Mini.
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            ...flexStyles.flexCenter,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2px solid #999',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 700,
            color: '#666',
            transition: 'all 0.2s',
          }}
        >
          ✕
        </button>
      </div>

      {/* Renk satırları */}
      <div style={{
        ...flexStyles.flex1,
        ...flexStyles.flexColumn,
        justifyContent: 'center',
        padding: 'clamp(8px, 1vh, 16px) clamp(12px, 1.5vw, 20px)',
        gap: 'clamp(6px, 1vh, 12px)',
        overflow: 'auto',
      }}>
        {/* Kaş Rengi */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: 'clamp(6px, 0.8vh, 10px) clamp(8px, 1vw, 14px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            fontSize: 'clamp(10px, 1vw, 12px)',
            fontWeight: 700,
            color: '#666',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
                       {gender === 'male' ? 'Brows & Beard' : gender === 'female' ? 'Brows & Lashes' : 'Brows'}
          </div>
          {renderColorRow('Kaş', <EyebrowIcon />, eyebrowColors, eyebrowColor, onEyebrowColorChange)}
        </div>

        {/* Göz Rengi */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: 'clamp(6px, 0.8vh, 10px) clamp(8px, 1vw, 14px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            fontSize: 'clamp(10px, 1vw, 12px)',
            fontWeight: 700,
            color: '#666',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Eyes
          </div>
          {renderColorRow('Göz', <EyeIcon />, eyeColors, eyeColor, onEyeColorChange)}
        </div>

        {/* Gözlük Rengi - sadece gözlük seçiliyse göster */}
        <div style={{
          backgroundColor: hasGlasses ? '#fff' : '#f5f5f5',
          borderRadius: '12px',
          padding: 'clamp(6px, 0.8vh, 10px) clamp(8px, 1vw, 14px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          opacity: hasGlasses ? 1 : 0.5,
          transition: 'opacity 0.2s',
        }}>
          <div style={{
            fontSize: 'clamp(10px, 1vw, 12px)',
            fontWeight: 700,
            color: '#666',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Glasses {!hasGlasses && <span style={{ fontSize: '9px', color: '#999' }}>(select glasses first)</span>}
          </div>
          {renderColorRow('Gözlük', <GlassesIcon />, glassesColors, glassesColor, 
            hasGlasses ? onGlassesColorChange : () => {}
          )}
        </div>
      </div>
    </div>
  );
});
FaceColorPanel.displayName = 'FaceColorPanel';

const getRandomHairTextureIndexFiltered = (g, type) => {
  const cfg = HAIR_CONFIG[g];
  if (!cfg) return 0;

  const validIndexes = (type === 'simple' && g === 'male') ? [0] : [];
  for (let i = 1; i <= cfg.count; i++) {
    const idx = cfg.base + i;
    if (EXCLUDED_HAIR.has(idx)) continue;
    const isExpressive = EXPRESSIVE_HAIR.has(idx);
    if (type === 'expressive' && isExpressive) validIndexes.push(idx);
    if (type === 'simple' && !isExpressive) validIndexes.push(idx);
  }

  if (validIndexes.length === 0) return 0;
  return validIndexes[Math.floor(Math.random() * validIndexes.length)];
};


const CharacterCustomizationPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Safari viewport fix
  useSafariViewportFix();

  // ── Mobil/landscape responsive flag (GamePage ile aynı breakpoint mantığı) ──
  // mobile: w<=740 || h<=440 ; tablet-small: w<=1024 || h<=600 ; isSmallScreen = OR
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const checkScreen = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mobile = w <= 740 || h <= 440;
      const tabletSmall = w <= 1024 || h <= 600;
      setIsSmallScreen(mobile || tabletSmall);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    window.addEventListener('orientationchange', checkScreen);
    return () => {
      window.removeEventListener('resize', checkScreen);
      window.removeEventListener('orientationchange', checkScreen);
    };
  }, []);

  // Mobilde grid 4x2 = 8 item/sayfa; desktop'ta orijinal değerler
  const ITEMS_PER_PAGE_RESP = isSmallScreen ? 8 : ITEMS_PER_PAGE;
  const TORSO_ITEMS_PER_PAGE_RESP = isSmallScreen ? 8 : TORSO_ITEMS_PER_PAGE;

  const [selectedMini, setSelectedMini] = useState(null);
  const [activeMiniIndex, setActiveMiniIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  // Screenshot için yeni state'ler
  const [isSaving, setIsSaving] = useState(false);
  const [savingStep, setSavingStep] = useState('');

  // Head kategorisi - Sub-tab ve pagination
  const [eyeSubTab, setEyeSubTab] = useState('eyes');
  const [mouthSubTab, setMouthSubTab] = useState('mouth');
  const [eyePage, setEyePage] = useState(0);
  const [glassesPage, setGlassesPage] = useState(0);
  const [mouthPage, setMouthPage] = useState(0);
  const [facialHairPage, setFacialHairPage] = useState(0);

  // Face Color Panel state
  const [showFaceColorPanel, setShowFaceColorPanel] = useState(false);
  // Mobil hair renk dropdown'u (aşağı açılan skala)
  const [showHairColorDrop, setShowHairColorDrop] = useState(false);
  // Mobil torso renk dropdown'u (sağdan açılan skala)
  const [showTorsoColorDrop, setShowTorsoColorDrop] = useState(false);

    const [customizations, setCustomizations] = useState([
    { gender: 'female', eyeGender: 'female', mouthGender: 'female', hairType: 'simple', hairColor: 0, hairTextureIndex: 109, hairUserSelected: false, torsoTextureId: null, legTextureId: null, eyeTextureIndex: 0, glassesTextureIndex: 0, mouthTextureIndex: 0, facialHairTextureIndex: 0, eyeColor: '#000000', eyebrowColor: '#000000', glassesColor: '#1C1C1C', view: 'front' },
      { gender: 'female', eyeGender: 'female', mouthGender: 'female', hairType: 'simple', hairColor: 0, hairTextureIndex: 109, hairUserSelected: false, torsoTextureId: null, legTextureId: null, eyeTextureIndex: 0, glassesTextureIndex: 0, mouthTextureIndex: 0, facialHairTextureIndex: 0, eyeColor: '#000000', eyebrowColor: '#000000', glassesColor: '#1C1C1C', view: 'front' },  
  ]);

   const customizationsRef = useRef(customizations);
  useEffect(() => { customizationsRef.current = customizations; }, [customizations]);
    const [activeCategory, setActiveCategory] = useState('hair');

  // Saç kategori sekmesi (Short/Medium/Long/Tied/Curly/Fun/Bun) — yalnızca görsel
  const [hairCategory, setHairCategory] = useState('short');

  const [saveHover, setSaveHover] = useState(false);
  const [resetHover, setResetHover] = useState(false);
  const [surpriseHover, setSurpriseHover] = useState(false);
const [warningType, setWarningType] = useState(null); // 'both' | 'mini2' | null

// Torso manifest + sub-tab + pagination + aktif scene + basic renk
  const [torsoManifest, setTorsoManifest] = useState([]);
  const [torsoCategoryTab, setTorsoCategoryTab] = useState('scene');
  const [torsoPage, setTorsoPage] = useState(0);
  const [currentSceneId, setCurrentSceneId] = useState(null);
  const [torsoTabInitialized, setTorsoTabInitialized] = useState(false);
  const [torsoBasicColor, setTorsoBasicColor] = useState('white');

  // Legs manifest + renk state
  const [legsManifest, setLegsManifest] = useState([]);
  const [legsBasicColor, setLegsBasicColor] = useState('black');
  const legsScrollRef = useRef(null);
      const tabScrollRef = useRef(null);
  const colorScrollRef = useRef(null);
  const hairCatScrollRef = useRef(null);
  const eyeSliderRef = useRef(null);
  const mouthSliderRef = useRef(null);
  // Popup buton hover state'leri
    const [customizeHover, setCustomizeHover] = useState(false);
  const [useReadyHover, setUseReadyHover] = useState(false);
  const [popupSurpriseHover, setPopupSurpriseHover] = useState(false);

  const activeCustomization = customizations[activeMiniIndex];
const { gender, hairType, hairColor, hairTextureIndex, torsoTextureId, legTextureId, eyeTextureIndex, glassesTextureIndex, mouthTextureIndex, facialHairTextureIndex, eyeColor, eyebrowColor, glassesColor, view } = activeCustomization;
  // Eye/Mouth bağımsız gender (yoksa ana gender'a düş)
  const eyeGender = activeCustomization.eyeGender || gender;
  const mouthGender = activeCustomization.mouthGender || gender;
  // Göz/gözlük eyeGender'a, ağız/sakal mouthGender'a göre — birbirinden bağımsız
  const eyeItems = useMemo(() => generateItems(eyeGender, 'eyes'), [eyeGender]);
  const glassesItems = useMemo(() => generateItems(eyeGender, 'glasses'), [eyeGender]);
  const mouthItems = useMemo(() => generateItems(mouthGender, 'mouth'), [mouthGender]);
  const facialHairItems = useMemo(() => generateItems(mouthGender, 'facialhair'), [mouthGender]);

  // Saç listesi — CİNSİYETTEN BAĞIMSIZ tüm havuz (male + female + child)
  const hairItems = useMemo(() => getAllHairList(), []);

  // Kategori filtresi + sıralama (görsel). Simple/Expressive arka planda kayıt
  // için durur (hairType state + EXPRESSIVE_HAIR), ama listeyi ARTIK süzmez.
  const filteredHairItems = useMemo(() => {
    // Seçili kategoriye göre süz (gender-agnostic — globalId bazlı)
    const inCat = hairItems.filter(h =>
      h.type !== 'bald' && getHairCategory(h.textureIndex) === hairCategory
    );

    // Kategori-içi görsel sıraya göre diz (eşitlikte globalId tie-break)
    inCat.sort((a, b) => {
      const oa = getHairOrder(a.textureIndex);
      const ob = getHairOrder(b.textureIndex);
      return oa !== ob ? oa - ob : a.textureIndex - b.textureIndex;
    });

    // Bald sentinel'i gridin başında tut
    const bald = hairItems.find(h => h.type === 'bald');
    return bald ? [bald, ...inCat] : inCat;
  }, [hairItems, hairCategory]);

  const hairTotalPages = Math.ceil(filteredHairItems.length / ITEMS_PER_PAGE_RESP);
  

  // Seçili saç hangi kategorideyse pill bar onu göstersin (gender/saç değişince senkron)
  useEffect(() => {
    const cat = getHairCategory(hairTextureIndex);
    if (cat && cat !== hairCategory) setHairCategory(cat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hairTextureIndex]);

  // ← BURAYA EKLE
  useEffect(() => {
    const idx = filteredHairItems.findIndex(h => h.textureIndex === hairTextureIndex);
    if (idx >= 0) {
      setCurrentPage(Math.floor(idx / ITEMS_PER_PAGE_RESP));
    }
  }, [hairTextureIndex, filteredHairItems]);
  // Facial hair sadece male'de var
  const hasFacialHair = facialHairItems.length > 1;

  // Gender değişince index'leri ve sub-tab'ları resetle
  const prevEyeGenderRef = React.useRef(eyeGender);
  const prevMouthGenderRef = React.useRef(mouthGender);
  // Facial Hair tik'i male'e geçirdiğinde, gender-değişim effect'i sub-tab'ı ezmesin diye işaret
  const facialHairIntentRef = React.useRef(false);
  const prevMiniIndexRef = React.useRef(activeMiniIndex);
  useEffect(() => {
    const miniChanged = prevMiniIndexRef.current !== activeMiniIndex;
    prevMiniIndexRef.current = activeMiniIndex;
    
    if (miniChanged) {
      prevEyeGenderRef.current = eyeGender;
      prevMouthGenderRef.current = mouthGender;
      
      if (glassesTextureIndex > 0) {
        setEyeSubTab('glasses');
      } else {
        setEyeSubTab('eyes');
      }
      
      if (facialHairTextureIndex > 0 && hasFacialHair) {
        setMouthSubTab('facialhair');
      } else {
        setMouthSubTab('mouth');
      }
      
      setEyePage(0);
      setGlassesPage(0);
      setMouthPage(0);
      setFacialHairPage(0);
      setShowFaceColorPanel(false);
      return;
    }

    // eyeGender değişti → sadece göz/gözlük sıfırla
    if (prevEyeGenderRef.current !== eyeGender) {
      prevEyeGenderRef.current = eyeGender;
      // Glasses tik açıksa o moda devam et (yeni gender'ın gözlükleri); değilse normal göze dön
      if (eyeSubTab === 'glasses') {
        updateCustomization({ glassesTextureIndex: 0, glassesColor: '#1C1C1C' });
        setGlassesPage(0);
        // eyeSubTab 'glasses' kalır
      } else {
        updateCustomization({ eyeTextureIndex: 0, glassesTextureIndex: 0, glassesColor: '#1C1C1C' });
        setEyePage(0);
        setGlassesPage(0);
        setEyeSubTab('eyes');
      }
      setShowFaceColorPanel(false);
    }

    // mouthGender değişti → sadece ağız/sakal sıfırla
    if (prevMouthGenderRef.current !== mouthGender) {
      prevMouthGenderRef.current = mouthGender;
      updateCustomization({ mouthTextureIndex: 0, facialHairTextureIndex: 0 });
      setMouthPage(0);
      setFacialHairPage(0);
      // Facial Hair tik'i male'e geçirdiyse mouth sub-tab'ını facialhair'da bırak
      if (facialHairIntentRef.current) {
        setMouthSubTab('facialhair');
        facialHairIntentRef.current = false;
      } else {
        setMouthSubTab('mouth');
      }
    }
  }, [eyeGender, mouthGender, activeMiniIndex, glassesTextureIndex, facialHairTextureIndex, hasFacialHair, eyeSubTab]);

  // Kategori değişince face color paneli kapat
  useEffect(() => {
    setShowFaceColorPanel(false);
    setShowHairColorDrop(false);
    setShowTorsoColorDrop(false);
  }, [activeCategory]);

  // Aktif göz/ağız modelini belirle
  const activeEyeModelName = useMemo(() => {
    if (eyeSubTab === 'glasses') {
      if (glassesTextureIndex > 0 && glassesItems[glassesTextureIndex]?.modelName) return glassesItems[glassesTextureIndex].modelName;
      return null;
    }
    if (eyeTextureIndex > 0 && eyeItems[eyeTextureIndex]?.modelName) return eyeItems[eyeTextureIndex].modelName;
    return null;
  }, [eyeSubTab, eyeTextureIndex, glassesTextureIndex, eyeItems, glassesItems]);

  const activeMouthModelName = useMemo(() => {
    if (mouthSubTab === 'facialhair') {
      if (facialHairTextureIndex > 0 && facialHairItems[facialHairTextureIndex]?.modelName) return facialHairItems[facialHairTextureIndex].modelName;
      return null;
    }
    if (mouthTextureIndex > 0 && mouthItems[mouthTextureIndex]?.modelName) return mouthItems[mouthTextureIndex].modelName;
    return null;
  }, [mouthSubTab, mouthTextureIndex, facialHairTextureIndex, mouthItems, facialHairItems]);

    const currentHairItems = filteredHairItems.slice(
    currentPage * ITEMS_PER_PAGE_RESP,
    (currentPage + 1) * ITEMS_PER_PAGE_RESP
  );

  const updateCustomization = (changes) => {
    setCustomizations((prev) => {
      const clone = [...prev];
      clone[activeMiniIndex] = { ...clone[activeMiniIndex], ...changes };
      return clone;
    });
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : hairTotalPages - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => (prev < hairTotalPages - 1 ? prev + 1 : 0));
  };

  const goToPage = (pageIndex) => {
    setCurrentPage(pageIndex);
  };

   // Torso manifest + aktif scene_id'yi mount olunca bir kez yükle
useEffect(() => {
    fetch('/models/torso/torso-manifest.json')
      .then(r => r.json())
      .then(data => setTorsoManifest(Array.isArray(data) ? data : []))
      .catch(err => console.error('Torso manifest load failed:', err));

    fetch('/models/legs/legs-manifest.json')
      .then(r => r.json())
      .then(data => setLegsManifest(Array.isArray(data) ? data : []))
      .catch(err => console.error('Legs manifest load failed:', err));

    // currentScene'den scene_id çek (SceneSelectionPage set ediyor)
    const sceneData = sessionStorage.getItem('currentScene');
    if (sceneData) {
      try {
        const parsed = JSON.parse(sceneData);
        if (typeof parsed.scene_id === 'number') setCurrentSceneId(parsed.scene_id);
      } catch (e) {}
    }
  }, []);

  // Manifest + scene_id hazır olunca default tab: scene varsa 'scene', yoksa 'basic' (bir kez)
  useEffect(() => {
    if (torsoTabInitialized) return;
    if (torsoManifest.length === 0) return;
    const hasSceneTorsos = tabHasItems(torsoManifest, gender, 'scene', currentSceneId);
    setTorsoCategoryTab(hasSceneTorsos ? 'scene' : 'basic');
    setTorsoTabInitialized(true);
  }, [torsoManifest, currentSceneId, gender, torsoTabInitialized]);

  // Gender veya kategori değişince torso sayfasını sıfırla
   // Gender veya kategori değişince torso sayfasını sıfırla
  useEffect(() => {
    setTorsoPage(0);
  }, [gender, torsoCategoryTab]);

// Seçili torsoTextureId Basic ise rengi paletten sync et
  useEffect(() => {
    if (!torsoTextureId || torsoManifest.length === 0) return;
    const entry = torsoManifest.find(t => t.id === torsoTextureId);
    if (entry?.category === 'basic' && entry.color_name) {
      setTorsoBasicColor(entry.color_name);
    }
  }, [torsoTextureId, torsoManifest]);

  // Seçili legTextureId varsa rengi paletten sync et
  useEffect(() => {
    if (!legTextureId || legsManifest.length === 0) return;
    const entry = legsManifest.find(l => l.id === legTextureId);
    if (entry?.color_name) {
      setLegsBasicColor(entry.color_name);
    }
  }, [legTextureId, legsManifest]);

  useEffect(() => {
    const sceneData = sessionStorage.getItem('currentScene');
    if (!sceneData) {
      alert('Please select a scene first!');
      navigate('/scene-selection');
      return;
    }

    const miniData = sessionStorage.getItem('selectedMini');
    if (miniData) {
      setSelectedMini(JSON.parse(miniData));
    } else if (user) {
      if (user.role === 'builder') {
        const builderMini = {
          builder_id: user.user_id,
          mini_name: user.profile?.full_name || 'Builder',
          is_builder: true,
        };
        setSelectedMini(builderMini);
        sessionStorage.setItem('selectedMini', JSON.stringify(builderMini));
      } else {
        const miniInfo = {
          mini_id: user.user_id,
          mini_name: user.profile?.mini_name || user.profile?.full_name || 'Mini',
          is_parent: user.role === 'parent',
        };
        setSelectedMini(miniInfo);
        sessionStorage.setItem('selectedMini', JSON.stringify(miniInfo));
      }
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  // Canvas'tan screenshot al
  const captureScreenshot = useCallback(() => {
    const canvas = document.querySelector('#lego-figure-canvas canvas');
    if (!canvas) {
      console.error('Canvas not found');
      return null;
    }
    try {
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    }
  }, []);

    const isDefaultCustomization = (index) => {
    const custom = customizations[index];
    return (
      custom.hairTextureIndex === DEFAULT_HAIR[custom.gender] &&
      custom.hairColor === 0 &&
      custom.hairType === 'simple' &&
      custom.gender === 'female' &&
       !custom.torsoTextureId &&
      !custom.legTextureId &&
      custom.eyeTextureIndex === 0 &&
      custom.glassesTextureIndex === 0 &&
      custom.mouthTextureIndex === 0 &&
      custom.facialHairTextureIndex === 0 &&
      custom.eyebrowColor === '#000000' &&
      custom.glassesColor === '#1C1C1C' &&
      custom.eyeColor === '#000000'
    );
  };

  const randomizeCustomization = (index) => {
    const genders = ['female', 'male', 'child'];
    const hairTypes = ['short', 'long', 'hat'];
    const newGender = genders[Math.floor(Math.random() * genders.length)];
    
    const eyeList = generateItems(newGender, 'eyes');
    const glassesList = generateItems(newGender, 'glasses');
    const mouthList = generateItems(newGender, 'mouth');
    const fhList = generateItems(newGender, 'facialhair');
    
    const useGlasses = Math.random() > 0.5;
    
    setCustomizations((prev) => {
      const clone = [...prev];
            const newHairColor = Math.floor(Math.random() * hairColors.length);
      const randomType = Math.random() > 0.5 ? 'expressive' : 'simple';
      const newHairIdx = getRandomHairTextureIndexFiltered(newGender, randomType);
       clone[index] = {
        ...clone[index],
        gender: newGender,
        eyeGender: newGender,
        mouthGender: newGender,
        hairType: randomType,
        hairColor: newHairColor,
        hairTextureIndex: newHairIdx,
        hairUserSelected: true,
        torsoTextureId: (() => {
          const pool = torsoManifest.filter(t => t.genders.includes(newGender));
          if (pool.length === 0) return null;
          return Math.random() < 0.3 ? null : pool[Math.floor(Math.random() * pool.length)].id;
        })(),
  legTextureId: (() => {
          if (legsManifest.length === 0) return null;
          return Math.random() < 0.3 ? null : legsManifest[Math.floor(Math.random() * legsManifest.length)].id;
        })(),        eyeTextureIndex: useGlasses ? 0 : Math.floor(Math.random() * eyeList.length),
        glassesTextureIndex: useGlasses ? Math.floor(Math.random() * glassesList.length) : 0,
        mouthTextureIndex: Math.floor(Math.random() * mouthList.length),
        facialHairTextureIndex: fhList.length > 1 ? Math.floor(Math.random() * fhList.length) : 0,
        eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
        eyebrowColor: getMatchingEyebrowColor(newHairColor),
        glassesColor: useGlasses ? glassesColors[Math.floor(Math.random() * glassesColors.length)] : '#1C1C1C',
      };
      return clone;
    });
  };

  // Tek karakter için API'ye kaydet
  const saveCharacterToAPI = async (charIndex, screenshot) => {
    const miniData = JSON.parse(sessionStorage.getItem('selectedMini') || '{}');
    const sceneData = JSON.parse(sessionStorage.getItem('currentScene') || '{}');
    const custom = customizationsRef.current[charIndex];

    const isBuilder = miniData.is_builder || user?.role === 'builder';
    const entityId = isBuilder ? (miniData.builder_id || user?.user_id) : miniData.mini_id;

    if (!entityId || !sceneData.scene_id) {
      console.log('⚠️ Missing data:', { entityId, scene_id: sceneData.scene_id, isBuilder });
      return null;
    }

    const customizationPayload = {
      character_index: charIndex + 1,
      gender: custom.gender,
      hairType: custom.hairType,
      hairColor: custom.hairColor,
      hairTextureIndex: custom.hairTextureIndex,
         torsoTextureId: custom.torsoTextureId,
      torsoTextureIndex: 0, // legacy
      legTextureId: custom.legTextureId,
      legTextureIndex: 0, // legacy
      eyeTextureIndex: custom.eyeTextureIndex,
      glassesTextureIndex: custom.glassesTextureIndex,
      mouthTextureIndex: custom.mouthTextureIndex,
      facialHairTextureIndex: custom.facialHairTextureIndex,
      eyeModelName: activeEyeModelName,
      mouthModelName: activeMouthModelName,
      eyeColor: custom.eyeColor,
      eyebrowColor: custom.eyebrowColor,
      glassesColor: custom.glassesColor,
    };

    const requestData = isBuilder ? {
      builder_id: entityId,
      scene_id: sceneData.scene_id,
      character_type: custom.gender,
      character_index: charIndex + 1,
      customization_data: customizationPayload,
      screenshot: screenshot
    } : {
      mini_id: entityId,
      scene_id: sceneData.scene_id,
      character_type: custom.gender,
      character_index: charIndex + 1,
      customization_data: customizationPayload,
      screenshot: screenshot
    };

    const apiUrl = isBuilder 
      ? 'https://mini-talks.org/minitalks-api/builder/save-custom-mini.php'
      : 'https://mini-talks.org/minitalks-api/custommini/save-custom-mini.php';

    console.log(`📤 Sending ${isBuilder ? 'Builder' : 'Mini'} ${charIndex + 1}:`, { ...requestData, screenshot: screenshot ? '[BASE64]' : null });

    try {
      const response = await axios.post(apiUrl, requestData);
      console.log(`📥 Response ${charIndex + 1}:`, response.data);
      return response.data;
    } catch (err) {
      console.error(`❌ ${isBuilder ? 'Builder' : 'Mini'} ${charIndex + 1} Error:`, err);
      return null;
    }
  };

  const saveAndNavigate = async () => {
    setIsSaving(true);
    
    const enrichedCustomizations = customizationsRef.current.map(custom => {
      const eg = custom.eyeGender || custom.gender || 'female';
      const mg = custom.mouthGender || custom.gender || 'female';
      const eItems = generateItems(eg, 'eyes');
      const gItems = generateItems(eg, 'glasses');
      const mItems = generateItems(mg, 'mouth');
      const fhItems = generateItems(mg, 'facialhair');
      
      let eyeModelName = null;
      if (custom.eyeTextureIndex > 0 && eItems[custom.eyeTextureIndex]?.modelName) {
        eyeModelName = eItems[custom.eyeTextureIndex].modelName;
      } else if (custom.glassesTextureIndex > 0 && gItems[custom.glassesTextureIndex]?.modelName) {
        eyeModelName = gItems[custom.glassesTextureIndex].modelName;
      }
      
      let mouthModelName = null;
      if (custom.mouthTextureIndex > 0 && mItems[custom.mouthTextureIndex]?.modelName) {
        mouthModelName = mItems[custom.mouthTextureIndex].modelName;
      } else if (custom.facialHairTextureIndex > 0 && fhItems[custom.facialHairTextureIndex]?.modelName) {
        mouthModelName = fhItems[custom.facialHairTextureIndex].modelName;
      }
      
      return {
        ...custom,
        eyeModelName,
        mouthModelName,
      };
    });
    
    sessionStorage.setItem('characterCustomizations', JSON.stringify(enrichedCustomizations));
    
    const miniData = JSON.parse(sessionStorage.getItem('selectedMini') || '{}');
    const sceneData = JSON.parse(sessionStorage.getItem('currentScene') || '{}');
    
    const isBuilder = miniData.is_builder || user?.role === 'builder';
    const entityId = isBuilder ? (miniData.builder_id || user?.user_id) : miniData.mini_id;
    
    console.log('📝 CustomMini data:', { miniData, sceneData, isBuilder, entityId });
    
    if (entityId && sceneData.scene_id) {
      try {
        setSavingStep('Capturing Mini Figure 1...');
        setActiveMiniIndex(0);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const screenshot1 = captureScreenshot();
        setSavingStep('Saving Mini Figure 1...');
        const result1 = await saveCharacterToAPI(0, screenshot1);
        
        if (result1?.success && result1?.reward_given) {
          console.log('🧱 Mini 1 Creation Brick earned!');
        }

        setSavingStep('Capturing Mini Figure 2...');
        setActiveMiniIndex(1);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const screenshot2 = captureScreenshot();
        setSavingStep('Saving Mini Figure 2...');
        const result2 = await saveCharacterToAPI(1, screenshot2);
        
        if (result2?.success && result2?.reward_given) {
          console.log('🧱 Mini 2 Creation Brick earned!');
        }

        setSavingStep('Done!');
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        console.error('Failed to save customized mini:', err);
      }
    } else {
      console.log('⚠️ Missing data:', { entityId, scene_id: sceneData.scene_id });
    }
    
    setIsSaving(false);
    navigate('/game');
  };

 const handleSave = () => {
    const mini1Default = isDefaultCustomization(0);
    const mini2Default = isDefaultCustomization(1);
    if (mini1Default && mini2Default) {
      setWarningType('both');
    } else if (mini1Default) {
      setWarningType('mini1');
    } else if (mini2Default) {
      setWarningType('mini2');
    } else {
      saveAndNavigate();
    }
  };

   const handlePopupCustomize = () => {
    if (warningType === 'both' || warningType === 'mini1') {
      setWarningType(null);
      setActiveMiniIndex(0);
    } else {
      setWarningType(null);
      setActiveMiniIndex(1);
    }
  };

  const handlePopupUseReady = () => {
    setWarningType(null);
    saveAndNavigate();
  };

  const handlePopupSurprise = () => {
    if (warningType === 'both') {
      randomizeCustomization(0);
      randomizeCustomization(1);
    } else if (warningType === 'mini1') {
      randomizeCustomization(0);
    } else {
      randomizeCustomization(1);
    }
    setWarningType(null);
    setTimeout(() => saveAndNavigate(), 500);
  };

  const handleReset = () => {
   updateCustomization({ gender: 'female', eyeGender: 'female', mouthGender: 'female', hairType: 'simple', hairColor: 0, hairTextureIndex: 109, hairUserSelected: false, torsoTextureId: null, legTextureId: null, eyeTextureIndex: 0, glassesTextureIndex: 0, mouthTextureIndex: 0, facialHairTextureIndex: 0, eyeColor: '#000000', eyebrowColor: '#000000', glassesColor: '#1C1C1C', view: 'front' });    setActiveCategory('hair');
    setTorsoPage(0);
    setTorsoCategoryTab('basic');
    setLegsBasicColor('black');
       setCurrentPage(0);
    setEyePage(0);
    setGlassesPage(0);
    setMouthPage(0);
    setFacialHairPage(0);
    setEyeSubTab('eyes');
    setMouthSubTab('mouth');
    setShowFaceColorPanel(false);
  };

  const handleSurpriseMe = () => {
    const genders = ['female', 'male', 'child'];
       const hairTypes = ['simple', 'expressive'];

    const newGender = genders[Math.floor(Math.random() * genders.length)];
    
    const eyeList = generateItems(newGender, 'eyes');
    const glassesList = generateItems(newGender, 'glasses');
    const mouthList = generateItems(newGender, 'mouth');
    const fhList = generateItems(newGender, 'facialhair');
    const useGlasses = Math.random() > 0.5;
    
      const newHairColor = Math.floor(Math.random() * hairColors.length);
    const randomType = Math.random() > 0.5 ? 'expressive' : 'simple';
    const newHairIdx = getRandomHairTextureIndexFiltered(newGender, randomType);
        updateCustomization({
      gender: newGender,
      hairType: randomType,
      hairColor: newHairColor,
      hairTextureIndex: newHairIdx,
      hairUserSelected: true,
             torsoTextureId: (() => {
          const pool = torsoManifest.filter(t => t.genders.includes(newGender));
          if (pool.length === 0) return null;
          return Math.random() < 0.3 ? null : pool[Math.floor(Math.random() * pool.length)].id;
        })(),
   legTextureId: (() => {
        if (legsManifest.length === 0) return null;
        return Math.random() < 0.3 ? null : legsManifest[Math.floor(Math.random() * legsManifest.length)].id;
      })(),      eyeTextureIndex: useGlasses ? 0 : Math.floor(Math.random() * eyeList.length),
      glassesTextureIndex: useGlasses ? Math.floor(Math.random() * glassesList.length) : 0,
      mouthTextureIndex: Math.floor(Math.random() * mouthList.length),
      facialHairTextureIndex: fhList.length > 1 ? Math.floor(Math.random() * fhList.length) : 0,
      eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
      eyebrowColor: getMatchingEyebrowColor(newHairColor),
      glassesColor: useGlasses ? glassesColors[Math.floor(Math.random() * glassesColors.length)] : '#1C1C1C',
    });
  };

  const toggleView = () => {
    updateCustomization({ view: view === 'front' ? 'back' : 'front' });
  };

  const switchMini = (index) => setActiveMiniIndex(index);

  const handleBack = () => {
    navigate('/scene-selection');
  };

  const navigationItems = [
    { id: 'play', label: 'PLAY', action: () => {} },
    { id: 'about', label: 'ABOUT', action: () => navigate('/about') },
    { id: 'settings', label: 'SETTINGS', action: () => navigate('/settings') }
  ];

  // Quick-access butonları için seçili item thumbnail'larını belirle
  const getQuickAccessImage = (categoryKey) => {
    switch (categoryKey) {
       case 'hair':
      if (hairTextureIndex > 0 && activeCustomization.hairUserSelected) {
        const hairItem = hairItems.find(h => h.textureIndex === hairTextureIndex);
        if (hairItem?.basePath) {
  const angle = TERS_YONLU_SACLAR.has(hairTextureIndex) ? 'back' : 'front';
  return `${hairItem.basePath}_${angle}_${hairColor}.png`;
}
      }
      return null;
      case 'head':
        if (eyeTextureIndex > 0 && eyeItems[eyeTextureIndex]?.img) return eyeItems[eyeTextureIndex].img;
        if (glassesTextureIndex > 0 && glassesItems[glassesTextureIndex]?.img) return glassesItems[glassesTextureIndex].img;
        if (mouthTextureIndex > 0 && mouthItems[mouthTextureIndex]?.img) return mouthItems[mouthTextureIndex].img;
        if (facialHairTextureIndex > 0 && facialHairItems[facialHairTextureIndex]?.img) return facialHairItems[facialHairTextureIndex].img;
        return null;
      case 'torso':
        return torsoTextureId ? torsoFrontUrl(torsoTextureId) : null;
         case 'legs':
        return legTextureId ? legsFrontUrl(legTextureId) : null;
      default:
        return null;
    }
  };

  const montserratFont = { fontFamily: "'Montserrat', sans-serif" };

  // Loading state
  if (!selectedMini) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          backgroundColor: '#fff',
          ...flexStyles.flexColumn,
          ...flexStyles.flexCenter,
          gap: '16px'
        }}
      >
        <img src={loadingGif} alt="Loading..." style={{ width: '128px', height: '128px' }} />
        <span style={{ fontSize: '20px', fontWeight: 700, color: '#4b5563' }}>Loading...</span>
      </div>
    );
  }

  // ============================================================
  // HEAD - 5x2 grid pagination (her kategori ayrı)
  // ============================================================
  const HEAD_ITEMS_PER_PAGE = isSmallScreen ? 4 : 10;

  const getSubTabData = (section) => {
    if (section === 'eye') {
      if (eyeSubTab === 'eyes') {
        return { items: eyeItems, selectedIndex: eyeTextureIndex, updateKey: 'eyeTextureIndex', page: eyePage, setPage: setEyePage };
      } else {
        return { items: glassesItems, selectedIndex: glassesTextureIndex, updateKey: 'glassesTextureIndex', page: glassesPage, setPage: setGlassesPage };
      }
    } else {
      if (mouthSubTab === 'mouth') {
        return { items: mouthItems, selectedIndex: mouthTextureIndex, updateKey: 'mouthTextureIndex', page: mouthPage, setPage: setMouthPage };
      } else {
        return { items: facialHairItems, selectedIndex: facialHairTextureIndex, updateKey: 'facialHairTextureIndex', page: facialHairPage, setPage: setFacialHairPage };
      }
    }
  };

  const eyeData = getSubTabData('eye');
  const mouthData = getSubTabData('mouth');

  const eyeTotalPages = Math.ceil(eyeData.items.length / HEAD_ITEMS_PER_PAGE);
  const mouthTotalPages = Math.ceil(mouthData.items.length / HEAD_ITEMS_PER_PAGE);

  const currentEyeItems = eyeData.items.slice(
    eyeData.page * HEAD_ITEMS_PER_PAGE,
    (eyeData.page + 1) * HEAD_ITEMS_PER_PAGE
  );
  const currentMouthItems = mouthData.items.slice(
    mouthData.page * HEAD_ITEMS_PER_PAGE,
    (mouthData.page + 1) * HEAD_ITEMS_PER_PAGE
  );

  const renderHeadSection = (section, subTabs, activeSubTab, setActiveSubTab, items, selectedIndex, updateKey, page, setPage, totalPages, extraHeader) => {
    // Gender pill'leri — sadece GÖRSEL ad; arkada eyeGender/mouthGender'ı set eder (GamePage modelName ile çözer)
    // Eyes bölümü: Soft(female) / Regular(male) / Youth(child)  → eyeGender
    // Mouth bölümü: Regular(male) / Lips(female) / Youth(child) → mouthGender
    const isEye = section === 'eye';
    const sectionGender = isEye ? eyeGender : mouthGender;
    const genderPills = isEye
      ? [
          { g: 'female', label: 'Soft' },
          { g: 'male', label: 'Regular' },
          { g: 'child', label: 'Youth' },
        ]
      : [
          { g: 'male', label: 'Regular' },
          { g: 'female', label: 'Lips' },
          { g: 'child', label: 'Youth' },
        ];

    // Facial Hair aktif mi? (mouth bölümünde) → pill'ler kilitlenir, sadece Regular(male) geçerli
    const facialHairActive = !isEye && activeSubTab === 'facialhair';
    // Glasses aktif mi? (eye bölümünde) → pill label'larına "& Glasses" eki
    const glassesActive = isEye && activeSubTab === 'glasses';

    const selectGender = (g) => {
      if (facialHairActive) return; // sakal modunda gender değiştirme (sadece male)
      if (g === sectionGender) return;
      if (isEye) updateCustomization({ eyeGender: g });
      else updateCustomization({ mouthGender: g });
    };

    return (
      <div style={{ ...flexStyles.flexColumn, ...flexStyles.flex1, minHeight: 0 }}>
        {/* Sub-tab pills — 3 bölge: SOL sabit başlık | ORTA slider pill'ler | SAĞ sabit tik+renk */}
        <div 
          style={{
            display: 'flex',
            WebkitDisplay: '-webkit-flex',
            alignItems: 'center',
            WebkitBoxAlign: 'center',
            WebkitAlignItems: 'center',
            ...flexStyles.flexShrink0,
            padding: isSmallScreen ? '2px 10px' : '7px clamp(8px, 1vw, 12px)',
            backgroundColor: '#0055bf',
            gap: isSmallScreen ? '6px' : 'clamp(6px, 0.7vw, 10px)',
            flexWrap: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {/* ───── SOL (SABİT): Eye / Mouth başlığı + dikey çizgi ───── */}
          <span style={{
            ...flexStyles.flexCenter,
            flexShrink: 0,
            color: '#e52828',
            backgroundColor: '#fff',
            border: '2px solid #e52828',
            borderRadius: '8px',
            fontWeight: 900,
            fontSize: isSmallScreen ? '12px' : 'clamp(12px, 1.2vw, 15px)',
            padding: isSmallScreen ? '3px 11px' : '5px clamp(12px, 1.3vw, 18px)',
            whiteSpace: 'nowrap',
          }}>
            {isEye ? 'Eye' : 'Mouth'}
          </span>
          <div style={{ ...flexStyles.flexCenter, flexShrink: 0, alignSelf: 'stretch' }}>
            <div style={{ width: '2px', height: '22px', backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: '2px' }} />
          </div>

          {/* ───── ORTA (SLIDER): gender pill'leri — taşarsa yatay kayar ───── */}
          <div style={{ position: 'relative', flex: '1 1 0%', WebkitFlex: '1 1 0%', minWidth: 0, display: 'flex', WebkitDisplay: '-webkit-flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            ref={isEye ? eyeSliderRef : mouthSliderRef}
            className="torso-hscroll"
            onWheel={(e) => { if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY; }}
            style={{
              display: 'flex',
              WebkitDisplay: '-webkit-flex',
              alignItems: 'center',
              WebkitBoxAlign: 'center',
              WebkitAlignItems: 'center',
              flexWrap: 'nowrap',
              minWidth: 0,
              gap: isSmallScreen ? '6px' : 'clamp(6px, 0.7vw, 10px)',
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              paddingTop: isSmallScreen ? '2px' : '6px',
              paddingBottom: isSmallScreen ? '5px' : '6px',
            }}
          >
            {genderPills.map(gp => {
              const isActive = sectionGender === gp.g;
              // Facial hair modunda sadece Regular(male) geçerli, diğerleri inaktif görünür
              const disabled = facialHairActive && gp.g !== 'male';
              const label = glassesActive ? `${gp.label} & Glasses` : gp.label;
              return (
                <button
                  key={gp.g}
                  onClick={() => !disabled && selectGender(gp.g)}
                  disabled={disabled}
                  style={{
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    backgroundColor: isActive ? '#16a34a' : '#dce6f5',
                    color: isActive ? '#fff' : '#1a3a6b',
                    fontWeight: 800,
                    fontSize: isSmallScreen ? '12px' : 'clamp(12px, 1.2vw, 15px)',
                    padding: isSmallScreen ? '3px 11px' : '6px clamp(12px, 1.3vw, 18px)',
                    borderRadius: '8px',
                    border: isActive ? '2px solid #16a34a' : '2px solid #dce6f5',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.4 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <HScrollIndicator scrollRef={isEye ? eyeSliderRef : mouthSliderRef} />
          </div>

          {/* ───── SAĞ (SABİT): dikey çizgi + Glasses/Facial Hair tik + renk butonu ───── */}
          <div style={{ ...flexStyles.flexCenter, flexShrink: 0, alignSelf: 'stretch' }}>
            <div style={{ width: '2px', height: '22px', backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: '2px' }} />
          </div>

          {subTabs.filter(t => (isEye ? t.key === 'glasses' : t.key === 'facialhair')).map(tab => {
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (isActive) {
                    // tik kapat → ana sekmeye dön
                    if (isEye) { setActiveSubTab('eyes'); updateCustomization({ glassesTextureIndex: 0 }); }
                    else { setActiveSubTab('mouth'); updateCustomization({ facialHairTextureIndex: 0 }); }
                  } else {
                    // tik aç
                    if (isEye) { setActiveSubTab('glasses'); updateCustomization({ eyeTextureIndex: 0 }); }
                    else {
                      // Facial Hair sadece male'de var → otomatik mouthGender=male
                      if (mouthGender !== 'male') {
                        facialHairIntentRef.current = true;
                        updateCustomization({ mouthGender: 'male' });
                      }
                      setActiveSubTab('facialhair'); updateCustomization({ mouthTextureIndex: 0 });
                    }
                  }
                }}
                style={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  backgroundColor: isActive ? '#16a34a' : '#dce6f5',
                  color: isActive ? '#fff' : '#1a3a6b',
                  fontWeight: 800,
                  fontSize: isSmallScreen ? '12px' : 'clamp(12px, 1.2vw, 15px)',
                  padding: isSmallScreen ? '3px 11px' : '6px clamp(12px, 1.3vw, 18px)',
                  borderRadius: '8px',
                  border: isActive ? '2px solid #16a34a' : '2px solid #dce6f5',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  ...flexStyles.flexCenter,
                  width: '14px', height: '14px', borderRadius: '3px',
                  border: isActive ? '2px solid #fff' : '2px solid #1a3a6b',
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  color: '#16a34a', fontSize: '11px', fontWeight: 900, lineHeight: 1,
                }}>{isActive ? '✓' : ''}</span>
                {tab.label}
              </button>
            );
          })}

          {extraHeader && (
            <div style={{ flexShrink: 0, ...flexStyles.flexCenter }}>{extraHeader}</div>
          )}
        </div>

        {/* Grid with Arrows */}
        <div style={{ ...flexStyles.flex1, display: 'flex', alignItems: 'center', backgroundColor: '#e8e8e8', minHeight: 0 }}>
          
          <button 
            onClick={() => setPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1))}
            disabled={totalPages <= 1}
            style={{ 
              ...flexStyles.flexCenter,
              ...flexStyles.flexShrink0,
              fontSize: 'clamp(28px, 3vw, 40px)',
              width: isSmallScreen ? '24px' : 'clamp(28px, 3vw, 40px)',
              color: totalPages <= 1 ? '#d1d5db' : '#9ca3af',
              background: 'none',
              border: 'none',
              cursor: totalPages <= 1 ? 'not-allowed' : 'pointer',
              transition: 'color 0.2s'
            }}
          >
            ‹
          </button>

          <div style={{ ...flexStyles.flex1, padding: isSmallScreen ? '8px 6px' : '8px 6px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: isSmallScreen ? 'repeat(4, 1fr)' : 'repeat(5, 1fr)',
                gridTemplateRows: isSmallScreen ? 'repeat(1, 1fr)' : 'repeat(2, 1fr)',
                gap: 'clamp(3px, 0.4vw, 6px)',
                height: '100%',
                alignContent: 'start',
                justifyContent: 'center',
                gridAutoRows: 'minmax(0, 1fr)',
              }}
            >
              {items.map((item, i) => {
                const globalIndex = page * HEAD_ITEMS_PER_PAGE + i;
                const isSelected = selectedIndex === globalIndex;
                const isDefault = item.type === 'default';
                
                return (
                  <button
                    key={globalIndex}
                    onClick={() => updateCustomization({ [updateKey]: globalIndex })}
                    style={{
                      ...flexStyles.flexCenter,
                      backgroundColor: '#fff',
                      borderRadius: '8px', 
                      padding: '3px',
                      border: 'none',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxShadow: isSelected ? '0 0 0 3px #16a34a, 0 0 8px rgba(22, 163, 74, 0.4)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isDefault ? (
                      <div 
                        style={{
                          ...flexStyles.flexColumn,
                          ...flexStyles.flexCenter,
                          width: '100%',
                          height: '100%',
                          borderRadius: '6px',
                          backgroundColor: '#f5f5f5',
                          minHeight: '40px'
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#4b5563', fontSize: 'clamp(9px, 0.9vw, 12px)' }}>
                          Default
                        </span>
                      </div>
                    ) : (
                      <img 
                        src={item.img} 
                        alt={item.label || ''} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button 
            onClick={() => setPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0))}
            disabled={totalPages <= 1}
            style={{ 
              ...flexStyles.flexCenter,
              ...flexStyles.flexShrink0,
              fontSize: 'clamp(28px, 3vw, 40px)',
              width: isSmallScreen ? '24px' : 'clamp(28px, 3vw, 40px)',
              color: totalPages <= 1 ? '#d1d5db' : '#9ca3af',
              background: 'none',
              border: 'none',
              cursor: totalPages <= 1 ? 'not-allowed' : 'pointer',
              transition: 'color 0.2s'
            }}
          >
            ›
          </button>
        </div>

        {totalPages > 1 && (
          <div style={{ ...flexStyles.flexCenter, ...flexStyles.flexShrink0, padding: isSmallScreen ? '1px' : 'clamp(2px, 0.3vh, 4px)', gap: isSmallScreen ? '4px' : '6px', backgroundColor: '#e8e8e8' }}>
            {Array.from({ length: totalPages }).map((_, idx) => (
              <div
                key={idx}
                onClick={() => setPage(idx)}
                style={{
                  width: isSmallScreen ? (idx === page ? '5px' : '4px') : (idx === page ? '10px' : '8px'),
                  height: isSmallScreen ? (idx === page ? '5px' : '4px') : (idx === page ? '10px' : '8px'),
                  borderRadius: '50%',
                  backgroundColor: idx === page ? '#444' : '#bbb',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Rainbow butonu — Face Color Panel'i açıp kapatır
  // ─────────────────────────────────────────────────────────────────────────
  const rainbowButton = (
    <button
      onClick={() => setShowFaceColorPanel(prev => !prev)}
      title="Face Colors"
      style={{
        ...flexStyles.flexCenter,
        width: 'clamp(30px, 3vw, 38px)',
        height: 'clamp(30px, 3vw, 38px)',
        borderRadius: '50%',
        border: showFaceColorPanel ? '3px solid #16a34a' : '2px solid #999',
        cursor: 'pointer',
        padding: 0,
        background: 'conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00cc00, #0088ff, #8800ff, #ff0088, #ff0000)',
        boxShadow: showFaceColorPanel 
          ? '0 0 8px rgba(22,163,74,0.6), inset 0 0 4px rgba(255,255,255,0.5)' 
          : '0 1px 3px rgba(0,0,0,0.2), inset 0 0 4px rgba(255,255,255,0.5)',
        transition: 'all 0.2s',
        transform: showFaceColorPanel ? 'scale(1.1)' : 'scale(1)',
        ...flexStyles.flexShrink0,
      }}
    >
      <div style={{
        width: '60%',
        height: '60%',
        borderRadius: '50%',
        backgroundColor: '#fff',
        ...flexStyles.flexCenter,
        fontSize: '10px',
      }}>
        🎨
      </div>
    </button>
  );

  // Sub-tab tanımları
  const eyeSubTabs = [
    { key: 'eyes', label: 'Eyes' },
    { key: 'glasses', label: 'Glasses' },
  ];
  const mouthSubTabs = [
    { key: 'mouth', label: 'Mouth' },
    { key: 'facialhair', label: 'Facial Hair' },
  ];

  const renderHeadContent = () => {
    return (
      <div style={{ ...flexStyles.flexColumn, ...flexStyles.flex1, minHeight: 0, overflow: 'hidden' }}>
        {renderHeadSection(
          'eye', eyeSubTabs, eyeSubTab, setEyeSubTab,
          currentEyeItems, eyeData.selectedIndex, eyeData.updateKey,
          eyeData.page, eyeData.setPage, eyeTotalPages,
          rainbowButton
        )}
        <div style={{ height: '3px', backgroundColor: '#0055bf', ...flexStyles.flexShrink0 }} />
        {renderHeadSection(
          'mouth', mouthSubTabs, mouthSubTab, setMouthSubTab,
          currentMouthItems, mouthData.selectedIndex, mouthData.updateKey,
          mouthData.page, mouthData.setPage, mouthTotalPages,
          null
        )}
      </div>
    );
  };

   return (
    <div 
      style={{
        ...montserratFont,
        height: '100vh',
        height: 'calc(var(--vh, 1vh) * 100)',
        backgroundColor: '#fff',
        overflow: 'hidden',
        ...flexStyles.flexColumn
      }}
    >
        {/* Torso yatay scroll — scrollbar tamamen gizli, kenarlar soft fade */}
        <style>{`
        .torso-hscroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .torso-hscroll::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        @keyframes hairColorSlide {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes hairColorSlideX {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <Header 
        showBackButton={true}
        onBack={handleBack}
        navigationItems={navigationItems}
        activeNavItem="play"
      />

      {/* Saving Overlay */}
      {isSaving && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            ...flexStyles.flexCenter,
            zIndex: 50
          }}
        >
          <div 
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              ...flexStyles.flexColumn,
              ...flexStyles.flexCenter,
              gap: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <img src={loadingGif} alt="Saving..." style={{ width: '96px', height: '96px' }} />
            <div style={{ fontSize: '20px', fontWeight: 700 }}>Saving your Minis...</div>
            <div style={{ color: '#6b7280' }}>{savingStep}</div>
          </div>
        </div>
      )}

      {/* Mini 2 Warning Popup */}
     {warningType && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            ...flexStyles.flexCenter,
            zIndex: 50
          }}
        >
          <div style={{ margin: '0 16px' }}>
            <div
              style={{
                backgroundColor: '#0055BF',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div
                style={{
                  padding: '10px 20px',
                  ...flexStyles.flexCenter
                }}
              >
                <h2
                  style={{
                    color: '#ffffff',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '28px',
                    fontWeight: 900,
                    margin: 0
                  }}
                >
                  Wait a Second!
                </h2>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  margin: '0 6px 6px 6px',
                  padding: '16px 12px',
                  display: 'flex',
                  WebkitDisplay: '-webkit-flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <img 
                  src={legoHead} 
                  alt="LEGO Character" 
                  style={{
                    width: '150px',
                    height: '150px',
                    objectFit: 'contain',
                    ...flexStyles.flexShrink0
                  }}
                />

                <div
                  style={{
                    ...flexStyles.flexColumn,
                    alignItems: 'center'
                  }}
                >
                  <p
                    style={{
                      color: '#000000',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '18px',
                      fontWeight: 500,
                      textAlign: 'center',
                      marginBottom: '16px',
                      lineHeight: '1.4'
                    }}
                  >
                      {warningType === 'both' ? (
                      <>Your <span style={{ fontWeight: 700, color: '#E31E24' }}>Minis</span> aren't customized yet.<br />Would you like to create them or start with ready Minis?</>
                    ) : warningType === 'mini1' ? (
                      <>Your <span style={{ fontWeight: 700, color: '#E31E24' }}>Mini 1</span> isn't customized yet.<br />Would you like to create it or start with ready Mini?</>
                    ) : (
                      <>Your <span style={{ fontWeight: 700, color: '#E31E24' }}>Mini 2</span> isn't customized yet.<br />Would you like to create it or start with ready Mini?</>
                    )}
                  </p>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handlePopupCustomize}
                      onMouseEnter={() => setCustomizeHover(true)}
                      onMouseLeave={() => setCustomizeHover(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                    >
                      <img 
                        src={customizeHover ? customizeBtnHoverImg : customizeBtnImg}
                        alt="Customize"
                        style={{ height: '50px', width: 'auto' }}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={handlePopupUseReady}
                      onMouseEnter={() => setUseReadyHover(true)}
                      onMouseLeave={() => setUseReadyHover(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                    >
                      <img 
                        src={useReadyHover ? useReadyBtnHoverImg : useReadyBtnImg}
                        alt="Use Ready"
                        style={{ height: '50px', width: 'auto' }}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={handlePopupSurprise}
                      onMouseEnter={() => setPopupSurpriseHover(true)}
                      onMouseLeave={() => setPopupSurpriseHover(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                      }}
                    >
                      <img 
                        src={popupSurpriseHover ? surpriseBtnHoverImg : surpriseBtnImg}
                        alt="Surprise Me"
                        style={{ height: '50px', width: 'auto' }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div 
        style={{
          ...flexStyles.flex1,
          display: 'flex',
          WebkitDisplay: '-webkit-flex',
          WebkitBoxPack: 'center',
          WebkitJustifyContent: 'center',
          justifyContent: 'center',
          WebkitBoxAlign: 'center',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          paddingTop: isSmallScreen ? '6px' : '16px',
          paddingBottom: isSmallScreen ? '6px' : '16px',
          paddingLeft: isSmallScreen ? 'max(28px, env(safe-area-inset-left))' : 'clamp(16px, 2vw, 32px)',
          paddingRight: isSmallScreen ? 'max(28px, env(safe-area-inset-right))' : 'clamp(16px, 2vw, 32px)',
          gap: isSmallScreen ? '8px' : 'clamp(16px, 2vw, 32px)',
          overflow: 'hidden'
        }}
      >
        
        {/* Sol Panel - 3D Preview */}
        <div 
          style={{
            ...(isSmallScreen ? {
              display: 'flex',
              WebkitDisplay: '-webkit-flex',
              flexDirection: 'row',
              WebkitFlexDirection: 'row',
              WebkitBoxOrient: 'horizontal',
              WebkitBoxAlign: 'center',
              WebkitAlignItems: 'center',
              alignItems: 'center',
              gap: '8px',
              WebkitBoxFlex: 1,
              WebkitFlex: '1 1 0%',
              flex: '1 1 0%',
              minWidth: 0,
              height: 'calc(var(--vh, 1vh) * 100 - 64px)',
              maxHeight: '100%',
            } : {
              ...flexStyles.flexColumn,
              gap: '12px',
              WebkitBoxAlign: 'center',
              WebkitAlignItems: 'center',
              alignItems: 'center',
              ...flexStyles.flexShrink0,
              width: 'clamp(320px, 32vw, 500px)', 
              height: 'clamp(500px, calc(100vh - 140px), 750px)'
            })
          }}
        >

          {isSmallScreen ? (
            /* ───────── MOBİL: sol dikey kolon (Mini 1/2 + cinsiyet) ───────── */
            <div style={{
              ...flexStyles.flexColumn,
              WebkitBoxAlign: 'center',
              WebkitAlignItems: 'center',
              alignItems: 'center',
              ...flexStyles.flexShrink0,
              gap: '6px',
              justifyContent: 'center',
              WebkitJustifyContent: 'center',
              WebkitBoxPack: 'center',
            }}>
              {/* Mini 1 / Mini 2 — dikey */}
              {[0, 1].map((idx) => (
                <button
                  key={idx}
                  onClick={() => switchMini(idx)}
                  style={{
                    ...flexStyles.flexCenter,
                    height: '34px',
                    width: '96px',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#e52828',
                    borderRadius: '10px',
                    gap: '5px',
                    backgroundColor: activeMiniIndex === idx ? '#e52828' : '#fff',
                    color: activeMiniIndex === idx ? '#fff' : '#e52828',
                    cursor: 'pointer',
                    WebkitTransition: 'all 0.2s',
                    transition: 'all 0.2s',
                  }}
                >
                  <img
                    src={activeMiniIndex === idx ? miniFigureIconWhite : miniFigureIconRed}
                    alt={`Mini ${idx + 1}`}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontWeight: 900, fontSize: '11px' }}>Mini {idx + 1}</span>
                </button>
              ))}

              {/* Ayraç + Female/Male/Child — GÖRSEL OLARAK GİZLENDİ (gender arkada korunuyor) */}
              {false && (
              <>
              {/* Ayraç */}
              <div style={{ width: '70%', height: '2px', backgroundColor: '#0055bf', borderRadius: '2px', margin: '2px 0' }} />

              {/* Female / Male / Child — dikey */}
              {[
                { val: 'female', icon: femaleIcon, label: 'Female' },
                { val: 'male', icon: maleIcon, label: 'Male' },
                { val: 'child', icon: childIcon, label: 'Child' },
              ].map((g) => (
                <button
                  key={g.val}
                  onClick={() => updateCustomization({ gender: g.val })}
                  style={{
                    ...flexStyles.flexCenter,
                    width: '96px',
                    height: '32px',
                    borderRadius: '10px',
                    border: '2px solid #0055bf',
                    gap: '5px',
                    backgroundColor: gender === g.val ? '#0055bf' : '#fff',
                    cursor: 'pointer',
                    WebkitTransition: 'all 0.2s',
                    transition: 'all 0.2s',
                  }}
                >
                  <img
                    src={g.icon}
                    alt={g.label}
                    style={{
                      width: '15px',
                      height: '15px',
                      filter: gender === g.val
                        ? 'brightness(0) invert(1)'
                        : 'brightness(0) invert(18%) sepia(100%) saturate(3000%) hue-rotate(210deg)',
                    }}
                  />
                  <span style={{ fontWeight: 900, fontSize: '11px', color: gender === g.val ? '#fff' : '#0055bf' }}>
                    {g.label}
                  </span>
                </button>
              ))}
              </>
              )}
            </div>
          ) : (
          /* Üst Satır: Mini Figure Tabs (DESKTOP) */
          <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: 'clamp(8px, 1vw, 12px)' }}>
            <button
              style={{ 
                ...flexStyles.flexCenter,
                height: 'clamp(48px, 5vh, 60px)', 
                width: 'clamp(150px, 15vw, 240px)',
                borderWidth: '3px', 
                borderStyle: 'solid',
                borderColor: '#e52828',
                borderRadius: '14px',
                gap: 'clamp(8px, 1vw, 12px)',
                backgroundColor: activeMiniIndex === 0 ? '#e52828' : '#fff',
                color: activeMiniIndex === 0 ? '#fff' : '#e52828',
                cursor: 'pointer',
                WebkitTransition: 'all 0.2s',
                transition: 'all 0.2s'
              }}
              onClick={() => switchMini(0)}
            >
              <img 
                src={activeMiniIndex === 0 ? miniFigureIconWhite : miniFigureIconRed} 
                alt="Mini 1" 
                style={{ width: 'clamp(20px, 2vw, 28px)', height: 'clamp(20px, 2vw, 28px)' }}
              />
              <span style={{ fontWeight: 900, fontSize: 'clamp(12px, 1.2vw, 16px)' }}>Mini 1</span>
            </button>
            
            <button
              style={{ 
                ...flexStyles.flexCenter,
                height: 'clamp(48px, 5vh, 60px)', 
                width: 'clamp(150px, 15vw, 240px)',
                borderWidth: '3px', 
                borderStyle: 'solid',
                borderColor: '#e52828',
                borderRadius: '14px',
                gap: 'clamp(8px, 1vw, 12px)',
                backgroundColor: activeMiniIndex === 1 ? '#e52828' : '#fff',
                color: activeMiniIndex === 1 ? '#fff' : '#e52828',
                cursor: 'pointer',
                WebkitTransition: 'all 0.2s',
                transition: 'all 0.2s'
              }}
              onClick={() => switchMini(1)}
            >
              <img 
                src={activeMiniIndex === 1 ? miniFigureIconWhite : miniFigureIconRed} 
                alt="Mini 2" 
                style={{ width: 'clamp(20px, 2vw, 28px)', height: 'clamp(20px, 2vw, 28px)' }}
              />
              <span style={{ fontWeight: 900, fontSize: 'clamp(12px, 1.2vw, 16px)' }}>Mini 2</span>
            </button>
          </div>
          )}

          {isSmallScreen && (
            <div style={{
              ...flexStyles.flexColumn,
              ...flexStyles.flexCenter,
              ...flexStyles.flex1,
              height: '100%',
              minWidth: 0,
              position: 'relative',
            }}>
              {/* 3D Preview Area (MOBİL) */}
              <div
                id="lego-figure-canvas"
                style={{
                  ...flexStyles.flex1,
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  minHeight: 0,
                }}
              >
                <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, ...flexStyles.flexCenter }}>
                  <div style={{ width: '100%', height: '100%' }}>
                    <LegoFigure
                      view={view}
                      activeCategory={activeCategory}
                      customization={{
                        gender, hairType, hairColor, hairTextureIndex,
                        torsoTextureId, legTextureId, eyeTextureIndex, mouthTextureIndex,
                        eyeModelName: activeEyeModelName,
                        mouthModelName: activeMouthModelName,
                        eyeColor: eyeColor,
                        eyebrowColor: eyebrowColor,
                        glassesColor: glassesColor,
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Front/Back Toggle (MOBİL) */}
              <button
                onClick={toggleView}
                style={{
                  ...flexStyles.flexCenter,
                  ...flexStyles.flexShrink0,
                  width: '40px',
                  height: '40px',
                  marginTop: '4px',
                  marginBottom: '4px',
                  backgroundColor: '#fff',
                  border: '2px solid #d1d5db',
                  borderRadius: '50%',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  WebkitTransition: 'all 0.2s',
                  transition: 'all 0.2s',
                }}
              >
                <img
                  src={view === 'front' ? frontIcon : backIcon}
                  alt={view === 'front' ? 'Front' : 'Back'}
                  style={{ width: '22px', height: '22px' }}
                />
              </button>
            </div>
          )}

          {!isSmallScreen && (
          <>
          {/* 3D Preview Area */}
          <div 
            id="lego-figure-canvas"
            style={{
              ...flexStyles.flex1,
              position: 'relative',
              overflow: 'hidden',
              width: '100%'
            }}
          >
            <div 
              style={{ 
                position: 'absolute',
                left: '0',
                top: '0',
                right: '0',
                bottom: '0',
                ...flexStyles.flexCenter
              }}
            >
              <div style={{ width: '100%', height: '100%' }}>
                     <LegoFigure 
                  view={view}
                  activeCategory={activeCategory}
                    customization={{ 
                    gender, 
                    hairType, 
                    hairColor, 
                    hairTextureIndex, 
                    torsoTextureId,
                    legTextureId,
                    eyeTextureIndex,
                    mouthTextureIndex,
                    eyeModelName: activeEyeModelName,
                    mouthModelName: activeMouthModelName,
                    eyeColor: eyeColor,
                    eyebrowColor: eyebrowColor,
                    glassesColor: glassesColor,
                  }} 
                />
              </div>
            </div>
          </div>

          {/* Front/Back Toggle Button */}
          <div 
            style={{ 
              ...flexStyles.flexCenter,
              paddingBottom: '10px'
            }}
          >
            <button
              onClick={toggleView}
              style={{
                ...flexStyles.flexCenter,
                width: 'clamp(48px, 5vw, 60px)',
                height: 'clamp(48px, 5vw, 60px)',
                backgroundColor: '#fff',
                border: '2px solid #d1d5db',
                borderRadius: '50%',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                WebkitTransition: 'all 0.2s',
                transition: 'all 0.2s'
              }}
            >
              <img 
                src={view === 'front' ? frontIcon : backIcon} 
                alt={view === 'front' ? 'Front' : 'Back'} 
                style={{ width: 'clamp(24px, 2.5vw, 32px)', height: 'clamp(24px, 2.5vw, 32px)' }}
              />
            </button>
          </div>
          </>
          )}
        </div>

        {/* Quick-access buttons column — mobilde tamamen gizli */}
        {!isSmallScreen && (
        <div
          className="hidden xl:flex"
          style={{
            ...flexStyles.flexColumn,
            WebkitBoxAlign: 'center',
            WebkitAlignItems: 'center',
            alignItems: 'center',
            WebkitBoxPack: 'center',
            WebkitJustifyContent: 'center',
            justifyContent: 'center',
            gap: 'clamp(24px, 3vh, 40px)',
            marginRight: 'clamp(24px, 3vw, 48px)'
          }}
        >
          {[
            { key: 'hair', label: 'Hair' },
            { key: 'head', label: 'Head' },
            { key: 'torso', label: 'Torso' },
            { key: 'legs', label: 'Legs' },
          ].map((item) => {
            const selectedImage = getQuickAccessImage(item.key);
            const hasSelection = selectedImage !== null;
            const isActive = activeCategory === item.key;

            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveCategory(item.key);
                  setCurrentPage(0);
                }}
                style={{
                  ...flexStyles.flexColumn,
                  ...flexStyles.flexCenter,
                  width: 'clamp(70px, 6vw, 90px)',
                  height: 'clamp(80px, 7vw, 100px)',
                  border: `2px solid ${isActive ? '#e52828' : '#d1d5db'}`,
                  borderRadius: '8px',
                  backgroundColor: isActive ? '#fef2f2' : '#fff',
                  cursor: 'pointer',
                  WebkitTransition: 'all 0.2s',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ position: 'relative', width: 'clamp(32px, 3vw, 44px)', height: 'clamp(32px, 3vw, 44px)', marginBottom: '8px' }}>
  <img
    src={hasSelection ? selectedImage : addIcon}
    alt={hasSelection ? `Selected ${item.label}` : 'Add'}
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      filter: !hasSelection ? 'grayscale(100%) opacity(0.7)' : 'none',
    }}
  />

</div>
                <span 
                  style={{
                    fontWeight: 600,
                    fontSize: 'clamp(12px, 1vw, 16px)',
                    color: isActive ? '#e52828' : '#6b7280'
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        )}

        {/* Sağ Panel - Customization */}
        <div 
          style={{
            ...flexStyles.flexColumn,
            ...(isSmallScreen ? {
              WebkitBoxFlex: 1.25,
              WebkitFlex: '1.25 1 0%',
              flex: '1.25 1 0%',
              minWidth: 0,
              height: 'calc(var(--vh, 1vh) * 100 - 64px)',
              maxHeight: '100%',
            } : {
              ...flexStyles.flexShrink0,
              width: 'clamp(450px, 45vw, 750px)', 
              height: 'clamp(500px, calc(100vh - 140px), 750px)'
            })
          }}
        >
          
          {/* Üst Brick'ler */}
          <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxPack: isSmallScreen ? 'justify' : 'center', WebkitJustifyContent: isSmallScreen ? 'space-between' : 'center', justifyContent: isSmallScreen ? 'space-between' : 'center', gap: isSmallScreen ? 0 : 'clamp(18px, 2.2vw, 36px)', marginBottom: isSmallScreen ? '-16px' : '-18px', paddingLeft: isSmallScreen ? '3.333%' : 0, paddingRight: isSmallScreen ? '3.333%' : 0 }}>
            {Array(6).fill(null).map((_, i) => (
              <div 
                key={i}
                style={{ 
                  backgroundColor: '#e52828',
                  borderRadius: isSmallScreen ? '4px 4px 0 0' : '8px 8px 0 0', 
                  ...(isSmallScreen
                    ? { width: '10%', flexShrink: 0, height: '32px' }
                    : { width: 'clamp(50px, 5vw, 90px)', height: 'clamp(44px, 5vh, 60px)' })
                }}
              />
            ))}
          </div>

          {/* Ana Container */}
          <div style={{ ...flexStyles.flex1, display: 'flex', WebkitDisplay: '-webkit-flex', flexDirection: isSmallScreen ? 'row-reverse' : 'row', WebkitFlexDirection: isSmallScreen ? 'row-reverse' : 'row', overflow: 'hidden', borderRadius: isSmallScreen ? '12px' : '24px' }}>
            
            {/* Sol Kırmızı Sidebar (mobilde sağda) */}
            <div 
              style={{ 
                backgroundColor: '#e52828',
                ...flexStyles.flexColumn,
                WebkitBoxAlign: 'center',
                WebkitAlignItems: 'center',
                alignItems: 'center',
                ...flexStyles.flexShrink0,
                width: isSmallScreen ? '78px' : 'clamp(100px, 10vw, 180px)',
                borderRadius: isSmallScreen ? '0 10px 10px 0' : '24px 0 0 24px',
                paddingTop: isSmallScreen ? '10px' : '12px',
                paddingBottom: isSmallScreen ? '10px' : '12px'
              }}
            >
              <div style={{ ...flexStyles.flex1, ...flexStyles.flexColumn, WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', WebkitBoxPack: 'center', WebkitJustifyContent: 'center', justifyContent: 'center' }}>
                
                {!isSmallScreen && (
                <button 
                  onClick={() => navigate('/scene-selection')} 
                  style={{
                    ...flexStyles.flexColumn,
                    WebkitBoxAlign: 'center',
                    WebkitAlignItems: 'center',
                    alignItems: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 'clamp(10px, 1vw, 12px)',
                    marginBottom: 'clamp(8px, 1vh, 12px)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    WebkitTransition: 'transform 0.2s',
                    transition: 'transform 0.2s'
                  }}
                >
                  <span style={{ fontSize: 'clamp(18px, 2vw, 24px)', lineHeight: 1 }}>←</span>
                  <span>Main menu</span>
                </button>
                )}

                {!isSmallScreen && (
                <div style={{ ...flexStyles.flexColumn, WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', marginBottom: 'clamp(12px, 2vh, 16px)' }}>
                  <img 
                    src={logoImg} 
                    alt="Mini-Talks" 
                    style={{
                      objectFit: 'contain',
                      width: 'clamp(64px, 8vw, 96px)',
                      height: 'clamp(64px, 8vw, 96px)'
                    }}
                  />
                </div>
                )}

                <div style={{ ...flexStyles.flexColumn, gap: isSmallScreen ? '8px' : 'clamp(6px, 1vh, 10px)' }}>
                  {[
                    { key: 'hair', icon: hairIconRed, whiteIcon: hairIconWhite, label: 'Hair' },
                    { key: 'head', icon: headIconRed, whiteIcon: headIconWhite, label: 'Head' },
                    { key: 'torso', icon: torsoIconRed, whiteIcon: torsoIconWhite, label: 'Torso' },
                    { key: 'legs', icon: legsIconRed, whiteIcon: legsIconWhite, label: 'Legs' }
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => { setActiveCategory(cat.key); setCurrentPage(0); }}
                      style={{
                        ...flexStyles.flexColumn,
                        ...flexStyles.flexCenter,
                        width: isSmallScreen ? '70px' : 'clamp(80px, 8vw, 140px)',
                        height: isSmallScreen ? '70px' : 'clamp(70px, 8vh, 110px)',
                        borderRadius: isSmallScreen ? '10px' : '14px',
                        border: isSmallScreen ? '3px solid #ffffff' : '3px solid #ffffff',
                        backgroundColor: activeCategory === cat.key ? '#fff' : '#e52828',
                        cursor: 'pointer',
                        WebkitTransition: 'all 0.2s',
                        transition: 'all 0.2s'
                      }}
                    >
                      <img 
                        src={activeCategory === cat.key ? cat.icon : cat.whiteIcon}
                        alt={cat.label}
                        style={{ 
                          objectFit: 'contain',
                          width: isSmallScreen ? ((cat.key === 'torso' || cat.key === 'hair') ? '44px' : '38px') : 'clamp(28px, 3vw, 40px)', 
                          height: isSmallScreen ? ((cat.key === 'torso' || cat.key === 'hair') ? '44px' : '38px') : 'clamp(28px, 3vw, 40px)', 
                          marginBottom: isSmallScreen ? '2px' : '4px' 
                        }}
                      />
                      <span 
                        style={{
                          fontWeight: 900,
                          fontSize: isSmallScreen ? '14px' : 'clamp(12px, 1.2vw, 16px)',
                          color: activeCategory === cat.key ? '#e52828' : '#fff'
                        }}
                      >
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sağ İçerik */}
            <div 
              style={{ 
                ...flexStyles.flex1,
                ...flexStyles.flexColumn,
                minWidth: 0,
                overflow: 'hidden',
                backgroundColor: '#e52828',
                borderRadius: isSmallScreen ? '10px 0 0 10px' : '0 24px 24px 0'
              }}
            >

              {/* Mobil: stud'ların oturduğu kırmızı bant (düz; geçişi gri alan üst köşesi verir) */}
              {isSmallScreen && (
                <div style={{
                  ...flexStyles.flexShrink0,
                  height: '14px',
                  backgroundColor: '#e52828',
                  marginBottom: '-6px',
                  position: 'relative',
                  zIndex: 1,
                }} />
              )}
              
              {/* Header Wrapper — mobilde gizli (başlık istenmedi) */}
              {!isSmallScreen && (
              <div 
                style={{ 
                  ...flexStyles.flexShrink0,
                  padding: 'clamp(10px, 1.2vw, 14px) clamp(10px, 1.2vw, 14px) clamp(8px, 1vw, 10px) 0',
                  backgroundColor: '#e52828'
                }}
              >
                <div 
                  style={{
                    ...flexStyles.flexCenter,
                    height: 'clamp(44px, 5vh, 56px)',
                    borderRadius: '12px 12px 0px 0px',
                    backgroundColor: '#fff'
                  }}
                >
                  <h2 
                    style={{ 
                      color: '#e52828',
                      fontWeight: 900,
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: 'clamp(18px, 2vw, 24px)',
                      margin: 0
                    }}
                  >
                    {activeCategory.toUpperCase()}
                  </h2>
                </div>
              </div>
              )}

              {/* Gri içerik alanı */}
              <div style={{ ...flexStyles.flex1, ...flexStyles.flexColumn, backgroundColor: '#e8e8e8', overflow: 'hidden', borderRadius: 0, position: 'relative', zIndex: 2 }}>
                
                {/* Gender Bar — GÖRSEL OLARAK GİZLENDİ (gender arkada korunuyor) */}
                {false && !isSmallScreen && (
                <div 
                  style={{
                    backgroundColor: '#0055bf',
                    ...flexStyles.flexCenter,
                    ...flexStyles.flexShrink0,
                    padding: 'clamp(8px, 1vh, 12px) 0',
                    gap: 'clamp(8px, 1vw, 16px)'
                  }}
                >
                  {[
                    { val: 'female', icon: femaleIcon, label: 'Female' },
                    { val: 'male', icon: maleIcon, label: 'Male' },
                    { val: 'child', icon: childIcon, label: 'Child' }
                  ].map((g) => (
                    <button
                      key={g.val}
                      onClick={() => updateCustomization({ gender: g.val })}
                      style={{
                        ...flexStyles.flexCenter,
                        width: 'clamp(100px, 10vw, 160px)',
                        height: 'clamp(32px, 4vh, 38px)',
                        borderRadius: '22px',
                        border: '2px solid #ffffff',
                        gap: 'clamp(4px, 0.5vw, 8px)',
                        backgroundColor: gender === g.val ? '#0055bf' : '#fff',
                        cursor: 'pointer',
                        WebkitTransition: 'all 0.2s',
                        transition: 'all 0.2s'
                      }}
                    >
                      <img 
                        src={g.icon} 
                        alt={g.label} 
                        style={{ 
                          width: 'clamp(16px, 1.5vw, 20px)', 
                          height: 'clamp(16px, 1.5vw, 20px)',
                          filter: gender === g.val 
                            ? 'brightness(0) invert(1)' 
                            : 'brightness(0) invert(18%) sepia(100%) saturate(3000%) hue-rotate(210deg)'
                        }}
                      />
                      <span 
                        style={{
                          fontWeight: 900,
                          fontSize: 'clamp(11px, 1.1vw, 14px)',
                          color: gender === g.val ? '#fff' : '#0055bf'
                        }}
                      >
                        {g.label}
                      </span>
                    </button>
                  ))}
                </div>
                )}

                {/* Content Area */}
                <div style={{ ...flexStyles.flex1, ...flexStyles.flexColumn, overflow: 'hidden', position: 'relative' }}>
                  {activeCategory === 'hair' && (
                    <>
                      {/* Kategori pill bar (sol, kaydırmalı) + Renkler (sağ) — tek satır */}
                      <div
                        style={{
                          ...flexStyles.flexShrink0,
                          display: 'flex',
                          WebkitDisplay: '-webkit-flex',
                          alignItems: 'stretch',
                          gap: isSmallScreen ? '12px' : 'clamp(8px, 1vw, 12px)',
                          backgroundColor: '#0055bf',
                          padding: isSmallScreen ? '4px 12px' : 'clamp(8px, 1vh, 12px) clamp(12px, 1.5vw, 16px)',
                        }}
                      >
                        {/* Sol: kategori pill'leri — yatay kaydırmalı */}
                        <div style={{ position: 'relative', ...flexStyles.flex1, minWidth: 0, overflow: 'hidden', display: 'flex', WebkitDisplay: '-webkit-flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div
                            ref={hairCatScrollRef}
                            className="torso-hscroll"
                            onWheel={(e) => { if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY; }}
                            style={{
                              display: 'flex',
                              WebkitDisplay: '-webkit-flex',
                              flexWrap: 'nowrap',
                              alignItems: 'center',
                              gap: 'clamp(3px, 0.4vw, 6px)',
                              overflowX: 'auto',
                              overflowY: 'hidden',
                              WebkitOverflowScrolling: 'touch',
                              minWidth: 0,
                              paddingTop: isSmallScreen ? '4px' : '6px',
                              paddingBottom: isSmallScreen ? '7px' : '6px',
                              paddingRight: isSmallScreen ? '4px' : 0,
                            }}
                          >
                            {HAIR_CATEGORIES.map((cat) => {
                              const isActive = hairCategory === cat;
                              return (
                                <button
                                  key={cat}
                                  onClick={() => { setHairCategory(cat); setCurrentPage(0); }}
                                  style={{
                                    flexShrink: 0,
                                    backgroundColor: isActive ? '#16a34a' : '#dce6f5',
                                    color: isActive ? '#fff' : '#1a3a6b',
                                    fontWeight: 800,
                                    fontSize: isSmallScreen ? '12px' : 'clamp(12px, 1.2vw, 15px)',
                                    padding: isSmallScreen ? '6px 12px' : '6px clamp(12px, 1.3vw, 18px)',
                                    borderRadius: '8px',
                                    border: isActive ? '2px solid #16a34a' : '2px solid #dce6f5',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {HAIR_CATEGORY_LABELS[cat]}
                                </button>
                              );
                            })}
                          </div>
                          <HScrollIndicator scrollRef={hairCatScrollRef} />
                          <EdgeFade scrollRef={hairCatScrollRef} color="#ddd" />

                          {/* Sağdan açılan beyaz renk paneli — kategorileri örter (web + mobil) */}
                          {showHairColorDrop && hairTextureIndex > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: 0, bottom: 0, left: 0, right: 0,
                              zIndex: 5,
                              backgroundColor: '#fff',
                              borderRadius: '8px',
                              display: 'flex',
                              WebkitDisplay: '-webkit-flex',
                              alignItems: 'center',
                              animation: 'hairColorSlideX 0.22s ease-out',
                              boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.08)',
                              overflow: 'hidden',
                            }}>
                              {/* Renkler — kaydırmalı */}
                              <div style={{
                                ...flexStyles.flex1,
                                display: 'flex',
                                WebkitDisplay: '-webkit-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '0 10px',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                minWidth: 0,
                              }} className="torso-hscroll">
                                {hairColors.map((color, i) => {
                                  const sel = hairColor === i;
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => updateCustomization({ hairColor: i })}
                                      style={{
                                        flexShrink: 0,
                                        boxSizing: 'border-box',
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        border: sel ? '3px solid #16a34a' : '2px solid #999',
                                        background: color, cursor: 'pointer', padding: 0,
                                        boxShadow: sel ? '0 0 5px rgba(22,163,74,0.5)' : 'none',
                                        transition: 'all 0.15s',
                                      }}
                                    />
                                  );
                                })}
                              </div>
                              {/* Kapatma çarpısı — en sağda sabit */}
                              <div style={{
                                ...flexStyles.flexCenter,
                                flexShrink: 0,
                                paddingLeft: '6px', paddingRight: '8px',
                                height: '100%',
                                borderLeft: '1px solid #e0e0e0',
                                backgroundColor: '#fff',
                              }}>
                                <button
                                  onClick={() => setShowHairColorDrop(false)}
                                  title="Kapat"
                                  style={{
                                    ...flexStyles.flexCenter,
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    border: '2px solid #bbb', backgroundColor: '#f1f1f1',
                                    cursor: 'pointer', fontSize: '12px', fontWeight: 800, color: '#666',
                                  }}
                                >✕</button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Ayraç — pill'ler ile renk butonu arasında kısa dikey çizgi */}
                        <div style={{ ...flexStyles.flexCenter, flexShrink: 0, alignSelf: 'stretch' }}>
                            <div style={{
                              width: '2px',
                              height: '22px',
                              backgroundColor: 'rgba(255,255,255,0.55)',
                              borderRadius: '2px',
                            }} />
                        </div>

                        {/* Sağ: saç rengi — her zaman rainbow buton (web + mobil) */}
                        <div style={{ flexShrink: 0, ...flexStyles.flexCenter }}>
                            {/* Rainbow renk butonu — slide panel açar */}
                            <button
                              onClick={() => hairTextureIndex > 0 && setShowHairColorDrop(v => !v)}
                              disabled={hairTextureIndex === 0}
                              title="Hair Color"
                              style={{
                                ...flexStyles.flexCenter,
                                width: isSmallScreen ? '34px' : '38px',
                                height: isSmallScreen ? '34px' : '38px',
                                borderRadius: '50%',
                                border: showHairColorDrop ? '3px solid #16a34a' : '2px solid #fff',
                                cursor: hairTextureIndex === 0 ? 'not-allowed' : 'pointer',
                                opacity: hairTextureIndex === 0 ? 0.4 : 1,
                                padding: 0,
                                background: 'conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00cc00, #0088ff, #8800ff, #ff0088, #ff0000)',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.3), inset 0 0 4px rgba(255,255,255,0.5)',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                              }}
                            >
                              <div style={{
                                ...flexStyles.flexCenter,
                                width: '58%', height: '58%', borderRadius: '50%',
                                backgroundColor: hairColors[hairColor],
                                border: '1.5px solid #fff',
                              }} />
                            </button>
                        </div>
                      </div>

                      {/* Hair Grid with Arrows */}
                      <div style={{ ...flexStyles.flex1, display: 'flex', WebkitDisplay: '-webkit-flex', alignItems: 'stretch', backgroundColor: '#e8e8e8', overflow: 'hidden', minHeight: 0, position: 'relative' }}>

                        
                        {/* Sol Ok */}
                        <button 
                          onClick={goToPrevPage}
                          style={{ 
                            ...flexStyles.flexCenter,
                            ...flexStyles.flexShrink0,
                            fontSize: 'clamp(36px, 4vw, 48px)',
                            width: 'clamp(36px, 4vw, 50px)',
                            color: '#9ca3af',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            WebkitTransition: 'color 0.2s',
                            transition: 'color 0.2s'
                          }}
                        >
                          ‹
                        </button>

                        {/* Hair Grid - 5x4 — HairThumbnail bileşeni ile */}
                        <div style={{ ...flexStyles.flex1, padding: '6px 0 8px 0', overflow: 'hidden', minHeight: 0 }}>
                          <div 
                            style={{
                              display: 'grid',
                              gridTemplateColumns: isSmallScreen ? 'repeat(4, 1fr)' : 'repeat(5, 1fr)',
                              gridTemplateRows: isSmallScreen ? 'repeat(2, 1fr)' : 'repeat(4, minmax(0, 1fr))',
                              gap: 'clamp(4px, 0.5vw, 8px)',
                              height: '100%',
                              overflow: 'visible',
                              padding: '4px',
                            }}
                          >
                            {currentHairItems.map((item) => (
                              <HairThumbnail
  key={item.textureIndex}
  item={item}
  isSelected={hairTextureIndex === item.textureIndex}
  onClick={() => updateCustomization({ hairTextureIndex: item.textureIndex, hairUserSelected: true })}
  flexStyles={flexStyles}
  hairColorIndex={hairColor}
/>
                            ))}
                          </div>
                        </div>

                        {/* Sağ Ok */}
                        <button 
                          onClick={goToNextPage}
                          style={{ 
                            ...flexStyles.flexCenter,
                            ...flexStyles.flexShrink0,
                            fontSize: 'clamp(36px, 4vw, 48px)',
                            width: 'clamp(36px, 4vw, 50px)',
                            color: '#9ca3af',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            WebkitTransition: 'color 0.2s',
                            transition: 'color 0.2s'
                          }}
                        >
                          ›
                        </button>
                      </div>

                      {/* Pagination Dots */}
                      <div 
                        style={{
                          ...flexStyles.flexShrink0,
                          ...flexStyles.flexCenter,
                          gap: isSmallScreen ? '4px' : '10px',
                          padding: isSmallScreen ? '1px 0' : '12px 0',
                          backgroundColor: '#e8e8e8'
                        }}
                      >
                        {Array(hairTotalPages).fill(null).map((_, i) => (
                          <div
                            key={i}
                            onClick={() => goToPage(i)}
                            style={{ 
                              width: isSmallScreen ? (currentPage === i ? '5px' : '4px') : '12px', 
                              height: isSmallScreen ? (currentPage === i ? '5px' : '4px') : '12px',
                              borderRadius: '50%',
                              backgroundColor: currentPage === i ? '#444444' : '#bbbbbb',
                              cursor: 'pointer',
                              WebkitTransition: 'all 0.2s',
                              transition: 'all 0.2s'
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {activeCategory === 'head' && renderHeadContent()}

                  {/* ════════════════════════════════════════════════════════════
                      FACE COLOR PANEL — Head kategorisi aktifken overlay olarak
                      ════════════════════════════════════════════════════════════ */}
                  {activeCategory === 'head' && showFaceColorPanel && (
                    <FaceColorPanel
                      eyebrowColor={eyebrowColor}
                      eyeColor={eyeColor}
                      glassesColor={glassesColor}
                      hasGlasses={glassesTextureIndex > 0}
                      hasEyebrows={true}
                      gender={gender}
                      onEyebrowColorChange={(color) => updateCustomization({ eyebrowColor: color })}
                      onEyeColorChange={(color) => updateCustomization({ eyeColor: color })}
                      onGlassesColorChange={(color) => updateCustomization({ glassesColor: color })}
                      onClose={() => setShowFaceColorPanel(false)}
                    />
                  )}

           {activeCategory === 'torso' && (() => {
                    const isBasic = torsoCategoryTab === 'basic';

                    // Item listesi kategoriye göre farklı şekilde hazırlanıyor
                    let allItems;
                    if (isBasic) {
                      const designs = getBasicDesigns(torsoManifest, gender);
                      allItems = [
                        { isDefault: true },
                        ...designs.map(d => ({ isDesign: true, design_key: d.design_key, variants: d.variants })),
                      ];
                    } else {
                      const filteredTorsos = getTorsoList(torsoManifest, gender, torsoCategoryTab, currentSceneId);
                      allItems = [
                        { isDefault: true },
                        ...filteredTorsos.map(t => ({ isNormal: true, id: t.id, label: t.label })),
                      ];
                    }
                    const torsoTotalPages = Math.max(1, Math.ceil(allItems.length / TORSO_ITEMS_PER_PAGE_RESP));
                    const currentTorsoItems = allItems.slice(
                      torsoPage * TORSO_ITEMS_PER_PAGE_RESP,
                      (torsoPage + 1) * TORSO_ITEMS_PER_PAGE_RESP
                    );

                    return (
                      <>
                             {/* Tab bar + (Basic'te) renk paleti — aynı satır, ayrı scrollable bölmeler */}
                               <div style={{
                          ...flexStyles.flexShrink0,
                          display: 'flex',
                          WebkitDisplay: '-webkit-flex',
                          alignItems: 'stretch',
                          backgroundColor: '#0055bf',
                          padding: isSmallScreen ? '4px 12px' : 'clamp(8px, 1vh, 12px) clamp(8px, 1vw, 12px)',
                          gap: isSmallScreen ? '12px' : 'clamp(8px, 1vw, 12px)',
                          minHeight: isSmallScreen ? 0 : 'clamp(60px, 7vh, 72px)',
                          boxSizing: 'border-box',
                        }}>
          {/* Sol: sub-tab'lar wrapper (slider için position:relative) */}
                          <div style={{
                            position: 'relative',
                            ...flexStyles.flex1,
                            display: 'flex',
                            WebkitDisplay: '-webkit-flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            minWidth: 0,
                            alignSelf: 'stretch',
                            paddingBottom: isSmallScreen ? 0 : 'clamp(6px, 0.8vh, 10px)',
                          }}>
                                    <div
                              ref={tabScrollRef}
                              className="torso-hscroll"
                              onWheel={(e) => {
                                if (e.deltaY !== 0) {
                                  e.currentTarget.scrollLeft += e.deltaY;
                                }
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                WebkitDisplay: '-webkit-flex',
                                flexWrap: 'nowrap',
                                gap: 'clamp(2px, 0.25vw, 4px)',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                WebkitOverflowScrolling: 'touch',
                                alignItems: 'center',
                                minWidth: 0,
                                paddingTop: isSmallScreen ? '4px' : '6px',
                                paddingBottom: isSmallScreen ? '7px' : '6px',
                                paddingRight: isSmallScreen ? '4px' : 0,
                              }}>
                              {TORSO_CATEGORIES.map(cat => {
                                const isActive = torsoCategoryTab === cat.key;
                                const hasItems = tabHasItems(torsoManifest, gender, cat.key, currentSceneId);
                                return (
                                  <button
                                    key={cat.key}
                                    onClick={() => { setTorsoCategoryTab(cat.key); setTorsoPage(0); }}
                                    disabled={!hasItems}
                                        style={{
                                    flexShrink: 0,
                                    backgroundColor: isActive ? '#16a34a' : '#dce6f5',
                                    color: isActive ? '#fff' : (hasItems ? '#1a3a6b' : '#9fb3d9'),
                                    fontWeight: 800,
                                    fontSize: isSmallScreen ? '12px' : 'clamp(12px, 1.2vw, 15px)',
                                    padding: isSmallScreen ? '6px 12px' : '6px clamp(12px, 1.3vw, 18px)',
                                    borderRadius: '8px',
                                    border: isActive ? '2px solid #16a34a' : '2px solid #dce6f5',
                                    cursor: hasItems ? 'pointer' : 'not-allowed',
                                    opacity: hasItems ? 1 : 0.4,
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                  }}
                                  >
                                    {cat.label}
                                  </button>
                                );
                              })}
                            </div>
                                 <HScrollIndicator scrollRef={tabScrollRef} />

                          {/* Mobil: sağdan açılan beyaz renk paneli (sadece Basic) — tab'ları örter */}
                          {isBasic && showTorsoColorDrop && (
                            <div style={{
                              position: 'absolute',
                              top: 0, bottom: 0, left: 0, right: 0,
                              zIndex: 5,
                              backgroundColor: '#fff',
                              borderRadius: '8px',
                              display: 'flex',
                              WebkitDisplay: '-webkit-flex',
                              alignItems: 'center',
                              animation: 'hairColorSlideX 0.22s ease-out',
                              boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.08)',
                              overflow: 'hidden',
                            }}>
                              {/* Renkler — kaydırmalı */}
                              <div style={{
                                ...flexStyles.flex1,
                                display: 'flex',
                                WebkitDisplay: '-webkit-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '0 10px',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                minWidth: 0,
                              }} className="torso-hscroll">
                                {TORSO_BASIC_COLORS.map(c => {
                                  const isActive = torsoBasicColor === c.key;
                                  return (
                                    <button
                                      key={c.key}
                                      onClick={() => {
                                        setTorsoBasicColor(c.key);
                                        if (torsoTextureId) {
                                          const entry = torsoManifest.find(t => t.id === torsoTextureId);
                                          if (entry?.category === 'basic' && entry.design_key) {
                                            const newVariant = torsoManifest.find(t =>
                                              t.category === 'basic' &&
                                              t.design_key === entry.design_key &&
                                              t.color_name === c.key
                                            );
                                            if (newVariant) updateCustomization({ torsoTextureId: newVariant.id });
                                          }
                                        }
                                      }}
                                      title={c.key}
                                      style={{
                                        flexShrink: 0,
                                        boxSizing: 'border-box',
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        border: isActive ? '3px solid #16a34a' : '2px solid #999',
                                        backgroundColor: c.hex, cursor: 'pointer', padding: 0,
                                        boxShadow: isActive ? '0 0 5px rgba(22,163,74,0.5)' : 'none',
                                        transition: 'all 0.15s',
                                      }}
                                    />
                                  );
                                })}
                              </div>
                              {/* Kapatma çarpısı — en sağda sabit */}
                              <div style={{
                                ...flexStyles.flexCenter,
                                flexShrink: 0,
                                paddingLeft: '6px', paddingRight: '8px',
                                height: '100%',
                                borderLeft: '1px solid #e0e0e0',
                                backgroundColor: '#fff',
                              }}>
                                <button
                                  onClick={() => setShowTorsoColorDrop(false)}
                                  title="Kapat"
                                  style={{
                                    ...flexStyles.flexCenter,
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    border: '2px solid #bbb', backgroundColor: '#f1f1f1',
                                    cursor: 'pointer', fontSize: '12px', fontWeight: 800, color: '#666',
                                  }}
                                >✕</button>
                              </div>
                            </div>
                          )}
                          </div>

                          {/* Separator — Basic'te tab ile renk arasında kısa dikey çizgi */}
                          {isBasic && (
                              <div style={{ ...flexStyles.flexCenter, flexShrink: 0, alignSelf: 'stretch' }}>
                                <div style={{
                                  width: '2px',
                                  height: '22px',
                                  backgroundColor: 'rgba(255,255,255,0.55)',
                                  borderRadius: '2px',
                                }} />
                              </div>
                          )}

                          {/* Sağ: renk — Basic'te. Her zaman rainbow buton (web + mobil) */}
                          {isBasic && (
                              <div style={{ flexShrink: 0, ...flexStyles.flexCenter }}>
                                <button
                                  onClick={() => setShowTorsoColorDrop(v => !v)}
                                  title="Renk"
                                  style={{
                                    ...flexStyles.flexCenter,
                                    width: isSmallScreen ? '34px' : '38px',
                                    height: isSmallScreen ? '34px' : '38px',
                                    borderRadius: '50%',
                                    border: showTorsoColorDrop ? '3px solid #16a34a' : '2px solid #fff',
                                    cursor: 'pointer', padding: 0,
                                    background: 'conic-gradient(from 0deg, #ff0000, #ff8800, #ffff00, #00cc00, #0088ff, #8800ff, #ff0088, #ff0000)',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.3), inset 0 0 4px rgba(255,255,255,0.5)',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                  }}
                                >
                                  <div style={{
                                    ...flexStyles.flexCenter,
                                    width: '58%', height: '58%', borderRadius: '50%',
                                    backgroundColor: (TORSO_BASIC_COLORS.find(c => c.key === torsoBasicColor) || TORSO_BASIC_COLORS[0]).hex,
                                    border: '1.5px solid #fff',
                                  }} />
                                </button>
                              </div>
                          )}
                        </div>

                        {/* Grid + oklar */}
                        <div style={{ ...flexStyles.flex1, display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', backgroundColor: '#e8e8e8', minHeight: 0 }}>
                          <button
                            onClick={() => setTorsoPage(p => (p > 0 ? p - 1 : torsoTotalPages - 1))}
                            disabled={torsoTotalPages <= 1}
                            style={{
                              ...flexStyles.flexCenter,
                              ...flexStyles.flexShrink0,
                              fontSize: 'clamp(36px, 4vw, 48px)',
                              width: 'clamp(36px, 4vw, 50px)',
                              color: torsoTotalPages <= 1 ? '#d1d5db' : '#9ca3af',
                              background: 'none',
                              border: 'none',
                              cursor: torsoTotalPages <= 1 ? 'not-allowed' : 'pointer',
                              transition: 'color 0.2s',
                            }}
                          >‹</button>

                                  <div style={{ ...flexStyles.flex1, padding: isSmallScreen ? '6px' : '8px 0', height: '100%' }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: isSmallScreen ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)',
                              gridTemplateRows: isSmallScreen ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                              gap: 'clamp(6px, 0.6vw, 10px)',
                              height: '100%',
                            }}>
                              {currentTorsoItems.map((item) => {
                                if (item.isDefault) {
                                  return (
                                    <TorsoThumbnail
                                      key="default"
                                      isDefault
                                      isSelected={!torsoTextureId}
                                      onClick={() => updateCustomization({ torsoTextureId: null })}
                                      flexStyles={flexStyles}
                                    />
                                  );
                                }
                                if (item.isDesign) {
                                  // Basic design — seçili renge göre variant id
                                  const variantId = item.variants[torsoBasicColor]
                                    ?? item.variants[Object.keys(item.variants)[0]];
                                  const isSelected = torsoTextureId === variantId;
                                  return (
                                    <TorsoThumbnail
                                      key={item.design_key}
                                      torsoId={variantId}
                                      label={item.design_key}
                                      isSelected={isSelected}
                                      onClick={() => updateCustomization({ torsoTextureId: variantId })}
                                      flexStyles={flexStyles}
                                    />
                                  );
                                }
                                // Normal torso
                                return (
                                  <TorsoThumbnail
                                    key={item.id}
                                    torsoId={item.id}
                                    label={item.label}
                                    isSelected={torsoTextureId === item.id}
                                    onClick={() => updateCustomization({ torsoTextureId: item.id })}
                                    flexStyles={flexStyles}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          <button
                            onClick={() => setTorsoPage(p => (p < torsoTotalPages - 1 ? p + 1 : 0))}
                            disabled={torsoTotalPages <= 1}
                            style={{
                              ...flexStyles.flexCenter,
                              ...flexStyles.flexShrink0,
                              fontSize: 'clamp(36px, 4vw, 48px)',
                              width: 'clamp(36px, 4vw, 50px)',
                              color: torsoTotalPages <= 1 ? '#d1d5db' : '#9ca3af',
                              background: 'none',
                              border: 'none',
                              cursor: torsoTotalPages <= 1 ? 'not-allowed' : 'pointer',
                              transition: 'color 0.2s',
                            }}
                          >›</button>
                        </div>

                        {torsoTotalPages > 1 && (
                          <div style={{
                            ...flexStyles.flexShrink0,
                            ...flexStyles.flexCenter,
                            gap: isSmallScreen ? '4px' : '10px',
                            padding: isSmallScreen ? '1px 0' : '12px 0',
                            backgroundColor: '#e8e8e8',
                          }}>
                            {Array.from({ length: torsoTotalPages }).map((_, idx) => (
                              <div
                                key={idx}
                                onClick={() => setTorsoPage(idx)}
                                style={{
                                  width: isSmallScreen ? (idx === torsoPage ? '5px' : '4px') : '12px',
                                  height: isSmallScreen ? (idx === torsoPage ? '5px' : '4px') : '12px',
                                  borderRadius: '50%',
                                  backgroundColor: idx === torsoPage ? '#444' : '#bbb',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}

             {activeCategory === 'legs' && (() => {
                    // Cinsiyet IGNORE — tüm legs (filtresiz, renk paleti yok — flat list)
                    // Aynı id tekrarını önlemek için Map ile uniq
                    const seenLegs = new Set();
                    const filteredLegs = (legsManifest || [])
                      .filter(l => {
                        if (seenLegs.has(l.id)) return false;
                        seenLegs.add(l.id);
                        return true;
                      })
                      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
                    const allItems = [
                      { isDefault: true },
                      ...filteredLegs.map(l => ({ isNormal: true, id: l.id, label: l.color_name || l.id })),
                    ];

                    return (
                      <>
                        {/* Grid (default + tüm renkli legs) */}
                        <div style={{ ...flexStyles.flex1, display: 'flex', WebkitDisplay: '-webkit-flex', alignItems: 'center', backgroundColor: '#e8e8e8', minHeight: 0 }}>
                          <div style={{ width: isSmallScreen ? '6px' : 'clamp(36px, 4vw, 50px)', flexShrink: 0 }} />
                          <div style={{ ...flexStyles.flex1, padding: isSmallScreen ? '6px' : '8px 6px', height: '100%', overflowY: isSmallScreen ? 'auto' : 'hidden' }} className={isSmallScreen ? 'torso-hscroll' : undefined}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: isSmallScreen ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)',
                              gridTemplateRows: isSmallScreen ? undefined : 'repeat(3, 1fr)',
                              gridAutoRows: isSmallScreen ? 'minmax(0, 1fr)' : undefined,
                              gap: 'clamp(6px, 0.6vw, 10px)',
                              height: isSmallScreen ? 'auto' : '100%',
                              padding: isSmallScreen ? '2px' : '2px',
                            }}>
                              {allItems.map((item) => {
                                if (item.isDefault) {
                                  return (
                                    <LegsThumbnail
                                      key="default"
                                      isDefault
                                      isSelected={!legTextureId}
                                      onClick={() => updateCustomization({ legTextureId: null })}
                                      flexStyles={flexStyles}
                                    />
                                  );
                                }
                                return (
                                  <LegsThumbnail
                                    key={item.id}
                                    legsId={item.id}
                                    label={item.label}
                                    isSelected={legTextureId === item.id}
                                    onClick={() => updateCustomization({ legTextureId: item.id })}
                                    flexStyles={flexStyles}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ width: isSmallScreen ? '6px' : 'clamp(36px, 4vw, 50px)', flexShrink: 0 }} />
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Footer Buttons */}
                <div 
                  style={{
                    ...flexStyles.flexCenter,
                    ...flexStyles.flexShrink0,
                    padding: isSmallScreen ? '5px 0' : 'clamp(8px, 1vh, 12px) 0',
                    backgroundColor: '#e8e8e8',
                    gap: isSmallScreen ? '12px' : 'clamp(12px, 2vw, 32px)'
                  }}
                >
                  <button 
                    onMouseEnter={() => setResetHover(true)} 
                    onMouseLeave={() => setResetHover(false)} 
                    onClick={handleReset}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      WebkitTransition: 'transform 0.2s',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <img 
                      src={resetHover ? resetBtnHoverImg : resetBtnImg} 
                      alt="Reset" 
                      style={{ height: isSmallScreen ? '34px' : 'clamp(40px, 5vh, 60px)' }} 
                    />
                  </button>

                  <button 
                    onMouseEnter={() => setSurpriseHover(true)} 
                    onMouseLeave={() => setSurpriseHover(false)} 
                    onClick={handleSurpriseMe}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      WebkitTransition: 'transform 0.2s',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <img 
                      src={surpriseHover ? surpriseBtnHoverImg : surpriseBtnImg} 
                      alt="Surprise" 
                      style={{ height: isSmallScreen ? '34px' : 'clamp(40px, 5vh, 60px)' }} 
                    />
                  </button>

                  <button 
                    onMouseEnter={() => setSaveHover(true)} 
                    onMouseLeave={() => setSaveHover(false)} 
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: isSaving ? 0.5 : 1,
                      WebkitTransition: 'transform 0.2s',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <img 
                      src={saveHover ? saveBtnHoverImg : saveBtnImg} 
                      alt="Save" 
                      style={{ height: isSmallScreen ? '34px' : 'clamp(40px, 5vh, 60px)' }} 
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCustomizationPage;