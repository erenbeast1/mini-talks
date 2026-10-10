// src/components/dashboard/MiniProfile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import profileIcon from '../../assets/profile-icon.png';
import AvatarEditorModal from './AvatarEditorModal';
import { useAvatar } from '../../hooks/useAvatar';

// PNG Assets (ParentProfile ile aynı path'ler)
import changeAvatarBtn from '../../assets/change_avatar_btn.png';
import changeAvatarBtnHover from '../../assets/change_avatar_btn_hover.png';
import saveChangesBtn from '../../assets/save_changes_btn.png';
import saveChangesBtnHover from '../../assets/save_changes_btn_hover.png';

const API_BASE = 'https://mini-talks.org/minitalks-api';

// Main MiniProfile Component
const MiniProfile = ({ user, mini, onUserUpdate }) => {
  const [avatarHover, setAvatarHover] = useState(false);
  const [saveHover, setSaveHover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);

  // NOT: Mini için userId = mini.mini_id (user.user_id DEĞİL).
  // Tüm mini sistemi mini_id kullanıyor.
  const miniId = mini?.mini_id || user?.profile?.mini_id || user?.mini_id;
  const [miniName, setMiniName] = useState('');

  // Kayıtlı 3D avatar PNG'si (yoksa default ikon)
  // Shared with the header and the My Mini(s) cards, so changing a Mini's
  // picture changes it everywhere that Mini appears.
  const { avatarUrl, checked: avatarChecked } = useAvatar('mini', miniId);

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

  useEffect(() => {
    if (mini?.mini_name) {
      setMiniName(mini.mini_name);
    } else if (user?.profile?.mini_name) {
      setMiniName(user.profile.mini_name);
    }
  }, [mini, user]);

  const handleSave = async () => {
    if (!miniId) {
      setMessage('Mini ID not found');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const response = await axios.post('https://mini-talks.org/minitalks-api/profile/update-mini.php', {
        mini_id: miniId,
        mini_name: miniName
      });

      if (response.data.success) {
        setMessage('Changes saved successfully!');

        const storedMini = sessionStorage.getItem('selectedMini');
        if (storedMini) {
          const parsedMini = JSON.parse(storedMini);
          parsedMini.mini_name = miniName;
          sessionStorage.setItem('selectedMini', JSON.stringify(parsedMini));
        }

        if (onUserUpdate && user) {
          const updatedUser = { ...user, profile: { ...user.profile, mini_name: miniName } };
          onUserUpdate(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        window.dispatchEvent(new Event('userUpdated'));
      } else {
        setMessage(response.data.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3D avatar kaydedilince
  // The editor modal publishes the new picture to the shared cache itself, so
  // there is nothing to set here — only something to say.
  const handleAvatarSaved = () => {
    setMessage('Profile picture updated!');
  };

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    return (
      <div style={{ backgroundColor: '#fff', padding: '6px 12px 10px', fontFamily: "'Montserrat', sans-serif", height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* Başlık ortada */}
        <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: '8px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#000', fontFamily: "'Montserrat', sans-serif" }}>MINI PROFILE</h1>
          <p style={{ color: '#666', fontSize: '11px', margin: '2px 0 0' }}>Give your Mini a name and a cool new look!</p>
        </div>

        {/* Message */}
        {message && (
          <div style={{ padding: '6px 12px', borderRadius: '8px', marginBottom: '8px', backgroundColor: message.includes('success') || message.includes('updated') ? '#d4edda' : '#f8d7da', color: message.includes('success') || message.includes('updated') ? '#155724' : '#721c24', fontSize: '12px', textAlign: 'center', flexShrink: 0 }}>
            {message}
          </div>
        )}

        {/* Ana satır: avatar | form (password yok — tek sütun) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px', flex: '1 1 0%', minHeight: 0 }}>
          {/* Sol — Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ width: '108px', height: '108px', backgroundColor: '#FFCC00', borderRadius: '14px', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={avatarUrl || profileIcon} alt="Mini Avatar"
                style={{ width: avatarUrl ? '100%' : '64px', height: avatarUrl ? '100%' : '64px', objectFit: avatarUrl ? 'cover' : 'contain', opacity: avatarChecked ? 1 : 0, transition: 'opacity 0.25s ease' }} />
            </div>
            <button onClick={() => setAvatarEditorOpen(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
              <img src={changeAvatarBtn} alt="Change Avatar" style={{ height: '36px' }} />
            </button>
          </div>

          {/* Form — Mini Name */}
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', fontFamily: "'Montserrat', sans-serif" }}>Mini Name:</label>
              <input
                type="text"
                value={miniName}
                onChange={(e) => setMiniName(e.target.value)}
                style={{ width: '200px', padding: '8px 12px', borderRadius: '10px', border: '2px solid #000', fontSize: '13px', fontWeight: 500, fontFamily: "'Montserrat', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                placeholder="Enter mini name"
              />
            </div>
          </form>
        </div>

        {/* Alt — Save Changes ortalı */}
        <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, paddingTop: '6px' }}>
          <button type="submit" onClick={handleSave} disabled={loading}
            style={{ border: 'none', background: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, padding: 0 }}>
            <img src={saveChangesBtn} alt="Save Changes" style={{ height: '44px' }} />
          </button>
        </div>

        {/* 3D LEGO Avatar Editörü */}
        <AvatarEditorModal
          isOpen={avatarEditorOpen}
          onClose={() => setAvatarEditorOpen(false)}
          userId={miniId}
          role="mini"
          onSaved={handleAvatarSaved}
        />
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div style={{ backgroundColor: '#fff', padding: '40px 20px', fontFamily: "'Montserrat', sans-serif" }}>
      {/* Ana container */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Üst kısım - Avatar ve Form yan yana */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '40px' }}>

          {/* Left Side - Avatar (KARE) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{
              width: '180px',
              height: '180px',
              backgroundColor: '#FFCC00',
              borderRadius: '16px',
              border: '4px solid #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img
                src={avatarUrl || profileIcon}
                alt="Mini Avatar"
                style={{ width: avatarUrl ? '100%' : '100px', height: avatarUrl ? '100%' : '100px', objectFit: avatarUrl ? 'cover' : 'contain', opacity: avatarChecked ? 1 : 0, transition: 'opacity 0.25s ease' }}
              />
            </div>
            <button onClick={() => setAvatarEditorOpen(true)} onMouseEnter={() => setAvatarHover(true)} onMouseLeave={() => setAvatarHover(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
              <img src={avatarHover ? changeAvatarBtnHover : changeAvatarBtn} alt="Change Avatar" style={{ height: '52px' }} />
            </button>
          </div>

          {/* Right Side - Title + Form */}
          <div>
            <h1 style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '42px',
              fontWeight: 900,
              margin: 0,
              marginBottom: '8px'
            }}>
              MINI PROFILE
            </h1>
            <p style={{ color: '#666', fontSize: '15px', margin: 0, marginBottom: '24px' }}>
              Give your Mini a name and a cool new look!
            </p>

            {/* Message */}
            {message && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', backgroundColor: message.includes('success') || message.includes('updated') ? '#d4edda' : '#f8d7da', color: message.includes('success') || message.includes('updated') ? '#155724' : '#721c24', fontSize: '14px', textAlign: 'center' }}>
                {message}
              </div>
            )}

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Mini Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ fontWeight: 700, fontSize: '16px', minWidth: '110px', textAlign: 'right' }}>Mini Name:</label>
                  <input
                    type="text"
                    value={miniName}
                    onChange={(e) => setMiniName(e.target.value)}
                    style={{ width: '320px', padding: '12px 16px', borderRadius: '12px', border: '3px solid #000', fontSize: '16px', fontWeight: 500, fontFamily: "'Montserrat', sans-serif", outline: 'none' }}
                    placeholder="Enter mini name"
                  />
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Save Button - TÜM BLOKLARA GÖRE ORTALI */}
        <div style={{ marginTop: '28px' }}>
          <button type="submit" onClick={handleSave} disabled={loading} onMouseEnter={() => setSaveHover(true)} onMouseLeave={() => setSaveHover(false)}
            style={{ border: 'none', background: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            <img src={saveHover ? saveChangesBtnHover : saveChangesBtn} alt="Save Changes" style={{ height: '64px' }} />
          </button>
        </div>
      </div>

      {/* 3D LEGO Avatar Editörü */}
      <AvatarEditorModal
        isOpen={avatarEditorOpen}
        onClose={() => setAvatarEditorOpen(false)}
        userId={miniId}
        role="mini"
        onSaved={handleAvatarSaved}
      />
    </div>
  );
};

export default MiniProfile;