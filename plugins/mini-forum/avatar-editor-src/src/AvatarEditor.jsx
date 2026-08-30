// src/AvatarEditor.jsx
// Head-only popup version of CharacterCustomizationPage.jsx
//
// Removed from game version:
//   - Mini 1 / Mini 2 tabs (single avatar)
//   - Torso, Legs categories
//   - Quick-access buttons
//   - Scene id / torso manifest / legs manifest
//   - sessionStorage + game navigate
//
// Kept:
//   - Hair (Simple/Expressive + 7 colors + 5x4 grid pagination + HairThumbnail rotation)
//   - Head (Eyes/Glasses sub-tabs + Mouth/Facial Hair sub-tabs + Face Color Panel)
//   - Surprise Me / Reset / Save buttons
//   - Front/Back toggle
//
// Save flow:
//   1. Capture canvas screenshot via canvas.toDataURL('image/png')
//   2. POST { config, image } to ajax_url with action=mf_avatar_save
//   3. Call onSaveSuccess(savedData) → WordPress reloads avatar imgs

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LegoHead from './LegoHead.jsx';
import {
  DEFAULT_HAIR,
  TERS_YONLU_SACLAR,
  HAIR_CATEGORIES,
  HAIR_CATEGORY_LABELS,
  getAllHairItems,
  getHairItemsByCategory,
} from './HairModels.jsx';
import { generateFaceItemsByCategory, FACE_CATEGORIES, FACE_CATEGORY_LABELS, FACE_CATEGORY_PARTS } from './FaceModel.jsx';

// ─── Color palettes (same as game) ─────────────────────────────────────────
const HAIR_COLORS = [
  '#4D1F00', '#834400', '#E7CA63', '#000000', '#A8A8A8', '#F4F4F4', '#CC4422',
];
const EYEBROW_COLORS = [
  '#000000', '#A8A8A8', '#F4F4F4', '#4D1F00', '#834400', '#CC4422',
];
const EYE_COLORS = [
  '#000000', '#5A3825', '#8B5A2B', '#4E8B3A', '#4682B4',
];
const GLASSES_COLORS = [
  '#1C1C1C', '#6B3E26', '#274C9B', '#D62828', '#2E7D32',
  '#FF6F00', '#EC4899', '#8E63C7', '#B0B0B0',
];

const TERS_ACI = { front: 'back', back: 'front', left: 'right', right: 'left' };

const getMatchingEyebrowColor = (hairColorIndex) => {
  if (hairColorIndex === 2) return '#834400';
  return HAIR_COLORS[hairColorIndex];
};

const ITEMS_PER_PAGE = 8;
const HEAD_ITEMS_PER_PAGE = 10;
const HAIR_ANGLES = ['front', 'right', 'back', 'left'];
const HAIR_ANGLE_INTERVAL = 700;

// ─── Hair list — now gender-agnostic, category-aware ──────────────────────
// All 139 active hairs in a single flat list (bald sentinel + 138 hair items).
// See HairModels.jsx → getAllHairItems() / getHairItemsByCategory().

function getRandomHairFromAll() {
  // Pull a random non-bald hair from the full pool.
  // We import the full list lazily because it depends on glbBase (window var).
  const all = getAllHairItems().filter(h => h.type !== 'bald');
  if (all.length === 0) return 0;
  return all[Math.floor(Math.random() * all.length)].textureIndex;
}

