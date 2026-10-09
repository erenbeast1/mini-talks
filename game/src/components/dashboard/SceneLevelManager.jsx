// src/components/dashboard/SceneLevelManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import logoHead from '../../assets/logo-head.png';
import logoText from '../../assets/logo-text.png';

// Scene Icons
import lockIcon from '../../assets/scene/Lock_icon.png';
import unlockIcon from '../../assets/scene/Unlock_icon.png';
import voiceIcon from '../../assets/scene/Voice_icon.png';
import warningIcon from '../../assets/scene/Warning_icon.png';

// Brick Border
import BrickBorder from '../../assets/12-yesil.png';

const COLORS = {
  green: '#237841',
  darkGreen: '#1a5c32',
  white: '#FFFFFF',
  gray: '#D8D8D8',
  darkGray: '#666666',
  red: '#E52828',
  blue: '#0055BF',
  lightGreen: '#E8F5E9',
  lightRed: '#FFEBEE',
};

const SceneLevelManager = ({ mini, parentId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState([]);
  const [levels, setLevels] = useState([]);
  const [status, setStatus] = useState({});
  const [selectedScene, setSelectedScene] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedColumnLevel, setSelectedColumnLevel] = useState(null);
  
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

  useEffect(() => {
    if (isOpen && mini?.mini_id) {
      fetchStatus();
    }
  }, [isOpen, mini]);

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

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/scene-level/get-status.php?mini_id=${mini.mini_id}`
      );
      if (response.data?.success) {
        setScenes(response.data.data.scenes || []);
        setLevels(response.data.data.levels || []);
        setStatus(response.data.data.status || {});
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLockStatus = async (sceneId, levelId, isLocked, action = 'single') => {
    try {
      await axios.post('https://mini-talks.org/minitalks-api/scene-level/update-lock.php', {
        mini_id: mini.mini_id,
        scene_id: sceneId,
        level_id: levelId,
        is_locked: isLocked ? 1 : 0,
        action: action
      });
      await fetchStatus();
    } catch (error) {
      console.error('Failed to update lock:', error);
    }
  };

  const resetRecordings = async (sceneId, levelId) => {
    if (!window.confirm('Are you sure you want to reset these recordings? This cannot be undone.')) {
      return;
    }
    try {
      await axios.post('https://mini-talks.org/minitalks-api/scene-level/reset-recordings.php', {
        mini_id: mini.mini_id,
        scene_id: sceneId,
        level_id: levelId
      });
      await fetchStatus();
    } catch (error) {
      console.error('Failed to reset recordings:', error);
    }
  };

  const getStatusKey = (sceneId, levelId) => `${sceneId}-${levelId}`;

  const getCellStatus = (sceneId, levelId) => {
    const key = getStatusKey(sceneId, levelId);
    return status[key] || { is_locked: true, recording_count: 0 };
  };

  const getSceneStatus = (sceneId) => {
    const sceneLevels = levels.map(l => getCellStatus(sceneId, l.level_id));
    const allLocked = sceneLevels.every(s => s.is_locked);
    const allUnlocked = sceneLevels.every(s => !s.is_locked);
    
    if (allLocked) return 'locked';
    if (allUnlocked) return 'unlocked';
    return 'mixed';
  };

  const getLevelColumnStatus = (levelId) => {
    const levelCells = scenes.map(s => getCellStatus(s.scene_id, levelId));
    const allLocked = levelCells.every(s => s.is_locked);
    const allUnlocked = levelCells.every(s => !s.is_locked);
    const totalRecordings = levelCells.reduce((sum, s) => sum + (s.recording_count || 0), 0);
    
    return {
      status: allLocked ? 'locked' : (allUnlocked ? 'unlocked' : 'mixed'),
      totalRecordings
    };
  };

  const handleCellClick = (scene, level) => {
    setSelectedScene(scene);
    setSelectedLevel(level);
    setSelectedColumnLevel(null);
  };

  const handleSceneClick = (scene) => {
    setSelectedScene(scene);
    setSelectedLevel(null);
    setSelectedColumnLevel(null);
  };

  const handleLevelColumnClick = (level) => {
    setSelectedColumnLevel(level);
    setSelectedScene(null);
    setSelectedLevel(null);
  };

  const clearSelection = () => {
    setSelectedScene(null);
    setSelectedLevel(null);
    setSelectedColumnLevel(null);
  };

  // Custom scrollbar thumb drag
  const handleThumbMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const tableBody = tableBodyRef.current;
    const startScrollTop = tableBody.scrollTop;
    const maxScroll = tableBody.scrollHeight - tableBody.clientHeight;
    const trackHeight = tableBody.clientHeight - 80 - 80; // track height minus thumb

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
    const trackHeight = tableBody.clientHeight - 80 - 80;

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

  // Action Button Component
  const ActionButton = ({ label, onClick, variant = 'default' }) => {
    const styles = {
      default: { bg: COLORS.white, border: COLORS.green, color: COLORS.green },
      primary: { bg: COLORS.green, border: COLORS.green, color: COLORS.white },
      danger: { bg: COLORS.white, border: COLORS.red, color: COLORS.red },
    };
    const style = styles[variant];
    
    return (
      <button
        onClick={onClick}
        style={{
          padding: isSmallScreen ? '8px 12px' : '10px 16px',
          backgroundColor: style.bg,
          border: `2px solid ${style.border}`,
          borderRadius: '8px',
          color: style.color,
          fontSize: isSmallScreen ? '11px' : '13px',
          fontWeight: 700,
          fontFamily: "'Montserrat', sans-serif",
          cursor: 'pointer',
          WebkitTransition: 'all 0.2s',
          transition: 'all 0.2s',
          WebkitAppearance: 'none',
          appearance: 'none'
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = style.border;
          e.target.style.color = COLORS.white;
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = style.bg;
          e.target.style.color = style.color;
        }}
      >
        {label}
      </button>
    );
  };

  if (!isOpen) return null;

  // Seçili duruma göre panel içeriği
  const renderActionPanel = () => {
    // Hiçbir şey seçili değil
    if (!selectedScene && !selectedColumnLevel) {
      return (
        <div style={{ 
          backgroundColor: COLORS.green, 
          borderRadius: '12px', 
          padding: isSmallScreen ? '14px' : '20px',
          color: COLORS.white,
          fontSize: isSmallScreen ? '11px' : '13px',
          lineHeight: 1.5,
          fontFamily: "'Montserrat', sans-serif"
        }}>
          Select any scene, level, or column header from the table to manage its status.
          <br /><br />
          • Click a <strong>scene name</strong> to manage all levels in that scene
          <br />
          • Click a <strong>level header</strong> (Sound, Word, etc.) to manage that level across all scenes
          <br />
          • Click a <strong>cell</strong> to manage a specific scene-level combination
        </div>
      );
    }

    // KOLON SEÇİLDİ (tüm sahnelerde bir level)
    if (selectedColumnLevel) {
      const columnStatus = getLevelColumnStatus(selectedColumnLevel.level_id);
      
      return (
        <div>
          {/* Info Box */}
          <div style={{ 
            backgroundColor: COLORS.green, 
            borderRadius: '12px', 
            padding: '14px',
            color: COLORS.white,
            fontSize: '12px',
            marginBottom: '16px',
            lineHeight: 1.4,
            fontFamily: "'Montserrat', sans-serif"
          }}>
            Managing <strong>{selectedColumnLevel.level_name}</strong> level across ALL scenes.
            Changes will apply to every scene.
          </div>

          {/* Title */}
          <h3 style={{ fontSize: isSmallScreen ? '17px' : '22px', fontWeight: 900, margin: '0 0 12px', fontFamily: "'Montserrat', sans-serif" }}>
            All Scenes – {selectedColumnLevel.level_name}
          </h3>

          {/* Status */}
          <div style={{ 
            display: '-webkit-flex', 
            display: 'flex', 
            WebkitAlignItems: 'center',
            alignItems: 'center', 
            gap: '10px', 
            marginBottom: '8px' 
          }}>
            <img src={columnStatus.status === 'locked' ? lockIcon : unlockIcon} alt="" style={{ width: '20px', height: '20px' }} />
            <span style={{ fontSize: '14px', fontFamily: "'Montserrat', sans-serif" }}>
              {columnStatus.status === 'locked' && 'All scenes are locked for this level'}
              {columnStatus.status === 'unlocked' && 'All scenes are unlocked for this level'}
              {columnStatus.status === 'mixed' && 'Mixed status across scenes'}
            </span>
          </div>

          {columnStatus.status === 'mixed' && (
            <div style={{ 
              display: '-webkit-flex', 
              display: 'flex', 
              WebkitAlignItems: 'flex-start',
              alignItems: 'flex-start', 
              gap: '8px', 
              marginBottom: '16px' 
            }}>
              <img src={warningIcon} alt="" style={{ width: '20px', height: '20px', WebkitFlexShrink: 0, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: COLORS.darkGray, fontFamily: "'Montserrat', sans-serif" }}>
                Some scenes are locked, some are unlocked for this level.
              </span>
            </div>
          )}

          {columnStatus.totalRecordings > 0 && (
            <div style={{ fontSize: '13px', color: COLORS.darkGray, marginBottom: '16px', fontFamily: "'Montserrat', sans-serif" }}>
              {columnStatus.totalRecordings} total recording(s) in this level
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ 
            display: '-webkit-flex', 
            display: 'flex', 
            gap: '10px', 
            WebkitFlexWrap: 'wrap',
            flexWrap: 'wrap', 
            marginBottom: '12px' 
          }}>
            <ActionButton 
              label="🔒 Lock All Scenes" 
              onClick={() => updateLockStatus(null, selectedColumnLevel.level_id, true, 'lock_level')}
              variant="default"
            />
            <ActionButton 
              label="Keep Current" 
              onClick={clearSelection}
              variant="default"
            />
            <ActionButton 
              label="🔓 Unlock All Scenes" 
              onClick={() => updateLockStatus(null, selectedColumnLevel.level_id, false, 'unlock_level')}
              variant="primary"
            />
          </div>

          {columnStatus.totalRecordings > 0 && (
            <ActionButton 
              label="🗑️ Reset All Recordings" 
              onClick={() => resetRecordings(null, selectedColumnLevel.level_id)}
              variant="danger"
            />
          )}
        </div>
      );
    }

    // SAHNE SEÇİLDİ
    const sceneStatus = getSceneStatus(selectedScene.scene_id);
    const isSceneSelected = selectedScene && !selectedLevel;
    const cellStatus = selectedLevel ? getCellStatus(selectedScene.scene_id, selectedLevel.level_id) : null;

    // Sahne için toplam kayıt sayısı
    const sceneTotalRecordings = levels.reduce((sum, l) => {
      return sum + (getCellStatus(selectedScene.scene_id, l.level_id).recording_count || 0);
    }, 0);

    return (
      <div>
        {/* Info Box */}
        <div style={{ 
          backgroundColor: COLORS.green, 
          borderRadius: '12px', 
          padding: '14px',
          color: COLORS.white,
          fontSize: '12px',
          marginBottom: '16px',
          lineHeight: 1.4,
          fontFamily: "'Montserrat', sans-serif"
        }}>
          {isSceneSelected 
            ? `Managing all levels in ${selectedScene.scene_name}.`
            : `Managing ${selectedLevel.level_name} level in ${selectedScene.scene_name}.`
          }
        </div>

        {/* Title */}
        <h3 style={{ fontSize: isSmallScreen ? '17px' : '22px', fontWeight: 900, margin: '0 0 12px', fontFamily: "'Montserrat', sans-serif" }}>
          {selectedScene.scene_name} {selectedLevel ? `– ${selectedLevel.level_name}` : '– All Levels'}
        </h3>

        {/* Status Warning for Mixed */}
        {isSceneSelected && sceneStatus === 'mixed' && (
          <div style={{ 
            display: '-webkit-flex', 
            display: 'flex', 
            WebkitAlignItems: 'flex-start',
            alignItems: 'flex-start', 
            gap: '8px', 
            marginBottom: '16px' 
          }}>
            <img src={warningIcon} alt="" style={{ width: '20px', height: '20px', WebkitFlexShrink: 0, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', fontFamily: "'Montserrat', sans-serif" }}>Mixed access status</div>
              <div style={{ fontSize: '12px', color: COLORS.darkGray, fontFamily: "'Montserrat', sans-serif" }}>Some levels are locked, some are unlocked.</div>
            </div>
          </div>
        )}

        {/* Single Level Selected */}
        {selectedLevel && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: '-webkit-flex', 
              display: 'flex', 
              WebkitAlignItems: 'center',
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '6px' 
            }}>
              <img src={cellStatus?.is_locked ? lockIcon : unlockIcon} alt="" style={{ width: '20px', height: '20px' }} />
              <span style={{ fontSize: '14px', fontFamily: "'Montserrat', sans-serif" }}>
                Currently <strong>{cellStatus?.is_locked ? 'locked' : 'unlocked'}</strong>
              </span>
            </div>
            {cellStatus?.recording_count > 0 && (
              <div style={{ fontSize: '13px', color: COLORS.darkGray, fontFamily: "'Montserrat', sans-serif" }}>
                {cellStatus.recording_count} recording(s) available
              </div>
            )}
          </div>
        )}

        {/* Scene Selected - show totals */}
        {isSceneSelected && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: '-webkit-flex', 
              display: 'flex', 
              WebkitAlignItems: 'center',
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '6px' 
            }}>
              <img src={sceneStatus === 'unlocked' ? unlockIcon : lockIcon} alt="" style={{ width: '20px', height: '20px' }} />
              <span style={{ fontSize: '14px', fontFamily: "'Montserrat', sans-serif" }}>
                {sceneStatus === 'locked' && 'All levels locked'}
                {sceneStatus === 'unlocked' && 'All levels unlocked'}
                {sceneStatus === 'mixed' && 'Mixed lock status'}
              </span>
            </div>
            {sceneTotalRecordings > 0 && (
              <div style={{ fontSize: '13px', color: COLORS.darkGray, fontFamily: "'Montserrat', sans-serif" }}>
                {sceneTotalRecordings} total recording(s) in this scene
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: '-webkit-flex', 
          display: 'flex', 
          gap: '10px', 
          WebkitFlexWrap: 'wrap',
          flexWrap: 'wrap', 
          marginBottom: '12px' 
        }}>
          <ActionButton 
            label={selectedLevel ? '🔒 Lock Level' : '🔒 Lock All Levels'}
            onClick={() => {
              if (selectedLevel) {
                updateLockStatus(selectedScene.scene_id, selectedLevel.level_id, true);
              } else {
                updateLockStatus(selectedScene.scene_id, null, true, 'lock_scene');
              }
            }}
            variant="default"
          />
          <ActionButton 
            label="Keep Current" 
            onClick={clearSelection}
            variant="default"
          />
          <ActionButton 
            label={selectedLevel ? '🔓 Unlock Level' : '🔓 Unlock All Levels'}
            onClick={() => {
              if (selectedLevel) {
                updateLockStatus(selectedScene.scene_id, selectedLevel.level_id, false);
              } else {
                updateLockStatus(selectedScene.scene_id, null, false, 'unlock_scene');
              }
            }}
            variant="primary"
          />
        </div>

        {/* Reset Recordings */}
        {(selectedLevel ? cellStatus?.recording_count > 0 : sceneTotalRecordings > 0) && (
          <ActionButton 
            label={selectedLevel ? '🗑️ Reset Recording' : '🗑️ Reset All Recordings'}
            onClick={() => resetRecordings(selectedScene.scene_id, selectedLevel?.level_id)}
            variant="danger"
          />
        )}
      </div>
    );
  };

  // Tablo (header + body) — desktop ve mobilde paylaşılır
  const renderTable = () => (
    <div className="slm-table-wrap">
      {/* Table Header */}
      <div className="slm-table-header">
        {/* Corner Cell */}
        <div className="slm-corner-cell">
          <span style={{ fontSize: '11px', opacity: 0.8 }}>Levels →</span>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>↓ Scene</span>
        </div>
        {/* Level Headers - TIKLANABILIR */}
        {levels.map((level, i) => {
          const columnStatus = getLevelColumnStatus(level.level_id);
          const isSelected = selectedColumnLevel?.level_id === level.level_id;
          
          return (
            <div 
              key={level.level_id} 
              onClick={() => handleLevelColumnClick(level)}
              className="slm-level-header"
              style={{
                borderRight: i < levels.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'transparent'
              }}
            >
              <div style={{ marginBottom: '2px' }}>
                {columnStatus.status === 'unlocked' ? '🔓' : '🔒'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{level.level_name}</div>
            </div>
          );
        })}
      </div>

      {/* Table Body - Scrollable */}
      <div className="slm-table-body" ref={tableBodyRef}>
        {scenes.map((scene, sceneIndex) => (
          <div
            key={scene.scene_id}
            className="slm-table-row"
            style={{
              backgroundColor: selectedScene?.scene_id === scene.scene_id && !selectedLevel ? COLORS.lightGreen : COLORS.white
            }}
          >
            {/* Scene Name Cell */}
            <div
              onClick={() => handleSceneClick(scene)}
              className="slm-scene-cell"
            >
              <span style={{ fontSize: '14px' }}>
                {getSceneStatus(scene.scene_id) === 'unlocked' ? '🔓' : '🔒'}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{scene.scene_name}</span>
            </div>

            {/* Level Cells */}
            {levels.map((level, levelIndex) => {
              const cellStatus = getCellStatus(scene.scene_id, level.level_id);
              const isSelected = selectedScene?.scene_id === scene.scene_id && selectedLevel?.level_id === level.level_id;
              const isColumnSelected = selectedColumnLevel?.level_id === level.level_id;
              
              return (
                <div
                  key={level.level_id}
                  onClick={() => handleCellClick(scene, level)}
                  className="slm-cell"
                  style={{
                    borderRight: levelIndex < levels.length - 1 ? `1px solid ${COLORS.gray}` : 'none',
                    backgroundColor: isSelected ? COLORS.lightGreen : (isColumnSelected ? 'rgba(35,120,65,0.08)' : 'transparent')
                  }}
                >
                  {cellStatus.recording_count > 0 ? (
                    <img src={voiceIcon} alt="Has recordings" style={{ width: '20px', height: '20px' }} />
                  ) : cellStatus.is_locked ? (
                    <img src={lockIcon} alt="Locked" style={{ width: '18px', height: '18px' }} />
                  ) : (
                    <img src={unlockIcon} alt="Unlocked" style={{ width: '18px', height: '18px' }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // Calculate thumb position
  // Scrollbar ölçüleri (mobil/desktop) — thumb track sonuna tam otursun
  const sbMarginTop = isSmallScreen ? 44 : 60;
  const sbThumbH = isSmallScreen ? 56 : 80;
  const sbClientH = tableBodyRef.current ? tableBodyRef.current.clientHeight : 200;
  // Thumb'ın track içindeki gerçek gezinme aralığı (track yüksekliği - thumb yüksekliği)
  const sbTravel = Math.max(0, sbClientH - sbThumbH);
  const sbThumbTop = (scrollPercent / 100) * sbTravel;

  const styles = `
    .slm-overlay {
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
    .slm-modal-wrapper {
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
    .slm-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .slm-modal {
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
    .slm-header {
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
    .slm-content {
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
    .slm-title-row {
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
    .slm-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .slm-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .slm-ok-btn {
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
    .slm-ok-btn:hover {
      background: #0066CC;
    }
    .slm-main {
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
    .slm-table-section {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 12px;
      min-width: 0;
      -webkit-min-width: 0;
    }
    .slm-table-wrap {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      border: 3px solid ${COLORS.green};
      border-radius: 12px;
      overflow: hidden;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      min-width: 0;
      -webkit-min-width: 0;
    }
    .slm-table-header {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 180px (1fr)[4];
      grid-template-columns: 180px repeat(4, 1fr);
      background: ${COLORS.green};
      color: ${COLORS.white};
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .slm-table-body {
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
    .slm-table-body::-webkit-scrollbar {
      display: none;
    }
    .slm-table-row {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 180px (1fr)[4];
      grid-template-columns: 180px repeat(4, 1fr);
      border-bottom: 2px solid ${COLORS.green};
    }
    .slm-corner-cell {
      padding: 10px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      border-right: 1px solid rgba(255,255,255,0.3);
      border-bottom: 2px solid ${COLORS.white};
      font-family: 'Montserrat', sans-serif;
    }
    .slm-level-header {
      padding: 10px;
      text-align: center;
      border-bottom: 2px solid ${COLORS.white};
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
      font-family: 'Montserrat', sans-serif;
    }
    .slm-scene-cell {
      padding: 12px 10px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 8px;
      border-right: 1px solid ${COLORS.gray};
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
      font-family: 'Montserrat', sans-serif;
    }
    .slm-cell {
      padding: 12px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .slm-scrollbar-track {
      width: 14px;
      background: ${COLORS.gray};
      border-radius: 7px;
      position: relative;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-top: 60px;
    }
    .slm-scrollbar-thumb {
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
    .slm-scrollbar-thumb:hover {
      background: ${COLORS.darkGreen};
    }
    .slm-scrollbar-thumb:active {
      cursor: grabbing;
    }
    .slm-action-panel {
      width: 320px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .slm-loading {
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
    .slm-mobile-overlay {
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
    .slm-m-content {
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
    .slm-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    .slm-m-main {
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
    /* Mobilde tablo solda (yarı), panel sağda (yarı) */
    .slm-m-main .slm-table-section {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
    }
    .slm-m-main .slm-action-panel {
      width: 42%;
      max-width: 320px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      min-height: 0;
    }
    /* Mobilde tablo sütunları daralt */
    .slm-m-main .slm-table-header,
    .slm-m-main .slm-table-row {
      -ms-grid-columns: 92px (1fr)[4];
      grid-template-columns: 92px repeat(4, 1fr);
    }
    .slm-m-main .slm-corner-cell { padding: 5px; }
    .slm-m-main .slm-level-header { padding: 5px 3px; }
    .slm-m-main .slm-level-header > div:last-child { font-size: 10px !important; }
    .slm-m-main .slm-scene-cell { padding: 7px 5px; gap: 4px; }
    .slm-m-main .slm-scene-cell > span:last-child { font-size: 10px !important; }
    .slm-m-main .slm-cell { padding: 7px; }
    .slm-m-main .slm-scrollbar-track { margin-top: 44px; width: 10px; }
    .slm-m-main .slm-scrollbar-thumb { width: 10px; height: 56px; }
    
    @media (max-width: 900px) {
      .slm-content {
        padding: 20px;
      }
    }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    return (
      <div className="slm-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="slm-m-content">
          {/* Başlık */}
          <div className="slm-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Scenes & Levels Manager
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
              Select a scene, level column, or cell to manage lock status and recordings.
            </p>
          </div>

          {loading ? (
            <div className="slm-loading">Loading...</div>
          ) : (
            <div className="slm-m-main">
              {/* SOL — Tablo + custom scrollbar (PC gibi, tablo dışında) */}
              <div className="slm-table-section">
                {renderTable()}

                {/* Custom Scrollbar — tablonun dışında */}
                {showScrollbar && (
                  <div 
                    className="slm-scrollbar-track"
                    style={{ height: tableBodyRef.current ? tableBodyRef.current.clientHeight : 'auto' }}
                  >
                    <div 
                      className="slm-scrollbar-thumb"
                      style={{ top: `${sbThumbTop}px` }}
                      onMouseDown={handleThumbMouseDown}
                      onTouchStart={handleThumbTouchStart}
                    />
                  </div>
                )}
              </div>

              {/* SAĞ — Action Panel */}
              <div className="slm-action-panel">
                {renderActionPanel()}
              </div>
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
    <div className="slm-overlay">
      <style>{styles}</style>
      
      <div className="slm-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="slm-brick-border" />
        
        <div className="slm-modal">
          {/* Logo */}
          <div className="slm-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* White Content Area */}
          <div className="slm-content">
            {/* Header */}
            <div className="slm-title-row">
              <div className="slm-btn-spacer" />
              <div className="slm-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Scenes & Levels Manager
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
                  Select a scene, level column, or cell to manage lock status and recordings.
                </p>
              </div>
              <button onClick={onClose} className="slm-ok-btn">
                Ok
              </button>
            </div>

            {loading ? (
              <div className="slm-loading">Loading...</div>
            ) : (
              /* Main Content */
              <div className="slm-main">
                {/* LEFT - Table Section with Scrollbar */}
                <div className="slm-table-section">
                  {renderTable()}

                  {/* Custom Scrollbar */}
                  {showScrollbar && (
                    <div 
                      className="slm-scrollbar-track"
                      style={{ height: tableBodyRef.current ? tableBodyRef.current.clientHeight : 'auto' }}
                    >
                      <div 
                        className="slm-scrollbar-thumb"
                        style={{ top: `${sbThumbTop}px` }}
                        onMouseDown={handleThumbMouseDown}
                      />
                    </div>
                  )}
                </div>

                {/* RIGHT - Action Panel */}
                <div className="slm-action-panel">
                  {renderActionPanel()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneLevelManager;