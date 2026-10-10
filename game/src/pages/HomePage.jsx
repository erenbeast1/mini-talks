// src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAvatar } from '../hooks/useAvatar';
import { avatarTarget } from '../utils/activeProfile';

// ---- GÖRSELLER ----
import logoHorizontal from '../assets/Logo-Yatay.png';

import playBtn from '../assets/Play Buton.png';
import playBtnHover from '../assets/Play Buton_Hover.png';

import aboutBtn from '../assets/About Buton.png';
import aboutBtnHover from '../assets/About Buton_Hover.png';

import settingsBtn from '../assets/Settings Buton.png';
import settingsBtnHover from '../assets/Settings Buton_Hover.png';

// User menu buttons
import signInSignUpBtn from '../assets/Ane Menu Sign In Buton.png';
import profileIcon from '../assets/profile-icon.png';

// Guest popup LEGO head
import legoHead from '../assets/5.png';

// Guest popup butonları
import signUpBtn from '../assets/NotFoundSignUp_Buton.png';
import signUpBtnHover from '../assets/NotFoundSignUpButon_Hover.png';
import okBtn from '../assets/Ok_Buton.png';
import okBtnHover from '../assets/Ok_Buton_Hover.png';

// ============================================================
// useResponsive Hook - screen size breakpoints
// ============================================================
const useResponsive = () => {
  const [screenSize, setScreenSize] = useState('desktop');
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const screenMin = Math.min(window.screen.width, window.screen.height);
      const isMobTab = screenMin <= 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileOrTablet(isMobTab);

      if (w <= 740) {
        setScreenSize('mobile');
      } else if (w <= 1024) {
        setScreenSize('tablet-small');
      } else if (w <= 1380) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return { screenSize, isMobileOrTablet };
};

