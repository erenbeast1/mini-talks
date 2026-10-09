// src/components/dashboard/ExpertProfile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import profileIcon from '../../assets/profile-icon.png';
import expertIcon from '../../assets/expert.png';
import AvatarEditorModal from './AvatarEditorModal';

// PNG Assets (ParentProfile ile aynı path'ler)
import changeAvatarBtn from '../../assets/change_avatar_btn.png';
import changeAvatarBtnHover from '../../assets/change_avatar_btn_hover.png';
import changePasswordBtn from '../../assets/change_password_btn.png';
import changePasswordBtnHover from '../../assets/change_password_btn_hover.png';
import saveChangesBtn from '../../assets/save_changes_btn.png';
import saveChangesBtnHover from '../../assets/save_changes_btn_hover.png';
import savePasswordBtn from '../../assets/Save Password Blue Btn.png';
import savePasswordBtnHover from '../../assets/Save Password Blue Btn Hover.png';
import cancelRedBtn from '../../assets/Cancel Red Btn 2.png';
import cancelRedBtnHover from '../../assets/Cancel Red Btn 2 Hover.png';

const API_BASE = 'https://mini-talks.org/minitalks-api';

// Eye Icon Component
const EyeIcon = ({ visible, onClick }) => (
  <button type="button" onClick={onClick}
    style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {visible ? (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    ) : (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    )}
  </button>
);

