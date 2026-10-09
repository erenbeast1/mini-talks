// src/components/dashboard/MiniManage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import cancelBtnImg from '../../assets/cancel_btn.png';
import cancelBtnHoverImg from '../../assets/cancel_btn_hover.png';
import profileIcon from '../../assets/profile-icon.png';
import playBtnProfile from '../../assets/play_red_btn.png';
import playBtnProfileHover from '../../assets/play_red_btn_hover.png';

// Figma Asset Imports
import bricksIcon from '../../assets/Bricks Icon.png';
import cupIcon from '../../assets/Cup Icon.png';
import medalsIcon from '../../assets/Medals Icon.png';
import lockIcon from '../../assets/Lock Icon.png';
import leftBtnBig from '../../assets/Left Buton_Buyuk.png';
import rightBtnBig from '../../assets/Right Buton_Buyuk.png';
import leftBtnSmall from '../../assets/Left Buton_Kucuk.png';
import rightBtnSmall from '../../assets/Right Buton_Kucuk.png';
// Carousel ok ikonları (SceneSelectionPage ile aynı)
import leftSlider from '../../assets/left_slider_icon.png';
import rightSlider from '../../assets/right_slider_icon.png';
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

// Safari-safe flex styles
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

const MiniManage = ({ mini, onClose, onViewProfile, viewerRole = 'parent' }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('normal');

  // ── Responsive: mobil/tablet tespiti (desktop görünümü değişmez) ──
  const [screenSize, setScreenSize] = useState('desktop');
  const [viewportH, setViewportH] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  // Mobile carousel
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const carouselRef = useRef(null);
  const [carouselW, setCarouselW] = useState(0);
  const [carouselH, setCarouselH] = useState(0);

  useEffect(() => {
    const updateScreen = () => {
      setViewportH(window.innerHeight);
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
  const isTablet = screenSize === 'tablet';
  const isSmallScreen = isMobile || isTabletSmall || isTablet;

  // Carousel görünür alan genişliğini ölç
  useEffect(() => {
    const measure = () => {
      if (carouselRef.current) {
        setCarouselW(carouselRef.current.offsetWidth);
        setCarouselH(carouselRef.current.offsetHeight);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', () => setTimeout(measure, 180));
    const t = setTimeout(measure, 220);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [screenSize]);

  // Boyut değişince carousel başa sarsın (loading guard'ından ÖNCE — hook sırası sabit kalsın)
  useEffect(() => {
    setCurrentSlide(0);
  }, [screenSize, carouselW]);

  const [recordings, setRecordings] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [missions, setMissions] = useState([]);
  const [customizations, setCustomizations] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Motivation message - Mini kartında gösterilecek
  const [motivationMessage, setMotivationMessage] = useState('The bravest Mini ever!');
  
  // Streak bilgisi - API'den çekilecek
  const [currentStreak, setCurrentStreak] = useState(0);
  
  // Rewards totals - API'den çekilecek
  const [rewardsTotals, setRewardsTotals] = useState({ bricks: 0, medals: 0, cups: 0 });
  
  // Mission tarihi - Today/Yesterday geçişi için
  const [missionDate, setMissionDate] = useState(new Date());
  
  const [profileManageHover, setProfileManageHover] = useState(false);
  const [profileViewHover, setProfileViewHover] = useState(false);
  const [profileOverlayHover, setProfileOverlayHover] = useState(false);
  const [profilePlayHover, setProfilePlayHover] = useState(false);
  const [cancelBtnHover, setCancelBtnHover] = useState(false);
  
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

  // View mode değiştiğinde tüm hover state'lerini resetle
  useEffect(() => {
    resetAllHoverStates();
  }, [viewMode]);

  // Tüm hover state'lerini resetleyen fonksiyon
  const resetAllHoverStates = () => {
    setProfileOverlayHover(false);
    setRecordingsManageHover(false);
    setStreakManageHover(false);
    setMissionsManageHover(false);
    setRewardsManageHover(false);
    setScenesManageHover(false);
    setCustomsManageHover(false);
    setRecordingsViewHover(false);
    setStreakViewHover(false);
    setMissionsViewHover(false);
    setRewardsViewHover(false);
    setScenesViewHover(false);
    setCustomsViewHover(false);
    setCancelBtnHover(false);
  };

  // Cancel ve normal moda geçiş
  const handleCancel = () => {
    resetAllHoverStates();
    setViewMode('normal');
  };

  useEffect(() => {
    if (mini?.mini_id) {
      fetchMiniData();
      fetchMotivationMessage();
    } else {
      setLoading(false);
    }
  }, [mini?.mini_id]);

   useEffect(() => {
    if (!mini?.mini_id) return;
    axios.get(`https://mini-talks.org/minitalks-api/avatar/get.php`, { params: { user_id: mini.mini_id, role: 'mini' } })
      .then((res) => {
        if (res.data?.success && res.data.data?.avatar_url) {
          setAvatarUrl(res.data.data.avatar_url);
        }
      })
      .catch(() => {});
  }, [mini?.mini_id]);

  // Ay değiştiğinde takvim verisini güncelle
  useEffect(() => {
    if (mini?.mini_id) {
      fetchCalendarData();
    }
  }, [currentMonth]);

  // Mission tarihi değiştiğinde missions'ı güncelle
  useEffect(() => {
    if (mini?.mini_id) {
      fetchMissions(missionDate);
    }
  }, [missionDate]);

  // Sadece takvim verisini çek
  const fetchCalendarData = async () => {
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/mini/get-activity.php?mini_id=${mini.mini_id}&month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`
      );
      if (response.data?.success && response.data.data) {
        setCalendarData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    }
  };

  // Motivation mesajını API'den çek
  const fetchMotivationMessage = async () => {
    if (!mini?.mini_id) return;
    
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/motivation/get-messages.php?mini_id=${mini.mini_id}&parent_id=${mini.parent_id || 0}`
      );
      
      if (response.data?.success && response.data.data) {
        const data = response.data.data;
        
        // Önce custom message kontrol et
        if (data.custom_message && data.custom_message.trim() !== '') {
          setMotivationMessage(data.custom_message);
        } 
        // Sonra seçili preset'leri kontrol et
        else if (data.selected_preset_ids && data.selected_preset_ids.length > 0) {
          const presetMessages = [
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
          
          const selectedIds = Array.isArray(data.selected_preset_ids) 
            ? data.selected_preset_ids 
            : JSON.parse(data.selected_preset_ids);
          
          // Rotate daily ise rastgele seç, değilse ilkini al
          if (data.display_duration === 'rotate' && selectedIds.length > 1) {
            const randomIndex = Math.floor(Math.random() * selectedIds.length);
            const presetIndex = Number(selectedIds[randomIndex]);
            setMotivationMessage(presetMessages[presetIndex] || 'The bravest Mini ever!');
          } else {
            const presetIndex = Number(selectedIds[0]);
            setMotivationMessage(presetMessages[presetIndex] || 'The bravest Mini ever!');
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch motivation message:', error);
    }
  };

  // Motivation mesajı güncellendiğinde çağrılacak callback
  const handleMotivationSave = (data) => {
    if (data.activeMessage) {
      setMotivationMessage(data.activeMessage);
    }
  };

  const fetchMiniData = async () => {
    try {
      setLoading(true);
      const dateStr = formatDateStr(missionDate);
      const [recordingsRes, scenesRes, missionsRes, customsRes, activityRes, streakRes, rewardsRes] = await Promise.all([
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-recordings.php?mini_id=${mini.mini_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-scenes.php?mini_id=${mini.mini_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-missions.php?mini_id=${mini.mini_id}&date=${dateStr}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-customizations.php?mini_id=${mini.mini_id}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-activity.php?mini_id=${mini.mini_id}&month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`).catch(() => ({ data: { data: {} } })),
        axios.get(`https://mini-talks.org/minitalks-api/streak/get-progress.php?mini_id=${mini.mini_id}`).catch(() => ({ data: { data: { current_streak: 0 } } })),
        axios.get(`https://mini-talks.org/minitalks-api/rewards/get-progress.php?mini_id=${mini.mini_id}`).catch(() => ({ data: { data: { totals: { bricks: 0, medals: 0, cups: 0 } } } }))
      ]);

      // Gerçek verileri kullan, demo fallback yok
      setRecordings(recordingsRes.data?.data || []);
      setScenes(scenesRes.data?.data || []);
      setMissions(missionsRes.data?.data || []);
      setCustomizations(customsRes.data?.data || []);
      setCalendarData(activityRes.data?.data || {});
      
      // Streak verisini set et
      if (streakRes.data?.success && streakRes.data.data) {
        setCurrentStreak(streakRes.data.data.current_streak || 0);
      }
      
      // Rewards totals'ı set et
      if (rewardsRes.data?.success && rewardsRes.data.data?.totals) {
        setRewardsTotals(rewardsRes.data.data.totals);
      }
    } catch (error) {
      console.error('Failed to fetch mini data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Tarih formatı helper
  const formatDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Mission tarih değişince sadece missions'ı yeniden çek
  const fetchMissions = async (date) => {
    try {
      const dateStr = formatDateStr(date);
      const response = await axios.get(`https://mini-talks.org/minitalks-api/mini/get-missions.php?mini_id=${mini.mini_id}&date=${dateStr}`);
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
  
  // Mission tarih navigasyonu
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
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // ===== STREAK BRICK - Safari-safe with padding-bottom hack =====
  const StreakBrick = ({ hasActivity, isCurrentMonth, isPrevMonth, isNextMonth, day }) => {
    const isOtherMonth = isPrevMonth || isNextMonth;
    const isActive = hasActivity && isCurrentMonth;
    const brickOpacity = isOtherMonth ? 0.15 : (hasActivity ? 1 : 0.15);
    const textColor = isActive ? COLORS.blue : COLORS.white;
    const textOpacity = isOtherMonth ? 0.25 : 1;
    
    return (
      <div style={{ 
        width: '100%',
        position: 'relative',
        paddingBottom: isSmallScreen ? '82%' : '90%', // mobilde brick — takvim sığsın ama dolgun
        height: 0
      }}>
        {/* İçerik - absolute konumlandırılmış */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          WebkitDisplay: '-webkit-flex',
          WebkitBoxOrient: 'vertical',
          WebkitBoxDirection: 'normal',
          WebkitFlexDirection: 'column',
          flexDirection: 'column',
          WebkitBoxAlign: 'center',
          WebkitAlignItems: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            width: isSmallScreen ? '54%' : '55%',
            height: isSmallScreen ? '16%' : '15%',
            backgroundColor: COLORS.brickGray,
            borderRadius: '1px 1px 0 0',
            opacity: brickOpacity,
            WebkitFlexShrink: 0,
            flexShrink: 0
          }} />
          <div style={{
            width: isSmallScreen ? '82%' : '80%',
            WebkitBoxFlex: 1,
            WebkitFlex: '1 1 0%',
            flex: '1 1 0%',
            backgroundColor: COLORS.brickGray,
            borderRadius: '2px',
            opacity: brickOpacity
          }} />
          <span style={{
            position: 'absolute',
            top: '55%',
            left: '50%',
            WebkitTransform: 'translate(-50%, -50%)',
            transform: 'translate(-50%, -50%)',
            color: textColor,
            fontSize: isSmallScreen ? '11px' : 'clamp(20px, 1.1vw, 14px)',
            fontWeight: 800,
            opacity: textOpacity,
            fontFamily: "'Montserrat', sans-serif",
            lineHeight: 1
          }}>
            {day}
          </span>
        </div>
      </div>
    );
  };

  // ===== PROGRESS BRICK - Büyütüldü =====
  const ProgressBrick = ({ completed, index }) => {
    const getColor = () => {
      if (!completed) return COLORS.grayProgress;
      if (index < 2) return COLORS.red;
      if (index < 4) return COLORS.yellow;
      if (index < 6) return COLORS.blue;
      return COLORS.green;
    };
    return (
      <div style={{ 
        width: 'clamp(14px, 1.6vw, 20px)', 
        display: 'flex',
        WebkitDisplay: '-webkit-flex',
        WebkitBoxOrient: 'vertical',
        WebkitBoxDirection: 'normal',
        WebkitFlexDirection: 'column',
        flexDirection: 'column',
        WebkitBoxAlign: 'center',
        WebkitAlignItems: 'center',
        alignItems: 'center'
      }}>
        <div style={{ width: '60%', height: '4px', backgroundColor: getColor(), borderRadius: '2px 2px 0 0' }} />
        <div style={{ width: '100%', height: '8px', backgroundColor: getColor(), borderRadius: '2px' }} />
      </div>
    );
  };

  const StrokedTitle = ({ children, style = {}, className = '' }) => (
    <h3 className={className} style={{ 
      fontFamily: "'Montserrat', sans-serif",
      color: COLORS.white,
      WebkitTextStroke: 'clamp(1.5px, 0.2vw, 2.5px) #000000',
      paintOrder: 'stroke fill',
      fontWeight: 900,
      margin: 0,
      ...style
    }}>
      {children}
    </h3>
  );

  // ===== MANAGE OVERLAY - Modal açılınca hover resetlenir =====
  const ManageOverlay = ({ show, isHovered, onHover, onLeave, onManageClick }) => {
    if (!show) return null;
    
    const handleClick = () => {
      onLeave(); // Hover'ı resetle
      onManageClick();
    };
    
    return (
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.4)', 
          borderRadius: 'clamp(14px, 1.6vw, 20px)', 
          ...flexStyles.flexCenter,
          zIndex: 10 
        }}
        onMouseLeave={onLeave}
      >
        <button onClick={handleClick} onMouseEnter={onHover} onMouseLeave={onLeave} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          <img src={isHovered ? manageBtnHoverImg : manageBtnImg} alt="Manage" style={{ height: isSmallScreen ? '34px' : 'clamp(40px, 6vw, 50px)' }} />
        </button>
      </div>
    );
  };

  // ===== VIEW OVERLAY - Modal açılınca hover resetlenir =====
  const ViewOverlay = ({ show, isHovered, onHover, onLeave, onViewClick }) => {
    if (!show) return null;
    
    const handleClick = () => {
      onLeave(); // Hover'ı resetle
      onViewClick();
    };
    
    return (
      <div 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.4)', 
          borderRadius: 'clamp(14px, 1.6vw, 20px)', 
          ...flexStyles.flexCenter,
          zIndex: 10 
        }}
        onMouseLeave={onLeave}
      >
        <button onClick={handleClick} onMouseEnter={onHover} onMouseLeave={onLeave} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          <img src={isHovered ? viewBtnHoverImg : viewBtnImg} alt="View" style={{ height: isSmallScreen ? '34px' : 'clamp(40px, 6vw, 50px)' }} />
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

  const isManageMode = viewMode === 'manage';
  const isViewMode = viewMode === 'view';

  // İç carousel (Scenes / Customized) sayfa başı öğe: mobilde 2, desktop 3
  const innerPerPage = isSmallScreen ? 1 : 3;

  // Profile kartı — mobilde kompakt (Image 2 referansı)
  const profAvatarSize = isSmallScreen ? '88px' : 'clamp(65px, 8vw, 150px)';
  const profNameFont = isSmallScreen ? '13px' : 'clamp(14px, 1.5vw, 24px)';
  const profMsgFont = isSmallScreen ? '14px' : 'clamp(15px, 1.6vw, 26px)';
  const profBtnH = isSmallScreen ? '30px' : 'clamp(32px, 3.5vw, 55px)';

  // Responsive CSS - Safari-safe with -webkit- prefixes
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
    
    /* Tablet - Safari için -webkit- prefixler */
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
    
    /* Mobile */
    @media (max-width: 768px) {
      .row-1 {
        -ms-grid-columns: 1fr;
        grid-template-columns: 1fr;
      }
      .row-2 {
        -ms-grid-columns: 1fr;
        grid-template-columns: 1fr;
      }
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
      .scenes-grid {
        -ms-grid-columns: 1fr 1fr;
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 500px) {
      .scenes-grid {
        -ms-grid-columns: 1fr;
        grid-template-columns: 1fr;
      }
    }
    
    .card-base {
      border-radius: clamp(16px, 1.8vw, 22px);
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

    /* ── MOBİL CAROUSEL ── Kartlar tam ve eşit yükseklik */
    .mm-mobile-card > div {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      height: 100%;
      min-height: 0;
      -webkit-min-height: 0;
    }
    /* İç carousel'li kartlarda (Scenes / Customized) grid TEK SATIR, 2 öğe */
    .mm-mobile-card .scenes-grid {
      -ms-grid-columns: 1fr 1fr;
      grid-template-columns: repeat(2, 1fr);
      grid-auto-rows: 1fr;
    }

    /* ── MOBİL GRID (carousel yerine tek ekran, üst 4 + alt 3) ── */
    .mm-grid-root {
      height: 100%;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      width: 100%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 6px;
      padding: 4px 6px 4px;
      overflow: hidden;
      min-height: 0;
      box-sizing: border-box;
    }
    .mm-grid-top {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1.15fr 1fr 1fr 1.25fr;
      grid-template-columns: 1.15fr 1fr 1fr 1.25fr;
      gap: 7px;
      -webkit-box-flex: 1;
      -webkit-flex: 1.6 1 0%;
      flex: 1.6 1 0%;
      min-height: 0;
    }
    .mm-grid-bottom {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 1fr 1fr;
      grid-template-columns: repeat(3, 1fr);
      gap: 7px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
    }
    .mm-grid-cell {
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
    .mm-grid-cell > div {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      height: 100%;
      min-height: 0;
    }
    /* Mobil grid'de iç carousel grid'i tek öğe (dar kart) */
    .mm-grid-cell .scenes-grid {
      -ms-grid-columns: 1fr;
      grid-template-columns: 1fr;
      grid-auto-rows: 1fr;
    }
    /* Mobil grid — başlıklar kontursuz */
    .mm-grid-cell h3 {
      font-size: 15px !important;
      -webkit-text-stroke-width: 0 !important;
      -webkit-text-stroke: none !important;
    }
    /* Scenes/My Minis kartlarında padding az — görsel alanı büyük */
    .mm-grid-cell .mm-media-card {
      padding: 7px 8px 6px !important;
    }
    /* Tek başlıklı kartlarda (Scenes/My Minis/Rewards) başlık ortalı + alt boşluk az */
    .mm-grid-cell .mm-title-center {
      text-align: center !important;
      width: 100% !important;
      margin-bottom: 3px !important;
    }
    /* Mobil: scene/customs görsel alanı büyük kalsın, alt yazı kompakt */
    .mm-grid-cell .scenes-grid .mm-scene-name { font-size: 11px !important; margin-bottom: 2px !important; }
    .mm-grid-cell .scenes-grid .mm-scene-foot { padding: 2px 4px 4px !important; }
    /* Carousel satırı (ok+görsel+ok) dikeyi doldursun — üst/alt boşluk gitsin */
    .mm-grid-cell .mm-carousel-row {
      -webkit-box-align: stretch !important;
      -webkit-align-items: stretch !important;
      align-items: stretch !important;
    }
    .mm-grid-cell .mm-carousel-row .scenes-grid {
      height: 100% !important;
    }
    /* Ok butonları stretch'te dikey ortalı kalsın */
    .mm-grid-cell .mm-carousel-row > button {
      -webkit-align-self: center;
      align-self: center;
    }
    /* Streak takvim sayıları küçük (tüm ay sığsın) */
    .mm-grid-cell .mm-streak-daynames > div { font-size: 8px !important; }
    .mm-grid-cell .mm-streak-month { font-size: 10px !important; min-width: 44px !important; }
    .mm-grid-cell .mm-streak-count { font-size: 12px !important; margin-bottom: 2px !important; }
    /* Takvim brick'leri — dengeli aralık */
    .mm-grid-cell .mm-streak-grid { gap: 3px !important; row-gap: 2px !important; }
    .mm-grid-cell .mm-streak-daynames { gap: 3px !important; }
  `;

  // ════════════════════════════════════════════════════════════════
  //  KARTLAR — JSX değişkenleri (içerik birebir, sadece değişkene alındı)
  //  Mobilde carousel'de, desktopta row-1/row-2 grid'inde kullanılır.
  // ════════════════════════════════════════════════════════════════

  const profileCard = (
        <div 
          className="card-base"
          style={{ 
            backgroundColor: COLORS.white,
            border: `4px solid ${COLORS.gray}`,
            padding: 'clamp(8px, 1vw, 16px)',
            WebkitBoxPack: 'justify',
            WebkitJustifyContent: 'space-between',
            justifyContent: 'space-between',
            position: 'relative'
          }}
        >
          {/* Üst kısım - Avatar ve isim — overflow kontrollü */}
          <div style={{ 
            ...flexStyles.flexColumn,
            WebkitBoxAlign: 'center',
            WebkitAlignItems: 'center',
            alignItems: 'center',
            WebkitBoxPack: 'center',
            WebkitJustifyContent: 'center',
            justifyContent: 'center',
            position: 'relative', 
            ...flexStyles.flex1,
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: profAvatarSize,
              height: profAvatarSize,
              backgroundColor: COLORS.yellow,
              borderRadius: 'clamp(10px, 1.2vw, 18px)',
              ...flexStyles.flexCenter,
              marginBottom: 'clamp(3px, 0.4vw, 8px)',
              WebkitFlexShrink: 1,
              flexShrink: 1
            }}>
<img src={avatarUrl || profileIcon} alt={mini?.mini_name} style={{ width: avatarUrl ? '100%' : '80%', height: avatarUrl ? '100%' : '80%', objectFit: avatarUrl ? 'cover' : 'contain' }} />
            </div>
            
            <div style={{ 
              fontSize: profNameFont, 
              fontWeight: 700, 
              color: '#000', 
              marginBottom: '1px',
              ...flexStyles.flexShrink0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              {mini?.mini_name || 'mini_name_01'}
            </div>
            
            <div style={{ 
              fontSize: profMsgFont, 
              fontWeight: 900, 
              textAlign: 'center', 
              lineHeight: 1.1
            }}>
              {motivationMessage}
            </div>
            
            {/* Profile Overlay */}
            {(isManageMode || isViewMode) && (
              <div 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  backgroundColor: 'rgba(255,255,255,0.7)', 
                  borderRadius: '16px', 
                  ...flexStyles.flexCenter,
                  zIndex: 10 
                }}
                onMouseLeave={() => setProfileOverlayHover(false)}
              >
                <button 
                  onClick={() => {
                    setProfileOverlayHover(false); // Hover'ı resetle
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
                    <img src={profileOverlayHover ? manageBtnHoverImg : manageBtnImg} alt="Manage" style={{ height: isSmallScreen ? '34px' : 'clamp(40px, 6vw, 50px)' }} />
                  ) : (
                    <img src={profileOverlayHover ? viewBtnHoverImg : viewBtnImg} alt="View" style={{ height: isSmallScreen ? '34px' : 'clamp(40px, 6vw, 50px)' }} />
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Alt kısım - Butonlar — flexShrink:0 ile sabit */}
          <div style={{ 
            display: 'flex',
            WebkitDisplay: '-webkit-flex',
            gap: 'clamp(5px, 0.6vw, 12px)', 
            WebkitBoxPack: 'center',
            WebkitJustifyContent: 'center',
            justifyContent: 'center', 
            marginTop: 'clamp(6px, 0.7vw, 14px)', 
            position: 'relative', 
            zIndex: 20, 
            flexWrap: 'wrap', 
            WebkitFlexWrap: 'wrap',
            WebkitFlexShrink: 0,
            flexShrink: 0
          }}>
            {viewerRole === 'parent' && (
              <>
                {viewMode === 'normal' && (
                  <>
                    <button
                      onClick={() => setViewMode('manage')}
                      onMouseEnter={() => setProfileManageHover(true)}
                      onMouseLeave={() => setProfileManageHover(false)}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <img src={profileManageHover ? manageBtn2HoverImg : manageBtn2Img} alt="Manage" style={{ height: profBtnH }} />
                    </button>
                    <button
                      onClick={() => setViewMode('view')}
                      onMouseEnter={() => setProfileViewHover(true)}
                      onMouseLeave={() => setProfileViewHover(false)}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <img src={profileViewHover ? viewBtn2HoverImg : viewBtn2Img} alt="View" style={{ height: profBtnH }} />
                    </button>
                  </>
                )}
                
                {viewMode === 'manage' && (
                  <>
                    <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'default', opacity: 0.7 }}>
                      <img src={manageBtn2HoverImg} alt="Manage Active" style={{ height: profBtnH }} />
                    </button>
                    <button
                      onClick={handleCancel}
                      onMouseEnter={() => setCancelBtnHover(true)}
                      onMouseLeave={() => setCancelBtnHover(false)}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <img src={cancelBtnHover ? cancelBtnHoverImg : cancelBtnImg} alt="Cancel" style={{ height: profBtnH }} />
                    </button>
                  </>
                )}
                
                {viewMode === 'view' && (
                  <>
                    <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'default', opacity: 0.7 }}>
                      <img src={viewBtn2HoverImg} alt="View Active" style={{ height: profBtnH }} />
                    </button>
                    <button
                      onClick={handleCancel}
                      onMouseEnter={() => setCancelBtnHover(true)}
                      onMouseLeave={() => setCancelBtnHover(false)}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <img src={cancelBtnHover ? cancelBtnHoverImg : cancelBtnImg} alt="Cancel" style={{ height: profBtnH }} />
                    </button>
                  </>
                )}
              </>
            )}
            
            {viewerRole === 'expert' && (
              <>
                {viewMode === 'normal' && (
                  <button
                    onClick={() => setViewMode('view')}
                    onMouseEnter={() => setProfileViewHover(true)}
                    onMouseLeave={() => setProfileViewHover(false)}
                    style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <img src={profileViewHover ? viewBtn2HoverImg : viewBtn2Img} alt="View" style={{ height: profBtnH }} />
                  </button>
                )}
                {viewMode === 'view' && (
                  <>
                    <button style={{ border: 'none', background: 'none', padding: 0, cursor: 'default', opacity: 0.7 }}>
                      <img src={viewBtn2HoverImg} alt="View Active" style={{ height: profBtnH }} />
                    </button>
                    <button
                      onClick={handleCancel}
                      onMouseEnter={() => setCancelBtnHover(true)}
                      onMouseLeave={() => setCancelBtnHover(false)}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <img src={cancelBtnHover ? cancelBtnHoverImg : cancelBtnImg} alt="Cancel" style={{ height: profBtnH }} />
                    </button>
                  </>
                )}
              </>
            )}
            
            {(viewerRole === 'child' || viewerRole === 'mini') && (
              <button
                onClick={() => navigate('/scene-selection')}
                onMouseEnter={() => setProfilePlayHover(true)}
                onMouseLeave={() => setProfilePlayHover(false)}
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
              >
                <img src={profilePlayHover ? playBtnProfileHover : playBtnProfile} alt="Play" style={{ height: profBtnH }} />
              </button>
            )}
          </div>
        </div>
  );

  const recordingsCard = (
        <div 
          className="card-base"
          style={{ backgroundColor: COLORS.yellow, padding: 'clamp(10px, 1.2vw, 14px)', position: 'relative' }}
        >
          <ManageOverlay show={isManageMode} isHovered={recordingsManageHover} onHover={() => setRecordingsManageHover(true)} onLeave={() => setRecordingsManageHover(false)} onManageClick={() => setRecordingManagerOpen(true)} />
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
            {recordings.length > 0 ? recordings.slice(0, isSmallScreen ? 1 : 4).map((rec, idx) => (
              <div key={`rec-${rec.recording_id || idx}-${idx}`} style={{ 
                backgroundColor: COLORS.white, 
                borderRadius: 'clamp(8px, 1vw, 12px)',
                border: '2px solid #1a1a1a',
                display: 'flex',
                WebkitDisplay: '-webkit-flex',
                WebkitBoxAlign: 'center',
                WebkitAlignItems: 'center',
                alignItems: 'center',
                padding: 'clamp(4px, 0.5vw, 6px)',
                WebkitBoxFlex: 1,
                WebkitFlex: '1 1 0%',
                flex: '1 1 0%',
                minHeight: 0,
                WebkitMinHeight: 0
              }}>
                <div style={{ 
                  width: 'clamp(55px, 6.5vw, 75px)', 
                  height: 'clamp(38px, 4.5vw, 55px)', 
                  ...flexStyles.flexShrink0,
                  borderRadius: 'clamp(5px, 0.6vw, 8px)',
                  overflow: 'hidden',
                  backgroundColor: '#f0f0f0'
                }}>
                  <img src={rec.scene_image || recordingsImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ 
                  WebkitBoxFlex: 1,
                  WebkitFlex: '1 1 0%',
                  flex: '1 1 0%', 
                  padding: '0 clamp(6px, 0.7vw, 10px)', 
                  minWidth: 0 
                }}>
                  <div style={{ fontSize: 'clamp(10px, 1.1vw, 13px)', fontWeight: 600, color: '#000' }}>{formatDate(rec.created_at)}</div>
                  <div style={{ fontSize: 'clamp(13px, 1.4vw, 17px)', fontWeight: 900, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.scene_name || 'Unknown Scene'}</div>
                  <div style={{ fontSize: 'clamp(11px, 1.2vw, 14px)', fontWeight: 700, color: '#000' }}>{rec.word_name || 'Sound'}</div>
                </div>
                <div style={{ fontSize: 'clamp(13px, 1.4vw, 17px)', fontWeight: 700, color: '#000', paddingRight: 'clamp(4px, 0.5vw, 6px)' }}>{formatDuration(rec.duration_seconds || 0)}</div>
               
              </div>
            )) : (
              <div style={{ 
                backgroundColor: COLORS.white, 
                borderRadius: '10px', 
                padding: 'clamp(14px, 1.8vw, 20px)', 
                textAlign: 'center', 
                color: '#999', 
                fontSize: 'clamp(14px, 1.5vw, 18px)',
                ...flexStyles.flex1,
                ...flexStyles.flexCenter
              }}>
                No recordings yet
              </div>
            )}
          </div>
        </div>
  );

  const streakCard = (
        <div 
          className="card-base"
          style={{ backgroundColor: COLORS.blue, padding: 'clamp(8px, 1vw, 12px) clamp(10px, 1.2vw, 14px)', position: 'relative' }}
        >
          <ManageOverlay show={isManageMode} isHovered={streakManageHover} onHover={() => setStreakManageHover(true)} onLeave={() => setStreakManageHover(false)} onManageClick={() => setStreakManagerOpen(true)} />
          <ViewOverlay show={isViewMode} isHovered={streakViewHover} onHover={() => setStreakViewHover(true)} onLeave={() => setStreakViewHover(false)} onViewClick={() => setStreakProgressOpen(true)} />
          
          <div style={{ ...flexStyles.flexBetween, ...flexStyles.flexShrink0 }}>
            <StrokedTitle style={{ fontSize: 'clamp(20px, 2.2vw, 28px)' }}>Streak</StrokedTitle>
            <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: 'clamp(4px, 0.5vw, 6px)' }}>
              <button onClick={prevMonth} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={leftBtnSmall} alt="Prev" style={{ width: 'clamp(12px, 1.4vw, 16px)', height: 'clamp(16px, 1.8vw, 20px)' }} />
              </button>
              <span className="mm-streak-month" style={{ color: COLORS.white, fontWeight: 700, fontSize: 'clamp(12px, 1.3vw, 16px)', minWidth: 'clamp(55px, 6vw, 70px)', textAlign: 'center' }}>
                {currentMonth.toLocaleDateString('en-US', { month: 'short' })} '{currentMonth.getFullYear().toString().slice(-2)}
              </span>
              <button onClick={nextMonth} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={rightBtnSmall} alt="Next" style={{ width: 'clamp(12px, 1.4vw, 16px)', height: 'clamp(16px, 1.8vw, 20px)' }} />
              </button>
            </div>
          </div>
          
          <div className="mm-streak-count" style={{ color: COLORS.yellow, fontWeight: 800, fontSize: 'clamp(16px, 1.7vw, 22px)', marginBottom: 'clamp(3px, 0.4vw, 5px)', ...flexStyles.flexShrink0 }}>
            {currentStreak} day streak!
          </div>
          
          <div className="mm-streak-daynames" style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: 'clamp(3px, 0.4vw, 5px)',
            marginBottom: 'clamp(2px, 0.3vw, 4px)',
            ...flexStyles.flexShrink0
          }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} style={{ 
                color: COLORS.white, 
                fontSize: 'clamp(9px, 1vw, 12px)', 
                fontWeight: 800, 
                textAlign: 'center'
              }}>
                {day}
              </div>
            ))}
          </div>
          
          <div className="mm-streak-grid" style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: 'clamp(3px, 0.4vw, 5px)',
            rowGap: 'clamp(2px, 0.3vw, 4px)',
            ...flexStyles.flex1,
            alignContent: 'stretch',
            overflow: 'hidden',
            minHeight: 0,
            WebkitMinHeight: 0
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
  );

  const missionsRewardsCard = (
        <div style={{ ...flexStyles.flexColumn, gap: 'clamp(6px, 0.8vw, 10px)', minHeight: 0, WebkitMinHeight: 0 }}>
          {/* Missions */}
          <div 
            className="card-base"
            style={{ backgroundColor: COLORS.green, padding: 'clamp(10px, 1.2vw, 14px)', position: 'relative', ...flexStyles.flex1, overflow: 'hidden' }}
          >
            <ManageOverlay show={isManageMode} isHovered={missionsManageHover} onHover={() => setMissionsManageHover(true)} onLeave={() => setMissionsManageHover(false)} onManageClick={() => setMissionsManagerOpen(true)} />
            <ViewOverlay show={isViewMode} isHovered={missionsViewHover} onHover={() => setMissionsViewHover(true)} onLeave={() => setMissionsViewHover(false)} onViewClick={() => setMissionsProgressOpen(true)} />
            
            <div style={{ ...flexStyles.flexBetween, marginBottom: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flexShrink0 }}>
              <StrokedTitle style={{ fontSize: 'clamp(18px, 2vw, 24px)' }}>Mini Missions</StrokedTitle>
              <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: '4px' }}>
                <button 
                  onClick={handleMissionDatePrev}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img src={leftBtnSmall} alt="Prev" style={{ width: 'clamp(12px, 1.4vw, 16px)', height: 'clamp(16px, 1.7vw, 20px)' }} />
                </button>
                <span style={{ 
                  color: COLORS.white, 
                  fontWeight: 700, 
                  fontSize: 'clamp(13px, 1.4vw, 17px)',
                  minWidth: 'clamp(52px, 5.5vw, 65px)',
                  textAlign: 'center'
                }}>{getMissionDateLabel()}</span>
                <button 
                  onClick={handleMissionDateNext}
                  style={{ 
                    border: 'none', 
                    background: 'none', 
                    padding: 0, 
                    cursor: getMissionDateLabel() === 'Today' ? 'default' : 'pointer',
                    opacity: getMissionDateLabel() === 'Today' ? 0.5 : 1
                  }}
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
                  borderRadius: 'clamp(8px, 1vw, 12px)',
                  padding: 'clamp(10px, 1.2vw, 14px) clamp(12px, 1.4vw, 16px)',
                  display: 'flex',
                  WebkitDisplay: '-webkit-flex',
                  WebkitBoxAlign: 'center',
                  WebkitAlignItems: 'center',
                  alignItems: 'center',
                  gap: 'clamp(8px, 1vw, 12px)',
                  ...flexStyles.flex1
                }}>
                  {mission.is_completed ? (
                    <div style={{
                      width: 'clamp(22px, 2.2vw, 28px)',
                      height: 'clamp(22px, 2.2vw, 28px)',
                      backgroundColor: COLORS.green,
                      borderRadius: '5px',
                      ...flexStyles.flexCenter,
                      ...flexStyles.flexShrink0
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
                  backgroundColor: COLORS.white, 
                  borderRadius: '10px',
                  padding: 'clamp(12px, 1.4vw, 16px)',
                  textAlign: 'center',
                  color: COLORS.gray,
                  fontSize: 'clamp(13px, 1.5vw, 18px)',
                  ...flexStyles.flex1,
                  ...flexStyles.flexCenter
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
            
            <StrokedTitle style={{ fontSize: 'clamp(18px, 2vw, 24px)', marginBottom: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flexShrink0 }}>Rewards</StrokedTitle>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(6px, 0.7vw, 10px)', ...flexStyles.flex1 }}>
              <div style={{ backgroundColor: COLORS.white, borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn }}>
                <div style={{ fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 700, color: '#000', textAlign: 'center', padding: 'clamp(5px, 0.6vw, 9px) clamp(3px, 0.4vw, 6px) clamp(3px, 0.4vw, 6px)' }}>Bricks</div>
                <div style={{ height: '2px', backgroundColor: COLORS.red, margin: '0 8px' }} />
                <div style={{ ...flexStyles.flexCenter, gap: 'clamp(4px, 0.5vw, 8px)', padding: 'clamp(8px, 0.9vw, 12px) clamp(4px, 0.5vw, 8px)', ...flexStyles.flex1 }}>
                  <img src={bricksIcon} alt="Bricks" style={{ height: 'clamp(26px, 3vw, 38px)', objectFit: 'contain' }} />
                  <span style={{ fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 900 }}>{rewardsTotals.bricks}</span>
                </div>
              </div>
              
              <div style={{ backgroundColor: COLORS.white, borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn }}>
                <div style={{ fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 700, color: '#000', textAlign: 'center', padding: 'clamp(5px, 0.6vw, 9px) clamp(3px, 0.4vw, 6px) clamp(3px, 0.4vw, 6px)' }}>Medals</div>
                <div style={{ height: '2px', backgroundColor: COLORS.red, margin: '0 8px' }} />
                <div style={{ ...flexStyles.flexCenter, gap: 'clamp(4px, 0.5vw, 8px)', padding: 'clamp(8px, 0.9vw, 12px) clamp(4px, 0.5vw, 8px)', ...flexStyles.flex1 }}>
                  <img src={medalsIcon} alt="Medals" style={{ height: 'clamp(30px, 3.1vw, 48px)', objectFit: 'contain' }} />
                  <span style={{ fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 900 }}>{rewardsTotals.medals}</span>
                </div>
              </div>
              
              <div style={{ backgroundColor: COLORS.white, borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn }}>
                <div style={{ fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 700, color: '#000', textAlign: 'center', padding: 'clamp(5px, 0.6vw, 9px) clamp(3px, 0.4vw, 6px) clamp(3px, 0.4vw, 6px)' }}>Cup</div>
                <div style={{ height: '2px', backgroundColor: COLORS.red, margin: '0 8px' }} />
                <div style={{ ...flexStyles.flexCenter, gap: 'clamp(4px, 0.5vw, 8px)', padding: 'clamp(8px, 0.9vw, 12px) clamp(4px, 0.5vw, 8px)', ...flexStyles.flex1 }}>
                  <img src={cupIcon} alt="Cup" style={{ height: 'clamp(30px, 3.1vw, 48px)', objectFit: 'contain' }} />
                  <span style={{ fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 900 }}>{rewardsTotals.cups}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
  );

  // ── Mobil için AYRI Missions kartı ──
  const missionsCard = (
        <div 
          className="card-base"
          style={{ backgroundColor: COLORS.green, padding: 'clamp(10px, 1.2vw, 14px)', position: 'relative', overflow: 'hidden' }}
        >
          <ManageOverlay show={isManageMode} isHovered={missionsManageHover} onHover={() => setMissionsManageHover(true)} onLeave={() => setMissionsManageHover(false)} onManageClick={() => setMissionsManagerOpen(true)} />
          <ViewOverlay show={isViewMode} isHovered={missionsViewHover} onHover={() => setMissionsViewHover(true)} onLeave={() => setMissionsViewHover(false)} onViewClick={() => setMissionsProgressOpen(true)} />
          
          <div style={{ ...flexStyles.flexBetween, marginBottom: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flexShrink0 }}>
            <StrokedTitle style={{ fontSize: 'clamp(15px, 2vw, 24px)' }}>Mini Missions</StrokedTitle>
            <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: '4px' }}>
              <button onClick={handleMissionDatePrev} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={leftBtnSmall} alt="Prev" style={{ width: 'clamp(11px, 1.4vw, 16px)', height: 'clamp(14px, 1.7vw, 20px)' }} />
              </button>
              <span style={{ color: COLORS.white, fontWeight: 700, fontSize: 'clamp(11px, 1.4vw, 17px)', minWidth: 'clamp(46px, 5.5vw, 65px)', textAlign: 'center' }}>{getMissionDateLabel()}</span>
              <button onClick={handleMissionDateNext} style={{ border: 'none', background: 'none', padding: 0, cursor: getMissionDateLabel() === 'Today' ? 'default' : 'pointer', opacity: getMissionDateLabel() === 'Today' ? 0.5 : 1 }} disabled={getMissionDateLabel() === 'Today'}>
                <img src={rightBtnSmall} alt="Next" style={{ width: 'clamp(11px, 1.4vw, 16px)', height: 'clamp(14px, 1.7vw, 20px)' }} />
              </button>
            </div>
          </div>
          
          <div style={{ ...flexStyles.flexColumn, gap: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flex1, overflow: 'hidden' }}>
            {missions.length > 0 ? missions.slice(0, 2).map((mission, idx) => (
              <div key={`mmission-${mission.mission_id || idx}-${idx}`} style={{ 
                backgroundColor: COLORS.white, borderRadius: 'clamp(8px, 1vw, 12px)',
                padding: 'clamp(8px, 1.2vw, 14px) clamp(10px, 1.4vw, 16px)',
                display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center',
                gap: 'clamp(7px, 1vw, 12px)', ...flexStyles.flex1
              }}>
                {mission.is_completed ? (
                  <div style={{ width: 'clamp(20px, 2.2vw, 28px)', height: 'clamp(20px, 2.2vw, 28px)', backgroundColor: COLORS.green, borderRadius: '5px', ...flexStyles.flexCenter, ...flexStyles.flexShrink0 }}>
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ) : (
                  <div style={{ width: 'clamp(20px, 2.2vw, 28px)', height: 'clamp(20px, 2.2vw, 28px)', border: `2px solid ${COLORS.gray}`, borderRadius: '5px', ...flexStyles.flexShrink0 }} />
                )}
                <span style={{ fontWeight: 600, fontSize: 'clamp(11px, 1.5vw, 18px)' }}>{mission.mission_title}</span>
              </div>
            )) : (
              <div style={{ backgroundColor: COLORS.white, borderRadius: '10px', padding: 'clamp(12px, 1.4vw, 16px)', textAlign: 'center', color: COLORS.gray, fontSize: 'clamp(11px, 1.5vw, 18px)', ...flexStyles.flex1, ...flexStyles.flexCenter }}>
                No missions assigned yet
              </div>
            )}
          </div>
        </div>
  );

  // ── Mobil için AYRI Rewards kartı ──
  const rewardsCard = (
        <div 
          className="card-base"
          style={{ backgroundColor: COLORS.red, padding: 'clamp(10px, 1.2vw, 14px)', position: 'relative', overflow: 'hidden' }}
        >
          <ManageOverlay show={isManageMode} isHovered={rewardsManageHover} onHover={() => setRewardsManageHover(true)} onLeave={() => setRewardsManageHover(false)} onManageClick={() => setRewardsManagerOpen(true)} />
          <ViewOverlay show={isViewMode} isHovered={rewardsViewHover} onHover={() => setRewardsViewHover(true)} onLeave={() => setRewardsViewHover(false)} onViewClick={() => setRewardsProgressOpen(true)} />
          
          <StrokedTitle className="mm-title-center" style={{ fontSize: 'clamp(15px, 2vw, 24px)', marginBottom: 'clamp(4px, 0.5vw, 8px)', ...flexStyles.flexShrink0 }}>Rewards</StrokedTitle>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(5px, 0.7vw, 10px)', ...flexStyles.flex1 }}>
            <div style={{ backgroundColor: COLORS.white, borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn }}>
              <div style={{ fontSize: 'clamp(10px, 1.3vw, 16px)', fontWeight: 700, color: '#000', textAlign: 'center', padding: 'clamp(4px, 0.6vw, 9px) clamp(2px, 0.4vw, 6px) clamp(2px, 0.4vw, 6px)' }}>Bricks</div>
              <div style={{ height: '2px', backgroundColor: COLORS.red, margin: '0 8px' }} />
              <div style={{ ...flexStyles.flexCenter, gap: 'clamp(3px, 0.5vw, 8px)', padding: 'clamp(6px, 0.9vw, 12px) clamp(3px, 0.5vw, 8px)', ...flexStyles.flex1 }}>
                <img src={bricksIcon} alt="Bricks" style={{ height: 'clamp(22px, 3vw, 38px)', objectFit: 'contain' }} />
                <span style={{ fontSize: 'clamp(14px, 1.9vw, 24px)', fontWeight: 900 }}>{rewardsTotals.bricks}</span>
              </div>
            </div>
            <div style={{ backgroundColor: COLORS.white, borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn }}>
              <div style={{ fontSize: 'clamp(10px, 1.3vw, 16px)', fontWeight: 700, color: '#000', textAlign: 'center', padding: 'clamp(4px, 0.6vw, 9px) clamp(2px, 0.4vw, 6px) clamp(2px, 0.4vw, 6px)' }}>Medals</div>
              <div style={{ height: '2px', backgroundColor: COLORS.red, margin: '0 8px' }} />
              <div style={{ ...flexStyles.flexCenter, gap: 'clamp(3px, 0.5vw, 8px)', padding: 'clamp(6px, 0.9vw, 12px) clamp(3px, 0.5vw, 8px)', ...flexStyles.flex1 }}>
                <img src={medalsIcon} alt="Medals" style={{ height: 'clamp(24px, 3.1vw, 48px)', objectFit: 'contain' }} />
                <span style={{ fontSize: 'clamp(14px, 1.9vw, 24px)', fontWeight: 900 }}>{rewardsTotals.medals}</span>
              </div>
            </div>
            <div style={{ backgroundColor: COLORS.white, borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn }}>
              <div style={{ fontSize: 'clamp(10px, 1.3vw, 16px)', fontWeight: 700, color: '#000', textAlign: 'center', padding: 'clamp(4px, 0.6vw, 9px) clamp(2px, 0.4vw, 6px) clamp(2px, 0.4vw, 6px)' }}>Cup</div>
              <div style={{ height: '2px', backgroundColor: COLORS.red, margin: '0 8px' }} />
              <div style={{ ...flexStyles.flexCenter, gap: 'clamp(3px, 0.5vw, 8px)', padding: 'clamp(6px, 0.9vw, 12px) clamp(3px, 0.5vw, 8px)', ...flexStyles.flex1 }}>
                <img src={cupIcon} alt="Cup" style={{ height: 'clamp(24px, 3.1vw, 48px)', objectFit: 'contain' }} />
                <span style={{ fontSize: 'clamp(14px, 1.9vw, 24px)', fontWeight: 900 }}>{rewardsTotals.cups}</span>
              </div>
            </div>
          </div>
        </div>
  );

  const scenesCard = (
        <div 
          className="card-base mm-media-card"
          style={{ backgroundColor: COLORS.green, padding: 'clamp(12px, 1.4vw, 16px)', position: 'relative' }}
        >
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
          
          <StrokedTitle className="mm-title-center" style={{ fontSize: 'clamp(20px, 2.2vw, 28px)', marginBottom: 'clamp(6px, 0.8vw, 10px)', ...flexStyles.flexShrink0 }}>Mini Scenes</StrokedTitle>
          
          <div className="mm-carousel-row" style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: 'clamp(6px, 0.7vw, 10px)', ...flexStyles.flex1 }}>
            <button 
              onClick={() => setScenesPage(Math.max(0, scenesPage - 1))} 
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...flexStyles.flexShrink0 }}
            >
              <img src={leftBtnBig} alt="Prev" style={{ width: 'clamp(24px, 2.8vw, 34px)', height: 'clamp(24px, 2.8vw, 34px)' }} />
            </button>
            
            <div className="scenes-grid" style={{ height: '100%' }}>
              {scenes.length > 0 ? scenes.slice(scenesPage * innerPerPage, (scenesPage + 1) * innerPerPage).map((scene, idx) => (
                <div key={`scene-${scene.scene_id || idx}-${idx}`} style={{ backgroundColor: COLORS.white, borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', ...flexStyles.flexColumn, height: '100%' }}>
                  <div style={{ ...flexStyles.flex1, margin: 'clamp(4px, 0.5vw, 6px)', borderRadius: 'clamp(6px, 0.7vw, 8px)', overflow: 'hidden', position: 'relative', backgroundColor: '#f0f0f0', minHeight: 0, WebkitMinHeight: 0 }}>
                    <img src={scene.scene_image || scenesImage} alt={scene.scene_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {scene.is_locked && (
                      <>
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', opacity: 0.5 }} />
                        <img src={lockIcon} alt="Locked" style={{ position: 'absolute', left: '50%', top: '50%', WebkitTransform: 'translate(-50%, -50%)', transform: 'translate(-50%, -50%)', width: 'clamp(28px, 3.5vw, 38px)', height: 'clamp(28px, 3.5vw, 38px)' }} />
                      </>
                    )}
                  </div>
                  <div className="mm-scene-foot" style={{ padding: 'clamp(4px, 0.5vw, 6px) clamp(6px, 0.7vw, 8px) clamp(8px, 0.9vw, 10px)', ...flexStyles.flexShrink0 }}>
                    <div className="mm-scene-name" style={{ fontWeight: 900, fontSize: 'clamp(13px, 1.5vw, 18px)', textAlign: 'center', marginBottom: 'clamp(4px, 0.5vw, 6px)' }}>{scene.scene_name}</div>
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
            
            <button 
              onClick={() => setScenesPage(Math.min(Math.ceil(scenes.length / innerPerPage) - 1, scenesPage + 1))} 
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...flexStyles.flexShrink0 }}
            >
              <img src={rightBtnBig} alt="Next" style={{ width: 'clamp(24px, 2.8vw, 34px)', height: 'clamp(24px, 2.8vw, 34px)' }} />
            </button>
          </div>
          
          <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxPack: 'center', WebkitJustifyContent: 'center', justifyContent: 'center', gap: '5px', marginTop: 'clamp(5px, 0.7vw, 10px)', ...flexStyles.flexShrink0 }}>
            {(() => {
              const total = Math.max(1, Math.ceil(scenes.length / innerPerPage));
              const cap = isSmallScreen ? Math.min(total, 5) : total;
              return Array.from({ length: cap }).map((_, i) => (
                <div key={i} style={{ width: isSmallScreen ? '7px' : 'clamp(8px, 1vw, 10px)', height: isSmallScreen ? '7px' : 'clamp(8px, 1vw, 10px)', backgroundColor: COLORS.white, opacity: i === Math.min(scenesPage, cap - 1) ? 1 : 0.5, borderRadius: '2px' }} />
              ));
            })()}
          </div>
        </div>
  );

  const customsCard = (
        <div 
          className="card-base mm-media-card"
          style={{ backgroundColor: COLORS.yellow, padding: 'clamp(12px, 1.4vw, 16px)', position: 'relative' }}
        >
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
          
          <StrokedTitle className="mm-title-center" style={{ fontSize: 'clamp(20px, 2.2vw, 28px)', marginBottom: 'clamp(6px, 0.8vw, 10px)', ...flexStyles.flexShrink0 }}>{isSmallScreen ? 'My Minis' : 'My Customized Minis'}</StrokedTitle>
          
          <div className="mm-carousel-row" style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: 'clamp(6px, 0.7vw, 10px)', ...flexStyles.flex1 }}>
            <button 
              onClick={() => setCustomsPage(Math.max(0, customsPage - 1))} 
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...flexStyles.flexShrink0 }}
            >
              <img src={leftBtnBig} alt="Prev" style={{ width: 'clamp(24px, 2.8vw, 34px)', height: 'clamp(24px, 2.8vw, 34px)' }} />
            </button>
            
            <div className="scenes-grid" style={{ height: '100%' }}>
              {customizations.length > 0 ? customizations.slice(customsPage * innerPerPage, (customsPage + 1) * innerPerPage).map((custom, idx) => (
                <div key={`custom-${custom.customization_id || idx}-${idx}`} style={{ backgroundColor: COLORS.white, borderRadius: 'clamp(8px, 1vw, 12px)', overflow: 'hidden', height: '100%', padding: 'clamp(4px, 0.5vw, 6px)' }}>
                  <div style={{ height: '100%', borderRadius: 'clamp(6px, 0.7vw, 8px)', overflow: 'hidden', backgroundColor: '#f0f0f0', position: 'relative' }}>
                    {/* Arka plan - sahne görseli */}
                    <img 
                      src={custom.scene_image || minisEnvironment} 
                      alt="Background" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    {/* Figür - transparent PNG */}
                    {custom.display_image && (
                      <img 
                        src={custom.display_image} 
                        alt="Mini" 
                        style={{ 
                          position: 'absolute', 
                          top: '50%', 
                          left: '50%', 
                          WebkitTransform: 'translate(-50%, -50%)',
                          transform: 'translate(-50%, -50%)', 
                          height: '85%', 
                          objectFit: 'contain' 
                        }} 
                      />
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ gridColumn: 'span 3', backgroundColor: COLORS.white, borderRadius: '10px', padding: 'clamp(24px, 3vw, 32px)', textAlign: 'center', color: '#999', fontSize: 'clamp(14px, 1.5vw, 18px)', ...flexStyles.flexCenter }}>
                  No customized minis yet
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setCustomsPage(Math.min(Math.ceil(customizations.length / innerPerPage) - 1, customsPage + 1))} 
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...flexStyles.flexShrink0 }}
            >
              <img src={rightBtnBig} alt="Next" style={{ width: 'clamp(24px, 2.8vw, 34px)', height: 'clamp(24px, 2.8vw, 34px)' }} />
            </button>
          </div>
          
          <div style={{ display: 'flex', WebkitDisplay: '-webkit-flex', WebkitBoxPack: 'center', WebkitJustifyContent: 'center', justifyContent: 'center', gap: '5px', marginTop: 'clamp(5px, 0.7vw, 10px)', ...flexStyles.flexShrink0 }}>
            {(() => {
              const total = Math.max(1, Math.ceil(customizations.length / innerPerPage));
              const cap = isSmallScreen ? Math.min(total, 5) : total;
              return Array.from({ length: cap }).map((_, i) => (
                <div key={i} style={{ width: isSmallScreen ? '7px' : 'clamp(8px, 1vw, 10px)', height: isSmallScreen ? '7px' : 'clamp(8px, 1vw, 10px)', backgroundColor: COLORS.white, opacity: i === Math.min(customsPage, cap - 1) ? 1 : 0.5, borderRadius: '2px' }} />
              ));
            })()}
          </div>
        </div>
  );

  // ── Mobil carousel için kart listesi (Missions+Rewards tek kart) ──
  const mobileCards = [profileCard, recordingsCard, streakCard, missionsRewardsCard, scenesCard, customsCard];
  const totalCards = mobileCards.length;

  // Carousel — her ekranda 2 kart göster, tek-kart adımlı kaydır (1·2 → 2·3 → 3·4 ...)
  const cardGap = 14;
  const carouselSidePad = isMobile ? 40 * 2 : 52 * 2;  // okların yatay payı
  const usableW = Math.max(0, carouselW - carouselSidePad);
  const visibleCards = 2;                               // her zaman 2 kart
  const cardW = usableW > 0
    ? (usableW - (visibleCards - 1) * cardGap) / visibleCards
    : 300;
  // Görünür alanı TAM 2 kart genişliğine kırp (3. kart sızmasın)
  const viewportCardsW = cardW * visibleCards + (visibleCards - 1) * cardGap;
  const maxSlide = Math.max(0, totalCards - visibleCards);
  const safeSlide = Math.min(currentSlide, maxSlide);

  // Boyut değişince başa sar (effect yukarıda, loading guard'ından önce tanımlı)

  // Swipe handlers — sadece belirgin YATAY harekette slide (butonlara basınca tetiklenmesin)
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = () => {
    const dx = touchStartX.current - touchEndX.current;
    const dy = touchStartY.current - touchEndY.current;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 70;          // yüksek eşik — küçük kazara hareketler slide etmesin
    // Yatay hareket dikeyden belirgin fazla VE eşiği geçmiş olmalı
    if (absX < threshold) return;
    if (absX < absY * 1.5) return; // yatay, dikeyin en az 1.5 katı olmalı
    if (dx > 0 && safeSlide < maxSlide) setCurrentSlide(Math.min(maxSlide, safeSlide + 1));
    else if (dx < 0 && safeSlide > 0) setCurrentSlide(safeSlide - 1);
  };

  // Modallar — hem mobil hem desktop render'ında kullanılır
  const renderModals = () => (
      <>
      {/* Motivation Messages Modals */}
      <MotivationMessagesManager 
        mini={mini}
        isOpen={motivationManagerOpen}
        onClose={() => setMotivationManagerOpen(false)}
        onSave={handleMotivationSave}
      />
      
      <MotivationMessagesProgress 
        mini={mini}
        isOpen={motivationProgressOpen}
        onClose={() => setMotivationProgressOpen(false)}
      />
      
      {/* Streak Modals */}
      <StreakManager 
        mini={mini}
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
        onTotalsUpdate={(newTotals) => {
          setRewardsTotals(newTotals);
        }}
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
      </>
  );

  // ── MOBİL GRID RENDER (tek ekran, üst 4 + alt 3) ──
  if (isSmallScreen) {
    return (
      <div className="mm-grid-root">
        <style>{responsiveStyles}</style>

        {/* Üst sıra — 4 kart: Profil / Scenes / My Minis / Streak */}
        <div className="mm-grid-top">
          <div className="mm-grid-cell">{profileCard}</div>
          <div className="mm-grid-cell">{scenesCard}</div>
          <div className="mm-grid-cell">{customsCard}</div>
          <div className="mm-grid-cell">{streakCard}</div>
        </div>

        {/* Alt sıra — 3 kart: Recordings / Rewards / Missions */}
        <div className="mm-grid-bottom">
          <div className="mm-grid-cell">{recordingsCard}</div>
          <div className="mm-grid-cell">{rewardsCard}</div>
          <div className="mm-grid-cell">{missionsCard}</div>
        </div>

        {/* ===== MODALS ===== */}
        {renderModals()}
      </div>
    );
  }

  // ── DESKTOP RENDER (orijinal, değişmedi) ──
  return (
    <div className="mini-manage-container">
      <style>{responsiveStyles}</style>
      
      {/* Row 1 */}
      <div className="row-1">
        {profileCard}
        {recordingsCard}
        {streakCard}
        {missionsRewardsCard}
      </div>

      {/* Row 2 */}
      <div className="row-2">
        {scenesCard}
        {customsCard}
      </div>
      
      {/* ===== MODALS ===== */}
      {renderModals()}
    </div>
  );
};

export default MiniManage;