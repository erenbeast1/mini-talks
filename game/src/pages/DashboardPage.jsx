// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

// Components
import Header from '../components/common/Header';
import ParentProfile from '../components/dashboard/ParentProfile';
import ParentMyMinis from '../components/dashboard/ParentMyMinis';
import BuilderProfile from '../components/dashboard/BuilderProfile';
import BuilderHub from '../components/dashboard/BuilderHub';
import ExpertProfile from '../components/dashboard/ExpertProfile';
import ExpertMyMinis from '../components/dashboard/ExpertMyMinis';
import MiniProfile from '../components/dashboard/MiniProfile';
import MiniManage from '../components/dashboard/MiniManage';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser, logout, setUser } = useAuth();
  const [localUser, setLocalUser] = useState(authUser);
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedMini, setSelectedMini] = useState(null);
  
  // ✅ ParentMyMinis reset key
  const [myMinisKey, setMyMinisKey] = useState(0);
  
  // ✅ Play mode state - mini perspektifinden bakılıyor mu?
  const [isPlayMode, setIsPlayMode] = useState(false);
  
  // API'den gelen viewerRole
  const [viewerRole, setViewerRole] = useState(null);
  const [viewerRoleLoading, setViewerRoleLoading] = useState(false);

  // ── Mobil/küçük ekran tespiti (MiniManage ile aynı eşik) ──
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const updateScreen = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsSmallScreen(w <= 1380 || h <= 600);
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
  
  // authUser değiştiğinde localUser'ı güncelle
  useEffect(() => {
    setLocalUser(authUser);
  }, [authUser]);
  
  // userUpdated event'ini dinle - anlık güncelleme için
  useEffect(() => {
    const handleUserUpdated = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setLocalUser(parsedUser);
          if (setUser) {
            setUser(parsedUser);
          }
        } catch (e) {
          console.error('Failed to parse user from localStorage:', e);
        }
      }
    };
    
    window.addEventListener('userUpdated', handleUserUpdated);
    return () => window.removeEventListener('userUpdated', handleUserUpdated);
  }, [setUser]);
  
  // User'ı hem local hem de auth context'te güncelle
  const handleUserUpdate = (updatedUser) => {
    setLocalUser(updatedUser);
    if (setUser) {
      setUser(updatedUser);
    }
    // localStorage'ı da güncelle
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };
  
  // user olarak localUser kullan
  const user = localUser;

  // URL'den tab parametresini oku
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // ✅ Header dropdown'dan tab değişikliğini dinle (tüm roller için)
  useEffect(() => {
    const handleHeaderTabChange = (e) => {
      const { tab, view } = e.detail;
      
      if (tab === 'myminis') {
        // My Mini(s) seçildi - handleGoToMyMinis ile aynı mantık
        sessionStorage.removeItem('selectedMini');
        sessionStorage.removeItem('playMode');
        setSelectedMini(null);
        setIsPlayMode(false);
        setViewerRole(null);
        setActiveTab('myminis');
        setMyMinisKey(prev => prev + 1);
      } else {
        setActiveTab(tab);
      }
    };
    
    window.addEventListener('header-tab-change', handleHeaderTabChange);
    return () => window.removeEventListener('header-tab-change', handleHeaderTabChange);
  }, []);

  // selectedMini ve playMode'u sessionStorage'dan oku
  useEffect(() => {
    if (user?.role === 'child' || user?.role === 'mini') {
      sessionStorage.removeItem('selectedMini');
      sessionStorage.removeItem('playMode');
      setSelectedMini(null);
      setIsPlayMode(false);
      return;
    }
    
    const playMode = sessionStorage.getItem('playMode') === 'true';
    setIsPlayMode(playMode);
    
    const miniData = sessionStorage.getItem('selectedMini');
    if (miniData) {
      try {
        const parsed = JSON.parse(miniData);
        if (!parsed.is_parent && parsed.mini_id) {
          setSelectedMini(parsed);
        }
      } catch (e) {
        console.error('Failed to parse selectedMini:', e);
      }
    }
  }, [user?.role]);

  // Mini seçildiğinde veritabanından viewerRole al
  useEffect(() => {
    const fetchViewerRole = async () => {
      if (!user) return;
      
      const playMode = sessionStorage.getItem('playMode') === 'true';
      if (playMode && selectedMini) {
        setViewerRole('child');
        return;
      }
      
      const miniId = selectedMini?.mini_id || user.profile?.mini_id;
      
      if (miniId) {
        try {
          setViewerRoleLoading(true);
          const response = await axios.get(
            `https://mini-talks.org/minitalks-api/mini/get-viewer-role.php?mini_id=${miniId}&user_id=${user.user_id}`
          );
          
          if (response.data.success) {
            setViewerRole(response.data.viewer_role);
          } else {
            setViewerRole(getFallbackRole());
          }
        } catch (error) {
          console.error('Failed to fetch viewer role:', error);
          setViewerRole(getFallbackRole());
        } finally {
          setViewerRoleLoading(false);
        }
      } else {
        setViewerRole(getFallbackRole());
      }
    };

    const getFallbackRole = () => {
      if (user.role === 'child' || user.role === 'mini') return 'child';
      if (user.role === 'expert') return 'expert';
      return 'parent';
    };

    fetchViewerRole();
  }, [selectedMini, user]);

  if (!user) {
    navigate('/login');
    return null;
  }

  // Mini data
  const miniData = useMemo(() => {
    if (user.role === 'child' || user.role === 'mini') {
      return {
        mini_id: user.profile?.mini_id || user.mini_id,
        mini_name: user.profile?.mini_name,
        tagline: user.profile?.tagline
      };
    }
    return selectedMini;
  }, [user, selectedMini]);

  // Tab yapılandırması
  const tabs = useMemo(() => {
    if (selectedMini && (user.role === 'parent' || user.role === 'expert')) {
      if (isPlayMode) {
        return [
          { id: 'profile', label: 'MINI PROFILE' },
          { id: 'journey', label: 'MINI JOURNEY' }
        ];
      }
      return [
        { id: 'profile', label: 'MINI PROFILE' },
        { id: 'journey', label: 'MINI JOURNEY' },
        { id: 'myminis', label: 'MY MINI(S)' }
      ];
    }

    switch (user.role) {
      case 'parent':
        return [
          { id: 'profile', label: 'PARENT PROFILE' },
          { id: 'myminis', label: 'MY MINI(S)' }
        ];
      case 'builder':
        return [
          { id: 'profile', label: 'BUILDER PROFILE' },
          { id: 'hub', label: 'BUILDER HUB' }
        ];
      case 'expert':
        return [
          { id: 'profile', label: 'EXPERT PROFILE' },
          { id: 'myminis', label: 'MY MINI(S)' }
        ];
      case 'child':
      case 'mini':
        return [
          { id: 'profile', label: 'MINI PROFILE' },
          { id: 'journey', label: 'MINI JOURNEY' }
        ];
      default:
        return [{ id: 'profile', label: 'PROFILE' }];
    }
  }, [user.role, selectedMini, isPlayMode]);

  // My Minis'e dönme helper
  const handleGoToMyMinis = () => {
    sessionStorage.removeItem('selectedMini');
    sessionStorage.removeItem('playMode');
    setSelectedMini(null);
    setIsPlayMode(false);
    setViewerRole(null);
    setActiveTab('myminis');
    setMyMinisKey(prev => prev + 1);
  };

  // Tab değişikliği
  const handleTabClick = (tabId) => {
    if (tabId === 'myminis') {
      handleGoToMyMinis();
      return;
    }
    setActiveTab(tabId);
  };

  // MiniManage (journey tab) için özel render kontrolü
  const isMiniJourney = activeTab === 'journey' && (selectedMini || user.role === 'child' || user.role === 'mini');

  // Content render
  const renderContent = () => {
    if (viewerRoleLoading) {
      return (
        <div 
          style={{
            display: 'flex',
            WebkitDisplay: '-webkit-flex',
            WebkitBoxAlign: 'center',
            WebkitAlignItems: 'center',
            alignItems: 'center',
            WebkitBoxPack: 'center',
            WebkitJustifyContent: 'center',
            justifyContent: 'center',
            height: '100%'
          }}
        >
          <div style={{ fontSize: 'clamp(20px, 2vw, 28px)' }}>Loading...</div>
        </div>
      );
    }

    const isMiniDashboard = selectedMini || user.role === 'child' || user.role === 'mini';
    
    if (isMiniDashboard) {
      if (activeTab === 'profile') {
        return <MiniProfile user={user} mini={miniData} onUserUpdate={handleUserUpdate} />;
      } else if (activeTab === 'journey') {
        return <MiniManage mini={miniData} viewerRole={viewerRole || 'parent'} onClose={() => {}} />;
      } else if (activeTab === 'myminis') {
        if (user.role === 'parent') return <ParentMyMinis key={myMinisKey} user={user} />;
        if (user.role === 'expert') return <ExpertMyMinis key={myMinisKey} user={user} />;
      }
    } else {
      switch (user.role) {
        case 'parent':
          if (activeTab === 'profile') return <ParentProfile user={user} onUserUpdate={handleUserUpdate} />;
          if (activeTab === 'myminis') return <ParentMyMinis key={myMinisKey} user={user} />;
          break;
        case 'builder':
          if (activeTab === 'profile') return <BuilderProfile user={user} />;
          if (activeTab === 'hub') return <BuilderHub user={user} />;
          break;
        case 'expert':
          if (activeTab === 'profile') return <ExpertProfile user={user} />;
          if (activeTab === 'myminis') return <ExpertMyMinis key={myMinisKey} user={user} />;
          break;
      }
    }
    
    return <div className="text-center py-20">Content not found</div>;
  };

  const montserratFont = { fontFamily: "'Montserrat', sans-serif" };

  return (
    <div 
      style={{
        ...montserratFont,
        height: '100vh',
        height: 'calc(var(--vh, 1vh) * 100)', // iOS Safari fix
        backgroundColor: '#f9fafb',
        display: 'flex',
        WebkitDisplay: '-webkit-flex',
        WebkitBoxOrient: 'vertical',
        WebkitBoxDirection: 'normal',
        WebkitFlexDirection: 'column',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header - Ortak Component + Tabs */}
      <Header 
        showTabs={true}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabClick}
      />

      {/* Content Area - MiniJourney için özel handling */}
      <div 
        style={{ 
          WebkitBoxFlex: 1,
          WebkitFlex: '1 1 0%',
          flex: '1 1 0%',
          overflow: 'hidden',
          display: 'flex',
          WebkitDisplay: '-webkit-flex',
          WebkitBoxOrient: 'vertical',
          WebkitBoxDirection: 'normal',
          WebkitFlexDirection: 'column',
          flexDirection: 'column',
          minHeight: 0,
          WebkitMinHeight: 0
        }}
      >
        <div 
          style={{ 
            maxWidth: '100%',
            margin: '0 auto',
            width: '100%',
            padding: isSmallScreen
              ? 'calc(4px + env(safe-area-inset-top)) calc(4px + env(safe-area-inset-right)) calc(4px + env(safe-area-inset-bottom)) calc(4px + env(safe-area-inset-left))'
              : (isMiniJourney 
                  ? 'clamp(8px, 1.2vw, 16px) clamp(12px, 1.5vw, 20px)' 
                  : 'clamp(12px, 2vw, 32px) clamp(12px, 2vw, 24px)'),
            boxSizing: 'border-box',
            WebkitBoxFlex: 1,
            WebkitFlex: '1 1 0%',
            flex: '1 1 0%',
            minHeight: 0,
            WebkitMinHeight: 0,
            display: 'flex',
            WebkitDisplay: '-webkit-flex',
            WebkitBoxOrient: 'vertical',
            WebkitBoxDirection: 'normal',
            WebkitFlexDirection: 'column',
            flexDirection: 'column',
            overflow: isMiniJourney ? 'hidden' : 'auto',
            WebkitOverflowScrolling: 'touch' // Safari smooth scroll
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;