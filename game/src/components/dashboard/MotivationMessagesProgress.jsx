// src/components/dashboard/MotivationMessagesProgress.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Logo Assets
import logoHead from '../../assets/logo-head.png';
import logoText from '../../assets/logo-text.png';

// Motivation Assets
import motivationLeftBtn from '../../assets/motivation_left_btn.png';
import motivationRightBtn from '../../assets/motivation_right_btn.png';

// Filter Button Assets
import allFilterBtn from '../../assets/All_filter_btn.png';
import allFilterBtnHover from '../../assets/All_filter_btn_hover.png';
import selectedFilterBtn from '../../assets/Selected_filter_btn.png';
import selectedFilterBtnHover from '../../assets/Selected_filter_btn_hover.png';
import notSelectedFilterBtn from '../../assets/Not_selected_at_all_filter_btn.png';
import notSelectedFilterBtnHover from '../../assets/Not_selected_at_all_filter_btn_hover.png';
import usedWeekFilterBtn from '../../assets/Used_this_week_filter_btn.png';
import usedWeekFilterBtnHover from '../../assets/Used_this_week_filter_btn_hover.png';
import usedMonthFilterBtn from '../../assets/Used_this_month_filter_btn.png';
import usedMonthFilterBtnHover from '../../assets/Used_this_month_filter_btn_hover.png';

// Brick Border
import BrickBorder from '../../assets/12-kirmizi.png';