// ============================================================
// HomePage Component
// ============================================================
const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout, loginAsGuest } = useAuth();
  const { screenSize, isMobileOrTablet } = useResponsive();

  // This page draws its own profile pill rather than using components/common/
  // Header, so the picture has to be wired up here too — otherwise the home
  // page is the one place still showing the stock LEGO head.
  //
  // `null` for the selected Mini on purpose: this pill's label names the
  // signed-in account (getRoleLabel reads user.role and ignores the selected
  // Mini), so its picture names the same account. The shared header follows
  // the Mini because its label does.
  const { role: avatarRole, id: avatarId } = avatarTarget(user, null);
  const { avatarUrl: headerAvatarUrl } = useAvatar(avatarRole, avatarId);

  // hover state'leri
  const [playHover, setPlayHover] = useState(false);
  const [aboutHover, setAboutHover] = useState(false);
  const [settingsHover, setSettingsHover] = useState(false);

  // guest popup state
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [signUpHover, setSignUpHover] = useState(false);
  const [okHover, setOkHover] = useState(false);
  
  // profil dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // iOS Safari gerçek viewport yüksekliği
  const [viewportH, setViewportH] = useState(window.innerHeight);
  useEffect(() => {
    const update = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', () => {
      // iOS needs a delay after orientation change
      setTimeout(update, 150);
    });
    // İlk yüklemede de gecikmeyle kontrol et
    setTimeout(update, 200);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isMobile = screenSize === 'mobile';
  const isTabletSmall = screenSize === 'tablet-small';
  const isTablet = screenSize === 'tablet';
  const isSmallScreen = isMobile || isTabletSmall || isTablet;

  // ---- Responsive değerler ----
  const getResponsiveValues = () => {
    switch (screenSize) {
      case 'mobile':
        return {
          logoW: '38vw',
          btnWidth: '20vw',
          btnMinW: '120px',
          btnGap: '2vw',
          menuBtnH: '30px',
          menuFontSize: '9px',
          menuIconSize: '22px',
          menuMinW: '70px',
          menuPx: '6px',
          menuRadius: '10px',
          dropdownMinW: '150px',
          dropdownH: '30px',
          dropdownFontSize: '10px',
          disclaimerSize: '7px',
          guestModalMaxW: '380px',
          guestHeadSize: '80px',
          guestTitleSize: '16px',
          guestTextSize: '12px',
          guestBtnH: '30px',
        };
      case 'tablet-small':
        return {
          logoW: '36vw',
          btnWidth: '22vw',
          btnMinW: '150px',
          btnGap: '2.5vw',
          menuBtnH: '36px',
          menuFontSize: '11px',
          menuIconSize: '28px',
          menuMinW: '90px',
          menuPx: '8px',
          menuRadius: '12px',
          dropdownMinW: '195px',
          dropdownH: '36px',
          dropdownFontSize: '11px',
          disclaimerSize: '9px',
          guestModalMaxW: '420px',
          guestHeadSize: '100px',
          guestTitleSize: '20px',
          guestTextSize: '14px',
          guestBtnH: '36px',
        };
      case 'tablet':
        return {
          logoW: '34vw',
          btnWidth: '18vw',
          btnMinW: '180px',
          btnGap: '2.5vw',
          menuBtnH: '44px',
          menuFontSize: '13px',
          menuIconSize: '36px',
          menuMinW: '120px',
          menuPx: '12px',
          menuRadius: '16px',
          dropdownMinW: '260px',
          dropdownH: '44px',
          dropdownFontSize: '13px',
          disclaimerSize: '10px',
          guestModalMaxW: '460px',
          guestHeadSize: '120px',
          guestTitleSize: '22px',
          guestTextSize: '15px',
          guestBtnH: '40px',
        };
      default: // desktop
        return {
          logoW: '100%',
          btnWidth: '280px',
          btnMinW: '280px',
          btnGap: '48px',
          menuBtnH: '56px',
          menuFontSize: '18px',
          menuIconSize: '48px',
          menuMinW: '160px',
          menuPx: '16px',
          menuRadius: '20px',
          dropdownMinW: '320px',
          dropdownH: '56px',
          dropdownFontSize: '18px',
          disclaimerSize: '14px',
          guestModalMaxW: '520px',
          guestHeadSize: '150px',
          guestTitleSize: '28px',
          guestTextSize: '18px',
          guestBtnH: '50px',
        };
    }
  };

  const rv = getResponsiveValues();

  const handlePlayClick = () => {
    if (user) {
      if (user.role === 'parent' || user.role === 'expert') {
        // Parent ve Expert mini seçimi yapacak
        navigate('/mini-selection');
      } else {
        navigate('/scene-selection');
      }
    } else {
      setShowGuestModal(true);
    }
  };

  const handleGuestContinue = () => {
    setShowGuestModal(false);
    loginAsGuest();
    navigate('/scene-selection');
  };

  const handleSignUp = () => {
    setShowGuestModal(false);
    navigate('/register');
  };

  // Role'e göre dropdown menü öğeleri
  const getMenuItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'guest':
        return [
          { label: 'SIGN UP', action: () => { logout(); navigate('/register'); } },
          { label: 'SIGN IN', action: () => { logout(); navigate('/login'); } }
        ];
      case 'parent':
        return [
          { label: 'PARENT PROFILE', action: () => navigate('/dashboard?tab=profile') },
          { label: 'MY MINI(S)', action: () => navigate('/dashboard?tab=myminis') }
        ];
      case 'builder':
        return [
          { label: 'BUILDER PROFILE', action: () => navigate('/dashboard?tab=profile') },
          { label: 'CREATIONS', action: () => navigate('/dashboard?tab=creations') }
        ];
      case 'expert':
        return [
          { label: 'EXPERT PROFILE', action: () => navigate('/dashboard?tab=profile') },
          { label: 'MY MINI(S)', action: () => navigate('/dashboard?tab=myminis') }
        ];
      case 'child':
        return [
          { label: 'MINI PROFILE', action: () => navigate('/dashboard?tab=profile') },
          { label: 'MINI JOURNEY', action: () => navigate('/dashboard?tab=journey') }
        ];
      default:
        return [
          { label: 'PROFILE', action: () => navigate('/dashboard') }
        ];
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'parent': return 'Parent';
      case 'builder': return 'Builder';
      case 'expert': return 'Expert';
      case 'child': return 'Mini';
      case 'guest': return 'Guest';
      default: return user?.role || 'User';
    }
  };

  const getUserDisplayName = () => {
    if (user?.role === 'child') {
      return user.profile?.mini_name || 'Mini';
    }
    if (user?.role === 'guest') {
      return 'Guest Player';
    }
    return user?.profile?.full_name || user?.profile?.username || user?.email || 'User';
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Ana container - TAM EKRAN, SCROLL YOK */}
      <div
        style={{
          width: '100vw',
          height: '100dvh',
          minHeight: `${viewportH}px`, /* fallback for older browsers */
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          position: 'relative',
          // iPhone safe area padding
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          boxSizing: 'border-box',
        }}
      >
        {/* Sağ üst: Sign in/Sign up VEYA User Menu */}
        <div
          style={{
            position: 'absolute',
            top: isSmallScreen
              ? 'calc(env(safe-area-inset-top, 0px) + 6px)'
              : '32px',
            right: isSmallScreen
              ? 'calc(env(safe-area-inset-right, 0px) + 6px)'
              : '32px',
            zIndex: 50,
          }}
        >
          {user && user.role !== 'guest' ? (
            <div className="relative">
              {/* Üst satır: Role + Mini Name - TIKLANABİLİR */}
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex gap-0.5 cursor-pointer"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {/* Sol: LEGO kafa + Role */}
                <div 
                  className="flex items-center gap-1 hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: '#0055bf',
                    borderRadius: `${rv.menuRadius} 0 0 ${rv.menuRadius}`,
                    minWidth: rv.menuMinW,
                    height: rv.menuBtnH,
                    paddingLeft: rv.menuPx,
                    paddingRight: rv.menuPx,
                  }}
                >
                  <img
                    src={headerAvatarUrl || profileIcon}
                    alt="Profile"
                    style={{
                      width: rv.menuIconSize,
                      height: rv.menuIconSize,
                      objectFit: headerAvatarUrl ? 'cover' : 'contain',
                    }}
                  />
                  <span 
                    className="text-white font-black"
                    style={{ fontSize: rv.menuFontSize }}
                  >
                    {getRoleLabel()}
                  </span>
                </div>
                
                {/* Sağ: Mini Name(s) */}
                <div 
                  className="flex items-center justify-center hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: '#0055bf',
                    borderRadius: `0 ${rv.menuRadius} ${rv.menuRadius} 0`,
                    minWidth: rv.menuMinW,
                    height: rv.menuBtnH,
                    paddingLeft: rv.menuPx,
                    paddingRight: rv.menuPx,
                  }}
                >
                  <span 
                    className="text-white font-black"
                    style={{
                      fontSize: rv.menuFontSize,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: isMobile ? '70px' : '160px',
                    }}
                  >
                    {getUserDisplayName()}
                  </span>
                </div>
              </button>

              {/* Dropdown menü - absolute position */}
              {showProfileMenu && (
                <div 
                  className="absolute right-0 top-full mt-1 flex flex-col gap-1"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {/* Profile butonu */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (user.role === 'parent') navigate('/dashboard?tab=profile');
                      else if (user.role === 'builder') navigate('/dashboard?tab=profile');
                      else if (user.role === 'expert') navigate('/dashboard?tab=profile');
                      else if (user.role === 'child') navigate('/dashboard?tab=profile');
                      else navigate('/dashboard');
                    }}
                    className="flex items-center text-white font-extrabold hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: '#0055bf',
                      borderRadius: rv.menuRadius,
                      minWidth: rv.dropdownMinW,
                      height: rv.dropdownH,
                      paddingLeft: rv.menuPx,
                      paddingRight: rv.menuPx,
                      fontSize: rv.dropdownFontSize,
                    }}
                  >
                    Profile
                  </button>

                  {/* Role'e göre ikinci buton */}
                  {user.role === 'parent' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/dashboard?tab=myminis');
                      }}
                      className="flex items-center text-white font-extrabold hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: '#0055bf',
                        borderRadius: rv.menuRadius,
                        height: rv.dropdownH,
                        paddingLeft: rv.menuPx,
                        paddingRight: rv.menuPx,
                        fontSize: rv.dropdownFontSize,
                      }}
                    >
                      My Mini's
                    </button>
                  )}
                  {user.role === 'builder' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/dashboard?tab=creations');
                      }}
                      className="flex items-center text-white font-extrabold hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: '#0055bf',
                        borderRadius: rv.menuRadius,
                        height: rv.dropdownH,
                        paddingLeft: rv.menuPx,
                        paddingRight: rv.menuPx,
                        fontSize: rv.dropdownFontSize,
                      }}
                    >
                      Creations
                    </button>
                  )}
                  {user.role === 'expert' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/dashboard?tab=myminis');
                      }}
                      className="flex items-center text-white font-extrabold hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: '#0055bf',
                        borderRadius: rv.menuRadius,
                        height: rv.dropdownH,
                        paddingLeft: rv.menuPx,
                        paddingRight: rv.menuPx,
                        fontSize: rv.dropdownFontSize,
                      }}
                    >
                      My Mini's
                    </button>
                  )}
                  {user.role === 'child' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/dashboard?tab=journey');
                      }}
                      className="flex items-center text-white font-extrabold hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: '#0055bf',
                        borderRadius: rv.menuRadius,
                        height: rv.dropdownH,
                        paddingLeft: rv.menuPx,
                        paddingRight: rv.menuPx,
                        fontSize: rv.dropdownFontSize,
                      }}
                    >
                      Mini Journey
                    </button>
                  )}
                  {user.role === 'guest' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                          navigate('/register');
                        }}
                        className="flex items-center text-white font-extrabold hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: '#0055bf',
                          borderRadius: rv.menuRadius,
                          height: rv.dropdownH,
                          paddingLeft: rv.menuPx,
                          paddingRight: rv.menuPx,
                          fontSize: rv.dropdownFontSize,
                        }}
                      >
                        Sign Up
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                          navigate('/login');
                        }}
                        className="flex items-center text-white font-extrabold hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: '#0055bf',
                          borderRadius: rv.menuRadius,
                          height: rv.dropdownH,
                          paddingLeft: rv.menuPx,
                          paddingRight: rv.menuPx,
                          fontSize: rv.dropdownFontSize,
                        }}
                      >
                        Sign In
                      </button>
                    </>
                  )}

                  {/* Sign Out butonu */}
                  {user.role !== 'guest' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                        navigate('/');
                      }}
                      className="flex items-center text-white font-extrabold hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: '#0055bf',
                        borderRadius: rv.menuRadius,
                        height: rv.dropdownH,
                        paddingLeft: rv.menuPx,
                        paddingRight: rv.menuPx,
                        fontSize: rv.dropdownFontSize,
                      }}
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Guest veya logged out için Sign In butonu */
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="transition-transform hover:scale-105"
            >
              <img
                src={signInSignUpBtn}
                alt="Sign in / Sign up"
                style={{
                  height: rv.menuBtnH,
                  width: 'auto',
                }}
              />
            </button>
          )}
        </div>

        {/* Orta: Logo + tuğla butonlar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            padding: isSmallScreen ? '4px 8px' : '16px',
            boxSizing: 'border-box',
          }}
        >
          <img
            src={logoHorizontal}
            alt="Mini-Talks"
            style={{
              width: rv.logoW,
              maxWidth: screenSize === 'desktop' ? '672px' : undefined,
              maxHeight: isSmallScreen ? '35vh' : undefined,
              objectFit: 'contain',
              marginBottom: isSmallScreen ? '2vh' : '48px',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: rv.btnGap,
            }}
          >
            <button
              type="button"
              onClick={handlePlayClick}
              onMouseEnter={() => setPlayHover(true)}
              onMouseLeave={() => setPlayHover(false)}
              className="transition-transform hover:scale-105"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img
                src={playHover ? playBtnHover : playBtn}
                alt="Play"
                style={{
                  width: rv.btnWidth,
                  minWidth: rv.btnMinW,
                  maxHeight: isSmallScreen ? '28vh' : undefined,
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => navigate('/about')}
              onMouseEnter={() => setAboutHover(true)}
              onMouseLeave={() => setAboutHover(false)}
              className="transition-transform hover:scale-105"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img
                src={aboutHover ? aboutBtnHover : aboutBtn}
                alt="About"
                style={{
                  width: rv.btnWidth,
                  minWidth: rv.btnMinW,
                  maxHeight: isSmallScreen ? '28vh' : undefined,
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => navigate('/settings')}
              onMouseEnter={() => setSettingsHover(true)}
              onMouseLeave={() => setSettingsHover(false)}
              className="transition-transform hover:scale-105"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img
                src={settingsHover ? settingsBtnHover : settingsBtn}
                alt="Settings"
                style={{
                  width: rv.btnWidth,
                  minWidth: rv.btnMinW,
                  maxHeight: isSmallScreen ? '28vh' : undefined,
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </button>
          </div>

          <p
            style={{
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: rv.disclaimerSize,
              marginTop: isSmallScreen ? '1.5vh' : '64px',
              marginBottom: 0,
              lineHeight: 1.3,
            }}
          >
            LEGO® is a trademark of the LEGO Group of companies which does not
            sponsor, authorize or endorse this site.
          </p>
        </div>

        {/* ========== POPUP: Play as a Guest? ========== */}
        {showGuestModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                margin: '0 16px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#237841',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)',
                  maxWidth: rv.guestModalMaxW,
                }}
              >
                {/* Green Header */}
                <div
                  style={{
                    padding: isMobile ? '6px 12px' : '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <h2
                    style={{
                      color: '#ffffff',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: rv.guestTitleSize,
                      fontWeight: 900,
                      margin: 0,
                    }}
                  >
                    Play as a Guest?
                  </h2>
                </div>

                {/* White content area */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '18px',
                    margin: '0 6px 6px 6px',
                    padding: isMobile ? '6px' : '10px 6px',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? '4px' : '0px',
                  }}
                >
                  {/* LEGO Head */}
                  <img 
                    src={legoHead} 
                    alt="LEGO Character" 
                    style={{
                      width: rv.guestHeadSize,
                      height: rv.guestHeadSize,
                      objectFit: 'contain',
                      flexShrink: 0,
                    }}
                  />

                  {/* Right side content */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    {/* Text */}
                    <p
                      style={{
                        color: '#000000',
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: rv.guestTextSize,
                        fontWeight: 500,
                        textAlign: 'center',
                        marginTop: 0,
                        marginBottom: isMobile ? '8px' : '16px',
                        lineHeight: '1.4',
                        whiteSpace: isMobile ? 'normal' : 'nowrap',
                      }}
                    >
                      Your progress won't be saved as a guest.<br />
                      Sign up to keep your adventure!
                    </p>

                    {/* PNG Butonlar */}
                    <div style={{ display: 'flex', gap: isMobile ? '8px' : '16px', justifyContent: 'center' }}>
                      {/* Sign Up Button */}
                      <button
                        type="button"
                        onClick={handleSignUp}
                        onMouseEnter={() => setSignUpHover(true)}
                        onMouseLeave={() => setSignUpHover(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                        className="transition-transform hover:scale-105"
                      >
                        <img 
                          src={signUpHover ? signUpBtnHover : signUpBtn}
                          alt="Sign Up"
                          style={{ height: rv.guestBtnH, width: 'auto' }}
                        />
                      </button>

                      {/* OK/Continue Button */}
                      <button
                        type="button"
                        onClick={handleGuestContinue}
                        onMouseEnter={() => setOkHover(true)}
                        onMouseLeave={() => setOkHover(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                        className="transition-transform hover:scale-105"
                      >
                        <img 
                          src={okHover ? okBtnHover : okBtn}
                          alt="OK"
                          style={{ height: rv.guestBtnH, width: 'auto' }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Close dropdown when clicking outside */}
        {showProfileMenu && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowProfileMenu(false)}
          />
        )}
      </div>
    </>
  );
};

export default HomePage;