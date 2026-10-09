// src/pages/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

import mainMenuBtn from '../assets/main-menu-btn.png';
import mainMenuBtnHover from '../assets/main-menu-btn-hover.png';
import logoImg from '../assets/logo.png';
import logoHead from '../assets/logo-head.png';
import logoText from '../assets/logo-text.png';

// Brick Border - 4'lü stud PNG
import BrickBorder from '../assets/kirmizi-top.png';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/reset-password.php',
        {
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      if (err.response?.data?.expired) {
        setError('This reset link has expired. Please request a new one.');
      } else {
        setError(err.response?.data?.message || 'Connection error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    .rp-page {
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
    .rp-page *, .rp-page input, .rp-page button, .rp-page label, .rp-page a, .rp-page p, .rp-page h2 {
      font-family: "Montserrat", sans-serif;
    }

    /* Nav */
    .rp-nav {
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
    .rp-nav button {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      -webkit-transition: -webkit-transform 0.2s;
      transition: transform 0.2s;
    }
    .rp-nav button:hover {
      -webkit-transform: scale(1.05);
      transform: scale(1.05);
    }

    .rp-modal-wrapper {
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

    .rp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 15px 15px 0 0;
    }

    .rp-modal {
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

    .rp-header {
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

    .rp-content {
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

    .rp-title {
      font-size: 30px;
      font-weight: 900;
      margin: 0 0 10px;
      text-align: center;
      color: #000;
    }

    .rp-subtitle {
      text-align: center;
      font-size: 14px;
      color: #666;
      margin: 0 0 22px;
      max-width: 400px;
    }

    .rp-error {
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

    .rp-form { width: 100%; }
    .rp-group { margin-bottom: 14px; }
    .rp-label {
      display: block;
      font-size: 14px;
      font-weight: 700;
      color: #000;
      margin-bottom: 5px;
    }
    .rp-input {
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
    .rp-input:focus {
      border-color: #0055BF;
      -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
      box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
    }
    .rp-input::-webkit-input-placeholder { color: #999; }
    .rp-input::placeholder { color: #999; }
    .rp-input:disabled { opacity: 0.6; }

    .rp-submit-btn {
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
      margin-top: 6px;
    }
    .rp-submit-btn:hover { background: #1a5e33; }
    .rp-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .rp-link-btn {
      padding: 14px 32px;
      background: #0055BF;
      color: #FFF;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .rp-link-btn:hover { background: #0066CC; }

    /* Status box */
    .rp-status-box {
      text-align: center;
      padding: 10px 0;
      width: 100%;
      max-width: 400px;
    }
    .rp-status-icon {
      font-size: 56px;
      margin-bottom: 16px;
      line-height: 1;
    }
    .rp-status-text {
      color: #444;
      font-size: 14px;
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .rp-status-redirect {
      font-size: 13px;
      color: #888;
      margin: 0;
    }

    .rp-disc {
      text-align: center;
      font-size: 10px;
      color: #888;
      line-height: 1.4;
      margin: 16px 0 0;
    }

    /* ===== KISA EKRAN / %150 ZOOM ===== */
    @media (max-height: 750px) {
      .rp-page { padding: 10px; }
      .rp-header { padding: 10px 0 8px; }
      .rp-header .lh { height: 42px !important; }
      .rp-header .lt { height: 34px !important; }
      .rp-content { padding: 16px 24px 14px; }
      .rp-title { font-size: 24px; margin-bottom: 6px; }
      .rp-subtitle { font-size: 12px; margin-bottom: 14px; }
      .rp-group { margin-bottom: 10px; }
      .rp-input { padding: 9px 14px; font-size: 14px; border-radius: 10px; }
      .rp-label { font-size: 13px; margin-bottom: 3px; }
      .rp-submit-btn { padding: 11px; font-size: 15px; }
      .rp-link-btn { padding: 11px 28px; font-size: 15px; }
      .rp-status-icon { font-size: 44px; margin-bottom: 12px; }
      .rp-disc { margin-top: 10px; }
      .rp-nav img { height: 32px !important; }
      .rp-nav div { height: 32px !important; }
    }

    @media (max-height: 580px) {
      .rp-header { padding: 6px 0 4px; }
      .rp-header .lh { height: 32px !important; }
      .rp-header .lt { height: 26px !important; }
      .rp-content { padding: 10px 18px 10px; margin: 0 6px 6px; border-radius: 12px; }
      .rp-title { font-size: 20px; margin-bottom: 4px; }
      .rp-subtitle { font-size: 11px; margin-bottom: 10px; }
      .rp-group { margin-bottom: 6px; }
      .rp-input { padding: 7px 12px; font-size: 13px; border-radius: 8px; }
      .rp-label { font-size: 12px; margin-bottom: 2px; }
      .rp-submit-btn { padding: 9px; font-size: 14px; border-radius: 8px; }
      .rp-link-btn { padding: 9px 24px; font-size: 14px; border-radius: 8px; }
      .rp-status-icon { font-size: 36px; margin-bottom: 8px; }
      .rp-modal-wrapper { border-radius: 10px; }
      .rp-brick-border { border-radius: 10px 10px 0 0; }
      .rp-modal { border-radius: 10px; }
    }

    @media (max-width: 640px) {
      .rp-modal-wrapper { border-radius: 12px; }
      .rp-brick-border { border-radius: 12px 12px 0 0; }
      .rp-modal { border-radius: 12px; }
      .rp-content { padding: 20px 18px 18px; margin: 0 6px 6px; }
      .rp-title { font-size: 24px; }
      .rp-header .lh { height: 40px !important; }
      .rp-header .lt { height: 32px !important; }
    }
  `;

  // ── MOBİL CSS (studsuz, beyaz, sol logo + sağ içerik) ──
  const mobileStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    .rpm-page {
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
    .rpm-page *, .rpm-page input, .rpm-page button, .rpm-page label, .rpm-page a, .rpm-page p, .rpm-page h2 {
      font-family: "Montserrat", sans-serif;
      box-sizing: border-box;
    }

    .rpm-nav {
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
    .rpm-nav button { border: none; background: none; padding: 0; cursor: pointer; }
    .rpm-nav img { height: 26px; }
    .rpm-nav .rpm-divider { width: 1px; height: 26px; background: #E52828; }

    .rpm-logo {
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
    .rpm-logo .rpm-head { height: min(42vh, 170px); width: auto; }
    .rpm-logo .rpm-text { height: min(13vh, 52px); width: auto; }

    .rpm-col {
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
    .rpm-title {
      font-size: 21px;
      font-weight: 900;
      margin: 0 0 6px;
      text-align: center;
      color: #E52828;
    }
    .rpm-subtitle {
      text-align: center;
      font-size: 11px;
      color: #666;
      margin: 0 0 10px;
      line-height: 1.4;
    }
    .rpm-error {
      width: 100%; background: #FEE2E2; border: 2px solid #F87171;
      color: #B91C1C; padding: 6px 10px; border-radius: 8px;
      margin-bottom: 8px; font-weight: 600; font-size: 11px; text-align: center;
    }
    .rpm-form { width: 100%; }
    .rpm-group { margin-bottom: 8px; }
    .rpm-label {
      display: block; font-size: 12px; font-weight: 700;
      color: #000; margin-bottom: 3px;
    }
    .rpm-input {
      width: 100%; padding: 8px 12px; border: 2px solid #000;
      border-radius: 9px; font-size: 13px; outline: none; background: #FFF;
    }
    .rpm-input:focus {
      border-color: #0055BF;
      -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
      box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
    }
    .rpm-input::-webkit-input-placeholder { color: #999; }
    .rpm-input::placeholder { color: #999; }
    .rpm-input:disabled { opacity: 0.6; }

    .rpm-submit-btn {
      width: 100%; padding: 9px; background: #237841; color: #FFF;
      border: none; border-radius: 9px; font-size: 13px; font-weight: 800;
      cursor: pointer; margin-top: 2px;
    }
    .rpm-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .rpm-link-btn {
      padding: 9px 24px; background: #0055BF; color: #FFF;
      border: none; border-radius: 9px; font-size: 13px; font-weight: 800;
      cursor: pointer;
    }
    .rpm-status-box { text-align: center; width: 100%; }
    .rpm-status-icon { font-size: 38px; margin-bottom: 8px; line-height: 1; }
    .rpm-status-text { color: #444; font-size: 12px; margin: 0 0 10px; line-height: 1.4; }
    .rpm-status-redirect { font-size: 11px; color: #888; margin: 0; }
  `;

  // ── Mobil ortak wrapper: sol logo + sağ içerik ──
  const renderMobileCard = (children) => (
    <div className="rpm-page">
      <style>{mobileStyles}</style>

      <div className="rpm-nav">
        <button onClick={() => navigate('/')} aria-label="Go to main menu">
          <img src={mainMenuBtn} alt="Main menu" />
        </button>
        <div className="rpm-divider" />
        <img src={logoImg} alt="Mini-Talks" />
      </div>

      <div className="rpm-logo">
        <img src={logoHead} alt="" className="rpm-head" />
        <img src={logoText} alt="Mini-Talks" className="rpm-text" />
      </div>

      <div className="rpm-col">
        {children}
      </div>
    </div>
  );

  // ── Desktop ortak wrapper: Brick + Kırmızı + Beyaz ──
  const renderCard = (children) => (
    <div className="rp-page">
      <style>{styles}</style>

      {/* Nav */}
      <div className="rp-nav">
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

      {/* Kart */}
      <div className="rp-modal-wrapper">
        <img src={BrickBorder} alt="" className="rp-brick-border" />
        <div className="rp-modal">
          <div className="rp-header">
            <img src={logoHead} alt="" className="lh" style={{ height: 55 }} />
            <img src={logoText} alt="Mini-Talks" className="lt" style={{ height: 44 }} />
          </div>
          <div className="rp-content">
            {children}
            <p className="rp-disc">
              LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // İçerik render'ı — mobil/desktop wrapper'a göre class öneki
  const wrap = isSmallScreen ? renderMobileCard : renderCard;
  const p = isSmallScreen ? 'rpm' : 'rp';

  // TOKEN YOK
  if (!token) {
    return wrap(
      <>
        <div className={`${p}-status-box`}>
          <div className={`${p}-status-icon`}>❌</div>
          <h2 className={`${p}-title`}>Invalid Reset Link</h2>
          <p className={`${p}-status-text`}>
            This password reset link is invalid or has been used.
          </p>
          <button onClick={() => navigate('/forgot-password')} className={`${p}-link-btn`}>
            Request New Link
          </button>
        </div>
      </>
    );
  }

  // BAŞARILI
  if (success) {
    return wrap(
      <>
        <div className={`${p}-status-box`}>
          <div className={`${p}-status-icon`}>✅</div>
          <h2 className={`${p}-title`}>Password Reset!</h2>
          <p className={`${p}-status-text`}>
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <p className={`${p}-status-redirect`}>Redirecting to login...</p>
        </div>
      </>
    );
  }

  // FORM
  return wrap(
    <>
      <h2 className={`${p}-title`}>Reset Password</h2>
      <p className={`${p}-subtitle`}>Create a new password for your Mini-Talks account.</p>

      {error && <div className={`${p}-error`}>{error}</div>}

      <form onSubmit={handleSubmit} className={`${p}-form`}>
        <div className={`${p}-group`}>
          <label className={`${p}-label`}>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            disabled={loading}
            minLength={6}
            className={`${p}-input`}
          />
        </div>

        <div className={`${p}-group`}>
          <label className={`${p}-label`}>Confirm Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={loading}
            minLength={6}
            className={`${p}-input`}
          />
        </div>

        <button type="submit" disabled={loading} className={`${p}-submit-btn`}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </>
  );
};

export default ResetPasswordPage;