// Change Password Popup
const ChangePasswordPopup = ({ isOpen, onClose, onSave, userId }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);
  const [saveHover, setSaveHover] = useState(false);

  const handleSave = async () => {
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters long'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    try {
      setLoading(true);
      const response = await axios.post('https://mini-talks.org/minitalks-api/profile/update-password.php', { user_id: userId, password, confirm_password: confirmPassword });
      if (response.data.success) { onSave(); handleClose(); }
      else { setError(response.data.error || 'Failed to update password'); }
    } catch (err) { setError('Failed to update password'); }
    finally { setLoading(false); }
  };

  const handleClose = () => { setPassword(''); setConfirmPassword(''); setShowPassword(false); setShowConfirmPassword(false); setError(''); onClose(); };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ margin: '0 16px' }}>
        <div style={{ backgroundColor: '#237841', borderRadius: '20px', overflow: 'hidden', boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)', maxWidth: '600px', width: '100%' }}>
          <div style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ color: '#ffffff', fontFamily: "'Montserrat', sans-serif", fontSize: '28px', fontWeight: 900, margin: 0 }}>Set a New Password</h2>
          </div>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', margin: '0 6px 6px 6px', padding: '25px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '18px', margin: 0, color: '#000' }}>Please enter your new password below.</p>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '16px', color: '#000', margin: '5px 0 0 0' }}>Make sure it's at least 8 characters long.</p>
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#000' }}>Password:</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '220px', height: '50px', padding: '0 50px 0 20px', border: '3px solid #000', borderRadius: '15px', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', boxSizing: 'border-box' }} placeholder="••••••••" />
                  <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#000' }}>Confirm Password:</label>
                <div style={{ position: 'relative' }}>
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '220px', height: '50px', padding: '0 50px 0 20px', border: '3px solid #000', borderRadius: '15px', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', boxSizing: 'border-box' }} placeholder="••••••••" />
                  <EyeIcon visible={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
                </div>
              </div>
            </div>
            {error && <p style={{ color: '#E31E24', textAlign: 'center', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, margin: '0 0 15px 0', fontSize: '14px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button
                onClick={handleClose}
                onMouseEnter={() => setCancelHover(true)}
                onMouseLeave={() => setCancelHover(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              >
                <img src={cancelHover ? cancelRedBtnHover : cancelRedBtn} alt="Cancel" style={{ height: '58px' }} />
              </button>
              <button
                onClick={handleSave}
                onMouseEnter={() => setSaveHover(true)}
                onMouseLeave={() => setSaveHover(false)}
                disabled={loading}
                style={{ border: 'none', background: 'none', cursor: loading ? 'not-allowed' : 'pointer', padding: 0, opacity: loading ? 0.6 : 1 }}
              >
                <img src={saveHover ? savePasswordBtnHover : savePasswordBtn} alt="Save Password" style={{ height: '58px' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main ExpertProfile Component
const ExpertProfile = ({ user, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    fullName: user.profile?.full_name || '',
    profession: user.profile?.profession || '',
    organization: user.profile?.organization || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [avatarHover, setAvatarHover] = useState(false);
  const [passwordHover, setPasswordHover] = useState(false);
  const [saveHover, setSaveHover] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [passwordPopupOpen, setPasswordPopupOpen] = useState(false);

  // Kayıtlı 3D avatar PNG'si (yoksa default ikon)
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarChecked, setAvatarChecked] = useState(false);

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

  // Kayıtlı avatar'ı çek
  useEffect(() => {
    if (!user?.user_id) { setAvatarChecked(true); return; }
    axios.get(`${API_BASE}/avatar/get.php`, { params: { user_id: user.user_id, role: 'expert' } })
      .then((res) => {
        if (res.data?.success && res.data.data?.avatar_url) {
          setAvatarUrl(res.data.data.avatar_url);
        }
      })
      .catch(() => {})
      .finally(() => setAvatarChecked(true));
  }, [user?.user_id]);

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post('https://mini-talks.org/minitalks-api/auth/update-expert-profile.php', {
        user_id: user.user_id,
        full_name: formData.fullName,
        profession: formData.profession,
        organization: formData.organization
      });
      if (response.data.success) {
        setMessage('Profile updated successfully!');
        const updatedUser = { ...user, profile: { ...user.profile, full_name: formData.fullName, profession: formData.profession, organization: formData.organization } };
        if (onUserUpdate) onUserUpdate(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('userUpdated'));
      } else { setMessage(response.data.error || 'Failed to update profile'); }
    } catch (error) { setMessage('Failed to update profile. Please try again.'); }
    finally { setLoading(false); }
  };

  const handlePasswordSaved = () => { setMessage('Password updated successfully!'); };

  // 3D avatar kaydedilince
  const handleAvatarSaved = (savedData) => {
    if (savedData?.avatar_url) {
      const bust = savedData.version ? `?v=${savedData.version}` : '';
      setAvatarUrl(savedData.avatar_url + bust);
    }
    setMessage('Profile picture updated!');
  };

  // ── Mobil ortak stiller ──
  const mLabel = { fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', fontFamily: "'Montserrat', sans-serif" };
  const mInput = { width: '180px', padding: '7px 11px', borderRadius: '10px', border: '2px solid #000', fontSize: '12px', fontWeight: 500, fontFamily: "'Montserrat', sans-serif", outline: 'none', boxSizing: 'border-box' };
  const mInputRO = { ...mInput, border: '2px solid #e0e0e0', backgroundColor: '#f8f8f8', color: '#888' };
  const mRow = { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' };

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    return (
      <div style={{ backgroundColor: '#fff', padding: '6px 12px 10px', fontFamily: "'Montserrat', sans-serif", height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* Başlık ortada */}
        <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: '6px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#000', fontFamily: "'Montserrat', sans-serif" }}>EXPERT PROFILE</h1>
          <p style={{ color: '#666', fontSize: '11px', margin: '2px 0 0' }}>Update your expert account information here.</p>
        </div>

        {/* Message */}
        {message && (
          <div style={{ padding: '6px 12px', borderRadius: '8px', marginBottom: '6px', backgroundColor: message.includes('success') || message.includes('updated') ? '#d4edda' : '#f8d7da', color: message.includes('success') || message.includes('updated') ? '#155724' : '#721c24', fontSize: '12px', textAlign: 'center', flexShrink: 0 }}>
            {message}
          </div>
        )}

        {/* Ana satır: avatar | form | çizgi | password */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flex: '1 1 0%', minHeight: 0 }}>
          {/* Sol — Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ width: '104px', height: '104px', backgroundColor: '#FFCC00', borderRadius: '14px', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={avatarUrl || expertIcon} alt="Avatar"
                style={{ width: avatarUrl ? '100%' : '60px', height: avatarUrl ? '100%' : '60px', objectFit: avatarUrl ? 'cover' : 'contain', opacity: avatarChecked ? 1 : 0, transition: 'opacity 0.25s ease' }} />
            </div>
            <button onClick={() => setAvatarEditorOpen(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
              <img src={changeAvatarBtn} alt="Change Avatar" style={{ height: '36px' }} />
            </button>
          </div>

          {/* Orta — Form (5 alan kompakt) */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={mRow}>
              <label style={mLabel}>Full Name:</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} style={mInput} placeholder="Your full name" />
            </div>
            <div style={mRow}>
              <label style={mLabel}>Profession:</label>
              <input type="text" name="profession" value={formData.profession} onChange={handleChange} style={mInput} placeholder="Speech Therapist" />
            </div>
            <div style={mRow}>
              <label style={mLabel}>Organization:</label>
              <input type="text" name="organization" value={formData.organization} onChange={handleChange} style={mInput} placeholder="Your organization" />
            </div>
            <div style={mRow}>
              <label style={mLabel}>Username:</label>
              <input type="text" value={user.profile?.username || 'expert_user'} readOnly style={mInputRO} />
            </div>
            <div style={mRow}>
              <label style={mLabel}>Email:</label>
              <input type="email" value={user.email || 'read-only'} readOnly style={mInputRO} />
            </div>
          </form>

          {/* Dikey çizgi */}
          <div style={{ width: '2px', alignSelf: 'stretch', background: '#D8D8D8', flexShrink: 0, margin: '6px 0' }} />

          {/* Sağ — Password */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px' }}>
            <div style={mRow}>
              <label style={mLabel}>Password:</label>
              <input type="password" value="••••••••" readOnly style={{ ...mInput, width: '140px' }} />
            </div>
            <button type="button" onClick={() => setPasswordPopupOpen(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
              <img src={changePasswordBtn} alt="Change Password" style={{ height: '38px' }} />
            </button>
          </div>
        </div>

        {/* Alt — Save Changes ortalı */}
        <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, paddingTop: '6px' }}>
          <button type="submit" onClick={handleSubmit} disabled={loading}
            style={{ border: 'none', background: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, padding: 0 }}>
            <img src={saveChangesBtn} alt="Save Changes" style={{ height: '44px' }} />
          </button>
        </div>

        <AvatarEditorModal isOpen={avatarEditorOpen} onClose={() => setAvatarEditorOpen(false)} userId={user.user_id} role="expert" onSaved={handleAvatarSaved} />
        <ChangePasswordPopup isOpen={passwordPopupOpen} onClose={() => setPasswordPopupOpen(false)} onSave={handlePasswordSaved} userId={user.user_id} />
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div style={{ backgroundColor: '#fff', padding: '40px 20px', fontFamily: "'Montserrat', sans-serif" }}>
      {/* Ana container - tüm içeriği sarıyor */}
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
                src={avatarUrl || expertIcon}
                alt="Avatar"
                style={{ width: avatarUrl ? '100%' : '100px', height: avatarUrl ? '100%' : '100px', objectFit: avatarUrl ? 'cover' : 'contain', opacity: avatarChecked ? 1 : 0, transition: 'opacity 0.25s ease' }}
              />
            </div>
            <button onClick={() => setAvatarEditorOpen(true)} onMouseEnter={() => setAvatarHover(true)} onMouseLeave={() => setAvatarHover(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
              <img src={avatarHover ? changeAvatarBtnHover : changeAvatarBtn} alt="Change Avatar" style={{ height: '52px' }} />
            </button>
          </div>

          {/* Right Side - Title + Form */}
          <div>
            {/* Title - Profil kartının üstüyle aynı hizadan başlıyor */}
            <h1 style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '42px',
              fontWeight: 900,
              margin: 0,
              marginBottom: '8px'
            }}>
              EXPERT PROFILE
            </h1>
            <p style={{ color: '#666', fontSize: '15px', margin: 0, marginBottom: '24px' }}>
              Update your expert account information here.
            </p>

            {/* Message */}
            {message && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', backgroundColor: message.includes('success') || message.includes('updated') ? '#d4edda' : '#f8d7da', color: message.includes('success') || message.includes('updated') ? '#155724' : '#721c24', fontSize: '14px', textAlign: 'center' }}>
                {message}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Full Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ fontWeight: 700, fontSize: '16px', minWidth: '120px', textAlign: 'right' }}>Full Name:</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                    style={{ width: '320px', padding: '12px 16px', borderRadius: '12px', border: '3px solid #000', fontSize: '16px', fontWeight: 500, fontFamily: "'Montserrat', sans-serif", outline: 'none' }} placeholder="Your full name" />
                </div>

                {/* Profession */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ fontWeight: 700, fontSize: '16px', minWidth: '120px', textAlign: 'right' }}>Profession:</label>
                  <input type="text" name="profession" value={formData.profession} onChange={handleChange}
                    style={{ width: '320px', padding: '12px 16px', borderRadius: '12px', border: '3px solid #000', fontSize: '16px', fontWeight: 500, fontFamily: "'Montserrat', sans-serif", outline: 'none' }} placeholder="Speech Therapist" />
                </div>

                {/* Organization */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ fontWeight: 700, fontSize: '16px', minWidth: '120px', textAlign: 'right' }}>Organization:</label>
                  <input type="text" name="organization" value={formData.organization} onChange={handleChange}
                    style={{ width: '320px', padding: '12px 16px', borderRadius: '12px', border: '3px solid #000', fontSize: '16px', fontWeight: 500, fontFamily: "'Montserrat', sans-serif", outline: 'none' }} placeholder="Your organization" />
                </div>

                {/* Username - Read Only */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ fontWeight: 700, fontSize: '16px', minWidth: '120px', textAlign: 'right' }}>Username:</label>
                  <input type="text" value={user.profile?.username || 'expert_user'} readOnly
                    style={{ width: '320px', padding: '12px 16px', borderRadius: '12px', border: '3px solid #e0e0e0', fontSize: '16px', fontWeight: 500, fontFamily: "'Montserrat', sans-serif", backgroundColor: '#f8f8f8', color: '#888', outline: 'none' }} />
                </div>

                {/* Email - Read Only */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ fontWeight: 700, fontSize: '16px', minWidth: '120px', textAlign: 'right' }}>Email:</label>
                  <input type="email" value={user.email || 'read-only'} readOnly
                    style={{ width: '320px', padding: '12px 16px', borderRadius: '12px', border: '3px solid #e0e0e0', fontSize: '16px', fontWeight: 500, fontFamily: "'Montserrat', sans-serif", backgroundColor: '#f8f8f8', color: '#888', outline: 'none' }} />
                </div>

                {/* Password */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label style={{ fontWeight: 700, fontSize: '16px', minWidth: '120px', textAlign: 'right' }}>Password:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="password" value="••••••••" readOnly
                      style={{ width: '320px', padding: '12px 16px', borderRadius: '12px', border: '3px solid #000', fontSize: '16px', fontWeight: 500, fontFamily: "'Montserrat', sans-serif", outline: 'none' }} />
                    <button type="button" onClick={() => setPasswordPopupOpen(true)} onMouseEnter={() => setPasswordHover(true)} onMouseLeave={() => setPasswordHover(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}>
                      <img src={passwordHover ? changePasswordBtnHover : changePasswordBtn} alt="Change Password" style={{ height: '54px' }} />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Save Button - TÜM BLOKLARA GÖRE ORTALI */}
        <div style={{ marginTop: '28px' }}>
          <button type="submit" onClick={handleSubmit} disabled={loading} onMouseEnter={() => setSaveHover(true)} onMouseLeave={() => setSaveHover(false)}
            style={{ border: 'none', background: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            <img src={saveHover ? saveChangesBtnHover : saveChangesBtn} alt="Save Changes" style={{ height: '64px' }} />
          </button>
        </div>
      </div>

      {/* 3D LEGO Avatar Editörü */}
      <AvatarEditorModal
        isOpen={avatarEditorOpen}
        onClose={() => setAvatarEditorOpen(false)}
        userId={user.user_id}
        role="expert"
        onSaved={handleAvatarSaved}
      />

      <ChangePasswordPopup isOpen={passwordPopupOpen} onClose={() => setPasswordPopupOpen(false)} onSave={handlePasswordSaved} userId={user.user_id} />
    </div>
  );
};

export default ExpertProfile;