// ─── HairThumbnail (same rotation behavior as game) ────────────────────────
const HairThumbnail = React.memo(({ item, isSelected, onClick, hairColorIndex }) => {
  const [angleIdx, setAngleIdx] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const intervalRef = useRef(null);
  const touchTimerRef = useRef(null);
  const isBald = item.type === 'bald';
  const hasAngles = !!item.basePath;

  const startRotation = useCallback(() => {
    if (!hasAngles) return;
    setIsRotating(true);
    setAngleIdx(0);
    intervalRef.current = setInterval(() => {
      setAngleIdx(prev => (prev + 1) % HAIR_ANGLES.length);
    }, HAIR_ANGLE_INTERVAL);
  }, [hasAngles]);

  const stopRotation = useCallback(() => {
    setIsRotating(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
    setAngleIdx(0);
  }, []);

  const handleTouchStart = useCallback(() => {
    if (!hasAngles) return;
    touchTimerRef.current = setTimeout(() => startRotation(), 300);
  }, [hasAngles, startRotation]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  }, []);

  const isTers = TERS_YONLU_SACLAR.has(item.textureIndex);
  const rawAngle = isRotating ? HAIR_ANGLES[angleIdx] : 'front';
  const angle = isTers ? TERS_ACI[rawAngle] : rawAngle;
  const currentImg = hasAngles ? `${item.basePath}_${angle}_${hairColorIndex}.png` : null;

  // Debug ID badge — visible only when classification work is in progress.
  // Activate via: ?showids=1 in URL  OR  localStorage.mfShowIds = '1'
  const showIds = (typeof window !== 'undefined') && (
    (window.location && window.location.search.indexOf('showids=1') !== -1) ||
    (window.localStorage && window.localStorage.getItem('mfShowIds') === '1')
  );

  if (isBald) {
    return (
      <button onClick={onClick} className="mfae-thumb mfae-thumb-bald" data-selected={isSelected ? '1' : '0'}>
        <div className="mfae-thumb-bald-inner"><span>Bald</span></div>
        {showIds && <div className="mfae-thumb-id-badge">{item.textureIndex}</div>}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={startRotation}
      onMouseLeave={stopRotation}
      onTouchStart={handleTouchStart}
      onTouchEnd={stopRotation}
      onTouchCancel={stopRotation}
      className="mfae-thumb"
      data-selected={isSelected ? '1' : '0'}
      data-rotating={isRotating ? '1' : '0'}
    >
      <img src={currentImg} alt={item.label} onError={(e) => { e.target.style.display = 'none'; }} />
      {hasAngles && isRotating && (
        <div className="mfae-thumb-angle-label">{HAIR_ANGLES[angleIdx].charAt(0).toUpperCase()}</div>
      )}
      {showIds && <div className="mfae-thumb-id-badge">{item.textureIndex}</div>}
    </button>
  );
});
HairThumbnail.displayName = 'HairThumbnail';

// ─── Face Color Panel (rainbow button overlay) ─────────────────────────────
const FaceColorPanel = React.memo(({
  eyebrowColor, eyeColor, glassesColor,
  hasGlasses,
  onEyebrowColorChange, onEyeColorChange, onGlassesColorChange,
  onClose,
}) => {
  const renderColorRow = (label, colors, selected, onChange) => (
    <div className="mfae-color-row">
      <div className="mfae-color-row-label">{label}</div>
      <div className="mfae-color-swatches">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            data-selected={selected === c ? '1' : '0'}
            className="mfae-color-swatch"
            title={c}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="mfae-face-color-panel">
      <div className="mfae-face-color-header">
        <div>
          <div className="mfae-face-color-title">Customize Your Mini</div>
          <div className="mfae-face-color-sub">Choose colors that feel right for your Mini.</div>
        </div>
        <button onClick={onClose} className="mfae-face-color-close" aria-label="Close">✕</button>
      </div>
      <div className="mfae-face-color-body">
        <div className="mfae-color-card">
          {renderColorRow('Brows & Lashes', EYEBROW_COLORS, eyebrowColor, onEyebrowColorChange)}
        </div>
        <div className="mfae-color-card">
          {renderColorRow('Eyes', EYE_COLORS, eyeColor, onEyeColorChange)}
        </div>
        <div className="mfae-color-card" data-disabled={hasGlasses ? '0' : '1'}>
          {renderColorRow(
            hasGlasses ? 'Glasses' : 'Glasses (select glasses first)',
            GLASSES_COLORS,
            glassesColor,
            hasGlasses ? onGlassesColorChange : () => {}
          )}
        </div>
      </div>
    </div>
  );
});
FaceColorPanel.displayName = 'FaceColorPanel';

// ─── AvatarEditor — main component ─────────────────────────────────────────
//
// Gender system was removed — every user sees all 139 hair styles split into
// 7 categories (short/medium/long/tied/curly/fun/bun). Face parts (eyes,
// glasses, mouth, facialhair) show every variant from every gender bucket
// in a flat 'all' list. The default hair on first open is bald (textureIndex 0),
// not a per-gender default.
const AvatarEditor = ({
  initialConfig,
  ajaxUrl,
  nonce,
  onSaveSuccess,
  onClose,
  torsoId = '',
  role = 'Family',
}) => {
  // Initial state — restored from saved config or defaults
  const initial = initialConfig || {};
  // Hair category: 'short', 'medium', 'long', 'tied', 'curly', 'fun', 'bun'
  // The 'Bald' option is just a sentinel at the top of every category — not a
  // category of its own.
  const [hairCategory, setHairCategory] = useState(initial.hairCategory || 'short');
  const [hairColor, setHairColor] = useState(typeof initial.hairColor === 'number' ? initial.hairColor : 0);
  const [hairTextureIndex, setHairTextureIndex] = useState(
    typeof initial.hairTextureIndex === 'number' ? initial.hairTextureIndex : DEFAULT_HAIR
  );
  const [hairUserSelected, setHairUserSelected] = useState(!!initialConfig);

  // ── Face state ─────────────────────────────────────────────────────────
  // Old model: 4 indices (eye, glasses, mouth, facialhair) + 2 sub-tabs.
  // New model: 7 independent indices, one per visual face category. Each is
  // the position of the selected item within that category's list (0 = default).
  // The user picks ONE eye-slot item (eyes OR lashes OR glasses OR lashes-glasses)
  // and ONE mouth-slot item (mouth OR lips OR beard) — we enforce that by
  // tracking which sub-tab is "active" for each slot.
  const initialFaceSelections = initial.faceSelections || {};
  const [faceSelections, setFaceSelections] = useState({
    eyes:             typeof initialFaceSelections.eyes             === 'number' ? initialFaceSelections.eyes             : 0,
    lashes:           typeof initialFaceSelections.lashes           === 'number' ? initialFaceSelections.lashes           : 0,
    glasses:          typeof initialFaceSelections.glasses          === 'number' ? initialFaceSelections.glasses          : 0,
    'lashes-glasses': typeof initialFaceSelections['lashes-glasses']=== 'number' ? initialFaceSelections['lashes-glasses']: 0,
    mouth:            typeof initialFaceSelections.mouth            === 'number' ? initialFaceSelections.mouth            : 0,
    lips:             typeof initialFaceSelections.lips             === 'number' ? initialFaceSelections.lips             : 0,
    beard:            typeof initialFaceSelections.beard            === 'number' ? initialFaceSelections.beard            : 0,
  });
  // Which face sub-tab is currently being browsed (also determines which
  // selection is "active" in its slot — eye slot or mouth slot).
  const [activeFaceCategory, setActiveFaceCategory] = useState(initial.activeFaceCategory || 'eyes');
  const [activeEyeSlot, setActiveEyeSlot]     = useState(initial.activeEyeSlot     || 'eyes');   // 'eyes'|'lashes'|'glasses'|'lashes-glasses'
  const [activeMouthSlot, setActiveMouthSlot] = useState(initial.activeMouthSlot   || 'mouth');  // 'mouth'|'lips'|'beard'
  const [facePage, setFacePage] = useState(0);

  const [eyeColor, setEyeColor] = useState(initial.eyeColor || '#000000');
  const [eyebrowColor, setEyebrowColor] = useState(initial.eyebrowColor || '#000000');
  const [glassesColor, setGlassesColor] = useState(initial.glassesColor || '#1C1C1C');

  const [activeCategory, setActiveCategory] = useState('hair');
  const [currentPage, setCurrentPage] = useState(0);
  const [showFaceColorPanel, setShowFaceColorPanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [zoomMode, setZoomMode] = useState('preview');
  const [saveError, setSaveError] = useState(null);

  // Items per category (memoised — each category's full item list never changes)
  const faceItemsByCat = useMemo(() => {
    const out = {};
    for (const cat of FACE_CATEGORIES) {
      out[cat] = generateFaceItemsByCategory(cat);
    }
    return out;
  }, []);

  // Convenience flags
  const EYE_SLOT_CATS   = ['eyes', 'lashes', 'glasses', 'lashes-glasses'];
  const MOUTH_SLOT_CATS = ['mouth', 'lips', 'beard'];
  const hasBeard = faceItemsByCat.beard && faceItemsByCat.beard.length > 1;

  // Hair items for the currently selected category.
  // Each category list starts with a bald sentinel so the user can always
  // un-select hair from any category tab.
  const filteredHairItems = useMemo(
    () => getHairItemsByCategory(hairCategory),
    [hairCategory]
  );
  const hairTotalPages = Math.max(1, Math.ceil(filteredHairItems.length / ITEMS_PER_PAGE));

  // When the user clicks a hair, snap to that page. When the user switches
  // category, jump to page 0 (handled by setHairCategory's onClick handler).
  useEffect(() => {
    const idx = filteredHairItems.findIndex(h => h.textureIndex === hairTextureIndex);
    if (idx >= 0) setCurrentPage(Math.floor(idx / ITEMS_PER_PAGE));
  }, [hairTextureIndex, filteredHairItems]);

  const currentHairItems = filteredHairItems.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // ── Active model names (passed to LegoHead) ──────────────────────────────
  // The eye slot renders ONE of: eyes, lashes, glasses, lashes-glasses.
  // The mouth slot renders ONE of: mouth, lips, beard.
  // Whichever sub-tab is active in each slot decides what gets rendered.
  const activeEyeModelName = useMemo(() => {
    const idx = faceSelections[activeEyeSlot];
    if (!idx || idx <= 0) return null;
    const list = faceItemsByCat[activeEyeSlot] || [];
    return list[idx]?.modelName || null;
  }, [activeEyeSlot, faceSelections, faceItemsByCat]);

  const activeMouthModelName = useMemo(() => {
    const idx = faceSelections[activeMouthSlot];
    if (!idx || idx <= 0) return null;
    const list = faceItemsByCat[activeMouthSlot] || [];
    return list[idx]?.modelName || null;
  }, [activeMouthSlot, faceSelections, faceItemsByCat]);

  // Currently-displayed grid (depends on which sub-tab the user is browsing)
  const currentFaceList = faceItemsByCat[activeFaceCategory] || [];
  const faceTotalPages = Math.max(1, Math.ceil(currentFaceList.length / HEAD_ITEMS_PER_PAGE));
  const currentFaceItems = currentFaceList.slice(
    facePage * HEAD_ITEMS_PER_PAGE,
    (facePage + 1) * HEAD_ITEMS_PER_PAGE
  );

  // Snap to the page containing the current selection when sub-tab changes
  useEffect(() => {
    const sel = faceSelections[activeFaceCategory] || 0;
    setFacePage(Math.floor(sel / HEAD_ITEMS_PER_PAGE));
  }, [activeFaceCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Customization snapshot (to LegoHead)
  // gender: always 'male' here — only used as fallback for the default face
  // mesh inside FaceModel; we no longer track user gender. The actual eye/
  // mouth/glasses items routed to LegoHead carry the original gender in
  // their modelName path (e.g. 'eyes/f_head_eye_glb/...').
  const customization = useMemo(() => ({
    gender: 'male',
    hairColor,
    hairTextureIndex,
    eyeModelName: activeEyeModelName,
    mouthModelName: activeMouthModelName,
    eyeColor,
    eyebrowColor,
    glassesColor,
  }), [hairColor, hairTextureIndex, activeEyeModelName, activeMouthModelName, eyeColor, eyebrowColor, glassesColor]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setHairCategory('short');
    setHairColor(0);
    setHairTextureIndex(DEFAULT_HAIR);
    setHairUserSelected(false);
    setFaceSelections({
      eyes: 0, lashes: 0, glasses: 0, 'lashes-glasses': 0,
      mouth: 0, lips: 0, beard: 0,
    });
    setActiveEyeSlot('eyes');
    setActiveMouthSlot('mouth');
    setActiveFaceCategory('eyes');
    setFacePage(0);
    setEyeColor('#000000');
    setEyebrowColor('#000000');
    setGlassesColor('#1C1C1C');
    setActiveCategory('hair');
    setCurrentPage(0);
    setShowFaceColorPanel(false);
  }, []);

  const handleSurpriseMe = useCallback(() => {
    const newHairColor = Math.floor(Math.random() * HAIR_COLORS.length);
    // Pick a random non-bald hair, then derive its category for the tab UI.
    const newHairIdx = getRandomHairFromAll();
    const allItems = getAllHairItems();
    const pickedItem = allItems.find(h => h.textureIndex === newHairIdx);
    const newHairCat = (pickedItem && pickedItem.category && pickedItem.category !== 'bald')
      ? pickedItem.category
      : 'short';

    // Eye slot — pick one of the four face categories at random, then a random
    // item from that list. If 'default' (index 0) is picked, none rendered.
    const eyeSlotChoices = ['eyes', 'lashes', 'glasses', 'lashes-glasses'];
    const eyeSlot = eyeSlotChoices[Math.floor(Math.random() * eyeSlotChoices.length)];
    const eyeListLen = faceItemsByCat[eyeSlot]?.length || 1;
    const eyeIdx = Math.floor(Math.random() * eyeListLen);

    // Mouth slot — pick mouth/lips/beard
    const mouthSlotChoices = hasBeard ? ['mouth', 'lips', 'beard'] : ['mouth', 'lips'];
    const mouthSlot = mouthSlotChoices[Math.floor(Math.random() * mouthSlotChoices.length)];
    const mouthListLen = faceItemsByCat[mouthSlot]?.length || 1;
    const mouthIdx = Math.floor(Math.random() * mouthListLen);

    const useGlasses = eyeSlot === 'glasses' || eyeSlot === 'lashes-glasses';

    setHairCategory(newHairCat);
    setHairColor(newHairColor);
    setHairTextureIndex(newHairIdx);
    setHairUserSelected(true);
    setFaceSelections(prev => ({
      ...prev,
      [eyeSlot]:   eyeIdx,
      [mouthSlot]: mouthIdx,
    }));
    setActiveEyeSlot(eyeSlot);
    setActiveMouthSlot(mouthSlot);
    setEyeColor(EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)]);
    setEyebrowColor(getMatchingEyebrowColor(newHairColor));
    setGlassesColor(useGlasses ? GLASSES_COLORS[Math.floor(Math.random() * GLASSES_COLORS.length)] : '#1C1C1C');
  }, [faceItemsByCat, hasBeard]);

  // ── Resize+compress canvas screenshot ──────────────────────────────
  // Source canvas may be 1500×1500+ at retina dpr. Avatar is shown at max
  // 120×120 in the UI, so we downscale to 480×480 (4× retina headroom) and
  // keep PNG (transparent background needed). This usually yields ~80–200KB.
  const downscaleCanvasToDataUrl = useCallback((sourceCanvas, maxSize = 480) => {
    const sw = sourceCanvas.width;
    const sh = sourceCanvas.height;
    if (!sw || !sh) return sourceCanvas.toDataURL('image/png');

    // Pick scale so the longest side fits maxSize (preserves aspect)
    const scale = Math.min(1, maxSize / Math.max(sw, sh));
    const dw = Math.round(sw * scale);
    const dh = Math.round(sh * scale);

    const off = document.createElement('canvas');
    off.width = dw;
    off.height = dh;
    const ctx = off.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, dw, dh);
    return off.toDataURL('image/png');
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // No zoom switching — what you see in preview is what gets saved.
      // (The camera is already framed correctly; switching to a tighter
      // mode previously cropped arms/hair, which was unwanted.)

      const canvas = document.querySelector('.mfae-canvas-host canvas');
      if (!canvas) throw new Error('Canvas not found');
      const dataUrl = downscaleCanvasToDataUrl(canvas, 480);

      const approxBytes = Math.ceil((dataUrl.length - 22) * 3 / 4);
      if (approxBytes > 1.5 * 1024 * 1024) {
        throw new Error('Screenshot too large to upload (>1.5MB). Please try again.');
      }

      const config = {
        hairCategory,
        hairColor,
        hairTextureIndex,
        // Face selections — new model (per-category indices)
        faceSelections,
        activeEyeSlot,
        activeMouthSlot,
        activeFaceCategory,
        // Computed model names (LegoHead uses these at render time)
        eyeModelName: activeEyeModelName,
        mouthModelName: activeMouthModelName,
        // Colors
        eyeColor,
        eyebrowColor,
        glassesColor,
      };

      const formData = new FormData();
      formData.append('action', 'mf_avatar_save');
      formData.append('nonce', nonce);
      formData.append('config', JSON.stringify(config));
      formData.append('image', dataUrl);

      const response = await fetch(ajaxUrl, { method: 'POST', body: formData, credentials: 'same-origin' });

      // 413 = nginx-level upload limit hit before WordPress even sees the request.
      // Surface a useful message so admins know to bump client_max_body_size.
      if (response.status === 413) {
        throw new Error('Server upload limit too low (413). Ask your host to raise client_max_body_size to 10M.');
      }

      const result = await response.json();

      if (!result || !result.success) {
        throw new Error((result && result.data && result.data.message) || 'Save failed');
      }

      if (typeof onSaveSuccess === 'function') {
        onSaveSuccess(result.data);
      }
    } catch (err) {
      console.error('[AvatarEditor] Save failed:', err);
      setSaveError(err.message || 'Could not save avatar.');
    } finally {
      setIsSaving(false);
    }
  }, [
    hairCategory, hairColor, hairTextureIndex,
    faceSelections, activeEyeSlot, activeMouthSlot, activeFaceCategory,
    activeEyeModelName, activeMouthModelName,
    eyeColor, eyebrowColor, glassesColor,
    nonce, ajaxUrl, onSaveSuccess, downscaleCanvasToDataUrl,
  ]);

  // ── Face sub-tab change handler ──────────────────────────────────────────
  // When the user clicks a sub-tab, also update which slot ("eye" or "mouth")
  // is now active. Selecting eg "lashes" means the lashes pick is what's rendered
  // and "eyes", "glasses", "lashes-glasses" are ignored for the eye slot.
  const setFaceCategoryClean = useCallback((cat) => {
    setActiveFaceCategory(cat);
    setFacePage(0);
    if (EYE_SLOT_CATS.includes(cat)) {
      setActiveEyeSlot(cat);
    } else if (MOUTH_SLOT_CATS.includes(cat)) {
      setActiveMouthSlot(cat);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setFaceIndex = useCallback((idx) => {
    setFaceSelections(prev => ({ ...prev, [activeFaceCategory]: idx }));
    // Also ensure this category becomes "active" in its slot so the result is
    // visible immediately (clicking eyes' thumbnail while "lashes" was active
    // before would otherwise leave lashes rendered).
    if (EYE_SLOT_CATS.includes(activeFaceCategory)) {
      setActiveEyeSlot(activeFaceCategory);
    } else if (MOUTH_SLOT_CATS.includes(activeFaceCategory)) {
      setActiveMouthSlot(activeFaceCategory);
    }
  }, [activeFaceCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // List of sub-tabs to display in the Head bar. 'beard' only appears if the
  // facialhair GLB count is non-zero (defensive — the source list could become
  // empty in the future).
  const faceSubTabs = useMemo(() => {
    return FACE_CATEGORIES
      .filter(c => c !== 'beard' || hasBeard)
      .map(c => ({ key: c, label: FACE_CATEGORY_LABELS[c] }));
  }, [hasBeard]);

  const rainbowButton = (
    <button
      onClick={() => setShowFaceColorPanel(p => !p)}
      title="Face Colors"
      className="mfae-rainbow-btn"
      data-active={showFaceColorPanel ? '1' : '0'}
    >
      <div className="mfae-rainbow-inner">🎨</div>
    </button>
  );

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="mfae-root">
      {/* Left: 3D preview */}
      <div className="mfae-left">
        <div className="mfae-canvas-host">
          <LegoHead customization={customization} zoomMode={zoomMode} torsoId={torsoId} />
        </div>
      </div>

      {/* Right: customization panel — tab bar on top, panel below */}
      <div className="mfae-right">
        {/* Horizontal tab bar replaces the old left sidebar */}
        <div className="mfae-tabs" role="tablist">
          {[
            { key: 'hair', label: 'Hair' },
            { key: 'head', label: 'Head' },
          ].map(cat => (
            <button
              key={cat.key}
              role="tab"
              onClick={() => { setActiveCategory(cat.key); setCurrentPage(0); }}
              className="mfae-tab"
              data-active={activeCategory === cat.key ? '1' : '0'}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Panel — title + body */}
        <div className="mfae-panel">
          <div className="mfae-panel-title">
            <span>{activeCategory === 'hair' ? 'Choose Your Hair' : 'Build Your Face'}</span>
          </div>

          <div className="mfae-panel-body">
            {activeCategory === 'hair' && (
              <>
                {/* Category tabs + color picker */}
                <div className="mfae-hair-controls">
                  <div className="mfae-hair-types">
                    {HAIR_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setHairCategory(cat); setCurrentPage(0); }}
                        className="mfae-pill"
                        data-active={hairCategory === cat ? '1' : '0'}
                      >{HAIR_CATEGORY_LABELS[cat]}</button>
                    ))}
                  </div>
                  <div className="mfae-hair-colors">
                    {HAIR_COLORS.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => hairTextureIndex > 0 && setHairColor(i)}
                          disabled={hairTextureIndex === 0}
                          style={{ backgroundColor: c }}
                          className="mfae-color-dot"
                          data-active={hairColor === i && hairTextureIndex > 0 ? '1' : '0'}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hair grid */}
                  <div className="mfae-grid-wrap">
                    <button onClick={() => setCurrentPage(p => p > 0 ? p - 1 : hairTotalPages - 1)} className="mfae-arrow">‹</button>
                    <div className="mfae-grid mfae-grid-hair">
                      {currentHairItems.map(item => (
                        <HairThumbnail
                          key={item.textureIndex}
                          item={item}
                          isSelected={hairTextureIndex === item.textureIndex}
                          onClick={() => { setHairTextureIndex(item.textureIndex); setHairUserSelected(true); }}
                          hairColorIndex={hairColor}
                        />
                      ))}
                    </div>
                    <button onClick={() => setCurrentPage(p => p < hairTotalPages - 1 ? p + 1 : 0)} className="mfae-arrow">›</button>
                  </div>

                  {hairTotalPages > 1 && (
                    <div className="mfae-dots">
                      {Array.from({ length: hairTotalPages }).map((_, i) => (
                        <span key={i} onClick={() => setCurrentPage(i)} data-active={i === currentPage ? '1' : '0'} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeCategory === 'head' && (
                <div className="mfae-head-section">
                  {/* 7-pill sub-tab bar (with rainbow button at the end) */}
                  <div className="mfae-subtab-bar">
                    {faceSubTabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setFaceCategoryClean(tab.key)}
                        className="mfae-subtab"
                        data-active={activeFaceCategory === tab.key ? '1' : '0'}
                      >
                        {tab.label}
                      </button>
                    ))}
                    {rainbowButton}
                  </div>

                  {/* Grid for the active sub-tab */}
                  <div className="mfae-grid-wrap">
                    <button
                      onClick={() => setFacePage(p => p > 0 ? p - 1 : faceTotalPages - 1)}
                      disabled={faceTotalPages <= 1}
                      className="mfae-arrow"
                    >‹</button>

                    <div className="mfae-grid mfae-grid-head">
                      {currentFaceItems.map((item, i) => {
                        const globalIndex = facePage * HEAD_ITEMS_PER_PAGE + i;
                        const isSelected = (faceSelections[activeFaceCategory] || 0) === globalIndex;
                        const isDefault = item.type === 'default';
                        return (
                          <button
                            key={globalIndex}
                            onClick={() => setFaceIndex(globalIndex)}
                            className="mfae-thumb"
                            data-selected={isSelected ? '1' : '0'}
                          >
                            {isDefault ? (
                              <div className="mfae-thumb-default"><span>Default</span></div>
                            ) : (
                              <img src={item.img} alt={item.label} onError={(e) => { e.target.style.display = 'none'; }} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setFacePage(p => p < faceTotalPages - 1 ? p + 1 : 0)}
                      disabled={faceTotalPages <= 1}
                      className="mfae-arrow"
                    >›</button>
                  </div>

                  {faceTotalPages > 1 && (
                    <div className="mfae-dots">
                      {Array.from({ length: faceTotalPages }).map((_, idx) => (
                        <span key={idx} onClick={() => setFacePage(idx)} data-active={idx === facePage ? '1' : '0'} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeCategory === 'head' && showFaceColorPanel && (
                <FaceColorPanel
                  eyebrowColor={eyebrowColor}
                  eyeColor={eyeColor}
                  glassesColor={glassesColor}
                  hasGlasses={activeEyeSlot === 'glasses' || activeEyeSlot === 'lashes-glasses'}
                  onEyebrowColorChange={setEyebrowColor}
                  onEyeColorChange={setEyeColor}
                  onGlassesColorChange={setGlassesColor}
                  onClose={() => setShowFaceColorPanel(false)}
                />
              )}
            </div>

            {/* Footer buttons */}
            <div className="mfae-footer">
              <button onClick={handleReset} className="mfae-fbtn mfae-fbtn-reset" disabled={isSaving}>Reset</button>
              <button onClick={handleSurpriseMe} className="mfae-fbtn mfae-fbtn-surprise" disabled={isSaving}>Surprise Me</button>
              <button onClick={handleSave} className="mfae-fbtn mfae-fbtn-save" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {saveError && (
              <div className="mfae-error">{saveError}</div>
            )}
          </div>
        </div>
      </div>
    );
};

export default AvatarEditor;
