// src/components/dashboard/BuilderHub.jsx
// MiniManage'in Builder versiyonu.
// TASARIM birebir MiniManage baz alınmıştır (responsive clamp'ler, StrokedTitle stroke,
// StreakBrick padding-bottom hack, card-base CSS, row/scenes gridleri).
// TEK FARK: renk paleti siyah/gri tonlara çevrildi ve user tipi "builder" (sadece View modu).
// NOT: Mini Scenes ProgressBrick renkleri MiniManage ile AYNI bırakıldı (kırmızı/sarı/mavi/yeşil).
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvatar } from '../../hooks/useAvatar';
import { avatarImageStyle } from '../../utils/avatars';
import axios from 'axios';

// Modal Components - Builder sadece Progress (View only)
import MotivationMessagesProgress from './MotivationMessagesProgress';
import StreakProgress from './StreakProgress';
import SceneLevelProgress from './SceneLevelProgress';
import RewardsProgress from './RewardsProgress';
import CustomMinisProgress from './CustomMinisProgress';
import MissionsProgress from './MissionsProgress';
import RecordingProgress from './RecordingProgress';

// PNG Assets
import viewBtnImg from '../../assets/view_btn.png';
import viewBtnHoverImg from '../../assets/view_btn_hover.png';
import viewBtn2Img from '../../assets/view_btn_2.png';
import viewBtn2HoverImg from '../../assets/view_btn_2_hover.png';
import cancelBtnImg from '../../assets/cancel_btn.png';
import cancelBtnHoverImg from '../../assets/cancel_btn_hover.png';
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

// ============================================================================
// BUILDER RENK PALETİ - Siyah / Gri tonlar
// MiniManage'deki COLORS ile birebir aynı KEY'ler; sadece değerler gri.
// Böylece component gövdesinde tek bir renk satırı bile değiştirmeye gerek kalmadı.
//   yellow -> orta gri kartlar (Recordings, Customized Minis)
//   blue   -> en koyu kart (Streak)
//   green  -> koyu-orta kart (Missions, Mini Scenes)
//   red    -> koyu gri kart (Rewards)
// İSTİSNA: ProgressBrick içindeki renkler MiniManage'in orijinal renkli paletinden
// alınır (SCENE_BRICK_COLORS). Onlara DOKUNULMADI.
// ============================================================================
const COLORS = {
  // TÜM kartlar düz BEYAZ arka plan + koyu çerçeve (border) ile.
  // MiniManage'deki renkli arka plan key'leri (yellow/blue/green/red) hepsi beyaza eşlendi;
  // ayrım artık renkli zemin değil, ince koyu çerçeve ile sağlanıyor.
  yellow: '#FFFFFF',
  yellowBorder: '#1A1A1A',
  blue: '#FFFFFF',
  green: '#FFFFFF',
  red: '#FFFFFF',
  white: '#FFFFFF',
  gray: '#D8D8D8',
  grayProgress: '#C9C9C9',
  brickGray: '#D9D9D9',     // streak pasif gün brick'i (açık gri)
  brickActive: '#1A1A1A',   // streak aktif gün brick'i (siyah)
  cardBorder: '#D8D8D8',    // kart çerçevesi (hafif gri)
  text: '#1A1A1A',          // siyah metin (beyaz kart üstünde)

  // Profil avatar kutusu için LEGO sarısı (tek renkli aksan - korunur)
  avatarYellow: '#FFCC00',
};

// Mini Scenes ProgressBrick renkleri - MiniManage ORİJİNAL renkleri (DEĞİŞTİRİLMEDİ)
const SCENE_BRICK_COLORS = {
  red: '#E52828',
  yellow: '#FFCC00',
  blue: '#0055BF',
  green: '#237841',
};

// Safari-safe flex styles (MiniManage ile birebir aynı)
const flexStyles = {
  flexCenter: {
    display: 'flex',
    WebkitDisplay: '-webkit-flex',
    WebkitBoxAlign: 'center',
    WebkitAlignItems: 'center',
    alignItems: 'center',
    WebkitBoxPack: 'center',
    WebkitJustifyContent: 'center',
    justifyContent: 'center'
  },
  flexColumn: {
    display: 'flex',
    WebkitDisplay: '-webkit-flex',
    WebkitBoxOrient: 'vertical',
    WebkitBoxDirection: 'normal',
    WebkitFlexDirection: 'column',
    flexDirection: 'column'
  },
  flexBetween: {
    display: 'flex',
    WebkitDisplay: '-webkit-flex',
    WebkitBoxAlign: 'center',
    WebkitAlignItems: 'center',
    alignItems: 'center',
    WebkitBoxPack: 'justify',
    WebkitJustifyContent: 'space-between',
    justifyContent: 'space-between'
  },
  flex1: {
    WebkitBoxFlex: 1,
    WebkitFlex: '1 1 0%',
    flex: '1 1 0%',
    minHeight: 0,
    WebkitMinHeight: 0
  },
  flexShrink0: {
    WebkitFlexShrink: 0,
    flexShrink: 0
  }
};

