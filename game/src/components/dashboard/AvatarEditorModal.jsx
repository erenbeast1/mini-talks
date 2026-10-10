// src/components/dashboard/AvatarEditorModal.jsx
// Change Avatar tuşuna basınca açılan tam ekran 3D LEGO avatar editörü modalı.
// Forumdaki AvatarEditor'ün dashboard'a taşınmış hali; minitalks-api'ye kaydeder.
//
// Props:
//   isOpen      : boolean
//   onClose     : fn()
//   userId      : number (zorunlu) - kaydetme/çekme için
//   role        : 'parent' | 'expert' | 'builder' | 'mini'  (DB id kolonu seçimi)
//   onSaved     : fn(savedData)  - { avatar_url, version, config, role }
//
// GLB/PNG asset'leri oyun sitesinden (mini-talks.com/models) yüklenir; CORS açık olmalı.
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AvatarEditor from '../../avatar-editor/AvatarEditor';
import '../../avatar-editor/AvatarEditor.css';
import { publishAvatar } from '../../utils/avatars';

const API_BASE = 'https://mini-talks.org/minitalks-api';

// Rol -> torso UV id eşlemesi (forumdaki mf_role_torso_id ile aynı mantık).
// Dashboard rolleri doğrudan parent/expert/builder/mini geldiği için onları eşliyoruz.
const ROLE_TORSO = {
  parent:  'c_f_m_basic_minitalks_short_02_red',
  expert:  'c_f_m_basic_minitalks_short_04_green',
  builder: 'c_f_m_basic_minitalks_short_03_blue',
  mini:    'c_f_m_basic_minitalks_short_05_orange',
  child:   'c_f_m_basic_minitalks_short_05_orange',
};

const AvatarEditorModal = ({ isOpen, onClose, userId, role = 'parent', onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [initialConfig, setInitialConfig] = useState(null);
  const [ready, setReady] = useState(false);

  // NOT: GLB/PNG yolları artık editörün model dosyaları içinde oyunla aynı
  // şekilde çözülüyor (hair/body → import.meta.url, face/torso → public /models).
  // Bu yüzden window.MF_AVATAR_* global'lerine gerek yok.

  // Modal açılınca kayıtlı config'i çek
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setReady(false);

    // userId yoksa fetch yapma ama yine de editörü aç (default config)
    if (!userId) {
      setInitialConfig(null);
      setLoading(false);
      setReady(true);
      return;
    }

    axios
      .get(`${API_BASE}/avatar/get.php`, { params: { user_id: userId, role } })
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success && res.data.data?.config) {
          setInitialConfig(res.data.data.config);
        } else {
          setInitialConfig(null);
        }
      })
      .catch(() => {
        if (!cancelled) setInitialConfig(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      });

    return () => { cancelled = true; };
  }, [isOpen, userId, role]);

  if (!isOpen) return null;

  const torsoId = ROLE_TORSO[role] || ROLE_TORSO.parent;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      }}
    >
      {/* MiniProfile ChangeAvatarPopup yapısı: mavi dış kutu + beyaz iç panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0055BF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '1120px',
          height: '92vh',
          maxHeight: '920px',
          position: 'relative',
          boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Montserrat', sans-serif"
        }}
      >
        {/* Mavi header bandı + başlık */}
        <div style={{
          padding: '15px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0
        }}>
          <h2 style={{
            color: '#ffffff',
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            fontSize: '28px',
            textAlign: 'center',
            margin: 0
          }}>
            Customize Your Avatar
          </h2>

          {/* Close butonu */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '3px solid #fff',
              backgroundColor: 'transparent',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* Beyaz iç panel - editör burada (MiniProfile: margin 0 6px 6px 6px, radius 18px) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          margin: '0 6px 6px 6px',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {loading || !ready ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: 800 }}>
              🧱 Loading editor...
            </div>
          ) : (
            <AvatarEditor
              initialConfig={initialConfig}
              userId={userId}
              apiBase={API_BASE}
              role={role}
              torsoId={torsoId}
              onSaveSuccess={(savedData) => {
                // Publish before the caller's own handler runs. Every screen
                // showing this profile — the header, the My Mini(s) cards, the
                // other dashboard tabs — picks the new picture up from here,
                // so no caller has to remember to tell anybody.
                publishAvatar(role, userId, savedData?.avatar_url, savedData?.version);
                if (onSaved) onSaved(savedData);
                onClose();
              }}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarEditorModal;