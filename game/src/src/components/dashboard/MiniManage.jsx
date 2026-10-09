// src/components/dashboard/MiniManage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Modal Components
import MotivationMessagesManager from './MotivationMessagesManager';
import MotivationMessagesProgress from './MotivationMessagesProgress';
import StreakManager from './StreakManager';
import StreakProgress from './StreakProgress';
import SceneLevelManager from './SceneLevelManager';
import SceneLevelProgress from './SceneLevelProgress';
import RewardsManager from './RewardsManager';
import RewardsProgress from './RewardsProgress';
import CustomMinisManager from './CustomMinisManager';
import CustomMinisProgress from './CustomMinisProgress';
import MissionsManager from './MissionsManager';
import MissionsProgress from './MissionsProgress';
import RecordingManager from './RecordingManager';
import RecordingProgress from './RecordingProgress';

// PNG Assets
import manageBtnImg from '../../assets/manage_btn.png';
import manageBtnHoverImg from '../../assets/manage_btn_hover.png';
import manageBtn2Img from '../../assets/manage_btn_2.png';
import manageBtn2HoverImg from '../../assets/manage_btn_2_hover.png';
import viewBtnImg from '../../assets/view_btn.png';
import viewBtnHoverImg from '../../assets/view_btn_hover.png';
import viewBtn2Img from '../../assets/view_btn_2.png';
import viewBtn2HoverImg from '../../assets/view_btn_2_hover.png';
import profileIcon from '../../assets/profile-icon.png';
import playBtnProfile from '../../assets/Play_Buton.png';
import playBtnProfileHover from '../../assets/Play_Buton_Hover.png';

// Figma Asset Imports
import bricksIcon from '../../assets/Bricks Icon.png';
import cupIcon from '../../assets/Cup Icon.png';
import medalsIcon from '../../assets/Medals Icon.png';
import lockIcon from '../../assets/Lock Icon.png';
import leftBtnBig from '../../assets/Left Buton_Buyuk.png';
import rightBtnBig from '../../assets/Right Buton_Buyuk.png';
import leftBtnSmall from '../../assets/Left Buton_Kucuk.png';
import rightBtnSmall from '../../assets/Right Buton_Kucuk.png';
import recordingsUpBtn from '../../assets/Recordings Up Buton.png';
import recordingsDownBtn from '../../assets/Recordings Down Buton.png';
import playBtn from '../../assets/Oynat_Butonu.png';
import scenesImage from '../../assets/Scenes Image_1.png';
import recordingsImage from '../../assets/Recordings Image.png';
import minisEnvironment from '../../assets/Minis Environment Image.png';

// Figma renkleri
const COLORS = {
  yellow: '#FFCC00',
  yellowBorder: '#E5B800',
  blue: '#0055BF',
  green: '#237841',
  red: '#E52828',
  white: '#FFFFFF',
  gray: '#D8D8D8',
  grayProgress: '#C9C9C9',
  brickGray: '#D9D9D9',
};

