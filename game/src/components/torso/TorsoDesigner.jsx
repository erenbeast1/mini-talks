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
  drawTorsoDesign, hitTest, hitHandle, panelAspect, itemBounds,
  clampItem, newTextItem, sanitiseText, ensureFonts,
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

/* Icons, drawn here rather than imported, so the designer carries no assets
   of its own and they take the colour of the text next to them. */
const Ico = ({ d, size = 18, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const IconPencil   = (p) => <Ico {...p} d={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>} />;
const IconForward  = (p) => <Ico {...p} d={<><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="M3 15l9 5 9-5" /><path d="M12 13V3" /></>} />;
const IconBackward = (p) => <Ico {...p} d={<><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="M3 15l9 5 9-5" /><path d="M12 11v10" /></>} />;
const IconTrash    = (p) => <Ico {...p} d={<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></>} />;
const IconFlip     = (p) => <Ico {...p} d={<><path d="M12 5v14" /><path d="M5 9a7 7 0 0 1 7-4" /><path d="M19 15a7 7 0 0 1-7 4" /><path d="M3 9h4V5" /><path d="M21 15h-4v4" /></>} />;
const IconText     = (p) => <Ico {...p} d={<><path d="M4 6h16" /><path d="M12 6v13" /><path d="M8 19h8" /></>} />;
const IconSticker  = (p) => <Ico {...p} d={<><path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.9 6.6 19.7l1.2-6.1L3.3 9.4l6.1-.8Z" /></>} />;
const IconShirt    = (p) => <Ico {...p} d={<><path d="M8 3 4 6v5h3v10h10V11h3V6l-4-3-4 2-4-2Z" /></>} />;

/** A row in the card — icon on the left, label, the whole thing clickable. */
const CardRow = ({ icon, children, onClick, disabled, danger }) => (
  <button
    type="button" onClick={onClick} disabled={disabled}
    style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      background: disabled ? '#FAFAFA' : '#F4F5F7',
      color: disabled ? '#B4B4B4' : (danger ? '#C81E24' : DARK),
      border: 'none', borderBottom: '1px solid #E4E6EA',
      padding: '13px 14px', fontSize: 14, fontWeight: 600,
      fontFamily: "'Montserrat', sans-serif",
      cursor: disabled ? 'default' : 'pointer', textAlign: 'left',
    }}
  >
    {icon}
    <span>{children}</span>
  </button>
);

/** The tab strip across the top, with a picture over each word. */
const Tab = ({ icon, label, active, onClick, disabled }) => (
  <button
    type="button" onClick={onClick} disabled={disabled}
    style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: 'transparent', border: 'none', cursor: disabled ? 'default' : 'pointer',
      color: disabled ? '#BFBFBF' : (active ? DARK : '#7A7F87'),
      padding: '10px 4px 8px', fontFamily: "'Montserrat', sans-serif",
      fontSize: 12, fontWeight: active ? 800 : 600,
      borderBottom: `3px solid ${active ? BLUE : 'transparent'}`,
    }}
  >
    {icon}
    {label}
  </button>
);

const Btn = ({ children, onClick, disabled, tone = 'plain', title, style }) => {
  const tones = {
    plain: { bg: '#EDEFF2', fg: DARK, bd: 'transparent' },
    blue:  { bg: BLUE, fg: '#fff', bd: 'transparent' },
    ghost: { bg: 'transparent', fg: DARK, bd: 'transparent' },
  };
  const t = tones[tone] || tones.plain;
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={title}
      style={{
        backgroundColor: disabled ? '#F0F0F0' : t.bg,
        color: disabled ? '#B0B0B0' : t.fg,
        border: `1px solid ${t.bd}`, borderRadius: 999,
        padding: '10px 18px', fontWeight: 700, fontSize: 14,
        fontFamily: "'Montserrat', sans-serif", cursor: disabled ? 'default' : 'pointer',
        lineHeight: 1, whiteSpace: 'nowrap', ...style,
      }}
    >
      {children}
    </button>
  );
};

const Field = ({ children, style }) => (
  <div style={{
    border: '1px solid #D8DBE0', borderRadius: 10, background: '#fff',
    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 14, fontWeight: 600, fontFamily: "'Montserrat', sans-serif", ...style,
  }}>{children}</div>
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

  // The panel is wider than it is tall, so angles and distances are worked out
  // in a space corrected for that — otherwise turning an item would speed up
  // and slow down as it went round.
  const aspect = useMemo(
    () => panelAspect(side, atlas?.naturalWidth || 1, atlas?.naturalHeight || 1),
    [side, atlas],
  );

  const onPointerPanel = useCallback((phase, px, py, event) => {
    if (phase === 'down') {
      // A handle on the selected item wins over everything: it sits outside
      // the item's own box, so it has to be tested first or it would never be
      // reachable.
      const handle = hitHandle(selected && (selected.side || 'front') === side ? selected : null, px, py, aspect);
      if (handle && selected) {
        const b = itemBounds(selected);
        const dx = (px - selected.x) * aspect, dy = py - selected.y;
        dragRef.current = {
          mode: handle,
          id: selected.id,
          startDist: Math.max(0.02, Math.sqrt(dx * dx + dy * dy)),
          startScale: selected.scale,
          startAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
          startRotation: selected.rotation || 0,
          halfDiagonal: Math.sqrt((b.w / 2) ** 2 + (b.h / 2) ** 2),
        };
        event.stopPropagation();
        return;
      }

      const hit = hitTest(items, side, px, py, aspect);
      setSelectedId(hit);
      if (hit) {
        const item = items.find((i) => i.id === hit);
        dragRef.current = { mode: 'move', id: hit, dx: item.x - px, dy: item.y - py };
        event.stopPropagation();
      }
      return;
    }

    if (phase === 'move' && dragRef.current) {
      const drag = dragRef.current;
      if (drag.mode === 'move') {
        update(drag.id, { x: px + drag.dx, y: py + drag.dy });
        return;
      }
      const item = items.find((i) => i.id === drag.id);
      if (!item) return;
      const dx = (px - item.x) * aspect, dy = py - item.y;
      if (drag.mode === 'resize') {
        const dist = Math.sqrt(dx * dx + dy * dy);
        update(drag.id, { scale: drag.startScale * (dist / drag.startDist) });
      } else if (drag.mode === 'rotate') {
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        update(drag.id, { rotation: drag.startRotation + (angle - drag.startAngle) });
      }
      return;
    }

    if (phase === 'up') dragRef.current = null;
  }, [items, side, selected, aspect, update]);

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
  const fontOf = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]);
  const colourName = (hex) => (TEXT_COLOURS.find((c) => c.hex === hex) || { id: 'black' }).id;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: 0, gap: 14, padding: 14, boxSizing: 'border-box', fontFamily: "'Montserrat', sans-serif", background: '#EDEFF2' }}>
      {/* left: the panels */}
      <div style={{ width: panelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', flexShrink: 0 }}>
          <Row gap={0}>
            <Tab icon={<IconShirt />}   label="Clothing"    disabled title="Outfits are chosen on the Torso tab behind this window" />
            <Tab icon={<IconSticker />} label="Decorations" active={tab === 'icons'} onClick={() => setTab('icons')} />
            <Tab icon={<IconText />}    label="Text"        active={tab === 'text'}  onClick={() => setTab('text')} />
          </Row>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Row style={{ padding: '14px 14px 10px', justifyContent: 'space-between', flexShrink: 0 }}>
            <strong style={{ fontSize: 15 }}>
              {selected ? (selected.type === 'text' ? 'Edit text' : 'Edit decoration') : (tab === 'text' ? 'Text' : 'Decorations')}
            </strong>
            {selected ? (
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Close"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: DARK, padding: 4 }}>
                <Ico d={<><path d="M5 5l14 14" /><path d="M19 5 5 19" /></>} />
              </button>
            ) : null}
          </Row>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {/* nothing selected — the ways in */}
            {!selected && tab === 'text' ? (
              <div style={{ padding: '0 14px 14px' }}>
                <Btn onClick={addText} tone="blue" disabled={sideItems.length >= MAX_ITEMS_PER_SIDE} style={{ width: '100%' }}>
                  + Add text
                </Btn>
                <p style={{ fontSize: 12.5, color: '#6B7079', fontWeight: 600, lineHeight: 1.5, marginTop: 12 }}>
                  Tap anything on the shirt to pick it up. Drag it to move it, pull a corner to
                  resize it, and use the handle above it to turn it.
                </p>
              </div>
            ) : null}

            {!selected && tab === 'icons' ? (
              <div style={{ padding: '0 14px 14px' }}>
                {icons.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: '#6B7079', fontWeight: 600, lineHeight: 1.5 }}>
                    No stickers yet — they arrive with the icon pack.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {icons.map((ic) => (
                      <button key={ic.id} type="button" title={ic.label} onClick={() => addIcon(ic.src)}
                              disabled={sideItems.length >= MAX_ITEMS_PER_SIDE}
                              style={{ aspectRatio: '1', border: '1px solid #D8DBE0', borderRadius: 10, background: '#fff', cursor: 'pointer', padding: 6 }}>
                        <img src={ic.src} alt={ic.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* something selected */}
            {selected && selected.type === 'text' ? (
              <div style={{ padding: '0 14px 10px' }}>
                <Field style={{ marginBottom: 10, padding: 0 }}>
                  <select
                    value={selected.fontId}
                    onChange={(e) => update(selected.id, { fontId: e.target.value, text: sanitiseText(selected.text, e.target.value) })}
                    style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent',
                             padding: '11px 12px', fontSize: 14, fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {FONTS.map((f) => <option key={f.id} value={f.id}>{f.family}</option>)}
                  </select>
                </Field>

                <Field style={{ marginBottom: 10, padding: 0 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginLeft: 12,
                                 background: selected.colour, border: '1px solid #B9BDC4' }} />
                  <select
                    value={selected.colour}
                    onChange={(e) => update(selected.id, { colour: e.target.value })}
                    style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent',
                             padding: '11px 12px 11px 0', fontSize: 14, fontWeight: 600, textTransform: 'capitalize',
                             fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {TEXT_COLOURS.map((c) => <option key={c.id} value={c.hex}>{c.id}</option>)}
                  </select>
                </Field>

                <Row gap={0} style={{ border: '1px solid #D8DBE0', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                  {[
                    { key: 'bold', label: 'B', style: { fontWeight: 900 } },
                    { key: 'italic', label: 'I', style: { fontStyle: 'italic', fontFamily: 'Georgia, serif' } },
                    { key: 'underline', label: 'U', style: { textDecoration: 'underline' } },
                  ].map((b, i) => (
                    <button key={b.key} type="button" onClick={() => update(selected.id, { [b.key]: !selected[b.key] })}
                            style={{ flex: 1, padding: '11px 0', fontSize: 16, cursor: 'pointer',
                                     background: selected[b.key] ? '#E7EFFC' : '#fff',
                                     color: DARK, border: 'none',
                                     borderLeft: i ? '1px solid #D8DBE0' : 'none', ...b.style }}>
                      {b.label}
                    </button>
                  ))}
                </Row>

                <input
                  value={selected.text}
                  onChange={(e) => update(selected.id, { text: sanitiseText(e.target.value, selected.fontId) })}
                  maxLength={MAX_TEXT_LENGTH}
                  placeholder="Type here"
                  aria-label="Shirt text"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D8DBE0', borderRadius: 10,
                           padding: '11px 12px', fontSize: 15, fontWeight: 700, letterSpacing: 1,
                           textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif", outline: 'none' }}
                />
              </div>
            ) : null}

            {selected ? (
              <div style={{ borderTop: '1px solid #E4E6EA' }}>
                <CardRow icon={<IconForward />}  onClick={() => reorder('forward')}>Move forwards</CardRow>
                <CardRow icon={<IconBackward />} onClick={() => reorder('backward')}>Move backwards</CardRow>
                <CardRow icon={<IconTrash />}    onClick={removeSelected} danger>Delete</CardRow>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* right: the figure */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row gap={10} style={{ justifyContent: 'flex-end', flexShrink: 0 }}>
          <span style={{ marginRight: 'auto', fontSize: 12, fontWeight: 700, color: '#6B7079' }}>
            {sideItems.length}/{MAX_ITEMS_PER_SIDE} on the {side}
          </span>
          <Btn onClick={onCancel} tone="plain">Go back</Btn>
          <Btn onClick={() => onSave(items)} tone="blue">Save torso</Btn>
        </Row>

        <div style={{ flex: 1, minHeight: 0, borderRadius: 16, overflow: 'hidden', background: '#D9DCE1', touchAction: 'none' }}>
          <Canvas
            camera={{ position: [0, 1.81, 5.1], fov: 30 }}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true,
                  toneMapping: THREE.NeutralToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
            dpr={[1, 2]}
            style={{ width: '100%', height: '100%' }}
            onCreated={({ camera }) => camera.lookAt(0, 1.81, 0)}
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

        <Row gap={18} style={{ justifyContent: 'center', flexShrink: 0, paddingBottom: 2 }}>
          <button type="button" onClick={resetSide}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none',
                           cursor: 'pointer', color: DARK, fontFamily: "'Montserrat', sans-serif",
                           fontSize: 14, fontWeight: 600, textDecoration: 'underline' }}>
            <IconTrash size={17} /> Reset
          </button>
          <button type="button" onClick={() => { setSide(side === 'front' ? 'back' : 'front'); setSelectedId(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff',
                           border: '1px solid #D8DBE0', borderRadius: 999, padding: '10px 22px',
                           cursor: 'pointer', color: DARK, fontFamily: "'Montserrat', sans-serif",
                           fontSize: 14, fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <IconFlip size={18} /> Flip
          </button>
        </Row>
      </div>
    </div>
  );
};

export default TorsoDesigner;
