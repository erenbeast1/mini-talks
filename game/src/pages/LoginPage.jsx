// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../utils/api';

import mainMenuBtn from '../assets/main-menu-btn.png';
import mainMenuBtnHover from '../assets/main-menu-btn-hover.png';
import logoImg from '../assets/logo.png';
import logoHead from '../assets/logo-head.png';
import logoText from '../assets/logo-text.png';

// Brick Border - 4'lü stud PNG
import BrickBorder from '../assets/kirmizi-top.png';

import guestBtn from '../assets/Play as a quest Buton.png';
import guestBtnHover from '../assets/Play as a quest Buton_Hover.png';
import signInBtn from '../assets/Sign in Buton.png';
import signInBtnHover from '../assets/Sign in Buton_Hover.png';

// POPUP görselleri
import accountNotFoundBoard from '../assets/Account Not Found.png';
import okBtn from '../assets/Ok Buton.png';
import okBtnHover from '../assets/Ok Buton_Hover.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Unverified account: login.php answers 403 with email_not_verified:true.
  // Showing only the error text left people with nowhere to go, because the
  // first mail is usually the one that went missing.
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState('idle'); // idle | sending | sent

  const [guestHover, setGuestHover] = useState(false);
  const [signInHover, setSignInHover] = useState(false);
  const [mainMenuHover, setMainMenuHover] = useState(false);

  const [showNotLoggedPopup, setShowNotLoggedPopup] = useState(false);
  const [okHover, setOkHover] = useState(false);

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
    if (user) {
      navigate('/play');
      return;
    }
    const params = new URLSearchParams(location.search);
    if (params.get('from') === 'play') {
      setShowNotLoggedPopup(true);
    }
  }, [user, navigate, location.search]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setNeedsVerification(false);
    setResendState('idle');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setResendState('idle');
    setLoading(true);
    try {
      await login(formData.emailOrUsername, formData.password);
      navigate('/play');
    } catch (err) {
      const data = err?.response?.data;
      if (data?.email_not_verified) {
        setNeedsVerification(true);
        setError('');
      } else {
        setError(data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendState === 'sending') return;
    setResendState('sending');
    try {
      await authAPI.resendVerification(formData.emailOrUsername);
    } catch (err) {
      // The endpoint answers the same way whatever happens, so a failure here
      // is the network, not the account. Telling them to check the inbox is
      // still the right next step — a second press costs nothing.
      console.error('Resend verification failed:', err);
    }
    setResendState('sent');
  };

  // One notice, rendered in both the mobile and the desktop layout.
  const verificationNotice = (prefix) => (
    <div className={`${prefix}-verify`}>
      <strong>Your email is not verified yet.</strong>
      <span>
        We sent a link when the account was created. Open it to finish signing up —
        it is worth checking the spam folder.
      </span>
      {resendState === 'sent' ? (
        <span className={`${prefix}-verify-ok`}>
          A new link is on its way. It is valid for 24 hours.
        </span>
      ) : (
        <button
          type="button"
          className={`${prefix}-verify-btn`}
          onClick={handleResendVerification}
          disabled={resendState === 'sending'}
        >
          {resendState === 'sending' ? 'Sending…' : 'Send me a new link'}
        </button>
      )}
    </div>
  );

  const handleGuestMode = () => {
    navigate('/play?guest=true');
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    .lp-page {
      min-height: 100vh;
      background: #FFFFFF;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      font-family: "Montserrat", sans-serif;
      padding: 20px;
      position: relative;
    }
    .lp-page *, .lp-page input, .lp-page button, .lp-page label, .lp-page a {
      font-family: "Montserrat", sans-serif;
    }

    /* Nav */
    .lp-nav {
      position: absolute;
      left: 16px;
      top: 16px;
      z-index: 50;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 12px;
    }
    .lp-nav button {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      -webkit-transition: -webkit-transform 0.2s;
      transition: transform 0.2s;
    }
    .lp-nav button:hover {
      -webkit-transform: scale(1.05);
      transform: scale(1.05);
    }

    .lp-modal-wrapper {
      position: relative;
      width: 100%;
      max-width: 560px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
      border-radius: 15px;
    }

    .lp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 15px 15px 0 0;
    }

    .lp-modal {
      width: 100%;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: #E52828;
      border-radius: 15px 15px 15px 15px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
    }

    .lp-header {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 12px;
      padding: 15px 0 12px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }

    .lp-content {
      background: #FFFFFF;
      margin: 0 8px 8px;
      border-radius: 18px;
      padding: 28px 32px 22px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
    }

    .lp-title {
      font-size: 30px;
      font-weight: 900;
      margin: 0 0 22px;
      text-align: center;
      color: #000;
    }

    .lp-error {
      width: 100%;
      background: #FEE2E2;
      border: 2px solid #F87171;
      color: #B91C1C;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 14px;
      font-weight: 600;
      font-size: 14px;
    }

    /* An unverified account is not an error the user made, so it is told in
       the site's own blue rather than in the red of a wrong password. */
    .lp-verify {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #F1F7FF;
      border: 2px solid #0055BF;
      color: #1D1D1B;
      padding: 12px 14px;
      border-radius: 10px;
      margin-bottom: 14px;
      font-weight: 600;
      font-size: 13.5px;
      text-align: left;
    }
    .lp-verify strong { font-weight: 900; color: #0055BF; }
    .lp-verify-btn {
      align-self: flex-start;
      font-family: 'Montserrat', sans-serif;
      font-weight: 800;
      font-size: 13px;
      color: #fff;
      background: #0055BF;
      border: 2px solid #0055BF;
      border-radius: 6px;
      padding: 9px 16px;
      min-height: 40px;
      cursor: pointer;
    }
    .lp-verify-btn:hover:not(:disabled) { background: #00469c; }
    .lp-verify-btn:disabled { opacity: 0.6; cursor: default; }
    .lp-verify-ok { font-weight: 800; color: #237841; }

    .lp-form { width: 100%; }
    .lp-group { margin-bottom: 14px; }
    .lp-label {
      display: block;
      font-size: 14px;
      font-weight: 700;
      color: #000;
      margin-bottom: 5px;
    }
    .lp-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #000;
      border-radius: 12px;
      font-size: 15px;
      outline: none;
      -webkit-box-sizing: border-box;
      box-sizing: border-box;
      background: #FFF;
      -webkit-transition: border-color 0.2s, box-shadow 0.2s;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .lp-input:focus {
      border-color: #0055BF;
      -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
      box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
    }
    .lp-input::-webkit-input-placeholder { color: #999; }
    .lp-input::placeholder { color: #999; }

    .lp-forgot {
      display: inline-block;
      color: #000;
      text-decoration: underline;
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 16px;
      cursor: pointer;
    }
    .lp-forgot:hover { color: #444; }

    .lp-btns {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 16px;
      margin-top: 6px;
      margin-bottom: 16px;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
    }
    .lp-btns button {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
    }
    .lp-btns button:disabled { opacity: 0.6; cursor: default; }
    .lp-btns button img { height: 48px; width: auto; }

    .lp-signup {
      text-align: center;
      font-size: 14px;
      color: #000;
      font-weight: 600;
      margin-bottom: 14px;
    }
    .lp-signup a {
      color: #0055BF;
      font-weight: 800;
      text-decoration: none;
    }
    .lp-signup a:hover { text-decoration: underline; }

    .lp-disc {
      text-align: center;
      font-size: 10px;
      color: #888;
      line-height: 1.4;
      margin: 0;
    }

    /* Popup */
    .lp-popup-bg {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      z-index: 100;
    }
    .lp-popup {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
    }
    .lp-popup .pb { width: 500px; max-width: 90vw; }
    .lp-popup button {
      margin-top: 16px;
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
    }
    .lp-popup button img { height: 40px; width: auto; }

    /* ===== KISA EKRAN / %150 ZOOM ===== */
    /* 1080px / 1.5 = 720px efektif, browser chrome ~50px = ~670px */
    @media (max-height: 750px) {
      .lp-page { padding: 10px; }
      .lp-header { padding: 10px 0 8px; }
      .lp-header .lh { height: 42px !important; }
      .lp-header .lt { height: 34px !important; }
      .lp-content { padding: 16px 24px 14px; }
      .lp-title { font-size: 24px; margin-bottom: 14px; }
      .lp-group { margin-bottom: 10px; }
      .lp-input { padding: 9px 14px; font-size: 14px; border-radius: 10px; }
      .lp-label { font-size: 13px; margin-bottom: 3px; }
      .lp-forgot { font-size: 12px; margin-bottom: 10px; }
      .lp-btns { margin-top: 2px; margin-bottom: 10px; gap: 12px; }
      .lp-btns button img { height: 40px; }
      .lp-signup { font-size: 13px; margin-bottom: 8px; }
      .lp-disc { font-size: 9px; }
      .lp-nav img { height: 32px !important; }
      .lp-nav div { height: 32px !important; }
    }

    /* Çok kısa ekran (örn. 1366x768 @ %150 = ~512px) */
    @media (max-height: 580px) {
      .lp-header { padding: 6px 0 4px; }
      .lp-header .lh { height: 32px !important; }
      .lp-header .lt { height: 26px !important; }
      .lp-content { padding: 10px 18px 10px; margin: 0 6px 6px; border-radius: 12px; }
      .lp-title { font-size: 20px; margin-bottom: 10px; }
      .lp-group { margin-bottom: 6px; }
      .lp-input { padding: 7px 12px; font-size: 13px; border-radius: 8px; }
      .lp-label { font-size: 12px; margin-bottom: 2px; }
      .lp-forgot { font-size: 11px; margin-bottom: 6px; }
      .lp-btns { margin-top: 0; margin-bottom: 6px; gap: 8px; }
      .lp-btns button img { height: 34px; }
      .lp-signup { font-size: 12px; margin-bottom: 4px; }
      .lp-modal-wrapper { border-radius: 10px; }
      .lp-brick-border { border-radius: 10px 10px 0 0; }
      .lp-modal { border-radius: 0 0 10px 10px; }
    }

    /* Genişlik responsive */
    @media (max-width: 640px) {
      .lp-modal-wrapper { border-radius: 12px; }
      .lp-brick-border { border-radius: 12px 12px 0 0; }
      .lp-modal { border-radius: 0 0 12px 12px; }
      .lp-content { padding: 20px 18px 18px; margin: 0 6px 6px; }
      .lp-title { font-size: 24px; margin-bottom: 16px; }
      .lp-header .lh { height: 40px !important; }
      .lp-header .lt { height: 32px !important; }
      .lp-btns {
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -webkit-flex-direction: column;
        flex-direction: column;
        gap: 10px;
      }
      .lp-btns button img { height: 44px; }
    }
  `;

  // ════════════════════ MOBİL STYLES (studsuz, beyaz, yan yana) ════════════════════
  const mobileStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    .lpm-page {
      height: 100vh;
      background: #FFFFFF;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      font-family: "Montserrat", sans-serif;
      padding: calc(8px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left));
      box-sizing: border-box;
      position: relative;
      gap: 34px;
      overflow: hidden;
    }
    .lpm-page *, .lpm-page input, .lpm-page button, .lpm-page label, .lpm-page a {
      font-family: "Montserrat", sans-serif;
      box-sizing: border-box;
    }

    /* Sol üst nav */
    .lpm-nav {
      position: absolute;
      left: calc(12px + env(safe-area-inset-left));
      top: calc(8px + env(safe-area-inset-top));
      z-index: 50;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 8px;
    }
    .lpm-nav button {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
    }
    .lpm-nav img { height: 26px; }
    .lpm-nav .lpm-divider { width: 1px; height: 26px; background: #E52828; }

    /* Sol — büyük logo */
    .lpm-logo {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 4px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .lpm-logo .lpm-head { height: min(42vh, 170px); width: auto; }
    .lpm-logo .lpm-text { height: min(13vh, 52px); width: auto; }

    /* Sağ — form */
    .lpm-form-col {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      width: 300px;
      max-height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .lpm-title {
      font-size: 22px;
      font-weight: 900;
      margin: 0 0 10px;
      text-align: center;
      color: #E52828;
    }
    .lpm-error {
      width: 100%;
      background: #FEE2E2;
      border: 2px solid #F87171;
      color: #B91C1C;
      padding: 6px 10px;
      border-radius: 8px;
      margin-bottom: 8px;
      font-weight: 600;
      font-size: 11px;
    }
    .lpm-verify {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: #F1F7FF;
      border: 2px solid #0055BF;
      color: #1D1D1B;
      padding: 7px 10px;
      border-radius: 8px;
      margin-bottom: 8px;
      font-weight: 600;
      font-size: 10.5px;
      line-height: 1.45;
      text-align: left;
    }
    .lpm-verify strong { font-weight: 900; color: #0055BF; }
    .lpm-verify-btn {
      align-self: flex-start;
      font-family: 'Montserrat', sans-serif;
      font-weight: 800;
      font-size: 10.5px;
      color: #fff;
      background: #0055BF;
      border: 2px solid #0055BF;
      border-radius: 6px;
      padding: 6px 11px;
      cursor: pointer;
    }
    .lpm-verify-btn:disabled { opacity: 0.6; cursor: default; }
    .lpm-verify-ok { font-weight: 800; color: #237841; }
    .lpm-form { width: 100%; }
    .lpm-group { margin-bottom: 8px; }
    .lpm-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #000;
      margin-bottom: 3px;
    }
    .lpm-input {
      width: 100%;
      padding: 8px 12px;
      border: 2px solid #000;
      border-radius: 9px;
      font-size: 13px;
      outline: none;
      background: #FFF;
    }
    .lpm-input:focus {
      border-color: #0055BF;
      -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
      box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
    }
    .lpm-input::-webkit-input-placeholder { color: #999; }
    .lpm-input::placeholder { color: #999; }
    .lpm-forgot {
      display: inline-block;
      color: #000;
      text-decoration: underline;
      font-weight: 600;
      font-size: 11px;
      margin-bottom: 8px;
      cursor: pointer;
    }
    .lpm-btns {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 10px;
      margin: 2px 0 8px;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
    }
    .lpm-btns button {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
    }
    .lpm-btns button:disabled { opacity: 0.6; cursor: default; }
    .lpm-btns button img { height: 36px; width: auto; }
    .lpm-signup {
      text-align: center;
      font-size: 11px;
      color: #000;
      font-weight: 600;
      margin: 0;
    }
    .lpm-signup a {
      color: #0055BF;
      font-weight: 800;
      text-decoration: none;
    }

    /* Popup (mobil) */
    .lpm-popup-bg {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      z-index: 100;
    }
    .lpm-popup {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
    }
    .lpm-popup .pb { width: 360px; max-width: 80vw; }
    .lpm-popup button {
      margin-top: 10px;
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
    }
    .lpm-popup button img { height: 34px; width: auto; }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    return (
      <div className="lpm-page">
        <style>{mobileStyles}</style>

        {/* Sol üst nav */}
        <div className="lpm-nav">
          <button onClick={() => navigate('/')} aria-label="Go to main menu">
            <img src={mainMenuBtn} alt="Main menu" />
          </button>
          <div className="lpm-divider" />
          <img src={logoImg} alt="Mini-Talks" />
        </div>

        {/* Sol — büyük logo */}
        <div className="lpm-logo">
          <img src={logoHead} alt="" className="lpm-head" />
          <img src={logoText} alt="Mini-Talks" className="lpm-text" />
        </div>

        {/* Sağ — form */}
        <div className="lpm-form-col">
          <h2 className="lpm-title">Sign in</h2>

          {error && <div className="lpm-error">{error}</div>}
          {needsVerification && verificationNotice('lpm')}

          <form onSubmit={handleSubmit} className="lpm-form">
            <div className="lpm-group">
              <label htmlFor="m-emailOrUsername" className="lpm-label">Email or username:</label>
              <input
                type="text" id="m-emailOrUsername" name="emailOrUsername"
                value={formData.emailOrUsername} onChange={handleChange}
                placeholder="email@example.com or username"
                required autoComplete="username" className="lpm-input"
              />
            </div>

            <div className="lpm-group">
              <label htmlFor="m-password" className="lpm-label">Password:</label>
              <input
                type="password" id="m-password" name="password"
                value={formData.password} onChange={handleChange}
                placeholder="•••••••••••••••••••••••••"
                required autoComplete="current-password" className="lpm-input"
              />
            </div>

            <div>
              <Link to="/forgot-password" className="lpm-forgot">Forgot password?</Link>
            </div>

            <div className="lpm-btns">
              <button type="button" onClick={handleGuestMode}>
                <img src={guestBtn} alt="Play as a guest" />
              </button>
              <button type="submit" disabled={loading}>
                <img src={signInBtn} alt="Sign in" />
              </button>
            </div>

            <div className="lpm-signup">
              Don't have an account yet?{' '}
              <Link to="/register">Sign up</Link>
            </div>
          </form>
        </div>

        {/* Not Logged In Popup */}
        {showNotLoggedPopup && (
          <div className="lpm-popup-bg">
            <div className="lpm-popup">
              <img src={accountNotFoundBoard} alt="Please sign in" className="pb" />
              <button type="button" onClick={() => setShowNotLoggedPopup(false)}>
                <img src={okBtn} alt="OK" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="lp-page">
      <style>{styles}</style>

      {/* Header Navigation */}
      <div className="lp-nav">
        <button
          onClick={() => navigate('/')}
          onMouseEnter={() => setMainMenuHover(true)}
          onMouseLeave={() => setMainMenuHover(false)}
          aria-label="Go to main menu"
        >
          <img src={mainMenuHover ? mainMenuBtnHover : mainMenuBtn} alt="Main menu" style={{ height: 40 }} />
        </button>
        <div style={{ width: 1, height: 40, background: '#E52828' }} />
        <img src={logoImg} alt="Mini-Talks" style={{ height: 48 }} />
      </div>

      {/* KART */}
      <div className="lp-modal-wrapper">
        <img src={BrickBorder} alt="" className="lp-brick-border" />

        <div className="lp-modal">
          <div className="lp-header">
            <img src={logoHead} alt="" className="lh" style={{ height: 55 }} />
            <img src={logoText} alt="Mini-Talks" className="lt" style={{ height: 44 }} />
          </div>

          <div className="lp-content">
            <h2 className="lp-title">Sign in</h2>

            {error && <div className="lp-error">{error}</div>}
            {needsVerification && verificationNotice('lp')}

            <form onSubmit={handleSubmit} className="lp-form">
              <div className="lp-group">
                <label htmlFor="emailOrUsername" className="lp-label">Email or username:</label>
                <input
                  type="text" id="emailOrUsername" name="emailOrUsername"
                  value={formData.emailOrUsername} onChange={handleChange}
                  placeholder="email@example.com or username"
                  required autoComplete="username" className="lp-input"
                />
              </div>

              <div className="lp-group">
                <label htmlFor="password" className="lp-label">Password:</label>
                <input
                  type="password" id="password" name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="•••••••••••••••••••••••••"
                  required autoComplete="current-password" className="lp-input"
                />
              </div>

              <div>
                <Link to="/forgot-password" className="lp-forgot">Forgot password?</Link>
              </div>

              <div className="lp-btns">
                <button type="button" onClick={handleGuestMode}
                  onMouseEnter={() => setGuestHover(true)} onMouseLeave={() => setGuestHover(false)}>
                  <img src={guestHover ? guestBtnHover : guestBtn} alt="Play as a guest" />
                </button>
                <button type="submit" disabled={loading}
                  onMouseEnter={() => setSignInHover(true)} onMouseLeave={() => setSignInHover(false)}>
                  <img src={signInHover ? signInBtnHover : signInBtn} alt="Sign in" />
                </button>
              </div>

              <div className="lp-signup">
                Don't have an account yet?{' '}
                <Link to="/register">Sign up</Link>
              </div>
            </form>

            <p className="lp-disc">
              LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.
            </p>
          </div>
        </div>
      </div>

      {/* Not Logged In Popup */}
      {showNotLoggedPopup && (
        <div className="lp-popup-bg">
          <div className="lp-popup">
            <img src={accountNotFoundBoard} alt="Please sign in" className="pb" />
            <button type="button" onClick={() => setShowNotLoggedPopup(false)}
              onMouseEnter={() => setOkHover(true)} onMouseLeave={() => setOkHover(false)}>
              <img src={okHover ? okBtnHover : okBtn} alt="OK" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;