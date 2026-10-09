// src/pages/MiniSelectionPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/common/Header';
import axios from 'axios';

// Assets
import profileIcon from '../assets/profile-icon.png';
import selectBtn from '../assets/Select_Buton.png';
import selectBtnHover from '../assets/Select_Buton_Hover.png';
import expertIcon from '../assets/expert.png';
import loadingGif from '../assets/loading_animation_1.gif';

// Slider ok ikonları (SceneSelectionPage ile aynı)
import leftSlider from '../assets/left_slider_icon.png';
import rightSlider from '../assets/right_slider_icon.png';

const MiniSelectionPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [minis, setMinis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardHoverIndex, setCardHoverIndex] = useState(null);

  // Responsive
  const [viewportH, setViewportH] = useState(window.innerHeight);
  const [screenSize, setScreenSize] = useState('desktop');

  // Mobile carousel
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Carousel görünür alan genişliği (kaç kart sığdığını hesaplamak için)
  const carouselRef = useRef(null);
  const [carouselW, setCarouselW] = useState(0);

  useEffect(() => {
    const update = () => {
      setViewportH(window.innerHeight);
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Landscape mobile/tablet detection:
      // Genişlik bazlı (portrait) VEYA yükseklik bazlı (landscape)
      if (w <= 740 || h <= 440) setScreenSize('mobile');
      else if (w <= 1024 || h <= 768) setScreenSize('tablet-small');
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

  // Carousel görünür alan genişliğini ölç (resize + orientation + ilk render)
  useEffect(() => {
    const measure = () => {
      if (carouselRef.current) {
        setCarouselW(carouselRef.current.offsetWidth);
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
  }, [screenSize, minis.length]);

  // Boyut/ölçüm değişince carousel başa sarsın (taşma olmasın)
  useEffect(() => {
    setCurrentSlide(0);
  }, [screenSize, carouselW, minis.length]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Parent veya Expert değilse direkt scene selection'a yönlendir
    if (user.role !== 'parent' && user.role !== 'expert') {
      navigate('/scene-selection');
      return;
    }

    fetchMinis();
  }, [user, navigate]);

  const fetchMinis = async () => {
    try {
      setLoading(true);
      
      let response;
      if (user.role === 'expert') {
        // Expert için - mevcut çalışan API'yi kullan
        response = await axios.get(
          `https://mini-talks.org/minitalks-api/auth/get-expert-minis.php?expert_id=${user.user_id}`
        );
        if (response.data.success) {
          // Expert API'si minis array'i döndürüyor
          const connectedMinis = response.data.data?.minis || [];
          setMinis(connectedMinis);
        }
      } else {
        // Parent için
        response = await axios.get(
          `https://mini-talks.org/minitalks-api/auth/get-my-minis.php?parent_id=${user.user_id}`
        );
        if (response.data.success) {
          const approvedMinis = response.data.data.approved || [];
          setMinis(approvedMinis);
        }
      }
    } catch (error) {
      console.error('Failed to fetch minis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mini login aktivitesini kaydet
  const recordMiniLogin = async (miniId) => {
    try {
      await axios.post('https://mini-talks.org/minitalks-api/streak/record-activity.php', {
        mini_id: miniId,
        activity_type: 'login'
      });
      console.log('Mini login recorded for mini_id:', miniId);
    } catch (error) {
      console.error('Failed to record mini login:', error);
    }
  };

  const handleSelectMini = async (mini) => {
    // Mini seçimini session'a kaydet - parent_id veya expert_id'yi ekle
    const miniWithOwner = {
      ...mini,
      parent_id: user.role === 'parent' ? user.user_id : mini.parent_id,
      expert_id: user.role === 'expert' ? user.user_id : null,
      selected_by: user.role  // Kim seçti: 'parent' veya 'expert'
    };
    sessionStorage.setItem('selectedMini', JSON.stringify(miniWithOwner));
    // ✅ Play modu aktif - mini perspektifinden bakılacak
    sessionStorage.setItem('playMode', 'true');
    
    // ✅ Mini login aktivitesini kaydet (streak için)
    await recordMiniLogin(mini.mini_id);
    
    // Scene selection sayfasına git
    navigate('/scene-selection');
  };

  const handleSelectParent = () => {
    sessionStorage.setItem('selectedMini', JSON.stringify({ 
      mini_id: null, 
      mini_name: 'Parent',
      is_parent: true 
    }));
    sessionStorage.setItem('playMode', 'false');
    navigate('/scene-selection');
  };

  const handleSelectExpert = () => {
    sessionStorage.setItem('selectedMini', JSON.stringify({ 
      mini_id: null, 
      mini_name: 'Expert',
      is_expert: true 
    }));
    sessionStorage.setItem('playMode', 'false');
    navigate('/scene-selection');
  };

  // Tüm kartları bir array'e topla (minis + parent/expert kartı)
  const getAllCards = () => {
    const cards = minis.map((mini, index) => ({
      type: 'mini',
      key: mini.mini_id,
      index: index,
      mini: mini,
      name: mini.mini_name,
      subtitle: `Age Range: ${mini.age_range}`,
      icon: profileIcon,
      iconStyle: { width: '80px', height: '80px' },
      onSelect: () => handleSelectMini(mini),
    }));

    if (user.role === 'parent') {
      cards.push({
        type: 'parent',
        key: 'parent',
        index: 'parent',
        mini: null,
        name: 'Parent',
        subtitle: 'Play as Parent',
        icon: profileIcon,
        iconStyle: { width: '80px', height: '80px' },
        onSelect: handleSelectParent,
      });
    }

    if (user.role === 'expert') {
      cards.push({
        type: 'expert',
        key: 'expert',
        index: 'expert',
        mini: null,
        name: 'Expert',
        subtitle: 'Play as Expert',
        icon: expertIcon,
        iconStyle: { width: '70px', height: '70px', objectFit: 'contain' },
        onSelect: handleSelectExpert,
      });
    }

    return cards;
  };

  const allCards = getAllCards();
  const totalSlides = allCards.length;

  // Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold && currentSlide < maxSlide) {
      setCurrentSlide(Math.min(maxSlide, currentSlide + 1));
    } else if (diff < -threshold && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Header navigation items
  const navigationItems = [
    { id: 'play', label: 'PLAY', action: () => {} },
    { id: 'about', label: 'ABOUT', action: () => navigate('/about') },
    { id: 'settings', label: 'SETTINGS', action: () => navigate('/settings') }
  ];

  const montserratFont = { fontFamily: "'Montserrat', sans-serif" };

  // Header height to subtract
  const headerH = isMobile ? 42 : isTabletSmall ? 48 : isTablet ? 52 : 0;

  // Responsive card sizing — viewport height'a göre dinamik
  const vh = viewportH;
  const cardSize = isMobile ? `${Math.min(160, vh * 0.38)}px` : isTabletSmall ? `${Math.min(220, vh * 0.42)}px` : isTablet ? '240px' : undefined;
  const iconWrapSize = isMobile ? `${Math.min(80, vh * 0.16)}px` : isTabletSmall ? `${Math.min(96, vh * 0.16)}px` : isTablet ? '112px' : '128px';
  const iconSize = isMobile ? `${Math.min(50, vh * 0.1)}px` : isTabletSmall ? `${Math.min(60, vh * 0.1)}px` : isTablet ? '70px' : '80px';
  const nameFontSize = isMobile ? '14px' : isTabletSmall ? '18px' : isTablet ? '22px' : '1.875rem';
  const subtitleFontSize = isMobile ? '9px' : isTabletSmall ? '10px' : isTablet ? '12px' : '0.875rem';
  const selectBtnH = isMobile ? 'h-7' : isTabletSmall ? 'h-8' : isTablet ? 'h-10' : 'h-12';
  const cardPadding = isMobile ? '10px' : isTabletSmall ? '14px' : isTablet ? '20px' : '32px';
  const cardBorder = isMobile ? '3px' : '4px';
  const cardRadius = isMobile ? '14px' : isTabletSmall ? '18px' : '24px';
  const iconWrapBorder = isMobile ? '3px' : '4px';
  const iconWrapMb = isMobile ? '8px' : isTabletSmall ? '10px' : isTablet ? '16px' : '24px';
  const subtitleMb = isMobile ? '8px' : isTabletSmall ? '10px' : isTablet ? '16px' : '24px';
  const titleFontSize = isMobile ? '20px' : isTabletSmall ? '28px' : isTablet ? '36px' : '3.75rem';
  const descFontSize = isMobile ? '10px' : isTabletSmall ? '12px' : isTablet ? '14px' : '1.25rem';
  const arrowH = isMobile ? '28px' : isTabletSmall ? '36px' : isTablet ? '44px' : '56px';

  // ── Dinamik carousel hesabı ──
  // Ölçülen görünür alan genişliğinden ekrana KAÇ tam kart sığdığını hesapla.
  // Görünür alanı tam kart sayısına kırparız ki yarım kart sızmasın.
  // Oka her basışta 1 kart kayar: [1-2-3] -> [2-3-4] gibi.
  const cardGap = isMobile ? 12 : 20;
  const cardPx = parseFloat(cardSize) || 0;            // "160px" -> 160
  const carouselGap = isSmallScreen
    ? (isMobile ? 36 * 2 : 48 * 2)                       // okların kapladığı yatay padding
    : 0;
  const usableW = Math.max(0, carouselW - carouselGap);
  // Tam sığan kart sayısı (min 1)
  const visibleCards = (carouselW > 0 && cardPx > 0)
    ? Math.max(1, Math.floor((usableW + cardGap) / (cardPx + cardGap)))
    : (isMobile ? 2 : 3);                                // ölçüm gelmeden fallback
  // Görünür alanın tam kart genişliği (yarım kart kırpılır)
  const viewportCardsW = (cardPx > 0)
    ? visibleCards * cardPx + (visibleCards - 1) * cardGap
    : 0;
  // Tek-kart adımlı kaydırma: son kart görünene kadar
  const maxSlide = Math.max(0, totalSlides - visibleCards);
  // Ölçüm gelince currentSlide maxSlide'ı aşıyorsa düzelt
  const safeSlide = Math.min(currentSlide, maxSlide);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <img src={loadingGif} alt="Loading..." style={{ width: '128px', height: '128px' }} />
        <span style={{ fontSize: '20px', fontWeight: 700, color: '#4b5563' }}>Loading...</span>
      </div>
    );
  }

  // Parent veya Expert kendi kartını her zaman görebilir
  const showParentExpertCard = user.role === 'parent' || user.role === 'expert';

  // Kart render fonksiyonu — desktop ve mobile ortak
  const renderCard = (card, isActive = true) => {
    // Mobilde hover state'i devre dışı — dokunmada takılıp kalmasın
    const isHovered = !isSmallScreen && cardHoverIndex === card.index;
    
    return (
      <div
        key={card.key}
        onMouseEnter={() => !isSmallScreen && setCardHoverIndex(card.index)}
        onMouseLeave={() => !isSmallScreen && setCardHoverIndex(null)}
        style={{
          backgroundColor: isHovered ? '#0055BF' : '#FFFFFF',
          border: `${cardBorder} solid ${isHovered ? '#003d8f' : '#000000'}`,
          borderRadius: cardRadius,
          padding: cardPadding,
          textAlign: 'center',
          transition: 'all 0.2s ease',
          // Mobilde scale kapalı — overflow:hidden carousel'de kenar kesilmesin
          transform: isHovered ? (isSmallScreen ? 'scale(1)' : 'scale(1.05)') : 'scale(1)',
          boxShadow: isHovered ? '0 10px 30px rgba(0,85,191,0.4)' : '0 4px 6px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          width: isSmallScreen ? cardSize : undefined,
          flexShrink: 0,
        }}
        onClick={card.onSelect}
      >
        {/* Profile Icon */}
        <div style={{
          width: iconWrapSize,
          height: iconWrapSize,
          margin: `0 auto ${iconWrapMb}`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `${iconWrapBorder} solid ${isHovered ? '#003d8f' : '#000000'}`,
          backgroundColor: isHovered ? '#FFFFFF' : '#FFCC00',
          transition: 'all 0.2s ease'
        }}>
          <img 
            src={card.icon}
            alt={card.name}
            style={{ width: iconSize, height: iconSize, ...card.iconStyle, width: card.iconStyle?.width ? (isSmallScreen ? iconSize : card.iconStyle.width) : iconSize, height: card.iconStyle?.height ? (isSmallScreen ? iconSize : card.iconStyle.height) : iconSize }}
          />
        </div>

        {/* Name */}
        <h3 style={{
          fontSize: nameFontSize,
          fontWeight: 900,
          marginBottom: '8px',
          fontFamily: 'Arial Black, sans-serif',
          color: isHovered ? '#FFFFFF' : '#000000',
          transition: 'color 0.2s ease'
        }}>
          {card.name}
        </h3>
        
        <p style={{
          fontSize: subtitleFontSize,
          marginBottom: subtitleMb,
          color: isHovered ? 'rgba(255,255,255,0.8)' : '#666666',
          transition: 'color 0.2s ease'
        }}>
          {card.subtitle}
        </p>

        {/* Select Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            card.onSelect();
          }}
          className="transition-transform hover:scale-105"
        >
          <img 
            src={isHovered ? selectBtnHover : selectBtn}
            alt="Select"
            className={`${selectBtnH} mx-auto`}
          />
        </button>
      </div>
    );
  };

  return (
    <div
      className="msp-page"
      style={{
        ...montserratFont,
        background: '#FFFFFF',
        height: isSmallScreen ? '100dvh' : undefined,
        minHeight: isSmallScreen ? `${viewportH}px` : '100vh',
        overflow: isSmallScreen ? 'hidden' : undefined,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        .msp-page *, .msp-page button, .msp-page p, .msp-page h1, .msp-page h3 {
          font-family: "Montserrat", sans-serif;
        }
        .msp-safe-area {
          padding-left: env(safe-area-inset-left, 0px);
          padding-right: env(safe-area-inset-right, 0px);
        }
      `}</style>

      {/* ✅ Ortak Header component'i kullanılıyor */}
      <Header
        showBackButton={true}
        onBack={() => navigate('/')}
        navigationItems={navigationItems}
        activeNavItem="play"
      />

      {/* Content */}
      <div
        className="msp-safe-area"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isSmallScreen ? 'center' : undefined,
          maxWidth: isSmallScreen ? undefined : '1200px',
          margin: '0 auto',
          padding: isSmallScreen ? `${isMobile ? '8px' : '12px'} ${isMobile ? '8px' : '16px'}` : '24px 24px 40px',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: isSmallScreen ? (isMobile ? '8px' : '16px') : '64px', flexShrink: 0 }}>
          <h1 style={{
            fontSize: titleFontSize,
            fontWeight: 900,
            marginBottom: isMobile ? '4px' : '16px',
            fontFamily: 'Arial Black, sans-serif',
          }}>
            PLAY
          </h1>
          <p style={{
            fontSize: descFontSize,
            color: '#666666',
            margin: 0,
          }}>
            Choose who will play. Each profile has its own scenes, progress, and rewards!
          </p>
        </div>

        {/* Cards */}
        {minis.length === 0 && !showParentExpertCard ? (
          /* No Minis - Empty State */
          <div style={{ textAlign: 'center', padding: isSmallScreen ? '16px' : '64px 0' }}>
            <div style={{ fontSize: isSmallScreen ? '36px' : '60px', marginBottom: isSmallScreen ? '8px' : '24px' }}>👶</div>
            <h2 style={{ 
              fontSize: isSmallScreen ? '20px' : '1.875rem', 
              fontWeight: 900, 
              marginBottom: isSmallScreen ? '8px' : '16px' 
            }}>No Minis Yet</h2>
            <p style={{ color: '#666', marginBottom: isSmallScreen ? '16px' : '32px', fontSize: descFontSize }}>
              Add a Mini from your dashboard to start playing!
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: isSmallScreen ? '8px 24px' : '16px 32px',
                backgroundColor: '#dc2626',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: isSmallScreen ? '14px' : '18px',
                border: '2px solid black',
                cursor: 'pointer',
              }}
            >
              GO TO DASHBOARD
            </button>
          </div>
        ) : isSmallScreen ? (
          /* ====== MOBİL/TABLET: Kartlar yan yana, sığmazsa carousel ====== */
          <div
            ref={carouselRef}
            style={{ 
            position: 'relative', 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            padding: `0 ${isMobile ? '36px' : '48px'}`,
          }}>
            {/* Sol ok — her zaman görünür, kaydırılamazsa soluk/pasif */}
            <button
              onClick={() => maxSlide > 0 && setCurrentSlide(Math.max(0, safeSlide - 1))}
              disabled={safeSlide === 0}
              style={{
                position: 'absolute',
                left: isMobile ? '2px' : '4px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: safeSlide === 0 ? 'default' : 'pointer',
                opacity: safeSlide === 0 ? 0.25 : 1,
                zIndex: 10,
                WebkitAppearance: 'none',
              }}
            >
              <img src={leftSlider} alt="Previous" style={{ height: arrowH }} />
            </button>

            {/* Kartlar */}
            <div
              style={{ 
                overflow: maxSlide > 0 ? 'hidden' : 'visible',
                // Kaydırma varsa görünür alanı tam kart genişliğine kırp (yarım kart sızmasın)
                width: maxSlide > 0 && viewportCardsW > 0 ? `${viewportCardsW}px` : '100%',
                maxWidth: '100%',
                margin: '0 auto',
                display: 'flex',
                // Hepsi sığıyorsa kartları ortala; kaydırma varsa sola hizalı (track kayar)
                justifyContent: maxSlide > 0 ? 'flex-start' : 'center',
                // Dikey nefes payı — kartın gölgesi/sınırı carousel'de kesilmesin
                paddingTop: '14px',
                paddingBottom: '14px',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                style={{
                  display: 'flex',
                  gap: isMobile ? '12px' : '20px',
                  transition: 'transform 0.3s ease',
                  transform: maxSlide > 0
                    ? `translateX(calc(-${safeSlide} * (${cardSize} + ${isMobile ? '12px' : '20px'})))`
                    : 'none',
                  alignItems: 'center',
                }}
              >
                {allCards.map(card => renderCard(card))}
              </div>
            </div>

            {/* Sağ ok — her zaman görünür, kaydırılamazsa soluk/pasif */}
            <button
              onClick={() => maxSlide > 0 && setCurrentSlide(Math.min(maxSlide, safeSlide + 1))}
              disabled={safeSlide >= maxSlide}
              style={{
                position: 'absolute',
                right: isMobile ? '2px' : '4px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: safeSlide >= maxSlide ? 'default' : 'pointer',
                opacity: safeSlide >= maxSlide ? 0.25 : 1,
                zIndex: 10,
                WebkitAppearance: 'none',
              }}
            >
              <img src={rightSlider} alt="Next" style={{ height: arrowH }} />
            </button>
          </div>
        ) : (
          /* ====== DESKTOP: Grid Layout (orijinal) ====== */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {allCards.map(card => renderCard(card))}
          </div>
        )}

        {/* Mobile/Tablet: Page indicator — her zaman görünür (tek nokta bile) */}
        {isSmallScreen && (
          <div style={{ textAlign: 'center', marginTop: isMobile ? '6px' : '12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
              {Array.from({ length: maxSlide + 1 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  style={{
                    width: i === safeSlide ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    background: i === safeSlide ? '#333' : '#CCC',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    WebkitAppearance: 'none',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniSelectionPage;