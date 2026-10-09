// src/components/dashboard/MotivationMessagesManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Logo Assets
import logoHead from '../../assets/logo-head.png';
import logoText from '../../assets/logo-text.png';

// Motivation Assets
import motivationLeftBtn from '../../assets/motivation_left_btn.png';
import motivationRightBtn from '../../assets/motivation_right_btn.png';

// Brick Border
import BrickBorder from '../../assets/12-kirmizi.png';

const COLORS = {
  red: '#E52828',
  blue: '#0055BF',
  green: '#237841',
  white: '#FFFFFF',
  gray: '#D8D8D8',
  darkGray: '#666666',
};

// 30 Preset Messages
const DEFAULT_PRESETS = [
  'You are the bravest Mini ever!',
  'Your voice is getting stronger every day!',
  'You did something amazing today!',
  'Look at you go, brick by brick!',
  'You are becoming more confident!',
  'Your courage shines!',
  'You made great progress today!',
  'You try so hard, well done!',
  'Keep going, superstar!',
  'Small steps create big changes!',
  'You are growing every day!',
  'Your smile makes everything brighter!',
  'Today is your day to shine!',
  "Let's build your confidence together!",
  'You sound wonderful today!',
  'You reached your streak, nice work!',
  'You unlocked new confidence!',
  'You finished your mission, great job!',
  'You are leveling up, Mini!',
  'You can do this!',
  "You're doing amazing!",
  'Keep going, Mini!',
  "You're getting stronger!",
  'One brick at a time!',
  "Look how far you've come!",
  "You're braver every day",
  'Great job today!',
  "You're a real star!",
  "Brick by brick, you're growing!",
  "You're making awesome progress!",
];

