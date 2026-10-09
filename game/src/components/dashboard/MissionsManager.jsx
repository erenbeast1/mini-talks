// src/components/dashboard/MissionsManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Logo Assets
import logoHead from '../../assets/logo-head.png';
import logoText from '../../assets/logo-text.png';

// Navigation Assets
import motivationLeftBtn from '../../assets/motivation_left_btn.png';
import motivationRightBtn from '../../assets/motivation_right_btn.png';

// Brick Border
import BrickBorder from '../../assets/12-yesil.png';

const COLORS = {
  green: '#237841',
  darkGreen: '#1a5c32',
  blue: '#0055BF',
  red: '#E52828',
  white: '#FFFFFF',
  gray: '#D8D8D8',
  darkGray: '#666666',
};

// 30 Preset Missions
const DEFAULT_MISSIONS = [
  { id: 1, text: 'Choose one scene and record one level' },
  { id: 2, text: 'Record a level in your favorite scene' },
  { id: 3, text: 'Start a new scene today' },
  { id: 4, text: 'Finish the level you played last time' },
  { id: 5, text: 'Try a level you have never played' },
  { id: 6, text: 'Say the first word in your scene' },
  { id: 7, text: 'Record the Sound Level in any scene' },
  { id: 8, text: 'Record the Word Level in any scene' },
  { id: 9, text: 'Record the Sentence Level in any scene' },
  { id: 10, text: 'Record the Dialogue Level in any scene' },
  { id: 11, text: 'Say one word a little louder in your scene' },
  { id: 12, text: 'Try saying your line before the character speaks' },
  { id: 13, text: 'Finish a level without pausing' },
  { id: 14, text: 'Record the same level two times' },
  { id: 15, text: 'Record a level in a calm scene like Playground or Library' },
  { id: 16, text: 'Try a level in a scene you feel comfortable in' },
  { id: 17, text: 'Finish one full level using your brave voice' },
  { id: 18, text: 'Record a scene level you paused earlier' },
  { id: 19, text: 'Record a level you really like again' },
  { id: 20, text: 'Complete all four levels in one scene' },
  { id: 21, text: 'Try two different scenes in the same day' },
  { id: 22, text: 'Record three different levels this week' },
  { id: 23, text: 'Collect three bricks by recording three levels' },
  { id: 24, text: 'Continue your streak by playing any scene' },
  { id: 25, text: 'Return to a scene you have not played recently' },
  { id: 26, text: 'Complete the missing level in a scene' },
  { id: 27, text: 'Record a level in a brand new scene' },
  { id: 28, text: 'Try the first level (Sound) in five different scenes' },
  { id: 29, text: 'Finish two levels in one scene today' },
  { id: 30, text: 'Say one new word in any scene' },
];

const SHOWFOR_OPTIONS = [
  { value: 'today', label: 'Today only' },
  { value: 'three_days', label: 'For three days' },
  { value: 'week', label: 'For this week' },
  { value: 'rotate', label: 'Rotate daily (random)' },
];

const MissionsManager = ({ mini, parentId, isOpen, onClose }) => {
  const [missions, setMissions] = useState(
    DEFAULT_MISSIONS.map(m => ({ ...m, isSelected: false }))
  );
  const [customMessage, setCustomMessage] = useState('');
  const [customMessageEnabled, setCustomMessageEnabled] = useState(false);
  const [showFor, setShowFor] = useState('today');
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
  const isMobile = screenSize === 'mobile';
  const isTabletSmall = screenSize === 'tablet-small';
  const isSmallScreen = isMobile || isTabletSmall;

  // Header'ın gerçek alt sınırını ölç
  const [headerBottom, setHeaderBottom] = useState(52);
  useEffect(() => {
    const measureHeader = () => {
      const el = document.querySelector('.header-root');
      if (el) {
        const rect = el.getBoundingClientRect();
        setHeaderBottom(Math.max(0, Math.round(rect.bottom)));
      }
    };
    measureHeader();
    window.addEventListener('resize', measureHeader);
    window.addEventListener('orientationchange', () => setTimeout(measureHeader, 150));
    const t = setTimeout(measureHeader, 200);
    return () => {
      window.removeEventListener('resize', measureHeader);
      clearTimeout(t);
    };
  }, [isOpen, screenSize]);

  // Mobilde Display Duration popup'ı
  const [durationPopupOpen, setDurationPopupOpen] = useState(false);

  const MISSIONS_PER_PAGE = 21;

  useEffect(() => {
    if (isOpen && mini?.mini_id) {
      fetchMissions();
    }
  }, [isOpen, mini]);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/missions/get-missions.php?mini_id=${mini.mini_id}&parent_id=${parentId}`
      );
      if (response.data?.success && response.data.data) {
        const { selected_ids, custom_message, show_for } = response.data.data;
        setMissions(DEFAULT_MISSIONS.map(m => ({
          ...m,
          isSelected: selected_ids?.includes(m.id) || false
        })));
        setCustomMessage(custom_message || '');
        setCustomMessageEnabled(!!custom_message);
        setShowFor(show_for || 'today');
      }
    } catch (error) {
      console.error('Failed to fetch missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMission = (id) => {
    setMissions(missions.map(m => 
      m.id === id ? { ...m, isSelected: !m.isSelected } : m
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedIds = missions.filter(m => m.isSelected).map(m => m.id);
      await axios.post('https://mini-talks.org/minitalks-api/missions/save-missions.php', {
        mini_id: mini.mini_id,
        parent_id: parentId,
        selected_ids: selectedIds,
        custom_message: customMessageEnabled ? customMessage : '',
        show_for: showFor
      });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    await handleSave();
    onClose();
  };

  const totalPages = Math.ceil(missions.length / MISSIONS_PER_PAGE);
  const currentMissions = missions.slice(
    currentPage * MISSIONS_PER_PAGE,
    (currentPage + 1) * MISSIONS_PER_PAGE
  );

  // Show For Option Component
  const ShowForOption = ({ label, value }) => {
    const isSelected = showFor === value;
    return (
      <div
        onClick={() => setShowFor(value)}
        className="mm-showfor-option"
      >
        <div 
          className="mm-checkbox"
          style={{
            border: isSelected ? 'none' : `2px solid ${COLORS.green}`,
            backgroundColor: isSelected ? COLORS.green : 'transparent',
          }}
        >
          {isSelected && (
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M2 7L5 10L12 3" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          )}
        </div>
        <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>{label}</span>
      </div>
    );
  };

  if (!isOpen) return null;

  const styles = `
    .mm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      z-index: 1000;
      font-family: "Montserrat", sans-serif;
      padding: 10px;
    }
    .mm-modal-wrapper {
      position: relative;
      width: 96vw;
      max-width: 1400px;
      max-height: 98vh;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
      border-radius: 30px;
    }
    .mm-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .mm-modal {
      width: 100%;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.green};
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
    .mm-header {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 12px;
      padding: 15px 0 12px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mm-content {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.white};
      border-radius: 18px;
      margin: 0 15px 15px;
      padding: 25px 35px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
      -webkit-min-height: 0;
    }
    .mm-title-row {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      justify-content: space-between;
      -webkit-box-align: start;
      -webkit-align-items: flex-start;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 20px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mm-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mm-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .mm-main {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 14px;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
    }
    .mm-col-left {
      width: 240px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      overflow: hidden;
    }
    .mm-col-right {
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
      min-width: 0;
      -webkit-min-width: 0;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
    }
    .mm-custom-box {
      border: 2px solid ${COLORS.gray};
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 14px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mm-custom-header {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      cursor: pointer;
    }
    .mm-checkbox {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mm-checkbox-large {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
    }
    .mm-textarea {
      width: 100%;
      height: 70px;
      border: 1px solid ${COLORS.gray};
      border-radius: 6px;
      padding: 10px;
      font-size: 13px;
      resize: none;
      box-sizing: border-box;
      font-family: 'Montserrat', sans-serif;
      -webkit-appearance: none;
      appearance: none;
    }
    .mm-showfor-section {
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mm-showfor-option {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      padding: 6px 0;
      cursor: pointer;
    }
    .mm-showfor-option .mm-checkbox {
      margin-right: 10px;
    }
    .mm-ok-btn {
      background: ${COLORS.blue};
      color: ${COLORS.white};
      border: none;
      border-radius: 10px;
      padding: 12px 30px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-appearance: none;
      appearance: none;
      font-family: 'Montserrat', sans-serif;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .mm-ok-btn:hover {
      background: #0066CC;
    }
    .mm-ok-btn:disabled {
      opacity: 0.7;
    }
    .mm-save-btn {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 8px;
      background: ${COLORS.green};
      color: ${COLORS.white};
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 14px;
      -webkit-appearance: none;
      appearance: none;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      font-family: 'Montserrat', sans-serif;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .mm-save-btn:hover {
      background: #1a5c32;
    }
    .mm-save-btn:disabled {
      opacity: 0.7;
    }
    .mm-grid-container {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 8px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
    }
    .mm-nav-btn {
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-appearance: none;
      appearance: none;
    }
    .mm-nav-btn:disabled {
      cursor: default;
      opacity: 0.3;
    }
    .mm-mission-grid {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 8px 1fr 8px 1fr;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      -webkit-align-content: start;
      align-content: start;
      padding: 2px;
    }
    .mm-mission-item {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      padding: 10px 12px;
      border: 2px solid ${COLORS.gray};
      border-radius: 8px;
      background: ${COLORS.white};
      cursor: pointer;
      min-height: 44px;
    }
    .mm-mission-item:hover {
      border-color: ${COLORS.green};
    }
    .mm-mission-item .mm-checkbox {
      margin-right: 10px;
    }
    .mm-mission-text {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.3;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      font-family: 'Montserrat', sans-serif;
    }
    .mm-pagination {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 6px;
      margin-top: 8px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mm-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .mm-loading {
      -ms-grid-column: 1;
      -ms-grid-column-span: 3;
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: ${COLORS.darkGray};
      font-size: 16px;
      font-family: 'Montserrat', sans-serif;
    }

    /* Yeşil scrollbar (mobil mission listesi) */
    .mm-scroll-green::-webkit-scrollbar {
      width: 10px;
    }
    .mm-scroll-green::-webkit-scrollbar-track {
      background: #ECECEC;
      border-radius: 5px;
    }
    .mm-scroll-green::-webkit-scrollbar-thumb {
      background: ${COLORS.green};
      border-radius: 5px;
      border: 2px solid #ECECEC;
    }

    /* ════ MOBİL ════ */
    .mm-mobile-overlay {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${COLORS.white};
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      z-index: 1000;
      font-family: "Montserrat", sans-serif;
    }
    .mm-m-content {
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
      min-height: 0;
      -webkit-min-height: 0;
      padding: 8px 12px 10px;
      overflow: hidden;
    }
    .mm-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    .mm-m-main {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 10px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
    }
    .mm-m-left {
      width: 38%;
      max-width: 260px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
    }
    .mm-m-right {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .mm-m-list {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 8px;
      padding-right: 6px;
    }
    /* Display Duration popup (yeşil) */
    .mm-dur-popup-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      z-index: 1100;
    }
    .mm-dur-popup {
      background: ${COLORS.green};
      border-radius: 18px;
      padding: 16px;
      width: 320px;
      max-width: 88vw;
    }
    .mm-dur-popup-inner {
      background: ${COLORS.white};
      border-radius: 12px;
      padding: 14px 16px;
    }
    
    @media (max-width: 1000px) {
      .mm-col-left { width: 220px; }
      .mm-mission-grid {
        -ms-grid-columns: 1fr 8px 1fr;
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `;

  // ── MOBİL DISPLAY DURATION POPUP (yeşil) ──
  const renderDurationPopup = () => {
    if (!durationPopupOpen) return null;
    return (
      <div className="mm-dur-popup-overlay" onClick={() => setDurationPopupOpen(false)}>
        <div className="mm-dur-popup" onClick={(e) => e.stopPropagation()}>
          <div style={{ color: COLORS.white, fontWeight: 900, fontSize: '20px', textAlign: 'center', marginBottom: '12px', fontFamily: "'Montserrat', sans-serif" }}>
            Display Duration:
          </div>
          <div className="mm-dur-popup-inner">
            {SHOWFOR_OPTIONS.map(option => (
              <div
                key={option.value}
                onClick={() => setShowFor(option.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 4px', cursor: 'pointer',
                  borderBottom: option.value !== 'rotate' ? `1px solid ${COLORS.gray}` : 'none'
                }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  border: showFor === option.value ? 'none' : `2px solid ${COLORS.gray}`,
                  backgroundColor: showFor === option.value ? COLORS.blue : COLORS.white
                }}>
                  {showFor === option.value && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '15px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>{option.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'center' }}>
              <button
                onClick={() => setDurationPopupOpen(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: `2px solid ${COLORS.red}`, background: COLORS.white,
                  color: COLORS.red, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setDurationPopupOpen(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: 'none', background: COLORS.blue,
                  color: COLORS.white, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    return (
      <div className="mm-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="mm-m-content">
          {/* Başlık */}
          <div className="mm-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Mini's Missions Manager
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
              Choose a mission from the list or create your own, then set its active duration.
            </p>
          </div>

          {loading ? (
            <div className="mm-loading">Loading...</div>
          ) : (
            <div className="mm-m-main">
              {/* SOL */}
              <div className="mm-m-left">
                {/* Custom message */}
                <div
                  onClick={() => setCustomMessageEnabled(!customMessageEnabled)}
                  className="mm-custom-header"
                  style={{ marginBottom: 0, flexShrink: 0 }}
                >
                  <div className="mm-checkbox-large" style={{
                    border: customMessageEnabled ? 'none' : `2px solid ${COLORS.gray}`,
                    backgroundColor: customMessageEnabled ? COLORS.green : COLORS.white
                  }}>
                    {customMessageEnabled && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7L5 10L12 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '12px', fontFamily: "'Montserrat', sans-serif" }}>Type your message here.</span>
                </div>

                <div style={{ flexShrink: 0 }}>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value.slice(0, 60))}
                    disabled={!customMessageEnabled}
                    placeholder="Write your custom mission..."
                    className="mm-textarea"
                    style={{ opacity: customMessageEnabled ? 1 : 0.5, height: '74px', fontSize: '12px' }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '10px', color: COLORS.darkGray, marginTop: '2px', fontFamily: "'Montserrat', sans-serif" }}>
                    {customMessage.length} of 60
                  </div>
                </div>

                {/* Display Duration — kırmızı buton, popup açar */}
                <button
                  onClick={() => setDurationPopupOpen(true)}
                  style={{
                    width: '100%', background: COLORS.red, color: COLORS.white,
                    border: 'none', borderRadius: '8px', padding: '12px',
                    fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none', flexShrink: 0
                  }}
                >
                  Display Duration
                </button>
              </div>

              {/* SAĞ — tek sütun mission listesi, yeşil scrollbar, tıklanabilir checkbox */}
              <div className="mm-m-right">
                <div className="mm-m-list mm-scroll-green">
                  {missions.map((mission) => (
                    <div
                      key={mission.id}
                      onClick={() => toggleMission(mission.id)}
                      className="mm-mission-item"
                      style={{ flexShrink: 0, borderColor: mission.isSelected ? COLORS.green : COLORS.gray }}
                    >
                      <div className="mm-checkbox" style={{
                        border: mission.isSelected ? 'none' : `2px solid ${COLORS.green}`,
                        backgroundColor: mission.isSelected ? COLORS.green : 'transparent'
                      }}>
                        {mission.isSelected && (
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <path d="M2 7L5 10L12 3" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        )}
                      </div>
                      <span className="mm-mission-text" style={{ fontSize: '13px' }}>{mission.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ok / Save — modalın en altında, tam ortalı */}
          {!loading && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexShrink: 0, paddingTop: '8px' }}>
              <button onClick={handleClose} disabled={saving} style={{
                flex: '0 1 120px', background: '#000', color: COLORS.white, border: 'none',
                borderRadius: '8px', padding: '11px', fontSize: '15px', fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
              }}>
                Ok
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: '0 1 120px', background: COLORS.blue, color: COLORS.white, border: 'none',
                borderRadius: '8px', padding: '11px', fontSize: '15px', fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
              }}>
                {saving ? '...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {renderDurationPopup()}
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="mm-overlay">
      <style>{styles}</style>
      
      <div className="mm-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="mm-brick-border" />
        
        <div className="mm-modal">
          {/* Header */}
          <div className="mm-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* Content */}
          <div className="mm-content">
            {/* Title Row */}
            <div className="mm-title-row">
              <div className="mm-btn-spacer" />
              <div className="mm-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Mini's Missions Manager
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
                  Choose a mission from the list or create your own, then set its active duration.
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={saving}
                className="mm-ok-btn"
              >
                Ok
              </button>
            </div>

            {/* Main Content */}
            <div className="mm-main">
              {/* LEFT COLUMN - Custom Message & Show For */}
              <div className="mm-col-left">
                {/* Custom Message Box */}
                <div className="mm-custom-box">
                  <div 
                    onClick={() => setCustomMessageEnabled(!customMessageEnabled)}
                    className="mm-custom-header"
                  >
                    <div 
                      className="mm-checkbox-large"
                      style={{
                        border: customMessageEnabled ? 'none' : `2px solid ${COLORS.gray}`,
                        backgroundColor: customMessageEnabled ? COLORS.green : COLORS.white,
                      }}
                    >
                      {customMessageEnabled && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7L5 10L12 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '14px', fontFamily: "'Montserrat', sans-serif" }}>Type your message here.</span>
                  </div>

                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value.slice(0, 60))}
                    disabled={!customMessageEnabled}
                    placeholder="Write your custom mission..."
                    className="mm-textarea"
                    style={{ opacity: customMessageEnabled ? 1 : 0.5 }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '12px', color: COLORS.darkGray, marginTop: '4px', fontFamily: "'Montserrat', sans-serif" }}>
                    {customMessage.length} of 60
                  </div>
                </div>

                {/* Display Duration */}
                <div className="mm-showfor-section">
                  <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '8px', fontFamily: "'Montserrat', sans-serif" }}>Show for:</div>
                  
                  <ShowForOption label="Today only" value="today" />
                  <ShowForOption label="For three days" value="three_days" />
                  <ShowForOption label="For this week" value="week" />
                  <ShowForOption label="Rotate daily (random)" value="rotate" />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="mm-save-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8L6 12L14 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Save
                </button>
              </div>

              {/* RIGHT COLUMN - Mission Grid */}
              <div className="mm-col-right">
                <div className="mm-grid-container">
                  {/* Left Arrow */}
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="mm-nav-btn"
                  >
                    <img src={motivationLeftBtn} alt="←" style={{ width: '30px', height: '30px' }} />
                  </button>

                  {/* Mission Grid */}
                  <div className="mm-mission-grid">
                    {loading ? (
                      <div className="mm-loading">Loading...</div>
                    ) : (
                      currentMissions.map((mission) => (
                        <div
                          key={mission.id}
                          onClick={() => toggleMission(mission.id)}
                          className="mm-mission-item"
                          style={{ borderColor: mission.isSelected ? COLORS.green : COLORS.gray }}
                        >
                          {/* Checkbox */}
                          <div 
                            className="mm-checkbox"
                            style={{
                              border: mission.isSelected ? 'none' : `2px solid ${COLORS.green}`,
                              backgroundColor: mission.isSelected ? COLORS.green : 'transparent',
                            }}
                          >
                            {mission.isSelected && (
                              <svg width="14" height="14" viewBox="0 0 14 14">
                                <path d="M2 7L5 10L12 3" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                              </svg>
                            )}
                          </div>
                          <span className="mm-mission-text">{mission.text}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right Arrow */}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="mm-nav-btn"
                  >
                    <img src={motivationRightBtn} alt="→" style={{ width: '30px', height: '30px' }} />
                  </button>
                </div>

                {/* Pagination Dots */}
                <div className="mm-pagination">
                  {Array.from({ length: Math.max(1, totalPages) }).map((_, i) => (
                    <div 
                      key={i} 
                      onClick={() => setCurrentPage(i)} 
                      className="mm-dot"
                      style={{ backgroundColor: i === currentPage ? COLORS.darkGray : COLORS.gray }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionsManager;