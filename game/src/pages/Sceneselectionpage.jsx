// src/pages/SceneSelectionPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/common/Header';
import axios from 'axios';

// Assets
import leftSlider from '../assets/left_slider_icon.png';
import rightSlider from '../assets/right_slider_icon.png';

// Play butonları
import playBtnFilled from '../assets/Play_Buton.png';
import playBtnFilledHover from '../assets/Play_Buton_Hover.png';

// Brick Border — kart üstü stud
import BrickBorder from '../assets/kirmizi-top.png';

// Locked Screen
import lockedScreen from '../assets/Locked Screen.png';

// Loading GIF
import loadingGif from '../assets/loading_animation_1.gif';

// Sahne görselleri — çerçevesiz ham görseller
import basketballCourt from '../assets/Sahne_1_Gorsel.png';
// Yeni sahne görselleri eklendikçe buraya import eklenecek:
// import classroom from '../assets/Sahne_2_Gorsel.png';
import imgClassroom       from '../assets/scenes/classroom.png';
import imgCafe            from '../assets/scenes/cafe.png';
import imgSupermarket     from '../assets/scenes/supermarket.png';
import imgOrchestra       from '../assets/scenes/orchestra.png';
import imgRobotTournament from '../assets/scenes/robot_tournament.png';
import imgPlayground      from '../assets/scenes/playground.png';
import imgBeach           from '../assets/scenes/beach.png';
import imgPoolParty       from '../assets/scenes/pool_party.png';
import imgBasketball      from '../assets/scenes/basketball.png';
import imgTennis          from '../assets/scenes/tennis.png';
// ...

const SceneSelectionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMini, setSelectedMini] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Responsive: viewport height + screen size
  const [viewportH, setViewportH] = useState(window.innerHeight);
  const [screenSize, setScreenSize] = useState('desktop');

  useEffect(() => {
    const update = () => {
      setViewportH(window.innerHeight);
      const w = window.innerWidth;
      if (w <= 740) setScreenSize('mobile');
      else if (w <= 1024) setScreenSize('tablet-small');
      else if (w <= 1380) setScreenSize('tablet');
      else setScreenSize('desktop');
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', () => setTimeout(update, 150));
    setTimeout(update, 200);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isMobile = screenSize === 'mobile';
  const isTabletSmall = screenSize === 'tablet-small';
  const isTablet = screenSize === 'tablet';
  const isSmallScreen = isMobile || isTabletSmall || isTablet;

  

// Sahne listesi — sıralama display için, ID'ler GamePage ile eşleşiyor
const ALL_SCENES_DATA = [
  // ── İlk 10 — görselli ve yüklü sahneler (senin istediğin sıra) ──
  { id: 2,  name: 'Classroom',            image: imgClassroom },
  { id: 3,  name: 'Coffee Shop',          image: imgCafe },
  { id: 5,  name: 'Supermarket',          image: imgSupermarket },
  { id: 39, name: 'Choir Performance',    image: imgOrchestra },      // orchestra modeli buraya taşındı
  { id: 38, name: 'Robotics Tournament',  image: imgRobotTournament },
  { id: 11, name: 'Playground',           image: imgPlayground },
  { id: 51, name: 'Beach',                image: imgBeach },           // YENİ sahne
  { id: 27, name: 'Swimming Pool',        image: imgPoolParty },
  { id: 1,  name: 'Basketball Court',     image: imgBasketball },
  { id: 28, name: 'Tennis Court',         image: imgTennis },

  // ── Kalanlar — orijinal ID'leriyle, görselsiz (kilitli renderlanır) ──
  { id: 4,  name: 'Bakery' },
  { id: 6,  name: 'Library' },
  { id: 7,  name: 'Pizzeria' },
  { id: 8,  name: 'Cinema Lobby' },
  { id: 9,  name: 'Christmas Celebration' },
  { id: 10, name: 'Birthday Party' },
  { id: 12, name: 'Ice Cream Shop' },
  { id: 13, name: 'Bowling' },
  { id: 14, name: 'Arcade' },
  { id: 15, name: 'Picnic' },
  { id: 16, name: 'Hospital' },
  { id: 17, name: 'Dentist' },
  { id: 18, name: 'Eye Clinic' },
  { id: 19, name: 'Office' },
  { id: 20, name: 'Museum' },
  { id: 21, name: 'Restaurant' },
  { id: 22, name: 'Thanksgiving Dinner' },
  { id: 23, name: 'Butcher' },
  { id: 24, name: 'Greengrocer' },
  { id: 25, name: 'Music Room' },                 // orchestra modeli 39'a taşındı, bu artık modelsiz
  { id: 26, name: 'Art Studio' },
  { id: 29, name: 'Toy Store' },
  { id: 30, name: 'Veterinary Clinic' },
  { id: 31, name: 'Award Ceremony' },
  { id: 32, name: 'Theater Stage' },
  { id: 33, name: 'Easter Egg Hunt' },
  { id: 34, name: 'Karaoke Room' },
  { id: 35, name: 'Halloween' },
  { id: 36, name: 'Show & Tell' },
  { id: 37, name: 'Story Time Circle' },
  { id: 40, name: 'Science Fair Booth' },
  { id: 41, name: 'Shopping Mall' },
  { id: 42, name: 'Restroom (School / Mall)' },
  { id: 43, name: 'Hair Salon' },
  { id: 44, name: 'Post Office' },
  { id: 45, name: 'Bus Stop' },
  { id: 46, name: 'Airport' },
  { id: 47, name: 'Living Room' },
  { id: 48, name: 'Bedroom' },
  { id: 49, name: 'Reception' },
  { id: 50, name: 'Pharmacy' },
];

const getSceneImage = (sceneId) => {
  const entry = ALL_SCENES_DATA.find(s => s.id === sceneId);
  return entry?.image || null;
};

   useEffect(() => {
    const miniData = sessionStorage.getItem('selectedMini');
    if (miniData) {
      setSelectedMini(JSON.parse(miniData));
    } else if (user) {
      if (user.role === 'builder') {
        const builderMini = {
          builder_id: user.user_id,
          mini_name: user.profile?.full_name || 'Builder',
          is_builder: true
        };
        setSelectedMini(builderMini);
        sessionStorage.setItem('selectedMini', JSON.stringify(builderMini));
      } else if (user.role === 'parent' || user.role === 'expert') {
        navigate('/mini-selection');
        return;
      } else {
        const miniInfo = {
          mini_id: user.user_id,
          mini_name: user.profile?.mini_name || user.profile?.full_name || 'Mini',
          is_parent: false
        };
        setSelectedMini(miniInfo);
        sessionStorage.setItem('selectedMini', JSON.stringify(miniInfo));
      }
 } else {
      // Guest — giriş yapmamış kullanıcı. İlk 10 scene açık, kalanı kilitli
      const guestMini = { mini_name: 'Guest', is_guest: true };
      setSelectedMini(guestMini);
      sessionStorage.setItem('selectedMini', JSON.stringify(guestMini));
    }

    fetchScenes();
  }, [user, navigate]);

 const fetchScenes = async () => {
    try {
      setLoading(true);

      const miniData = sessionStorage.getItem('selectedMini');
      let miniId = null;
      let isBuilder = false;
      let isParentOrExpert = false;
      let isGuest = false;

      if (miniData) {
        const mini = JSON.parse(miniData);
        miniId = mini.mini_id;
        isBuilder = mini.is_builder || false;
        isParentOrExpert = mini.is_parent || mini.is_expert || false;
        isGuest = mini.is_guest || false;
      }

      // Guest kontrolü: user=null, user.role='guest', user.is_guest, veya mini_id 'guest_' ile başlıyor
      const guestByUser = !user || user?.role === 'guest' || user?.is_guest === true;
      const guestByMiniId = typeof miniId === 'string' && miniId.startsWith('guest_');
      const isGuestFinal = isGuest || guestByUser || guestByMiniId;

      // Guest: ilk 10 scene açık, 11+ kilitli. Level kilitleri default (sadece sound açık)
      if (isGuestFinal) {
        setDefaultScenes(false, false, 10);
        return;
      }

      if (isBuilder || user?.role === 'builder') {
        setDefaultScenes(true, true);
        return;
      }

      if (isParentOrExpert || !miniId) {
        setDefaultScenes(true);
        return;
      }


      if (miniId) {
        const response = await axios.get(
          `https://mini-talks.org/minitalks-api/scene-level/get-scene-locks.php?mini_id=${miniId}`
        );

        if (response.data?.success && response.data.data?.scenes) {
  const orderMap = new Map(ALL_SCENES_DATA.map((s, i) => [s.id, i]));

  const sceneData = response.data.data.scenes
    .map(scene => ({
      scene_id: scene.scene_id,
      scene_name: scene.scene_name,
      scene_order: scene.scene_order,
      is_unlocked: scene.is_unlocked,
      is_locked: scene.is_locked,
      level_locks: scene.level_locks
    }))
    .sort((a, b) => {
      // ALL_SCENES_DATA'daki display sırasına göre sırala
      return (orderMap.get(a.scene_id) ?? 999) - (orderMap.get(b.scene_id) ?? 999);
    });

  setScenes(sceneData);
} else {
  setDefaultScenes();
}
      } else {
        setDefaultScenes(true);
      }

    } catch (error) {
      console.error('Failed to fetch scenes:', error);
      setDefaultScenes();
    } finally {
      setLoading(false);
    }
  };

  const setDefaultScenes = (allUnlocked = false, allLevelsUnlocked = false, firstNUnlocked = 0) => {
  const defaultLevelLocks = allLevelsUnlocked
    ? { sound: false, word: false, sentence: false, dialogue: false }
    : { sound: false, word: true, sentence: true, dialogue: true };

  setScenes(ALL_SCENES_DATA.map((sceneDef, idx) => {
    // Unlock priority: allUnlocked > firstNUnlocked > only the first
    const unlocked = allUnlocked
      || (firstNUnlocked > 0 && idx < firstNUnlocked)
      || idx === 0;

    return {
      scene_id:    sceneDef.id,
      scene_name:  sceneDef.name,
      scene_order: idx + 1,
      is_unlocked: unlocked,
      is_locked:   !unlocked,
      level_locks: allUnlocked
        ? { sound: false, word: false, sentence: false, dialogue: false }
        : defaultLevelLocks
    };
  }));
};

  const handlePlayScene = (scene) => {
    if (!scene.is_unlocked) {
      alert('🔒 This scene is locked!\n\nAsk your parent to unlock it.');
      return;
    }

    sessionStorage.setItem('currentScene', JSON.stringify({
      scene_id: scene.scene_id,
      scene_name: scene.scene_name,
      level_locks: scene.level_locks || {}
    }));
    navigate('/character-customization');
  };

  const handleBack = () => {
    if (user?.role === 'parent' || user?.role === 'expert') {
      navigate('/mini-selection');
    } else {
      navigate('/');
    }
  };

  const navigationItems = [
    { id: 'play', label: 'PLAY', action: () => {} },
    { id: 'about', label: 'ABOUT', action: () => navigate('/about') },
    { id: 'settings', label: 'SETTINGS', action: () => navigate('/settings') }
  ];

  // Responsive cards per page
  const getCardsPerPage = () => {
    if (isMobile) return 4;
    if (isTabletSmall) return 4;
    if (isTablet) return 5;
    return 10; // desktop: 2 rows x 5
  };

  const cardsPerPage = getCardsPerPage();
  const totalPages = Math.ceil(scenes.length / cardsPerPage);
  const currentScenes = scenes.slice(
    currentPage * cardsPerPage,
    (currentPage + 1) * cardsPerPage
  );

  // Responsive grid columns
  const getGridCols = () => {
    if (isMobile) return 4;
    if (isTabletSmall) return 4;
    if (isTablet) return 5;
    return 5;
  };

  // Header height to subtract from viewport on mobile
  const headerH = isMobile ? 42 : isTabletSmall ? 48 : isTablet ? 52 : 0;

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    .ssp-page {
      ${isSmallScreen ? '' : 'min-height: 100vh;'}
      background: #FFFFFF;
      font-family: "Montserrat", sans-serif;
      ${isSmallScreen ? 'overflow: hidden;' : ''}
    }
    .ssp-page *, .ssp-page button, .ssp-page p, .ssp-page h1 {
      font-family: "Montserrat", sans-serif;
    }

    /* Safe area for iPhone notch in landscape */
    .ssp-safe-area {
      padding-left: env(safe-area-inset-left, 0px);
      padding-right: env(safe-area-inset-right, 0px);
    }

    .ssp-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: ${isSmallScreen ? '6px 8px 4px' : '24px 24px 40px'};
      ${isSmallScreen ? `
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      height: calc(100dvh - ${headerH}px);
      min-height: calc(${viewportH}px - ${headerH}px);
      ` : ''}
    }

    .ssp-heading {
      text-align: center;
      margin-bottom: ${isSmallScreen ? '4px' : '28px'};
      ${isSmallScreen ? '-webkit-flex-shrink: 0; flex-shrink: 0;' : ''}
    }
    .ssp-heading h1 {
      font-size: ${isMobile ? '18px' : isTabletSmall ? '22px' : isTablet ? '28px' : '42px'};
      font-weight: 900;
      color: #E31E24;
      margin: 0 0 ${isSmallScreen ? '2px' : '8px'};
    }
    .ssp-heading p {
      font-size: ${isMobile ? '10px' : isTabletSmall ? '11px' : isTablet ? '13px' : '16px'};
      color: #555;
      margin: 0;
    }

    .ssp-carousel {
      position: relative;
      padding: 0 ${isMobile ? '36px' : isTabletSmall ? '44px' : '70px'};
      ${isSmallScreen ? `
      -webkit-box-flex: 1;
      -webkit-flex: 1;
      flex: 1;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      ` : ''}
    }

    .ssp-arrow {
      position: absolute;
      top: 50%;
      -webkit-transform: translateY(-50%);
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      z-index: 10;
      -webkit-transition: opacity 0.2s;
      transition: opacity 0.2s;
      -webkit-appearance: none;
      appearance: none;
    }
    .ssp-arrow:disabled {
      opacity: 0.25;
      cursor: default;
    }
    .ssp-arrow:not(:disabled):hover {
      opacity: 0.7;
    }
    .ssp-arrow-left { left: ${isMobile ? '2px' : isTabletSmall ? '4px' : '0'}; }
    .ssp-arrow-right { right: ${isMobile ? '2px' : isTabletSmall ? '4px' : '0'}; }
    .ssp-arrow img { height: ${isMobile ? '28px' : isTabletSmall ? '36px' : isTablet ? '44px' : '56px'}; }

    .ssp-grid {
      display: -ms-grid;
      display: grid;
      grid-template-columns: repeat(${getGridCols()}, 1fr);
      gap: ${isMobile ? '6px' : isTabletSmall ? '10px' : isTablet ? '14px' : '16px'};
      grid-auto-rows: 1fr;
      ${isSmallScreen ? 'width: 100%;' : ''}
    }

    .sc-card {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      border-radius: ${isSmallScreen ? '8px' : '12px'};
      overflow: hidden;
      -webkit-transform: translateY(0) translateZ(0);
      transform: translateY(0) translateZ(0);
      will-change: transform;
      -webkit-transition: -webkit-transform 0.2s;
      transition: transform 0.2s;
    }
    .sc-card:hover {
      -webkit-transform: translateY(-3px);
      transform: translateY(-3px);
    }

    .sc-card-brick {
      width: 100%;
      display: block;
      border-radius: ${isSmallScreen ? '8px 8px 0 0' : '12px 12px 0 0'};
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }

    .sc-card-body {
      background: #E52828;
      border-radius: ${isSmallScreen ? '8px' : '12px'};
      padding: 0;
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

    /* Kilitli kart — koyu kırmızı */
    .sc-card.locked .sc-card-body {
      background: #8B1A1A;
    }
    .sc-card.locked .sc-card-brick {
      -webkit-filter: brightness(0.75) saturate(0.7);
      filter: brightness(0.75) saturate(0.7);
    }

    .sc-card-name {
      text-align: center;
      color: #FFFFFF;
      font-weight: 800;
      font-size: ${isMobile ? '9px' : isTabletSmall ? '11px' : isTablet ? '13px' : '16px'};
      padding: ${isMobile ? '4px 3px' : isTabletSmall ? '6px 4px' : isTablet ? '8px 4px' : '15px 6px 15px'};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }

    .sc-card-inner {
      background: #FFFFFF;
      margin: ${isMobile ? '0 4px 4px' : isTabletSmall ? '0 5px 5px' : isTablet ? '0 6px 6px' : '0 8px 8px'};
      border-radius: ${isMobile ? '6px' : isTabletSmall ? '7px' : '10px'};
      padding: ${isMobile ? '4px' : isTabletSmall ? '5px' : isTablet ? '6px' : '8px'};
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
      gap: ${isMobile ? '4px' : isTabletSmall ? '5px' : isTablet ? '6px' : '8px'};
    }

    .sc-card-img-wrap {
      position: relative;
      border-radius: ${isMobile ? '4px' : '6px'};
      overflow: hidden;
      aspect-ratio: 16 / 10;
      background: #F0F0F0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .sc-card-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .sc-card-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      pointer-events: none;
    }

    .sc-card-play {
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .sc-card-play button {
      width: 100%;
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      display: block;
      -webkit-appearance: none;
      appearance: none;
      -webkit-transform: scale(1) translateZ(0);
      transform: scale(1) translateZ(0);
      will-change: transform;
      -webkit-transition: -webkit-transform 0.15s;
      transition: transform 0.15s;
    }
    .sc-card-play button:not(:disabled):hover {
      -webkit-transform: scale(1.04);
      transform: scale(1.04);
    }
    .sc-card-play button:disabled {
      cursor: not-allowed;
      -webkit-filter: grayscale(80%) brightness(0.65);
      filter: grayscale(80%) brightness(0.65);
    }
    .sc-card-play button img {
      width: 100%;
      display: block;
      border-radius: 4px;
    }

    /* Page indicator — mobile/tablet */
    .ssp-page-indicator {
      text-align: center;
      margin-top: ${isSmallScreen ? '4px' : '24px'};
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .ssp-page-indicator span {
      display: inline-block;
      padding: ${isMobile ? '2px 12px' : isTabletSmall ? '3px 14px' : '4px 16px'};
      border: 2px solid #333;
      border-radius: 6px;
      font-weight: 800;
      font-size: ${isMobile ? '11px' : isTabletSmall ? '13px' : isTablet ? '14px' : '16px'};
      color: #333;
    }

    /* Desktop dots */
    .ssp-dots {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 6px;
      margin-top: 24px;
    }
    .ssp-dot {
      height: 10px;
      border-radius: 5px;
      cursor: pointer;
      border: none;
      padding: 0;
      -webkit-appearance: none;
      appearance: none;
      -webkit-transition: all 0.2s;
      transition: all 0.2s;
    }
    .ssp-dot-active {
      width: 28px;
      background: #333;
    }
    .ssp-dot-inactive {
      width: 10px;
      background: #CCC;
    }
    .ssp-dot-inactive:hover {
      background: #999;
    }

    .ssp-loading {
      min-height: 100vh;
      background: #FFF;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 16px;
      font-family: "Montserrat", sans-serif;
    }

    @media (max-width: 1200px) {
      .ssp-grid.desktop-grid {
        -ms-grid-columns: 1fr 14px 1fr 14px 1fr 14px 1fr;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
      }
    }
    @media (max-width: 900px) {
      .ssp-grid.desktop-grid {
        -ms-grid-columns: 1fr 12px 1fr 12px 1fr;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
    }
  `;

  if (loading || !selectedMini) {
    return (
      <div className="ssp-page">
        <style>{styles}</style>
        <div className="ssp-loading">
          <img src={loadingGif} alt="Loading..." style={{ width: '128px', height: '128px' }} />
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#4b5563' }}>Loading...</span>
        </div>
      </div>
    );
  }

  const renderCard = (scene, globalIdx) => {
const img = getSceneImage(scene.scene_id);   // scene_name yerine scene_id
    const unlocked = scene.is_unlocked;

    return (
      <div key={scene.scene_id} className={`sc-card${!unlocked ? ' locked' : ''}`}>
        <img src={BrickBorder} alt="" className="sc-card-brick" />

        <div className="sc-card-body">
          <div className="sc-card-name">{scene.scene_name}</div>

          <div className="sc-card-inner">
            <div className="sc-card-img-wrap">
              {unlocked && img ? (
                <img src={img} alt={scene.scene_name} />
              ) : (
                <img src={lockedScreen} alt="Locked" />
              )}

              {!unlocked && (
                <div className="sc-card-overlay" />
              )}
            </div>

            <div className="sc-card-play">
              <button
                onClick={() => handlePlayScene(scene)}
                onMouseEnter={() => unlocked && setHoveredCard(globalIdx)}
                onMouseLeave={() => setHoveredCard(null)}
                disabled={!unlocked}
              >
                <img
                  src={unlocked && hoveredCard === globalIdx ? playBtnFilledHover : playBtnFilled}
                  alt="Play"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="ssp-page ssp-safe-area"
      style={{
        height: isSmallScreen ? '100dvh' : undefined,
        minHeight: isSmallScreen ? `${viewportH}px` : '100vh',
        overflow: isSmallScreen ? 'hidden' : undefined,
      }}
    >
      <style>{styles}</style>

      <Header
        showBackButton={true}
        onBack={handleBack}
        navigationItems={navigationItems}
        activeNavItem="play"
      />

      <div className="ssp-container">
        <div className="ssp-heading">
          <h1>SCENES</h1>
          <p>Select a scene where your Mini can explore, interact, and enjoy a new setting.</p>
        </div>

        <div className="ssp-carousel">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="ssp-arrow ssp-arrow-left"
          >
            <img src={leftSlider} alt="Previous" />
          </button>

          <div className={`ssp-grid${!isSmallScreen ? ' desktop-grid' : ''}`}>
            {currentScenes.map((scene, idx) =>
              renderCard(scene, currentPage * cardsPerPage + idx)
            )}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="ssp-arrow ssp-arrow-right"
          >
            <img src={rightSlider} alt="Next" />
          </button>
        </div>

        {/* Mobile/Tablet: Page indicator "1/12" style */}
        {isSmallScreen && totalPages > 1 && (
          <div className="ssp-page-indicator">
            <span>{currentPage + 1}/{totalPages}</span>
          </div>
        )}

        {/* Desktop: Dot navigation */}
        {!isSmallScreen && totalPages > 1 && (
          <div className="ssp-dots">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`ssp-dot ${i === currentPage ? 'ssp-dot-active' : 'ssp-dot-inactive'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneSelectionPage;