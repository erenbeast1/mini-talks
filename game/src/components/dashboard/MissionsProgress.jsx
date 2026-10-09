// src/components/dashboard/MissionsProgress.jsx
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
  white: '#FFFFFF',
  gray: '#D8D8D8',
  darkGray: '#666666',
  lightGreen: '#E8F5E9',
};

// 30 Preset Missions with demo completion data
const DEFAULT_MISSIONS = [
  { id: 1, text: 'Choose one scene and record one level', dateLabel: 'Today', isCompleted: true },
  { id: 2, text: 'Record a level in your favorite scene', dateLabel: 'Nov 23', isCompleted: true },
  { id: 3, text: 'Start a new scene today', dateLabel: null, isCompleted: false },
  { id: 4, text: 'Finish the level you played last time', dateLabel: null, isCompleted: false },
  { id: 5, text: 'Try a level you have never played', dateLabel: null, isCompleted: true },
  { id: 6, text: 'Say the first word in your scene', dateLabel: null, isCompleted: true },
  { id: 7, text: 'Record the Sound Level in any scene', dateLabel: null, isCompleted: true },
  { id: 8, text: 'Record the Word Level in any scene', dateLabel: null, isCompleted: false },
  { id: 9, text: 'Record the Sentence Level in any scene', dateLabel: null, isCompleted: true },
  { id: 10, text: 'Record the Dialogue Level in any scene', dateLabel: null, isCompleted: true },
  { id: 11, text: 'Say one word a little louder in your scene', dateLabel: null, isCompleted: true },
  { id: 12, text: 'Try saying your line before the character speaks', dateLabel: null, isCompleted: true },
  { id: 13, text: 'Finish a level without pausing', dateLabel: null, isCompleted: true },
  { id: 14, text: 'Record the same level two times', dateLabel: null, isCompleted: false },
  { id: 15, text: 'Record a level in a calm scene like Playground or Library', dateLabel: null, isCompleted: true },
  { id: 16, text: 'Try a level in a scene you feel comfortable in', dateLabel: null, isCompleted: true },
  { id: 17, text: 'Finish one full level using your brave voice', dateLabel: null, isCompleted: true },
  { id: 18, text: 'Record a scene level you paused earlier', dateLabel: null, isCompleted: false },
  { id: 19, text: 'Record a level you really like again', dateLabel: null, isCompleted: true },
  { id: 20, text: 'Complete all four levels in one scene', dateLabel: null, isCompleted: true },
  { id: 21, text: 'Try two different scenes in the same day', dateLabel: null, isCompleted: true },
  { id: 22, text: 'Record three different levels this week', dateLabel: null, isCompleted: true },
  { id: 23, text: 'Collect three bricks by recording three levels', dateLabel: null, isCompleted: false },
  { id: 24, text: 'Continue your streak by playing any scene', dateLabel: null, isCompleted: true },
  { id: 25, text: 'Return to a scene you have not played recently', dateLabel: null, isCompleted: false },
  { id: 26, text: 'Complete the missing level in a scene', dateLabel: null, isCompleted: true },
  { id: 27, text: 'Record a level in a brand new scene', dateLabel: null, isCompleted: true },
  { id: 28, text: 'Try the first level (Sound) in five different scenes', dateLabel: null, isCompleted: true },
  { id: 29, text: 'Finish two levels in one scene today', dateLabel: null, isCompleted: false },
  { id: 30, text: 'Say one new word in any scene', dateLabel: null, isCompleted: false },
];

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'incompleted', label: 'Incompleted' },
  { value: 'completed_week', label: 'Completed this week' },
  { value: 'completed_month', label: 'Completed this month' },
];

const MissionsProgress = ({ mini, isOpen, onClose, entityType = 'mini' }) => {
  const [missions, setMissions] = useState(DEFAULT_MISSIONS);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalCompleted: 24,
    thisWeekCompleted: 5,
    thisWeekTotal: 7
  });

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

  // entityType'a göre ID belirle
  const entityId = entityType === 'builder' ? mini?.builder_id : mini?.mini_id;

  const MISSIONS_PER_PAGE = 21;

  useEffect(() => {
    if (isOpen && entityId) {
      fetchProgress();
    }
  }, [isOpen, entityId, activeFilter]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(0);
    }
  }, [isOpen]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const apiUrl = entityType === 'builder'
        ? `https://mini-talks.org/minitalks-api/builder/get-missions-progress.php?builder_id=${entityId}&filter=${activeFilter}`
        : `https://mini-talks.org/minitalks-api/missions/get-progress.php?mini_id=${entityId}&filter=${activeFilter}`;
      const response = await axios.get(apiUrl);
      if (response.data?.success && response.data.data) {
        const { missions: fetchedMissions, summary: fetchedSummary } = response.data.data;
        if (fetchedMissions) {
          setMissions(fetchedMissions.map((m, i) => ({
            id: m.id || i + 1,
            text: m.text,
            dateLabel: m.date_label,
            isCompleted: m.is_completed
          })));
        }
        if (fetchedSummary) {
          setSummary(fetchedSummary);
        }
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  // API zaten filtreleme yapıyor, burada sadece göster
  const filteredMissions = missions;

  const totalPages = Math.ceil(filteredMissions.length / MISSIONS_PER_PAGE);
  const currentMissions = filteredMissions.slice(
    currentPage * MISSIONS_PER_PAGE,
    (currentPage + 1) * MISSIONS_PER_PAGE
  );

  // Filter Button Component
  const FilterButton = ({ label, value }) => {
    const isActive = activeFilter === value;
    return (
      <button
        onClick={() => { setActiveFilter(value); setCurrentPage(0); }}
        className="mp-filter-btn"
        style={{
          backgroundColor: isActive ? COLORS.green : COLORS.white,
          color: isActive ? COLORS.white : COLORS.green,
          ...(isSmallScreen ? { padding: '7px 8px', fontSize: '11px', marginBottom: 0, borderRadius: '6px', textAlign: 'center', flexShrink: 0 } : {})
        }}
      >
        {label}
      </button>
    );
  };

  if (!isOpen) return null;

  const styles = `
    .mp-overlay {
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
    .mp-modal-wrapper {
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
    .mp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .mp-modal {
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
    .mp-header {
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
    .mp-content {
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
    .mp-title-row {
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
    .mp-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mp-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .mp-main {
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
    .mp-col-left {
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
    .mp-col-right {
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
    .mp-filter-btn {
      width: 100%;
      padding: 12px 14px;
      border: 2px solid ${COLORS.green};
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      margin-bottom: 8px;
      text-align: left;
      -webkit-appearance: none;
      appearance: none;
      font-family: 'Montserrat', sans-serif;
    }
    .mp-ok-btn {
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
    .mp-ok-btn:hover {
      background: #0066CC;
    }
    .mp-grid-container {
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
    .mp-nav-btn {
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-appearance: none;
      appearance: none;
    }
    .mp-nav-btn:disabled {
      cursor: default;
      opacity: 0.3;
    }
    .mp-mission-grid {
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
    .mp-mission-item {
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
    .mp-mission-text {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.3;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      font-family: 'Montserrat', sans-serif;
    }
    .mp-date-label {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      margin-left: 10px;
      white-space: nowrap;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      font-family: 'Montserrat', sans-serif;
    }
    .mp-pagination {
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
    .mp-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .mp-summary {
      margin-top: 14px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .mp-loading {
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
    .mp-scroll-green::-webkit-scrollbar {
      width: 10px;
    }
    .mp-scroll-green::-webkit-scrollbar-track {
      background: #ECECEC;
      border-radius: 5px;
    }
    .mp-scroll-green::-webkit-scrollbar-thumb {
      background: ${COLORS.green};
      border-radius: 5px;
      border: 2px solid #ECECEC;
    }

    /* ════ MOBİL ════ */
    .mp-mobile-overlay {
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
    .mp-m-content {
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
    .mp-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    .mp-m-main {
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
    .mp-m-left {
      width: 36%;
      max-width: 230px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 6px;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .mp-m-right {
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
    .mp-m-list {
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
      .mp-col-left { width: 220px; }
      .mp-mission-grid {
        -ms-grid-columns: 1fr 8px 1fr;
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `;

  // Mobil mission kartı — checkbox/tik YOK, sadece text + date (PC ile aynı)
  const renderMobileMission = (mission) => {
    return (
      <div
        key={mission.id}
        className="mp-mission-item"
        style={{ flexShrink: 0, borderColor: mission.isCompleted ? COLORS.green : COLORS.gray }}
      >
        <span
          className="mp-mission-text"
          style={{ color: mission.isCompleted ? '#333' : COLORS.darkGray, fontSize: '13px', minWidth: 0, marginRight: mission.dateLabel ? '8px' : 0 }}
        >
          {mission.text}
        </span>
        {mission.dateLabel && (
          <span
            className="mp-date-label"
            style={{
              backgroundColor: mission.dateLabel === 'Today' ? COLORS.green : COLORS.lightGreen,
              color: mission.dateLabel === 'Today' ? COLORS.white : COLORS.green,
              marginLeft: 0, fontSize: '11px'
            }}
          >
            {mission.dateLabel}
          </span>
        )}
      </div>
    );
  };

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    return (
      <div className="mp-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="mp-m-content">
          {/* Başlık */}
          <div className="mp-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Mini's Missions Progress
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
              Track your Mini's completed and pending missions, using the filters on the left.
            </p>
          </div>

          <div className="mp-m-main">
            {/* SOL — Filtre butonları + özet */}
            <div className="mp-m-left">
              <div style={{ fontWeight: 800, fontSize: '12px', fontFamily: "'Montserrat', sans-serif", flexShrink: 0 }}>Filter:</div>
              {FILTERS.map(f => (
                <FilterButton key={f.value} label={f.label} value={f.value} />
              ))}
              <div style={{ marginTop: '6px', flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '12px', marginBottom: '4px', fontFamily: "'Montserrat', sans-serif" }}>Mission Summary:</div>
                <div style={{ fontSize: '11px', lineHeight: 1.5, fontFamily: "'Montserrat', sans-serif" }}>
                  <div>Total completed: <strong>{summary.totalCompleted}</strong></div>
                  <div>This week: <strong>{summary.thisWeekCompleted}/{summary.thisWeekTotal}</strong></div>
                </div>
              </div>
            </div>

            {/* SAĞ — tek sütun mission listesi, yeşil scrollbar */}
            <div className="mp-m-right">
              <div className="mp-m-list mp-scroll-green">
                {loading ? (
                  <div className="mp-loading">Loading...</div>
                ) : filteredMissions.length === 0 ? (
                  <div className="mp-loading">No missions found for this filter.</div>
                ) : (
                  filteredMissions.map(mission => renderMobileMission(mission))
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
    <div className="mp-overlay">
      <style>{styles}</style>
      
      <div className="mp-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="mp-brick-border" />
        
        <div className="mp-modal">
          {/* Header */}
          <div className="mp-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* Content */}
          <div className="mp-content">
            {/* Title Row */}
            <div className="mp-title-row">
              <div className="mp-btn-spacer" />
              <div className="mp-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Mini's Missions Progress
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
                  Track your Mini's completed and pending missions, using the filters on the left.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mp-ok-btn"
              >
                Ok
              </button>
            </div>

            {/* Main Content */}
            <div className="mp-main">
              {/* LEFT COLUMN - Filters & Summary */}
              <div className="mp-col-left">
                <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '10px', fontFamily: "'Montserrat', sans-serif" }}>View Filter:</div>
                
                <div className="mp-filters-wrap">
                  <FilterButton label="All" value="all" />
                  <FilterButton label="Completed" value="completed" />
                  <FilterButton label="Incompleted" value="incompleted" />
                  <FilterButton label="Completed this week" value="completed_week" />
                  <FilterButton label="Completed this month" value="completed_month" />
                </div>

                {/* Mission Summary */}
                <div className="mp-summary">
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '8px', fontFamily: "'Montserrat', sans-serif" }}>Mission Summary:</div>
                  <div style={{ fontSize: '13px', lineHeight: 1.6, fontFamily: "'Montserrat', sans-serif" }}>
                    <div>Total completed: <strong>{summary.totalCompleted}</strong></div>
                    <div>This week: <strong>{summary.thisWeekCompleted}/{summary.thisWeekTotal}</strong></div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - Mission Grid */}
              <div className="mp-col-right">
                <div className="mp-grid-container">
                  {/* Left Arrow */}
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="mp-nav-btn"
                  >
                    <img src={motivationLeftBtn} alt="←" style={{ width: '30px', height: '30px' }} />
                  </button>

                  {/* Mission Grid */}
                  <div className="mp-mission-grid">
                    {loading ? (
                      <div className="mp-loading">Loading...</div>
                    ) : currentMissions.length === 0 ? (
                      <div className="mp-loading">No missions found for this filter.</div>
                    ) : (
                      <>
                        {currentMissions.map((mission) => (
                          <div
                            key={mission.id}
                            className="mp-mission-item"
                            style={{ borderColor: mission.isCompleted ? COLORS.green : COLORS.gray }}
                          >
                            <span 
                              className="mp-mission-text"
                              style={{ color: mission.isCompleted ? '#333' : COLORS.darkGray }}
                            >
                              {mission.text}
                            </span>
                            
                            {mission.dateLabel && (
                              <span 
                                className="mp-date-label"
                                style={{
                                  backgroundColor: mission.dateLabel === 'Today' ? COLORS.green : COLORS.lightGreen,
                                  color: mission.dateLabel === 'Today' ? COLORS.white : COLORS.green,
                                }}
                              >
                                {mission.dateLabel}
                              </span>
                            )}
                          </div>
                        ))}
                        {/* Empty placeholders to maintain grid size */}
                        {Array.from({ length: MISSIONS_PER_PAGE - currentMissions.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="mp-mission-item" style={{ visibility: 'hidden' }}>
                            <span className="mp-mission-text">&nbsp;</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Right Arrow */}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1 || totalPages === 0}
                    className="mp-nav-btn"
                  >
                    <img src={motivationRightBtn} alt="→" style={{ width: '30px', height: '30px' }} />
                  </button>
                </div>

                {/* Pagination Dots */}
                <div className="mp-pagination">
                  {Array.from({ length: Math.max(1, totalPages) }).map((_, i) => (
                    <div 
                      key={i} 
                      onClick={() => setCurrentPage(i)} 
                      className="mp-dot"
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

export default MissionsProgress;