const BuilderHub = ({ user, builder: builderProp, onClose, onViewProfile }) => {
  const navigate = useNavigate();

  // user veya builder prop'undan builder bilgisini al
  const builder = builderProp || (user ? {
    builder_id: user.user_id,
    full_name: user.profile?.full_name || user.profile?.username || 'Builder',
    username: user.profile?.username
  } : null);

  // Builder sadece normal <-> view
  const [viewMode, setViewMode] = useState('normal');

  const [recordings, setRecordings] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [missions, setMissions] = useState([]);
  const [customizations, setCustomizations] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [motivationMessage, setMotivationMessage] = useState('The bravest Mini ever!');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [rewardsTotals, setRewardsTotals] = useState({ bricks: 0, medals: 0, cups: 0 });
  const [missionDate, setMissionDate] = useState(new Date());

  // Kayıtlı 3D avatar PNG'si (yoksa default profileIcon)
  // Shared with the header and the Builder's own profile.
  const { avatarUrl } = useAvatar('builder', builder?.builder_id);

  const [profileViewHover, setProfileViewHover] = useState(false);
  const [profileOverlayHover, setProfileOverlayHover] = useState(false);
  const [profilePlayHover, setProfilePlayHover] = useState(false);
  const [cancelBtnHover, setCancelBtnHover] = useState(false);

  // View overlay hover states
  const [recordingsViewHover, setRecordingsViewHover] = useState(false);
  const [streakViewHover, setStreakViewHover] = useState(false);
  const [missionsViewHover, setMissionsViewHover] = useState(false);
  const [rewardsViewHover, setRewardsViewHover] = useState(false);
  const [scenesViewHover, setScenesViewHover] = useState(false);
  const [customsViewHover, setCustomsViewHover] = useState(false);

  const [scenesPage, setScenesPage] = useState(0);
  const [customsPage, setCustomsPage] = useState(0);

  // Modal states - Sadece Progress (View only)
  const [motivationProgressOpen, setMotivationProgressOpen] = useState(false);
  const [streakProgressOpen, setStreakProgressOpen] = useState(false);
  const [sceneLevelProgressOpen, setSceneLevelProgressOpen] = useState(false);
  const [rewardsProgressOpen, setRewardsProgressOpen] = useState(false);
  const [customMinisProgressOpen, setCustomMinisProgressOpen] = useState(false);
  const [missionsProgressOpen, setMissionsProgressOpen] = useState(false);
  const [recordingProgressOpen, setRecordingProgressOpen] = useState(false);

  // View mode değiştiğinde tüm hover state'lerini resetle
  useEffect(() => {
    resetAllHoverStates();
  }, [viewMode]);

  const resetAllHoverStates = () => {
    setProfileOverlayHover(false);
    setRecordingsViewHover(false);
    setStreakViewHover(false);
    setMissionsViewHover(false);
    setRewardsViewHover(false);
    setScenesViewHover(false);
    setCustomsViewHover(false);
    setCancelBtnHover(false);
  };

  const handleCancel = () => {
    resetAllHoverStates();
    setViewMode('normal');
  };

  useEffect(() => {
    if (builder?.builder_id) {
      fetchBuilderData();
      fetchMotivationMessage();
    } else {
      setLoading(false);
    }
  }, [builder?.builder_id]);

  useEffect(() => {
    if (builder?.builder_id) {
      fetchCalendarData();
    }
  }, [currentMonth]);

  useEffect(() => {
    if (builder?.builder_id) {
      fetchMissions(missionDate);
    }
  }, [missionDate]);

  const fetchCalendarData = async () => {
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/builder/get-activity.php?builder_id=${builder.builder_id}&month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`
      );
      if (response.data?.success && response.data.data) {
        setCalendarData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    }
  };

  // builder/get-motivation.php -> { active_message, preset_id, date }
  // (Builder motivation günlük otomatik random + 5 gün cooldown ile çalışıyor.)
  const fetchMotivationMessage = async () => {
    if (!builder?.builder_id) return;
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/builder/get-motivation.php?builder_id=${builder.builder_id}`
      );
      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        if (data.active_message && String(data.active_message).trim() !== '') {
          setMotivationMessage(data.active_message);
        }
      }
    } catch (error) {
      console.error('Failed to fetch motivation message:', error);
    }
  };

  const fetchBuilderData = async () => {
    try {
      setLoading(true);
      const dateStr = formatDateStr(missionDate);
      const [recordingsRes, scenesRes, missionsRes, customsRes, activityRes, streakRes, rewardsRes] = await Promise.all([
        axios.get(`https://mini-talks.org/minitalks-api/builder/get-recordings.php?builder_id=${builder.builder_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/builder/get-scenes.php?builder_id=${builder.builder_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/builder/get-missions.php?builder_id=${builder.builder_id}&date=${dateStr}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/builder/get-customizations.php?builder_id=${builder.builder_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/builder/get-activity.php?builder_id=${builder.builder_id}&month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`).catch(() => ({ data: { data: {} } })),
        axios.get(`https://mini-talks.org/minitalks-api/builder/get-streak.php?builder_id=${builder.builder_id}`).catch(() => ({ data: { data: { current_streak: 0 } } })),
        axios.get(`https://mini-talks.org/minitalks-api/builder/get-rewards.php?builder_id=${builder.builder_id}`).catch(() => ({ data: { data: { totals: { bricks: 0, medals: 0, cups: 0 } } } }))
      ]);

      // Recordings: data.recordings veya data (eski format)
      const recData = recordingsRes.data?.data;
      setRecordings(recData?.recordings || (Array.isArray(recData) ? recData : []));

      // Scenes: data array
      setScenes(scenesRes.data?.data || []);

      // Missions: data array
      setMissions(missionsRes.data?.data || []);

      // Customizations: data.minis veya data (eski format)
      const customData = customsRes.data?.data;
      setCustomizations(customData?.minis || (Array.isArray(customData) ? customData : []));

      // Calendar
      setCalendarData(activityRes.data?.data || {});

      if (streakRes.data?.success && streakRes.data.data) {
        setCurrentStreak(streakRes.data.data.current_streak || 0);
      }
      if (rewardsRes.data?.success && rewardsRes.data.data?.totals) {
        setRewardsTotals(rewardsRes.data.data.totals);
      }
    } catch (error) {
      console.error('Failed to fetch builder data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchMissions = async (date) => {
    try {
      const dateStr = formatDateStr(date);
      const response = await axios.get(`https://mini-talks.org/minitalks-api/builder/get-missions.php?builder_id=${builder.builder_id}&date=${dateStr}`);
      if (response.data?.success && response.data.data) {
        setMissions(response.data.data);
      } else {
        setMissions([]);
      }
    } catch (error) {
      console.error('Failed to fetch missions:', error);
      setMissions([]);
    }
  };

  const getMissionDateLabel = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(missionDate);
    selectedDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - selectedDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return missionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleMissionDatePrev = () => {
    const newDate = new Date(missionDate);
    newDate.setDate(newDate.getDate() - 1);
    setMissionDate(newDate);
  };

  const handleMissionDateNext = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = new Date(missionDate);
    currentDate.setHours(0, 0, 0, 0);
    if (currentDate < today) {
      const newDate = new Date(missionDate);
      newDate.setDate(newDate.getDate() + 1);
      setMissionDate(newDate);
    }
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
      days.push({ day: prevMonthDate.getDate() - i, isCurrentMonth: false, isPrevMonth: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, isCurrentMonth: true, hasActivity: calendarData[dateStr] || false });
    }
    let nextDay = 1;
    while (days.length < 35) {
      days.push({ day: nextDay++, isCurrentMonth: false, isNextMonth: true });
    }
    return days.slice(0, 35);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // ===== STREAK BRICK - Safari-safe (MiniManage ile birebir) =====
  const StreakBrick = ({ hasActivity, isCurrentMonth, isPrevMonth, isNextMonth, day }) => {
    const isOtherMonth = isPrevMonth || isNextMonth;
    const isActive = hasActivity && isCurrentMonth;
    // Aktif gün: siyah brick + beyaz yazı. Pasif gün: açık gri brick + siyah yazı.
    const brickColor = isActive ? COLORS.brickActive : COLORS.brickGray;
    const brickOpacity = isOtherMonth ? 0.35 : 1;
    const textColor = isActive ? COLORS.white : COLORS.text;
    const textOpacity = isOtherMonth ? 0.3 : (isActive ? 1 : 0.7);

    return (
      <div style={{ width: '100%', position: 'relative', paddingBottom: '90%', height: 0 }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', WebkitDisplay: '-webkit-flex',
          WebkitBoxOrient: 'vertical', WebkitBoxDirection: 'normal',
          WebkitFlexDirection: 'column', flexDirection: 'column',
          WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center'
        }}>
          <div style={{
            width: '55%', height: '15%', backgroundColor: brickColor,
            borderRadius: '1px 1px 0 0', opacity: brickOpacity,
            WebkitFlexShrink: 0, flexShrink: 0
          }} />
          <div style={{
            width: '80%', WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: '1 1 0%',
            backgroundColor: brickColor, borderRadius: '2px', opacity: brickOpacity
          }} />
          <span style={{
            position: 'absolute', top: '55%', left: '50%',
            WebkitTransform: 'translate(-50%, -50%)', transform: 'translate(-50%, -50%)',
            color: textColor, fontSize: 'clamp(20px, 1.1vw, 14px)', fontWeight: 800,
            opacity: textOpacity, fontFamily: "'Montserrat', sans-serif", lineHeight: 1
          }}>
            {day}
          </span>
        </div>
      </div>
    );
  };

  // ===== PROGRESS BRICK - Mini Scenes (RENKLER DEĞİŞMEDİ) =====
  const ProgressBrick = ({ completed, index }) => {
    const getColor = () => {
      if (!completed) return COLORS.grayProgress;
      if (index < 2) return SCENE_BRICK_COLORS.red;
      if (index < 4) return SCENE_BRICK_COLORS.yellow;
      if (index < 6) return SCENE_BRICK_COLORS.blue;
      return SCENE_BRICK_COLORS.green;
    };
    return (
      <div style={{
        width: 'clamp(14px, 1.6vw, 20px)',
        display: 'flex', WebkitDisplay: '-webkit-flex',
        WebkitBoxOrient: 'vertical', WebkitBoxDirection: 'normal',
        WebkitFlexDirection: 'column', flexDirection: 'column',
        WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center'
      }}>
        <div style={{ width: '60%', height: '4px', backgroundColor: getColor(), borderRadius: '2px 2px 0 0' }} />
        <div style={{ width: '100%', height: '8px', backgroundColor: getColor(), borderRadius: '2px' }} />
      </div>
    );
  };

  const StrokedTitle = ({ children, style = {} }) => (
    <h3 style={{
      fontFamily: "'Montserrat', sans-serif",
      color: COLORS.white,
      WebkitTextStroke: 'clamp(2px, 0.3vw, 3.5px) #000000',
      paintOrder: 'stroke fill',
      fontWeight: 900,
      margin: 0,
      ...style
    }}>
      {children}
    </h3>
  );

  // ===== VIEW OVERLAY (MiniManage ile birebir) =====
  const ViewOverlay = ({ show, isHovered, onHover, onLeave, onViewClick }) => {
    if (!show) return null;
    const handleClick = () => {
      onLeave();
      onViewClick();
    };
    return (
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: 'clamp(14px, 1.6vw, 20px)',
          ...flexStyles.flexCenter, zIndex: 10
        }}
        onMouseLeave={onLeave}
      >
        <button onClick={handleClick} onMouseEnter={onHover} onMouseLeave={onLeave} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          <img src={isHovered ? viewBtnHoverImg : viewBtnImg} alt="View" style={{ height: 'clamp(40px, 6vw, 50px)' }} />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ ...flexStyles.flexCenter, height: '100%' }}>
        <div style={{ fontSize: 'clamp(20px, 2.5vw, 28px)' }}>🧱 Loading...</div>
      </div>
    );
  }

  const isViewMode = viewMode === 'view';

  // Responsive CSS - MiniManage ile birebir
  const responsiveStyles = `
    .mini-manage-container {
      font-family: 'Montserrat', sans-serif;
      height: 100%;
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      -ms-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
    }
    .row-1 {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 1fr 1fr 1fr;
      grid-template-columns: repeat(4, 1fr);
      gap: clamp(6px, 0.8vw, 10px);
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      -ms-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
    }
    .row-2 {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 1fr;
      grid-template-columns: repeat(2, 1fr);
      gap: clamp(6px, 0.8vw, 10px);
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      -ms-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      margin-top: clamp(6px, 0.8vw, 10px);
    }
    @media (max-width: 1200px) {
      .row-1 {
        -ms-grid-columns: 1fr 1fr;
        grid-template-columns: repeat(2, 1fr);
      }
      .mini-manage-container {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
    }
    @media (max-width: 768px) {
      .row-1 { -ms-grid-columns: 1fr; grid-template-columns: 1fr; }
      .row-2 { -ms-grid-columns: 1fr; grid-template-columns: 1fr; }
      .mini-manage-container {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
    }
    .scenes-grid {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 1fr 1fr;
      grid-template-columns: repeat(3, 1fr);
      gap: clamp(8px, 1vw, 12px);
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      -ms-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
    }
    @media (max-width: 900px) {
      .scenes-grid { -ms-grid-columns: 1fr 1fr; grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 500px) {
      .scenes-grid { -ms-grid-columns: 1fr; grid-template-columns: 1fr; }
    }
    .card-base {
      border-radius: clamp(16px, 1.8vw, 22px);
      border: 4px solid #D8D8D8;
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      -ms-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
      -webkit-min-height: 0;
    }
  `;

  return (
    <div className="mini-manage-container">
      <style>{responsiveStyles}</style>

      {/* Row 1 */}
      <div className="row-1">

        {/* PROFILE CARD */}
        <div
          className="card-base"
          style={{
            backgroundColor: COLORS.white,
            border: `4px solid ${COLORS.cardBorder}`,
            padding: 'clamp(8px, 1vw, 16px)',
            WebkitBoxPack: 'justify',
            WebkitJustifyContent: 'space-between',
            justifyContent: 'space-between',
            position: 'relative'
          }}
        >
          <div style={{
            ...flexStyles.flexColumn,
            WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center',
            position: 'relative', ...flexStyles.flex1, overflow: 'hidden'
          }}>
            <div style={{
              width: 'clamp(65px, 8vw, 150px)',
              height: 'clamp(65px, 8vw, 150px)',
              backgroundColor: COLORS.avatarYellow,
              borderRadius: 'clamp(10px, 1.2vw, 18px)',
              ...flexStyles.flexCenter,
              marginBottom: 'clamp(3px, 0.4vw, 8px)',
              overflow: 'hidden',
              WebkitFlexShrink: 1, flexShrink: 1
            }}>
              <img src={avatarUrl || profileIcon} alt={builder?.full_name} style={avatarImageStyle(avatarUrl, '80%')} />
            </div>

            <div style={{
              fontSize: 'clamp(14px, 1.5vw, 24px)', fontWeight: 700, color: '#000', marginBottom: '1px',
              ...flexStyles.flexShrink0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%'
            }}>
              {builder?.full_name || 'builder_name_01'}
            </div>

            <div style={{ fontSize: 'clamp(15px, 1.6vw, 26px)', fontWeight: 900, textAlign: 'center', lineHeight: 1.1 }}>
              {motivationMessage}
            </div>

            {/* Profile Overlay - sadece view modunda */}
            {isViewMode && (
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderRadius: '16px', ...flexStyles.flexCenter, zIndex: 10
                }}
                onMouseLeave={() => setProfileOverlayHover(false)}
              >
                <button
                  onClick={() => {
                    setProfileOverlayHover(false);
                    setMotivationProgressOpen(true);
                  }}
                  onMouseEnter={() => setProfileOverlayHover(true)}
                  onMouseLeave={() => setProfileOverlayHover(false)}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img src={profileOverlayHover ? viewBtnHoverImg : viewBtnImg} alt="View" style={{ height: 'clamp(40px, 6vw, 50px)' }} />
                </button>
              </div>
            )}
          </div>

          {/* Alt kısım - Play + View / Cancel butonları */}
          <div style={{
            display: 'flex', WebkitDisplay: '-webkit-flex',
            gap: 'clamp(5px, 0.6vw, 12px)',
            WebkitBoxPack: 'center', WebkitJustifyContent: 'center', justifyContent: 'center',
            marginTop: 'clamp(6px, 0.7vw, 14px)', position: 'relative', zIndex: 20,
            flexWrap: 'nowrap', WebkitFlexWrap: 'nowrap', WebkitFlexShrink: 0, flexShrink: 0
          }}>
            {/* Play - her zaman görünür */}
            <button
              onClick={() => {
                const builderMini = {
                  builder_id: builder?.builder_id || builder?.user_id,
                  mini_name: builder?.full_name || 'Builder',
                  is_builder: true
                };
                sessionStorage.setItem('selectedMini', JSON.stringify(builderMini));
                sessionStorage.setItem('playMode', 'true');
                navigate('/scene-selection');
              }}
              onMouseEnter={() => setProfilePlayHover(true)}
              onMouseLeave={() => setProfilePlayHover(false)}
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
            >
              <img src={profilePlayHover ? playBtnProfileHover : playBtnProfile} alt="Play" style={{ height: 'clamp(32px, 3.5vw, 55px)', width: 'auto', display: 'block' }} />
            </button>

            {/* View butonu - normal modda */}
            {viewMode === 'normal' && (
              <button
                onClick={() => setViewMode('view')}
                onMouseEnter={() => setProfileViewHover(true)}
                onMouseLeave={() => setProfileViewHover(false)}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
              >
                <img src={profileViewHover ? viewBtn2HoverImg : viewBtn2Img} alt="View" style={{ height: 'clamp(32px, 3.5vw, 55px)' }} />
              </button>
            )}

            {/* View modunda: aktif View + Cancel */}
            {viewMode === 'view' && (
              <>
                <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'default', opacity: 0.7 }}>
                  <img src={viewBtn2HoverImg} alt="View Active" style={{ height: 'clamp(32px, 3.5vw, 55px)' }} />
                </button>
                <button
                  onClick={handleCancel}
                  onMouseEnter={() => setCancelBtnHover(true)}
                  onMouseLeave={() => setCancelBtnHover(false)}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img src={cancelBtnHover ? cancelBtnHoverImg : cancelBtnImg} alt="Cancel" style={{ height: 'clamp(32px, 3.5vw, 55px)' }} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* RECORDINGS */}
        <div
          className="card-base"
          style={{ backgroundColor: COLORS.yellow, padding: 'clamp(10px, 1.2vw, 14px)', position: 'relative' }}
        >
          <ViewOverlay show={isViewMode} isHovered={recordingsViewHover} onHover={() => setRecordingsViewHover(true)} onLeave={() => setRecordingsViewHover(false)} onViewClick={() => setRecordingProgressOpen(true)} />

          <div style={{ ...flexStyles.flexBetween, marginBottom: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flexShrink0 }}>
            <StrokedTitle style={{ fontSize: 'clamp(18px, 2vw, 24px)' }}>Recordings</StrokedTitle>
            <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', gap: 'clamp(4px, 0.5vw, 8px)' }}>
              <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={recordingsDownBtn} alt="Down" style={{ height: 'clamp(22px, 2.6vw, 30px)' }} />
              </button>
              <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={recordingsUpBtn} alt="Up" style={{ height: 'clamp(22px, 2.6vw, 30px)' }} />
              </button>
            </div>
          </div>

          <div style={{ ...flexStyles.flexColumn, gap: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flex1, overflow: 'hidden' }}>
            {recordings.length > 0 ? recordings.slice(0, 4).map((rec, idx) => (
              <div key={`rec-${rec.recording_id || idx}-${idx}`} style={{
                backgroundColor: COLORS.white,
                borderRadius: 'clamp(8px, 1vw, 12px)',
                border: '2px solid #D8D8D8',
                display: 'flex', WebkitDisplay: '-webkit-flex',
                WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center',
                padding: 'clamp(4px, 0.5vw, 6px)',
                WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: '1 1 0%',
                minHeight: 0, WebkitMinHeight: 0
              }}>
                <div style={{
                  width: 'clamp(55px, 6.5vw, 75px)', height: 'clamp(38px, 4.5vw, 55px)',
                  ...flexStyles.flexShrink0, borderRadius: 'clamp(5px, 0.6vw, 8px)',
                  overflow: 'hidden', backgroundColor: '#f0f0f0'
                }}>
                  <img src={rec.scene_image || recordingsImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ WebkitBoxFlex: 1, WebkitFlex: '1 1 0%', flex: '1 1 0%', padding: '0 clamp(6px, 0.7vw, 10px)', minWidth: 0 }}>
                  <div style={{ fontSize: 'clamp(10px, 1.1vw, 13px)', fontWeight: 600, color: '#000' }}>{formatDate(rec.created_at)}</div>
                  <div style={{ fontSize: 'clamp(13px, 1.4vw, 17px)', fontWeight: 900, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.scene_name || 'Unknown Scene'}</div>
                  <div style={{ fontSize: 'clamp(11px, 1.2vw, 14px)', fontWeight: 700, color: '#000' }}>{rec.word_name || 'Sound'}</div>
                </div>
                <div style={{ fontSize: 'clamp(13px, 1.4vw, 17px)', fontWeight: 700, color: '#000', paddingRight: 'clamp(4px, 0.5vw, 6px)' }}>{formatDuration(rec.duration_seconds || 0)}</div>
              </div>
            )) : (
              <div style={{
                backgroundColor: COLORS.white, borderRadius: '10px',
                padding: 'clamp(14px, 1.8vw, 20px)', textAlign: 'center', color: '#999',
                fontSize: 'clamp(14px, 1.5vw, 18px)', ...flexStyles.flex1, ...flexStyles.flexCenter
              }}>
                No recordings yet
              </div>
            )}
          </div>
        </div>

        {/* STREAK */}
        <div
          className="card-base"
          style={{ backgroundColor: COLORS.blue, padding: 'clamp(8px, 1vw, 12px) clamp(10px, 1.2vw, 14px)', position: 'relative' }}
        >
          <ViewOverlay show={isViewMode} isHovered={streakViewHover} onHover={() => setStreakViewHover(true)} onLeave={() => setStreakViewHover(false)} onViewClick={() => setStreakProgressOpen(true)} />

          <div style={{ ...flexStyles.flexBetween, ...flexStyles.flexShrink0 }}>
            <StrokedTitle style={{ fontSize: 'clamp(20px, 2.2vw, 28px)' }}>Streak</StrokedTitle>
            <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: 'clamp(4px, 0.5vw, 6px)' }}>
              <button onClick={prevMonth} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={leftBtnSmall} alt="Prev" style={{ width: 'clamp(12px, 1.4vw, 16px)', height: 'clamp(16px, 1.8vw, 20px)' }} />
              </button>
              <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 'clamp(12px, 1.3vw, 16px)', minWidth: 'clamp(55px, 6vw, 70px)', textAlign: 'center' }}>
                {currentMonth.toLocaleDateString('en-US', { month: 'short' })} '{currentMonth.getFullYear().toString().slice(-2)}
              </span>
              <button onClick={nextMonth} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={rightBtnSmall} alt="Next" style={{ width: 'clamp(12px, 1.4vw, 16px)', height: 'clamp(16px, 1.8vw, 20px)' }} />
              </button>
            </div>
          </div>

          {/* "day streak!" - beyaz kart üzerinde siyah */}
          <div style={{ color: COLORS.text, fontWeight: 800, fontSize: 'clamp(16px, 1.7vw, 22px)', marginBottom: 'clamp(3px, 0.4vw, 5px)', ...flexStyles.flexShrink0 }}>
            {currentStreak} day streak!
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'clamp(3px, 0.4vw, 5px)', marginBottom: 'clamp(2px, 0.3vw, 4px)', ...flexStyles.flexShrink0 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} style={{ color: COLORS.text, fontSize: 'clamp(9px, 1vw, 12px)', fontWeight: 800, textAlign: 'center' }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'clamp(3px, 0.4vw, 5px)', rowGap: 'clamp(2px, 0.3vw, 4px)', ...flexStyles.flex1, alignContent: 'stretch' }}>
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
        <div style={{ ...flexStyles.flexColumn, gap: 'clamp(6px, 0.8vw, 10px)', minHeight: 0, WebkitMinHeight: 0 }}>
          {/* Missions */}
          <div
            className="card-base"
            style={{ backgroundColor: COLORS.green, padding: 'clamp(10px, 1.2vw, 14px)', position: 'relative', ...flexStyles.flex1, overflow: 'hidden' }}
          >
            <ViewOverlay show={isViewMode} isHovered={missionsViewHover} onHover={() => setMissionsViewHover(true)} onLeave={() => setMissionsViewHover(false)} onViewClick={() => setMissionsProgressOpen(true)} />

            <div style={{ ...flexStyles.flexBetween, marginBottom: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flexShrink0 }}>
              <StrokedTitle style={{ fontSize: 'clamp(18px, 2vw, 24px)' }}>Mini Missions</StrokedTitle>
              <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: '4px' }}>
                <button onClick={handleMissionDatePrev} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                  <img src={leftBtnSmall} alt="Prev" style={{ width: 'clamp(12px, 1.4vw, 16px)', height: 'clamp(16px, 1.7vw, 20px)' }} />
                </button>
                <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 'clamp(13px, 1.4vw, 17px)', minWidth: 'clamp(52px, 5.5vw, 65px)', textAlign: 'center' }}>{getMissionDateLabel()}</span>
                <button
                  onClick={handleMissionDateNext}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: getMissionDateLabel() === 'Today' ? 'default' : 'pointer', opacity: getMissionDateLabel() === 'Today' ? 0.5 : 1 }}
                  disabled={getMissionDateLabel() === 'Today'}
                >
                  <img src={rightBtnSmall} alt="Next" style={{ width: 'clamp(12px, 1.4vw, 16px)', height: 'clamp(16px, 1.7vw, 20px)' }} />
                </button>
              </div>
            </div>

            <div style={{ ...flexStyles.flexColumn, gap: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flex1, overflow: 'hidden' }}>
              {missions.length > 0 ? missions.slice(0, 2).map((mission, idx) => (
                <div key={`mission-${mission.mission_id || idx}-${idx}`} style={{
                  backgroundColor: COLORS.white,
                  border: '2px solid #D8D8D8',
                  borderRadius: 'clamp(8px, 1vw, 12px)',
                  padding: 'clamp(10px, 1.2vw, 14px) clamp(12px, 1.4vw, 16px)',
                  display: 'flex', WebkitDisplay: '-webkit-flex',
                  WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center',
                  gap: 'clamp(8px, 1vw, 12px)', ...flexStyles.flex1
                }}>
                  {mission.is_completed ? (
                    <div style={{
                      width: 'clamp(22px, 2.2vw, 28px)', height: 'clamp(22px, 2.2vw, 28px)',
                      backgroundColor: COLORS.brickActive, borderRadius: '5px',
                      ...flexStyles.flexCenter, ...flexStyles.flexShrink0
                    }}>
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div style={{ width: 'clamp(22px, 2.2vw, 28px)', height: 'clamp(22px, 2.2vw, 28px)', border: `2px solid ${COLORS.gray}`, borderRadius: '5px', ...flexStyles.flexShrink0 }} />
                  )}
                  <span style={{ fontWeight: 600, fontSize: 'clamp(13px, 1.5vw, 18px)' }}>{mission.mission_title}</span>
                </div>
              )) : (
                <div style={{
                  backgroundColor: COLORS.white, borderRadius: '10px',
                  padding: 'clamp(12px, 1.4vw, 16px)', textAlign: 'center', color: COLORS.gray,
                  fontSize: 'clamp(13px, 1.5vw, 18px)', ...flexStyles.flex1, ...flexStyles.flexCenter
                }}>
                  No missions assigned yet
                </div>
              )}
            </div>
          </div>

          {/* REWARDS */}
          <div
            className="card-base"
            style={{ backgroundColor: COLORS.red, padding: 'clamp(10px, 1.2vw, 14px)', position: 'relative', ...flexStyles.flex1, overflow: 'hidden' }}
          >
            <ViewOverlay show={isViewMode} isHovered={rewardsViewHover} onHover={() => setRewardsViewHover(true)} onLeave={() => setRewardsViewHover(false)} onViewClick={() => setRewardsProgressOpen(true)} />

            <StrokedTitle style={{ fontSize: 'clamp(18px, 2vw, 24px)', marginBottom: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flexShrink0 }}>Rewards</StrokedTitle>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(6px, 0.7vw, 10px)', ...flexStyles.flex1 }}>
              <div style={{ backgroundColor: COLORS.white, border: '2px solid #D8D8D8', borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn }}>
                <div style={{ fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 700, color: '#000', textAlign: 'center', padding: 'clamp(5px, 0.6vw, 9px) clamp(3px, 0.4vw, 6px) clamp(3px, 0.4vw, 6px)' }}>Bricks</div>
                <div style={{ height: '2px', backgroundColor: COLORS.brickActive, margin: '0 8px' }} />
                <div style={{ ...flexStyles.flexCenter, gap: 'clamp(4px, 0.5vw, 8px)', padding: 'clamp(8px, 0.9vw, 12px) clamp(4px, 0.5vw, 8px)', ...flexStyles.flex1 }}>
                  <img src={bricksIcon} alt="Bricks" style={{ height: 'clamp(26px, 3vw, 38px)', objectFit: 'contain' }} />
                  <span style={{ fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 900 }}>{rewardsTotals.bricks}</span>
                </div>
              </div>

              <div style={{ backgroundColor: COLORS.white, border: '2px solid #D8D8D8', borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn }}>
                <div style={{ fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 700, color: '#000', textAlign: 'center', padding: 'clamp(5px, 0.6vw, 9px) clamp(3px, 0.4vw, 6px) clamp(3px, 0.4vw, 6px)' }}>Medals</div>
                <div style={{ height: '2px', backgroundColor: COLORS.brickActive, margin: '0 8px' }} />
                <div style={{ ...flexStyles.flexCenter, gap: 'clamp(4px, 0.5vw, 8px)', padding: 'clamp(8px, 0.9vw, 12px) clamp(4px, 0.5vw, 8px)', ...flexStyles.flex1 }}>
                  <img src={medalsIcon} alt="Medals" style={{ height: 'clamp(30px, 3.1vw, 48px)', objectFit: 'contain' }} />
                  <span style={{ fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 900 }}>{rewardsTotals.medals}</span>
                </div>
              </div>

              <div style={{ backgroundColor: COLORS.white, border: '2px solid #D8D8D8', borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn }}>
                <div style={{ fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 700, color: '#000', textAlign: 'center', padding: 'clamp(5px, 0.6vw, 9px) clamp(3px, 0.4vw, 6px) clamp(3px, 0.4vw, 6px)' }}>Cup</div>
                <div style={{ height: '2px', backgroundColor: COLORS.brickActive, margin: '0 8px' }} />
                <div style={{ ...flexStyles.flexCenter, gap: 'clamp(4px, 0.5vw, 8px)', padding: 'clamp(8px, 0.9vw, 12px) clamp(4px, 0.5vw, 8px)', ...flexStyles.flex1 }}>
                  <img src={cupIcon} alt="Cup" style={{ height: 'clamp(30px, 3.1vw, 48px)', objectFit: 'contain' }} />
                  <span style={{ fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 900 }}>{rewardsTotals.cups}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="row-2">

        {/* MINI SCENES */}
        <div
          className="card-base"
          style={{ backgroundColor: COLORS.green, padding: 'clamp(12px, 1.4vw, 16px)', position: 'relative' }}
        >
          <ViewOverlay show={isViewMode} isHovered={scenesViewHover} onHover={() => setScenesViewHover(true)} onLeave={() => setScenesViewHover(false)} onViewClick={() => setSceneLevelProgressOpen(true)} />

          <StrokedTitle style={{ fontSize: 'clamp(20px, 2.2vw, 28px)', marginBottom: 'clamp(6px, 0.8vw, 10px)', ...flexStyles.flexShrink0 }}>Mini Scenes</StrokedTitle>

          <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: 'clamp(6px, 0.7vw, 10px)', ...flexStyles.flex1 }}>
            <button onClick={() => setScenesPage(Math.max(0, scenesPage - 1))} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...flexStyles.flexShrink0 }}>
              <img src={leftBtnBig} alt="Prev" style={{ width: 'clamp(24px, 2.8vw, 34px)', height: 'clamp(24px, 2.8vw, 34px)', filter: 'brightness(0) invert(0)' }} />
            </button>

            <div className="scenes-grid" style={{ height: '100%' }}>
              {scenes.length > 0 ? scenes.slice(scenesPage * 3, (scenesPage + 1) * 3).map((scene, idx) => (
                <div key={`scene-${scene.scene_id || idx}-${idx}`} style={{ backgroundColor: COLORS.white, border: '2px solid #D8D8D8', borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn, height: '100%' }}>
                  <div style={{ ...flexStyles.flex1, margin: 'clamp(4px, 0.5vw, 6px)', borderRadius: 'clamp(6px, 0.7vw, 8px)', overflow: 'hidden', position: 'relative', backgroundColor: '#f0f0f0', minHeight: 0, WebkitMinHeight: 0 }}>
                    <img src={scene.scene_image || scenesImage} alt={scene.scene_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {scene.is_locked && (
                      <>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', opacity: 0.5 }} />
                        <img src={lockIcon} alt="Locked" style={{ position: 'absolute', left: '50%', top: '50%', WebkitTransform: 'translate(-50%, -50%)', transform: 'translate(-50%, -50%)', width: 'clamp(28px, 3.5vw, 38px)', height: 'clamp(28px, 3.5vw, 38px)' }} />
                      </>
                    )}
                  </div>
                  <div style={{ padding: 'clamp(4px, 0.5vw, 6px) clamp(6px, 0.7vw, 8px) clamp(8px, 0.9vw, 10px)', ...flexStyles.flexShrink0 }}>
                    <div style={{ fontWeight: 900, fontSize: 'clamp(13px, 1.5vw, 18px)', textAlign: 'center', marginBottom: 'clamp(4px, 0.5vw, 6px)' }}>{scene.scene_name}</div>
                    <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxPack: 'center', WebkitJustifyContent: 'center', justifyContent: 'center', gap: '2px' }}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <ProgressBrick key={i} completed={i < (scene.words_completed || 0)} index={i} />
                      ))}
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ gridColumn: 'span 3', backgroundColor: COLORS.white, borderRadius: '10px', padding: 'clamp(24px, 3vw, 32px)', textAlign: 'center', color: '#999', fontSize: 'clamp(14px, 1.5vw, 18px)', ...flexStyles.flexCenter }}>
                  No scenes available
                </div>
              )}
            </div>

            <button onClick={() => setScenesPage(Math.min(Math.ceil(scenes.length / 3) - 1, scenesPage + 1))} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...flexStyles.flexShrink0 }}>
              <img src={rightBtnBig} alt="Next" style={{ width: 'clamp(24px, 2.8vw, 34px)', height: 'clamp(24px, 2.8vw, 34px)', filter: 'brightness(0) invert(0)' }} />
            </button>
          </div>

          <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxPack: 'center', WebkitJustifyContent: 'center', justifyContent: 'center', gap: '6px', marginTop: 'clamp(6px, 0.7vw, 10px)', ...flexStyles.flexShrink0 }}>
            {Array.from({ length: Math.max(1, Math.ceil(scenes.length / 3)) }).map((_, i) => (
              <div key={i} style={{ width: 'clamp(8px, 1vw, 10px)', height: 'clamp(8px, 1vw, 10px)', backgroundColor: COLORS.brickActive, opacity: i === scenesPage ? 1 : 0.25, borderRadius: '2px' }} />
            ))}
          </div>
        </div>

        {/* MY CUSTOMIZED MINIS */}
        <div
          className="card-base"
          style={{ backgroundColor: COLORS.yellow, padding: 'clamp(12px, 1.4vw, 16px)', position: 'relative' }}
        >
          <ViewOverlay show={isViewMode} isHovered={customsViewHover} onHover={() => setCustomsViewHover(true)} onLeave={() => setCustomsViewHover(false)} onViewClick={() => setCustomMinisProgressOpen(true)} />

          <StrokedTitle style={{ fontSize: 'clamp(20px, 2.2vw, 28px)', marginBottom: 'clamp(6px, 0.8vw, 10px)', ...flexStyles.flexShrink0 }}>My Customized Minis</StrokedTitle>

          <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: 'clamp(6px, 0.7vw, 10px)', ...flexStyles.flex1 }}>
            <button onClick={() => setCustomsPage(Math.max(0, customsPage - 1))} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...flexStyles.flexShrink0 }}>
              <img src={leftBtnBig} alt="Prev" style={{ width: 'clamp(24px, 2.8vw, 34px)', height: 'clamp(24px, 2.8vw, 34px)', filter: 'brightness(0) invert(0)' }} />
            </button>

            <div className="scenes-grid" style={{ height: '100%' }}>
              {customizations.length > 0 ? customizations.slice(customsPage * 3, (customsPage + 1) * 3).map((custom, idx) => (
                <div key={`custom-${custom.customization_id || idx}-${idx}`} style={{ backgroundColor: COLORS.white, border: '2px solid #D8D8D8', borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', height: '100%', padding: 'clamp(4px, 0.5vw, 6px)' }}>
                  <div style={{ height: '100%', borderRadius: 'clamp(6px, 0.7vw, 8px)', overflow: 'hidden', backgroundColor: '#f0f0f0', position: 'relative' }}>
                    <img src={custom.scene_image || minisEnvironment} alt="Background" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {custom.display_image && (
                      <img src={custom.display_image} alt="Mini" style={{ position: 'absolute', top: '50%', left: '50%', WebkitTransform: 'translate(-50%, -50%)', transform: 'translate(-50%, -50%)', height: '85%', objectFit: 'contain' }} />
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ gridColumn: 'span 3', backgroundColor: COLORS.white, borderRadius: '10px', padding: 'clamp(24px, 3vw, 32px)', textAlign: 'center', color: '#999', fontSize: 'clamp(14px, 1.5vw, 18px)', ...flexStyles.flexCenter }}>
                  No customized minis yet
                </div>
              )}
            </div>

            <button onClick={() => setCustomsPage(Math.min(Math.ceil(customizations.length / 3) - 1, customsPage + 1))} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...flexStyles.flexShrink0 }}>
              <img src={rightBtnBig} alt="Next" style={{ width: 'clamp(24px, 2.8vw, 34px)', height: 'clamp(24px, 2.8vw, 34px)', filter: 'brightness(0) invert(0)' }} />
            </button>
          </div>

          <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxPack: 'center', WebkitJustifyContent: 'center', justifyContent: 'center', gap: '6px', marginTop: 'clamp(6px, 0.7vw, 10px)', ...flexStyles.flexShrink0 }}>
            {Array.from({ length: Math.max(1, Math.ceil(customizations.length / 3)) }).map((_, i) => (
              <div key={i} style={{ width: 'clamp(8px, 1vw, 10px)', height: 'clamp(8px, 1vw, 10px)', backgroundColor: COLORS.brickActive, opacity: i === customsPage ? 1 : 0.25, borderRadius: '2px' }} />
            ))}
          </div>
        </div>
      </div>

      {/* ===== MODALS - Sadece Progress (View Only) - entityType='builder' ===== */}
      <MotivationMessagesProgress
        mini={{ builder_id: builder?.builder_id, mini_name: builder?.full_name }}
        isOpen={motivationProgressOpen}
        onClose={() => setMotivationProgressOpen(false)}
        entityType="builder"
      />
      <StreakProgress
        mini={{ builder_id: builder?.builder_id, mini_name: builder?.full_name }}
        isOpen={streakProgressOpen}
        onClose={() => setStreakProgressOpen(false)}
        entityType="builder"
      />
      <SceneLevelProgress
        mini={{ builder_id: builder?.builder_id, mini_name: builder?.full_name }}
        isOpen={sceneLevelProgressOpen}
        onClose={() => setSceneLevelProgressOpen(false)}
        entityType="builder"
      />
      <RewardsProgress
        isOpen={rewardsProgressOpen}
        onClose={() => setRewardsProgressOpen(false)}
        miniId={builder?.builder_id}
        entityType="builder"
      />
      <CustomMinisProgress
        isOpen={customMinisProgressOpen}
        onClose={() => setCustomMinisProgressOpen(false)}
        miniId={builder?.builder_id}
        entityType="builder"
      />
      <MissionsProgress
        mini={{ builder_id: builder?.builder_id, mini_name: builder?.full_name }}
        isOpen={missionsProgressOpen}
        onClose={() => setMissionsProgressOpen(false)}
        entityType="builder"
      />
      <RecordingProgress
        mini={{ builder_id: builder?.builder_id, mini_name: builder?.full_name }}
        isOpen={recordingProgressOpen}
        onClose={() => setRecordingProgressOpen(false)}
        entityType="builder"
      />
    </div>
  );
};

export default BuilderHub;