// src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AvatarEditorModal from '../components/dashboard/AvatarEditorModal';
import { CheckEmailPopup, ParentInvitationSentPopup, ErrorPopup } from '../components/popups/EmailPopups';

import mainMenuBtn from '../assets/main-menu-btn.png';
import mainMenuBtnHover from '../assets/main-menu-btn-hover.png';
import logoImg from '../assets/logo.png';
import logoHead from '../assets/logo-head.png';
import logoText from '../assets/logo-text.png';

// Brick Borders
import BrickBorder from '../assets/kirmizi-top.png';
import BrickBorderAcc from '../assets/kirmizi-top-acc.png';

import signUpBtn from '../assets/Builder Sign Up Buton.png';
import signUpBtnHover from '../assets/Builder Sign Up Buton_Hover.png';
import cancelBtn from '../assets/Builder Cancel Buton.png';
import cancelBtnHover from '../assets/Builder Cancel Buton_Hover.png';

const initialFormData = {
  fullName: '',
  username: '',
  email: '',
  parentEmail: '',
  organization: '',
  password: '',
  confirmPassword: '',
  ageGroup: '',
  acceptTerms: false,
  confirmAdult: false,
  parentPermission: false,
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  const roleTypeFromState = location.state?.roleType || null;

  const [step, setStep] = useState(roleTypeFromState ? 2 : 1);
  const [roleType, setRoleType] = useState(roleTypeFromState || null);
  const [selectedRole, setSelectedRole] = useState(roleTypeFromState || null);

  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [signHover, setSignHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);
  const [continueHover, setContinueHover] = useState(false);
  const [mainMenuHover, setMainMenuHover] = useState(false);

  const [showCheckEmailPopup, setShowCheckEmailPopup] = useState(false);
  // The account just created, waiting for its picture.
  const [newAvatar, setNewAvatar] = useState(null);
  const [avatarStep, setAvatarStep] = useState(false);
  const [showParentInvitationPopup, setShowParentInvitationPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  const roleChoices = [
    { id: 'child', title: 'Child', description: 'Play and practice Mini-Talks activities.' },
    { id: 'parent', title: 'Parent', description: "Manage and guide your child's experience." },
    { id: 'expert', title: 'Expert', description: "Support children's progress with parent approval." },
    { id: 'builder', title: 'Builder', description: 'Enjoy creative, real-life scenes as an adult player.' },
  ];

  const roleConfig = {
    child: {
      title: 'Create Your Mini Account',
      description: 'A parent must approve your account before you start playing.',
      submitText: 'SEND PARENTS REQUEST',
    },
    parent: {
      title: 'Create Your Parent Account',
      description: 'After signing up, you can add your child as a Mini to start playing together.',
      submitText: 'SIGN UP',
    },
    builder: {
      title: 'Create Your Builder Account',
      description: 'We believe creativity and play have no age. Build, customize, and bring stories to life!',
      submitText: 'SIGN UP',
    },
    expert: {
      title: 'Create Your Expert Account',
      description: 'Use this account to connect with parents and support children in their Mini-Talks journey.',
      submitText: 'SIGN UP',
    },
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
    setSuccess('');
  };

  const handleSelectAge = (value) => {
    setFormData((prev) => ({ ...prev, ageGroup: value }));
    setError('');
  };

  const validate = () => {
    if (!formData.email) return 'Email is required.';
    if (!formData.password || !formData.confirmPassword) return 'Password and confirmation are required.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    if (!formData.fullName) return 'Full name / Mini name is required.';
    if (roleType === 'child') {
      if (!formData.parentEmail) return "Parent's email is required.";
      if (!formData.ageGroup) return 'Please choose your age group.';
      if (!formData.parentPermission) return "You must confirm that you have your parent's permission.";
    }
    if (roleType === 'builder') {
      if (!formData.username) return 'Username is required for Builder accounts.';
      if (!formData.ageGroup) return 'Please choose your age group.';
      if (!formData.confirmAdult) return 'You must confirm that you are 18 or older.';
      if (!formData.acceptTerms) return 'You must accept the Privacy Policy and Terms of Use.';
    }
    if (roleType === 'parent') {
      if (!formData.confirmAdult) return 'You must confirm you are over 18 or a legal guardian.';
      if (!formData.acceptTerms) return 'You must accept the Privacy Policy and Terms of Use.';
    }
    if (roleType === 'expert') {
      if (!formData.username) return 'Username is required for Expert accounts.';
      if (!formData.organization) return 'Organization is required for Expert accounts.';
      if (!formData.acceptTerms) return 'You must accept the Privacy Policy and Terms of Use.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const created = await register({
        email: formData.email,
        password: formData.password,
        role_type: roleType,
        full_name: formData.fullName,
        username: formData.username,
        parent_email: formData.parentEmail,
        organization: formData.organization,
        age_group: formData.ageGroup,
      });
      // register.php hands back the id to save an avatar against, already
      // resolved per role: a Mini's avatar is keyed by mini_id, everyone
      // else's by user_id. Making the profile is the one moment its picture
      // belongs to whoever is making it.
      const avatarId = created?.user?.avatar_id || null;
      if (avatarId) setNewAvatar({ id: avatarId, role: roleType });
      if (roleType === 'child') {
        setShowParentInvitationPopup(true);
      } else {
        setShowCheckEmailPopup(true);
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Registration failed. Please try again.';
      setErrorMessage(errorMsg);
      setShowErrorPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (roleTypeFromState) {
      navigate('/login');
    } else {
      setStep(1);
      setRoleType(null);
      setSelectedRole(null);
      setFormData(initialFormData);
      setError('');
      setSuccess('');
    }
  };

  const handlePopupClose = () => {
    setShowCheckEmailPopup(false);
    setShowParentInvitationPopup(false);
    setShowErrorPopup(false);

    // Offer the avatar editor once, on the way out. Skipping it is fine — the
    // profile page has the same editor, and nobody should be held at the door
    // of an account they have just made.
    if (newAvatar && !avatarStep) {
      setAvatarStep(true);
      return;
    }
    setTimeout(() => navigate('/login'), 300);
  };

  const finishAvatarStep = () => {
    setAvatarStep(false);
    setNewAvatar(null);
    setTimeout(() => navigate('/login'), 300);
  };

  const handleContinueFromRole = () => {
    if (!selectedRole) return;
    setRoleType(selectedRole);
    setFormData(initialFormData);
    setError('');
    setSuccess('');
    setStep(2);
  };

  /* ═══════════════════════════════════════════
     CSS — Step 1 (reg-) ve Step 2 (reg2-) ortak
     ═══════════════════════════════════════════ */
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    /* ── Ortak sayfa ── */
    .reg-page {
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
    .reg-page *, .reg-page input, .reg-page button, .reg-page label,
    .reg-page a, .reg-page p, .reg-page h2, .reg-page span {
      font-family: "Montserrat", sans-serif;
    }

    /* Nav */
    .reg-nav {
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
    .reg-nav button {
      border: none; background: none; padding: 0; cursor: pointer;
      -webkit-transition: -webkit-transform 0.2s; transition: transform 0.2s;
    }
    .reg-nav button:hover { -webkit-transform: scale(1.05); transform: scale(1.05); }

    /* ── Wrapper ── */
    .reg-wrapper {
      position: relative; width: 100%; max-width: 560px;
      display: -webkit-box; display: -webkit-flex; display: flex;
      -webkit-box-orient: vertical; -webkit-flex-direction: column; flex-direction: column;
      overflow: hidden; border-radius: 15px;
    }
    .reg-wrapper.wide { max-width: 820px; }

    .reg-brick {
      width: 100%; display: block;
      -webkit-flex-shrink: 0; flex-shrink: 0;
      border-radius: 15px 15px 0 0;
    }

    .reg-modal {
      width: 100%;
      -webkit-box-flex: 1; -webkit-flex: 1 1 0%; flex: 1 1 0%;
      background: #E52828;
      border-radius: 15px 15px 15px 15px;
      display: -webkit-box; display: -webkit-flex; display: flex;
      -webkit-box-orient: vertical; -webkit-flex-direction: column; flex-direction: column;
      overflow: hidden;
    }

    .reg-header {
      display: -webkit-box; display: -webkit-flex; display: flex;
      -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center;
      -webkit-box-align: center; -webkit-align-items: center; align-items: center;
      gap: 12px; padding: 15px 0 12px;
      -webkit-flex-shrink: 0; flex-shrink: 0;
    }

    .reg-content {
      background: #FFFFFF;
      margin: 0 8px 8px; border-radius: 18px;
      padding: 28px 32px 22px;
      -webkit-box-flex: 1; -webkit-flex: 1 1 0%; flex: 1 1 0%;
      display: -webkit-box; display: -webkit-flex; display: flex;
      -webkit-box-orient: vertical; -webkit-flex-direction: column; flex-direction: column;
      -webkit-box-align: center; -webkit-align-items: center; align-items: center;
    }

    .reg-title {
      font-size: 28px; font-weight: 900; margin: 0 0 8px;
      text-align: center; color: #000;
    }
    .reg-subtitle {
      text-align: center; font-size: 14px; color: #666;
      margin: 0 0 6px; max-width: 460px; line-height: 1.4;
    }
    .reg-subtitle-small {
      text-align: center; font-size: 13px; color: #888;
      margin: 0 0 16px;
    }

    .reg-error {
      width: 100%; background: #FEE2E2; border: 2px solid #F87171;
      color: #B91C1C; padding: 10px 14px; border-radius: 10px;
      margin-bottom: 14px; font-weight: 600; font-size: 14px; text-align: center;
    }
    .reg-success {
      width: 100%; background: #E8F5E9; border: 2px solid #66BB6A;
      color: #2E7D32; padding: 10px 14px; border-radius: 10px;
      margin-bottom: 14px; font-weight: 600; font-size: 14px; text-align: center;
    }

    .reg-disc {
      text-align: center; font-size: 10px; color: #888;
      line-height: 1.4; margin: 16px 0 0;
    }

    /* ── Role seçim butonları (Step 1) ── */
    .reg-roles { width: 100%; margin-bottom: 16px; }
    .reg-role-btn {
      width: 100%; text-align: left; border: 2px solid #000;
      border-radius: 12px; padding: 12px 18px; margin-bottom: 8px;
      background: #FFF; cursor: pointer;
      -webkit-transition: all 0.15s; transition: all 0.15s;
    }
    .reg-role-btn:hover { background: #EBF5FF; }
    .reg-role-btn.selected {
      border-color: #0055BF; background: #0055BF; color: #FFF;
    }
    .reg-role-btn .role-title { font-weight: 700; font-size: 16px; }
    .reg-role-btn .role-desc { font-size: 14px; margin-top: 2px; }
    .reg-role-btn.selected .role-desc { color: rgba(255,255,255,0.85); }

    .reg-continue-btn {
      padding: 12px 48px; border: 2px solid #237841; border-radius: 12px;
      background: #237841; color: #FFF; font-size: 16px; font-weight: 700;
      cursor: pointer; letter-spacing: 0.5px;
      -webkit-transition: background-color 0.2s; transition: background-color 0.2s;
    }
    .reg-continue-btn:hover { background: #1a5e33; border-color: #1a5e33; }
    .reg-continue-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    /* ── Step 2 form ── */
    .reg-form { width: 100%; }
    .reg-row {
      display: -webkit-box; display: -webkit-flex; display: flex;
      gap: 14px; margin-bottom: 12px;
    }
    .reg-col { -webkit-box-flex: 1; -webkit-flex: 1 1 0%; flex: 1 1 0%; min-width: 0; }

    .reg-label {
      display: block; font-size: 13px; font-weight: 700;
      color: #000; margin-bottom: 4px;
    }
    .reg-input {
      width: 100%; padding: 10px 14px; border: 2px solid #000;
      border-radius: 10px; font-size: 14px; outline: none;
      -webkit-box-sizing: border-box; box-sizing: border-box;
      background: #FFF;
      -webkit-transition: border-color 0.2s, box-shadow 0.2s;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .reg-input:focus {
      border-color: #0055BF;
      -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
      box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
    }
    .reg-input::-webkit-input-placeholder { color: #999; }
    .reg-input::placeholder { color: #999; }

    /* Age group buttons */
    .reg-age-wrap {
      display: -webkit-box; display: -webkit-flex; display: flex;
      -webkit-flex-wrap: wrap; flex-wrap: wrap; gap: 6px; margin-top: 4px;
    }
    .reg-age-btn {
      padding: 8px 14px; border: 2px solid #000; border-radius: 8px;
      background: #FFF; font-weight: 700; font-size: 13px; cursor: pointer;
      -webkit-transition: all 0.15s; transition: all 0.15s;
    }
    .reg-age-btn:hover { background: #EBF5FF; }
    .reg-age-btn.selected {
      background: #0055BF; border-color: #0055BF; color: #FFF;
    }

    /* Checkboxes */
    .reg-checks { margin-top: 10px; }
    .reg-check-row {
      display: -webkit-box; display: -webkit-flex; display: flex;
      -webkit-box-align: start; -webkit-align-items: flex-start; align-items: flex-start;
      gap: 8px; margin-bottom: 6px; cursor: pointer;
    }
    .reg-check-row input { margin-top: 3px; width: 16px; height: 16px; -webkit-flex-shrink: 0; flex-shrink: 0; }
    .reg-check-text { font-weight: 600; font-size: 13px; line-height: 1.4; }
    .reg-check-info { font-size: 13px; color: #555; line-height: 1.5; margin-bottom: 6px; }

    /* Buttons row */
    .reg-btns {
      display: -webkit-box; display: -webkit-flex; display: flex;
      gap: 16px; margin-top: 14px;
      -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center;
      -webkit-box-align: center; -webkit-align-items: center; align-items: center;
    }
    .reg-btns button {
      border: none; background: none; padding: 0; cursor: pointer;
      display: -webkit-box; display: -webkit-flex; display: flex;
    }
    .reg-btns button:disabled { opacity: 0.6; cursor: default; }
    .reg-btns button img { height: 44px; width: auto; }

    /* ── Responsive ── */
    @media (max-height: 750px) {
      .reg-page { padding: 10px; }
      .reg-header { padding: 10px 0 8px; }
      .reg-header .lh { height: 42px !important; }
      .reg-header .lt { height: 34px !important; }
      .reg-content { padding: 14px 22px 12px; }
      .reg-title { font-size: 22px; margin-bottom: 4px; }
      .reg-subtitle { font-size: 12px; margin-bottom: 4px; }
      .reg-subtitle-small { font-size: 11px; margin-bottom: 10px; }
      .reg-role-btn { padding: 9px 14px; margin-bottom: 6px; }
      .reg-role-btn .role-title { font-size: 14px; }
      .reg-role-btn .role-desc { font-size: 12px; }
      .reg-continue-btn { padding: 10px 40px; font-size: 14px; }
      .reg-row { gap: 10px; margin-bottom: 8px; }
      .reg-input { padding: 8px 12px; font-size: 13px; }
      .reg-label { font-size: 12px; margin-bottom: 2px; }
      .reg-btns button img { height: 38px; }
      .reg-disc { margin-top: 8px; }
      .reg-nav img { height: 32px !important; }
      .reg-nav div { height: 32px !important; }
    }

    @media (max-height: 580px) {
      .reg-header { padding: 6px 0 4px; }
      .reg-header .lh { height: 32px !important; }
      .reg-header .lt { height: 26px !important; }
      .reg-content { padding: 8px 16px 8px; margin: 0 6px 6px; border-radius: 12px; }
      .reg-title { font-size: 18px; }
      .reg-subtitle { font-size: 11px; }
      .reg-role-btn { padding: 7px 12px; margin-bottom: 4px; border-radius: 8px; }
      .reg-role-btn .role-title { font-size: 13px; }
      .reg-role-btn .role-desc { font-size: 11px; }
      .reg-continue-btn { padding: 8px 32px; font-size: 13px; border-radius: 8px; }
      .reg-row { gap: 8px; margin-bottom: 6px; }
      .reg-input { padding: 6px 10px; font-size: 12px; border-radius: 8px; }
      .reg-label { font-size: 11px; }
      .reg-age-btn { padding: 5px 10px; font-size: 11px; }
      .reg-check-text { font-size: 11px; }
      .reg-check-info { font-size: 11px; }
      .reg-btns button img { height: 32px; }
      .reg-wrapper { border-radius: 10px; }
      .reg-brick { border-radius: 10px 10px 0 0; }
      .reg-modal { border-radius: 10px; }
    }

    @media (max-width: 640px) {
      .reg-wrapper { border-radius: 12px; }
      .reg-brick { border-radius: 12px 12px 0 0; }
      .reg-modal { border-radius: 12px; }
      .reg-content { padding: 18px 16px 16px; margin: 0 6px 6px; }
      .reg-title { font-size: 22px; }
      .reg-header .lh { height: 40px !important; }
      .reg-header .lt { height: 32px !important; }
      .reg-row {
        -webkit-box-orient: vertical; -webkit-flex-direction: column; flex-direction: column;
        gap: 10px;
      }
      .reg-btns {
        -webkit-box-orient: vertical; -webkit-flex-direction: column; flex-direction: column;
        gap: 10px;
      }
    }
  `;

  /* ═══════════════════════════════════════════
     MOBİL CSS — studsuz, beyaz, sol logo + sağ içerik
     ═══════════════════════════════════════════ */
  const mobileStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    .regm-page {
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
      gap: 26px;
      overflow: hidden;
    }
    .regm-page *, .regm-page input, .regm-page button, .regm-page label,
    .regm-page a, .regm-page p, .regm-page h2, .regm-page span {
      font-family: "Montserrat", sans-serif;
      box-sizing: border-box;
    }

    .regm-nav {
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
    .regm-nav button { border: none; background: none; padding: 0; cursor: pointer; }
    .regm-nav img { height: 26px; }
    .regm-nav .regm-divider { width: 1px; height: 26px; background: #E52828; }

    .regm-logo {
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
    .regm-logo .regm-head { height: min(40vh, 160px); width: auto; }
    .regm-logo .regm-text { height: min(12vh, 48px); width: auto; }

    .regm-col {
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
      max-height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .regm-col.narrow { width: 310px; }
    .regm-col.wide { width: 440px; }

    .regm-title {
      font-size: 19px;
      font-weight: 900;
      margin: 0 0 6px;
      text-align: center;
      color: #E52828;
    }
    .regm-subtitle {
      text-align: center;
      font-size: 10px;
      color: #666;
      margin: 0 0 8px;
      line-height: 1.35;
    }
    .regm-error {
      width: 100%; background: #FEE2E2; border: 2px solid #F87171;
      color: #B91C1C; padding: 5px 10px; border-radius: 8px;
      margin-bottom: 6px; font-weight: 600; font-size: 10px; text-align: center;
    }
    .regm-success {
      width: 100%; background: #E8F5E9; border: 2px solid #66BB6A;
      color: #2E7D32; padding: 5px 10px; border-radius: 8px;
      margin-bottom: 6px; font-weight: 600; font-size: 10px; text-align: center;
    }

    /* Rol seçimi */
    .regm-roles { width: 100%; margin-bottom: 8px; }
    .regm-role-btn {
      width: 100%; text-align: center; border: 2px solid #000;
      border-radius: 10px; padding: 6px 12px; margin-bottom: 5px;
      background: #FFF; cursor: pointer;
    }
    .regm-role-btn.selected { border-color: #0055BF; background: #0055BF; color: #FFF; }
    .regm-role-btn .role-title { font-weight: 700; font-size: 12px; }
    .regm-role-btn .role-desc { font-size: 9.5px; margin-top: 1px; }
    .regm-role-btn.selected .role-desc { color: rgba(255,255,255,0.85); }

    /* Form */
    .regm-form { width: 100%; }
    .regm-row {
      display: -webkit-box; display: -webkit-flex; display: flex;
      gap: 10px; margin-bottom: 7px;
    }
    .regm-rcol { -webkit-box-flex: 1; -webkit-flex: 1 1 0%; flex: 1 1 0%; min-width: 0; }
    .regm-label {
      display: block; font-size: 11px; font-weight: 700;
      color: #000; margin-bottom: 2px;
    }
    .regm-input {
      width: 100%; padding: 6px 10px; border: 2px solid #000;
      border-radius: 8px; font-size: 12px; outline: none;
      background: #FFF;
    }
    .regm-input:focus {
      border-color: #0055BF;
      -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
      box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
    }
    .regm-input::-webkit-input-placeholder { color: #999; }
    .regm-input::placeholder { color: #999; }

    .regm-age-wrap {
      display: -webkit-box; display: -webkit-flex; display: flex;
      -webkit-flex-wrap: wrap; flex-wrap: wrap; gap: 4px; margin-top: 2px;
    }
    .regm-age-btn {
      padding: 5px 9px; border: 2px solid #000; border-radius: 7px;
      background: #FFF; font-weight: 700; font-size: 11px; cursor: pointer;
    }
    .regm-age-btn.selected { background: #0055BF; border-color: #0055BF; color: #FFF; }

    .regm-checks { margin-top: 4px; }
    .regm-check-row {
      display: -webkit-box; display: -webkit-flex; display: flex;
      -webkit-box-align: start; -webkit-align-items: flex-start; align-items: flex-start;
      gap: 6px; margin-bottom: 4px; cursor: pointer;
    }
    .regm-check-row input { margin-top: 2px; width: 14px; height: 14px; -webkit-flex-shrink: 0; flex-shrink: 0; }
    .regm-check-text { font-weight: 600; font-size: 10px; line-height: 1.35; }
    .regm-check-info { font-size: 10px; color: #555; line-height: 1.4; margin: 0 0 4px; }

    .regm-btns {
      display: -webkit-box; display: -webkit-flex; display: flex;
      gap: 10px; margin-top: 8px;
      -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center;
      -webkit-box-align: center; -webkit-align-items: center; align-items: center;
    }
    .regm-btns button { border: none; background: none; padding: 0; cursor: pointer; }
    .regm-btns button:disabled { opacity: 0.6; cursor: default; }
    .regm-btns button img { height: 34px; width: auto; }

    .regm-continue-btn {
      padding: 8px 38px; border: 2px solid #237841; border-radius: 10px;
      background: #237841; color: #FFF; font-size: 13px; font-weight: 700;
      cursor: pointer; letter-spacing: 0.5px;
    }
    .regm-continue-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  `;

  /* ═════════════ STEP 1: Rol Seçimi ═════════════ */
  if (step === 1) {
    // ── MOBİL Step 1 ──
    if (isSmallScreen) {
      return (
        <div className="regm-page">
          <style>{mobileStyles}</style>

          <div className="regm-nav">
            <button onClick={() => navigate('/')} aria-label="Go to main menu">
              <img src={mainMenuBtn} alt="Main menu" />
            </button>
            <div className="regm-divider" />
            <img src={logoImg} alt="Mini-Talks" />
          </div>

          <div className="regm-logo">
            <img src={logoHead} alt="" className="regm-head" />
            <img src={logoText} alt="Mini-Talks" className="regm-text" />
          </div>

          <div className="regm-col narrow">
            <h2 className="regm-title">Create Your<br />Mini-Talks Account</h2>

            <div className="regm-roles">
              {roleChoices.map((role) => (
                <button key={role.id} type="button"
                  onClick={() => { setSelectedRole(role.id); setError(''); setSuccess(''); }}
                  className={`regm-role-btn ${selectedRole === role.id ? 'selected' : ''}`}>
                  <div className="role-title">{role.title}</div>
                  <div className="role-desc">{role.description}</div>
                </button>
              ))}
            </div>

            <button type="button" onClick={handleContinueFromRole}
              disabled={!selectedRole} className="regm-continue-btn">
              CONTINUE
            </button>
          </div>
        </div>
      );
    }

    // ── DESKTOP Step 1 (orijinal) ──
    return (
      <div className="reg-page">
        <style>{styles}</style>

        <div className="reg-nav">
          <button onClick={() => navigate('/')}
            onMouseEnter={() => setMainMenuHover(true)} onMouseLeave={() => setMainMenuHover(false)}
            aria-label="Go to main menu">
            <img src={mainMenuHover ? mainMenuBtnHover : mainMenuBtn} alt="Main menu" style={{ height: 40 }} />
          </button>
          <div style={{ width: 1, height: 40, background: '#E52828' }} />
          <img src={logoImg} alt="Mini-Talks" style={{ height: 48 }} />
        </div>

        <div className="reg-wrapper">
          <img src={BrickBorder} alt="" className="reg-brick" />
          <div className="reg-modal">
            <div className="reg-header">
              <img src={logoHead} alt="" className="lh" style={{ height: 55 }} />
              <img src={logoText} alt="Mini-Talks" className="lt" style={{ height: 44 }} />
            </div>
            <div className="reg-content">
              <h2 className="reg-title">Create Your Mini-Talks Account</h2>
              <p className="reg-subtitle">Choose your role to get started.</p>
              <p className="reg-subtitle-small">(Select the option that best describes you.)</p>

              <div className="reg-roles">
                {roleChoices.map((role) => (
                  <button key={role.id} type="button"
                    onClick={() => { setSelectedRole(role.id); setError(''); setSuccess(''); }}
                    className={`reg-role-btn ${selectedRole === role.id ? 'selected' : ''}`}>
                    <div className="role-title">{role.title}</div>
                    <div className="role-desc">{role.description}</div>
                  </button>
                ))}
              </div>

              <button type="button" onClick={handleContinueFromRole}
                onMouseEnter={() => setContinueHover(true)} onMouseLeave={() => setContinueHover(false)}
                disabled={!selectedRole} className="reg-continue-btn">
                CONTINUE
              </button>

              <p className="reg-disc">
                LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═════════════ STEP 2: Kayıt Formu ═════════════ */
  const currentRole = roleConfig[roleType];

  const renderFields = (cls) => {
    const c = cls || { row: 'reg-row', col: 'reg-col', label: 'reg-label', input: 'reg-input', ageWrap: 'reg-age-wrap', ageBtn: 'reg-age-btn' };
    if (roleType === 'child') {
      return (
        <>
          <div className={c.row}>
            <div className={c.col}>
              <label className={c.label}>Mini Name:</label>
              <input type="text" name="fullName" value={formData.fullName}
                onChange={handleChange} placeholder="Mini-Name" className={c.input} />
            </div>
            <div className={c.col}>
              <label className={c.label}>Choose your age group:</label>
              <div className={c.ageWrap}>
                {['4-6', '7-9', '10-12', '13-17'].map((age) => (
                  <button key={age} type="button" onClick={() => handleSelectAge(age)}
                    className={`${c.ageBtn} ${formData.ageGroup === age ? 'selected' : ''}`}>
                    {age}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={c.row}>
            <div className={c.col}>
              <label className={c.label}>Email:</label>
              <input type="email" name="email" value={formData.email}
                onChange={handleChange} placeholder="child@email.com" className={c.input} />
            </div>
            <div className={c.col}>
              <label className={c.label}>Parent's Email:</label>
              <input type="email" name="parentEmail" value={formData.parentEmail}
                onChange={handleChange} placeholder="parent@email.com" className={c.input} />
            </div>
          </div>
        </>
      );
    }

    if (roleType === 'parent') {
      return (
        <div className={c.row}>
          <div className={c.col}>
            <label className={c.label}>Full Name:</label>
            <input type="text" name="fullName" value={formData.fullName}
              onChange={handleChange} placeholder="Full Name" className={c.input} />
          </div>
          <div className={c.col}>
            <label className={c.label}>Email:</label>
            <input type="email" name="email" value={formData.email}
              onChange={handleChange} placeholder="parent@email.com" className={c.input} />
          </div>
        </div>
      );
    }

    if (roleType === 'builder') {
      return (
        <>
          <div className={c.row}>
            <div className={c.col}>
              <label className={c.label}>Full Name:</label>
              <input type="text" name="fullName" value={formData.fullName}
                onChange={handleChange} placeholder="Full Name" className={c.input} />
            </div>
            <div className={c.col}>
              <label className={c.label}>Username:</label>
              <input type="text" name="username" value={formData.username}
                onChange={handleChange} placeholder="minitalks123" className={c.input} />
            </div>
          </div>
          <div className={c.row}>
            <div className={c.col}>
              <label className={c.label}>Email:</label>
              <input type="email" name="email" value={formData.email}
                onChange={handleChange} placeholder="you@email.com" className={c.input} />
            </div>
            <div className={c.col}>
              <label className={c.label}>Choose your age group:</label>
              <div className={c.ageWrap}>
                {['18-24', '25-34', '35-44', '45+'].map((age) => (
                  <button key={age} type="button" onClick={() => handleSelectAge(age)}
                    className={`${c.ageBtn} ${formData.ageGroup === age ? 'selected' : ''}`}>
                    {age}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      );
    }

    // expert
    return (
      <>
        <div className={c.row}>
          <div className={c.col}>
            <label className={c.label}>Full Name:</label>
            <input type="text" name="fullName" value={formData.fullName}
              onChange={handleChange} placeholder="Full Name" className={c.input} />
          </div>
          <div className={c.col}>
            <label className={c.label}>Username:</label>
            <input type="text" name="username" value={formData.username}
              onChange={handleChange} placeholder="minitalks1" className={c.input} />
          </div>
        </div>
        <div className={c.row}>
          <div className={c.col}>
            <label className={c.label}>Email:</label>
            <input type="email" name="email" value={formData.email}
              onChange={handleChange} placeholder="expert@email.com" className={c.input} />
          </div>
          <div className={c.col}>
            <label className={c.label}>Organization:</label>
            <input type="text" name="organization" value={formData.organization}
              onChange={handleChange} placeholder="Your organization" className={c.input} />
          </div>
        </div>
      </>
    );
  };

  const renderPasswordFields = (cls) => {
    const c = cls || { row: 'reg-row', col: 'reg-col', label: 'reg-label', input: 'reg-input' };
    return (
      <div className={c.row}>
        <div className={c.col}>
          <label className={c.label}>Password:</label>
          <input type="password" name="password" value={formData.password}
            onChange={handleChange} placeholder="****************" className={c.input} />
        </div>
        <div className={c.col}>
          <label className={c.label}>Confirm Password:</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword}
            onChange={handleChange} placeholder="****************" className={c.input} />
        </div>
      </div>
    );
  };

  const renderCheckboxes = (cls) => {
    const c = cls || { checks: 'reg-checks', row: 'reg-check-row', text: 'reg-check-text', info: 'reg-check-info' };
    if (roleType === 'child') {
      return (
        <div className={c.checks}>
          <p className={c.info}>
            A parent must approve your account before you start playing. We'll send them a message to keep you safe online.
          </p>
          <label className={c.row}>
            <input type="checkbox" name="parentPermission" checked={formData.parentPermission} onChange={handleChange} />
            <span className={c.text}>I have my parent's permission to create this account.</span>
          </label>
        </div>
      );
    }
    if (roleType === 'parent') {
      return (
        <div className={c.checks}>
          <label className={c.row}>
            <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} />
            <span className={c.text}>I accept the Privacy Policy and Terms of Use.</span>
          </label>
          <label className={c.row}>
            <input type="checkbox" name="confirmAdult" checked={formData.confirmAdult} onChange={handleChange} />
            <span className={c.text}>I am over 18 years old or a legal guardian.</span>
          </label>
        </div>
      );
    }
    if (roleType === 'builder') {
      return (
        <div className={c.checks}>
          <label className={c.row}>
            <input type="checkbox" name="confirmAdult" checked={formData.confirmAdult} onChange={handleChange} />
            <span className={c.text}>I confirm that I am 18 years or older.</span>
          </label>
          <label className={c.row}>
            <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} />
            <span className={c.text}>I accept the Privacy Policy and Terms of Use.</span>
          </label>
        </div>
      );
    }
    // expert
    return (
      <div className={c.checks}>
        <label className={c.row}>
          <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} />
          <span className={c.text}>
            I accept the Privacy Policy and Terms of Use, and understand that child data is visible only with parent approval.
          </span>
        </label>
      </div>
    );
  };

  // ── MOBİL Step 2 ──
  if (isSmallScreen) {
    const mCls = { row: 'regm-row', col: 'regm-rcol', label: 'regm-label', input: 'regm-input', ageWrap: 'regm-age-wrap', ageBtn: 'regm-age-btn' };
    const mChecksCls = { checks: 'regm-checks', row: 'regm-check-row', text: 'regm-check-text', info: 'regm-check-info' };
    return (
      <>
        <div className="regm-page">
          <style>{mobileStyles}</style>

          <div className="regm-nav">
            <button onClick={() => navigate('/')} aria-label="Go to main menu">
              <img src={mainMenuBtn} alt="Main menu" />
            </button>
            <div className="regm-divider" />
            <img src={logoImg} alt="Mini-Talks" />
          </div>

          <div className="regm-logo">
            <img src={logoHead} alt="" className="regm-head" />
            <img src={logoText} alt="Mini-Talks" className="regm-text" />
          </div>

          <div className="regm-col wide">
            <h2 className="regm-title">{currentRole.title}</h2>
            {currentRole.description && (
              <p className="regm-subtitle">{currentRole.description}</p>
            )}

            {error && <div className="regm-error">{error}</div>}
            {success && <div className="regm-success">{success}</div>}

            <form onSubmit={handleSubmit} className="regm-form">
              {renderFields(mCls)}
              {renderPasswordFields(mCls)}
              {renderCheckboxes(mChecksCls)}

              <div className="regm-btns">
                <button type="button" onClick={handleCancel}>
                  <img src={cancelBtn} alt="Cancel" />
                </button>
                <button type="submit" disabled={loading}>
                  <img src={signUpBtn} alt={currentRole.submitText} />
                </button>
              </div>
            </form>
          </div>
        </div>

        <CheckEmailPopup show={showCheckEmailPopup} onClose={handlePopupClose} email={formData.email} />
        <ParentInvitationSentPopup show={showParentInvitationPopup} onClose={handlePopupClose}
          parentEmail={formData.parentEmail} childName={formData.fullName} />
        <ErrorPopup show={showErrorPopup} onClose={() => setShowErrorPopup(false)} message={errorMessage} />
        <AvatarEditorModal
          isOpen={avatarStep && Boolean(newAvatar)}
          onClose={finishAvatarStep}
          userId={newAvatar?.id}
          role={newAvatar?.role}
          onSaved={finishAvatarStep}
        />
      </>
    );
  }

  // ── DESKTOP Step 2 (orijinal) ──
  return (
    <>
      <div className="reg-page">
        <style>{styles}</style>

        <div className="reg-nav">
          <button onClick={() => navigate('/')}
            onMouseEnter={() => setMainMenuHover(true)} onMouseLeave={() => setMainMenuHover(false)}
            aria-label="Go to main menu">
            <img src={mainMenuHover ? mainMenuBtnHover : mainMenuBtn} alt="Main menu" style={{ height: 40 }} />
          </button>
          <div style={{ width: 1, height: 40, background: '#E52828' }} />
          <img src={logoImg} alt="Mini-Talks" style={{ height: 48 }} />
        </div>

        {/* Step 2 — geniş kart, kirmizi-top-acc.png */}
        <div className="reg-wrapper wide">
          <img src={BrickBorderAcc} alt="" className="reg-brick" />
          <div className="reg-modal">
            <div className="reg-header">
              <img src={logoHead} alt="" className="lh" style={{ height: 55 }} />
              <img src={logoText} alt="Mini-Talks" className="lt" style={{ height: 44 }} />
            </div>
            <div className="reg-content">
              <h2 className="reg-title">{currentRole.title}</h2>
              {currentRole.description && (
                <p className="reg-subtitle">{currentRole.description}</p>
              )}

              {error && <div className="reg-error">{error}</div>}
              {success && <div className="reg-success">{success}</div>}

              <form onSubmit={handleSubmit} className="reg-form">
                {renderFields()}
                {renderPasswordFields()}
                {renderCheckboxes()}

                <div className="reg-btns">
                  <button type="button" onClick={handleCancel}
                    onMouseEnter={() => setCancelHover(true)} onMouseLeave={() => setCancelHover(false)}>
                    <img src={cancelHover ? cancelBtnHover : cancelBtn} alt="Cancel" />
                  </button>
                  <button type="submit" disabled={loading}
                    onMouseEnter={() => setSignHover(true)} onMouseLeave={() => setSignHover(false)}>
                    <img src={signHover ? signUpBtnHover : signUpBtn} alt={currentRole.submitText} />
                  </button>
                </div>
              </form>

              <p className="reg-disc">
                LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CheckEmailPopup show={showCheckEmailPopup} onClose={handlePopupClose} email={formData.email} />
      <ParentInvitationSentPopup show={showParentInvitationPopup} onClose={handlePopupClose}
        parentEmail={formData.parentEmail} childName={formData.fullName} />
      <ErrorPopup show={showErrorPopup} onClose={() => setShowErrorPopup(false)} message={errorMessage} />
      <AvatarEditorModal
        isOpen={avatarStep && Boolean(newAvatar)}
        onClose={finishAvatarStep}
        userId={newAvatar?.id}
        role={newAvatar?.role}
        onSaved={finishAvatarStep}
      />
    </>
  );
};

export default RegisterPage;