const MiniManage = ({ mini, onClose, onViewProfile, viewerRole = 'parent' }) => {
  const [viewMode, setViewMode] = useState('normal');
  
  const [recordings, setRecordings] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [missions, setMissions] = useState([]);
  const [customizations, setCustomizations] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 10, 1));
  const [loading, setLoading] = useState(true);
  
  const [profileManageHover, setProfileManageHover] = useState(false);
  const [profileViewHover, setProfileViewHover] = useState(false);
  const [profileOverlayHover, setProfileOverlayHover] = useState(false);
  const [profilePlayHover, setProfilePlayHover] = useState(false);
  
  // Manage overlay hover states
  const [recordingsManageHover, setRecordingsManageHover] = useState(false);
  const [streakManageHover, setStreakManageHover] = useState(false);
  const [missionsManageHover, setMissionsManageHover] = useState(false);
  const [rewardsManageHover, setRewardsManageHover] = useState(false);
  const [scenesManageHover, setScenesManageHover] = useState(false);
  const [customsManageHover, setCustomsManageHover] = useState(false);
  
  // View overlay hover states
  const [recordingsViewHover, setRecordingsViewHover] = useState(false);
  const [streakViewHover, setStreakViewHover] = useState(false);
  const [missionsViewHover, setMissionsViewHover] = useState(false);
  const [rewardsViewHover, setRewardsViewHover] = useState(false);
  const [scenesViewHover, setScenesViewHover] = useState(false);
  const [customsViewHover, setCustomsViewHover] = useState(false);
  
  const [scenesPage, setScenesPage] = useState(0);
  const [customsPage, setCustomsPage] = useState(0);
  
  // Modal states
  const [motivationManagerOpen, setMotivationManagerOpen] = useState(false);
  const [motivationProgressOpen, setMotivationProgressOpen] = useState(false);
  const [streakManagerOpen, setStreakManagerOpen] = useState(false);
  const [streakProgressOpen, setStreakProgressOpen] = useState(false);
  const [sceneLevelManagerOpen, setSceneLevelManagerOpen] = useState(false);
  const [sceneLevelProgressOpen, setSceneLevelProgressOpen] = useState(false);
  const [rewardsManagerOpen, setRewardsManagerOpen] = useState(false);
  const [rewardsProgressOpen, setRewardsProgressOpen] = useState(false);
  const [customMinisManagerOpen, setCustomMinisManagerOpen] = useState(false);
  const [customMinisProgressOpen, setCustomMinisProgressOpen] = useState(false);
  const [missionsManagerOpen, setMissionsManagerOpen] = useState(false);
  const [missionsProgressOpen, setMissionsProgressOpen] = useState(false);
  const [recordingManagerOpen, setRecordingManagerOpen] = useState(false);
  const [recordingProgressOpen, setRecordingProgressOpen] = useState(false);

  useEffect(() => {
    if (mini?.mini_id) {
      fetchMiniData();
    } else {
      loadDemoData();
    }
  }, [mini?.mini_id]);

  const fetchMiniData = async () => {
    try {
      setLoading(true);
      const [recordingsRes, scenesRes, missionsRes, customsRes, activityRes] = await Promise.all([
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-recordings.php?mini_id=${mini.mini_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-scenes.php?mini_id=${mini.mini_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-missions.php?mini_id=${mini.mini_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-customizations.php?mini_id=${mini.mini_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-activity.php?mini_id=${mini.mini_id}&month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`).catch(() => ({ data: { data: {} } }))
      ]);

      setRecordings(recordingsRes.data?.data?.length > 0 ? recordingsRes.data.data : getDemoRecordings());
      setScenes(scenesRes.data?.data?.length > 0 ? scenesRes.data.data : getDemoScenes());
      setMissions(missionsRes.data?.data?.length > 0 ? missionsRes.data.data : getDemoMissions());
      setCustomizations(customsRes.data?.data?.length > 0 ? customsRes.data.data : getDemoCustomizations());
      setCalendarData(Object.keys(activityRes.data?.data || {}).length > 0 ? activityRes.data.data : getDemoCalendarData());
    } catch (error) {
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    setRecordings(getDemoRecordings());
    setScenes(getDemoScenes());
    setMissions(getDemoMissions());
    setCustomizations(getDemoCustomizations());
    setCalendarData(getDemoCalendarData());
    setLoading(false);
  };

  const getDemoRecordings = () => [
    { recording_id: 1, scene_name: 'Basketball', word_name: 'Word', duration_seconds: 7, created_at: new Date().toISOString() },
    { recording_id: 2, scene_name: 'Basketball', word_name: 'Word', duration_seconds: 7, created_at: new Date().toISOString() },
    { recording_id: 3, scene_name: 'Basketball', word_name: 'Word', duration_seconds: 7, created_at: new Date().toISOString() },
    { recording_id: 4, scene_name: 'Basketball', word_name: 'Word', duration_seconds: 7, created_at: new Date().toISOString() }
  ];

  const getDemoScenes = () => [
    { scene_id: 1, scene_name: 'Basketball Court', is_locked: false, words_completed: 8, total_words: 8 },
    { scene_id: 2, scene_name: 'Classroom', is_locked: false, words_completed: 5, total_words: 8 },
    { scene_id: 3, scene_name: 'Market', is_locked: true, words_completed: 0, total_words: 8 }
  ];

  const getDemoMissions = () => [
    { mission_id: 1, mission_title: 'Record 2 levels today.', is_completed: true },
    { mission_id: 2, mission_title: 'Record 2 levels today.', is_completed: true }
  ];

  const getDemoCustomizations = () => [
    { customization_id: 1 },
    { customization_id: 2 },
    { customization_id: 3 }
  ];

  const getDemoCalendarData = () => {
    const data = {};
    data['2025-11-01'] = true;
    data['2025-11-02'] = true;
    data['2025-11-05'] = true;
    data['2025-11-06'] = true;
    data['2025-11-07'] = true;
    return data;
  };

  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevMonthDate = new Date(year, month, 0);
    
    let startPadding = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const totalCells = startPadding + daysInMonth;
    
    const needsReduction = totalCells > 35;
    if (needsReduction) {
      startPadding = 35 - daysInMonth;
      if (startPadding < 0) startPadding = 0;
    }
    
    const days = [];
    
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({ 
        day: prevMonthDate.getDate() - i, 
        isCurrentMonth: false, 
        isPrevMonth: true 
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ 
        day: i, 
        isCurrentMonth: true, 
        hasActivity: calendarData[dateStr] || false 
      });
    }
    
    let nextDay = 1;
    while (days.length < 35) {
      days.push({ 
        day: nextDay++, 
        isCurrentMonth: false, 
        isNextMonth: true 
      });
    }
    
    return days.slice(0, 35);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // ===== STREAK BRICK =====
  const StreakBrick = ({ hasActivity, isCurrentMonth, isPrevMonth, isNextMonth, day }) => {
    const isOtherMonth = isPrevMonth || isNextMonth;
    const isActive = hasActivity && isCurrentMonth;
    const brickOpacity = isOtherMonth ? 0.15 : (hasActivity ? 1 : 0.15);
    const textColor = isActive ? COLORS.blue : COLORS.white;
    const textOpacity = isOtherMonth ? 0.25 : 1;
    
    return (
      <div style={{ 
        width: '100%',
        aspectRatio: '1/1.2',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          width: '55%',
          height: '12%',
          backgroundColor: COLORS.brickGray,
          borderRadius: '1px 1px 0 0',
          opacity: brickOpacity,
          flexShrink: 0
        }} />
        <div style={{
          width: '100%',
          height: '88%',
          backgroundColor: COLORS.brickGray,
          borderRadius: '3px',
          opacity: brickOpacity,
          flexShrink: 0
        }} />
        <span style={{
          position: 'absolute',
          top: '58%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: textColor,
          fontSize: '14px',
          fontWeight: 800,
          opacity: textOpacity,
          fontFamily: "'Montserrat', sans-serif",
          lineHeight: 1
        }}>
          {day}
        </span>
      </div>
    );
  };

  const ProgressBrick = ({ completed, index }) => {
    const getColor = () => {
      if (!completed) return COLORS.grayProgress;
      if (index < 2) return COLORS.red;
      if (index < 4) return COLORS.yellow;
      if (index < 6) return COLORS.blue;
      return COLORS.green;
    };
    return (
      <div style={{ width: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '11px', height: '4px', backgroundColor: getColor(), borderRadius: '2px 2px 0 0' }} />
        <div style={{ width: '18px', height: '7px', backgroundColor: getColor(), borderRadius: '2px' }} />
      </div>
    );
  };

  const StrokedTitle = ({ children, style = {} }) => (
    <h3 style={{ 
      fontFamily: "'Montserrat', sans-serif",
      color: COLORS.white,
      WebkitTextStroke: '3px #000000',
      paintOrder: 'stroke fill',
      fontWeight: 900,
      margin: 0,
      ...style
    }}>
      {children}
    </h3>
  );

  // ===== MANAGE OVERLAY =====
  const ManageOverlay = ({ show, isHovered, onHover, onLeave, onManageClick }) => {
    if (!show) return null;
    return (
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <button onClick={onManageClick} onMouseEnter={onHover} onMouseLeave={onLeave} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          <img src={isHovered ? manageBtnHoverImg : manageBtnImg} alt="Manage" style={{ height: '48px' }} />
        </button>
      </div>
    );
  };

  // ===== VIEW OVERLAY =====
  const ViewOverlay = ({ show, isHovered, onHover, onLeave, onViewClick }) => {
    if (!show) return null;
    return (
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <button onClick={onViewClick} onMouseEnter={onHover} onMouseLeave={onLeave} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          <img src={isHovered ? viewBtnHoverImg : viewBtnImg} alt="View" style={{ height: '48px' }} />
        </button>
      </div>
    );
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}><div style={{ fontSize: '32px' }}>🧱 Loading...</div></div>;
  }

  const isManageMode = viewMode === 'manage';
  const isViewMode = viewMode === 'view';

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", paddingBottom: '32px' }}>
      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
        
        {/* PROFILE CARD */}
        <div style={{ 
          backgroundColor: COLORS.white,
          border: `5px solid ${COLORS.gray}`,
          borderRadius: '25px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {/* Üst kısım - Avatar ve isim */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%' }}>
            <div style={{ 
              width: '150px',
              height: '150px',
              backgroundColor: COLORS.yellow,
              borderRadius: '21px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <img src={profileIcon} alt={mini?.mini_name} style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
            </div>
            
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#000', marginBottom: '2px' }}>
              {mini?.mini_name || 'mini_name_01'}
            </div>
            
            <div style={{ fontSize: '22px', fontWeight: 900, textAlign: 'center', lineHeight: 1.1 }}>
              The bravest Mini<br/>ever!
            </div>
            
            {/* Profile Overlay - Beyaz yarı saydam, sadece üst kısımda */}
            {(isManageMode || isViewMode) && (
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                backgroundColor: 'rgba(255,255,255,0.7)', 
                borderRadius: '21px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 10 
              }}>
                <button 
                  onClick={() => {
                    if (isManageMode) {
                      setMotivationManagerOpen(true);
                    } else {
                      setMotivationProgressOpen(true);
                    }
                  }} 
                  onMouseEnter={() => setProfileOverlayHover(true)}
                  onMouseLeave={() => setProfileOverlayHover(false)}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {isManageMode ? (
                    <img src={profileOverlayHover ? manageBtnHoverImg : manageBtnImg} alt="Manage" style={{ height: '48px' }} />
                  ) : (
                    <img src={profileOverlayHover ? viewBtnHoverImg : viewBtnImg} alt="View" style={{ height: '48px' }} />
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Alt kısım - Butonlar (viewerRole'e göre) */}
          <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center', marginTop: '16px', position: 'relative', zIndex: 20 }}>
            {/* Parent: Manage + View */}
            {viewerRole === 'parent' && (
              <>
                <button
                  onClick={() => setViewMode(viewMode === 'manage' ? 'normal' : 'manage')}
                  onMouseEnter={() => setProfileManageHover(true)}
                  onMouseLeave={() => setProfileManageHover(false)}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img src={profileManageHover ? manageBtn2HoverImg : manageBtn2Img} alt="Manage" style={{ height: '44px' }} />
                </button>
                <button
                  onClick={() => setViewMode(viewMode === 'view' ? 'normal' : 'view')}
                  onMouseEnter={() => setProfileViewHover(true)}
                  onMouseLeave={() => setProfileViewHover(false)}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img src={profileViewHover ? viewBtn2HoverImg : viewBtn2Img} alt="View" style={{ height: '44px' }} />
                </button>
              </>
            )}
            
            {/* Expert: Sadece View */}
            {viewerRole === 'expert' && (
              <button
                onClick={() => setViewMode(viewMode === 'view' ? 'normal' : 'view')}
                onMouseEnter={() => setProfileViewHover(true)}
                onMouseLeave={() => setProfileViewHover(false)}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
              >
                <img src={profileViewHover ? viewBtn2HoverImg : viewBtn2Img} alt="View" style={{ height: '44px' }} />
              </button>
            )}
            
            {/* Child/Mini: Sadece Play */}
            {(viewerRole === 'child' || viewerRole === 'mini') && (
              <button
                onClick={() => console.log('Play clicked')}
                onMouseEnter={() => setProfilePlayHover(true)}
                onMouseLeave={() => setProfilePlayHover(false)}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
              >
                <img src={profilePlayHover ? playBtnProfileHover : playBtnProfile} alt="Play" style={{ height: '44px' }} />
              </button>
            )}
          </div>
        </div>

        {/* RECORDINGS */}
        <div style={{ backgroundColor: COLORS.yellow, borderRadius: '25px', padding: '16px', position: 'relative' }}>
          <ManageOverlay show={isManageMode} isHovered={recordingsManageHover} onHover={() => setRecordingsManageHover(true)} onLeave={() => setRecordingsManageHover(false)} onManageClick={() => setRecordingManagerOpen(true)} />
          <ViewOverlay show={isViewMode} isHovered={recordingsViewHover} onHover={() => setRecordingsViewHover(true)} onLeave={() => setRecordingsViewHover(false)} onViewClick={() => setRecordingProgressOpen(true)} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <StrokedTitle style={{ fontSize: '24px' }}>Recordings</StrokedTitle>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={recordingsDownBtn} alt="Down" style={{ height: '28px' }} />
              </button>
              <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={recordingsUpBtn} alt="Up" style={{ height: '28px' }} />
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recordings.slice(0, 4).map((rec, idx) => (
              <div key={`rec-${rec.recording_id || idx}-${idx}`} style={{ 
                backgroundColor: COLORS.white, 
                borderRadius: '12px',
                border: '2px solid #1a1a1a',
                display: 'flex',
                alignItems: 'center',
                padding: '5px'
              }}>
                <div style={{ 
                  width: '65px', 
                  height: '48px', 
                  flexShrink: 0,
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <img src={recordingsImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, padding: '0 10px', minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#000' }}>{formatDate(rec.created_at)}</div>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#000' }}>{rec.scene_name}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#000' }}>{rec.word_name}</div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#000', paddingRight: '6px' }}>{formatDuration(rec.duration_seconds)}</div>
                <button style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <img src={playBtn} alt="Play" style={{ width: '28px', height: '28px' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* STREAK */}
        <div style={{ backgroundColor: COLORS.blue, borderRadius: '22px', padding: '14px 16px', position: 'relative' }}>
          <ManageOverlay show={isManageMode} isHovered={streakManageHover} onHover={() => setStreakManageHover(true)} onLeave={() => setStreakManageHover(false)} onManageClick={() => setStreakManagerOpen(true)} />
          <ViewOverlay show={isViewMode} isHovered={streakViewHover} onHover={() => setStreakViewHover(true)} onLeave={() => setStreakViewHover(false)} onViewClick={() => setStreakProgressOpen(true)} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <StrokedTitle style={{ fontSize: '28px' }}>Streak</StrokedTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button onClick={prevMonth} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={leftBtnSmall} alt="Prev" style={{ width: '18px', height: '24px' }} />
              </button>
              <span style={{ color: COLORS.white, fontWeight: 700, fontSize: '18px', minWidth: '75px', textAlign: 'center' }}>
                {currentMonth.toLocaleDateString('en-US', { month: 'short' })} '{currentMonth.getFullYear().toString().slice(-2)}
              </span>
              <button onClick={nextMonth} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={rightBtnSmall} alt="Next" style={{ width: '18px', height: '24px' }} />
              </button>
            </div>
          </div>
          
          <div style={{ color: COLORS.yellow, fontWeight: 800, fontSize: '18px', marginBottom: '6px' }}>
            {mini?.current_streak || 5} day streak!
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '6px',
            marginBottom: '4px'
          }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} style={{ 
                color: COLORS.white, 
                fontSize: '11px', 
                fontWeight: 800, 
                textAlign: 'center'
              }}>
                {day}
              </div>
            ))}
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '6px',
            rowGap: '4px'
          }}>
            {getMonthDays().map((day, idx) => (
              <StreakBrick 
                key={idx} 
                hasActivity={day.hasActivity} 
                isCurrentMonth={day.isCurrentMonth}
                isPrevMonth={day.isPrevMonth}
                isNextMonth={day.isNextMonth}
                day={day.day}
              />
            ))}
          </div>
        </div>

        {/* MISSIONS & REWARDS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Missions */}
          <div style={{ backgroundColor: COLORS.green, borderRadius: '25px', padding: '16px', position: 'relative', flex: 1 }}>
            <ManageOverlay show={isManageMode} isHovered={missionsManageHover} onHover={() => setMissionsManageHover(true)} onLeave={() => setMissionsManageHover(false)} onManageClick={() => setMissionsManagerOpen(true)} />
            <ViewOverlay show={isViewMode} isHovered={missionsViewHover} onHover={() => setMissionsViewHover(true)} onLeave={() => setMissionsViewHover(false)} onViewClick={() => setMissionsProgressOpen(true)} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <StrokedTitle style={{ fontSize: '24px' }}>Mini Missions</StrokedTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                  <img src={leftBtnSmall} alt="Prev" style={{ width: '16px', height: '20px' }} />
                </button>
                <span style={{ 
                  color: COLORS.white, 
                  fontWeight: 700, 
                  fontSize: '14px'
                }}>Today</span>
                <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                  <img src={rightBtnSmall} alt="Next" style={{ width: '16px', height: '20px' }} />
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {missions.slice(0, 2).map((mission, idx) => (
                <div key={`mission-${mission.mission_id || idx}-${idx}`} style={{ 
                  backgroundColor: COLORS.white, 
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {mission.is_completed ? (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: COLORS.green,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div style={{ width: '24px', height: '24px', border: `2px solid ${COLORS.gray}`, borderRadius: '4px', flexShrink: 0 }} />
                  )}
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>{mission.mission_title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* REWARDS */}
          <div style={{ backgroundColor: COLORS.red, borderRadius: '25px', padding: '16px', position: 'relative', flex: 1 }}>
            <ManageOverlay 
              show={isManageMode} 
              isHovered={rewardsManageHover} 
              onHover={() => setRewardsManageHover(true)} 
              onLeave={() => setRewardsManageHover(false)} 
              onManageClick={() => setRewardsManagerOpen(true)} 
            />
            <ViewOverlay 
              show={isViewMode} 
              isHovered={rewardsViewHover} 
              onHover={() => setRewardsViewHover(true)} 
              onLeave={() => setRewardsViewHover(false)} 
              onViewClick={() => setRewardsProgressOpen(true)} 
            />
            
            <StrokedTitle style={{ fontSize: '24px', marginBottom: '12px' }}>Rewards</StrokedTitle>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ backgroundColor: COLORS.white, borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#000', textAlign: 'center', padding: '8px 6px 6px' }}>Bricks</div>
                <div style={{ height: '2px', backgroundColor: COLORS.red, margin: '0 8px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '10px 4px' }}>
                  <img src={bricksIcon} alt="Bricks" style={{ height: '34px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '22px', fontWeight: 900 }}>{mini?.total_bricks || 100}</span>
                </div>
              </div>
              
              <div style={{ backgroundColor: COLORS.white, borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#000', textAlign: 'center', padding: '8px 6px 6px' }}>Medals</div>
                <div style={{ height: '2px', backgroundColor: COLORS.red, margin: '0 8px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '10px 4px' }}>
                  <img src={medalsIcon} alt="Medals" style={{ height: '34px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '22px', fontWeight: 900 }}>{mini?.total_medals || 10}</span>
                </div>
              </div>
              
              <div style={{ backgroundColor: COLORS.white, borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#000', textAlign: 'center', padding: '8px 6px 6px' }}>Cup</div>
                <div style={{ height: '2px', backgroundColor: COLORS.red, margin: '0 8px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '10px 4px' }}>
                  <img src={cupIcon} alt="Cup" style={{ height: '34px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '22px', fontWeight: 900 }}>{mini?.total_cups || 3}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        
        {/* MINI SCENES */}
        <div style={{ backgroundColor: COLORS.green, borderRadius: '25px', padding: '20px', position: 'relative' }}>
          <ManageOverlay 
            show={isManageMode} 
            isHovered={scenesManageHover} 
            onHover={() => setScenesManageHover(true)} 
            onLeave={() => setScenesManageHover(false)} 
            onManageClick={() => setSceneLevelManagerOpen(true)} 
          />
          <ViewOverlay 
            show={isViewMode} 
            isHovered={scenesViewHover} 
            onHover={() => setScenesViewHover(true)} 
            onLeave={() => setScenesViewHover(false)} 
            onViewClick={() => setSceneLevelProgressOpen(true)} 
          />
          
          <StrokedTitle style={{ fontSize: '26px', marginBottom: '16px' }}>Mini Scenes</StrokedTitle>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => setScenesPage(Math.max(0, scenesPage - 1))} 
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
            >
              <img src={leftBtnBig} alt="Prev" style={{ width: '28px', height: '28px' }} />
            </button>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', flex: 1 }}>
              {scenes.slice(scenesPage * 3, (scenesPage + 1) * 3).map((scene, idx) => (
                <div key={`scene-${scene.scene_id || idx}-${idx}`} style={{ backgroundColor: COLORS.white, borderRadius: '12px', overflow: 'hidden', height: '220px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '140px', margin: '5px', borderRadius: '8px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                    <img src={scenesImage} alt={scene.scene_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {scene.is_locked && (
                      <>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', opacity: 0.5 }} />
                        <img src={lockIcon} alt="Locked" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '36px', height: '36px' }} />
                      </>
                    )}
                  </div>
                  <div style={{ padding: '4px 6px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 900, fontSize: '13px', textAlign: 'center', marginBottom: '6px' }}>{scene.scene_name}</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <ProgressBrick key={i} completed={i < (scene.words_completed || 0)} index={i} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setScenesPage(scenesPage + 1)} 
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
            >
              <img src={rightBtnBig} alt="Next" style={{ width: '28px', height: '28px' }} />
            </button>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ width: '10px', height: '10px', backgroundColor: COLORS.white, opacity: i === scenesPage ? 1 : 0.5, borderRadius: '2px' }} />
            ))}
          </div>
        </div>

        {/* MY CUSTOMIZED MINIS */}
        <div style={{ backgroundColor: COLORS.yellow, borderRadius: '25px', padding: '20px', position: 'relative' }}>
          <ManageOverlay 
            show={isManageMode} 
            isHovered={customsManageHover} 
            onHover={() => setCustomsManageHover(true)} 
            onLeave={() => setCustomsManageHover(false)} 
            onManageClick={() => setCustomMinisManagerOpen(true)} 
          />
          <ViewOverlay 
            show={isViewMode} 
            isHovered={customsViewHover} 
            onHover={() => setCustomsViewHover(true)} 
            onLeave={() => setCustomsViewHover(false)} 
            onViewClick={() => setCustomMinisProgressOpen(true)} 
          />
          
          <StrokedTitle style={{ fontSize: '26px', marginBottom: '16px' }}>My Customized Minis</StrokedTitle>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => setCustomsPage(Math.max(0, customsPage - 1))} 
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
            >
              <img src={leftBtnBig} alt="Prev" style={{ width: '28px', height: '28px' }} />
            </button>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', flex: 1 }}>
              {customizations.slice(customsPage * 3, (customsPage + 1) * 3).map((custom, idx) => (
                <div key={`custom-${custom.customization_id || idx}-${idx}`} style={{ backgroundColor: COLORS.white, borderRadius: '12px', overflow: 'hidden', height: '220px' }}>
                  <div style={{ height: '210px', margin: '5px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={minisEnvironment} alt="Mini" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setCustomsPage(customsPage + 1)} 
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
            >
              <img src={rightBtnBig} alt="Next" style={{ width: '28px', height: '28px' }} />
            </button>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ width: '10px', height: '10px', backgroundColor: COLORS.white, opacity: i === customsPage ? 1 : 0.5, borderRadius: '2px' }} />
            ))}
          </div>
        </div>
      </div>
      
      {/* ===== MODALS ===== */}
      
      {/* Motivation Messages Modals */}
      <MotivationMessagesManager 
        mini={mini}
        parentId={mini?.parent_id || 1}
        isOpen={motivationManagerOpen}
        onClose={() => setMotivationManagerOpen(false)}
      />
      
      <MotivationMessagesProgress 
        mini={mini}
        isOpen={motivationProgressOpen}
        onClose={() => setMotivationProgressOpen(false)}
      />
      
      {/* Streak Modals */}
      <StreakManager 
        mini={mini}
        parentId={mini?.parent_id || 1}
        isOpen={streakManagerOpen}
        onClose={() => setStreakManagerOpen(false)}
      />
      
      <StreakProgress 
        mini={mini}
        isOpen={streakProgressOpen}
        onClose={() => setStreakProgressOpen(false)}
      />
      
      {/* Scene Level Modals */}
      <SceneLevelManager 
        mini={mini}
        parentId={mini?.parent_id || 1}
        isOpen={sceneLevelManagerOpen}
        onClose={() => setSceneLevelManagerOpen(false)}
      />
      
      <SceneLevelProgress 
        mini={mini}
        isOpen={sceneLevelProgressOpen}
        onClose={() => setSceneLevelProgressOpen(false)}
      />
      
      {/* Rewards Modals */}
      <RewardsManager 
        isOpen={rewardsManagerOpen}
        onClose={() => setRewardsManagerOpen(false)}
        miniId={mini?.mini_id}
        parentId={mini?.parent_id || 1}
      />
      
      <RewardsProgress 
        isOpen={rewardsProgressOpen}
        onClose={() => setRewardsProgressOpen(false)}
        miniId={mini?.mini_id}
      />
      
      {/* Custom Minis Modals */}
      <CustomMinisManager 
        isOpen={customMinisManagerOpen}
        onClose={() => setCustomMinisManagerOpen(false)}
        miniId={mini?.mini_id}
        parentId={mini?.parent_id || 1}
      />
      
      <CustomMinisProgress 
        isOpen={customMinisProgressOpen}
        onClose={() => setCustomMinisProgressOpen(false)}
        miniId={mini?.mini_id}
      />
      
      {/* Missions Modals */}
      <MissionsManager 
        mini={mini}
        parentId={mini?.parent_id || 1}
        isOpen={missionsManagerOpen}
        onClose={() => setMissionsManagerOpen(false)}
      />
      
      <MissionsProgress 
        mini={mini}
        isOpen={missionsProgressOpen}
        onClose={() => setMissionsProgressOpen(false)}
      />
      
      {/* Recording Modals */}
      <RecordingManager 
        mini={mini}
        parentId={mini?.parent_id || 1}
        isOpen={recordingManagerOpen}
        onClose={() => setRecordingManagerOpen(false)}
      />
      
      <RecordingProgress 
        mini={mini}
        isOpen={recordingProgressOpen}
        onClose={() => setRecordingProgressOpen(false)}
      />
    </div>
  );
};

export default MiniManage;