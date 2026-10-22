// src/components/torso/TorsoDesignPanel.jsx
//
// The shirt designer's panel. It is only the panel: it goes where the torso
// catalogue normally goes, on the right of the customisation screen, and the
// figure stays exactly where it already is on the left. That was Eren's call
// and it is the right one — the screen keeps its shape, and the figure is not
// drawn a second time by a separate window, which is how two copies of the
// same thing start drifting apart.
//
// Everything it does goes through the handlers from useTorsoDesign; the
// gestures on the figure itself live there.

import React, { useEffect, useRef, useState } from 'react';
import {
  FONTS, TEXT_COLOURS, MAX_ITEMS_PER_SIDE, MAX_TEXT_LENGTH, sanitiseText, BUILTIN_ICONS,
  fileToIconSrc, putSessionIcon, removeSessionIcon, sessionIcons, MAX_SESSION_ICONS,
  UPLOAD_TYPES, UPLOAD_PX,
} from '../torsoDesign';

const BLUE = '#0055BF';
const DARK = '#1D1D1B';

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

const selectStyle = {
  // Browsers each draw their own box around a <select>; this is the one place
  // the shapes stopped matching the rest of the panel, so the native one is
  // turned off and the chevron drawn in.
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  width: '100%', border: 'none', outline: 'none', background: 'transparent',
  fontFamily: "'Montserrat', sans-serif", cursor: 'pointer',
};

const Chevron = () => (
  <span style={{ pointerEvents: 'none', display: 'flex', paddingRight: 12, color: '#6B7079' }}>
    <Ico d={<path d="M6 9l6 6 6-6" />} size={16} />
  </span>
);

const Field = ({ children, style }) => (
  <div style={{
    border: '1px solid #D8DBE0', borderRadius: 10, background: '#fff',
    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 14, fontWeight: 600, fontFamily: "'Montserrat', sans-serif", ...style,
  }}>{children}</div>
);


