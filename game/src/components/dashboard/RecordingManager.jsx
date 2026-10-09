// src/components/dashboard/RecordingManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertPopup, ConfirmPopup } from '../popups/AlertSystem';

import logoHead from '../../assets/logo-head.png';
import logoText from '../../assets/logo-text.png';

// Brick Border
import BrickBorder from '../../assets/12-yesil.png';

const COLORS = {
  green: '#237841',
  darkGreen: '#1a5c32',
  white: '#FFFFFF',
  gray: '#D8D8D8',
  darkGray: '#666666',
  blue: '#0055BF',
  red: '#E52828',
  lightRed: '#FFEBEE',
  lightGreen: '#E8F5E9',
};

const RecordingManager = ({ mini, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [filteredRecordings, setFilteredRecordings] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [levels, setLevels] = useState([]);
  const [selectedRecordings, setSelectedRecordings] = useState([]);
  const [scrollPercent, setScrollPercent] = useState(0);
  const tableBodyRef = React.useRef(null);
  
  // Alert/Confirm popup states
  const [alertPopup, setAlertPopup] = useState({ show: false, title: '', message: '', theme: 'info' });
  const [confirmPopup, setConfirmPopup] = useState({ show: false, title: '', message: '', onConfirm: null });
  
  // Sort
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('DESC');
  
  // Filters
  const [dateFilter, setDateFilter] = useState('all');
  const [sceneFilter, setSceneFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [keepOption, setKeepOption] = useState('all');
  
  // Dropdowns
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showSceneDropdown, setShowSceneDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showKeepDropdown, setShowKeepDropdown] = useState(false);

  // Mobil: aktif popup ('date' | 'scene' | 'level' | 'keep' | null)
  const [mActivePopup, setMActivePopup] = useState(null);

  // Pending delete state for confirmation
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteType, setPendingDeleteType] = useState(null);
  const [pendingKeepData, setPendingKeepData] = useState(null);

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
      fetchRecordings();
      fetchScenesAndLevels();
    }
  }, [isOpen, mini]);

  useEffect(() => {
    applyFilters();
  }, [recordings, dateFilter, sceneFilter, levelFilter, sortBy, sortDir]);

  // Scroll sync
  useEffect(() => {
    const tableBody = tableBodyRef.current;
    if (!tableBody) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = tableBody;
      const maxScroll = scrollHeight - clientHeight;
      const percent = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      setScrollPercent(percent);
    };
    
    tableBody.addEventListener('scroll', handleScroll);
    return () => tableBody.removeEventListener('scroll', handleScroll);
  }, [filteredRecordings, screenSize]);

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/recording/get-recordings.php?mini_id=${mini.mini_id}&sort_by=${sortBy}&sort_dir=${sortDir}`
      );
      if (response.data?.success) {
        setRecordings(response.data.data.recordings || []);
      } else {
        setRecordings([]);
      }
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchScenesAndLevels = async () => {
    try {
      const scenesRes = await axios.get('https://mini-talks.org/minitalks-api/scene-level/get-scenes.php');
      if (scenesRes.data?.success) {
        setScenes(scenesRes.data.data || []);
      }
      
      const levelsRes = await axios.get('https://mini-talks.org/minitalks-api/scene-level/get-levels.php');
      if (levelsRes.data?.success) {
        setLevels(levelsRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch scenes/levels:', error);
      setScenes([]);
      setLevels([
        { level_id: 1, level_name: 'Sound' },
        { level_id: 2, level_name: 'Word' },
        { level_id: 3, level_name: 'Sentence' },
        { level_id: 4, level_name: 'Dialogue' }
      ]);
    }
  };

  const applyFilters = () => {
    let filtered = [...recordings];
    
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(rec => {
        const recDate = new Date(rec.recorded_at || rec.date);
        const diffDays = Math.floor((now - recDate) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case 'today': return diffDays === 0;
          case 'week': return diffDays <= 7;
          case 'month': return diffDays <= 30;
          case 'older': return diffDays > 30;
          default: return true;
        }
      });
    }
    
    if (sceneFilter !== 'all') {
      filtered = filtered.filter(rec => rec.scene === sceneFilter);
    }
    
    if (levelFilter !== 'all') {
      filtered = filtered.filter(rec => rec.level === levelFilter);
    }
    
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'date':
          aVal = new Date(a.recorded_at || a.date);
          bVal = new Date(b.recorded_at || b.date);
          break;
        case 'scene':
          aVal = a.scene || '';
          bVal = b.scene || '';
          break;
        case 'level':
          aVal = a.level || '';
          bVal = b.level || '';
          break;
        case 'duration':
          aVal = a.duration_seconds || 0;
          bVal = b.duration_seconds || 0;
          break;
        default:
          aVal = a.date;
          bVal = b.date;
      }
      
      if (sortDir === 'ASC') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    setFilteredRecordings(filtered);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortDir('DESC');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRecordings(filteredRecordings.map(r => r.recording_id));
    } else {
      setSelectedRecordings([]);
    }
  };

  const handleSelectRecording = (recordingId) => {
    setSelectedRecordings(prev => {
      if (prev.includes(recordingId)) {
        return prev.filter(id => id !== recordingId);
      } else {
        return [...prev, recordingId];
      }
    });
  };

  const handleDeleteRecording = (recordingId) => {
    setPendingDeleteId(recordingId);
    setPendingDeleteType('single');
    setConfirmPopup({
      show: true,
      title: 'Delete Confirmation',
      message: 'Are you sure you want to delete this recording?\nThis action cannot be undone.',
      theme: 'error',
      confirmTheme: 'danger'
    });
  };

  const handleDeleteFiltered = () => {
    if (filteredRecordings.length === 0) {
      setAlertPopup({
        show: true,
        title: 'Warning',
        message: 'No recordings to delete',
        theme: 'warning'
      });
      return;
    }
    
    setPendingDeleteType('filtered');
    setConfirmPopup({
      show: true,
      title: 'Delete Confirmation',
      message: `Are you sure you want to delete ${filteredRecordings.length} recording(s)?\nThis action cannot be undone.`,
      theme: 'error',
      confirmTheme: 'danger'
    });
  };

  const handleKeepRecordings = (option) => {
    setKeepOption(option);
    setShowKeepDropdown(false);
    
    if (option === 'all') return;
    
    let keepCount = 0;
    let keepDays = 0;
    
    switch (option) {
      case '50': keepCount = 50; break;
      case '10': keepCount = 10; break;
      case '30days': keepDays = 30; break;
      case '7days': keepDays = 7; break;
    }
    
    setPendingDeleteType('keep');
    setPendingKeepData({ keepCount, keepDays });
    setConfirmPopup({
      show: true,
      title: 'Delete Old Recordings?',
      message: 'This will delete older recordings.\nThis action cannot be undone.',
      theme: 'warning',
      confirmTheme: 'danger'
    });
  };

  const handleConfirmAction = async () => {
    setConfirmPopup({ ...confirmPopup, show: false });
    
    try {
      if (pendingDeleteType === 'single' && pendingDeleteId) {
        await axios.post('https://mini-talks.org/minitalks-api/recording/delete-recording.php', {
          recording_id: pendingDeleteId
        });
        fetchRecordings();
        setAlertPopup({ show: true, title: 'Success!', message: 'Recording deleted successfully!', theme: 'success' });
      } 
      else if (pendingDeleteType === 'filtered') {
        const ids = filteredRecordings.map(r => r.recording_id);
        await axios.post('https://mini-talks.org/minitalks-api/recording/delete-recordings.php', {
          recording_ids: ids
        });
        fetchRecordings();
        setSelectedRecordings([]);
        setAlertPopup({ show: true, title: 'Success!', message: 'Recordings deleted successfully!', theme: 'success' });
      }
      else if (pendingDeleteType === 'keep' && pendingKeepData) {
        await axios.post('https://mini-talks.org/minitalks-api/recording/keep-recordings.php', {
          mini_id: mini.mini_id,
          keep_count: pendingKeepData.keepCount,
          keep_days: pendingKeepData.keepDays
        });
        fetchRecordings();
        setAlertPopup({ show: true, title: 'Success!', message: 'Old recordings deleted successfully!', theme: 'success' });
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
      setAlertPopup({ show: true, title: 'Oops!', message: 'Operation failed. Please try again.', theme: 'error' });
    }
    
    setPendingDeleteId(null);
    setPendingDeleteType(null);
    setPendingKeepData(null);
  };

  const handleCancelConfirm = () => {
    setConfirmPopup({ ...confirmPopup, show: false });
    if (pendingDeleteType === 'keep') {
      setKeepOption('all');
    }
    setPendingDeleteId(null);
    setPendingDeleteType(null);
    setPendingKeepData(null);
  };

  const uniqueScenes = [...new Set(recordings.map(r => r.scene).filter(Boolean))];

  // Sort Header Component - Progress style with circle buttons
  const SortHeader = ({ label, field, isLast = false }) => {
    const isActive = sortBy === field;
    return (
      <div 
        onClick={() => handleSort(field)}
        className="recm-sort-header"
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
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '14px',
          borderRight: isLast ? 'none' : '1px solid rgba(255,255,255,0.3)',
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
          {/* Down arrow */}
          <svg className="recm-sort-arrow" width="20" height="20" viewBox="0 0 24 24" style={{ opacity: isActive && sortDir === 'DESC' ? 1 : 0.5 }}>
            <circle cx="12" cy="12" r="11" fill="white"/>
            <path d="M7 10L12 15L17 10" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          {/* Up arrow */}
          <svg className="recm-sort-arrow" width="20" height="20" viewBox="0 0 24 24" style={{ opacity: isActive && sortDir === 'ASC' ? 1 : 0.5 }}>
            <circle cx="12" cy="12" r="11" fill="white"/>
            <path d="M7 14L12 9L17 14" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
      </div>
    );
  };

  // Dropdown Component (DESKTOP)
  const FilterDropdown = ({ label, value, options, isOpen, setIsOpen, onSelect, openUp = true }) => (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: '-webkit-flex',
          display: 'flex',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          border: `2px solid ${COLORS.green}`,
          borderRadius: '8px',
          backgroundColor: COLORS.white,
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          width: '100%',
          WebkitJustifyContent: 'space-between',
          justifyContent: 'space-between',
          fontFamily: "'Montserrat', sans-serif",
          WebkitAppearance: 'none',
          appearance: 'none'
        }}
      >
        {label}
        <svg width="18" height="18" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill={COLORS.green}/>
          <path d={isOpen ? "M7 14L12 9L17 14" : "M7 10L12 15L17 10"} stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          ...(openUp ? { bottom: '100%', marginBottom: '4px' } : { top: '100%', marginTop: '4px' }),
          left: 0,
          right: 0,
          backgroundColor: COLORS.white,
          border: `2px solid ${COLORS.green}`,
          borderRadius: '8px',
          zIndex: 100,
          maxHeight: '180px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxShadow: openUp ? '0 -4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {options.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => { onSelect(opt.value); setIsOpen(false); }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: value === opt.value ? COLORS.lightGreen : COLORS.white,
                fontSize: '12px',
                borderBottom: idx < options.length - 1 ? `1px solid ${COLORS.gray}` : 'none',
                fontFamily: "'Montserrat', sans-serif"
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // MOBİL: dropdown yerine popup açan buton
  const MobileFilterButton = ({ label, popupKey }) => (
    <button
      onClick={() => setMActivePopup(popupKey)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
        padding: '8px 10px', border: `2px solid ${COLORS.green}`, borderRadius: '8px',
        backgroundColor: COLORS.white, cursor: 'pointer', fontSize: '11px', fontWeight: 600,
        width: '100%', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
      }}
    >
      {label}
      <svg width="16" height="16" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill={COLORS.green}/>
        <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    </button>
  );

  // Filtre seçenekleri (popup için)
  const FILTER_CONFIG = {
    keep: {
      title: 'Keep Recent Recordings',
      value: keepOption,
      onSelect: handleKeepRecordings,
      options: [
        { value: 'all', label: 'Keep all recordings' },
        { value: '50', label: 'Keep last 50 recordings' },
        { value: '10', label: 'Keep last 10 recordings' },
        { value: '30days', label: 'Keep last 30 days' },
        { value: '7days', label: 'Keep last 7 days' }
      ]
    },
    date: {
      title: 'Select Date',
      value: dateFilter,
      onSelect: setDateFilter,
      options: [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'older', label: 'Older than 1 Month' }
      ]
    },
    scene: {
      title: 'Select Scenes',
      value: sceneFilter,
      onSelect: setSceneFilter,
      options: [
        { value: 'all', label: 'All Scenes' },
        ...uniqueScenes.map(s => ({ value: s, label: s }))
      ]
    },
    level: {
      title: 'Select Levels',
      value: levelFilter,
      onSelect: setLevelFilter,
      options: [
        { value: 'all', label: 'All Levels' },
        { value: 'Sound', label: 'Sound' },
        { value: 'Word', label: 'Word' },
        { value: 'Sentence', label: 'Sentence' },
        { value: 'Dialogue', label: 'Dialogue' }
      ]
    }
  };

  if (!isOpen) return null;

  // Tablo (PC + mobil paylaşır)
  const renderTable = () => (
    <div className="recm-table-wrap">
      {/* Table Header */}
      <div className="recm-table-header">
        <div className="recm-check-cell" style={{ 
          padding: '10px 6px', 
          display: '-webkit-flex', 
          display: 'flex', 
          WebkitAlignItems: 'center',
          alignItems: 'center', 
          WebkitJustifyContent: 'center',
          justifyContent: 'center', 
          borderRight: '1px solid rgba(255,255,255,0.3)' 
        }}>
          <input 
            type="checkbox" 
            onChange={handleSelectAll}
            checked={selectedRecordings.length === filteredRecordings.length && filteredRecordings.length > 0}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
        </div>
        <SortHeader label="Date" field="date" />
        <SortHeader label="Time" field="time" />
        <SortHeader label="Scene" field="scene" />
        <SortHeader label="Level" field="level" />
        <SortHeader label="Duration" field="duration" isLast={true} />
      </div>

      {/* Table Body */}
      <div className="recm-table-body" ref={tableBodyRef}>
        {filteredRecordings.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: COLORS.darkGray }}>
            No recordings found
          </div>
        ) : (
          filteredRecordings.map((rec, index) => (
            <div
              key={rec.recording_id || index}
              className="recm-table-row"
              style={{
                backgroundColor: selectedRecordings.includes(rec.recording_id) ? COLORS.lightGreen : COLORS.white
              }}
            >
              <div className="recm-cell recm-check-cell">
                <input 
                  type="checkbox" 
                  checked={selectedRecordings.includes(rec.recording_id)}
                  onChange={() => handleSelectRecording(rec.recording_id)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
              <div className="recm-cell">{rec.date}</div>
              <div className="recm-cell">{rec.time}</div>
              <div className="recm-cell">{rec.scene}</div>
              <div className="recm-cell">{rec.level}</div>
              <div className="recm-cell" style={{ borderRight: 'none', gap: '6px' }}>
                <span>{rec.duration}</span>
                <button
                  onClick={() => handleDeleteRecording(rec.recording_id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                    color: COLORS.red, fontSize: '14px', WebkitAppearance: 'none', appearance: 'none'
                  }}
                  title="Delete recording"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const styles = `
    .recm-overlay {
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
    .recm-modal-wrapper {
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
    .recm-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .recm-modal {
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
    .recm-header {
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
    .recm-content {
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
    .recm-title-row {
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
    .recm-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .recm-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .recm-ok-btn {
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
      font-family: 'Montserrat', sans-serif;
      -webkit-appearance: none;
      appearance: none;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .recm-ok-btn:hover {
      background: #0066CC;
    }
    .recm-main {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 16px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
    }
    .recm-table-section {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 12px;
      min-height: 0;
      -webkit-min-height: 0;
    }
    .recm-table-wrap {
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
    .recm-table-header {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 40px 1fr 1fr 1.2fr 1fr 1fr;
      grid-template-columns: 40px 1fr 1fr 1.2fr 1fr 1fr;
      background: ${COLORS.green};
      color: ${COLORS.white};
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .recm-table-body {
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
    .recm-table-body::-webkit-scrollbar {
      display: none;
    }
    .recm-table-row {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 40px 1fr 1fr 1.2fr 1fr 1fr;
      grid-template-columns: 40px 1fr 1fr 1.2fr 1fr 1fr;
      border-bottom: 2px solid ${COLORS.green};
      background: ${COLORS.white};
    }
    .recm-cell {
      padding: 12px 8px;
      font-size: 13px;
      border-right: 1px solid ${COLORS.green};
      font-family: 'Montserrat', sans-serif;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      text-align: center;
    }
    .recm-cell:last-child {
      border-right: none;
    }
    .recm-scrollbar-track {
      width: 14px;
      background: ${COLORS.gray};
      border-radius: 7px;
      position: relative;
      margin-top: 70px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-align-self: stretch;
      align-self: stretch;
    }
    .recm-scrollbar-thumb {
      width: 14px;
      background: ${COLORS.green};
      border-radius: 7px;
      position: absolute;
      left: 0;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .recm-scrollbar-thumb:hover {
      background: ${COLORS.darkGreen};
    }
    .recm-controls {
      width: 260px;
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
    }
    .recm-info-box {
      border: 2px solid;
      border-radius: 8px;
      padding: 10px;
      font-size: 11px;
      line-height: 1.35;
      font-family: 'Montserrat', sans-serif;
    }
    .recm-info-green {
      border-color: ${COLORS.green};
      color: ${COLORS.darkGreen};
    }
    .recm-info-red {
      border-color: ${COLORS.red};
      color: ${COLORS.red};
    }
    .recm-delete-btn {
      width: 100%;
      padding: 10px 16px;
      background: ${COLORS.red};
      color: ${COLORS.white};
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Montserrat', sans-serif;
      -webkit-appearance: none;
      appearance: none;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .recm-delete-btn:hover {
      background: #C92020;
    }
    .recm-filters {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 6px;
    }
    .recm-loading {
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
    .recm-mobile-overlay {
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
    .recm-m-content {
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
    .recm-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    .recm-m-main {
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
    .recm-m-main .recm-table-section {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
    }
    /* Mobilde tablo kompakt */
    .recm-m-main .recm-table-header,
    .recm-m-main .recm-table-row {
      -ms-grid-columns: 30px 1fr 1fr 1.1fr 1fr 1.1fr;
      grid-template-columns: 30px 1fr 1fr 1.1fr 1fr 1.1fr;
    }
    .recm-m-main .recm-sort-header { padding: 6px 2px !important; font-size: 10px !important; gap: 3px !important; }
    .recm-m-main .recm-sort-arrow { width: 14px !important; height: 14px !important; }
    .recm-m-main .recm-cell { padding: 7px 2px; font-size: 9px; }
    .recm-m-main .recm-check-cell input { width: 13px !important; height: 13px !important; }
    .recm-m-main .recm-scrollbar-track { margin-top: 44px; width: 10px; }
    .recm-m-main .recm-scrollbar-thumb { width: 10px; }
    /* Sağ kontroller */
    .recm-m-controls {
      width: 42%;
      max-width: 280px;
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
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      min-height: 0;
    }
    .recm-m-controls .recm-info-box { font-size: 9px; padding: 7px; }
    /* Filtre popup — MotivationMessagesManager pattern */
    .recm-popup-overlay {
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
    .recm-popup {
      background: ${COLORS.green};
      border-radius: 18px;
      padding: 16px;
      width: 320px;
      max-width: 88vw;
    }
    .recm-popup-inner {
      background: ${COLORS.white};
      border-radius: 12px;
      padding: 14px 16px;
    }
  `;

  // ── Mobil filtre popup (MotivationMessagesManager pattern) ──
  const renderFilterPopup = () => {
    if (!mActivePopup) return null;
    const cfg = FILTER_CONFIG[mActivePopup];
    if (!cfg) return null;
    return (
      <div className="recm-popup-overlay" onClick={() => setMActivePopup(null)}>
        <div className="recm-popup" onClick={(e) => e.stopPropagation()}>
          <div style={{ color: COLORS.white, fontWeight: 900, fontSize: '20px', textAlign: 'center', marginBottom: '12px', fontFamily: "'Montserrat', sans-serif" }}>
            {cfg.title}
          </div>
          <div className="recm-popup-inner">
            {cfg.options.map((opt, idx) => {
              const isSel = cfg.value === opt.value;
              return (
                <div
                  key={idx}
                  onClick={() => cfg.onSelect(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 4px', cursor: 'pointer',
                    borderBottom: idx < cfg.options.length - 1 ? `1px solid ${COLORS.gray}` : 'none'
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: isSel ? 'none' : `2px solid ${COLORS.gray}`,
                    backgroundColor: isSel ? COLORS.blue : COLORS.white
                  }}>
                    {isSel && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>{opt.label}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', justifyContent: 'center' }}>
              <button
                onClick={() => setMActivePopup(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: `2px solid ${COLORS.green}`, background: COLORS.white,
                  color: COLORS.green, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setMActivePopup(null)}
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
      <div className="recm-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="recm-m-content">
          {/* Başlık */}
          <div className="recm-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Recording Manager
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '650px', lineHeight: 1.35, fontFamily: "'Montserrat', sans-serif" }}>
              Recordings are stored only on your Mini's device. Choose how many recent recordings should be kept.
            </p>
          </div>

          {loading ? (
            <div className="recm-loading">Loading...</div>
          ) : (
            <div className="recm-m-main">
              {/* SOL — Tablo + dış yeşil scrollbar */}
              <div className="recm-table-section">
                {renderTable()}
                {/* Dış yeşil scrollbar */}
                <div className="recm-scrollbar-track">
                  <div 
                    className="recm-scrollbar-thumb" 
                    style={{ 
                      height: '56px',
                      top: `${scrollPercent}%`,
                      transform: `translateY(-${scrollPercent}%)`
                    }}
                  />
                </div>
              </div>

              {/* SAĞ — Kontroller */}
              <div className="recm-m-controls">
                <div className="recm-info-box recm-info-green">
                  To save storage on your Mini's device, choose how many recent recordings will be kept. Older ones are auto-deleted; activity data stays here.
                </div>
                <MobileFilterButton label="Keep Recent Recordings" popupKey="keep" />
                <div className="recm-info-box recm-info-red">
                  This permanently deletes the audio file and the activity data. Use to clear unwanted recordings.
                </div>
                <button onClick={handleDeleteFiltered} className="recm-delete-btn" style={{ fontSize: '12px', padding: '9px 12px' }}>
                  Delete Filtered
                </button>
                <MobileFilterButton label="Select Date" popupKey="date" />
                <MobileFilterButton label="Select Scenes" popupKey="scene" />
                <MobileFilterButton label="Select Levels" popupKey="level" />
              </div>
            </div>
          )}

          {/* Alt: ortalı Ok */}
          {!loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, paddingTop: '8px' }}>
              <button onClick={onClose} style={{
                width: '140px', height: '42px', background: COLORS.blue, color: COLORS.white, border: 'none',
                borderRadius: '8px', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
              }}>
                Ok
              </button>
            </div>
          )}
        </div>

        {/* Filtre popup */}
        {renderFilterPopup()}

        {/* Alert / Confirm popup */}
        <AlertPopup
          show={alertPopup.show}
          onClose={() => setAlertPopup({ ...alertPopup, show: false })}
          title={alertPopup.title}
          message={alertPopup.message}
          theme={alertPopup.theme}
        />
        <ConfirmPopup
          show={confirmPopup.show}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelConfirm}
          title={confirmPopup.title}
          message={confirmPopup.message}
          theme={confirmPopup.theme || 'warning'}
          confirmTheme={confirmPopup.confirmTheme || 'danger'}
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="recm-overlay">
      <style>{styles}</style>
      
      <div className="recm-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="recm-brick-border" />
        
        <div className="recm-modal">
          {/* Logo */}
          <div className="recm-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* White Content Area */}
          <div className="recm-content">
            {/* Header */}
            <div className="recm-title-row">
              <div className="recm-btn-spacer" />
              <div className="recm-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Recording Manager
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '650px', lineHeight: 1.4, fontFamily: "'Montserrat', sans-serif" }}>
                  Recordings are stored only on your Mini's device for privacy and safety. Mini-Talks saves only the progress data, not the audio itself.
                  You can manage audio files on your Mini's device by choosing how many recent recordings should be kept.
                </p>
              </div>
              <button onClick={onClose} className="recm-ok-btn">
                Ok
              </button>
            </div>

            {loading ? (
              <div className="recm-loading">Loading...</div>
            ) : (
              <div className="recm-main">
                {/* Table Section with Scrollbar */}
                <div className="recm-table-section">
                  {renderTable()}
                  
                  {/* External Scrollbar Track */}
                  <div className="recm-scrollbar-track">
                    <div 
                      className="recm-scrollbar-thumb" 
                      style={{ 
                        height: '80px',
                        top: `${scrollPercent}%`,
                        transform: `translateY(-${scrollPercent}%)`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Controls Section - Right Side */}
                <div className="recm-controls">
                  {/* Keep Info Box */}
                  <div className="recm-info-box recm-info-green">
                    To save storage on your Mini's device, choose how many of the most recent recordings will be kept.
                    <br />
                    Older recordings on the device will be automatically deleted, but their activity data will remain visible here.
                  </div>

                  {/* Keep Recent Dropdown */}
                  <FilterDropdown
                    label="Keep Recent Recordings"
                    value={keepOption}
                    options={[
                      { value: 'all', label: 'Keep all recordings' },
                      { value: '50', label: 'Keep last 50 recordings' },
                      { value: '10', label: 'Keep last 10 recordings' },
                      { value: '30days', label: 'Keep last 30 days' },
                      { value: '7days', label: 'Keep last 7 days' }
                    ]}
                    isOpen={showKeepDropdown}
                    setIsOpen={setShowKeepDropdown}
                    onSelect={handleKeepRecordings}
                    openUp={false}
                  />

                  {/* Delete Info Box */}
                  <div className="recm-info-box recm-info-red">
                    This permanently deletes both the audio file on your Mini's device and the activity data shown in your dashboard.
                    <br />
                    Use this option for clearing unwanted recordings.
                  </div>

                  {/* Delete Button */}
                  <button onClick={handleDeleteFiltered} className="recm-delete-btn">
                    Delete Filtered
                  </button>

                  {/* Filters */}
                  <div className="recm-filters">
                    <FilterDropdown
                      label="Select Date"
                      value={dateFilter}
                      options={[
                        { value: 'all', label: 'All Time' },
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'This Week' },
                        { value: 'month', label: 'This Month' },
                        { value: 'older', label: 'Older than 1 Month' }
                      ]}
                      isOpen={showDateDropdown}
                      setIsOpen={(v) => { setShowDateDropdown(v); setShowSceneDropdown(false); setShowLevelDropdown(false); setShowKeepDropdown(false); }}
                      onSelect={setDateFilter}
                      openUp={true}
                    />

                    <FilterDropdown
                      label="Select Scenes"
                      value={sceneFilter}
                      options={[
                        { value: 'all', label: 'All Scenes' },
                        ...uniqueScenes.map(s => ({ value: s, label: s }))
                      ]}
                      isOpen={showSceneDropdown}
                      setIsOpen={(v) => { setShowSceneDropdown(v); setShowDateDropdown(false); setShowLevelDropdown(false); setShowKeepDropdown(false); }}
                      onSelect={setSceneFilter}
                      openUp={true}
                    />

                    <FilterDropdown
                      label="Select Levels"
                      value={levelFilter}
                      options={[
                        { value: 'all', label: 'All Levels' },
                        { value: 'Sound', label: 'Sound' },
                        { value: 'Word', label: 'Word' },
                        { value: 'Sentence', label: 'Sentence' },
                        { value: 'Dialogue', label: 'Dialogue' }
                      ]}
                      isOpen={showLevelDropdown}
                      setIsOpen={(v) => { setShowLevelDropdown(v); setShowDateDropdown(false); setShowSceneDropdown(false); setShowKeepDropdown(false); }}
                      onSelect={setLevelFilter}
                      openUp={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Popup */}
      <AlertPopup
        show={alertPopup.show}
        onClose={() => setAlertPopup({ ...alertPopup, show: false })}
        title={alertPopup.title}
        message={alertPopup.message}
        theme={alertPopup.theme}
      />

      {/* Confirm Popup */}
      <ConfirmPopup
        show={confirmPopup.show}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
        title={confirmPopup.title}
        message={confirmPopup.message}
        theme={confirmPopup.theme || 'warning'}
        confirmTheme={confirmPopup.confirmTheme || 'danger'}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default RecordingManager;