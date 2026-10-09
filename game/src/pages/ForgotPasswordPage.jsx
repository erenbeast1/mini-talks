// src/pages/ForgotPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import mainMenuBtn from '../assets/main-menu-btn.png';
import mainMenuBtnHover from '../assets/main-menu-btn-hover.png';
import logoImg from '../assets/logo.png';
import logoHead from '../assets/logo-head.png';
import logoText from '../assets/logo-text.png';

// Brick Border - 4'lü stud PNG
import BrickBorder from '../assets/kirmizi-top.png';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mainMenuHover, setMainMenuHover] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/forgot-password.php',
        { email }
      );

      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.message || 'Failed to send reset link');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    .fp-page {
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
    .fp-page *, .fp-page input, .fp-page button, .fp-page label, .fp-page a, .fp-page p, .fp-page h2 {
      font-family: "Montserrat", sans-serif;
    }

    .fp-nav {
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
    .fp-nav button {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      -webkit-transition: -webkit-transform 0.2s;
      transition: transform 0.2s;
    }
    .fp-nav button:hover {
      -webkit-transform: scale(1.05);
      transform: scale(1.05);
    }

    .fp-modal-wrapper {
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

    .fp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 15px 15px 0 0;
    }

    .fp-modal {
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

    .fp-header {
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

    .fp-content {
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

    .fp-title {
      font-size: 30px;
      font-weight: 900;
      margin: 0 0 10px;
      text-align: center;
      color: #000;
    }

    .fp-subtitle {
      text-align: center;
      font-size: 14px;
      color: #666;
      margin: 0 0 22px;
      max-width: 400px;
      line-height: 1.5;
    }

    .fp-error {
      width: 100%;
      background: #FEE2E2;
      border: 2px solid #F87171;
      color: #B91C1C;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 14px;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
    }

    .fp-form { width: 100%; }
    .fp-group { margin-bottom: 16px; }
    .fp-label {
      display: block;
      font-size: 14px;
      font-weight: 700;
      color: #000;
      margin-bottom: 5px;
    }
    .fp-input {
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
    .fp-input:focus {
      border-color: #0055BF;
      -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
      box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
    }
    .fp-input::-webkit-input-placeholder { color: #999; }
    .fp-input::placeholder { color: #999; }
    .fp-input:disabled { opacity: 0.6; }

    .fp-submit-btn {
      width: 100%;
      padding: 14px;
      background: #237841;
      color: #FFF;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
      margin-bottom: 12px;
    }
    .fp-submit-btn:hover { background: #1a5e33; }
    .fp-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .fp-back-link {
      background: none;
      border: none;
      color: #0055BF;
      font-weight: 700;
      font-size: 14px;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
    }
    .fp-back-link:hover { color: #003d8f; }

    .fp-link-btn {
      padding: 14px 32px;
      background: #237841;
      color: #FFF;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .fp-link-btn:hover { background: #1a5e33; }

    .fp-status-box {
      text-align: center;
      padding: 10px 0;
      width: 100%;
      max-width: 420px;
    }
    .fp-status-icon {
      font-size: 56px;
      margin-bottom: 16px;
      line-height: 1;
    }
    .fp-status-text {
      color: #444;
      font-size: 14px;
      margin: 0 0 8px;
      line-height: 1.5;
    }
    .fp-status-small {
      color: #888;
      font-size: 13px;
      margin: 0 0 20px;
    }

    .fp-disc {
      text-align: center;
      font-size: 10px;
      color: #888;
      line-height: 1.4;
      margin: 16px 0 0;
    }

    /* %150 zoom */
    @media (max-height: 750px) {
      .fp-page { padding: 10px; }
      .fp-header { padding: 10px 0 8px; }
      .fp-header .lh { height: 42px !important; }
      .fp-header .lt { height: 34px !important; }
      .fp-content { padding: 16px 24px 14px; }
      .fp-title { font-size: 24px; margin-bottom: 6px; }
      .fp-subtitle { font-size: 12px; margin-bottom: 14px; }
      .fp-group { margin-bottom: 10px; }
      .fp-input { padding: 9px 14px; font-size: 14px; border-radius: 10px; }
      .fp-label { font-size: 13px; margin-bottom: 3px; }
      .fp-submit-btn { padding: 11px; font-size: 15px; }
      .fp-link-btn { padding: 11px 28px; font-size: 15px; }
      .fp-status-icon { font-size: 44px; margin-bottom: 12px; }
      .fp-disc { margin-top: 10px; }
      .fp-nav img { height: 32px !important; }
      .fp-nav div { height: 32px !important; }
    }

    @media (max-height: 580px) {
      .fp-header { padding: 6px 0 4px; }
      .fp-header .lh { height: 32px !important; }
      .fp-header .lt { height: 26px !important; }
      .fp-content { padding: 10px 18px 10px; margin: 0 6px 6px; border-radius: 12px; }
      .fp-title { font-size: 20px; margin-bottom: 4px; }
      .fp-subtitle { font-size: 11px; margin-bottom: 10px; }
      .fp-group { margin-bottom: 6px; }
      .fp-input { padding: 7px 12px; font-size: 13px; border-radius: 8px; }
      .fp-label { font-size: 12px; margin-bottom: 2px; }
      .fp-submit-btn { padding: 9px; font-size: 14px; border-radius: 8px; }
      .fp-link-btn { padding: 9px 24px; font-size: 14px; border-radius: 8px; }
      .fp-status-icon { font-size: 36px; margin-bottom: 8px; }
      .fp-modal-wrapper { border-radius: 10px; }
      .fp-brick-border { border-radius: 10px 10px 0 0; }
      .fp-modal { border-radius: 10px; }
    }

    @media (max-width: 640px) {
      .fp-modal-wrapper { border-radius: 12px; }
      .fp-brick-border { border-radius: 12px 12px 0 0; }
      .fp-modal { border-radius: 12px; }
      .fp-content { padding: 20px 18px 18px; margin: 0 6px 6px; }
      .fp-title { font-size: 24px; }
      .fp-header .lh { height: 40px !important; }
      .fp-header .lt { height: 32px !important; }
    }
  `;

  // ── MOBİL CSS (studsuz, beyaz, sol logo + sağ içerik) ──
  const mobileStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    .fpm-page {
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
    .fpm-page *, .fpm-page input, .fpm-page button, .fpm-page label, .fpm-page a, .fpm-page p, .fpm-page h2 {
      font-family: "Montserrat", sans-serif;
      box-sizing: border-box;
    }

    .fpm-nav {
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
    .fpm-nav button { border: none; background: none; padding: 0; cursor: pointer; }
    .fpm-nav img { height: 26px; }
    .fpm-nav .fpm-divider { width: 1px; height: 26px; background: #E52828; }

    .fpm-logo {
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
    .fpm-logo .fpm-head { height: min(42vh, 170px); width: auto; }
    .fpm-logo .fpm-text { height: min(13vh, 52px); width: auto; }

    .fpm-col {
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
      width: 310px;
      max-height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .fpm-title {
      font-size: 21px;
      font-weight: 900;
      margin: 0 0 6px;
      text-align: center;
      color: #E52828;
    }
    .fpm-subtitle {
      text-align: center;
      font-size: 11px;
      color: #666;
      margin: 0 0 10px;
      line-height: 1.4;
    }
    .fpm-error {
      width: 100%; background: #FEE2E2; border: 2px solid #F87171;
      color: #B91C1C; padding: 6px 10px; border-radius: 8px;
      margin-bottom: 8px; font-weight: 600; font-size: 11px; text-align: center;
    }
    .fpm-form { width: 100%; }
    .fpm-group { margin-bottom: 10px; }
    .fpm-label {
      display: block; font-size: 12px; font-weight: 700;
      color: #000; margin-bottom: 3px;
    }
    .fpm-input {
      width: 100%; padding: 8px 12px; border: 2px solid #000;
      border-radius: 9px; font-size: 13px; outline: none; background: #FFF;
    }
    .fpm-input:focus {
      border-color: #0055BF;
      -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
      box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
    }
    .fpm-input::-webkit-input-placeholder { color: #999; }
    .fpm-input::placeholder { color: #999; }
    .fpm-input:disabled { opacity: 0.6; }

    .fpm-submit-btn {
      width: 100%; padding: 9px; background: #237841; color: #FFF;
      border: none; border-radius: 9px; font-size: 13px; font-weight: 800;
      cursor: pointer; margin-bottom: 8px;
    }
    .fpm-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .fpm-back-link {
      background: none; border: none; color: #0055BF;
      font-weight: 700; font-size: 12px; text-decoration: underline;
      cursor: pointer; padding: 0;
    }
    .fpm-link-btn {
      padding: 9px 24px; background: #237841; color: #FFF;
      border: none; border-radius: 9px; font-size: 13px; font-weight: 800;
      cursor: pointer;
    }
    .fpm-status-box { text-align: center; width: 100%; }
    .fpm-status-icon { font-size: 38px; margin-bottom: 8px; line-height: 1; }
    .fpm-status-text { color: #444; font-size: 12px; margin: 0 0 6px; line-height: 1.4; }
    .fpm-status-small { color: #888; font-size: 11px; margin: 0 0 12px; }
  `;

  // ── Mobil ortak wrapper: sol logo + sağ içerik ──
  const renderMobileCard = (children) => (
    <div className="fpm-page">
      <style>{mobileStyles}</style>

      <div className="fpm-nav">
        <button onClick={() => navigate('/')} aria-label="Go to main menu">
          <img src={mainMenuBtn} alt="Main menu" />
        </button>
        <div className="fpm-divider" />
        <img src={logoImg} alt="Mini-Talks" />
      </div>

      <div className="fpm-logo">
        <img src={logoHead} alt="" className="fpm-head" />
        <img src={logoText} alt="Mini-Talks" className="fpm-text" />
      </div>

      <div className="fpm-col">
        {children}
      </div>
    </div>
  );

  // ── Desktop ortak wrapper: Brick + Kırmızı + Beyaz ──
  const renderCard = (children) => (
    <div className="fp-page">
      <style>{styles}</style>

      <div className="fp-nav">
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

      <div className="fp-modal-wrapper">
        <img src={BrickBorder} alt="" className="fp-brick-border" />
        <div className="fp-modal">
          <div className="fp-header">
            <img src={logoHead} alt="" className="lh" style={{ height: 55 }} />
            <img src={logoText} alt="Mini-Talks" className="lt" style={{ height: 44 }} />
          </div>
          <div className="fp-content">
            {children}
            <p className="fp-disc">
              LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    // BAŞARILI (mobil)
    if (success) {
      return renderMobileCard(
        <div className="fpm-status-box">
          <div className="fpm-status-icon">✅</div>
          <h2 className="fpm-title">Check Your Email!</h2>
          <p className="fpm-status-text">
            If an account exists with <strong>{email}</strong>, we've sent password reset instructions.
          </p>
          <p className="fpm-status-small">The link will expire in 1 hour.</p>
          <button onClick={() => navigate('/login')} className="fpm-link-btn">
            Back to Login
          </button>
        </div>
      );
    }

    // FORM (mobil)
    return renderMobileCard(
      <>
        <h2 className="fpm-title">Forgot Password?</h2>
        <p className="fpm-subtitle">
          No worries! Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && <div className="fpm-error">{error}</div>}

        <form onSubmit={handleSubmit} className="fpm-form">
          <div className="fpm-group">
            <label className="fpm-label">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              disabled={loading}
              className="fpm-input"
            />
          </div>

          <button type="submit" disabled={loading} className="fpm-submit-btn">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <button type="button" onClick={() => navigate('/login')} className="fpm-back-link">
              Back to Login
            </button>
          </div>
        </form>
      </>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  // BAŞARILI
  if (success) {
    return renderCard(
      <div className="fp-status-box">
        <div className="fp-status-icon">✅</div>
        <h2 className="fp-title">Check Your Email!</h2>
        <p className="fp-status-text">
          If an account exists with <strong>{email}</strong>, we've sent password reset instructions.
        </p>
        <p className="fp-status-small">The link will expire in 1 hour.</p>
        <button onClick={() => navigate('/login')} className="fp-link-btn">
          Back to Login
        </button>
      </div>
    );
  }

  // FORM
  return renderCard(
    <>
      <h2 className="fp-title">Forgot Password?</h2>
      <p className="fp-subtitle">
        No worries! Enter your email address and we'll send you a link to reset your password.
      </p>

      {error && <div className="fp-error">{error}</div>}

      <form onSubmit={handleSubmit} className="fp-form">
        <div className="fp-group">
          <label className="fp-label">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            disabled={loading}
            className="fp-input"
          />
        </div>

        <button type="submit" disabled={loading} className="fp-submit-btn">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <button type="button" onClick={() => navigate('/login')} className="fp-back-link">
            Back to Login
          </button>
        </div>
      </form>
    </>
  );
};

export default ForgotPasswordPage;