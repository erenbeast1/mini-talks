// src/components/dashboard/SceneLevelProgress.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import logoHead from '../../assets/logo-head.png';
import logoText from '../../assets/logo-text.png';

// Scene Icons
import lockIcon from '../../assets/scene/Lock_icon.png';
import unlockIcon from '../../assets/scene/Unlock_icon.png';
import voiceIcon from '../../assets/scene/Voice_icon.png';

// Brick Border
import BrickBorder from '../../assets/12-yesil.png';

const COLORS = {
  green: '#237841',
  darkGreen: '#1a5c32',
  white: '#FFFFFF',
  gray: '#D8D8D8',
  darkGray: '#666666',
  blue: '#0055BF',
};

const SceneLevelProgress = ({ mini, isOpen, onClose, entityType = 'mini' }) => {
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState([]);
  const [levels, setLevels] = useState([]);
  const [details, setDetails] = useState({});
  const [sortBy, setSortBy] = useState('scene_order');
  const [sortDir, setSortDir] = useState('ASC');

  // Scrollbar state
  const tableBodyRef = useRef(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [showScrollbar, setShowScrollbar] = useState(false);

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

  const entityId = entityType === 'builder' ? mini?.builder_id : mini?.mini_id;

  useEffect(() => {
    if (isOpen && entityId) {
      fetchProgress();
    }
  }, [isOpen, entityId, sortBy, sortDir]);

  // Scroll handler
  useEffect(() => {
    const tableBody = tableBodyRef.current;
    if (!tableBody) return;

    const checkScrollable = () => {
      setShowScrollbar(tableBody.scrollHeight > tableBody.clientHeight);
    };

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = tableBody;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        setScrollPercent((scrollTop / maxScroll) * 100);
      }
    };

    checkScrollable();
    tableBody.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkScrollable);

    return () => {
      tableBody.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkScrollable);
    };
  }, [scenes, loading, screenSize]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const apiUrl = entityType === 'builder'
        ? `https://mini-talks.org/minitalks-api/builder/get-scene-progress.php?builder_id=${entityId}&sort_by=${sortBy}&sort_dir=${sortDir}`
        : `https://mini-talks.org/minitalks-api/scene-level/get-progress.php?mini_id=${entityId}&sort_by=${sortBy}&sort_dir=${sortDir}`;
      const response = await axios.get(apiUrl);
      if (response.data?.success) {
        setScenes(response.data.data.scenes || []);
        setLevels(response.data.data.levels || []);
        setDetails(response.data.data.details || []);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDetailKey = (sceneId, levelId) => `${sceneId}-${levelId}`;

  const getCellDetail = (sceneId, levelId) => {
    const key = getDetailKey(sceneId, levelId);
    return details[key] || { is_locked: true, play_time_seconds: 0, recording_count: 0 };
  };

  // Custom scrollbar thumb drag (mouse)
  const handleThumbMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const tableBody = tableBodyRef.current;
    const startScrollTop = tableBody.scrollTop;
    const maxScroll = tableBody.scrollHeight - tableBody.clientHeight;
    const trackHeight = tableBody.clientHeight - 80;

    const handleMouseMove = (e) => {
      const deltaY = e.clientY - startY;
      const scrollDelta = (deltaY / trackHeight) * maxScroll;
      tableBody.scrollTop = Math.max(0, Math.min(maxScroll, startScrollTop + scrollDelta));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Mobil: thumb'ı parmakla sürükleme
  const handleThumbTouchStart = (e) => {
    const startY = e.touches[0].clientY;
    const tableBody = tableBodyRef.current;
    if (!tableBody) return;
    const startScrollTop = tableBody.scrollTop;
    const maxScroll = tableBody.scrollHeight - tableBody.clientHeight;
    const trackHeight = tableBody.clientHeight - 56;

    const handleTouchMove = (ev) => {
      const deltaY = ev.touches[0].clientY - startY;
      const scrollDelta = (deltaY / trackHeight) * maxScroll;
      tableBody.scrollTop = Math.max(0, Math.min(maxScroll, startScrollTop + scrollDelta));
      ev.preventDefault();
    };
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Sort Header Component - RecordingManager style
  const SortHeader = ({ label, field, isLast = false }) => {
    const isActive = sortBy === field;
    return (
      <div 
        style={{
          padding: '10px 8px',
          textAlign: 'center',
          display: '-webkit-flex',
          display: 'flex',
          WebkitFlexDirection: 'column',
          flexDirection: 'column',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          WebkitJustifyContent: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontWeight: 700,
          fontSize: '11px',
          lineHeight: 1.2,
          borderRight: isLast ? 'none' : `2px solid ${COLORS.white}`,
          fontFamily: "'Montserrat', sans-serif"
        }}
      >
        <span>{label}</span>
        <div style={{ 
          display: '-webkit-flex', 
          display: 'flex', 
          WebkitAlignItems: 'center',
          alignItems: 'center',
          gap: '6px'
        }}>
          {/* Down arrow - DESC */}
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            style={{ opacity: isActive && sortDir === 'DESC' ? 1 : 0.5, cursor: 'pointer' }}
            onClick={() => { setSortBy(field); setSortDir('DESC'); }}
          >
            <circle cx="12" cy="12" r="11" fill="white"/>
            <path d="M7 10L12 15L17 10" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          {/* Up arrow - ASC */}
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            style={{ opacity: isActive && sortDir === 'ASC' ? 1 : 0.5, cursor: 'pointer' }}
            onClick={() => { setSortBy(field); setSortDir('ASC'); }}
          >
            <circle cx="12" cy="12" r="11" fill="white"/>
            <path d="M7 14L12 9L17 14" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  // Scrollbar ölçüleri (mobil/desktop) — thumb track sonuna tam otursun
  const sbThumbH = isSmallScreen ? 56 : 80;
  const sbClientH = tableBodyRef.current ? tableBodyRef.current.clientHeight : 200;
  const sbTravel = Math.max(0, sbClientH - sbThumbH);
  const sbThumbTop = (scrollPercent / 100) * sbTravel;

  // Tablo (header + body) — desktop ve mobilde paylaşılır
  const renderTable = () => (
    <div className="slp-table-wrap">
      {/* Table Header */}
      <div className="slp-table-header">
        {/* Scene Header */}
        <div style={{
          padding: '10px 10px',
          display: '-webkit-flex',
          display: 'flex',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          WebkitJustifyContent: 'center',
          justifyContent: 'center',
          borderRight: `2px solid ${COLORS.white}`,
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: "'Montserrat', sans-serif"
        }}>
          Scene
        </div>
        
        {/* Levels Header Group */}
        <div className="slp-levels-header">
          <div style={{
            textAlign: 'center',
            padding: '5px',
            borderBottom: `1px solid rgba(255,255,255,0.3)`,
            fontSize: '11px',
            fontFamily: "'Montserrat', sans-serif"
          }}>
            Levels
          </div>
          <div className="slp-levels-grid">
            {levels.map((level, i) => (
              <div key={level.level_id} style={{
                padding: '6px 4px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 700,
                borderRight: i < levels.length - 1 ? `1px solid rgba(255,255,255,0.3)` : 'none',
                fontFamily: "'Montserrat', sans-serif",
                display: '-webkit-flex',
                display: 'flex',
                WebkitAlignItems: 'center',
                alignItems: 'center',
                WebkitJustifyContent: 'center',
                justifyContent: 'center'
              }}>
                {level.level_name}
              </div>
            ))}
          </div>
        </div>

        {/* Sortable Columns */}
        <SortHeader label="Total Time Played" field="play_time" />
        <SortHeader label="Recordings" field="recordings" />
        <SortHeader label="Last Play" field="last_play" />
        <div style={{ 
          padding: '8px 6px', 
          textAlign: 'center', 
          fontSize: '11px', 
          fontWeight: 700,
          display: '-webkit-flex',
          display: 'flex',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          WebkitJustifyContent: 'center',
          justifyContent: 'center',
          fontFamily: "'Montserrat', sans-serif",
          lineHeight: 1.2
        }}>
          Minis<br/>Customized
        </div>
      </div>

      {/* Table Body - Scrollable */}
      <div className="slp-table-body" ref={tableBodyRef}>
        {scenes.map((scene, sceneIndex) => (
          <div
            key={scene.scene_id}
            className="slp-table-row"
            style={{
              borderBottom: sceneIndex < scenes.length - 1 ? `2px solid ${COLORS.green}` : 'none',
              backgroundColor: sceneIndex % 2 === 0 ? COLORS.white : 'rgba(35,120,65,0.03)'
            }}
          >
            {/* Scene Name */}
            <div style={{
              padding: '12px 10px',
              fontSize: '13px',
              fontWeight: 600,
              borderRight: `2px solid ${COLORS.green}`,
              display: '-webkit-flex',
              display: 'flex',
              WebkitAlignItems: 'center',
              alignItems: 'center',
              fontFamily: "'Montserrat', sans-serif"
            }}>
              {scene.scene_name}
            </div>

            {/* Level Cells */}
            {levels.map((level, levelIndex) => {
              const detail = getCellDetail(scene.scene_id, level.level_id);
              const hasRecording = detail.recording_count > 0 || detail.play_time_seconds > 0;
              
              return (
                <div
                  key={level.level_id}
                  className="slp-cell"
                  style={{
                    borderRight: levelIndex < levels.length - 1 ? `1px solid rgba(35,120,65,0.2)` : `2px solid ${COLORS.green}`
                  }}
                >
                  {hasRecording && (
                    <>
                      <img src={voiceIcon} alt="" style={{ width: '16px', height: '16px', WebkitFlexShrink: 0, flexShrink: 0 }} />
                      <span>{formatTime(detail.play_time_seconds)}</span>
                    </>
                  )}
                  
                  {!hasRecording && !detail.is_locked && (
                    <img src={unlockIcon} alt="Unlocked" style={{ width: '16px', height: '16px' }} />
                  )}
                  
                  {!hasRecording && detail.is_locked && (
                    <img src={lockIcon} alt="Locked" style={{ width: '16px', height: '16px' }} />
                  )}
                </div>
              );
            })}

            {/* Total Time Played */}
            <div style={{
              padding: '12px 6px',
              textAlign: 'center',
              fontSize: '12px',
              borderRight: `2px solid ${COLORS.green}`,
              display: '-webkit-flex',
              display: 'flex',
              WebkitAlignItems: 'center',
              alignItems: 'center',
              WebkitJustifyContent: 'center',
              justifyContent: 'center',
              fontFamily: "'Montserrat', sans-serif"
            }}>
              {formatTime(scene.total_play_time) || '00:00:00'}
            </div>

            {/* Recordings */}
            <div style={{
              padding: '12px 6px',
              textAlign: 'center',
              fontSize: '12px',
              borderRight: `2px solid ${COLORS.green}`,
              display: '-webkit-flex',
              display: 'flex',
              WebkitAlignItems: 'center',
              alignItems: 'center',
              WebkitJustifyContent: 'center',
              justifyContent: 'center',
              fontFamily: "'Montserrat', sans-serif"
            }}>
              {scene.total_recordings > 0 ? `${scene.total_recordings} / ${levels.length * 4}` : ''}
            </div>

            {/* Last Play */}
            <div style={{
              padding: '12px 6px',
              textAlign: 'center',
              fontSize: '12px',
              borderRight: `2px solid ${COLORS.green}`,
              display: '-webkit-flex',
              display: 'flex',
              WebkitAlignItems: 'center',
              alignItems: 'center',
              WebkitJustifyContent: 'center',
              justifyContent: 'center',
              fontFamily: "'Montserrat', sans-serif"
            }}>
              {formatDate(scene.latest_play)}
            </div>

            {/* Minis Customized */}
            <div style={{
              padding: '12px 6px',
              textAlign: 'center',
              fontSize: '12px',
              display: '-webkit-flex',
              display: 'flex',
              WebkitAlignItems: 'center',
              alignItems: 'center',
              WebkitJustifyContent: 'center',
              justifyContent: 'center',
              fontFamily: "'Montserrat', sans-serif"
            }}>
              {scene.total_minis_customized > 0 ? scene.total_minis_customized : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const styles = `
    .slp-overlay {
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
    .slp-modal-wrapper {
      position: relative;
      width: 95vw;
      max-width: 1200px;
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
    .slp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .slp-modal {
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
    .slp-header {
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
    .slp-content {
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
    .slp-title-row {
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
    .slp-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .slp-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .slp-ok-btn {
      background: ${COLORS.blue};
      color: ${COLORS.white};
      border: none;
      border-radius: 10px;
      padding: 12px 30px;
      font-size: 16px;
      font-weight: 700;
      font-family: 'Montserrat', sans-serif;
      cursor: pointer;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-appearance: none;
      appearance: none;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .slp-ok-btn:hover {
      background: #0066CC;
    }
    .slp-main {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 12px;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
    }
    .slp-table-wrap {
      border: 3px solid ${COLORS.green};
      border-radius: 12px;
      overflow: hidden;
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
      min-width: 0;
      -webkit-min-width: 0;
    }
    .slp-table-header {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 140px (1fr)[8];
      grid-template-columns: 140px repeat(8, 1fr);
      background: ${COLORS.green};
      color: ${COLORS.white};
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .slp-table-body {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      min-height: 0;
      -webkit-min-height: 0;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .slp-table-body::-webkit-scrollbar {
      display: none;
    }
    .slp-table-row {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 140px (1fr)[8];
      grid-template-columns: 140px repeat(8, 1fr);
    }
    .slp-levels-header {
      grid-column: span 4;
      border-right: 2px solid ${COLORS.white};
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .slp-levels-grid {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: (1fr)[4];
      grid-template-columns: repeat(4, 1fr);
      -webkit-box-flex: 1;
      -webkit-flex: 1;
      flex: 1;
    }
    .slp-cell {
      padding: 12px 6px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 4px;
      font-size: 12px;
      font-family: 'Montserrat', sans-serif;
    }
    .slp-scrollbar-track {
      width: 14px;
      background: ${COLORS.gray};
      border-radius: 7px;
      position: relative;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-top: 70px;
    }
    .slp-scrollbar-thumb {
      width: 14px;
      height: 80px;
      background: ${COLORS.green};
      border-radius: 7px;
      position: absolute;
      left: 0;
      cursor: grab;
      -webkit-transition: background 0.2s;
      transition: background 0.2s;
    }
    .slp-scrollbar-thumb:hover {
      background: ${COLORS.darkGreen};
    }
    .slp-scrollbar-thumb:active {
      cursor: grabbing;
    }
    .slp-loading {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      color: ${COLORS.darkGray};
      font-size: 16px;
      font-family: 'Montserrat', sans-serif;
    }

    /* ════ MOBİL ════ */
    .slp-mobile-overlay {
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
    .slp-m-content {
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
    .slp-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    .slp-m-main {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 8px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
    }
    /* Mobilde tablo sütunlarını daralt */
    .slp-m-main .slp-table-header,
    .slp-m-main .slp-table-row {
      -ms-grid-columns: 96px (1fr)[8];
      grid-template-columns: 96px repeat(8, 1fr);
    }
    .slp-m-main .slp-cell { padding: 7px 3px; font-size: 10px; }
    /* Scene ismi 2 satıra sarsın, hücre içeriğe göre essin */
    .slp-m-main .slp-table-row > div:first-child {
      font-size: 11px !important;
      line-height: 1.2;
      word-break: break-word;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
    }
    .slp-m-main .slp-scrollbar-track { margin-top: 52px; width: 10px; }
    .slp-m-main .slp-scrollbar-thumb { width: 10px; height: 56px; }
    
    @media (max-width: 1000px) {
      .slp-table-header,
      .slp-table-row {
        -ms-grid-columns: 120px (1fr)[8];
        grid-template-columns: 120px repeat(8, 1fr);
      }
    }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    return (
      <div className="slp-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="slp-m-content">
          {/* Başlık */}
          <div className="slp-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Scenes & Levels Progress
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '650px', fontFamily: "'Montserrat', sans-serif" }}>
              View your Mini's activity across scenes and levels, including usage, unlock status, and total play time.
            </p>
          </div>

          {loading ? (
            <div className="slp-loading">Loading...</div>
          ) : (
            <div className="slp-m-main">
              {/* Tablo */}
              {renderTable()}

              {/* Custom Scrollbar — tablonun dışında */}
              {showScrollbar && (
                <div 
                  className="slp-scrollbar-track"
                  style={{ height: tableBodyRef.current ? tableBodyRef.current.clientHeight : 'auto' }}
                >
                  <div 
                    className="slp-scrollbar-thumb"
                    style={{ top: `${sbThumbTop}px` }}
                    onMouseDown={handleThumbMouseDown}
                    onTouchStart={handleThumbTouchStart}
                  />
                </div>
              )}
            </div>
          )}

          {/* Ok — modalın en altında, tam ortalı */}
          {!loading && (
            <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, paddingTop: '8px' }}>
              <button onClick={onClose} style={{
                flex: '0 1 140px', background: COLORS.blue, color: COLORS.white, border: 'none',
                borderRadius: '8px', padding: '11px', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
              }}>
                Ok
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="slp-overlay">
      <style>{styles}</style>
      
      <div className="slp-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="slp-brick-border" />
        
        <div className="slp-modal">
          {/* Logo */}
          <div className="slp-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* White Content Area */}
          <div className="slp-content">
            {/* Header */}
            <div className="slp-title-row">
              <div className="slp-btn-spacer" />
              <div className="slp-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Scenes & Levels Progress
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '650px', fontFamily: "'Montserrat', sans-serif" }}>
                  View your Mini's activity across scenes and levels, including usage, unlock status, and total play time.
                </p>
              </div>
              <button onClick={onClose} className="slp-ok-btn">
                Ok
              </button>
            </div>

            {loading ? (
              <div className="slp-loading">Loading...</div>
            ) : (
              /* Main with Table + Scrollbar */
              <div className="slp-main">
                {/* Table */}
                {renderTable()}

                {/* Custom Scrollbar */}
                {showScrollbar && (
                  <div 
                    className="slp-scrollbar-track"
                    style={{ height: tableBodyRef.current ? tableBodyRef.current.clientHeight : 'auto' }}
                  >
                    <div 
                      className="slp-scrollbar-thumb"
                      style={{ top: `${sbThumbTop}px` }}
                      onMouseDown={handleThumbMouseDown}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneLevelProgress;