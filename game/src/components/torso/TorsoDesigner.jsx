// src/components/torso/TorsoDesigner.jsx
//
// The shirt designer: a modal where a child puts writing and icons on their
// Mini's shirt, front and back, and drags them around on the figure itself.
//
// Everything about where things go, and how they are drawn, lives in
// components/torsoDesign.js. This file is the editor around it: the 3D view,
// the pointer handling, and the panels.
//
// Dragging happens on the model rather than on a flat copy of the shirt, which
// is what makes it feel like the figure is being decorated and not a texture
// being edited. The trick that makes it cheap: the torso's geometry carries
// UVs, so the point under the finger comes back from the raycast as a uv pair,
// and the panel rectangle turns that straight into "43% across, 20% down the
// chest". No projection back from 3D to screen is needed anywhere — even the
// selection box is painted into the texture, so it sits on the shirt and turns
// with it.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  PANELS, FONTS, TEXT_COLOURS, MAX_ITEMS_PER_SIDE, MAX_TEXT_LENGTH,
  drawTorsoDesign, hitTest, clampItem, newTextItem, sanitiseText, ensureFonts,
} from '../torsoDesign';

const legoFigureUrl = new URL('../../assets/models/lego-figure-2glb.glb', import.meta.url).href;
const torsoUvUrl = (id) => (id ? `/models/torso/${id}/${id}_uv.png` : null);

const BLUE = '#0055BF';
const DARK = '#1D1D1B';

/* ── the figure ─────────────────────────────────────────────────────────── */

function Figure({ texture, side, onPointerPanel }) {
  const { scene } = useGLTF(legoFigureUrl);
  const group = useRef();

  const built = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((child) => {
      if (!child.isMesh) return;
      const name = (child.name || '').toLowerCase().replace(/[_-]+/g, ' ');
      const isTorso = name.includes('gövde') || name.includes('govde') || name === '3814uv.002';
      const isSkeleton = name.includes('skelet');
      if (isSkeleton) { child.visible = false; return; }
      child.userData.isTorso = isTorso;
      child.material = isTorso
        ? new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.08 })
        : new THREE.MeshStandardMaterial({ color: '#F2D626', roughness: 0.4, metalness: 0.05 });
    });
    return root;
  }, [scene, texture]);

  // Turning to show the back, rather than moving the camera around: the figure
  // stays put and the shirt comes to you, which is what Flip means.
  useEffect(() => {
    if (!group.current) return;
    let frame;
    const want = side === 'back' ? Math.PI : 0;
    const step = () => {
      const g = group.current;
      if (!g) return;
      const diff = want - g.rotation.y;
      if (Math.abs(diff) < 0.01) { g.rotation.y = want; return; }
      g.rotation.y += diff * 0.2;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [side]);

  const handle = (phase) => (event) => {
    if (!event.uv || !event.object?.userData?.isTorso) return;
    const panel = PANELS[side];
    const px = (event.uv.x - panel.u0) / (panel.u1 - panel.u0);
    const py = (event.uv.y - panel.v0) / (panel.v1 - panel.v0);
    onPointerPanel(phase, px, py, event);
  };

  return (
    <group ref={group} position={[0, -1, 0]} scale={[0.1, 0.1, 0.1]}>
      <primitive
        object={built}
        onPointerDown={handle('down')}
        onPointerMove={handle('move')}
        onPointerUp={handle('up')}
      />
    </group>
  );
}

/** Pointer-up anywhere ends a drag, even if the finger left the figure. */
function ReleaseCatcher({ onRelease }) {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const up = () => onRelease();
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    return () => {
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointerleave', up);
    };
  }, [gl, onRelease]);
  return null;
}

/* ── small pieces of the panel ──────────────────────────────────────────── */

const Row = ({ children, gap = 8, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap, ...style }}>{children}</div>
);