const TorsoDesignPanel = ({
  design,            // everything from useTorsoDesign
  side,
  tab, setTab,
  icons = BUILTIN_ICONS,
  onFlip,
  onDone,
  compact = false,
}) => {
  const {
    selected, sideItems, update, addText, addIcon, removeSelected, removeBySrc,
    reorder, resetSide, setSelectedId,
  } = design;
  const full = sideItems.length >= MAX_ITEMS_PER_SIDE;

  // The child's own pictures. They are shrunk and re-encoded here rather than
  // sent anywhere, and then kept in this sitting's store — the shirt item holds
  // only a reference to one, so nothing of the picture reaches the database.
  // What keeps it is the screenshot taken when the character is saved.
  const fileRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [uploads, setUploads] = useState(() => sessionIcons());
  const uploadsFull = uploads.length >= MAX_SESSION_ICONS;

  const onPickFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadError('');
    try {
      const ref = putSessionIcon(await fileToIconSrc(file), file.name);
      setUploads(sessionIcons());
      addIcon(ref, { from: 'upload', name: file.name.slice(0, 40) });
    } catch (e) {
      setUploadError(
        e.message === 'type' ? 'PNG, JPG or WEBP only.'
        : e.message === 'size' ? 'That picture is too big.'
        : e.message === 'full' ? `That is all ${MAX_SESSION_ICONS} pictures — remove one first.`
        : e.message === 'store' ? 'This browser would not keep that picture.'
        : 'That picture could not be read.'
      );
    }
  };

  const dropUpload = (icon) => {
    removeBySrc(icon.src);
    removeSessionIcon(icon.src);
    setUploads(sessionIcons());
    setUploadError('');
  };

  // The card shows what the open tab is about. With a line of writing selected,
  // pressing Decorations used to leave "Edit text" sitting there and no sticker
  // grid at all — the one thing that tab is for.
  const editingHere = !!selected && (
    (tab === 'text' && selected.type === 'text') ||
    (tab === 'icons' && selected.type === 'icon')
  );

  // Tabs and the selection are two halves of one thing, and they have to agree
  // both ways round. Picking something up on the shirt opens the tab that can
  // edit it — tapping a sticker while Text was open used to show "Add text"
  // and no way to change the sticker at all. The id alone is watched, so
  // pressing the other tab afterwards is not undone.
  useEffect(() => {
    if (!selected) return;
    const wants = selected.type === 'text' ? 'text' : 'icons';
    if (wants !== tab) setTab(wants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // ...and pressing a tab by hand lets go of anything that tab cannot edit,
  // so the handles leave the shirt with it.
  const changeTab = (next) => {
    if (selected && (next === 'text') !== (selected.type === 'text')) setSelectedId(null);
    setTab(next);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, height: '100%',
      fontFamily: "'Montserrat', sans-serif", boxSizing: 'border-box',
      padding: compact ? '8px 10px' : '10px 12px',
    }}>
      {/* which side is being worked on, and the way out */}
      <Row gap={8} style={{ flexShrink: 0 }}>
        <button type="button" onClick={onFlip}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff',
                         border: '1px solid #D8DBE0', borderRadius: 999, padding: '8px 14px',
                         cursor: 'pointer', color: DARK, fontFamily: "'Montserrat', sans-serif",
                         fontSize: 13, fontWeight: 700 }}>
          <IconFlip size={16} /> {side === 'front' ? 'Front' : 'Back'}
        </button>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6B7079' }}>
          {sideItems.length}/{MAX_ITEMS_PER_SIDE}
        </span>
        <Btn onClick={onDone} tone="blue" style={{ marginLeft: 'auto', padding: '9px 16px', fontSize: 13 }}>
          Save torso
        </Btn>
      </Row>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <Row gap={0}>
          <Tab icon={<IconSticker />} label="Decorations" active={tab === 'icons'} onClick={() => changeTab('icons')} />
          <Tab icon={<IconText />}    label="Text"        active={tab === 'text'}  onClick={() => changeTab('text')} />
        </Row>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
                    overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Row style={{ padding: '12px 12px 8px', justifyContent: 'space-between', flexShrink: 0 }}>
          <strong style={{ fontSize: 14 }}>
            {editingHere
              ? (selected.type === 'text' ? 'Edit text' : 'Edit decoration')
              : (tab === 'text' ? 'Text' : 'Decorations')}
          </strong>
        </Row>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {/* The way to add another of whatever this tab is for stays put, above
              whatever is being edited: adding a second sticker used to mean
              letting go of the first one to get the tray back. */}
          {tab === 'text' ? (
            <div style={{ padding: '0 12px 12px' }}>
              <Btn onClick={addText} tone="blue" disabled={full} style={{ width: '100%', fontSize: 13 }}>
                + Add text
              </Btn>
              {!editingHere ? (
                <p style={{ fontSize: 12, color: '#6B7079', fontWeight: 600, lineHeight: 1.5, marginTop: 10 }}>
                  Tap anything on the shirt to pick it up. Drag to move it, pull a corner to resize,
                  and use the handle above it to turn it.
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === 'icons' ? (
            <div style={{ padding: '0 12px 12px' }}>
              <input ref={fileRef} type="file" accept={UPLOAD_TYPES.join(',')}
                     onChange={onPickFile} style={{ display: 'none' }} />

              {/* The child's own pictures sit in the same tray as the stickers,
                  and the way to add one is the first tile in it: a plus where
                  the eye already is, rather than a button above the grid. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <button type="button" onClick={() => fileRef.current?.click()}
                        disabled={full || uploadsFull}
                        title={uploadsFull
                          ? `That is all ${MAX_SESSION_ICONS} of your own pictures`
                          : 'Upload your own picture'}
                        style={{ aspectRatio: '1', borderRadius: 10, padding: 0,
                                 border: `2px dashed ${full || uploadsFull ? '#D8DBE0' : BLUE}`,
                                 background: full || uploadsFull ? '#FAFBFC' : '#F2F6FD',
                                 color: full || uploadsFull ? '#B4B4B4' : BLUE,
                                 display: 'flex', flexDirection: 'column', alignItems: 'center',
                                 justifyContent: 'center', gap: 1,
                                 cursor: full || uploadsFull ? 'default' : 'pointer' }}>
                  <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>+</span>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.3 }}>ADD</span>
                </button>

                {uploads.map((ic) => (
                  <div key={ic.id} style={{ position: 'relative' }}>
                    <button type="button" title={ic.label} onClick={() => addIcon(ic.src, { from: 'upload', name: ic.label })}
                            disabled={full}
                            style={{ aspectRatio: '1', width: '100%', border: `1px solid ${BLUE}`, borderRadius: 10,
                                     background: '#fff', cursor: full ? 'default' : 'pointer', padding: 6 }}>
                      <img src={ic.data} alt={ic.label}
                           style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </button>
                    <button type="button" onClick={() => dropUpload(ic)} aria-label={`Remove ${ic.label}`}
                            title="Remove this picture"
                            style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                                     borderRadius: 999, border: '1px solid #D8DBE0', background: '#fff',
                                     color: '#C81E24', fontSize: 13, fontWeight: 800, lineHeight: 1,
                                     cursor: 'pointer', padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }}>
                      ×
                    </button>
                  </div>
                ))}

                {icons.map((ic) => (
                  <button key={ic.id} type="button" title={ic.label} onClick={() => addIcon(ic.src)} disabled={full}
                          style={{ aspectRatio: '1', border: '1px solid #D8DBE0', borderRadius: 10,
                                   background: '#fff', cursor: full ? 'default' : 'pointer', padding: 6 }}>
                    <img src={ic.src} alt={ic.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>

              {uploadError ? (
                <p style={{ fontSize: 12, color: '#C81E24', fontWeight: 700, margin: '10px 0 0' }}>{uploadError}</p>
              ) : null}
              <p style={{ fontSize: 11, color: '#6B7079', fontWeight: 600, lineHeight: 1.5, margin: '10px 0 0' }}>
                Your own pictures are shrunk to {UPLOAD_PX}px and kept only for this visit
                ({uploads.length}/{MAX_SESSION_ICONS}). They stay on your Mini's picture, and
                are never sent anywhere.
              </p>
            </div>
          ) : null}

          {editingHere && selected.type === 'text' ? (
            <div style={{ padding: '0 12px 8px' }}>
              <Field style={{ marginBottom: 8, padding: 0 }}>
                <select value={selected.fontId}
                        onChange={(e) => update(selected.id, { fontId: e.target.value, text: sanitiseText(selected.text, e.target.value) })}
                        style={{ ...selectStyle, padding: '10px 0 10px 12px', fontSize: 13.5, fontWeight: 600 }}>
                  {FONTS.map((f) => <option key={f.id} value={f.id}>{f.family}</option>)}
                </select>
                <Chevron />
              </Field>

              <Field style={{ marginBottom: 8, padding: 0 }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginLeft: 12,
                               background: selected.colour, border: '1px solid #B9BDC4' }} />
                <select value={selected.colour}
                        onChange={(e) => update(selected.id, { colour: e.target.value })}
                        style={{ ...selectStyle, padding: '10px 0 10px 10px', fontSize: 13.5, fontWeight: 600,
                                 textTransform: 'capitalize' }}>
                  {TEXT_COLOURS.map((c) => <option key={c.id} value={c.hex}>{c.id}</option>)}
                </select>
                <Chevron />
              </Field>

              <Row gap={0} style={{ border: '1px solid #D8DBE0', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                {[
                  { key: 'bold', label: 'B', style: { fontWeight: 900 } },
                  { key: 'italic', label: 'I', style: { fontStyle: 'italic', fontFamily: 'Georgia, serif' } },
                  { key: 'underline', label: 'U', style: { textDecoration: 'underline' } },
                ].map((b, i) => (
                  <button key={b.key} type="button" onClick={() => update(selected.id, { [b.key]: !selected[b.key] })}
                          style={{ flex: 1, padding: '10px 0', fontSize: 15, cursor: 'pointer', border: 'none',
                                   background: selected[b.key] ? '#E7EFFC' : '#fff', color: DARK,
                                   borderLeft: i ? '1px solid #D8DBE0' : 'none', ...b.style }}>
                    {b.label}
                  </button>
                ))}
              </Row>

              <input value={selected.text}
                     onChange={(e) => update(selected.id, { text: sanitiseText(e.target.value, selected.fontId) })}
                     maxLength={MAX_TEXT_LENGTH} placeholder="Type here" aria-label="Shirt text"
                     style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D8DBE0', borderRadius: 10,
                              padding: '10px 12px', fontSize: 14, fontWeight: 700, letterSpacing: 1,
                              textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif", outline: 'none' }} />
            </div>
          ) : null}

          {editingHere ? (
            <div style={{ borderTop: '1px solid #E4E6EA' }}>
              <CardRow icon={<IconForward />}  onClick={() => reorder('forward')}>Move forwards</CardRow>
              <CardRow icon={<IconBackward />} onClick={() => reorder('backward')}>Move backwards</CardRow>
              <CardRow icon={<IconTrash />}    onClick={removeSelected} danger>Delete</CardRow>
            </div>
          ) : null}
        </div>
      </div>

      <button type="button" onClick={resetSide}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                       background: 'none', border: 'none', cursor: 'pointer', color: DARK, flexShrink: 0,
                       fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 600,
                       textDecoration: 'underline', paddingBottom: 2 }}>
        <IconTrash size={16} /> Clear this side
      </button>
    </div>
  );
};

export default TorsoDesignPanel;
