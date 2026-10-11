// src/components/common/Header.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAvatar } from '../../hooks/useAvatar';
import ProfileAvatar from './ProfileAvatar';
import { clearAvatars } from '../../utils/avatars';
import { avatarTarget } from '../../utils/activeProfile';

// Assets
import logoImg from '../../assets/logo.png';
import mainMenuBtn from '../../assets/main-menu-btn.png';
import mainMenuBtnHover from '../../assets/main-menu-btn-hover.png';
import profileIcon from '../../assets/profile-icon.png';
import backIcon from '../../assets/Geri_Ikon.png';

// Safari viewport fix - runs once globally
const initSafariViewportFix = (() => {
  let initialized = false;
  return () => {
    if (initialized || typeof window === 'undefined') return;
    initialized = true;
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
  };
})();

const Header = ({ 
  showTabs = false, 
  tabs = [], 
  activeTab = '', 
  onTabChange = () => {},
  centerContent = null,
  showBackButton = false,
  onBack = null,
  navigationItems = null,
  activeNavItem = null
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mainMenuHover, setMainMenuHover] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedMini, setSelectedMini] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Responsive screen size detection
  const [screenSize, setScreenSize] = useState('desktop');

  // Safari viewport fix
  useEffect(() => {
    initSafariViewportFix();
  }, []);

  // selectedMini'yi sessionStorage'dan oku
  useEffect(() => {
    const checkSelectedMini = () => {
      const miniData = sessionStorage.getItem('selectedMini');
      if (miniData) {
        try {
          const parsed = JSON.parse(miniData);
          if (!parsed.is_parent && parsed.mini_id) {
            setSelectedMini(parsed);
          } else {
            setSelectedMini(null);
          }
        } catch (e) {
          setSelectedMini(null);
        }
      } else {
        setSelectedMini(null);
      }
    };

    checkSelectedMini();
    window.addEventListener('storage', checkSelectedMini);
    const interval = setInterval(checkSelectedMini, 500);
    
    return () => {
      window.removeEventListener('storage', checkSelectedMini);
      clearInterval(interval);
    };
  }, []);

  // Handle minimization based on screen width + responsive screen size
  useEffect(() => {
    const checkMinimized = () => {
      const w = window.innerWidth;
      setIsMinimized(w <= 900);

      if (w <= 740) setScreenSize('mobile');
      else if (w <= 1024) setScreenSize('tablet-small');
      else if (w <= 1380) setScreenSize('tablet');
      else setScreenSize('desktop');
    };

    checkMinimized();
    window.addEventListener('resize', checkMinimized);

    return () => {
      window.removeEventListener('resize', checkMinimized);
    };
  }, []);

  const isMobile = screenSize === 'mobile';
  const isTabletSmall = screenSize === 'tablet-small';
  const isTablet = screenSize === 'tablet';
  const isSmallScreen = isMobile || isTabletSmall || isTablet;

  // Dashboard'a navigate et - aynı sayfadaysa custom event ile tab değiştir
  const navigateToDashboard = (tab, view) => {
    setShowProfileMenu(false);
    
    if (location.pathname === '/dashboard') {
      window.dispatchEvent(new CustomEvent('header-tab-change', { 
        detail: { tab, view } 
      }));
    } else {
      const params = new URLSearchParams();
      params.set('tab', tab);
      if (view) params.set('view', view);
      navigate(`/dashboard?${params.toString()}`);
    }
  };

  // The picture on the pill follows whichever profile is active: the Mini while
  // one is open, the signed-in account otherwise. It comes from the shared
  // avatar cache, so opening a Mini swaps it here on its own, and saving a new
  // avatar in the editor reaches the header without a reload.
  // This header's label follows the selected Mini, so its picture does too.
  const { role: avatarRole, id: avatarId } = avatarTarget(user, selectedMini);
  const { avatarUrl: activeAvatarUrl } = useAvatar(avatarRole, avatarId);

  // The pill's own size classes still set the box; ProfileAvatar fills it and
  // brings the framing and the clipping with it, so a slightly zoomed avatar
  // cannot spill out of the pill.
  const avatarBoxStyle = { display: 'block', flex: '0 0 auto', borderRadius: '6px', overflow: 'hidden' };

  // Aktif profil: selectedMini varsa mini, yoksa user
  const getActiveProfile = () => {
    // Guest kullanıcılar her zaman sadece Sign In görsün
    if (user?.role === 'guest') return null;

    if (selectedMini) {
      return {
        type: 'mini',
        label: 'Mini',
        name: selectedMini.mini_name || 'Mini',
        menuItems: [
          { label: 'Mini Profile', action: () => navigateToDashboard('profile', 'mini') },
          { label: 'Mini Journey', action: () => navigateToDashboard('journey', 'mini') },
          { label: 'Sign Out', action: handleSignOut }
        ]
      };
    }

    if (!user) return null;

    switch (user.role) {
      case 'parent':
        return {
          type: 'parent',
          label: 'Parent',
          name: user.profile?.full_name || user.profile?.username || user.email || 'User',
          menuItems: [
            { label: 'Parent Profile', action: () => navigateToDashboard('profile') },
            { label: 'My Mini(s)', action: () => navigateToDashboard('myminis') },
            { label: 'Sign Out', action: handleSignOut }
          ]
        };
      case 'builder':
        return {
          type: 'builder',
          label: 'Builder',
          name: user.profile?.full_name || user.profile?.username || user.email || 'User',
          menuItems: [
            { label: 'Builder Profile', action: () => navigateToDashboard('profile') },
            { label: 'Creations', action: () => navigateToDashboard('creations') },
            { label: 'Sign Out', action: handleSignOut }
          ]
        };
      case 'expert':
        return {
          type: 'expert',
          label: 'Expert',
          name: user.profile?.full_name || user.profile?.username || user.email || 'User',
          menuItems: [
            { label: 'Expert Profile', action: () => navigateToDashboard('profile') },
            { label: 'My Mini(s)', action: () => navigateToDashboard('myminis') },
            { label: 'Sign Out', action: handleSignOut }
          ]
        };
      case 'child':
        return {
          type: 'mini',
          label: 'Mini',
          name: user.profile?.mini_name || 'Mini',
          menuItems: [
            { label: 'Mini Profile', action: () => navigateToDashboard('profile') },
            { label: 'Mini Journey', action: () => navigateToDashboard('journey') },
            { label: 'Sign Out', action: handleSignOut }
          ]
        };
      case 'guest':
        return null;
      default:
        return {
          type: 'user',
          label: user.role || 'User',
          name: user.profile?.full_name || 'User',
          menuItems: [
            { label: 'Profile', action: () => navigateToDashboard('profile') },
            { label: 'Sign Out', action: handleSignOut }
          ]
        };
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('selectedMini');
    setSelectedMini(null);
    // Otherwise the next person to sign in on this computer sees the previous
    // family's faces until their own avatars have loaded.
    clearAvatars();
    logout();
    navigate('/');
  };

  const handleSwitchProfile = () => {
    sessionStorage.removeItem('selectedMini');
    setSelectedMini(null);
    setShowProfileMenu(false);
    navigate('/mini-selection');
  };

  const activeProfile = getActiveProfile();
  const montserratFont = { fontFamily: "'Montserrat', sans-serif" };

  // ---- Responsive sizing variables ----
  const rIconH = isMobile ? 'h-5' : isTabletSmall ? 'h-7' : isTablet ? 'h-8' : 'h-8 sm:h-10 md:h-12';
  const rLogoH = isMobile ? 'h-7' : isTabletSmall ? 'h-8' : isTablet ? 'h-10' : 'h-10 sm:h-12 md:h-14';
  const rDividerH = isMobile ? 'h-5' : isTabletSmall ? 'h-7' : isTablet ? 'h-8' : 'h-8 sm:h-10 md:h-12';
  const rProfileBtnH = isMobile ? 'h-7' : isTabletSmall ? 'h-8' : isTablet ? 'h-10' : 'h-10 sm:h-12 md:h-14';
  const rProfileIconSize = isMobile ? 'w-5 h-5' : isTabletSmall ? 'w-6 h-6' : isTablet ? 'w-8 h-8' : 'w-7 h-7 sm:w-9 sm:h-9 md:w-12 md:h-12';
  const rProfileFontSize = isMobile ? 'text-[9px]' : isTabletSmall ? 'text-[10px]' : isTablet ? 'text-xs' : 'text-xs sm:text-sm md:text-base lg:text-lg';
  const rProfileMinW = isMobile ? '55px' : isTabletSmall ? '65px' : isTablet ? '90px' : isMinimized ? '80px' : '120px';
  const rProfileRadius = isMobile ? '10px' : isTabletSmall ? '12px' : isTablet ? '14px' : '16px';
  const rProfilePx = isMobile ? 'px-1.5' : isTabletSmall ? 'px-2' : isTablet ? 'px-2' : 'px-2 sm:px-3';
  const rDropdownMinW = isMobile ? 'min-w-[130px]' : isTabletSmall ? 'min-w-[160px]' : isTablet ? 'min-w-[200px]' : 'min-w-[200px] sm:min-w-[260px] md:min-w-[320px]';
  const rDropdownH = isMobile ? 'h-7' : isTabletSmall ? 'h-8' : isTablet ? 'h-10' : 'h-10 sm:h-12 md:h-14';
  const rDropdownFontSize = isMobile ? 'text-[9px]' : isTabletSmall ? 'text-[10px]' : isTablet ? 'text-xs' : 'text-sm sm:text-base md:text-lg';
  const rDropdownPx = isMobile ? 'px-2' : isTabletSmall ? 'px-3' : isTablet ? 'px-4' : 'px-4 sm:px-6';
  const rNameMaxW = isMobile ? '60px' : isTabletSmall ? '80px' : '160px';
  const rNavFontSize = isMobile ? 'text-[10px]' : isTabletSmall ? 'text-xs' : isTablet ? 'text-sm' : 'text-base sm:text-lg md:text-xl lg:text-2xl';
  const rNavGap = isMobile ? 'gap-2' : isTabletSmall ? 'gap-3' : isTablet ? 'gap-4' : 'gap-4 md:gap-8 lg:gap-12';
  const rHamburgerSize = isMobile ? 'w-7 h-7' : isTabletSmall ? 'w-8 h-8' : 'w-10 h-10';
  const rHamburgerLineW = isMobile ? 'w-4' : isTabletSmall ? 'w-5' : 'w-6';
  const rHeaderPy = isMobile ? 'py-0.5' : isTabletSmall ? 'py-1' : isTablet ? 'py-1.5' : 'py-2 sm:py-3';
  const rLeftGap = isMobile ? 'gap-1.5' : isTabletSmall ? 'gap-2' : 'gap-3 md:gap-5 lg:gap-7';

  return (
    <>
      <div 
        className="bg-white border-b-2 border-gray-200 relative header-root" 
        style={montserratFont}
      >
        {/* Force all buttons to inherit Montserrat */}
        <style>{`
          .header-root button { font-family: 'Montserrat', sans-serif !important; }
        `}</style>
        {/* Logo section - absolute positioned on the left */}
        <div className={`absolute ${isMobile ? 'left-1' : isTabletSmall ? 'left-2' : 'left-2 sm:left-4 md:left-6'} top-1/2 -translate-y-1/2 z-50`}
          style={{
            marginLeft: isSmallScreen ? 'env(safe-area-inset-left, 0px)' : undefined,
          }}
        >
          <div className={`flex items-center ${rLeftGap} flex-shrink-0`}>
            {showBackButton ? (
              <button
                onClick={onBack || (() => navigate(-1))}
                className="transition-transform hover:scale-105 flex-shrink-0"
                aria-label="Go back"
              >
                <img src={backIcon} alt="Back" className={rIconH} />
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                onMouseEnter={() => setMainMenuHover(true)}
                onMouseLeave={() => setMainMenuHover(false)}
                className="transition-transform hover:scale-105 flex-shrink-0"
                aria-label="Go to main menu"
              >
                <img 
                  src={mainMenuHover ? mainMenuBtnHover : mainMenuBtn}
                  alt="Main menu"
                  className={rIconH}
                />
              </button>
            )}
            
            {/* Thin red vertical divider line */}
            <div className={`w-[1px] ${rDividerH} bg-red-600 flex-shrink-0`} />

            <img 
              src={logoImg}
              alt="Mini-Talks"
              className={`${rLogoH} flex-shrink-0`}
            />

            {/* Mobile Hamburger Menu - shows when minimized */}
            {navigationItems && navigationItems.length > 0 && (
              <div className={`${isMinimized ? 'block' : 'hidden'} relative flex-shrink-0`}>
                <button
                  type="button"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className={`flex flex-col items-center justify-center ${rHamburgerSize} hover:bg-gray-100 rounded transition-colors`}
                  aria-label="Toggle mobile menu"
                  aria-expanded={showMobileMenu}
                >
                  <div className={`${rHamburgerLineW} h-0.5 bg-gray-600 transition-transform duration-200 ${showMobileMenu ? 'rotate-45 translate-y-1' : '-translate-y-1'}`} />
                  <div className={`${rHamburgerLineW} h-0.5 bg-gray-600 transition-opacity duration-200 ${showMobileMenu ? 'opacity-0' : 'opacity-100'}`} />
                  <div className={`${rHamburgerLineW} h-0.5 bg-gray-600 transition-transform duration-200 ${showMobileMenu ? '-rotate-45 -translate-y-1' : 'translate-y-1'}`} />
                </button>

                {showMobileMenu && (
                  <div className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-[2000] min-w-[200px]">
                    {navigationItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          item.action();
                          setShowMobileMenu(false);
                        }}
                        className={`w-full text-left px-4 py-3 font-extrabold transition-colors ${
                          activeNavItem === item.id
                            ? 'text-black bg-gray-50'
                            : 'text-gray-600 hover:text-black hover:bg-gray-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main container */}
        <div className={`w-full px-2 sm:px-4 md:px-6 ${rHeaderPy}`}
          style={{
            paddingLeft: isSmallScreen ? 'calc(8px + env(safe-area-inset-left, 0px))' : undefined,
            paddingRight: isSmallScreen ? 'calc(8px + env(safe-area-inset-right, 0px))' : undefined,
          }}
        >
          <div className={`flex items-center justify-between ${isMobile ? 'pl-[90px]' : isTabletSmall ? 'pl-[110px]' : isTablet ? 'pl-[140px]' : 'pl-[120px] sm:pl-[160px] md:pl-[200px] lg:pl-[240px]'}`}>
            {/* Spacer for left side */}
            <div className="flex-shrink-0" />

            {/* Orta: Navigation Items */}
            {navigationItems && navigationItems.length > 0 && (
              <div className={`${isMinimized ? 'hidden' : 'flex'} items-center ${rNavGap}`}>
                {navigationItems.map(item => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className={`${rNavFontSize} font-extrabold transition-colors whitespace-nowrap ${
                      activeNavItem === item.id 
                        ? 'underline decoration-2 md:decoration-4 underline-offset-4 md:underline-offset-8 text-black' 
                        : 'text-gray-400 hover:text-black'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {showTabs && tabs.length > 0 && (
              <div className="flex gap-1 sm:gap-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-3 sm:px-4 md:px-6 py-1 sm:py-2 font-extrabold text-sm sm:text-base transition-all ${
                      activeTab === tab.id
                        ? 'text-black border-b-4 border-black'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={montserratFont}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            {centerContent}

            {/* Sağ: User Dropdown veya Sign In */}
            {activeProfile ? (
              <div className="relative z-[2000]">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex gap-0.5 sm:gap-1 cursor-pointer"
                >
                  {/* Sol: LEGO kafa + Role */}
                  <div 
                    className={`flex items-center gap-1 sm:gap-2 ${rProfilePx} ${rProfileBtnH} hover:opacity-90 transition-opacity`}
                    style={{
                      backgroundColor: '#0055bf',
                      borderRadius: `${rProfileRadius} 0 0 ${rProfileRadius}`,
                      minWidth: rProfileMinW
                    }}
                  >
                    <span className={rProfileIconSize} style={avatarBoxStyle}>
                      <ProfileAvatar role={avatarRole} id={avatarId} alt="Profile" size="100%" />
                    </span>
                    <span className={`text-white font-black ${rProfileFontSize}`}>
                      {activeProfile.label}
                    </span>
                  </div>
                  
                  {/* Sağ: Name */}
                  <div 
                    className={`flex items-center justify-center ${rProfilePx} ${rProfileBtnH} hover:opacity-90 transition-opacity`}
                    style={{
                      backgroundColor: '#0055bf',
                      borderRadius: `0 ${rProfileRadius} ${rProfileRadius} 0`,
                      minWidth: rProfileMinW
                    }}
                  >
                    <span className={`text-white font-black ${rProfileFontSize} truncate`}
                      style={{ maxWidth: rNameMaxW }}
                    >
                      {activeProfile.name}
                    </span>
                  </div>
                </button>

                {/* Dropdown menü */}
                {showProfileMenu && (
                  <div className={`absolute right-0 top-full mt-1.5 flex flex-col gap-1.5 ${rDropdownMinW} z-[2000]`}>
                    {activeProfile.menuItems.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          item.action();
                        }}
                        className={`flex items-center ${rDropdownPx} ${rDropdownH} text-white font-extrabold ${rDropdownFontSize} hover:opacity-90 transition-opacity`}
                        style={{
                          backgroundColor: '#0055bf',
                          borderRadius: rProfileRadius,
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                    
                    {/* selectedMini varsa "Switch Profile" butonu ekle - Parent ve Expert için */}
                    {selectedMini && (user?.role === 'parent' || user?.role === 'expert') && (
                      <button
                        type="button"
                        onClick={handleSwitchProfile}
                        className={`flex items-center ${rDropdownPx} ${rDropdownH} text-white font-extrabold ${rDropdownFontSize} hover:opacity-90 transition-opacity`}
                        style={{
                          backgroundColor: '#E31E24',
                          borderRadius: rProfileRadius,
                        }}
                      >
                        Switch Profile
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex gap-0.5 sm:gap-1 cursor-pointer"
              >
                <div 
                  className={`flex items-center justify-center ${rProfilePx} ${rProfileBtnH} hover:opacity-90 transition-opacity`}
                  style={{
                    backgroundColor: '#0055bf',
                    borderRadius: `${rProfileRadius} 0 0 ${rProfileRadius}`
                  }}
                >
                  <span className={rProfileIconSize} style={avatarBoxStyle}>
                    <ProfileAvatar role={avatarRole} id={avatarId} alt="Profile" size="100%" />
                  </span>
                </div>
                
                <div 
                  className={`flex items-center justify-center px-2 sm:px-4 md:px-6 ${rProfileBtnH} hover:opacity-90 transition-opacity`}
                  style={{
                    backgroundColor: '#0055bf',
                    borderRadius: `0 ${rProfileRadius} ${rProfileRadius} 0`
                  }}
                >
                  <span className={`text-white font-black ${rProfileFontSize}`}>
                    Sign in
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showProfileMenu || showMobileMenu) && (
        <div 
          className="fixed inset-0 z-[1999]" 
          onClick={() => {
            setShowProfileMenu(false);
            setShowMobileMenu(false);
          }}
        />
      )}
    </>
  );
};

export default Header;