// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout, loginAsGuest } = useAuth();

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

  const handlePlayClick = () => {
    if (user) {
      if (user.role === 'parent') {
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative">
      {/* Sağ üst: Sign in/Sign up VEYA User Menu */}
      <div className="absolute top-8 right-8 z-50">
        {user && user.role !== 'guest' ? (
          <div className="relative">
            {/* Üst satır: Role + Mini Name - TIKLANABİLİR */}
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex gap-1 cursor-pointer"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {/* Sol: LEGO kafa + Role */}
              <div 
                className="flex items-center gap-2 px-2 h-14 hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: '#0055bf',
                  borderRadius: '20px 0 0 20px',
                  minWidth: '160px'
                }}
              >
                <img 
                  src={profileIcon}
                  alt="Profile"
                  className="w-12 h-12 object-cover"
                />
                <span className="text-white font-black text-lg">
                  {getRoleLabel()}
                </span>
              </div>
              
              {/* Sağ: Mini Name(s) */}
              <div 
                className="flex items-center justify-center px-6 h-14 hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: '#0055bf',
                  borderRadius: '0 20px 20px 0',
                  minWidth: '160px'
                }}
              >
                <span className="text-white font-black text-lg">
                  {getUserDisplayName()}
                </span>
              </div>
            </button>

            {/* Dropdown menü - absolute position */}
            {showProfileMenu && (
              <div 
                className="absolute right-0 top-full mt-1.5 flex flex-col gap-1.5"
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
                  className="flex items-center px-6 h-14 text-white font-extrabold text-lg hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: '#0055bf',
                    borderRadius: '20px',
                    minWidth: '320px'
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
                    className="flex items-center px-6 h-14 text-white font-extrabold text-lg hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: '#0055bf',
                      borderRadius: '20px'
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
                    className="flex items-center px-6 h-14 text-white font-extrabold text-lg hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: '#0055bf',
                      borderRadius: '20px'
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
                    className="flex items-center px-6 h-14 text-white font-extrabold text-lg hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: '#0055bf',
                      borderRadius: '20px'
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
                    className="flex items-center px-6 h-14 text-white font-extrabold text-lg hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: '#0055bf',
                      borderRadius: '20px'
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
                      className="flex items-center px-6 h-14 text-white font-extrabold text-lg hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: '#0055bf',
                        borderRadius: '20px'
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
                      className="flex items-center px-6 h-14 text-white font-extrabold text-lg hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: '#0055bf',
                        borderRadius: '20px'
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
                    className="flex items-center px-6 h-14 text-white font-extrabold text-lg hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: '#0055bf',
                      borderRadius: '20px'
                    }}
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Guest veya logged out için Sign In butonu - logout() EKLENDİ */
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
              className="h-16 w-auto"
            />
          </button>
        )}
      </div>

      {/* Orta: Logo + tuğla butonlar */}
      <div className="w-full max-w-6xl flex flex-col items-center">
        <img
          src={logoHorizontal}
          alt="Mini-Talks"
          className="w-full max-w-2xl mb-16"
        />

        <div className="flex flex-wrap justify-center gap-12">
          <button
            type="button"
            onClick={handlePlayClick}
            onMouseEnter={() => setPlayHover(true)}
            onMouseLeave={() => setPlayHover(false)}
            className="transition-transform hover:scale-105"
          >
            <img
              src={playHover ? playBtnHover : playBtn}
              alt="Play"
              className="w-[280px] h-auto"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate('/about')}
            onMouseEnter={() => setAboutHover(true)}
            onMouseLeave={() => setAboutHover(false)}
            className="transition-transform hover:scale-105"
          >
            <img
              src={aboutHover ? aboutBtnHover : aboutBtn}
              alt="About"
              className="w-[280px] h-auto"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            onMouseEnter={() => setSettingsHover(true)}
            onMouseLeave={() => setSettingsHover(false)}
            className="transition-transform hover:scale-105"
          >
            <img
              src={settingsHover ? settingsBtnHover : settingsBtn}
              alt="Settings"
              className="w-[280px] h-auto"
            />
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-24">
          LEGO® is a trademark of the LEGO Group of companies which does not sponsor,
          authorize or endorse this site.
        </p>
      </div>

      {/* ========== POPUP: Play as a Guest? ========== */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div 
            style={{
              margin: '0 16px'
            }}
          >
            <div
              style={{
                backgroundColor: '#237841',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Green Header */}
              <div
                style={{
                  padding: '10px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <h2
                  style={{
                    color: '#ffffff',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '28px',
                    fontWeight: 900,
                    margin: 0
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
                  padding: '10px 6px',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0px'
                }}
              >
                {/* LEGO Head - DAHA BÜYÜK */}
                <img 
                  src={legoHead} 
                  alt="LEGO Character" 
                  style={{
                    width: '150px',
                    height: '150px',
                    objectFit: 'contain',
                    flexShrink: 0
                  }}
                />

                {/* Right side content */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  {/* Text - YENİ MESAJ */}
                  <p
                    style={{
                      color: '#000000',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '18px',
                      fontWeight: 500,
                      textAlign: 'center',
                      marginBottom: '16px',
                      lineHeight: '1.4',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Your progress won't be saved as a guest.<br />
                    Sign up to keep your adventure!
                  </p>

                  {/* PNG Butonlar */}
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
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
                        cursor: 'pointer'
                      }}
                      className="transition-transform hover:scale-105"
                    >
                      <img 
                        src={signUpHover ? signUpBtnHover : signUpBtn}
                        alt="Sign Up"
                        style={{ height: '50px', width: 'auto' }}
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
                        cursor: 'pointer'
                      }}
                      className="transition-transform hover:scale-105"
                    >
                      <img 
                        src={okHover ? okBtnHover : okBtn}
                        alt="OK"
                        style={{ height: '50px', width: 'auto' }}
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
  );
};

export default HomePage;