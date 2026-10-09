// src/components/dashboard/StreakProgress.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import logoHead from '../../assets/logo-head.png';
import logoText from '../../assets/logo-text.png';
import progressLeftBtn from '../../assets/streak/Progress_Left_Slider_Btn.png';
import progressRightBtn from '../../assets/streak/Progress_Right_Slider_Btn.png';
import brickImg from '../../assets/streak/Streak_Rewards_Brick.png';
import medalImg from '../../assets/streak/Streak_Rewards_Medal.png';
import cupImg from '../../assets/streak/Streak_Rewards_Cup.png';

// Brick Border
import BrickBorder from '../../assets/12-mavi.png';

const COLORS = {
  blue: '#0055BF',
  white: '#FFFFFF',
  darkGray: '#666666',
};

const StreakProgress = ({ mini, isOpen, onClose, entityType = 'mini' }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [activeDays, setActiveDays] = useState([]);
  const [streakOverview, setStreakOverview] = useState({ currentStreak: 0, longestStreak: 0, activeDaysThisMonth: 0, totalActiveDays: 0 });
  const [dailyReport, setDailyReport] = useState({ playTime: '00:00', scenesPlayed: [], recordingCount: 0, recordingDuration: '00:00', levelsUsed: [], customizedMinisUsed: 0, motivationMessage: '' });
  const [missions, setMissions] = useState([]);
  const [rewards, setRewards] = useState({ bricks: 0, brickTags: [], medals: 0, medalTags: [], cups: 0, cupTags: [] });

  // Mobil: sağda gösterilen kartın index'i (0:Overview 1:Daily 2:Missions 3:Rewards)
  const [mCardIndex, setMCardIndex] = useState(1);

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
    if (isOpen && entityId) fetchProgress();
  }, [isOpen, entityId, currentMonth]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const fetchMissionsForDate = async (dateStr) => {
    try {
      const missionApi = entityType === 'builder' 
        ? `https://mini-talks.org/minitalks-api/builder/get-missions.php?builder_id=${entityId}&date=${dateStr}`
        : `https://mini-talks.org/minitalks-api/mini/get-missions.php?mini_id=${entityId}&date=${dateStr}`;
      const response = await axios.get(missionApi);
      if (response.data?.success && response.data.data) {
        setMissions(response.data.data.map(m => ({ text: m.mission_title || m.mission_text, completed: m.is_completed })));
      } else {
        setMissions([]);
      }
    } catch (error) {
      setMissions([]);
    }
  };

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const apiUrl = entityType === 'builder'
        ? `https://mini-talks.org/minitalks-api/builder/get-streak.php?builder_id=${entityId}&year=${year}&month=${month}`
        : `https://mini-talks.org/minitalks-api/streak/get-progress.php?mini_id=${entityId}&year=${year}&month=${month}`;
      const response = await axios.get(apiUrl);
      
      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        const dates = data.activity_dates || [];
        const days = dates.map(d => new Date(d).getDate());
        setActiveDays(days);
        setStreakOverview({ currentStreak: data.current_streak || 0, longestStreak: data.longest_streak || 0, activeDaysThisMonth: days.length, totalActiveDays: data.total_active_days || 0 });
        if (data.rewards) setRewards({ bricks: data.rewards.bricks || 0, brickTags: data.rewards.brickTags || [], medals: data.rewards.medals || 0, medalTags: data.rewards.medalTags || [], cups: data.rewards.cups || 0, cupTags: data.rewards.cupTags || [] });
        
        const today = new Date();
        if (today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear()) {
          const todayDay = today.getDate();
          const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
          setSelectedDate(todayDay);
          setSelectedDateStr(todayStr);
          if (data.dailyReport) {
            setDailyReport({ playTime: formatTime(data.dailyReport.play_time_seconds || 0), scenesPlayed: data.dailyReport.scenes_played || [], recordingCount: data.dailyReport.recording_count || 0, recordingDuration: formatTime(data.dailyReport.record_time_seconds || 0), levelsUsed: data.dailyReport.levels_used || [], customizedMinisUsed: data.dailyReport.customized_minis_count || 0, motivationMessage: data.dailyReport.motivation_message || '' });
          }
          fetchMissionsForDate(todayStr);
        }
      }
    } catch (error) { console.error('Failed to fetch progress:', error); }
    finally { setLoading(false); }
  };

  const fetchDailyReport = async (day) => {
    setLoadingDaily(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const apiUrl = entityType === 'builder'
        ? `https://mini-talks.org/minitalks-api/builder/get-daily-report.php?builder_id=${entityId}&date=${dateStr}`
        : `https://mini-talks.org/minitalks-api/streak/get-daily-report.php?mini_id=${entityId}&date=${dateStr}`;
      const response = await axios.get(apiUrl);
      
      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        setDailyReport({ playTime: formatTime(data.play_time_seconds || 0), scenesPlayed: data.scenes_played || [], recordingCount: data.recording_count || 0, recordingDuration: formatTime(data.record_time_seconds || 0), levelsUsed: data.levels_used || [], customizedMinisUsed: data.customized_minis_count || 0, motivationMessage: data.motivation_message || '' });
        if (data.rewards) setRewards({ bricks: data.rewards.bricks || 0, brickTags: data.rewards.brickTags || [], medals: data.rewards.medals || 0, medalTags: data.rewards.medalTags || [], cups: data.rewards.cups || 0, cupTags: data.rewards.cupTags || [] });
        setSelectedDateStr(dateStr);
      } else {
        setDailyReport({ playTime: '00:00', scenesPlayed: [], recordingCount: 0, recordingDuration: '00:00', levelsUsed: [], customizedMinisUsed: 0, motivationMessage: '' });
        setRewards({ bricks: 0, brickTags: [], medals: 0, medalTags: [], cups: 0, cupTags: [] });
        setSelectedDateStr(dateStr);
      }
      await fetchMissionsForDate(dateStr);
    } catch (error) { console.error('Failed to fetch daily report:', error); }
    finally { setLoadingDaily(false); }
  };

  const handleDayClick = (day, isCurrentMonth) => {
    if (isCurrentMonth) { 
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      setSelectedDate(day); 
      setSelectedDateStr(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      fetchDailyReport(day); 
    }
  };

  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    const days = [];
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startDay - 1; i >= 0; i--) days.push({ day: prevMonthDays - i, isCurrentMonth: false, isActive: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, isCurrentMonth: true, isActive: activeDays.includes(i) });
    const remaining = 35 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ day: i, isCurrentMonth: false, isActive: false });
    return days;
  };

  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  if (!isOpen) return null;

  const Tag = ({ text }) => (
    <span style={{ 
      backgroundColor: '#FFD700', 
      color: '#333', 
      padding: '2px 6px', 
      borderRadius: '5px', 
      fontSize: '11px', 
      fontWeight: 700,
      whiteSpace: 'nowrap'
    }}>
      {text}
    </span>
  );

  const CalendarDay = ({ day, isCurrentMonth, isActive }) => {
    const opacity = isCurrentMonth ? 1 : 0.4;
    const bgColor = isActive ? COLORS.blue : 'rgba(0,85,191,0.15)';
    const textColor = isActive ? '#FFF' : COLORS.blue;
    const isSelected = selectedDate === day && isCurrentMonth;
    
    return (
      <div 
        onClick={() => handleDayClick(day, isCurrentMonth)} 
        className="sp-calday"
        style={{ 
          display: '-webkit-flex',
          display: 'flex',
          WebkitFlexDirection: 'column',
          flexDirection: 'column',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          opacity, 
          cursor: isCurrentMonth ? 'pointer' : 'default'
        }}
      >
        <div className="sp-calday-nub" style={{ 
          width: '50%', 
          height: '6px', 
          backgroundColor: bgColor, 
          borderRadius: '2px 2px 0 0' 
        }} />
        <div className="sp-calday-body" style={{ 
          width: '36px',
          height: '36px',
          backgroundColor: bgColor, 
          borderRadius: '4px', 
          display: '-webkit-flex',
          display: 'flex',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          WebkitJustifyContent: 'center',
          justifyContent: 'center',
          outline: isSelected ? '3px solid #FFD700' : 'none',
          outlineOffset: '-1px'
        }}>
          <span className="sp-calday-text" style={{ 
            color: textColor, 
            fontSize: '14px', 
            fontWeight: 800 
          }}>
            {day}
          </span>
        </div>
      </div>
    );
  };

  // Field Label with underline component
  const FieldLabel = ({ children }) => (
    <div style={{ 
      color: '#FFF', 
      fontSize: '12px', 
      fontWeight: 700, 
      marginBottom: '3px',
      paddingBottom: '3px',
      borderBottom: '2px solid rgba(255,255,255,0.3)',
      fontFamily: "'Montserrat', sans-serif"
    }}>
      {children}
    </div>
  );

  // ── Takvim render (PC + mobil paylaşır) ──
  const renderCalendar = () => (
    <div className="sp-calendar-box">
      <div className="sp-calendar-header">
        <div style={{ 
          display: '-webkit-flex', 
          display: 'flex', 
          WebkitAlignItems: 'center', 
          alignItems: 'center', 
          WebkitJustifyContent: 'center', 
          justifyContent: 'center', 
          gap: '14px', 
          marginBottom: '8px' 
        }}>
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} 
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, WebkitAppearance: 'none', appearance: 'none' }}
          >
            <img src={progressLeftBtn} alt="←" style={{ width: '24px', height: '18px' }} />
          </button>
          <span className="sp-month-name" style={{ fontSize: '17px', fontWeight: 900, color: COLORS.blue, minWidth: '140px', textAlign: 'center', fontFamily: "'Montserrat', sans-serif" }}>
            {monthName}
          </span>
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} 
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, WebkitAppearance: 'none', appearance: 'none' }}
          >
            <img src={progressRightBtn} alt="→" style={{ width: '24px', height: '18px' }} />
          </button>
        </div>
        <div className="sp-day-names">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
            <div key={i} className="sp-day-name-cell" style={{ textAlign: 'center', fontWeight: 800, color: COLORS.blue, fontSize: '13px', fontFamily: "'Montserrat', sans-serif" }}>
              {d}
            </div>
          ))}
        </div>
      </div>
      <div className="sp-calendar-body">
        <div className="sp-calendar-grid">
          {getMonthDays().map((item, i) => <CalendarDay key={i} {...item} />)}
        </div>
      </div>
    </div>
  );

  // ── Sağ kartlar (PC + mobil paylaşır) ──
  const renderOverviewCard = () => (
    <div className="sp-card" style={{ WebkitFlexShrink: 0, flexShrink: 0 }}>
      <div className="sp-overview-header">
        <span style={{ color: '#FFF', fontSize: '15px', fontWeight: 900, fontFamily: "'Montserrat', sans-serif" }}>Streak Overview</span>
      </div>
      <div className="sp-card-body" style={{ padding: '8px 10px' }}>
        {[
          { label: 'Current Streak:', value: `${streakOverview.currentStreak} days` }, 
          { label: 'Longest Streak:', value: `${streakOverview.longestStreak} days` }, 
          { label: 'Active Days This Month:', value: streakOverview.activeDaysThisMonth }, 
          { label: 'Total Active Days:', value: streakOverview.totalActiveDays }
        ].map((item, i) => (
          <div key={i} className="sp-overview-row">
            <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>{item.label}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.darkGray, fontFamily: "'Montserrat', sans-serif" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDailyCard = () => (
    <div className="sp-card" style={{ 
      WebkitBoxFlex: 1, 
      WebkitFlex: '1 1 0%', 
      flex: '1 1 0%',
      position: 'relative',
      minHeight: 0
    }}>
      {loadingDaily && (
        <div style={{ 
          position: 'absolute', inset: 0, background: 'rgba(0,85,191,0.9)', 
          display: 'flex', WebkitAlignItems: 'center', alignItems: 'center', 
          WebkitJustifyContent: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '10px' 
        }}>
          <span style={{ color: '#FFF', fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>Loading...</span>
        </div>
      )}
      <div className="sp-card-body sp-daily-fields" style={{ padding: '10px 12px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div className="sp-field">
          <FieldLabel>Play Time:</FieldLabel>
          <div className="sp-field-value">{dailyReport.playTime}</div>
        </div>
        <div className="sp-field">
          <FieldLabel>Scenes Played:</FieldLabel>
          <div className="sp-tags">
            {dailyReport.scenesPlayed?.length > 0 ? dailyReport.scenesPlayed.map((s, i) => <Tag key={i} text={s} />)
              : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: "'Montserrat', sans-serif" }}>No scenes played</span>}
          </div>
        </div>
        <div className="sp-field">
          <FieldLabel>Recording Count:</FieldLabel>
          <div className="sp-field-value">{dailyReport.recordingCount}</div>
        </div>
        <div className="sp-field">
          <FieldLabel>Recording Duration:</FieldLabel>
          <div className="sp-field-value">{dailyReport.recordingDuration}</div>
        </div>
        <div className="sp-field">
          <FieldLabel>Levels Used:</FieldLabel>
          <div className="sp-tags">
            {dailyReport.levelsUsed?.length > 0 ? dailyReport.levelsUsed.map((l, i) => <Tag key={i} text={l} />)
              : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: "'Montserrat', sans-serif" }}>No levels used</span>}
          </div>
        </div>
        <div className="sp-field">
          <FieldLabel>Customized Minis Used:</FieldLabel>
          <div className="sp-field-value">{dailyReport.customizedMinisUsed}</div>
        </div>
        <div className="sp-field">
          <FieldLabel>Motivation Message:</FieldLabel>
          <div className="sp-field-value" style={{ fontStyle: dailyReport.motivationMessage ? 'italic' : 'normal', color: dailyReport.motivationMessage ? '#000' : '#999' }}>
            {dailyReport.motivationMessage || 'No message for this day'}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMissionsCard = () => (
    <div className="sp-card" style={{ WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: '1 1 0%', minHeight: 0 }}>
      <div className="sp-card-header">
        <span style={{ color: '#FFF', fontSize: '15px', fontWeight: 900, fontFamily: "'Montserrat', sans-serif" }}>Missions</span>
      </div>
      <div className="sp-card-body" style={{ padding: '8px 10px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {missions.length > 0 ? missions.map((m, i) => (
          <div key={i} className="sp-mission-item">
            {m.completed ? (
              <svg width="20" height="20" viewBox="0 0 22 22" style={{ WebkitFlexShrink: 0, flexShrink: 0 }}>
                <circle cx="11" cy="11" r="10" fill="#4CAF50"/>
                <path d="M6 11L9 14L15 8" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 22 22" style={{ WebkitFlexShrink: 0, flexShrink: 0 }}>
                <circle cx="11" cy="11" r="10" fill="#E52828"/>
                <path d="M7 7L15 15M15 7L7 15" stroke="#FFF" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            )}
            <span style={{ color: '#FFF', fontSize: '13px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>{m.text}</span>
          </div>
        )) : (
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: "'Montserrat', sans-serif" }}>No missions for this day</span>
        )}
      </div>
    </div>
  );

  const renderRewardsCard = () => (
    <div className="sp-card" style={{ WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: '1 1 0%', minHeight: 0 }}>
      <div className="sp-card-header">
        <span style={{ color: '#FFF', fontSize: '15px', fontWeight: 900, fontFamily: "'Montserrat', sans-serif" }}>Rewards</span>
      </div>
      <div className="sp-card-body" style={{ 
        display: 'flex', WebkitFlexDirection: 'column', flexDirection: 'column',
        WebkitJustifyContent: 'space-evenly', justifyContent: 'space-evenly',
        padding: '12px 14px', overflowY: 'auto', WebkitOverflowScrolling: 'touch'
      }}>
        <div className="sp-reward-item">
          <img src={brickImg} alt="" style={{ width: '36px', height: '32px', WebkitFlexShrink: 0, flexShrink: 0 }} />
          <div style={{ WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: '1 1 0%', minWidth: 0, WebkitMinWidth: 0 }}>
            <div style={{ color: '#FFF', fontSize: '14px', fontWeight: 800, marginBottom: '3px', fontFamily: "'Montserrat', sans-serif" }}>{rewards.bricks}x Bricks</div>
            <div className="sp-tags">
              {rewards.brickTags?.length > 0 ? rewards.brickTags.map((t, i) => <Tag key={i} text={t} />) : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: "'Montserrat', sans-serif" }}>No bricks earned</span>}
            </div>
          </div>
        </div>
        <div className="sp-divider" />
        <div className="sp-reward-item">
          <img src={medalImg} alt="" style={{ width: '40px', height: '36px', WebkitFlexShrink: 0, flexShrink: 0 }} />
          <div style={{ WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: '1 1 0%', minWidth: 0, WebkitMinWidth: 0 }}>
            <div style={{ color: '#FFF', fontSize: '14px', fontWeight: 800, marginBottom: '3px', fontFamily: "'Montserrat', sans-serif" }}>{rewards.medals}x Medal</div>
            <div className="sp-tags">
              {rewards.medalTags?.length > 0 ? rewards.medalTags.map((t, i) => <Tag key={i} text={t} />) : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: "'Montserrat', sans-serif" }}>No medals earned</span>}
            </div>
          </div>
        </div>
        <div className="sp-divider" />
        <div className="sp-reward-item">
          <img src={cupImg} alt="" style={{ width: '36px', height: '32px', WebkitFlexShrink: 0, flexShrink: 0 }} />
          <div style={{ WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: '1 1 0%', minWidth: 0, WebkitMinWidth: 0 }}>
            <div style={{ color: '#FFF', fontSize: '14px', fontWeight: 800, marginBottom: '3px', fontFamily: "'Montserrat', sans-serif" }}>{rewards.cups}x Cups</div>
            <div className="sp-tags">
              {rewards.cupTags?.length > 0 ? rewards.cupTags.map((t, i) => <Tag key={i} text={t} />) : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: "'Montserrat', sans-serif" }}>No cups earned</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobil kart geçiş sırası
  const M_CARDS = [renderOverviewCard, renderDailyCard, renderMissionsCard, renderRewardsCard];

  const styles = `
    .sp-overlay {
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
    .sp-modal-wrapper {
      position: relative;
      width: 96vw;
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
    .sp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .sp-modal {
      width: 100%;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.blue};
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
    .sp-header {
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
    .sp-content {
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
    .sp-title-row {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      justify-content: space-between;
      -webkit-box-align: start;
      -webkit-align-items: flex-start;
      align-items: flex-start;
      margin-bottom: 16px;
      gap: 20px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .sp-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .sp-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .sp-ok-btn {
      background: ${COLORS.blue};
      color: #FFF;
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
    .sp-ok-btn:hover {
      background: #0066CC;
    }
    .sp-headers-row {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .sp-main {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 16px;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
      -webkit-box-align: stretch;
      -webkit-align-items: stretch;
      align-items: stretch;
    }
    .sp-col-left {
      width: 320px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 10px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      overflow: hidden;
    }
    .sp-right-columns {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 16px;
      min-height: 0;
      -webkit-min-height: 0;
      min-width: 0;
      -webkit-min-width: 0;
      overflow: hidden;
    }
    .sp-col-mid {
      -webkit-box-flex: 4;
      -webkit-flex: 4 1 0%;
      flex: 4 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      min-width: 0;
      -webkit-min-width: 0;
      overflow: hidden;
    }
    .sp-col-right {
      -webkit-box-flex: 5;
      -webkit-flex: 5 1 0%;
      flex: 5 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
      -webkit-min-width: 0;
      overflow: hidden;
    }
    .sp-card {
      background: ${COLORS.blue};
      border-radius: 10px;
      overflow: hidden;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .sp-card-header {
      padding: 8px 12px;
      border-bottom: 2px solid rgba(255,255,255,0.3);
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .sp-card-body {
      padding: 10px 12px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      overflow: hidden;
    }
    .sp-calendar-box {
      border: 3px solid ${COLORS.blue};
      border-radius: 10px;
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
    }
    .sp-calendar-header {
      padding: 10px 12px;
      border-bottom: 3px solid ${COLORS.blue};
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .sp-calendar-body {
      padding: 12px;
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
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
    }
    .sp-calendar-grid {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: (1fr)[7];
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
    }
    .sp-day-names {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: (1fr)[7];
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-top: 8px;
    }
    .sp-overview-header {
      padding: 8px 12px;
      border-bottom: 2px solid rgba(255,255,255,0.3);
    }
    .sp-overview-row {
      background: #FFF;
      border-radius: 5px;
      padding: 6px 10px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .sp-overview-row:last-child { margin-bottom: 0; }
    .sp-field {
      margin-bottom: 6px;
    }
    .sp-field:last-child { margin-bottom: 0; }
    .sp-field-value {
      background: #FFF;
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 600;
    }
    .sp-tags {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 4px;
      -webkit-flex-wrap: wrap;
      flex-wrap: wrap;
      min-height: 18px;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
    }
    .sp-mission-item {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .sp-mission-item:last-child { margin-bottom: 0; }
    .sp-reward-item {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: start;
      -webkit-align-items: flex-start;
      align-items: flex-start;
      gap: 10px;
    }
    .sp-divider {
      height: 1px;
      background: rgba(255,255,255,0.3);
      margin: 6px 0;
    }
    .sp-daily-fields {
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
      -webkit-justify-content: space-between;
      justify-content: space-between;
    }
    .sp-daily-fields .sp-field {
      margin-bottom: 0;
    }
    .sp-missions-rewards {
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
      -webkit-justify-content: space-between;
      justify-content: space-between;
    }
    .sp-loading {
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
    .sp-mobile-overlay {
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
    .sp-m-content {
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
    .sp-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 6px;
    }
    .sp-m-main {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 14px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-box-align: stretch;
      -webkit-align-items: stretch;
      align-items: stretch;
    }
    /* Sol takvim — Manager gibi, daha dar, ortalı */
    .sp-m-main .sp-calendar-box {
      -webkit-box-flex: 0;
      -webkit-flex: 0 1 auto;
      flex: 0 1 auto;
      width: 50%;
      max-width: 460px;
      min-width: 0;
    }
    .sp-m-main .sp-calendar-header { padding: 8px 10px; }
    .sp-m-main .sp-month-name { font-size: 15px !important; min-width: 100px !important; }
    .sp-m-main .sp-day-name-cell { font-size: 11px !important; }
    .sp-m-main .sp-calendar-body {
      padding: 8px;
      -webkit-box-pack: stretch;
      -webkit-justify-content: stretch;
      justify-content: stretch;
      overflow: hidden;
    }
    .sp-m-main .sp-calendar-grid {
      gap: 4px;
      grid-template-rows: repeat(5, 1fr);
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      align-content: stretch;
      align-items: stretch;
    }
    .sp-m-main .sp-day-names { gap: 4px; }
    /* Brick'ler hücreyi doldursun (sabit px değil) */
    .sp-m-main .sp-calday { -webkit-box-flex: 1; -webkit-flex: 1; flex: 1; min-height: 0; }
    .sp-m-main .sp-calday-nub { width: 45% !important; height: 5px !important; }
    .sp-m-main .sp-calday-body {
      width: 100% !important;
      height: auto !important;
      -webkit-box-flex: 1;
      -webkit-flex: 1;
      flex: 1;
      min-height: 0;
    }
    .sp-m-main .sp-calday-text { font-size: clamp(11px, 1.9vh, 16px) !important; }
    /* Sağ kart alanı — Manager gibi, dar, ortalı */
    .sp-m-rightcol {
      -webkit-box-flex: 0;
      -webkit-flex: 0 1 auto;
      flex: 0 1 auto;
      width: 40%;
      max-width: 320px;
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
    .sp-m-cardarea {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      position: relative;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: stretch;
      -webkit-align-items: stretch;
      align-items: stretch;
      padding: 0 30px;
    }
    .sp-m-cardarea > .sp-card {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
    }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    const mSafe = Math.min(mCardIndex, M_CARDS.length - 1);
    return (
      <div className="sp-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="sp-m-content">
          {/* Başlık */}
          <div className="sp-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Streak Progress
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '700px', fontFamily: "'Montserrat', sans-serif" }}>
              View your Mini's streak history, active days, longest streak, and daily activity details.
            </p>
          </div>

          {loading ? (
            <div className="sp-loading">Loading...</div>
          ) : (
            <div className="sp-m-main">
              {/* SOL — takvim */}
              {renderCalendar()}

              {/* SAĞ — tek kart ok'larla geçişli + altında nokta */}
              <div className="sp-m-rightcol">
                <div className="sp-m-cardarea">
                  {/* Sol ok */}
                  <button
                    onClick={() => setMCardIndex(Math.max(0, mSafe - 1))}
                    disabled={mSafe === 0}
                    style={{
                      position: 'absolute', left: '0px', top: '50%', transform: 'translateY(-50%)', zIndex: 5,
                      background: 'none', border: 'none', padding: 0,
                      cursor: mSafe === 0 ? 'default' : 'pointer', opacity: mSafe === 0 ? 0.25 : 1,
                      WebkitAppearance: 'none'
                    }}
                  >
                    <img src={progressLeftBtn} alt="←" style={{ width: '24px', height: '18px' }} />
                  </button>

                  {/* Aktif kart */}
                  {M_CARDS[mSafe]()}

                  {/* Sağ ok */}
                  <button
                    onClick={() => setMCardIndex(Math.min(M_CARDS.length - 1, mSafe + 1))}
                    disabled={mSafe >= M_CARDS.length - 1}
                    style={{
                      position: 'absolute', right: '0px', top: '50%', transform: 'translateY(-50%)', zIndex: 5,
                      background: 'none', border: 'none', padding: 0,
                      cursor: mSafe >= M_CARDS.length - 1 ? 'default' : 'pointer', opacity: mSafe >= M_CARDS.length - 1 ? 0.25 : 1,
                      WebkitAppearance: 'none'
                    }}
                  >
                    <img src={progressRightBtn} alt="→" style={{ width: '24px', height: '18px' }} />
                  </button>
                </div>

                {/* Nokta göstergesi — sağ özelinde */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingTop: '8px' }}>
                  {M_CARDS.map((_, i) => (
                    <button key={i} onClick={() => setMCardIndex(i)} style={{
                      width: i === mSafe ? '22px' : '8px', height: '8px', borderRadius: '4px',
                      background: i === mSafe ? COLORS.blue : '#D8D8D8', border: 'none', padding: 0,
                      cursor: 'pointer', WebkitAppearance: 'none'
                    }} />
                  ))}
                </div>
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
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="sp-overlay">
      <style>{styles}</style>
      
      <div className="sp-modal-wrapper">
        {/* Brick Border */}
        <img src={BrickBorder} alt="" className="sp-brick-border" />
        
        <div className="sp-modal">
          {/* Header */}
          <div className="sp-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* Content */}
          <div className="sp-content">
            {/* Title Row - Centered */}
            <div className="sp-title-row">
              <div className="sp-btn-spacer" />
              <div className="sp-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>Streak Progress</h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '800px', fontFamily: "'Montserrat', sans-serif" }}>
                  View your Mini's streak history, including active days, longest streak, and daily activity details.
                </p>
              </div>
              <button onClick={onClose} className="sp-ok-btn">
                Ok
              </button>
            </div>

            {/* Başlıklar Satırı */}
            <div className="sp-headers-row">
              <div style={{ width: '320px', WebkitFlexShrink: 0, flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: '17px', fontFamily: "'Montserrat', sans-serif" }}>Monthly Activity Calendar</div>
              </div>
              
              <div style={{ WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: '1 1 0%' }}>
                <div style={{ fontSize: '17px', fontWeight: 900, marginBottom: '3px', fontFamily: "'Montserrat', sans-serif" }}>
                  Daily Activity Report
                </div>
                <p style={{ color: COLORS.darkGray, margin: 0, fontSize: '13px', fontFamily: "'Montserrat', sans-serif" }}>
                  Select a day from the calendar to see everything your Mini did on that date, including play time, recordings, scenes, levels, and completed missions.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="sp-loading">Loading...</div>
            ) : (
              <div className="sp-main">
                
                {/* Sol Kolon - Calendar + Overview */}
                <div className="sp-col-left">
                  {renderCalendar()}
                  {renderOverviewCard()}
                </div>
                
                {/* Sağ iki kolon */}
                <div className="sp-right-columns">
                  {/* Orta Kolon - Daily Report */}
                  <div className="sp-col-mid">
                    {renderDailyCard()}
                  </div>
                  
                  {/* Sağ Kolon - Missions + Rewards */}
                  <div className="sp-col-right">
                    {renderMissionsCard()}
                    {renderRewardsCard()}
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

export default StreakProgress;