const COLORS = {
  red: '#E52828',
  blue: '#0055BF',
  green: '#237841',
  white: '#FFFFFF',
  gray: '#D8D8D8',
  darkGray: '#666666',
  lightRed: '#FDEAEA',
  lightGreen: '#E8F5E9',
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

const FILTERS = [
  { value: 'all', btn: allFilterBtn, btnHover: allFilterBtnHover, label: 'All' },
  { value: 'selected', btn: selectedFilterBtn, btnHover: selectedFilterBtnHover, label: 'Selected' },
  { value: 'not_selected', btn: notSelectedFilterBtn, btnHover: notSelectedFilterBtnHover, label: 'Not Selected' },
  { value: 'used_week', btn: usedWeekFilterBtn, btnHover: usedWeekFilterBtnHover, label: 'Used This Week' },
  { value: 'used_month', btn: usedMonthFilterBtn, btnHover: usedMonthFilterBtnHover, label: 'Used This Month' },
];

const BUILDER_FILTERS = [
  { value: 'all', btn: allFilterBtn, btnHover: allFilterBtnHover, label: 'All' },
  { value: 'used_week', btn: usedWeekFilterBtn, btnHover: usedWeekFilterBtnHover, label: 'Used This Week' },
  { value: 'used_month', btn: usedMonthFilterBtn, btnHover: usedMonthFilterBtnHover, label: 'Used This Month' },
];

const MotivationMessagesProgress = ({ mini, isOpen, onClose, entityType = 'mini' }) => {
  const [messages, setMessages] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterHover, setFilterHover] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);

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

  // Header'ın gerçek alt sınırını ölç (sabit px yerine)
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

  const MESSAGES_PER_PAGE = 21;
  
  const activeFilters = entityType === 'builder' ? BUILDER_FILTERS : FILTERS;

  const entityId = entityType === 'builder' ? mini?.builder_id : mini?.mini_id;
  const parentId = mini?.parent_id;

  useEffect(() => {
    if (isOpen && entityId) {
      fetchHistory();
    }
  }, [isOpen, entityId, activeFilter]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(0);
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    if (!entityId) {
      return;
    }

    try {
      setLoading(true);
      
      const url = entityType === 'builder'
        ? `https://mini-talks.org/minitalks-api/builder/get-motivation-history.php?builder_id=${entityId}&filter=${activeFilter}`
        : `https://mini-talks.org/minitalks-api/motivation/get-history.php?mini_id=${entityId}&parent_id=${parentId || 0}&filter=${activeFilter}`;
      console.log('Fetching history:', url);
      
      const response = await axios.get(url);
      console.log('History response:', response.data);
      
      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        
        if (data.all_presets && Array.isArray(data.all_presets)) {
          setMessages(data.all_presets.map((p, i) => ({
            id: p.preset_id ?? i,
            text: p.message_text || DEFAULT_PRESETS[i] || `Message ${i + 1}`,
            dateLabel: p.date_label || null,
            isSelected: p.is_selected || false,
            usedCount: p.used_count || 0
          })));
        } else {
          setMessages(DEFAULT_PRESETS.map((text, i) => ({
            id: i,
            text,
            dateLabel: null,
            isSelected: false,
            usedCount: 0
          })));
        }
      } else {
        setMessages(DEFAULT_PRESETS.map((text, i) => ({
          id: i,
          text,
          dateLabel: null,
          isSelected: false,
          usedCount: 0
        })));
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setMessages(DEFAULT_PRESETS.map((text, i) => ({
        id: i,
        text,
        dateLabel: null,
        isSelected: false,
        usedCount: 0
      })));
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    switch (activeFilter) {
      case 'selected': 
        return msg.isSelected;
      case 'not_selected': 
        return !msg.isSelected;
      case 'used_week':
      case 'used_month': 
        return msg.dateLabel !== null;
      default: 
        return true;
    }
  });

  const totalPages = Math.ceil(filteredMessages.length / MESSAGES_PER_PAGE);
  const currentMessages = filteredMessages.slice(
    currentPage * MESSAGES_PER_PAGE,
    (currentPage + 1) * MESSAGES_PER_PAGE
  );

  if (!isOpen) return null;

  const styles = `
    .mmp-overlay {
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
    .mmp-modal-wrapper {
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
    .mmp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .mmp-modal {
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
    .mmp-header {
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
    .mmp-content {
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
    .mmp-title-row {
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
    .mmp-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mmp-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .mmp-ok-btn {
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
    .mmp-ok-btn:hover {
      background: #0066CC;
    }
    .mmp-main {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 14px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
    }
    .mmp-filters {
      width: 240px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mmp-filter-list {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 8px;
    }
    .mmp-grid-wrap {
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
    .mmp-grid-row {
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
    }
    .mmp-grid {
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
    .mmp-message {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      justify-content: space-between;
      padding: 10px 12px;
      border: 2px solid ${COLORS.gray};
      border-radius: 8px;
      background: ${COLORS.white};
      min-height: 44px;
    }
    .mmp-nav-btn {
      border: none;
      background: none;
      padding: 0;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-appearance: none;
      appearance: none;
    }
    .mmp-dots {
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
    .mmp-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .mmp-loading {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: ${COLORS.darkGray};
      font-size: 16px;
      font-family: 'Montserrat', sans-serif;
    }

    /* Kırmızı scrollbar (mobil mesaj listesi) */
    .mmp-scroll-red::-webkit-scrollbar {
      width: 10px;
    }
    .mmp-scroll-red::-webkit-scrollbar-track {
      background: #ECECEC;
      border-radius: 5px;
    }
    .mmp-scroll-red::-webkit-scrollbar-thumb {
      background: ${COLORS.red};
      border-radius: 5px;
      border: 2px solid #ECECEC;
    }

    /* ════ MOBİL ════ */
    .mmp-mobile-overlay {
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
    .mmp-m-content {
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
    .mmp-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    .mmp-m-main {
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
    .mmp-m-left {
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
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .mmp-m-right {
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
    .mmp-m-list {
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
    
    @media (max-width: 1000px) {
      .mmp-grid {
        -ms-grid-columns: 1fr 8px 1fr;
        grid-template-columns: repeat(2, 1fr);
      }
      .mmp-filters {
        width: 220px;
      }
    }
  `;

  // Mesaj kartı (text + date) — PC ile aynı, checkbox/yeşil YOK
  const renderMobileMessage = (msg) => {
    return (
      <div
        key={msg.id}
        className="mmp-message"
        style={{ flexShrink: 0 }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3, fontFamily: "'Montserrat', sans-serif", flex: '1 1 0%', minWidth: 0, marginRight: msg.dateLabel ? '8px' : 0 }}>{msg.text}</span>
        {msg.dateLabel && (
          <span style={{
            backgroundColor: msg.dateLabel === 'Today' ? COLORS.red : COLORS.lightRed,
            color: msg.dateLabel === 'Today' ? COLORS.white : COLORS.red,
            padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
            fontFamily: "'Montserrat', sans-serif", whiteSpace: 'nowrap', flexShrink: 0
          }}>
            {msg.dateLabel}
          </span>
        )}
      </div>
    );
  };

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    return (
      <div className="mmp-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="mmp-m-content">
          {/* Başlık */}
          <div className="mmp-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Motivation Messages Progress
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
              See all motivation messages received by your Mini, and filter them by date or type.
            </p>
          </div>

          <div className="mmp-m-main">
            {/* SOL — Filtre butonları */}
            <div className="mmp-m-left">
              <div style={{ fontWeight: 800, fontSize: '12px', fontFamily: "'Montserrat', sans-serif", flexShrink: 0 }}>Filter:</div>
              {activeFilters.map(filter => (
                <button
                  key={filter.value}
                  onClick={() => { setActiveFilter(filter.value); setCurrentPage(0); }}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', display: 'block', width: '100%', flexShrink: 0 }}
                >
                  <img
                    src={activeFilter === filter.value ? filter.btnHover : filter.btn}
                    alt={filter.label}
                    style={{ height: '38px', width: '100%', maxWidth: '220px' }}
                  />
                </button>
              ))}
            </div>

            {/* SAĞ — tek sütun mesaj listesi, kırmızı scrollbar */}
            <div className="mmp-m-right">
              <div className="mmp-m-list mmp-scroll-red">
                {loading ? (
                  <div className="mmp-loading">Loading...</div>
                ) : filteredMessages.length === 0 ? (
                  <div className="mmp-loading">No messages found for this filter.</div>
                ) : (
                  filteredMessages.map(msg => renderMobileMessage(msg))
                )}
              </div>
            </div>
          </div>

          {/* Ok — modalın en altında, tam ortalı */}
          <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, paddingTop: '8px' }}>
            <button onClick={onClose} style={{
              flex: '0 1 140px', background: COLORS.blue, color: COLORS.white, border: 'none',
              borderRadius: '8px', padding: '11px', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
            }}>
              Ok
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="mmp-overlay">
      <style>{styles}</style>
      
      <div className="mmp-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="mmp-brick-border" />
        
        <div className="mmp-modal">
          {/* Red Header with Logo */}
          <div className="mmp-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* White Content Area */}
          <div className="mmp-content">
            {/* Header Row */}
            <div className="mmp-title-row">
              <div className="mmp-btn-spacer" />
              <div className="mmp-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Motivation Messages Progress
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
                  See all motivation messages received by your Mini, and filter them by date or type.
                </p>
              </div>
              <button onClick={onClose} className="mmp-ok-btn">
                Ok
              </button>
            </div>

            {/* Main Content */}
            <div className="mmp-main">
              
              {/* LEFT COLUMN - Filters */}
              <div className="mmp-filters">
                <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '10px', fontFamily: "'Montserrat', sans-serif" }}>View Filter:</div>
                
                <div className="mmp-filter-list">
                  {activeFilters.map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => { setActiveFilter(filter.value); setCurrentPage(0); }}
                      onMouseEnter={() => setFilterHover(filter.value)}
                      onMouseLeave={() => setFilterHover(null)}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', display: 'block', width: '100%' }}
                    >
                      <img 
                        src={(activeFilter === filter.value || filterHover === filter.value) ? filter.btnHover : filter.btn}
                        alt={filter.label}
                        style={{ height: '42px', width: '100%', maxWidth: '220px' }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT COLUMN - Message Grid */}
              <div className="mmp-grid-wrap">
                <div className="mmp-grid-row">
                  {/* Left Arrow */}
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="mmp-nav-btn"
                    style={{ cursor: currentPage === 0 ? 'default' : 'pointer', opacity: currentPage === 0 ? 0.3 : 1 }}
                  >
                    <img src={motivationLeftBtn} alt="←" style={{ width: '30px', height: '30px' }} />
                  </button>

                  {/* Message Grid - 3 columns */}
                  <div className="mmp-grid">
                    {loading ? (
                      <div className="mmp-loading">
                        Loading...
                      </div>
                    ) : currentMessages.length === 0 ? (
                      <div className="mmp-loading">
                        No messages found for this filter.
                      </div>
                    ) : (
                      <>
                        {currentMessages.map((msg) => (
                          <div key={msg.id} className="mmp-message">
                            <span style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.3, fontFamily: "'Montserrat', sans-serif", WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: 1 }}>{msg.text}</span>
                            
                            {msg.dateLabel && (
                              <span style={{
                                backgroundColor: msg.dateLabel === 'Today' ? COLORS.red : COLORS.lightRed,
                                color: msg.dateLabel === 'Today' ? COLORS.white : COLORS.red,
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                fontFamily: "'Montserrat', sans-serif",
                                marginLeft: '10px',
                                whiteSpace: 'nowrap',
                                WebkitFlexShrink: 0,
                                flexShrink: 0
                              }}>
                                {msg.dateLabel}
                              </span>
                            )}
                          </div>
                        ))}
                        {/* Boş placeholder'lar - grid boyutu sabit kalsın */}
                        {Array.from({ length: MESSAGES_PER_PAGE - currentMessages.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="mmp-message" style={{ visibility: 'hidden' }}>
                            <span style={{ fontSize: '14px' }}>&nbsp;</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Right Arrow */}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1 || totalPages === 0}
                    className="mmp-nav-btn"
                    style={{ cursor: (currentPage >= totalPages - 1 || totalPages === 0) ? 'default' : 'pointer', opacity: (currentPage >= totalPages - 1 || totalPages === 0) ? 0.3 : 1 }}
                  >
                    <img src={motivationRightBtn} alt="→" style={{ width: '30px', height: '30px' }} />
                  </button>
                </div>

                {/* Pagination Dots */}
                <div className="mmp-dots">
                  {Array.from({ length: Math.max(1, totalPages) }).map((_, i) => (
                    <div 
                      key={i} 
                      onClick={() => setCurrentPage(i)} 
                      className="mmp-dot"
                      style={{
                        backgroundColor: i === currentPage ? COLORS.darkGray : COLORS.gray
                      }} 
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

export default MotivationMessagesProgress;