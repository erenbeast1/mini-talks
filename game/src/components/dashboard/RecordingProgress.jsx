// src/components/dashboard/RecordingProgress.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
};

const RecordingProgress = ({ mini, isOpen, onClose, entityType = 'mini' }) => {
  const [loading, setLoading] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [stats, setStats] = useState({
    totalRecordings: 0,
    totalRecordingTime: '00:00:00',
    longestScene: '',
    longestLevel: '',
    averageDuration: '00:00'
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('DESC');
  const [scrollPercent, setScrollPercent] = useState(0);
  const tableBodyRef = React.useRef(null);

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
  const entityName = mini?.mini_name || mini?.builder_name || 'Mini';

  useEffect(() => {
    if (isOpen && entityId) {
      fetchProgress();
    }
  }, [isOpen, entityId, sortBy, sortDir]);

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
  }, [recordings, screenSize]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const apiUrl = entityType === 'builder'
        ? `https://mini-talks.org/minitalks-api/builder/get-recordings.php?builder_id=${entityId}&sort_by=${sortBy}&sort_dir=${sortDir}`
        : `https://mini-talks.org/minitalks-api/recording/get-recordings.php?mini_id=${entityId}&sort_by=${sortBy}&sort_dir=${sortDir}`;
      const response = await axios.get(apiUrl);
      if (response.data?.success) {
        setRecordings(response.data.data.recordings || response.data.data || []);
        setStats(response.data.data.stats || getEmptyStats());
      } else {
        setRecordings([]);
        setStats(getEmptyStats());
      }
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
      setRecordings([]);
      setStats(getEmptyStats());
    } finally {
      setLoading(false);
    }
  };

  const getEmptyStats = () => ({
    totalRecordings: 0,
    totalRecordingTime: '00:00:00',
    longestScene: '-',
    longestLevel: '-',
    averageDuration: '00:00'
  });

  // ══════ CSV DOWNLOAD ══════
  const handleDownloadCSV = () => {
    if (!recordings.length) return;

    const headers = ['Date', 'Time', 'Scene', 'Level', 'Duration'];
    const rows = recordings.map(rec => [
      rec.date || '',
      rec.time || '',
      rec.scene || '',
      rec.level || '',
      rec.duration || ''
    ]);

    const statsRows = [
      [],
      ['--- Summary ---'],
      ['Total Recordings', stats.totalRecordings],
      ['Total Recording Time', stats.totalRecordingTime],
      ['Scene with Longest Recording', stats.longestScene],
      ['Level with Longest Recording', stats.longestLevel],
      ['Average Recording Duration', stats.averageDuration],
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ...statsRows.map(row => row.join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Recording_Progress_${entityName.replace(/\s+/g, '_')}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sort Header Component with up/down arrows - Figma style
  const SortHeader = ({ label, field, isLast = false }) => {
    const isActive = sortBy === field;
    return (
      <div 
        onClick={() => { setSortBy(field); setSortDir(sortBy === field && sortDir === 'DESC' ? 'ASC' : 'DESC'); }}
        className="recp-sort-header"
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
          <svg className="recp-sort-arrow" width="20" height="20" viewBox="0 0 24 24" style={{ opacity: isActive && sortDir === 'DESC' ? 1 : 0.5 }}>
            <circle cx="12" cy="12" r="11" fill="white"/>
            <path d="M7 10L12 15L17 10" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          {/* Up arrow */}
          <svg className="recp-sort-arrow" width="20" height="20" viewBox="0 0 24 24" style={{ opacity: isActive && sortDir === 'ASC' ? 1 : 0.5 }}>
            <circle cx="12" cy="12" r="11" fill="white"/>
            <path d="M7 14L12 9L17 14" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
      </div>
    );
  };

  // Stat Card Component with underline
  const StatCard = ({ label, value, isLast = false }) => (
    <div style={{ marginBottom: isLast ? '0' : '12px' }}>
      <div className="recp-stat-label" style={{ 
        color: COLORS.white, 
        fontSize: '13px', 
        fontWeight: 700, 
        marginBottom: '6px',
        paddingBottom: '4px',
        borderBottom: '2px solid rgba(255,255,255,0.3)',
        fontFamily: "'Montserrat', sans-serif"
      }}>
        {label}
      </div>
      <div className="recp-stat-value" style={{
        backgroundColor: COLORS.white,
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: "'Montserrat', sans-serif"
      }}>
        {value}
      </div>
    </div>
  );

  if (!isOpen) return null;

  // Tablo (header + body) — PC ve mobil paylaşır
  const renderTable = () => (
    <div className="recp-table-wrap">
      {/* Table Header */}
      <div className="recp-table-header">
        <SortHeader label="Date" field="date" />
        <SortHeader label="Time" field="time" />
        <SortHeader label="Scene" field="scene" />
        <SortHeader label="Level" field="level" />
        <SortHeader label="Duration" field="duration" isLast={true} />
      </div>

      {/* Table Body - Scrollable */}
      <div className="recp-table-body" ref={tableBodyRef}>
        {recordings.map((rec, index) => (
          <div key={rec.id || index} className="recp-table-row">
            <div className="recp-cell recp-cell-center">{rec.date}</div>
            <div className="recp-cell recp-cell-center">{rec.time}</div>
            <div className="recp-cell recp-cell-center">{rec.scene}</div>
            <div className="recp-cell recp-cell-center">{rec.level}</div>
            <div className="recp-cell recp-cell-center" style={{ borderRight: 'none' }}>{rec.duration}</div>
          </div>
        ))}
        
        {/* Empty rows for design */}
        {Array.from({ length: Math.max(0, 10 - recordings.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="recp-table-row">
            <div className="recp-cell recp-cell-center">&nbsp;</div>
            <div className="recp-cell recp-cell-center">&nbsp;</div>
            <div className="recp-cell recp-cell-center">&nbsp;</div>
            <div className="recp-cell recp-cell-center">&nbsp;</div>
            <div className="recp-cell recp-cell-center" style={{ borderRight: 'none' }}>&nbsp;</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Stats kartları (PC ve mobil paylaşır) — CSV butonu hariç
  const renderStatCards = () => (
    <>
      <StatCard label="Total Recordings" value={stats.totalRecordings} />
      <StatCard label="Total Recording Time" value={stats.totalRecordingTime} />
      <StatCard label="Scene with the Longest Recording Time:" value={stats.longestScene} />
      <StatCard label="Level with the Longest Recording Time:" value={stats.longestLevel} />
      <StatCard label="Average Recording Duration:" value={stats.averageDuration} isLast={true} />
    </>
  );

  const styles = `
    .recp-overlay {
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
    .recp-modal-wrapper {
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
    .recp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .recp-modal {
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
    .recp-header {
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
    .recp-content {
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
    .recp-title-row {
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
    .recp-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .recp-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .recp-ok-btn {
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
    .recp-ok-btn:hover {
      background: #0066CC;
    }
    .recp-main {
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
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
    }
    .recp-table-section {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 8px;
      min-width: 0;
      -webkit-min-width: 0;
      width: 620px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      position: relative;
    }
    .recp-table-wrap {
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
      margin-right: 22px;
    }
    .recp-scrollbar-track {
      width: 14px;
      background: ${COLORS.gray};
      border-radius: 7px;
      position: absolute;
      right: 0;
      top: 70px;
      bottom: 3px;
    }
    .recp-scrollbar-thumb {
      width: 14px;
      background: ${COLORS.green};
      border-radius: 7px;
      position: absolute;
      top: 0;
      left: 0;
      cursor: pointer;
      min-height: 40px;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .recp-scrollbar-thumb:hover {
      background: ${COLORS.darkGreen};
    }
    .recp-table-header {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 1fr 1.2fr 1fr 1fr;
      grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr;
      background: ${COLORS.green};
      color: ${COLORS.white};
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .recp-table-body {
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
    .recp-table-body::-webkit-scrollbar {
      display: none;
    }
    .recp-table-row {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 1fr 1.2fr 1fr 1fr;
      grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr;
      border-bottom: 2px solid ${COLORS.green};
      background: ${COLORS.white};
    }
    .recp-cell {
      padding: 12px 10px;
      font-size: 14px;
      border-right: 1px solid ${COLORS.green};
      font-family: 'Montserrat', sans-serif;
    }
    .recp-cell:last-child {
      border-right: none;
    }
    .recp-cell-center {
      text-align: center;
    }
    .recp-stats-panel {
      width: 320px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      background: ${COLORS.green};
      border-radius: 12px;
      padding: 24px 20px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-align-self: center;
      align-self: center;
      height: auto;
    }
    .recp-csv-btn {
      margin-top: 14px;
      background: ${COLORS.white};
      color: ${COLORS.green};
      border: 2px solid rgba(255,255,255,0.4);
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      font-family: 'Montserrat', sans-serif;
      -webkit-appearance: none;
      appearance: none;
      -webkit-transition: background-color 0.2s, color 0.2s;
      transition: background-color 0.2s, color 0.2s;
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
      width: 100%;
    }
    .recp-csv-btn:hover {
      background: ${COLORS.darkGreen};
      color: ${COLORS.white};
    }
    .recp-csv-btn:hover svg {
      stroke: ${COLORS.white};
    }
    .recp-csv-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .recp-loading {
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
    .recp-mobile-overlay {
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
    .recp-m-content {
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
    .recp-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    .recp-m-main {
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
    /* Sol dikey kolon: tablo + alt butonlar */
    .recp-m-leftcol {
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
    /* Sol tablo bölümü + dış scrollbar — kolon içinde kalan alan */
    .recp-m-main .recp-table-section {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      width: auto;
      min-width: 0;
      min-height: 0;
    }
    /* Sağ stats paneli — tam boy */
    .recp-m-main .recp-stats-panel {
      width: 42%;
      max-width: 320px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      padding: 12px 12px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      -webkit-align-self: stretch;
      align-self: stretch;
      -webkit-box-pack: start;
      -webkit-justify-content: flex-start;
      justify-content: flex-start;
      min-height: 0;
    }
    /* Mobilde tablo kompakt */
    .recp-m-main .recp-sort-header { padding: 6px 3px !important; font-size: 11px !important; gap: 3px !important; }
    .recp-m-main .recp-sort-arrow { width: 15px !important; height: 15px !important; }
    .recp-m-main .recp-cell { padding: 7px 3px; font-size: 10px; }
    /* Mobilde stats kompakt */
    .recp-m-main .recp-stat-label { font-size: 10px !important; margin-bottom: 4px !important; }
    .recp-m-main .recp-stat-value { font-size: 11px !important; padding: 7px 9px !important; }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    const thumbH = 56;
    return (
      <div className="recp-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="recp-m-content">
          {/* Başlık */}
          <div className="recp-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Recording Progress
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '550px', lineHeight: 1.4, fontFamily: "'Montserrat', sans-serif" }}>
              Track your Mini's recording activity across all scenes and levels.
            </p>
          </div>

          {loading ? (
            <div className="recp-loading">Loading...</div>
          ) : (
            <div className="recp-m-main">
              {/* SOL — dikey kolon: tablo + altında Ok/CSV */}
              <div className="recp-m-leftcol">
                <div className="recp-table-section">
                  {renderTable()}
                  {/* Dış yeşil scrollbar */}
                  <div className="recp-scrollbar-track">
                    <div 
                      className="recp-scrollbar-thumb" 
                      style={{ 
                        height: `${thumbH}px`,
                        top: `${scrollPercent}%`,
                        transform: `translateY(-${scrollPercent}%)`
                      }}
                    />
                  </div>
                </div>

                {/* Sol kolonun altında ortalı: Download CSV + Ok */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', flexShrink: 0, paddingTop: '8px' }}>
                  <button
                    onClick={handleDownloadCSV}
                    disabled={!recordings.length}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: COLORS.white, color: COLORS.green, border: `2px solid ${COLORS.green}`,
                      borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: 700,
                      cursor: recordings.length ? 'pointer' : 'not-allowed', opacity: recordings.length ? 1 : 0.4,
                      fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download CSV
                  </button>
                  <button onClick={onClose} style={{
                    width: '110px', height: '40px', background: COLORS.blue, color: COLORS.white, border: 'none',
                    borderRadius: '8px', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
                  }}>
                    Ok
                  </button>
                </div>
              </div>

              {/* SAĞ — Stats paneli (tam boy) */}
              <div className="recp-stats-panel">
                {renderStatCards()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="recp-overlay">
      <style>{styles}</style>
      
      <div className="recp-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="recp-brick-border" />
        
        <div className="recp-modal">
          {/* Logo */}
          <div className="recp-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* White Content Area */}
          <div className="recp-content">
            {/* Header */}
            <div className="recp-title-row">
              <div className="recp-btn-spacer" />
              <div className="recp-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Recording Progress
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '550px', lineHeight: 1.4, fontFamily: "'Montserrat', sans-serif" }}>
                  Track your Mini's recording activity across all scenes and levels.
                  See how often they record, how long they speak, and where they feel most comfortable.
                </p>
              </div>
              <button onClick={onClose} className="recp-ok-btn">
                Ok
              </button>
            </div>

            {loading ? (
              <div className="recp-loading">Loading...</div>
            ) : (
              /* Main Content */
              <div className="recp-main">
                {/* LEFT - Table with external scrollbar */}
                <div className="recp-table-section">
                  {renderTable()}
                  
                  {/* External Scrollbar Track */}
                  <div className="recp-scrollbar-track">
                    <div 
                      className="recp-scrollbar-thumb" 
                      style={{ 
                        height: '80px',
                        top: `${scrollPercent}%`,
                        transform: `translateY(-${scrollPercent}%)`
                      }}
                    ></div>
                  </div>
                </div>

                {/* RIGHT - Stats Panel */}
                <div className="recp-stats-panel">
                  {renderStatCards()}

                  {/* CSV Download — stats panelinin altında */}
                  <button 
                    onClick={handleDownloadCSV}
                    disabled={!recordings.length || loading}
                    className="recp-csv-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingProgress;