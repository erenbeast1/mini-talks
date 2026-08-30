// main.jsx — WordPress entry point
//
// Build output exposes window.MFAvatarEditor with:
//   - mount(rootEl, opts)   → mounts the React editor into rootEl
//   - unmount()             → unmounts the editor
//   - exportFace(config, o) → v3.05: renders a face sprite pack for the device
//
// opts (passed in from WordPress):
//   {
//     initialConfig:  object | null  (saved config to restore)
//     glbBase:        string         (base URL for GLB assets)
//     ajaxUrl:        string         (admin-ajax.php)
//     nonce:          string
//     torsoId:        string         (e.g. '02_red', '03_blue', '04_green', '05_orange')
//     role:           string         (e.g. 'Family', 'Expert', 'Volunteer', 'Talk-Spot')
//     onSaveSuccess:  fn(savedData)
//     onClose:        fn()
//   }
//
// Gender system was removed in v3.00 — every user now sees the full hair pool
// split into 7 categories, and face items combined across former gender buckets.

import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import AvatarEditor from './AvatarEditor.jsx';
import LegoHead from './LegoHead.jsx';
import './AvatarEditor.css';

// CORS — when GLB/PNG assets are served from a different origin (e.g. game
// site mini-talks.com while forum is on mini-talks.org), Three.js must mark
// requests as anonymous CORS, otherwise the WebGL canvas becomes "tainted"
// and canvas.toDataURL() (used for the avatar screenshot) silently fails.
// Setting this once on the default LoadingManager covers all loaders.
THREE.DefaultLoadingManager.setURLModifier((url) => url);
if (typeof window !== 'undefined') {
  // useGLTF (Drei) creates GLTFLoader instances; we set crossOrigin globally
  // by patching the prototype so every loader inherits it.
  const proto = THREE.Loader && THREE.Loader.prototype;
  if (proto && !proto.crossOrigin) proto.crossOrigin = 'anonymous';
}

let currentRoot = null;
let currentEl = null;

function mount(rootEl, opts) {
  if (!rootEl) {
    console.error('[MFAvatarEditor] mount: rootEl is required');
    return;
  }
  if (currentRoot) unmount();

  // Stash glbBase globally so HairModels/FaceModel can resolve paths
  if (opts && opts.glbBase) {
    window.MF_AVATAR_GLB_BASE = opts.glbBase;
  }
  if (opts && opts.bodyGlbUrl) {
    window.MF_AVATAR_BODY_GLB_URL = opts.bodyGlbUrl;
  }

  currentEl = rootEl;
  currentRoot = createRoot(rootEl);
  currentRoot.render(<AvatarEditor {...opts} />);
}

function unmount() {
  if (currentRoot) {
    currentRoot.unmount();
    currentRoot = null;
  }
  if (currentEl) {
    currentEl.innerHTML = '';
    currentEl = null;
  }
}

/* ==========================================================================
   v3.05 — exportFace(config, options)
   --------------------------------------------------------------------------
   Cihaza (ekranli varyant) gonderilecek yuz paketi uretir:
     · base   : agiz gizliyken alinan tam kare  (sakal gorunur kalir)
     · mouths : MM2..MM14 tek tek takilip agiz kutusundan kirpilan 13 kare

   Mevcut editorun KENDI sahnesini kullanir — sac ofset tablosu, kamera
   kadraji, malzemeler birebir aynidir. Editorun davranisi degismez.

   Donen deger:
     {
       width, height,          // base kare olculeri
       mouthBox: {x,y,w,h},    // base icindeki agiz kutusu
       base:   ImageData,
       mouths: [ImageData x13],
       basePng: dataURL        // onizleme / profil kucuk resmi icin
     }
   ========================================================================== */

const MM_FIRST = 2;
const MM_COUNT = 13;                       // MM2..MM14

// SAKAL MODU AGIZ SETI (Eren'in secimi — oyunun eski haritasi degil).
// Kullanilan agizlar: MM5 · MM7 · MM8 · MM11 · MM12 · MM14
// 13 ses seviyesine sirayla dagitilir (acikliga gore artan sira).
const FACIAL_HAIR_MOUTH_MAP = [5, 5, 7, 7, 8, 8, 11, 11, 12, 12, 14, 14, 14];

function waitFrames(n) {
  return new Promise((resolve) => {
    let i = 0;
    const step = () => (++i >= n ? resolve() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  });
}

// Kare gercekten cizildi mi? (tamamen bos/seffaf ise false)
function looksBlank(imageData) {
  const d = imageData.data;
  let nonWhite = 0;
  for (let i = 0; i < d.length; i += 4 * 37) {          // seyrek ornekleme
    if (d[i + 3] > 8 && (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240)) {
      if (++nonWhite > 25) return false;
    }
  }
  return true;
}

// Render hedefinden piksel okur (DOM canvas'a hic dokunmaz).
// WebGL'de orijin sol-ALT oldugu icin satirlar ters cevrilir.
function readTarget(gl, rt, x, y, w, h, rtH) {
  const buf = new Uint8Array(w * h * 4);
  gl.readRenderTargetPixels(rt, x, rtH - (y + h), w, h, buf);

  const out = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const src = (h - 1 - row) * w * 4;
    out.set(buf.subarray(src, src + w * 4), row * w * 4);
  }
  return new ImageData(out, w, h);
}

// Seffaf pikselleri beyaza yatirir (cihaz ekrani beyaz zeminli) ve
// istenen olcuye kucultur.
// Duz carpan beyazlari yakiyor ama saci/tisortu kurtarmiyor.
// Gamma (<1) koyu bolgeleri kaldirir, acik bolgeleri neredeyse hic bozmaz.
function applyTone(imageData, gain, gamma) {
  const g = gain || 1, gm = gamma || 1;
  if (g === 1 && gm === 1) return imageData;

  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    let x = v / 255;
    if (gm !== 1) x = Math.pow(x, gm);
    x *= g;
    lut[v] = Math.max(0, Math.min(255, Math.round(x * 255)));
  }

  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]];
  }
  return imageData;
}

function flattenAndScale(imageData, dw, dh) {
  const tmp = document.createElement('canvas');
  tmp.width = imageData.width;
  tmp.height = imageData.height;
  tmp.getContext('2d').putImageData(imageData, 0, 0);

  const off = document.createElement('canvas');
  off.width = dw;
  off.height = dh;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, dw, dh);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tmp, 0, 0, dw, dh);
  return { imageData: ctx.getImageData(0, 0, dw, dh), canvas: off };
}

function grabImageData(canvas, sx, sy, sw, sh, dw, dh) {
  const off = document.createElement('canvas');
  off.width = dw;
  off.height = dh;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';               // cihaz ekrani beyaz zeminli
  ctx.fillRect(0, 0, dw, dh);
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, dw, dh);
  return { imageData: ctx.getImageData(0, 0, dw, dh), canvas: off };
}


// Oyun, kullanici sakal/ozel agiz secse bile VARSAYILAN agzi gizli olarak
// sahneye ekler ve lip-sync agizlarini ona gore konumlar. Ayni capayi
// kullaniyoruz — boylece sakalli/sakalsiz fark etmeksizin ayni referans.
async function measureDefaultMouth(mouthGroup, glbBase) {
  if (!mouthGroup) return null;
  try {
    const g = await new GLTFLoader().loadAsync(`${glbBase}/face/Man_Mouth1.glb`);
    const probe = g.scene.clone(true);
    probe.visible = false;
    mouthGroup.add(probe);
    mouthGroup.updateWorldMatrix(true, true);
    probe.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(probe);
    mouthGroup.remove(probe);
    if (!isFinite(box.min.x) || box.isEmpty()) return null;
    return {
      box,
      center: box.getCenter(new THREE.Vector3()),
      size: box.getSize(new THREE.Vector3()),
    };
  } catch (e) {
    console.warn('[exportFace] varsayilan agiz olculemedi', e);
    return null;
  }
}

async function exportFace(config, options) {
  // config verilmezse kullanicinin kayitli avatari, o da yoksa varsayilan
  if (!config && typeof window !== 'undefined' && window.mf_avatar_editor) {
    config = window.mf_avatar_editor.initial_config || null;
  }

  // glbBase cozum sirasi: secenek > mount'tan kalan global > WP localize > sabit
  const cfgBase =
    (typeof window !== 'undefined' && window.mf_avatar_editor && window.mf_avatar_editor.glb_base) ||
    (typeof window !== 'undefined' && window.MF_AVATAR_GLB_BASE) ||
    'https://mini-talks.com/models';

  const opt = Object.assign(
    {
      glbBase:  cfgBase,
      torsoId:  (typeof window !== 'undefined' && window.mf_avatar_editor &&
                 window.mf_avatar_editor.torso_id) || '',
      bodyGlbUrl: null,
      width:    290,                       // cihazdaki base kare (ekrani doldursun)
      height:   210,
      mouthBox: { x: 80, y: 70, w: 80, h: 56 },
      mouthPush: 0.03,
      mouthScale: 1.0,          // tuneMouth ile dogrulandi
      mouthYOffset: -0.025,
      mouthXOffset: 0.01,
      mouthUnlit: true,         // true = duz renk (varsayilan; yonlu isik gradyani olmaz)
      mouthBrightness: 0.85,    // isiksiz modda parlaklik (agiz yuze gore parlak kalmasin)
      exposure: 1.40,           // yuz pozlamasi
      frontLight: 1.20,         // yumusak ORTAM dolgusu — sac/tisort golgede kalmasin
      autoCrop: true,           // beyaz kenarlari kirp (figur ekranda buyuk gorunsun)
      fitHeight: 208,           // kirptiktan sonra bu yukseklige buyut (0 = kapali)
      fitWidthMax: 290,         // genislik tavani
      gain: 1.12,               // duz carpan (yuksek tutmak beyazlari yakiyor)
      gamma: 0.62,              // <1 = KOYU bolgeleri kaldirir (sac, tisort)
      mouthAspectX: 1.0,        // yatay genislik ince ayari
      mouthSkip: [6, 13],       // sakalsizda elenen MM'ler (komsusuyla degistirilir)
      mouthFacialHairScale: 0.79,  // panelde: Olcek 0.93 x Sakal olcegi 0.85
      mouthHeadWidthRatio: 0.42,   // agiz mesh'i yoksa: kafa genisliginin orani
      mouthHeadDrop: 0.17,         // agiz mesh'i yoksa: kafa merkezinden asagi
      mouthFHYOffset: 0.005,       // panelde olculdu
      mouthFHXOffset: 0,           // sakalda yatay (sakalsizda 0.01)
      mouthFHPush: 0.03,           // sakalli icin derinlik (normalle ayni)
      mouthFHOverrides: null,      // sakalda MM bazli ince ayar:
                                   // { "5": {scale,aspectX,x,y,z}, "13": {...} }
      mouthRotX: 4.6,           // oyundaki MM yerel donusu
      mouthRotY: 0,
      mouthRotZ: 0,
      onProgress: null,
    },
    options || {}
  );

  // Govde GLB'si ayri bir adresten gelir (WP: mf_avatar_editor.body_glb_url)
  const cfgBody =
    (typeof window !== 'undefined' && window.mf_avatar_editor && window.mf_avatar_editor.body_glb_url) ||
    (typeof window !== 'undefined' && window.MF_AVATAR_BODY_GLB_URL) || null;
  if (opt.bodyGlbUrl || cfgBody) {
    window.MF_AVATAR_BODY_GLB_URL = opt.bodyGlbUrl || cfgBody;
  }

  if (!opt.glbBase) opt.glbBase = cfgBase;
  opt.glbBase = String(opt.glbBase).replace(/\/+$/, '');
  window.MF_AVATAR_GLB_BASE = opt.glbBase;
  console.log('[exportFace] torsoId =', opt.torsoId || '(yok)',
              '| config =', config ? 'var' : 'varsayilan');
  console.log('[exportFace] glbBase =', opt.glbBase,
              '| bodyGlb =', window.MF_AVATAR_BODY_GLB_URL || '(varsayilan)');

  const report = (msg, pct) => {
    if (typeof opt.onProgress === 'function') opt.onProgress(msg, pct);
  };

  // ── gizli sahne ───────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-9999px;top:0;width:600px;height:500px;pointer-events:none;';
  document.body.appendChild(host);

  let three = null;
  const root = createRoot(host);
  root.render(
    <LegoHead
      customization={config || {}}
      torsoId={opt.torsoId}
      onSceneReady={(t) => { three = t; }}
    />
  );

  try {
    report('Sahne hazirlaniyor…', 5);
    // sahne + varliklarin yuklenmesini bekle
    for (let i = 0; i < 240 && !three; i++) await waitFrames(2);
    if (!three) throw new Error('Sahne kurulamadi');
    await waitFrames(90);                  // GLB/doku yuklemeleri icin pay

    const { scene, gl, camera } = three;
    const canvas = gl.domElement;

    // ── dekoratif agzi bul, sakali ayir ─────────────────────────────────
    let mouthGroup = null;
    scene.traverse((o) => {
      if (o.userData && o.userData.mfPart === 'mouth') mouthGroup = o;
    });

    const plainMouthMeshes = [];   // yalnizca agiz/dudak — SAKAL BUNA GIRMEZ
    let hasFacialHair = false;
    let frontZ = null;             // agzin oturacagi on yuzey (sakalda sakalin onu)
    if (mouthGroup) {
      mouthGroup.traverse((o) => {
        if (!o.isMesh) return;
        const n = (o.name || '').toLowerCase();
        const isFH = n.includes('facialhair') || n.includes('beard') || n.includes('mustache');
        if (isFH) hasFacialHair = true;
        else plainMouthMeshes.push(o);
      });
    }
    console.log('[exportFace] agiz grubu:', mouthGroup ? 'var' : 'YOK',
                '| agiz mesh sayisi:', plainMouthMeshes.length,
                '| sakal mesh var mi:', hasFacialHair);
    const cfgMouth = (config && config.mouthModelName) || '';
    if (cfgMouth.includes('facialhair')) hasFacialHair = true;

    // Sakal varken agiz, ince agiz seridinin degil SAKALIN on yuzune oturmali.
    // Aksi halde sakalin icinde kalip hic gorunmuyor.
    if (hasFacialHair && mouthGroup) {
      const gb = new THREE.Box3().setFromObject(mouthGroup);
      frontZ = gb.max.z;
      console.log('[exportFace] sakal on yuzu z =', +frontZ.toFixed(3));
    }

    // ── kafa mesh'i (oyunda FBX agizlar buna cocuk olarak ekleniyor) ────
    let headMesh = null;
    scene.traverse((o) => {
      if (headMesh || !o.isMesh) return;
      const n = (o.name || '').toLowerCase();
      if (n.includes('kafa') || n.includes('head')) headMesh = o;
    });
    console.log('[exportFace] kafa mesh:', headMesh ? headMesh.name : '(bulunamadi)');

    // ── agzin gercek 3D sinir kutusu (kirpma ve MM olcegi icin) ─────────
    let mouthBox3 = null, mouthCenter = null, mouthSize = null;

    // Sakalli modellerde ayri bir agiz mesh'i olmayabilir. O durumda agzin
    // yerini KAFADAN tahmin ederiz, yoksa MM hic yerlestirilemiyor.
    const estimateFromHead = () => {
      // 1. tercih: agiz GRUBUNUN dunya konumu (isimden bagimsiz, her zaman var)
      let center = null, width = null;

      if (mouthGroup) {
        const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
        mouthGroup.updateWorldMatrix(true, false);
        mouthGroup.matrixWorld.decompose(_p, _q, _s);
        center = _p.clone();
      }

      // Genislik icin kafa mesh'i varsa ondan, yoksa sakal/agiz grubunun
      // kendi kutusundan turetilir.
      if (headMesh) {
        headMesh.updateWorldMatrix(true, false);
        const hb = new THREE.Box3().setFromObject(headMesh);
        const hs = hb.getSize(new THREE.Vector3());
        const hc = hb.getCenter(new THREE.Vector3());
        width = hs.x * (opt.mouthHeadWidthRatio || 0.42);
        if (!center) center = new THREE.Vector3(hc.x, hc.y - hs.y * (opt.mouthHeadDrop || 0.17), hb.max.z);
        else center.z = hb.max.z;                 // yuzeye tasi
      } else if (mouthGroup) {
        const gb = new THREE.Box3().setFromObject(mouthGroup);
        const gs = gb.getSize(new THREE.Vector3());
        width = gs.x * 0.45;
        if (center) center.z = gb.max.z;
      }

      if (!center || !width || width < 1e-6) {
        console.warn('[exportFace] agiz konumu turetilemedi', { center, width });
        return false;
      }

      mouthSize   = new THREE.Vector3(width, width * 0.7, width * 0.2);
      mouthCenter = center;
      mouthBox3   = new THREE.Box3().setFromCenterAndSize(mouthCenter, mouthSize);
      console.log('[exportFace] agiz mesh yok — turetildi:',
                  'merkez', mouthCenter.toArray().map(v => +v.toFixed(3)),
                  '| genislik', +width.toFixed(3),
                  '| kafa:', headMesh ? headMesh.name : 'yok');
      return true;
    };

    // 1) Agiz mesh'i varsa ONDAN olc (sakalsiz durumda dogrulanmis yol)
    // 2) Yoksa varsayilan agzi gizli ekleyip olc (sakalli durum)
    // 3) O da olmazsa kafadan tahmin
    let anchor = null;
    if (!plainMouthMeshes.length) {
      anchor = await measureDefaultMouth(mouthGroup, opt.glbBase);
      if (anchor) console.log('[exportFace] capa = varsayilan agiz (agiz mesh yok)');
    }
    if (anchor) {
      mouthBox3 = anchor.box;
      mouthCenter = anchor.center;
      mouthSize = anchor.size;
    } else if (plainMouthMeshes.length) {
      mouthBox3 = new THREE.Box3();
      plainMouthMeshes.forEach((m) => {
        m.updateWorldMatrix(true, false);
        mouthBox3.expandByObject(m);
      });
      mouthCenter = mouthBox3.getCenter(new THREE.Vector3());
      mouthSize   = mouthBox3.getSize(new THREE.Vector3());
      console.log('[exportFace] agiz merkezi', mouthCenter.toArray().map(v => +v.toFixed(2)),
                  '| olcu', mouthSize.toArray().map(v => +v.toFixed(2)));
    } else {
      estimateFromHead();
    }

    // ── base kare: dekoratif agiz gizli, sakal gorunur ──────────────────
    // DOM canvas yerine kendi render hedefimize ciziyoruz: post-processing
    // zincirinden ve ekran disi cizim tamponu belirsizliginden bagimsiz.
    // Not: yalnizca agiz mesh'leri gizlenir. Sakal/biyik mesh'leri hic
    // dokunulmadan gorunur kalir — oyundaki davranisin aynisi.
    plainMouthMeshes.forEach((m) => { m.visible = false; });

    const RT_W = opt.width * 2;
    const RT_H = opt.height * 2;
    const rt = new THREE.WebGLRenderTarget(RT_W, RT_H, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    // kamera kadraji oturana kadar birkac kare bekle (LockedCamera lerp yapiyor)
    await waitFrames(30);
    camera.aspect = RT_W / RT_H;
    camera.updateProjectionMatrix();

    // On yuz karanlik kaliyordu: sahnenin isiklari yandan/ustten geliyor.
    // Kameraya bagli bir dolgu isigi ekliyoruz (yalniz export sirasinda).
    // Yonlu dolgu isigi yuzun ortasinda parlama yapip sac detayini yakiyordu.
    // Ortam isigi esit dagilir, spekuler leke birakmaz.
    let fillLight = null;
    if (opt.frontLight) {
      fillLight = new THREE.AmbientLight(0xffffff, opt.frontLight);
      scene.add(fillLight);
    }

    const prevExposure = gl.toneMappingExposure;
    if (opt.exposure && opt.exposure !== 1) gl.toneMappingExposure = prevExposure * opt.exposure;

    const renderToTarget = () => {
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(rt);
      gl.clear(true, true, true);
      gl.render(scene, camera);
      gl.setRenderTarget(prev);
    };

    renderToTarget();
    const baseFull = readTarget(gl, rt, 0, 0, RT_W, RT_H, RT_H);
    let baseGrab = flattenAndScale(baseFull, opt.width, opt.height);
    console.log('[exportFace] RT', RT_W + 'x' + RT_H,
                '| bos mu:', looksBlank(baseGrab.imageData));

    // (idle kare base'den sonra, agiz kutusu hesaplandiktan sonra alinir)

    // Agiz kutusunu ekrana yansit — sabit sayi yerine gercek konum
    if (mouthBox3) {
      const pts = [];
      const b = mouthBox3;
      [[b.min.x, b.min.y, b.min.z], [b.max.x, b.min.y, b.min.z],
       [b.min.x, b.max.y, b.min.z], [b.max.x, b.max.y, b.min.z],
       [b.min.x, b.min.y, b.max.z], [b.max.x, b.min.y, b.max.z],
       [b.min.x, b.max.y, b.max.z], [b.max.x, b.max.y, b.max.z]].forEach((c) => {
        const v = new THREE.Vector3(c[0], c[1], c[2]).project(camera);
        pts.push([(v.x * 0.5 + 0.5) * opt.width, (-v.y * 0.5 + 0.5) * opt.height]);
      });
      let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0]));
      let y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));

      const padX = (x1 - x0) * 0.45, padY = (y1 - y0) * 0.55;   // acilan agza pay
      x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;

      const bx = Math.max(0, Math.round(x0));
      const by = Math.max(0, Math.round(y0));
      const bw = Math.min(opt.width  - bx, Math.round(x1 - x0));
      const bh = Math.min(opt.height - by, Math.round(y1 - y0));
      if (bw > 8 && bh > 8) {
        opt.mouthBox = { x: bx, y: by, w: bw, h: bh };
        console.log('[exportFace] agiz kutusu (otomatik)', opt.mouthBox);
      }
    }

    // Varliklar hala yukleniyorsa birkac kez daha dene
    for (let t = 0; t < 8 && looksBlank(baseGrab.imageData); t++) {
      await waitFrames(20);
      renderToTarget();
      baseGrab = flattenAndScale(readTarget(gl, rt, 0, 0, RT_W, RT_H, RT_H),
                                 opt.width, opt.height);
    }
    report('Yuz karesi alindi', 15);

    // ── IDLE (sessiz) kare: kullanicinin kendi dekoratif agzi ───────────
    plainMouthMeshes.forEach((m) => { m.visible = true; });
    await waitFrames(3);
    renderToTarget();
    const idleCrop = readTarget(gl, rt,
      Math.round(opt.mouthBox.x * 2), Math.round(opt.mouthBox.y * 2),
      Math.round(opt.mouthBox.w * 2), Math.round(opt.mouthBox.h * 2), RT_H);
    const mouthIdleRef = { v: flattenAndScale(idleCrop, opt.mouthBox.w, opt.mouthBox.h).imageData };
    plainMouthMeshes.forEach((m) => { m.visible = false; });

    // ── MM agizlari ─────────────────────────────────────────────────────
    const loader = new FBXLoader();
    loader.setCrossOrigin('anonymous');
    // FBX'ler harici doku dosyasi kullaniyor (mesh: "Iconface", doku: true).
    // Kaynak yolu verilmezse doku tarayicinin kok adresinde aranir, bulunamaz
    // ve yuzey siyah kalir — dis/dil bu yuzden gorunmuyordu.
    loader.setPath(`${opt.glbBase}/face/`);
    loader.setResourcePath(`${opt.glbBase}/face/`);

    const mouths = [];
    const sx = Math.round(opt.mouthBox.x * 2);
    const sy = Math.round(opt.mouthBox.y * 2);
    const sw = Math.min(RT_W - sx, Math.round(opt.mouthBox.w * 2));
    const sh = Math.min(RT_H - sy, Math.round(opt.mouthBox.h * 2));

    let holder = null;
    let mmScale = null;

    for (let i = 0; i < MM_COUNT; i++) {
      let idx = hasFacialHair ? FACIAL_HAIR_MOUTH_MAP[i] : MM_FIRST + i;
      // Elenen MM'ler (varsayilan 6 ve 13) en yakin uygun komsuyla degistirilir
      // Eleme yalnizca sakalsiz durumda uygulanir — oyunun sakal haritasi
      // MM6 ve MM13'u bilerek kullaniyor (kucultulmus halde).
      const skip = hasFacialHair ? [] : (opt.mouthSkip || []);
      if (skip.indexOf(idx) >= 0) {
        let d = 1;
        while (d < 13) {
          if (idx - d >= 2  && skip.indexOf(idx - d) < 0) { idx = idx - d; break; }
          if (idx + d <= 14 && skip.indexOf(idx + d) < 0) { idx = idx + d; break; }
          d++;
        }
      }
      const url = `MM${idx}.fbx`;   // setPath ile birlestirilir

      let obj = null;
      try {
        obj = await loader.loadAsync(url);
      } catch (e) {
        console.warn('[exportFace] MM yuklenemedi:', opt.glbBase + '/face/' + url, e);
      }

      if (obj) {
        // Isiksiz mod: dokuyu/rengi aynen kullan ama isiktan etkilenmesin.
        // Kucuk TFT ekranda golgeli render karanlik ve bulanik duruyordu.
        if (opt.mouthUnlit !== false) {
          obj.traverse((o) => {
            if (!o.isMesh || !o.material) return;
            o.frustumCulled = false;
            const conv = (m) => {
              if (!m) return m;
              const col = (m.color && m.color.clone()) || new THREE.Color(0xffffff);
              const br = (opt.mouthBrightness === undefined) ? 1.0 : opt.mouthBrightness;
              if (br !== 1.0) col.multiplyScalar(br);
              const b = new THREE.MeshBasicMaterial({
                map: m.map || null,
                color: col,
                side: THREE.DoubleSide,
                transparent: !!m.transparent,
                alphaTest: m.alphaTest || 0,
              });
              if (b.map) {
                b.map.generateMipmaps = false;
                b.map.minFilter = THREE.LinearFilter;
                b.map.magFilter = THREE.LinearFilter;
                b.map.anisotropy = 1;
                b.map.colorSpace = THREE.SRGBColorSpace;
                b.map.needsUpdate = true;
              }
              return b;
            };
            o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
          });
        }

        // MALZEMELERE DOKUNULMAZ — doku (dis/dil/dudak renkleri) korunur.
        // Yalnizca mipmap kapatilir ve iki yuz cizilir (oyundaki gibi).
        obj.traverse((o) => {
          if (!o.isMesh || !o.material) return;
          o.frustumCulled = false;
          const fix = (mat) => {
            if (!mat) return;
            Object.values(mat).forEach((v) => {
              if (v && v.isTexture) {
                v.generateMipmaps = false;
                v.minFilter = THREE.LinearFilter;
                v.magFilter = THREE.LinearFilter;
                v.anisotropy = 1;
                v.colorSpace = THREE.SRGBColorSpace;
                v.needsUpdate = true;
              }
            });
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
          };
          if (Array.isArray(o.material)) o.material.forEach(fix);
          else fix(o.material);
        });

        // ── Yerlestirme: agzin GERCEK sinir kutusuna oturt ─────────────
        // (Oyunun sabitleri — scale 0.01, pos 0.7/0.5 — oyunun kendi olcek
        //  hiyerarsisine gore; forum editorunde kafa mesh'i farkli olcekte
        //  oldugu icin agiz gorunmez oluyordu. Bu yuzden olcegi kutudan
        //  hesapliyoruz, ama SADECE BIR KEZ — hepsine ayni deger uygulanir.)
        if (mouthCenter && mouthSize) {
          // Donus: kafanin dunya donusu × oyunun MM yerel donusu (4.6, 0, 0).
          // Dekoratif agzin donusunu kopyalamak YANLISTI — onun icinde
          // fazladan 180 derece (rotation.y = PI) var, agiz ters geliyordu.
          {
            const ref = headMesh || mouthGroup;
            const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
            if (ref) { ref.updateWorldMatrix(true, false); ref.matrixWorld.decompose(_p, _q, _s); }
            const local = new THREE.Quaternion().setFromEuler(new THREE.Euler(
              (opt.mouthRotX !== undefined ? opt.mouthRotX : 4.6),
              (opt.mouthRotY || 0),
              (opt.mouthRotZ || 0)
            ));
            obj.quaternion.copy(_q).multiply(local);
          }
          obj.updateWorldMatrix(true, true);

          if (mmScale === null) {
            const mb = new THREE.Box3().setFromObject(obj);
            const ms = mb.getSize(new THREE.Vector3());
            const k = (ms.x > 1e-6) ? (mouthSize.x / ms.x) : 1;
            mmScale = k * (opt.mouthScale || 1.0) *
                      (hasFacialHair ? (opt.mouthFacialHairScale || 0.85) : 1.0);
            console.log('[exportFace] ham oran k=', +k.toFixed(4),
                        '| carpan=', opt.mouthScale, '| sonuc=', +mmScale.toFixed(5));
          }
          // Sakalda MM bazli override (varsa)
          const ov = (hasFacialHair && opt.mouthFHOverrides &&
                      opt.mouthFHOverrides[String(idx)]) || null;
          const sMul = ov && ov.scale   !== undefined ? ov.scale   : 1;
          const aMul = ov && ov.aspectX !== undefined ? ov.aspectX : 1;
          obj.scale.set(mmScale * (opt.mouthAspectX || 1) * aMul * sMul,
                        mmScale * sMul, mmScale * sMul);
          obj.updateWorldMatrix(true, true);

          // X/Y merkez merkeze, Z on yuzeye (icine gomulmesin)
          const mb2 = new THREE.Box3().setFromObject(obj);
          const mc2 = mb2.getCenter(new THREE.Vector3());
          obj.position.add(new THREE.Vector3(
            mouthCenter.x - mc2.x +
              ((hasFacialHair && opt.mouthFHXOffset !== null && opt.mouthFHXOffset !== undefined)
                ? opt.mouthFHXOffset : (opt.mouthXOffset || 0)) + ((ov && ov.x) || 0),
            mouthCenter.y - mc2.y +
              ((hasFacialHair && opt.mouthFHYOffset !== null && opt.mouthFHYOffset !== undefined)
                ? opt.mouthFHYOffset : (opt.mouthYOffset || 0)) + ((ov && ov.y) || 0),
            ((frontZ !== null ? frontZ : mouthBox3.max.z) - mb2.max.z) +
              ((hasFacialHair && opt.mouthFHPush !== null && opt.mouthFHPush !== undefined)
                ? opt.mouthFHPush : (opt.mouthPush || 0.03)) + ((ov && ov.z) || 0)
          ));
        }

        if (holder && holder.parent) holder.parent.remove(holder);
        holder = obj;
        scene.add(holder);
      }

      if (i === 0 && holder) {
        holder.updateWorldMatrix(true, true);
        const wb = new THREE.Box3().setFromObject(holder);
        console.log('[exportFace] MM dunya kutusu:',
                    'min', wb.min.toArray().map(v => +v.toFixed(3)),
                    'max', wb.max.toArray().map(v => +v.toFixed(3)),
                    '| hedef merkez', mouthCenter ? mouthCenter.toArray().map(v => +v.toFixed(3)) : null);
      }
      await waitFrames(3);
      renderToTarget();
      const crop = readTarget(gl, rt, sx, sy, sw, sh, RT_H);
      mouths.push(flattenAndScale(crop, opt.mouthBox.w, opt.mouthBox.h).imageData);
      report(`Agiz ${i + 1}/${MM_COUNT}`, 15 + Math.round((i + 1) / MM_COUNT * 80));
    }

    if (holder && holder.parent) holder.parent.remove(holder);
    plainMouthMeshes.forEach((m) => { m.visible = true; });

    rt.dispose();
    gl.toneMappingExposure = prevExposure;
    if (fillLight) scene.remove(fillLight);
    // Beyaz kenarlari kirp — figur cihaz ekraninda buyuk gorunsun
    let outBase = baseGrab, outBox = opt.mouthBox;
    if (opt.autoCrop) {
      const bd = baseGrab.imageData.data, W = opt.width, H = opt.height;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (bd[i] < 244 || bd[i + 1] < 244 || bd[i + 2] < 244) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      const pad = 4;
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
      x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
      const cw = x1 - x0 + 1, chh = y1 - y0 + 1;
      if (cw > 20 && chh > 20 && (cw < W || chh < H)) {
        const src = document.createElement('canvas');
        src.width = W; src.height = H;
        src.getContext('2d').putImageData(baseGrab.imageData, 0, 0);
        const dst = document.createElement('canvas');
        dst.width = cw; dst.height = chh;
        const dc = dst.getContext('2d', { willReadFrequently: true });
        dc.drawImage(src, x0, y0, cw, chh, 0, 0, cw, chh);
        outBase = { imageData: dc.getImageData(0, 0, cw, chh), canvas: dst };
        outBox = { x: opt.mouthBox.x - x0, y: opt.mouthBox.y - y0,
                   w: opt.mouthBox.w, h: opt.mouthBox.h };

        // Kirpilan kare ekrandan kisa kaliyorsa buyut — figurle alt yazi
        // arasinda bosluk kalmasin. Agiz kutusu da ayni oranla olceklenir.
        if (opt.fitHeight && chh > 0) {
          let k = opt.fitHeight / chh;
          if (opt.fitWidthMax && cw * k > opt.fitWidthMax) k = opt.fitWidthMax / cw;
          if (k > 1.02) {
            const nw = Math.round(cw * k), nh = Math.round(chh * k);
            const big = document.createElement('canvas');
            big.width = nw; big.height = nh;
            const bc = big.getContext('2d', { willReadFrequently: true });
            bc.imageSmoothingEnabled = true;
            bc.imageSmoothingQuality = 'high';
            bc.fillStyle = '#ffffff';
            bc.fillRect(0, 0, nw, nh);
            bc.drawImage(dst, 0, 0, nw, nh);
            outBase = { imageData: bc.getImageData(0, 0, nw, nh), canvas: big };
            outBox = { x: Math.round(outBox.x * k), y: Math.round(outBox.y * k),
                       w: Math.round(outBox.w * k), h: Math.round(outBox.h * k) };
            // agiz kareleri de ayni orana buyutulur
            for (let i = 0; i < mouths.length; i++) {
              mouths[i] = flattenAndScale(mouths[i], outBox.w, outBox.h).imageData;
            }
            if (mouthIdleRef.v) {
              mouthIdleRef.v = flattenAndScale(mouthIdleRef.v, outBox.w, outBox.h).imageData;
            }
            console.log('[exportFace] buyutuldu x' + k.toFixed(2), '->', nw + 'x' + nh);
          }
        }
        console.log('[exportFace] kirpildi', W + 'x' + H, '->', cw + 'x' + chh);
      }
    }

    report('Tamam', 100);

    return {
      width:    outBase.imageData.width,
      height:   outBase.imageData.height,
      mouthBox: outBox,
      base:      applyTone(outBase.imageData, opt.gain, opt.gamma),
      mouthIdle: applyTone(mouthIdleRef.v, opt.gain, opt.gamma),
      basePng:  outBase.canvas.toDataURL('image/png'),
      mouths: mouths.map((m) => applyTone(m, opt.gain, opt.gamma)),
      facialHair: hasFacialHair,
    };
  } finally {
    // WebGL baglamini birak — aksi halde arka arkaya cagirinca tarayici
    // baglam sinirina dayanip "Context Lost" veriyor.
    try {
      if (three && three.gl) {
        three.gl.dispose();
        const ext = three.gl.getContext().getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    } catch (e) { /* yoksay */ }
    try { root.unmount(); } catch (e) { /* yoksay */ }
    setTimeout(() => host.remove(), 0);
  }
}


