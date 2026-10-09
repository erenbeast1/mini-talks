// src/components/common/PortraitGuard.jsx
import React, { useState, useEffect, useCallback } from 'react';

// ============================================================
// Portrait Warning Popup (LEGO themed)
// ============================================================
const PortraitWarning = () => {
  const rotatePhoneSVG = (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone body */}
      <rect x="35" y="15" width="50" height="90" rx="8" fill="#FFD500" stroke="#1A1A1A" strokeWidth="3"/>
      {/* Screen */}
      <rect x="40" y="25" width="40" height="65" rx="3" fill="#1A1A1A"/>
      {/* Home button */}
      <circle cx="60" cy="98" r="4" fill="#1A1A1A" stroke="#333" strokeWidth="1"/>
      {/* LEGO studs on top */}
      <rect x="48" y="10" width="10" height="8" rx="3" fill="#FFD500" stroke="#1A1A1A" strokeWidth="2"/>
      <rect x="62" y="10" width="10" height="8" rx="3" fill="#FFD500" stroke="#1A1A1A" strokeWidth="2"/>
      {/* Eyes on screen */}
      <circle cx="52" cy="48" r="4" fill="#FFD500"/>
      <circle cx="52" cy="48" r="2" fill="#1A1A1A"/>
      <circle cx="68" cy="48" r="4" fill="#FFD500"/>
      <circle cx="68" cy="48" r="2" fill="#1A1A1A"/>
      {/* Smile on screen */}
      <path d="M52 58 Q60 66 68 58" stroke="#FFD500" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Rotate arrow */}
      <path d="M95 60 C95 35 80 20 60 15" stroke="#0055BF" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="4 3"/>
      <polygon points="95,50 100,62 90,62" fill="#0055BF"/>
      <path d="M25 60 C25 85 40 100 60 105" stroke="#0055BF" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="4 3"/>
      <polygon points="25,70 20,58 30,58" fill="#0055BF"/>
    </svg>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#237841',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          maxWidth: '360px',
          width: '100%',
        }}
      >
        {/* Green Header */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h2
            style={{
              color: '#ffffff',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '22px',
              fontWeight: 900,
              margin: 0,
              textAlign: 'center',
              letterSpacing: '0.5px',
            }}
          >
            🧱 Rotate Your Device!
          </h2>
        </div>

        {/* White content area */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            margin: '0 6px 6px 6px',
            padding: '24px 20px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Animated rotate icon */}
          <div
            style={{
              animation: 'portraitGuardRotate 2s ease-in-out infinite',
            }}
          >
            {rotatePhoneSVG}
          </div>

          <p
            style={{
              color: '#1A1A1A',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '16px',
              fontWeight: 600,
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Mini-Talks works best in
            <br />
            <span style={{ color: '#0055BF', fontWeight: 900, fontSize: '18px' }}>
              Landscape Mode
            </span>
          </p>

          <p
            style={{
              color: '#666',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Please rotate your device horizontally
            <br />
            to start your adventure! 🎮
          </p>
        </div>
      </div>

      {/* Rotate animation keyframes */}
      <style>{`
        @keyframes portraitGuardRotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
      `}</style>
    </div>
  );
};

// ============================================================
// PortraitGuard Wrapper
// ============================================================
const PortraitGuard = ({ children }) => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  const checkOrientation = useCallback(() => {
    const screenMin = Math.min(window.screen.width, window.screen.height);
    const isMobTab = screenMin <= 1024 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    setIsMobileOrTablet(isMobTab);

    if (isMobTab) {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);

      if (portrait && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    } else {
      setIsPortrait(false);
    }
  }, []);

  useEffect(() => {
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    if (screen.orientation) {
      screen.orientation.addEventListener('change', checkOrientation);
    }
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, [checkOrientation]);

  return (
    <>
      {isPortrait && isMobileOrTablet && <PortraitWarning />}
      {children}
    </>
  );
};

export default PortraitGuard;
