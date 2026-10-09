// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

// Components
import ParentProfile from '../components/dashboard/ParentProfile';
import ParentMyMinis from '../components/dashboard/ParentMyMinis';
import BuilderProfile from '../components/dashboard/BuilderProfile';
import ExpertProfile from '../components/dashboard/ExpertProfile';
import ExpertMyMinis from '../components/dashboard/ExpertMyMinis';
import MiniProfile from '../components/dashboard/MiniProfile';
import MiniManage from '../components/dashboard/MiniManage';

// Assets
import logoImg from '../assets/logo.png';
import mainMenuBtn from '../assets/main-menu-btn.png';
import mainMenuBtnHover from '../assets/main-menu-btn-hover.png';
import profileIcon from '../assets/profile-icon.png';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [mainMenuHover, setMainMenuHover] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedMini, setSelectedMini] = useState(null);
  
  // API'den gelen viewerRole
  const [viewerRole, setViewerRole] = useState(null);
  const [viewerRoleLoading, setViewerRoleLoading] = useState(false);

  // URL'den tab parametresini oku
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // selectedMini'yi sessionStorage'dan oku
  useEffect(() => {
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
  }, []);

  // Mini seçildiğinde veritabanından viewerRole al
  useEffect(() => {
    const fetchViewerRole = async () => {
      // Mini yoksa veya user yoksa, default role kullan
      if (!user) return;
      
      // Mini seçilmişse, API'den viewerRole al
      const miniId = selectedMini?.mini_id || user.profile?.mini_id;
      
      if (miniId) {
        try {
          setViewerRoleLoading(true);
          const response = await axios.get(
            `https://mini-talks.org/minitalks-api/mini/get-viewer-role.php?mini_id=${miniId}&user_id=${user.user_id}`
          );
          
          if (response.data.success) {
            setViewerRole(response.data.viewer_role);
            console.log('ViewerRole from API:', response.data.viewer_role, response.data.reason);
          } else {
            // API başarısız olursa user.role'den belirle
            setViewerRole(getFallbackRole());
          }
        } catch (error) {
          console.error('Failed to fetch viewer role:', error);
          setViewerRole(getFallbackRole());
        } finally {
          setViewerRoleLoading(false);
        }
      } else {
        // Mini yoksa user.role'den belirle
        setViewerRole(getFallbackRole());
      }
    };

    // Fallback role hesaplama
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

  // Mini data - child için user'dan, parent/expert için selectedMini'den
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
    // Parent veya Expert mini seçtiyse MINI dashboard
    if (selectedMini && (user.role === 'parent' || user.role === 'expert')) {
      return [
        { id: 'profile', label: 'MINI PROFILE' },
        { id: 'journey', label: 'MINI JOURNEY' }
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
  }, [user.role, selectedMini]);

  // Active component'i render et
  const renderContent = () => {
    // viewerRole henüz yüklenmediyse loading göster
    if (viewerRoleLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-2xl">Loading...</div>
        </div>
      );
    }

    const isMiniDashboard = selectedMini || user.role === 'child' || user.role === 'mini';
    
    if (isMiniDashboard) {
      // MINI Dashboard
      if (activeTab === 'profile') {
        return <MiniProfile user={user} mini={miniData} />;
      } else if (activeTab === 'journey') {
        // viewerRole API'den geldi - bunu MiniManage'e geçir
        return <MiniManage mini={miniData} viewerRole={viewerRole || 'parent'} onClose={() => {}} />;
      }
    } else {
      // Normal Dashboard
      switch (user.role) {
        case 'parent':
          if (activeTab === 'profile') return <ParentProfile user={user} />;
          if (activeTab === 'myminis') return <ParentMyMinis user={user} />;
          break;
        case 'builder':
          if (activeTab === 'profile') return <BuilderProfile user={user} />;
          if (activeTab === 'hub') return <div className="text-center py-20">Builder Hub - Coming Soon</div>;
          break;
        case 'expert':
          if (activeTab === 'profile') return <ExpertProfile user={user} />;
          if (activeTab === 'myminis') return <ExpertMyMinis user={user} />;
          break;
      }
    }
    
    return <div className="text-center py-20">Content not found</div>;
  };

  // Header'da gösterilecek role label
  const getRoleLabel = () => {
    if (user.role === 'parent' && selectedMini) return 'Mini';
    if (user.role === 'expert' && selectedMini) return 'Mini';
    switch (user.role) {
      case 'parent': return 'Parent';
      case 'builder': return 'Builder';
      case 'expert': return 'Expert';
      case 'child':
      case 'mini': return 'Mini';
      default: return user.role;
    }
  };

  // Header'da gösterilecek isim
  const getUserDisplayName = () => {
    if ((user.role === 'parent' || user.role === 'expert') && selectedMini) {
      return selectedMini.mini_name || 'Mini';
    }
    if (user.role === 'child' || user.role === 'mini') {
      return user.profile?.mini_name || 'Mini';
    }
    return user.profile?.full_name || user.profile?.username || user.email || 'User';
  };

  // Header dropdown menü öğeleri
  const getMenuItems = () => {
    if ((user.role === 'parent' || user.role === 'expert') && selectedMini) {
      return [
        { label: 'Mini Profile', action: () => { setShowProfileMenu(false); setActiveTab('profile'); } },
        { label: 'Mini Journey', action: () => { setShowProfileMenu(false); setActiveTab('journey'); } },
        { label: 'Switch Profile', action: handleSwitchProfile, isRed: true },
        { label: 'Sign Out', action: handleSignOut }
      ];
    }

    switch (user.role) {
      case 'parent':
        return [
          { label: 'Parent Profile', action: () => { setShowProfileMenu(false); setActiveTab('profile'); } },
          { label: 'My Mini(s)', action: () => { setShowProfileMenu(false); setActiveTab('myminis'); } },
          { label: 'Sign Out', action: handleSignOut }
        ];
      case 'builder':
        return [
          { label: 'Builder Profile', action: () => { setShowProfileMenu(false); setActiveTab('profile'); } },
          { label: 'Builder Hub', action: () => { setShowProfileMenu(false); setActiveTab('hub'); } },
          { label: 'Sign Out', action: handleSignOut }
        ];
      case 'expert':
        return [
          { label: 'Expert Profile', action: () => { setShowProfileMenu(false); setActiveTab('profile'); } },
          { label: 'My Mini(s)', action: () => { setShowProfileMenu(false); setActiveTab('myminis'); } },
          { label: 'Sign Out', action: handleSignOut }
        ];
      case 'child':
      case 'mini':
        return [
          { label: 'Mini Profile', action: () => { setShowProfileMenu(false); setActiveTab('profile'); } },
          { label: 'Mini Journey', action: () => { setShowProfileMenu(false); setActiveTab('journey'); } },
          { label: 'Sign Out', action: handleSignOut }
        ];
      default:
        return [
          { label: 'Profile', action: () => { setShowProfileMenu(false); setActiveTab('profile'); } },
          { label: 'Sign Out', action: handleSignOut }
        ];
    }
  };

  const handleSignOut = () => {
    setShowProfileMenu(false);
    sessionStorage.removeItem('selectedMini');
    logout();
    navigate('/');
  };

  const handleSwitchProfile = () => {
    setShowProfileMenu(false);
    sessionStorage.removeItem('selectedMini');
    setSelectedMini(null);
    setViewerRole(null);
    setActiveTab('profile');
    navigate('/mini-selection');
  };

  const menuItems = getMenuItems();
  const montserratFont = { fontFamily: "'Montserrat', sans-serif" };

  return (
    <div className="min-h-screen bg-gray-50" style={montserratFont}>
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            
            {/* Sol: Main Menu + Logo */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/')}
                onMouseEnter={() => setMainMenuHover(true)}
                onMouseLeave={() => setMainMenuHover(false)}
                className="transition-transform hover:scale-105"
              >
                <img 
                  src={mainMenuHover ? mainMenuBtnHover : mainMenuBtn}
                  alt="Main menu"
                  className="h-12"
                />
              </button>
              
              <img 
                src={logoImg}
                alt="Mini-Talks"
                className="h-14"
              />
            </div>

            {/* Orta: Tab Navigation */}
            <div className="flex gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-2 font-extrabold text-base transition-all ${
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

            {/* Sağ: User Dropdown */}
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex gap-1 cursor-pointer"
              >
                <div 
                  className="flex items-center gap-2 px-2 h-14 hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: '#0055bf',
                    borderRadius: '20px 0 0 20px',
                    minWidth: '160px'
                  }}
                >
                  <img 
                    src={profileIcon}
                    alt="Profile"
                    className="w-12 h-12 object-cover"
                  />
                  <span className="text-white font-black text-lg">
                    {getRoleLabel()}
                  </span>
                </div>
                
                <div 
                  className="flex items-center justify-center px-6 h-14 hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: '#0055bf',
                    borderRadius: '0 20px 20px 0',
                    minWidth: '160px'
                  }}
                >
                  <span className="text-white font-black text-lg">
                    {getUserDisplayName()}
                  </span>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-1.5 flex flex-col gap-1.5">
                  {menuItems.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={item.action}
                      className="flex items-center px-6 h-14 text-white font-extrabold text-lg hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: item.isRed ? '#E31E24' : '#0055bf',
                        borderRadius: '20px',
                        minWidth: '320px'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {renderContent()}
      </div>

      {/* Close dropdown when clicking outside */}
      {showProfileMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