/* ==========================================================================
   v3.05.14 — tuneMouth(): gorsel agiz ayar paneli
   Ekranda canli 3D yuz + kaydiricilar. Agzi gozle dogru yere oturtup
   "Degerleri kopyala"ya basiyorsun; cikan sayilar exportFace'e verilecek.
   ========================================================================== */
async function tuneMouth(config, options) {
  const opt = Object.assign({
    glbBase: (window.mf_avatar_editor && window.mf_avatar_editor.glb_base) ||
             window.MF_AVATAR_GLB_BASE || 'https://mini-talks.com/models',
    torsoId: (window.mf_avatar_editor && window.mf_avatar_editor.torso_id) || '',
    mm: 8,
  }, options || {});

  if (!config && window.mf_avatar_editor) config = window.mf_avatar_editor.initial_config || null;
  window.MF_AVATAR_GLB_BASE = opt.glbBase;
  const bodyUrl = (window.mf_avatar_editor && window.mf_avatar_editor.body_glb_url);
  if (bodyUrl) window.MF_AVATAR_BODY_GLB_URL = bodyUrl;

  // ── panel ──
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:fixed;inset:0;z-index:999999;background:rgba(20,20,24,.96);' +
    'display:flex;gap:16px;padding:16px;font:13px system-ui;color:#eee';
  const view = document.createElement('div');
  view.style.cssText = 'flex:1 1 auto;background:#fff;border-radius:8px;min-width:0';
  const side = document.createElement('div');
  side.style.cssText = 'width:300px;flex:none;overflow:auto';
  wrap.appendChild(view); wrap.appendChild(side);
  document.body.appendChild(wrap);

  const state = { scale: 1.0, aspectX: 1.0, x: 0.01, y: -0.025, z: 0.03,
                  rx: 4.6, ry: 0, rz: 0, mm: opt.mm, unlit: true, bright: 0.85, exposure: 1.25,
                  ovs: {},
                  fh: false, fhScale: 0.85 };

  const rowRefs = {};
  const row = (label, key, min, max, step) => {
    const d = document.createElement('div');
    d.style.margin = '10px 0';
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px';
    const val = document.createElement('b');
    l.append(label, val);
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step;
    inp.value = state[key]; inp.style.width = '100%';
    const show = () => { val.textContent = (+state[key]).toFixed(4); };
    show();
    inp.oninput = () => { state[key] = parseFloat(inp.value); show();
      if (key === 'bright') lastMM = -1;   // malzeme yeniden kurulsun
      apply(); };
    rowRefs[key] = () => { inp.value = state[key]; show(); };
    d.append(l, inp); side.appendChild(d);
  };

  const title = document.createElement('h3');
  title.textContent = 'Agiz ayari';
  title.style.margin = '0 0 8px';
  side.appendChild(title);
  const hint = document.createElement('p');
  hint.style.cssText = 'color:#aaa;margin:0 0 12px;line-height:1.5';
  hint.textContent = 'Agzi oyundaki gibi oturtana kadar kaydiricilarla oyna, sonra degerleri kopyala.';
  side.appendChild(hint);

  row('Olcek', 'scale', 0.05, 5, 0.01);
  row('Genislik (X carpani)', 'aspectX', 0.3, 2, 0.01);
  row('Yatay (X)', 'x', -1, 1, 0.005);
  row('Dikey (Y)', 'y', -1, 1, 0.005);
  row('Derinlik (Z)', 'z', -0.5, 0.5, 0.005);
  row('Donus X', 'rx', -6.4, 6.4, 0.02);
  row('Donus Y', 'ry', -3.2, 3.2, 0.02);
  row('Donus Z', 'rz', -3.2, 3.2, 0.02);
  row('Agiz parlakligi', 'bright', 0.5, 1.2, 0.01);
  row('Yuz pozlamasi', 'exposure', 0.6, 2.0, 0.05);
  row('Sakal modu agiz olcegi', 'fhScale', 0.5, 1.2, 0.01);
  row('Hangi agiz (MM)', 'mm', 2, 14, 1);

  // isik anahtari
  const lit = document.createElement('label');
  lit.style.cssText = 'display:flex;gap:8px;align-items:center;margin:12px 0';
  const litCb = document.createElement('input');
  litCb.type = 'checkbox';
  // Export'a gomulu varsayilanlar — panel bunlarla ayni olsun
  const DEF_NORMAL = { scale: 1.0,  aspectX: 1.0, x: 0.01, y: -0.025, z: 0.03, fhScale: 0.85 };
  const DEF_BEARD  = { scale: 0.93, aspectX: 1.0, x: 0,    y:  0.005, z: 0.03, fhScale: 0.85 };
  const loadDefaults = (beard) => {
    const d = beard ? DEF_BEARD : DEF_NORMAL;
    Object.keys(d).forEach((k) => { state[k] = d[k]; if (rowRefs[k]) rowRefs[k](); });
  };

  litCb.checked = true;
  litCb.onchange = () => { state.unlit = litCb.checked; lastMM = -1; apply(); };
  const _origRow = null;
  lit.append(litCb, document.createTextNode('Isiksiz (duz parlak renk)'));
  side.appendChild(lit);

  // sakal modu
  const fhWrap = document.createElement('label');
  fhWrap.style.cssText = 'display:flex;gap:8px;align-items:center;margin:12px 0';
  const fhCb = document.createElement('input');
  fhCb.type = 'checkbox';
  fhCb.onchange = () => {
    state.fh = fhCb.checked;
    loadDefaults(state.fh);          // sakal/normal varsayilanlarina atla
    if (state.fh) { state.mm = 5; if (rowRefs.mm) rowRefs.mm(); }
    lastMM = -1;
    apply();
  };
  fhWrap.append(fhCb, document.createTextNode('Sakal modu (agiz kuculur, sakal kalir)'));
  side.appendChild(fhWrap);

  // Config'de sakal varsa kutuyu otomatik isaretle — sakalli yuze sakalsiz
  // ayar uygulamak anlamsiz (agiz alakasiz yere gidiyor).
  const cfgHasBeard = !!(config && String(config.mouthModelName || '').includes('facialhair'));
  if (cfgHasBeard) {
    fhCb.checked = true;
    state.fh = true;
    loadDefaults(true);
    state.mm = 5;
    if (rowRefs.mm) rowRefs.mm();
    const warn = document.createElement('p');
    warn.style.cssText = 'color:#ffd479;margin:4px 0;line-height:1.4';
    warn.textContent = 'Bu yuzde sakal var — kutuyu kaldirirsan agiz yanlis yere gider.';
    side.appendChild(warn);
  }

  const out = document.createElement('textarea');
  out.style.cssText = 'width:100%;height:80px;margin-top:8px;font:12px monospace';
  side.appendChild(out);

  // Sakalda kullanilan MM'ler
  const FH_USED = [5, 7, 8, 11, 12, 14];

  const fhInfo = document.createElement('p');
  fhInfo.style.cssText = 'color:#ffd479;margin:6px 0;line-height:1.5';
  fhInfo.textContent = 'Sakalda kullanilan agizlar: MM5 · MM7 · MM8 · MM11 · MM12 · MM14';
  side.appendChild(fhInfo);

  const btnSaveMM = document.createElement('button');
  btnSaveMM.style.cssText = 'width:100%;padding:9px;margin-top:6px;cursor:pointer;font-weight:700';
  const refreshSaveBtn = () => {
    const n = Math.round(state.mm);
    const has = state.ovs[n] ? ' ✓' : '';
    btnSaveMM.textContent = 'MM' + n + ' ayarini kaydet' + has;
  };
  refreshSaveBtn();
  btnSaveMM.onclick = () => {
    const n = Math.round(state.mm);
    state.ovs[n] = {
      scale: +(state.scale).toFixed(3),
      aspectX: +(state.aspectX).toFixed(3),
      x: +(state.x).toFixed(3),
      y: +(state.y).toFixed(3),
      z: +(state.z).toFixed(3),
    };
    refreshSaveBtn();
    apply();
  };
  side.appendChild(btnSaveMM);

  const btnNextMM = document.createElement('button');
  btnNextMM.textContent = 'Sonraki sakal agzi →';
  btnNextMM.style.cssText = 'width:100%;padding:8px;margin-top:6px;cursor:pointer';
  btnNextMM.onclick = () => {
    const cur = Math.round(state.mm);
    const i = FH_USED.indexOf(cur);
    state.mm = FH_USED[(i + 1) % FH_USED.length];
    // kayitli ayar varsa geri yukle
    const o = state.ovs[Math.round(state.mm)];
    if (o) { state.scale = o.scale; state.aspectX = o.aspectX;
             state.x = o.x; state.y = o.y; state.z = o.z; }
    lastMM = -1;
    refreshSaveBtn();
    apply();
  };
  side.appendChild(btnNextMM);

  const btnCopy = document.createElement('button');
  btnCopy.textContent = 'Degerleri kopyala';
  btnCopy.style.cssText = 'width:100%;padding:10px;margin-top:8px;font-weight:700;cursor:pointer';
  side.appendChild(btnCopy);

  const btnClose = document.createElement('button');
  btnClose.textContent = 'Kapat';
  btnClose.style.cssText = 'width:100%;padding:8px;margin-top:6px;cursor:pointer';
  side.appendChild(btnClose);

  // ── sahne ──
  let three = null, mouthGroup = null, plain = [], holder = null, baseScale = 1, headRef = null;
  let baseExposure = null;
  const root = createRoot(view);
  root.render(<LegoHead customization={config || {}} torsoId={opt.torsoId}
                        onSceneReady={(t) => { three = t; }} />);

  for (let i = 0; i < 240 && !three; i++) await waitFrames(2);
  await waitFrames(60);

  three.scene.traverse((o) => {
    if (o.userData && o.userData.mfPart === 'mouth') mouthGroup = o;
    if (!headRef && o.isMesh) {
      const n = (o.name || '').toLowerCase();
      if (n.includes('kafa') || n.includes('head')) headRef = o;
    }
  });
  if (mouthGroup) {
    mouthGroup.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.name || '').toLowerCase();
      if (!(n.includes('facialhair') || n.includes('beard') || n.includes('mustache'))) plain.push(o);
    });
  }

  let box = new THREE.Box3(), center = null, size = null;

  let anchor = null;
  if (!plain.length) anchor = await measureDefaultMouth(mouthGroup, opt.glbBase);
  if (anchor) {
    box = anchor.box; center = anchor.center; size = anchor.size;
  } else if (plain.length) {
    plain.forEach((m) => { m.updateWorldMatrix(true, false); box.expandByObject(m); });
    center = box.getCenter(new THREE.Vector3());
    size = box.getSize(new THREE.Vector3());
  } else {
    // Sakalli model: ayri agiz mesh'i yok. Agzin yerini agiz GRUBUNUN
    // dunya konumundan, genisligi kafadan turet.
    if (mouthGroup) {
      const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
      mouthGroup.updateWorldMatrix(true, false);
      mouthGroup.matrixWorld.decompose(_p, _q, _s);
      center = _p.clone();
    }
    let w = null;
    if (headRef) {
      headRef.updateWorldMatrix(true, false);
      const hb = new THREE.Box3().setFromObject(headRef);
      const hs = hb.getSize(new THREE.Vector3());
      const hc = hb.getCenter(new THREE.Vector3());
      w = hs.x * 0.42;
      if (!center) center = new THREE.Vector3(hc.x, hc.y - hs.y * 0.17, hb.max.z);
      else center.z = hb.max.z;
    } else if (mouthGroup) {
      const gb = new THREE.Box3().setFromObject(mouthGroup);
      w = gb.getSize(new THREE.Vector3()).x * 0.45;
      if (center) center.z = gb.max.z;
    }
    if (center && w && w > 1e-6) {
      size = new THREE.Vector3(w, w * 0.7, w * 0.2);
      box = new THREE.Box3().setFromCenterAndSize(center, size);
    }
  }

  if (!center || !size) {
    center = new THREE.Vector3(); size = new THREE.Vector3(1, 1, 1);
  }

  // sakal varsa derinlik referansi sakalin on yuzu
  let frontZ = box.max.z;
  if (mouthGroup) {
    const gb = new THREE.Box3().setFromObject(mouthGroup);
    if (gb.max.z > frontZ) frontZ = gb.max.z;
  }
  plain.forEach((m) => { m.visible = false; });

  // ── teshis kutusu (panelde gorunur) ──
  const diag = document.createElement('pre');
  diag.style.cssText = 'white-space:pre-wrap;background:#111;padding:8px;border-radius:6px;' +
                       'font:11px monospace;color:#8f8;margin-top:10px';
  side.appendChild(diag);
  const setDiag = (extra) => {
    diag.textContent =
      'capa: ' + (anchor ? 'varsayilan agiz' : 'secili agiz meshi') +
      '\nagiz mesh: ' + plain.length +
      '\nagiz grubu: ' + (mouthGroup ? 'var' : 'YOK') +
      '\nkafa mesh: ' + (headRef ? headRef.name : 'YOK') +
      '\nhedef merkez: ' + center.toArray().map(v => +v.toFixed(3)).join(', ') +
      '\nhedef olcu: ' + size.toArray().map(v => +v.toFixed(3)).join(', ') +
      '\nsakal on z: ' + (typeof frontZ === 'number' ? frontZ.toFixed(3) : '?') +
      (extra || '');
  };
  setDiag();

  const loader = new FBXLoader();
  loader.setCrossOrigin('anonymous');
  loader.setPath(`${opt.glbBase}/face/`);
  loader.setResourcePath(`${opt.glbBase}/face/`);

  let lastMM = -1;
  async function apply() {
    if (!three) return;
    if (state.mm !== lastMM) {
      lastMM = state.mm;
      if (holder && holder.parent) holder.parent.remove(holder);
      holder = null;
      try {
        const o = await loader.loadAsync(`MM${Math.round(state.mm)}.fbx`);
        o.traverse((m) => {
          if (!m.isMesh || !m.material) return;
          m.frustumCulled = false;
          const fixTex = (t) => {
            if (!t) return;
            t.colorSpace = THREE.SRGBColorSpace;
            t.generateMipmaps = false;
            t.minFilter = THREE.LinearFilter;
            t.magFilter = THREE.LinearFilter;
            t.anisotropy = 1;
            t.needsUpdate = true;
          };
          const conv = (mat) => {
            if (state.unlit) {
              const col = (mat.color && mat.color.clone()) || new THREE.Color(0xffffff);
              if (state.bright !== 1) col.multiplyScalar(state.bright);
              const b = new THREE.MeshBasicMaterial({
                map: mat.map || null, color: col, side: THREE.DoubleSide,
              });
              fixTex(b.map);
              return b;
            }
            fixTex(mat.map);
            mat.side = THREE.DoubleSide;
            if (mat.metalness !== undefined) mat.metalness = 0.0;
            if (mat.roughness !== undefined) mat.roughness = 0.8;
            mat.needsUpdate = true;
            return mat;
          };
          m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
        });

        const mb = new THREE.Box3().setFromObject(o);
        const ms = mb.getSize(new THREE.Vector3());
        baseScale = (ms.x > 1e-6) ? (size.x / ms.x) : 1;
        holder = o;
        three.scene.add(holder);
      } catch (e) { console.warn('MM yuklenemedi', e); return; }
    }
    if (!holder) return;
    {
      const ref = headRef || mouthGroup;
      const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
      if (ref) { ref.updateWorldMatrix(true, false); ref.matrixWorld.decompose(_p, _q, _s); }
      const local = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(state.rx, state.ry, state.rz));
      holder.quaternion.copy(_q).multiply(local);
    }
    holder.position.set(0, 0, 0);
    if (three && three.gl) {
      if (baseExposure === null) baseExposure = three.gl.toneMappingExposure;
      three.gl.toneMappingExposure = baseExposure * state.exposure;
    }
    const _ov = state.fh ? state.ovs[Math.round(state.mm)] : null;
    const fhK = state.fh ? state.fhScale : 1;
    holder.scale.set(baseScale * state.scale * state.aspectX * fhK,
                     baseScale * state.scale * fhK,
                     baseScale * state.scale * fhK);
    holder.updateWorldMatrix(true, true);
    const b2 = new THREE.Box3().setFromObject(holder);
    const c2 = b2.getCenter(new THREE.Vector3());
    holder.position.add(new THREE.Vector3(
      center.x - c2.x + state.x,
      center.y - c2.y + state.y,
      ((state.fh ? frontZ : box.max.z) - b2.max.z) + state.z
    ));
    holder.updateWorldMatrix(true, true);
    const wb = new THREE.Box3().setFromObject(holder);
    setDiag('\nMM merkez: ' + wb.getCenter(new THREE.Vector3()).toArray().map(v => +v.toFixed(3)).join(', ') +
            '\nMM olcu: ' + wb.getSize(new THREE.Vector3()).toArray().map(v => +v.toFixed(3)).join(', ') +
            '\nolcek: ' + (baseScale * state.scale).toFixed(5));

    out.value = JSON.stringify({
      mouthScale: +state.scale.toFixed(3),
      mouthAspectX: +state.aspectX.toFixed(3),
      mouthXOffset: +state.x.toFixed(3),
      mouthYOffset: +state.y.toFixed(3),
      mouthPush: +state.z.toFixed(3),
      mouthRotX: +state.rx.toFixed(3),
      mouthRotY: +state.ry.toFixed(3),
      mouthRotZ: +state.rz.toFixed(3),
      mouthUnlit: state.unlit,
      mouthBrightness: +state.bright.toFixed(2),
      exposure: +state.exposure.toFixed(2),
      mouthFacialHairScale: +state.fhScale.toFixed(2),
      mouthSkip: [6, 13],
      mouthFHOverrides: state.ovs,
    }, null, 1);
  }

  await apply();

  btnCopy.onclick = () => {
    navigator.clipboard && navigator.clipboard.writeText(out.value);
    console.log('[tuneMouth] degerler:', out.value);
    btnCopy.textContent = 'Kopyalandi';
    setTimeout(() => { btnCopy.textContent = 'Degerleri kopyala'; }, 1200);
  };
  btnClose.onclick = () => {
    try { root.unmount(); } catch (e) {}
    wrap.remove();
  };
}

// IIFE bundle — exposes window.MFAvatarEditor with mount/unmount as named exports.
// (No default export to avoid Vite warning about mixed named+default in IIFE.)
export { mount, unmount, exportFace, tuneMouth };