const Btn = ({ children, onClick, disabled, tone = 'plain', title, style }) => {
  const tones = {
    plain:  { bg: '#fff',    fg: DARK,  bd: DARK },
    blue:   { bg: BLUE,      fg: '#fff', bd: DARK },
    red:    { bg: '#E31E24', fg: '#fff', bd: DARK },
    yellow: { bg: '#FFCC00', fg: DARK,  bd: DARK },
  };
  const t = tones[tone] || tones.plain;
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={title}
      style={{
        backgroundColor: disabled ? '#E6E6E6' : t.bg,
        color: disabled ? '#9A9A9A' : t.fg,
        border: `2px solid ${disabled ? '#C9C9C9' : t.bd}`,
        borderRadius: 8, padding: '7px 10px', fontWeight: 800, fontSize: 12,
        fontFamily: "'Montserrat', sans-serif", cursor: disabled ? 'default' : 'pointer',
        lineHeight: 1, whiteSpace: 'nowrap', ...style,
      }}
    >
      {children}
    </button>
  );
};

const Slider = ({ label, value, min, max, step, onChange }) => (
  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: DARK, marginBottom: 8 }}>
    {label}
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', marginTop: 4, accentColor: BLUE }}
    />
  </label>
);

/* ── the designer ───────────────────────────────────────────────────────── */

const TorsoDesigner = ({
  torsoTextureId,
  items: initialItems = [],
  icons = [],              // [{ id, label, src }] — Elif's pack, once it lands
  onCancel,
  onSave,
}) => {
  const [items, setItems] = useState(() => initialItems.map(clampItem));
  const [side, setSide] = useState('front');
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('text');
  const [atlas, setAtlas] = useState(null);
  const [iconImages, setIconImages] = useState({});

  const canvasRef = useRef(null);        // reused every redraw
  const textureRef = useRef(null);
  const dragRef = useRef(null);
  const [, bump] = useState(0);          // forces a re-render after a redraw

  const selected = items.find((i) => i.id === selectedId) || null;
  const sideItems = items.filter((i) => (i.side || 'front') === side);

  /* the shirt's own artwork */
  useEffect(() => {
    const url = torsoUvUrl(torsoTextureId);
    if (!url) { setAtlas(null); return undefined; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (!cancelled) setAtlas(img); };
    img.onerror = () => { if (!cancelled) setAtlas(null); };
    img.src = url;
    return () => { cancelled = true; };
  }, [torsoTextureId]);

  /* the icons that are in use */
  useEffect(() => {
    let cancelled = false;
    const wanted = [...new Set(items.filter((i) => i.type === 'icon').map((i) => i.src))];
    const missing = wanted.filter((src) => src && !iconImages[src]);
    if (missing.length === 0) return undefined;
    Promise.all(missing.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve([src, img]);
      img.onerror = () => resolve(null);
      img.src = src;
    }))).then((loaded) => {
      if (cancelled) return;
      const add = {};
      loaded.filter(Boolean).forEach(([src, img]) => { add[src] = img; });
      if (Object.keys(add).length) setIconImages((prev) => ({ ...prev, ...add }));
    });
    return () => { cancelled = true; };
  }, [items, iconImages]);

  /* make sure a chosen font is really loaded before it is drawn with */
  useEffect(() => { ensureFonts(items).then(() => bump((n) => n + 1)); }, [items]);

  /* redraw — on the same canvas, so dragging does not allocate per frame */
  useEffect(() => {
    if (!atlas) return;
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    drawTorsoDesign(atlas, items, iconImages, {
      selectedId,
      target: canvasRef.current,
    });
    if (!textureRef.current) {
      const t = new THREE.CanvasTexture(canvasRef.current);
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      textureRef.current = t;
      bump((n) => n + 1);
    } else {
      textureRef.current.needsUpdate = true;
    }
  }, [atlas, items, iconImages, selectedId]);

  const update = useCallback((id, changes) => {
    setItems((list) => list.map((i) => (i.id === id ? clampItem({ ...i, ...changes }) : i)));
  }, []);

  const onPointerPanel = useCallback((phase, px, py, event) => {
    if (phase === 'down') {
      const hit = hitTest(items, side, px, py);
      setSelectedId(hit);
      if (hit) {
        const item = items.find((i) => i.id === hit);
        dragRef.current = { id: hit, dx: item.x - px, dy: item.y - py };
        event.stopPropagation();
      }
      return;
    }
    if (phase === 'move' && dragRef.current) {
      const { id, dx, dy } = dragRef.current;
      update(id, { x: px + dx, y: py + dy });
      return;
    }
    if (phase === 'up') dragRef.current = null;
  }, [items, side, update]);

  const release = useCallback(() => { dragRef.current = null; }, []);

  const addText = () => {
    if (sideItems.length >= MAX_ITEMS_PER_SIDE) return;
    const item = { ...newTextItem(side), text: 'TEXT' };
    setItems((l) => [...l, item]);
    setSelectedId(item.id);
    setTab('text');
  };

  const addIcon = (src) => {
    if (sideItems.length >= MAX_ITEMS_PER_SIDE) return;
    const item = clampItem({
      id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      type: 'icon', side, x: 0.5, y: 0.45, scale: 0.4, rotation: 0, src,
    });
    setItems((l) => [...l, item]);
    setSelectedId(item.id);
  };

  const removeSelected = () => {
    if (!selected) return;
    setItems((l) => l.filter((i) => i.id !== selected.id));
    setSelectedId(null);
  };

  // Order is the order in the list; moving an item within its own side keeps
  // the other side's items where they are.
  const reorder = (direction) => {
    if (!selected) return;
    setItems((list) => {
      const idx = list.findIndex((i) => i.id === selected.id);
      const sameSide = list
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => (it.side || 'front') === side)
        .map(({ i }) => i);
      const at = sameSide.indexOf(idx);
      const swapWith = direction === 'forward' ? sameSide[at + 1] : sameSide[at - 1];
      if (swapWith === undefined) return list;
      const copy = [...list];
      [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
      return copy;
    });
  };

  const resetSide = () => {
    setItems((l) => l.filter((i) => (i.side || 'front') !== side));
    setSelectedId(null);
  };

  const panelWidth = 330;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: 0, gap: 12, padding: 12, boxSizing: 'border-box', fontFamily: "'Montserrat', sans-serif" }}>
      {/* the figure */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          flex: 1, minHeight: 0, borderRadius: 16, overflow: 'hidden',
          background: 'linear-gradient(180deg,#f1f5f9 0%,#cbd5e1 100%)',
          touchAction: 'none',
        }}>
          <Canvas
            camera={{ position: [0, 2.25, 5.4], fov: 30 }}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true,
                  toneMapping: THREE.NeutralToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
            dpr={[1, 2]}
            style={{ width: '100%', height: '100%' }}
            onCreated={({ camera }) => camera.lookAt(0, 2.15, 0)}
          >
            <ambientLight intensity={0.85} />
            <directionalLight position={[3, 6, 6]} intensity={1.1} />
            <directionalLight position={[-3, 4, -6]} intensity={0.7} />
            <ReleaseCatcher onRelease={release} />
            {textureRef.current ? (
              <Figure texture={textureRef.current} side={side} onPointerPanel={onPointerPanel} />
            ) : null}
          </Canvas>
        </div>
        <Row gap={10} style={{ justifyContent: 'center', flexShrink: 0 }}>
          <Btn onClick={() => { setSide(side === 'front' ? 'back' : 'front'); setSelectedId(null); }} tone="plain">
            ⟳ {side === 'front' ? 'Show back' : 'Show front'}
          </Btn>
          <Btn onClick={resetSide} tone="plain" title="Clear this side">🗑 Reset</Btn>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>
            {sideItems.length}/{MAX_ITEMS_PER_SIDE} on the {side}
          </span>
        </Row>
      </div>

      {/* the panels */}
      <div style={{ width: panelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 10 }}>
        <Row gap={6} style={{ flexShrink: 0 }}>
          <Btn onClick={() => setTab('text')} tone={tab === 'text' ? 'blue' : 'plain'} style={{ flex: 1 }}>ABC  Text</Btn>
          <Btn onClick={() => setTab('icons')} tone={tab === 'icons' ? 'blue' : 'plain'} style={{ flex: 1 }}>★  Decorations</Btn>
        </Row>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: `2px solid ${DARK}`, borderRadius: 12, padding: 10, background: '#fff' }}>
          {tab === 'text' ? (
            <>
              <Btn onClick={addText} tone="yellow" disabled={sideItems.length >= MAX_ITEMS_PER_SIDE} style={{ width: '100%', marginBottom: 10 }}>
                + Add text
              </Btn>
              {selected && selected.type === 'text' ? (
                <>
                  <input
                    value={selected.text}
                    onChange={(e) => update(selected.id, { text: sanitiseText(e.target.value, selected.fontId) })}
                    maxLength={MAX_TEXT_LENGTH}
                    placeholder="Type here"
                    style={{
                      width: '100%', boxSizing: 'border-box', height: 34, borderRadius: 8,
                      border: `2px solid ${DARK}`, padding: '0 10px', fontWeight: 800,
                      fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
                    }}
                  />
                  <select
                    value={selected.fontId}
                    onChange={(e) => update(selected.id, { fontId: e.target.value, text: sanitiseText(selected.text, e.target.value) })}
                    style={{ width: '100%', height: 34, borderRadius: 8, border: `2px solid ${DARK}`, fontWeight: 700, marginBottom: 10, padding: '0 8px' }}
                  >
                    {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label} — {f.family}</option>)}
                  </select>
                  <Row gap={6} style={{ flexWrap: 'wrap', marginBottom: 10 }}>
                    {TEXT_COLOURS.map((c) => (
                      <button
                        key={c.id} type="button" title={c.id}
                        onClick={() => update(selected.id, { colour: c.hex })}
                        style={{
                          width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
                          backgroundColor: c.hex,
                          border: `${selected.colour === c.hex ? 3 : 2}px solid ${selected.colour === c.hex ? BLUE : DARK}`,
                        }}
                      />
                    ))}
                  </Row>
                  <Row gap={6} style={{ marginBottom: 10 }}>
                    <Btn onClick={() => update(selected.id, { bold: !selected.bold })} tone={selected.bold ? 'blue' : 'plain'} style={{ flex: 1, fontWeight: 900 }}>B</Btn>
                    <Btn onClick={() => update(selected.id, { italic: !selected.italic })} tone={selected.italic ? 'blue' : 'plain'} style={{ flex: 1, fontStyle: 'italic' }}>I</Btn>
                    <Btn onClick={() => update(selected.id, { underline: !selected.underline })} tone={selected.underline ? 'blue' : 'plain'} style={{ flex: 1, textDecoration: 'underline' }}>U</Btn>
                  </Row>
                </>
              ) : (
                <p style={{ fontSize: 12, color: '#555', fontWeight: 600, lineHeight: 1.5, margin: '4px 0' }}>
                  Add some writing, then drag it around on the figure. Tap anything on the shirt to pick it up again.
                </p>
              )}
            </>
          ) : (
            <>
              {icons.length === 0 ? (
                <p style={{ fontSize: 12, color: '#555', fontWeight: 600, lineHeight: 1.5, margin: '4px 0' }}>
                  No stickers yet — they arrive with the icon pack.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {icons.map((ic) => (
                    <button
                      key={ic.id} type="button" title={ic.label} onClick={() => addIcon(ic.src)}
                      disabled={sideItems.length >= MAX_ITEMS_PER_SIDE}
                      style={{ aspectRatio: '1', border: `2px solid ${DARK}`, borderRadius: 8, background: '#fff', cursor: 'pointer', padding: 4 }}
                    >
                      <img src={ic.src} alt={ic.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* what can be done to whatever is selected, whichever tab is open */}
          {selected ? (
            <div style={{ borderTop: `2px solid ${DARK}`, marginTop: 12, paddingTop: 10 }}>
              <Slider label={`Size  ${Math.round(selected.scale * 100)}%`} value={selected.scale}
                      min={0.08} max={1} step={0.01} onChange={(v) => update(selected.id, { scale: v })} />
              <Slider label={`Turn  ${Math.round(selected.rotation)}°`} value={selected.rotation}
                      min={0} max={359} step={1} onChange={(v) => update(selected.id, { rotation: v })} />
              <Row gap={6}>
                <Btn onClick={() => reorder('backward')} style={{ flex: 1 }} title="Move backwards">↓ Back</Btn>
                <Btn onClick={() => reorder('forward')} style={{ flex: 1 }} title="Move forwards">↑ Front</Btn>
                <Btn onClick={removeSelected} tone="red" title="Delete">🗑</Btn>
              </Row>
            </div>
          ) : null}
        </div>

        <Row gap={8} style={{ flexShrink: 0 }}>
          <Btn onClick={onCancel} style={{ flex: 1 }}>Go back</Btn>
          <Btn onClick={() => onSave(items)} tone="blue" style={{ flex: 1 }}>Save torso</Btn>
        </Row>
      </div>
    </div>
  );
};

export default TorsoDesigner;
