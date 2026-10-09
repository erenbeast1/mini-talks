// src/components/dashboard/StreakManager.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import logoHead from '../../assets/logo-head.png';
import logoText from '../../assets/logo-text.png';
import leftSlideBtn from '../../assets/streak/Left_Slide_Btn.png';
import rightSlideBtn from '../../assets/streak/Right_Slide_Btn.png';

// Brick Border
import BrickBorder from '../../assets/12-mavi.png';

const COLORS = {
  blue: '#0055BF',
  white: '#FFFFFF',
  gray: '#D8D8D8',
  darkGray: '#666666',
};

const StreakManager = ({ mini, isOpen, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    activityRequirement: 'open_app',
    playTimeLimit: 'no_limit',
    breakTolerance: 'no_grace'
  });
  const [activeDays, setActiveDays] = useState([]);

  // Mobil: sağda gösterilen settings kartının index'i
  const [mCardIndex, setMCardIndex] = useState(0);

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

  const miniId = mini?.mini_id;
  const parentId = mini?.parent_id || 0;

  useEffect(() => {
    if (isOpen && miniId) {
      fetchSettings();
      fetchActiveDays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, miniId]);

  useEffect(() => {
    if (isOpen && miniId) {
      fetchActiveDays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/streak/get-settings.php?mini_id=${miniId}&parent_id=${parentId}`
      );

      if (response.data?.success && response.data.data) {
        const data = response.data.data;

        let activityReq = 'open_app';
        if (data.req_record_1min === 1) {
          activityReq = 'record_1min';
        } else if (data.req_play_1min === 1) {
          activityReq = 'play_1min';
        }

        setSettings({
          activityRequirement: activityReq,
          playTimeLimit: data.play_time_limit || 'no_limit',
          breakTolerance: data.break_tolerance || 'no_grace'
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveDays = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/streak/get-progress.php?mini_id=${miniId}&year=${year}&month=${month}`
      );

      if (response.data?.success && response.data.data) {
        const dates = response.data.data.activity_dates || [];
        const days = dates.map(d => new Date(d).getDate());
        setActiveDays(days);
      }
    } catch (error) {
      console.error('Failed to fetch active days:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const req_open_app = settings.activityRequirement === 'open_app' ? 1 : 0;
      const req_record_1min = settings.activityRequirement === 'record_1min' ? 1 : 0;
      const req_play_1min = settings.activityRequirement === 'play_1min' ? 1 : 0;

      await axios.post('https://mini-talks.org/minitalks-api/streak/save-settings.php', {
        mini_id: miniId,
        parent_id: parentId,
        req_open_app,
        req_record_1min,
        req_play_1min,
        play_time_limit: settings.playTimeLimit,
        break_tolerance: settings.breakTolerance
      });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    await saveSettings();
    onClose();
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
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, isActive: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, isActive: activeDays.includes(i) });
    }

    const remaining = 35 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, isActive: false });
    }

    return days;
  };

  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Settings kartlarının config'i (PC ve mobilde paylaşılır)
  const SETTINGS_CARDS = [
    {
      title: 'Daily Activity Requirement',
      settingKey: 'activityRequirement',
      options: [
        { value: 'open_app', label: 'Open the app at least once' },
        { value: 'record_1min', label: 'Record at least 1 min' },
        { value: 'play_1min', label: 'Play at least 1 min' }
      ]
    },
    {
      title: 'Daily Play Time Limit',
      settingKey: 'playTimeLimit',
      options: [
        { value: 'no_limit', label: 'No limit' },
        { value: '10_minutes', label: '10 minutes' },
        { value: '20_minutes', label: '20 minutes' }
      ]
    },
    {
      title: 'Streak Break Tolerance',
      settingKey: 'breakTolerance',
      options: [
        { value: 'no_grace', label: 'No grace' },
        { value: '1_day_grace', label: '1-day grace' },
        { value: 'weekend_skip', label: 'Weekend skip' }
      ]
    }
  ];

  if (!isOpen) return null;

  const BrickDay = ({ day, isCurrentMonth, isActive }) => {
    const opacity = isCurrentMonth ? 1 : 0.4;
    const bgColor = isActive ? COLORS.blue : 'rgba(0,85,191,0.2)';
    const textColor = isActive ? '#FFF' : COLORS.blue;

    return (
      <div
        className="sm-brick"
        style={{
          opacity,
          display: '-webkit-box',
          display: '-webkit-flex',
          display: 'flex',
          WebkitBoxOrient: 'vertical',
          WebkitBoxDirection: 'normal',
          WebkitFlexDirection: 'column',
          flexDirection: 'column',
          WebkitBoxAlign: 'center',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          WebkitBoxPack: 'center',
          WebkitJustifyContent: 'center',
          justifyContent: 'center'
        }}
      >
        <div className="sm-brick-inner">
          <div className="sm-brick-nub" style={{ backgroundColor: bgColor }} />
          <div className="sm-brick-body" style={{ backgroundColor: bgColor }}>
            <span className="sm-brick-text" style={{ color: textColor }}>
              {day}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const RadioOption = ({ label, value, currentValue, onChange }) => {
    const isSelected = currentValue === value;
    return (
      <div
        onClick={() => onChange(value)}
        style={{
          backgroundColor: '#FFF',
          borderRadius: '6px',
          padding: '8px 10px',
          marginBottom: '5px',
          display: '-webkit-box',
          display: '-webkit-flex',
          display: 'flex',
          WebkitBoxAlign: 'center',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          border: isSelected ? 'none' : `2px solid ${COLORS.blue}`,
          backgroundColor: isSelected ? COLORS.blue : 'transparent',
          display: '-webkit-box',
          display: '-webkit-flex',
          display: 'flex',
          WebkitBoxAlign: 'center',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          WebkitBoxPack: 'center',
          WebkitJustifyContent: 'center',
          justifyContent: 'center',
          marginRight: '8px',
          WebkitFlexShrink: 0,
          flexShrink: 0
        }}>
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 14 14">
              <path d="M2 7L5 10L12 3" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          )}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>{label}</span>
      </div>
    );
  };

  const SettingsCard = ({ title, options, settingKey }) => (
    <div style={{
      backgroundColor: COLORS.blue,
      borderRadius: '10px',
      overflow: 'hidden',
      WebkitBoxFlex: 1,
      WebkitFlex: '1 1 0%',
      flex: '1 1 0%',
      display: '-webkit-box',
      display: '-webkit-flex',
      display: 'flex',
      WebkitBoxOrient: 'vertical',
      WebkitBoxDirection: 'normal',
      WebkitFlexDirection: 'column',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '2px solid rgba(255,255,255,0.3)',
        WebkitFlexShrink: 0,
        flexShrink: 0
      }}>
        <span style={{ color: '#FFF', fontSize: '13px', fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>{title}</span>
      </div>
      <div style={{ 
        padding: '6px',
        WebkitBoxFlex: 1,
        WebkitFlex: '1 1 0%',
        flex: '1 1 0%',
        display: '-webkit-box',
        display: '-webkit-flex',
        display: 'flex',
        WebkitBoxOrient: 'vertical',
        WebkitBoxDirection: 'normal',
        WebkitFlexDirection: 'column',
        flexDirection: 'column',
        WebkitJustifyContent: 'space-evenly',
        justifyContent: 'space-evenly'
      }}>
        {options.map((opt, i) => (
          <RadioOption
            key={i}
            label={opt.label}
            value={opt.value}
            currentValue={settings[settingKey]}
            onChange={(v) => setSettings(s => ({ ...s, [settingKey]: v }))}
          />
        ))}
      </div>
    </div>
  );

  // Takvim (PC ve mobilde paylaşılır)
  const renderCalendar = () => (
    <div className="sm-calendar-col">
      <div className="sm-calendar-header">
        <div className="sm-calendar-nav">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, WebkitAppearance: 'none', appearance: 'none' }}
          >
            <img src={leftSlideBtn} alt="←" style={{ width: '28px', height: '20px' }} />
          </button>

          <span className="sm-month-name" style={{ fontSize: '22px', fontWeight: 900, color: COLORS.blue, minWidth: '200px', textAlign: 'center', fontFamily: "'Montserrat', sans-serif" }}>
            {monthName}
          </span>

          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, WebkitAppearance: 'none', appearance: 'none' }}
          >
            <img src={rightSlideBtn} alt="→" style={{ width: '28px', height: '20px' }} />
          </button>
        </div>

        <div className="sm-day-names">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="sm-day-name-cell" style={{ textAlign: 'center', fontWeight: 800, color: COLORS.blue, fontSize: '14px', fontFamily: "'Montserrat', sans-serif" }}>
              {d}
            </div>
          ))}
        </div>
      </div>

      <div className="sm-calendar-body">
        <div className="sm-calendar-grid">
          {getMonthDays().map((item, i) => <BrickDay key={i} {...item} />)}
        </div>
      </div>
    </div>
  );

  const styles = `
    .sm-overlay {
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

    .sm-modal-wrapper {
      position: relative;
      width: 98vw;
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

    .sm-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }

    .sm-modal {
      width: 100%;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.blue};
      border-radius: 15px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
    }

    .sm-header {
      background: ${COLORS.blue};
      padding: 15px 0 12px;
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
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }

    .sm-content {
      background: ${COLORS.white};
      border-radius: 18px;
      margin: 0 15px 15px;
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

    .sm-title-row {
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

    .sm-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }

    .sm-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }

    .sm-main {
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

    .sm-calendar-col {
      border: 3px solid ${COLORS.blue};
      border-radius: 14px;
      overflow: hidden;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      -webkit-min-width: 0;
      min-height: 0;
      -webkit-min-height: 0;
    }

    .sm-calendar-header {
      padding: 14px 18px;
      border-bottom: 3px solid ${COLORS.blue};
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }

    .sm-calendar-nav {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 14px;
    }

    .sm-calendar-body {
      padding: 16px;
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
      overflow: hidden;
    }

    .sm-calendar-grid {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: (1fr)[7];
      grid-template-columns: repeat(7, 1fr);
      grid-template-rows: repeat(5, 1fr);
      gap: 8px 6px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      align-content: stretch;
      align-items: stretch;
      justify-items: stretch;
      min-height: 0;
      -webkit-min-height: 0;
    }

    .sm-day-names {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: (1fr)[7];
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
    }

    .sm-settings-col {
      width: 280px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
      -webkit-min-height: 0;
    }

    .sm-ok-btn {
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

    .sm-ok-btn:hover {
      background: #0066CC;
    }

    .sm-ok-btn:disabled {
      opacity: 0.7;
      cursor: wait;
    }

    .sm-loading {
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
      min-height: 0;
      -webkit-min-height: 0;
    }

    .sm-brick {
      width: 100%;
      height: 100%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
      min-height: 0;
    }

    .sm-brick-inner {
      aspect-ratio: 5 / 6;
      height: 100%;
      width: auto;
      max-width: 100%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      max-height: 100%;
    }

    .sm-brick-nub {
      width: 60%;
      height: 16%;
      border-radius: 10px 10px 0 0;
      margin: 0 auto;
    }

    .sm-brick-body {
      width: 100%;
      height: 84%;
      border-radius: 12px;
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

    .sm-brick-text {
      font-weight: 800;
      font-family: 'Montserrat', sans-serif;
      font-size: clamp(12px, 2vh, 18px);
      line-height: 1;
    }

    /* ════ MOBİL ════ */
    .sm-mobile-overlay {
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
    .sm-m-content {
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
    .sm-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 6px;
    }
    .sm-m-main {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 16px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      width: 100%;
    }
    /* Sol takvim — daha dar, içerik kadar */
    .sm-m-main .sm-calendar-col {
      -webkit-box-flex: 0;
      -webkit-flex: 0 1 auto;
      flex: 0 1 auto;
      width: 50%;
      max-width: 460px;
      min-width: 0;
      align-self: stretch;
    }
    .sm-m-main .sm-calendar-header { padding: 8px 10px; }
    .sm-m-main .sm-calendar-nav { gap: 12px; margin-bottom: 8px; }
    .sm-m-main .sm-month-name { font-size: 16px !important; min-width: 120px !important; }
    .sm-m-main .sm-day-name-cell { font-size: 11px !important; }
    .sm-m-main .sm-day-names { gap: 5px; }
    .sm-m-main .sm-calendar-body { padding: 8px; }
    .sm-m-main .sm-calendar-grid { gap: 4px 4px; }
    .sm-m-main .sm-brick-text { font-size: clamp(12px, 2.2vh, 18px); }
    /* Mobilde brick'ler dikeyde kısa: kareye yakın, alanı doldur */
    .sm-m-main .sm-brick-inner {
      aspect-ratio: auto;
      width: 100%;
      height: 100%;
    }
    .sm-m-main .sm-brick-nub { height: 18%; }
    .sm-m-main .sm-brick-body { height: 82%; border-radius: 8px; }
    /* Sağ kolon: settings + nokta (dikey), dikeyde ortalı, içerik kadar */
    .sm-m-rightcol {
      width: 38%;
      max-width: 300px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
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
      max-height: 100%;
      min-height: 0;
    }
    /* Sağ settings — içerik kadar, alanı zorlamaz */
    .sm-m-settingsarea {
      -webkit-box-flex: 0;
      -webkit-flex: 0 1 auto;
      flex: 0 1 auto;
      position: relative;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      min-height: 0;
      padding: 0 34px;
    }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    const mSafe = Math.min(mCardIndex, SETTINGS_CARDS.length - 1);
    const card = SETTINGS_CARDS[mSafe];
    return (
      <div className="sm-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="sm-m-content">
          {/* Başlık */}
          <div className="sm-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Streak Manager
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
              Adjust how streaks are tracked: daily activity, play time limits, and grace period settings.
            </p>
          </div>

          {loading ? (
            <div className="sm-loading">Loading...</div>
          ) : (
            <div className="sm-m-main">
              {/* SOL — takvim */}
              {renderCalendar()}

              {/* SAĞ — tek settings kartı, ok'larla geçişli + altında nokta */}
              <div className="sm-m-rightcol">
                <div className="sm-m-settingsarea">
                  {/* Sol ok */}
                  <button
                    onClick={() => setMCardIndex(Math.max(0, mSafe - 1))}
                    disabled={mSafe === 0}
                    style={{
                      position: 'absolute', left: '0px', zIndex: 5,
                      background: 'none', border: 'none', padding: 0,
                      cursor: mSafe === 0 ? 'default' : 'pointer', opacity: mSafe === 0 ? 0.25 : 1,
                      WebkitAppearance: 'none'
                    }}
                  >
                    <img src={leftSlideBtn} alt="←" style={{ width: '26px', height: '19px' }} />
                  </button>

                  {/* Kart — içerik kadar yükseklik */}
                  <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex' }}>
                    <SettingsCard
                      title={card.title}
                      settingKey={card.settingKey}
                      options={card.options}
                    />
                  </div>

                  {/* Sağ ok */}
                  <button
                    onClick={() => setMCardIndex(Math.min(SETTINGS_CARDS.length - 1, mSafe + 1))}
                    disabled={mSafe >= SETTINGS_CARDS.length - 1}
                    style={{
                      position: 'absolute', right: '0px', zIndex: 5,
                      background: 'none', border: 'none', padding: 0,
                      cursor: mSafe >= SETTINGS_CARDS.length - 1 ? 'default' : 'pointer', opacity: mSafe >= SETTINGS_CARDS.length - 1 ? 0.25 : 1,
                      WebkitAppearance: 'none'
                    }}
                  >
                    <img src={rightSlideBtn} alt="→" style={{ width: '26px', height: '19px' }} />
                  </button>
                </div>

                {/* Nokta göstergesi — sadece sağ özelinde, settings altında */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingTop: '8px' }}>
                  {SETTINGS_CARDS.map((_, i) => (
                    <button key={i} onClick={() => setMCardIndex(i)} style={{
                      width: i === mSafe ? '22px' : '8px', height: '8px', borderRadius: '4px',
                      background: i === mSafe ? COLORS.blue : COLORS.gray, border: 'none', padding: 0,
                      cursor: 'pointer', WebkitAppearance: 'none'
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Alt: ortalı Ok (tüm modal altında) */}
          {!loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, paddingTop: '8px' }}>
              <button onClick={handleClose} disabled={saving} style={{
                width: '140px', height: '42px', background: COLORS.blue, color: COLORS.white, border: 'none',
                borderRadius: '8px', fontSize: '15px', fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
                fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
              }}>
                {saving ? 'Saving...' : 'Ok'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="sm-overlay">
      <style>{styles}</style>

      <div className="sm-modal-wrapper">
        {/* Brick Border */}
        <img src={BrickBorder} alt="" className="sm-brick-border" />

        <div className="sm-modal">
          <div className="sm-header">
            <img src={logoHead} alt="" style={{ height: '45px' }} />
            <img src={logoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          <div className="sm-content">
            <div className="sm-title-row">
              <div className="sm-btn-spacer" />
              <div className="sm-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Streak Manager
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
                  Adjust how streaks are tracked and calculated, including daily activity requirements, play time limits, and grace period settings.
                </p>
              </div>
              <button onClick={handleClose} disabled={saving} className="sm-ok-btn">
                {saving ? 'Saving...' : 'Ok'}
              </button>
            </div>

            {loading ? (
              <div className="sm-loading">Loading...</div>
            ) : (
              <div className="sm-main">
                {renderCalendar()}

                <div className="sm-settings-col">
                  {SETTINGS_CARDS.map((card, i) => (
                    <SettingsCard
                      key={i}
                      title={card.title}
                      settingKey={card.settingKey}
                      options={card.options}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreakManager;