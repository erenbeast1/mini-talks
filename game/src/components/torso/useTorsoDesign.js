// src/components/torso/useTorsoDesign.js
//
// The gestures of the shirt designer, kept apart from the panel that shows
// them so the customisation screen can hold the state and the figure can stay
// exactly where it is on the page.
//
// Everything here works in panel coordinates — 0..1 across the chest or the
// back — which is what the figure hands over when a finger touches it: the
// torso's geometry carries UVs, so the raycast returns the point under the
// finger and the panel rectangle turns it into a fraction. Nothing is ever
// projected back from 3D to the page.

import { useCallback, useMemo, useRef } from 'react';
import {
  clampItem, hitTest, hitHandle, panelAspect, itemBounds,
  MAX_ITEMS_PER_SIDE, newTextItem,
} from '../torsoDesign';

export function useTorsoDesign({ items, setItems, side, selectedId, setSelectedId, atlasSize }) {
  const dragRef = useRef(null);

  // Panel coordinates run 0..1 both ways while the panel itself is wider than
  // it is tall, so angles and distances are worked out in a corrected space —
  // otherwise an item would speed up and slow down as it was turned.
  const aspect = useMemo(
    () => panelAspect(side, atlasSize?.width || 1, atlasSize?.height || 1),
    [side, atlasSize],
  );

  const selected = items.find((i) => i.id === selectedId) || null;
  const sideItems = items.filter((i) => (i.side || 'front') === side);

  const update = useCallback((id, changes) => {
    setItems((list) => list.map((i) => (i.id === id ? clampItem({ ...i, ...changes }) : i)));
  }, [setItems]);

  const onPanelPointer = useCallback((phase, px, py, event) => {
    if (phase === 'down') {
      // A handle of the selected item wins: it sits outside that item's own
      // box, so it has to be tested first or it could never be grabbed.
      const onThisSide = selected && (selected.side || 'front') === side ? selected : null;
      const handle = hitHandle(onThisSide, px, py, aspect);
      if (handle && onThisSide) {
        const dx = (px - onThisSide.x) * aspect;
        const dy = py - onThisSide.y;
        dragRef.current = {
          mode: handle,
          id: onThisSide.id,
          startDist: Math.max(0.02, Math.sqrt(dx * dx + dy * dy)),
          startScale: onThisSide.scale,
          startAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
          startRotation: onThisSide.rotation || 0,
        };
        event?.stopPropagation?.();
        return;
      }

      const hit = hitTest(items, side, px, py, aspect);
      setSelectedId(hit);
      if (hit) {
        const item = items.find((i) => i.id === hit);
        dragRef.current = { mode: 'move', id: hit, dx: item.x - px, dy: item.y - py };
        event?.stopPropagation?.();
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
      const dx = (px - item.x) * aspect;
      const dy = py - item.y;
      if (drag.mode === 'resize') {
        update(drag.id, { scale: drag.startScale * (Math.sqrt(dx * dx + dy * dy) / drag.startDist) });
      } else if (drag.mode === 'rotate') {
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        update(drag.id, { rotation: drag.startRotation + (angle - drag.startAngle) });
      }
      return;
    }

    if (phase === 'up') dragRef.current = null;
  }, [items, side, selected, aspect, setSelectedId, update]);

  const endDrag = useCallback(() => { dragRef.current = null; }, []);

  const addText = useCallback(() => {
    if (sideItems.length >= MAX_ITEMS_PER_SIDE) return;
    const item = { ...newTextItem(side), text: 'TEXT' };
    setItems((l) => [...l, item]);
    setSelectedId(item.id);
  }, [side, sideItems.length, setItems, setSelectedId]);

  const addIcon = useCallback((src, meta = {}) => {
    if (sideItems.length >= MAX_ITEMS_PER_SIDE) return;
    const item = clampItem({
      id: `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      type: 'icon', side, x: 0.5, y: 0.45, scale: 0.4, rotation: 0, src, ...meta,
    });
    setItems((l) => [...l, item]);
    setSelectedId(item.id);
  }, [side, sideItems.length, setItems, setSelectedId]);

  /**
   * Everything drawn from one picture goes when that picture goes: an
   * uploaded sticker the child deletes from the tray cannot be left behind on
   * the shirt as an item whose picture no longer exists.
   */
  const removeBySrc = useCallback((src) => {
    if (!src) return;
    setItems((l) => l.filter((i) => i.src !== src));
    setSelectedId((cur) => (items.some((i) => i.id === cur && i.src === src) ? null : cur));
  }, [items, setItems, setSelectedId]);

  const removeSelected = useCallback(() => {
    if (!selected) return;
    setItems((l) => l.filter((i) => i.id !== selected.id));
    setSelectedId(null);
  }, [selected, setItems, setSelectedId]);

  /** Order is the order in the list, so forwards is later. Only this side moves. */
  const reorder = useCallback((direction) => {
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
  }, [selected, side, setItems]);

  const resetSide = useCallback(() => {
    setItems((l) => l.filter((i) => (i.side || 'front') !== side));
    setSelectedId(null);
  }, [side, setItems, setSelectedId]);

  return {
    selected, sideItems, update, onPanelPointer, endDrag, setSelectedId,
    addText, addIcon, removeSelected, removeBySrc, reorder, resetSide,
    itemBounds,
  };
}