const MotivationMessagesManager = ({ mini, isOpen, onClose, onSave }) => {
  // State
  const [selectedPresets, setSelectedPresets] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [customMessageEnabled, setCustomMessageEnabled] = useState(false);
  const [displayDuration, setDisplayDuration] = useState('today');
  const [currentPage, setCurrentPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  // Header'ın gerçek alt sınırını ölç (sabit px yerine) — header + alt çizgisi görünür kalsın
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

  useEffect(() => {
    if (displayDuration !== 'rotate' && selectedPresets.length > 1) {
      setSelectedPresets([selectedPresets[0]]);
    }
  }, [displayDuration]);

  const MESSAGES_PER_PAGE = 21;
  const totalPages = Math.ceil(DEFAULT_PRESETS.length / MESSAGES_PER_PAGE);

  const miniId = mini?.mini_id;
  const parentId = mini?.parent_id;

  useEffect(() => {
    if (isOpen && miniId) {
      fetchMessages();
    }
  }, [isOpen, miniId, parentId]);

  useEffect(() => {
    if (!isOpen) {
      setMessage('');
      setError('');
    }
  }, [isOpen]);

  const fetchMessages = async () => {
    if (!miniId) return;

    try {
      setLoading(true);
      setError('');
      
      const url = `https://mini-talks.org/minitalks-api/motivation/get-messages.php?mini_id=${miniId}&parent_id=${parentId || 0}`;
      const response = await axios.get(url);
      
      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        
        if (data.selected_preset_ids) {
          const presetIds = Array.isArray(data.selected_preset_ids) 
            ? data.selected_preset_ids 
            : (typeof data.selected_preset_ids === 'string' 
                ? JSON.parse(data.selected_preset_ids) 
                : []);
          setSelectedPresets(presetIds.map(id => Number(id)));
        } else {
          setSelectedPresets([]);
        }
        
        if (data.custom_message && data.custom_message.trim() !== '') {
          setCustomMessage(data.custom_message);
          setCustomMessageEnabled(true);
        } else {
          setCustomMessage('');
          setCustomMessageEnabled(false);
        }
        
        setDisplayDuration(data.display_duration || 'today');
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateActiveMessage = () => {
    if (customMessageEnabled && customMessage.trim()) {
      return customMessage.trim();
    }
    
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate() + (miniId || 0);
    
    if (selectedPresets.length === 0) {
      const randomIndex = seed % DEFAULT_PRESETS.length;
      return DEFAULT_PRESETS[randomIndex] || '';
    }
    
    if (displayDuration === 'rotate' && selectedPresets.length > 1) {
      const randomIndex = seed % selectedPresets.length;
      const presetIndex = selectedPresets[randomIndex];
      return DEFAULT_PRESETS[presetIndex] || '';
    }
    
    return DEFAULT_PRESETS[selectedPresets[0]] || '';
  };

  const handleSave = async () => {
    if (!miniId) {
      setError('Mini information is missing');
      return;
    }
    
    try {
      setSaving(true);
      setMessage('');
      setError('');
      
      const payload = {
        mini_id: miniId,
        parent_id: parentId || 0,
        selected_presets: selectedPresets,
        custom_message: customMessageEnabled ? customMessage.trim() : '',
        display_duration: displayDuration
      };
      
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/motivation/save-messages.php',
        payload
      );
      
      if (response.data?.success) {
        setMessage('Settings saved!');
        
        const activeMessage = calculateActiveMessage();
        
        if (onSave) {
          onSave({
            miniId,
            activeMessage,
            displayDuration
          });
        }
        
        setTimeout(() => {
          onClose();
          setMessage('');
        }, 1000);
      } else {
        setError(response.data?.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Failed to save messages:', err);
      setError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const togglePreset = (index) => {
    setSelectedPresets(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      
      if (displayDuration === 'rotate') {
        return [...prev, index];
      }
      
      return [index];
    });
  };

  const handleCustomMessageChange = (e) => {
    const value = e.target.value;
    if (value.length <= 60) {
      setCustomMessage(value);
    }
  };

  const toggleCustomMessage = () => {
    setCustomMessageEnabled(!customMessageEnabled);
  };

  if (!isOpen) return null;

  const currentPresets = DEFAULT_PRESETS.slice(
    currentPage * MESSAGES_PER_PAGE,
    (currentPage + 1) * MESSAGES_PER_PAGE
  );

  const DURATION_OPTIONS = [
    { value: 'today', label: 'Today only' },
    { value: 'three_days', label: 'For three days' },
    { value: 'week', label: 'For this week' },
    { value: 'rotate', label: 'Rotate daily (random)' }
  ];

  const styles = `
    .mmm-overlay {
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
    .mmm-modal-wrapper {
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
    .mmm-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .mmm-modal {
      width: 100%;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.red};
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
    .mmm-header {
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
    .mmm-content {
      background: ${COLORS.white};
      margin: 0 15px 15px;
      border-radius: 18px;
      padding: 25px 35px;
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
      overflow: hidden;
      min-height: 0;
      -webkit-min-height: 0;
    }
    .mmm-title-row {
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
    .mmm-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mmm-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .mmm-ok-btn {
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
    .mmm-ok-btn:hover {
      background: #0066CC;
    }
    .mmm-alert {
      padding: 10px 14px;
      margin-bottom: 10px;
      border-radius: 6px;
      font-size: 14px;
      font-family: 'Montserrat', sans-serif;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mmm-alert-error {
      background: #f8d7da;
      color: #721c24;
    }
    .mmm-alert-success {
      background: #d4edda;
      color: #155724;
    }
    .mmm-main {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 20px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
    }
    .mmm-left-col {
      width: 240px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
    }
    .mmm-custom-box {
      border: 2px solid ${COLORS.gray};
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 14px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mmm-checkbox-row {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .mmm-checkbox {
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
    .mmm-duration-option {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      cursor: pointer;
    }
    .mmm-radio {
      width: 20px;
      height: 20px;
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
    .mmm-save-btn {
      width: 100%;
      background: ${COLORS.blue};
      color: ${COLORS.white};
      border: none;
      border-radius: 8px;
      padding: 12px;
      font-size: 15px;
      font-weight: 700;
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
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
      margin-top: 14px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      font-family: 'Montserrat', sans-serif;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .mmm-save-btn:hover {
      background: #0066CC;
    }
    .mmm-save-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .mmm-right-col {
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
    .mmm-grid-row {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 10px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
    }
    .mmm-grid {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 8px 1fr 8px 1fr;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      overflow: hidden;
      -webkit-align-content: start;
      align-content: start;
    }
    .mmm-message {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 2px solid ${COLORS.gray};
      border-radius: 8px;
      cursor: pointer;
      min-height: 44px;
      -webkit-transition: border-color 0.2s, background-color 0.2s;
      transition: border-color 0.2s, background-color 0.2s;
    }
    .mmm-message:hover {
      border-color: ${COLORS.green};
    }
    .mmm-message-selected {
      border-color: ${COLORS.green};
      background: rgba(35,120,65,0.08);
    }
    .mmm-nav-btn {
      border: none;
      background: none;
      padding: 0;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-appearance: none;
      appearance: none;
    }
    .mmm-dots {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 6px;
      margin-top: 10px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mmm-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .mmm-loading {
      text-align: center;
      padding: 40px;
      color: ${COLORS.darkGray};
      font-size: 16px;
      font-family: 'Montserrat', sans-serif;
    }

    /* Kırmızı scrollbar (mobil mesaj listesi) */
    .mmm-scroll-red::-webkit-scrollbar {
      width: 10px;
    }
    .mmm-scroll-red::-webkit-scrollbar-track {
      background: #ECECEC;
      border-radius: 5px;
    }
    .mmm-scroll-red::-webkit-scrollbar-thumb {
      background: ${COLORS.red};
      border-radius: 5px;
      border: 2px solid #ECECEC;
    }

    /* ════ MOBİL ════ */
    .mmm-mobile-overlay {
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
    .mmm-m-content {
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
    .mmm-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    .mmm-m-main {
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
    .mmm-m-left {
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
    .mmm-m-right {
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
    .mmm-m-list {
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
    /* Display Duration popup */
    .mmm-dur-popup-overlay {
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
    .mmm-dur-popup {
      background: ${COLORS.red};
      border-radius: 18px;
      padding: 16px;
      width: 320px;
      max-width: 88vw;
    }
    .mmm-dur-popup-inner {
      background: ${COLORS.white};
      border-radius: 12px;
      padding: 14px 16px;
    }
    
    @media (max-width: 1000px) {
      .mmm-grid {
        -ms-grid-columns: 1fr 8px 1fr;
        grid-template-columns: repeat(2, 1fr);
      }
      .mmm-left-col {
        width: 220px;
      }
    }
  `;

  // ── MOBİL DISPLAY DURATION POPUP ──
  const renderDurationPopup = () => {
    if (!durationPopupOpen) return null;
    return (
      <div className="mmm-dur-popup-overlay" onClick={() => setDurationPopupOpen(false)}>
        <div className="mmm-dur-popup" onClick={(e) => e.stopPropagation()}>
          <div style={{ color: COLORS.white, fontWeight: 900, fontSize: '20px', textAlign: 'center', marginBottom: '12px', fontFamily: "'Montserrat', sans-serif" }}>
            Display Duration:
          </div>
          <div className="mmm-dur-popup-inner">
            {DURATION_OPTIONS.map(option => (
              <div
                key={option.value}
                onClick={() => setDisplayDuration(option.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 4px', cursor: 'pointer',
                  borderBottom: option.value !== 'rotate' ? `1px solid ${COLORS.gray}` : 'none'
                }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  border: displayDuration === option.value ? 'none' : `2px solid ${COLORS.gray}`,
                  backgroundColor: displayDuration === option.value ? COLORS.blue : COLORS.white
                }}>
                  {displayDuration === option.value && (
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
      <div className="mmm-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="mmm-m-content">
          {/* Başlık */}
          <div className="mmm-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Motivation Messages Manager
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
              Select a message from the list or write your own, then set how long it will appear on your Mini's screen.
            </p>
          </div>

          {error && <div className="mmm-alert mmm-alert-error">{error}</div>}
          {message && <div className="mmm-alert mmm-alert-success">{message}</div>}

          {loading ? (
            <div className="mmm-loading">Loading...</div>
          ) : (
            <div className="mmm-m-main">
              {/* SOL */}
              <div className="mmm-m-left">
                {/* Custom message */}
                <div
                  onClick={toggleCustomMessage}
                  className="mmm-checkbox-row"
                  style={{ flexShrink: 0 }}
                >
                  <div className="mmm-checkbox" style={{
                    border: customMessageEnabled ? 'none' : `2px solid ${COLORS.gray}`,
                    backgroundColor: customMessageEnabled ? COLORS.green : COLORS.white
                  }}>
                    {customMessageEnabled && (
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7L5 10L12 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '12px', fontFamily: "'Montserrat', sans-serif" }}>Type your message here.</span>
                </div>

                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <textarea
                    value={customMessage}
                    onChange={handleCustomMessageChange}
                    disabled={!customMessageEnabled}
                    placeholder="Write your custom message..."
                    style={{
                      width: '100%', height: '74px',
                      border: `2px solid ${customMessageEnabled ? COLORS.blue : COLORS.gray}`,
                      borderRadius: '8px', padding: '8px', fontSize: '12px', resize: 'none',
                      opacity: customMessageEnabled ? 1 : 0.5, boxSizing: 'border-box',
                      fontFamily: "'Montserrat', sans-serif",
                      backgroundColor: customMessageEnabled ? COLORS.white : '#f5f5f5',
                      WebkitAppearance: 'none', appearance: 'none'
                    }}
                  />
                  <div style={{
                    textAlign: 'right', fontSize: '10px',
                    color: customMessage.length >= 55 ? COLORS.red : COLORS.darkGray,
                    marginTop: '2px', fontFamily: "'Montserrat', sans-serif"
                  }}>
                    {customMessage.length} / 60
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

              {/* SAĞ — tek sütun mesaj listesi, kırmızı scrollbar */}
              <div className="mmm-m-right">
                <div className="mmm-m-list mmm-scroll-red">
                  {DEFAULT_PRESETS.map((msg, actualIndex) => {
                    const isSelected = selectedPresets.includes(actualIndex);
                    return (
                      <div
                        key={actualIndex}
                        onClick={() => togglePreset(actualIndex)}
                        className={`mmm-message ${isSelected ? 'mmm-message-selected' : ''}`}
                        style={{ flexShrink: 0 }}
                      >
                        <div className="mmm-radio" style={{
                          width: '22px', height: '22px',
                          border: isSelected ? 'none' : `2px solid ${COLORS.gray}`,
                          backgroundColor: isSelected ? COLORS.green : COLORS.white
                        }}>
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: '13px', lineHeight: 1.3, fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}>{msg}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Ok / Save — modalın en altında, tam ortalı */}
          {!loading && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexShrink: 0, paddingTop: '8px' }}>
              <button onClick={onClose} style={{
                flex: '0 1 120px', background: '#000', color: COLORS.white, border: 'none',
                borderRadius: '8px', padding: '11px', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
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
    <div className="mmm-overlay">
      <style>{styles}</style>
      
      <div className="mmm-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="mmm-brick-border" />
        
        <div className="mmm-modal">
          {/* Red Header with Logo */}
          <div className="mmm-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* White Content Area */}
          <div className="mmm-content">
            {/* Header Row */}
            <div className="mmm-title-row">
              <div className="mmm-btn-spacer" />
              <div className="mmm-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Motivation Messages Manager
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
                  Select a message from the list or write your own, then set how long it will appear on your Mini's screen.
                </p>
              </div>
              <button onClick={onClose} className="mmm-ok-btn">
                Ok
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mmm-alert mmm-alert-error">
                {error}
              </div>
            )}
            
            {message && (
              <div className="mmm-alert mmm-alert-success">
                {message}
              </div>
            )}

            {loading ? (
              <div className="mmm-loading">
                Loading...
              </div>
            ) : (
              <div className="mmm-main">
                
                {/* LEFT COLUMN */}
                <div className="mmm-left-col">
                  {/* Custom Message Box */}
                  <div className="mmm-custom-box">
                    <div 
                      onClick={toggleCustomMessage}
                      className="mmm-checkbox-row"
                      style={{ marginBottom: '10px' }}
                    >
                      <div 
                        className="mmm-checkbox"
                        style={{
                          border: customMessageEnabled ? 'none' : `2px solid ${COLORS.gray}`,
                          backgroundColor: customMessageEnabled ? COLORS.green : COLORS.white
                        }}
                      >
                        {customMessageEnabled && (
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7L5 10L12 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '14px', fontFamily: "'Montserrat', sans-serif" }}>Type your message here.</span>
                    </div>

                    <textarea
                      value={customMessage}
                      onChange={handleCustomMessageChange}
                      disabled={!customMessageEnabled}
                      placeholder="Write your custom message..."
                      style={{
                        width: '100%',
                        height: '60px',
                        border: `2px solid ${customMessageEnabled ? COLORS.blue : COLORS.gray}`,
                        borderRadius: '6px',
                        padding: '10px',
                        fontSize: '14px',
                        resize: 'none',
                        opacity: customMessageEnabled ? 1 : 0.5,
                        boxSizing: 'border-box',
                        fontFamily: "'Montserrat', sans-serif",
                        backgroundColor: customMessageEnabled ? COLORS.white : '#f5f5f5',
                        WebkitAppearance: 'none',
                        appearance: 'none'
                      }}
                    />
                    <div style={{ 
                      textAlign: 'right', 
                      fontSize: '12px', 
                      color: customMessage.length >= 55 ? COLORS.red : COLORS.darkGray, 
                      marginTop: '4px',
                      fontFamily: "'Montserrat', sans-serif"
                    }}>
                      {customMessage.length} / 60
                    </div>
                  </div>

                  {/* Display Duration */}
                  <div className="mmm-duration-section">
                    <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '8px', fontFamily: "'Montserrat', sans-serif" }}>Display Duration:</div>
                    {[
                      { value: 'today', label: 'Today only' },
                      { value: 'three_days', label: 'For three days' },
                      { value: 'week', label: 'For this week' },
                      { value: 'rotate', label: 'Rotate daily (random)' }
                    ].map(option => (
                      <div 
                        key={option.value}
                        onClick={() => setDisplayDuration(option.value)}
                        className="mmm-duration-option"
                      >
                        <div 
                          className="mmm-radio"
                          style={{
                            border: displayDuration === option.value ? 'none' : `2px solid ${COLORS.gray}`,
                            backgroundColor: displayDuration === option.value ? COLORS.blue : COLORS.white
                          }}
                        >
                          {displayDuration === option.value && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: '14px', fontFamily: "'Montserrat', sans-serif" }}>{option.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mmm-save-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>

                {/* RIGHT COLUMN - Message Grid */}
                <div className="mmm-right-col">
                  <div className="mmm-grid-row">
                    {/* Left Arrow */}
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="mmm-nav-btn"
                      style={{ cursor: currentPage === 0 ? 'default' : 'pointer', opacity: currentPage === 0 ? 0.3 : 1 }}
                    >
                      <img src={motivationLeftBtn} alt="←" style={{ width: '30px', height: '30px' }} />
                    </button>

                    {/* Message Grid - 3x10 */}
                    <div className="mmm-grid">
                      {currentPresets.map((msg, index) => {
                        const actualIndex = currentPage * MESSAGES_PER_PAGE + index;
                        const isSelected = selectedPresets.includes(actualIndex);
                        
                        return (
                          <div
                            key={actualIndex}
                            onClick={() => togglePreset(actualIndex)}
                            className={`mmm-message ${isSelected ? 'mmm-message-selected' : ''}`}
                          >
                            <div 
                              className="mmm-radio"
                              style={{
                                width: '22px',
                                height: '22px',
                                border: isSelected ? 'none' : `2px solid ${COLORS.gray}`,
                                backgroundColor: isSelected ? COLORS.green : COLORS.white
                              }}
                            >
                              {isSelected && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span style={{ fontSize: '14px', lineHeight: 1.3, fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>{msg}</span>
                          </div>
                        );
                      })}
                      {/* Boş placeholder'lar - grid boyutu sabit kalsın */}
                      {Array.from({ length: MESSAGES_PER_PAGE - currentPresets.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="mmm-message" style={{ visibility: 'hidden' }}>
                          <span style={{ fontSize: '14px' }}>&nbsp;</span>
                        </div>
                      ))}
                    </div>

                    {/* Right Arrow */}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="mmm-nav-btn"
                      style={{ cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer', opacity: currentPage >= totalPages - 1 ? 0.3 : 1 }}
                    >
                      <img src={motivationRightBtn} alt="→" style={{ width: '30px', height: '30px' }} />
                    </button>
                  </div>

                  {/* Pagination Dots */}
                  <div className="mmm-dots">
                    {Array.from({ length: Math.max(1, totalPages) }).map((_, i) => (
                      <div 
                        key={i} 
                        onClick={() => setCurrentPage(i)} 
                        className="mmm-dot"
                        style={{
                          backgroundColor: i === currentPage ? COLORS.darkGray : COLORS.gray
                        }} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotivationMessagesManager;