// src/pages/SettingsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlert } from '../components/popups/AlertSystem';
import Header from '../components/common/Header';

const languages = [
  { code: 'en', name: 'English', flag: 'https://flagcdn.com/w40/us.png' },
  { code: 'tr', name: 'Türkçe', flag: 'https://flagcdn.com/w40/tr.png' },
  { code: 'es', name: 'Español', flag: 'https://flagcdn.com/w40/es.png' },
  { code: 'de', name: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png' },
  { code: 'it', name: 'Italiano', flag: 'https://flagcdn.com/w40/it.png' },
  { code: 'dk', name: 'Dansk', flag: 'https://flagcdn.com/w40/dk.png' },
  { code: 'fr', name: 'Français', flag: 'https://flagcdn.com/w40/fr.png' },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { alert } = useAlert();
  
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  const [settings, setSettings] = useState({
    audioGuidance: true,
    reducedMotion: false,
    dailyStreakReminders: false,
    recordingReminders: true,
    microphoneAccess: true,
  });

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

  // Mobil aktif tab: 'language' | 'accessibility' | 'notification' | 'microphone'
  const [mobileTab, setMobileTab] = useState('language');
  const langBtnRef = useRef(null);
  const [dropPos, setDropPos] = useState(null);

  const openLangDropdown = () => {
    if (showLanguageDropdown) { setShowLanguageDropdown(false); return; }
    const el = langBtnRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      setDropPos({
        left: r.left,
        width: r.width,
        top: openUp ? null : r.bottom + 6,
        bottom: openUp ? (window.innerHeight - r.top + 6) : null,
        maxHeight: Math.max(120, (openUp ? spaceAbove : spaceBelow) - 16)
      });
    }
    setShowLanguageDropdown(true);
  };

  const currentLanguage = languages.find(l => l.code === selectedLanguage);

  // Navigation items - AboutPage ile aynı
  const navigationItems = [
    { id: 'play', label: 'PLAY', action: () => navigate('/scene-selection') },
    { id: 'about', label: 'ABOUT', action: () => navigate('/about') },
    { id: 'settings', label: 'SETTINGS', action: () => {} }
  ];

  const handleSave = async () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    localStorage.setItem('appLanguage', selectedLanguage);
    await alert.success('Your settings have been saved successfully!', 'Settings Saved!');
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  const ToggleButton = ({ isOn, onToggle, small }) => (
    <div style={{ display: 'flex', gap: '3px' }}>
      <button
        onClick={() => onToggle(true)}
        style={{
          width: small ? '46px' : '58px',
          height: small ? '26px' : '30px',
          borderRadius: '8px',
          border: '2px solid #000',
          backgroundColor: isOn ? '#237841' : '#fff',
          color: isOn ? '#fff' : '#000',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 900,
          fontSize: small ? '11px' : '12px',
          cursor: 'pointer'
        }}
      >
        ON
      </button>
      <button
        onClick={() => onToggle(false)}
        style={{
          width: small ? '46px' : '58px',
          height: small ? '26px' : '30px',
          borderRadius: '8px',
          border: '2px solid #000',
          backgroundColor: !isOn ? '#E31E24' : '#fff',
          color: !isOn ? '#fff' : '#000',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 900,
          fontSize: small ? '11px' : '12px',
          cursor: 'pointer'
        }}
      >
        OFF
      </button>
    </div>
  );

  // ════════════════════════ MOBİL ════════════════════════
  if (isSmallScreen) {
    const mFont = { fontFamily: "'Montserrat', sans-serif" };

    const tabBtn = (active) => ({
      ...mFont,
      flex: '1 1 0%',
      padding: '9px 4px',
      border: 'none',
      backgroundColor: active ? '#0055BF' : '#237841',
      color: active ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
      fontWeight: 800,
      fontSize: '11px',
      lineHeight: 1.15,
      cursor: 'pointer',
      textAlign: 'center'
    });

    const sectionDesc = { ...mFont, fontSize: '10px', color: '#636363', fontWeight: 600, textAlign: 'center', margin: '8px 0 10px' };
    const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 4px', borderBottom: '1px solid rgba(0,0,0,0.12)' };
    const rowLabel = { ...mFont, fontSize: '13px', fontWeight: 700, color: '#000' };

    return (
      <div style={{ ...mFont, height: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
        <Header 
          showBackButton={true}
          onBack={() => navigate('/')}
          navigationItems={navigationItems}
          activeNavItem="settings"
        />

        <div style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 12px 10px', boxSizing: 'border-box', overflow: 'hidden' }}>
          {/* Başlık */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <h1 style={{ ...mFont, fontSize: '22px', fontWeight: 900, margin: 0, color: '#000' }}>SETTINGS</h1>
            <div style={{ height: '3px', backgroundColor: '#237841', borderRadius: '2px', margin: '4px auto 8px', maxWidth: '520px' }} />
          </div>

          {/* Tab butonları */}
          <div style={{ display: 'flex', maxWidth: '520px', width: '100%', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', border: '2px solid #237841', flexShrink: 0 }}>
            <button type="button" style={tabBtn(mobileTab === 'language')} onClick={() => setMobileTab('language')}>Language</button>
            <button type="button" style={tabBtn(mobileTab === 'accessibility')} onClick={() => setMobileTab('accessibility')}>Accessibility</button>
            <button type="button" style={tabBtn(mobileTab === 'notification')} onClick={() => setMobileTab('notification')}>Notification</button>
            <button type="button" style={tabBtn(mobileTab === 'microphone')} onClick={() => setMobileTab('microphone')}>Microphone Permissions</button>
          </div>

          {/* İçerik */}
          <div style={{ flex: '1 1 0%', minHeight: 0, maxWidth: '520px', width: '100%', margin: '0 auto', overflow: 'visible', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {mobileTab === 'language' && (
              <div>
                <p style={sectionDesc}>Change the app's display language.</p>
                <button
                  ref={langBtnRef}
                  onClick={openLangDropdown}
                  style={{ width: '100%', height: '46px', backgroundColor: '#fff', borderRadius: '12px', border: '3px solid #237841', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', position: 'relative' }}
                >
                  <img src={currentLanguage?.flag} alt={currentLanguage?.name} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
                  <span style={{ ...mFont, color: '#000', fontSize: '16px', fontWeight: 900 }}>{currentLanguage?.name}</span>
                  <div style={{ position: 'absolute', right: '8px', backgroundColor: '#237841', borderRadius: '6px', width: '34px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontSize: '14px', transform: showLanguageDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                  </div>
                </button>
              </div>
            )}

            {mobileTab === 'accessibility' && (
              <div>
                <p style={sectionDesc}>Adjust the interface for comfort, clarity, and ease of use.</p>
                <div style={rowStyle}>
                  <span style={rowLabel}>Audio Guidance</span>
                  <ToggleButton small isOn={settings.audioGuidance} onToggle={(val) => setSettings(prev => ({ ...prev, audioGuidance: val }))} />
                </div>
                <div style={{ ...rowStyle, borderBottom: 'none' }}>
                  <span style={rowLabel}>Reduced Motion</span>
                  <ToggleButton small isOn={settings.reducedMotion} onToggle={(val) => setSettings(prev => ({ ...prev, reducedMotion: val }))} />
                </div>
              </div>
            )}

            {mobileTab === 'notification' && (
              <div>
                <p style={sectionDesc}>Choose which reminders you want to receive.</p>
                <div style={rowStyle}>
                  <span style={rowLabel}>Daily Streak Reminders</span>
                  <ToggleButton small isOn={settings.dailyStreakReminders} onToggle={(val) => setSettings(prev => ({ ...prev, dailyStreakReminders: val }))} />
                </div>
                <div style={{ ...rowStyle, borderBottom: 'none' }}>
                  <span style={rowLabel}>Recording Reminders</span>
                  <ToggleButton small isOn={settings.recordingReminders} onToggle={(val) => setSettings(prev => ({ ...prev, recordingReminders: val }))} />
                </div>
              </div>
            )}

            {mobileTab === 'microphone' && (
              <div>
                <p style={sectionDesc}>Allow Mini-Talks to use your device's microphone.</p>
                <div style={{ ...rowStyle, borderBottom: 'none' }}>
                  <span style={rowLabel}>Microphone Access</span>
                  <ToggleButton small isOn={settings.microphoneAccess} onToggle={(val) => setSettings(prev => ({ ...prev, microphoneAccess: val }))} />
                </div>
              </div>
            )}
          </div>

          {/* Save butonu */}
          <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, paddingTop: '6px' }}>
            <button
              onClick={handleSave}
              style={{ ...mFont, padding: '9px 34px', backgroundColor: '#0055BF', border: '3px solid #0055BF', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 900, cursor: 'pointer' }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Dil Dropdown — fixed (container overflow'undan etkilenmez), içi scroll'lu */}
        {showLanguageDropdown && dropPos && (
          <>
            {/* Dışarı tıklayınca kapat */}
            <div onClick={() => setShowLanguageDropdown(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
            <div
              style={{
                position: 'fixed',
                left: dropPos.left + 'px',
                width: dropPos.width + 'px',
                ...(dropPos.top !== null ? { top: dropPos.top + 'px' } : { bottom: dropPos.bottom + 'px' }),
                maxHeight: dropPos.maxHeight + 'px',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                backgroundColor: '#e8e8e8',
                borderRadius: '12px',
                border: '3px solid #237841',
                padding: '8px',
                zIndex: 9999,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
              }}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setSelectedLanguage(lang.code); setShowLanguageDropdown(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 10px', backgroundColor: '#fff', border: selectedLanguage === lang.code ? '3px solid #237841' : '2px solid #ccc', borderRadius: '9px', cursor: 'pointer' }}
                >
                  <img src={lang.flag} alt={lang.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                  <span style={{ ...mFont, fontSize: '12.5px', fontWeight: 800 }}>{lang.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ════════════════════════ DESKTOP (orijinal) ════════════════════════
  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: '#fff',
        fontFamily: "'Montserrat', sans-serif",
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header - Ortak Component */}
      <Header 
        showBackButton={true}
        onBack={() => navigate('/')}
        navigationItems={navigationItems}
        activeNavItem="settings"
      />

      {/* Content */}
      <div 
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 10px',
          overflow: 'auto'
        }}
      >
        <div style={{ width: '100%', maxWidth: '600px' }}>
          
          {/* Üst Brick'ler */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '-4px' }}>
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                style={{
                  width: '65px',
                  height: '22px',
                  backgroundColor: '#237841',
                  borderRadius: '5px 5px 0 0'
                }}
              />
            ))}
          </div>

          {/* Ana Container */}
          <div
            style={{
              backgroundColor: '#237841',
              borderRadius: '20px',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h1 style={{ color: '#fff', fontSize: '36px', fontWeight: 900, margin: 0 }}>
                Settings
              </h1>
            </div>

            {/* White Content Area */}
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '20px',
                margin: '0 10px 10px 10px',
                padding: '20px 30px'
              }}
            >
              {/* Language Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px 0' }}>
                  Language:
                </h3>
                <p style={{ fontSize: '12px', color: '#636363', margin: '0 0 8px 0', fontWeight: 600 }}>
                  Change the app's display language.
                </p>
                
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    style={{
                      width: '100%',
                      height: '48px',
                      backgroundColor: '#237841',
                      borderRadius: '12px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <img 
                      src={currentLanguage?.flag} 
                      alt={currentLanguage?.name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ color: '#fff', fontSize: '18px', fontWeight: 900 }}>
                      {currentLanguage?.name}
                    </span>
                    <div
                      style={{
                        position: 'absolute',
                        right: '12px',
                        backgroundColor: '#fff',
                        borderRadius: '6px',
                        width: '36px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <span style={{ 
                        color: '#237841', 
                        fontSize: '16px',
                        transform: showLanguageDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}>
                        ▼
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {showLanguageDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '54px',
                        left: 0,
                        right: 0,
                        backgroundColor: '#e8e8e8',
                        borderRadius: '12px',
                        border: '3px solid #237841',
                        padding: '12px',
                        zIndex: 100,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px'
                      }}
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            setShowLanguageDropdown(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 16px',
                            backgroundColor: '#fff',
                            border: selectedLanguage === lang.code ? '3px solid #237841' : '2px solid #ccc',
                            borderRadius: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          <img 
                            src={lang.flag} 
                            alt={lang.name}
                            style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <span style={{ fontSize: '15px', fontWeight: 800 }}>
                            {lang.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#000', opacity: 0.2, margin: '12px 0' }} />

              {/* Accessibility Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px 0' }}>
                  Accessibility:
                </h3>
                <p style={{ fontSize: '12px', color: '#636363', margin: '0 0 10px 0', fontWeight: 600 }}>
                  Adjust the interface for comfort, clarity, and ease of use.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>Audio Guidance</span>
                    <ToggleButton 
                      isOn={settings.audioGuidance} 
                      onToggle={(val) => setSettings(prev => ({ ...prev, audioGuidance: val }))}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>Reduced Motion</span>
                    <ToggleButton 
                      isOn={settings.reducedMotion} 
                      onToggle={(val) => setSettings(prev => ({ ...prev, reducedMotion: val }))}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#000', opacity: 0.2, margin: '12px 0' }} />

              {/* Notifications Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px 0' }}>
                  Notifications:
                </h3>
                <p style={{ fontSize: '12px', color: '#636363', margin: '0 0 10px 0', fontWeight: 600 }}>
                  Choose which reminders you want to receive.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>Daily Streak Reminders</span>
                    <ToggleButton 
                      isOn={settings.dailyStreakReminders} 
                      onToggle={(val) => setSettings(prev => ({ ...prev, dailyStreakReminders: val }))}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>Recording Reminders</span>
                    <ToggleButton 
                      isOn={settings.recordingReminders} 
                      onToggle={(val) => setSettings(prev => ({ ...prev, recordingReminders: val }))}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#000', opacity: 0.2, margin: '12px 0' }} />

              {/* Microphone Permissions Section */}
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px 0' }}>
                  Microphone Permissions:
                </h3>
                <p style={{ fontSize: '12px', color: '#636363', margin: '0 0 10px 0', fontWeight: 600 }}>
                  Allow Mini-Talks to use your device's microphone.
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>Microphone Access</span>
                  <ToggleButton 
                    isOn={settings.microphoneAccess} 
                    onToggle={(val) => setSettings(prev => ({ ...prev, microphoneAccess: val }))}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={handleCancel}
                  style={{
                    width: '160px',
                    height: '44px',
                    backgroundColor: '#fff',
                    border: '3px solid #000',
                    borderRadius: '12px',
                    color: '#000',
                    fontSize: '18px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    width: '160px',
                    height: '44px',
                    backgroundColor: '#237841',
                    border: '3px solid #237841',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif"
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;