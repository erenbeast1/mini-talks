// src/components/dashboard/ParentMyMinis.jsx
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import axios from 'axios';

// ── Mobil carousel: içeriği ölçer, taşıyorsa ok + sayfa boncuğu gösterir; sığıyorsa ortalı + göstergesiz ──
const MobileCarousel = ({ children, count }) => {
  const scrollRef = useRef(null);
  const [overflow, setOverflow] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(0);

  const measure = () => {
    const el = scrollRef.current;
    if (!el) return;
    const ovf = el.scrollWidth - el.clientWidth > 4;
    setOverflow(ovf);
    if (ovf && el.clientWidth > 0) {
      setPageCount(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth)));
    } else {
      setPageCount(1);
    }
  };

  useLayoutEffect(() => {
    measure();
    const el = scrollRef.current;
    let ro;
    if (typeof ResizeObserver !== 'undefined' && el) {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    }
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 250);
    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
      clearTimeout(t);
    };
    // eslint-disable-next-line
  }, [count]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    if (!overflow || el.clientWidth <= 0) { setPage(0); return; }
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setPage(Math.max(0, Math.min(pageCount - 1, idx)));
  };

  const goTo = (p) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(pageCount - 1, p));
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <>
      <div className="pmm-carousel-wrap">
        <button type="button" className="pmm-arrow left" disabled={!overflow || page <= 0}
          onClick={() => goTo(page - 1)} aria-label="Previous">‹</button>
        <div ref={scrollRef} className={`pmm-carousel ${overflow ? 'many' : 'few'}`} onScroll={onScroll}>
          {children}
        </div>
        <button type="button" className="pmm-arrow right" disabled={!overflow || page >= pageCount - 1}
          onClick={() => goTo(page + 1)} aria-label="Next">›</button>
      </div>
      {overflow && pageCount > 1 && (
        <div className="pmm-dots">
          {Array.from({ length: pageCount }, (_, i) => (
            <div key={i} className={`pmm-dot ${i === page ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </>
  );
};


// AlertSystem Popups
import { SuccessPopup, ErrorAlertPopup, WarningPopup, InfoPopup } from '../popups/AlertSystem';

// Components
import MiniManage from './MiniManage';

// PNG Assets - Direkt assets klasöründen
import addMiniBtn from '../../assets/add_mini_btn.png';
import addMiniBtnHover from '../../assets/add_mini_btn_hover.png';
import manageBtn from '../../assets/manage_blue_btn.png';
import manageBtnHover from '../../assets/manage_blue_btn_hover.png';
import addExpertBtn from '../../assets/add_expert_btn.png';
import addExpertBtnHover from '../../assets/add_expert_btn_hover.png';
import deleteBtn from '../../assets/delete_btn.png';
import deleteBtnHover from '../../assets/delete_btn_hover.png';
import approveBtn from '../../assets/approve_btn.png';
import approveBtnHover from '../../assets/approve_btn_hover.png';
import rejectBtn from '../../assets/reject_btn.png';
import rejectBtnHover from '../../assets/reject_btn_hover.png';
import expertIcon from '../../assets/expert.png';
import loadingIcon from '../../assets/loading.png';
import companyIcon from '../../assets/company.png';
import profileIcon from '../../assets/profile-icon.png';
import ProfileAvatar from '../common/ProfileAvatar';
import okBtnRed from '../../assets/ok_btn_red.png';
import okBtnRedHover from '../../assets/ok_btn_red_hover.png';
import cancelBtnImg from '../../assets/cancel_btn.png';
import cancelBtnImgHover from '../../assets/cancel_btn_hover.png';
import disconnectBtn from '../../assets/Disconnect Btn.png';
import disconnectBtnHover from '../../assets/Disconnect Btn Hover.png';
import addMiniBlueBtnImg from '../../assets/Add Mini Blue Btn.png';
import addMiniBlueBtnHoverImg from '../../assets/Add Mini Blue Btn Hover.png';
import sendRequestBtnImg from '../../assets/Send Request Blue Btn.png';
import sendRequestBtnHoverImg from '../../assets/Send Request Blue Btn Hover.png';
import loadingGif from '../../assets/loading_animation_1.gif';

const ParentMyMinis = ({ user }) => {
  // ✅ Alert/Popup states
  const [popup, setPopup] = useState({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  const showPopup = (type, message, title = '') => {
    const titles = {
      success: title || 'Success!',
      error: title || 'Oops!',
      warning: title || 'Warning',
      info: title || 'Info'
    };
    setPopup({ show: true, type, title: titles[type], message });
  };

  const closePopup = () => {
    setPopup(prev => ({ ...prev, show: false }));
  };
  const [minis, setMinis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddMiniPopup, setShowAddMiniPopup] = useState(false);
  const [showAddExpertPopup, setShowAddExpertPopup] = useState(false);
  
  // Selected mini for manage view
  const [selectedMini, setSelectedMini] = useState(null);
  const [showMiniManage, setShowMiniManage] = useState(false);
  
  // Delete confirmation popup
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [miniToDelete, setMiniToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Expert delete popup
  const [showExpertDeletePopup, setShowExpertDeletePopup] = useState(false);
  const [expertToDelete, setExpertToDelete] = useState(null);
  const [expertDeleteLoading, setExpertDeleteLoading] = useState(false);
  
  // Popup button hover states
  const [okBtnHover, setOkBtnHover] = useState(false);
  const [cancelBtnHover, setCancelBtnHover] = useState(false);
  const [expertOkBtnHover, setExpertOkBtnHover] = useState(false);
  const [expertCancelBtnHover, setExpertCancelBtnHover] = useState(false);
  
  // Delete button hover states (ayrı, card hover'dan bağımsız)
  const [deleteHoverIndex, setDeleteHoverIndex] = useState(null);
  const [expertDeleteHoverIndex, setExpertDeleteHoverIndex] = useState(null);
  
  // Expert connection requests
  const [expertRequests, setExpertRequests] = useState({
    pending: [],
    approved: [],
    sent_requests: []
  });
  const [expertProcessingId, setExpertProcessingId] = useState(null);
  
  const [newMini, setNewMini] = useState({
    mini_name: '',
    age_range: '',
    email: '',
    password: ''
  });
  const [newExpert, setNewExpert] = useState({
    mini_id: '',
    expert_email: ''
  });
  
  // Button hover states
  const [addMiniHover, setAddMiniHover] = useState(false);
  const [addExpertHover, setAddExpertHover] = useState(false);
  
  // Approve/Reject hover states for pending minis
  const [approveHoverIndex, setApproveHoverIndex] = useState(null);
  const [rejectHoverIndex, setRejectHoverIndex] = useState(null);
  
  // Expert approve/reject hover states
  const [expertApproveHoverIndex, setExpertApproveHoverIndex] = useState(null);
  const [expertRejectHoverIndex, setExpertRejectHoverIndex] = useState(null);
  
  // Card hover state
  const [cardHoverIndex, setCardHoverIndex] = useState(null);
  
  // Add Mini popup button hover states
  const [addMiniCancelHover, setAddMiniCancelHover] = useState(false);
  const [addMiniSubmitHover, setAddMiniSubmitHover] = useState(false);
  const [addExpertCancelHover, setAddExpertCancelHover] = useState(false);
  const [addExpertSubmitHover, setAddExpertSubmitHover] = useState(false);

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
  const isSmallScreen = screenSize === 'mobile' || screenSize === 'tablet-small';

  // ── Mobil görünüm state'leri ──
  // mobileTab: 'minis' | 'expert' — liste sekmeleri
  // mobileAddView: null | 'mini' | 'expert' — Add işlemleri popup yerine TAM SAYFA
  const [mobileTab, setMobileTab] = useState('minis');
  const [mobileAddView, setMobileAddView] = useState(null);
  // Carousel — aktif kart indexi (boncuk göstergesi için), her tab için ayrı

  useEffect(() => {
    if (user && user.user_id) {
      fetchMinis();
      fetchExpertRequests();
    }
  }, [user]);

  const fetchMinis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/auth/get-my-minis.php?parent_id=${user.user_id}`
      );
      
      if (response.data.success) {
        setMinis(response.data.data.all_minis || []);
      } else {
        setError(response.data.message || 'Failed to fetch minis');
      }
    } catch (error) {
      console.error('Failed to fetch minis:', error);
      setError(error.response?.data?.message || error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpertRequests = async () => {
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/auth/get-expert-requests.php?parent_id=${user.user_id}`
      );
      
      if (response.data.success) {
        setExpertRequests({
          pending: response.data.data.pending || [],
          approved: response.data.data.approved || [],
          sent_requests: response.data.data.sent_requests || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch expert requests:', error);
    }
  };

  const handleAddMini = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/add-mini.php',
        {
          parent_id: user.user_id,
          mini_name: newMini.mini_name,
          age_range: newMini.age_range,
          email: newMini.email || null,
          password: newMini.password || null
        }
      );

      if (response.data.success) {
        setShowAddMiniPopup(false);
        setMobileAddView(null);
        setNewMini({ mini_name: '', age_range: '', email: '', password: '' });
        fetchMinis();
      }
    } catch (error) {
      console.error('Failed to add mini:', error);
      showPopup('error', error.response?.data?.message || 'Failed to add mini');
    }
  };

  const handleApprove = async (miniId, action) => {
    try {
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/approve-mini.php',
        {
          parent_id: user.user_id,
          mini_id: miniId,
          action: action
        }
      );

      if (response.data.success) {
        fetchMinis();
      }
    } catch (error) {
      console.error('Failed to approve/reject mini:', error);
      showPopup('error', error.response?.data?.message || 'Failed to process request');
    }
  };

  // Handle expert approval (Expert gönderdi, Parent onaylayacak)
  const handleExpertApproval = async (connectionId, action) => {
    try {
      setExpertProcessingId(connectionId);
      
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/approve-expert.php',
        {
          parent_id: user.user_id,
          connection_id: connectionId,
          action: action
        }
      );

      if (response.data.success) {
        fetchExpertRequests();
        showPopup('success', 
          action === 'approve' 
            ? 'Expert approved successfully!' 
            : 'Expert request rejected.',
          action === 'approve' ? 'Approved!' : 'Rejected'
        );
      }
    } catch (error) {
      console.error('Failed to approve/reject expert:', error);
      showPopup('error', error.response?.data?.message || 'Failed to process request');
    } finally {
      setExpertProcessingId(null);
    }
  };

  // Delete expert connection - Popup ile onay
  const handleDeleteExpertClick = (expert) => {
    setExpertToDelete(expert);
    setShowExpertDeletePopup(true);
  };

  const handleConfirmExpertDelete = async () => {
    if (!expertToDelete) return;

    try {
      setExpertDeleteLoading(true);
      
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/delete-expert-connection.php',
        {
          user_id: user.user_id,
          connection_id: expertToDelete.connection_id,
          role: 'parent'
        }
      );

      if (response.data.success) {
        setShowExpertDeletePopup(false);
        setExpertToDelete(null);
        fetchExpertRequests();
        showPopup('success', response.data.message, 'Disconnected');
      } else {
        showPopup('error', response.data.message || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Failed to delete expert connection:', error);
      showPopup('error', error.response?.data?.message || 'Failed to disconnect');
    } finally {
      setExpertDeleteLoading(false);
    }
  };

  const handleCancelExpertDelete = () => {
    setShowExpertDeletePopup(false);
    setExpertToDelete(null);
  };

  const handleAddExpert = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/add-expert.php',
        {
          parent_id: user.user_id,
          mini_id: newExpert.mini_id,
          expert_email: newExpert.expert_email
        }
      );

      if (response.data.success) {
        setShowAddExpertPopup(false);
        setMobileAddView(null);
        setNewExpert({ mini_id: '', expert_email: '' });
        fetchExpertRequests();
        showPopup('success', response.data.message || 'Expert connection request sent successfully!', 'Request Sent!');
      }
    } catch (error) {
      console.error('Failed to add expert:', error);
      showPopup('error', error.response?.data?.message || 'Failed to add expert');
    }
  };

  // Handle manage button click
  const handleManageClick = (mini) => {
    setSelectedMini(mini);
    setShowMiniManage(true);
  };

  // Close manage view
  const handleCloseMiniManage = () => {
    setShowMiniManage(false);
    setSelectedMini(null);
  };

  // View mini profile
  const handleViewMiniProfile = () => {
    console.log('View mini profile:', selectedMini);
  };

  // Delete mini functions
  const handleDeleteClick = (mini) => {
    setMiniToDelete(mini);
    setShowDeletePopup(true);
  };

  const handleConfirmDelete = async () => {
    if (!miniToDelete) return;
    
    try {
      setDeleteLoading(true);
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/delete-mini.php',
        {
          parent_id: user.user_id,
          mini_id: miniToDelete.mini_id
        }
      );

      if (response.data.success) {
        setShowDeletePopup(false);
        setMiniToDelete(null);
        fetchMinis();
        showPopup('success', 'Mini deleted successfully!');
      } else {
        showPopup('error', response.data.message || 'Failed to delete mini');
      }
    } catch (error) {
      console.error('Failed to delete mini:', error);
      showPopup('error', error.response?.data?.message || 'Failed to delete mini');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeletePopup(false);
    setMiniToDelete(null);
  };

  const pendingMinis = minis.filter(m => m.parent_approval_status === 'pending');
  const approvedMinis = minis.filter(m => m.parent_approval_status === 'approved');

  // If MiniManage is open, show it
  if (showMiniManage && selectedMini) {
    return (
      <MiniManage 
        mini={selectedMini}
        onClose={handleCloseMiniManage}
        onViewProfile={handleViewMiniProfile}
        viewerRole="parent"
      />
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: isSmallScreen ? '0' : '60vh', height: isSmallScreen ? '100%' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <img src={loadingGif} alt="Loading..." style={{ width: isSmallScreen ? '80px' : '128px', height: isSmallScreen ? '80px' : '128px' }} />
        <span style={{ fontSize: isSmallScreen ? '15px' : '20px', fontWeight: 700, color: '#4b5563' }}>Loading...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center bg-red-50 border-2 border-red-400 rounded-xl p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-xl font-bold text-red-700">{error}</div>
          <button
            onClick={fetchMinis}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════ MOBİL ════════════════════════
  if (isSmallScreen) {
    // ── Ortak mobil parçalar ──
    const mFont = { fontFamily: "'Montserrat', sans-serif" };
    const mAlerts = (
      <>
        <SuccessPopup show={popup.show && popup.type === 'success'} onClose={closePopup} title={popup.title} message={popup.message} />
        <ErrorAlertPopup show={popup.show && popup.type === 'error'} onClose={closePopup} title={popup.title} message={popup.message} />
        <WarningPopup show={popup.show && popup.type === 'warning'} onClose={closePopup} title={popup.title} message={popup.message} />
        <InfoPopup show={popup.show && popup.type === 'info'} onClose={closePopup} title={popup.title} message={popup.message} />
      </>
    );
    const mRoot = { ...mFont, backgroundColor: '#fff', padding: '6px 12px 8px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' };

    // ── Carousel: yatay scroll-snap + sayfa-bazlı boncuk + ok butonları ──
    const carouselCss = `
      .pmm-carousel-wrap { position: relative; display: -webkit-box; display: -webkit-flex; display: flex; -webkit-box-align: center; -webkit-align-items: center; align-items: center; flex: 1 1 0%; min-height: 0; }
      .pmm-carousel {
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-flex-wrap: nowrap; flex-wrap: nowrap;
        gap: 14px;
        overflow-x: auto; overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        padding: 4px 0 6px;
        -webkit-box-align: center; -webkit-align-items: center; align-items: center;
        height: 100%; width: 100%;
      }
      .pmm-carousel::-webkit-scrollbar { display: none; }
      .pmm-carousel { -ms-overflow-style: none; scrollbar-width: none; }
      .pmm-carousel.few { -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center; }
      .pmm-carousel.many { -webkit-box-pack: start; -webkit-justify-content: flex-start; justify-content: flex-start; }
      .pmm-card-snap { scroll-snap-align: start; }
      .pmm-arrow {
        position: absolute; top: 50%; -webkit-transform: translateY(-50%); transform: translateY(-50%);
        z-index: 5; width: 30px; height: 30px; border-radius: 50%;
        background: #E31E24; color: #FFF; border: none; cursor: pointer;
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-box-align: center; -webkit-align-items: center; align-items: center;
        -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center;
        font-size: 16px; font-weight: 900; line-height: 1;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      }
      .pmm-arrow.left { left: -4px; }
      .pmm-arrow.right { right: -4px; }
      .pmm-arrow:disabled { opacity: 0; pointer-events: none; }
      .pmm-dots {
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center;
        -webkit-box-align: center; -webkit-align-items: center; align-items: center;
        gap: 6px; padding: 4px 0 2px; flex-shrink: 0;
      }
      .pmm-dot { width: 7px; height: 7px; border-radius: 50%; background: #D0D0D0; -webkit-transition: all 0.2s; transition: all 0.2s; }
      .pmm-dot.active { background: #E31E24; width: 18px; border-radius: 4px; }
    `;
    const mLabel = { ...mFont, fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap' };
    const mInput = { ...mFont, width: '200px', padding: '7px 11px', borderRadius: '10px', border: '2px solid #000', fontSize: '12px', fontWeight: 500, outline: 'none', boxSizing: 'border-box' };
    const mRow = { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' };

    // ── Add sayfaları için register (regm-) stili form CSS'i ──
    const pmmAddStyles = `
      .pmm-form { width: 100%; max-width: 460px; margin: 0 auto; font-family: 'Montserrat', sans-serif; }
      .pmm-form *, .pmm-form input, .pmm-form button, .pmm-form label, .pmm-form select { font-family: 'Montserrat', sans-serif; box-sizing: border-box; }
      .pmm-row { display: -webkit-box; display: -webkit-flex; display: flex; gap: 10px; margin-bottom: 8px; }
      .pmm-col { -webkit-box-flex: 1; -webkit-flex: 1 1 0%; flex: 1 1 0%; min-width: 0; }
      .pmm-label { display: block; font-size: 11px; font-weight: 700; color: #000; margin-bottom: 2px; }
      .pmm-input {
        width: 100%; padding: 6px 10px; border: 2px solid #000;
        border-radius: 8px; font-size: 12px; outline: none; background: #FFF;
      }
      .pmm-input:focus {
        border-color: #0055BF;
        -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
        box-shadow: 0 0 0 3px rgba(0,85,191,0.25);
      }
      .pmm-input::-webkit-input-placeholder { color: #999; }
      .pmm-input::placeholder { color: #999; }
      .pmm-age-wrap { display: -webkit-box; display: -webkit-flex; display: flex; -webkit-flex-wrap: wrap; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
      .pmm-age-btn {
        padding: 5px 9px; border: 2px solid #000; border-radius: 7px;
        background: #FFF; font-weight: 700; font-size: 11px; cursor: pointer;
      }
      .pmm-age-btn.selected { background: #0055BF; border-color: #0055BF; color: #FFF; }
      .pmm-info { font-size: 10px; color: #555; line-height: 1.4; margin: 0 0 4px; font-weight: 600; }
    `;

    // ════ ADD MINI — TAM SAYFA (popup yerine, dashboard sayfa mantığı) ════
    if (mobileAddView === 'mini') {
      return (
        <div style={mRoot}>
          {mAlerts}
          <style>{pmmAddStyles}</style>
          <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: '6px' }}>
            <h1 style={{ ...mFont, fontSize: '19px', fontWeight: 900, margin: 0, color: '#E31E24' }}>Add a Mini</h1>
            <p style={{ color: '#666', fontSize: '10px', margin: '2px 0 0' }}>Set up a child profile to start playing together.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: '1 1 0%', minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <div style={{ width: '74px', height: '74px', borderRadius: '50%', backgroundColor: '#FFCC00', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={profileIcon} alt="New mini" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
              </div>
            </div>
            <form onSubmit={handleAddMini} className="pmm-form">
              <div className="pmm-row">
                <div className="pmm-col">
                  <label className="pmm-label">Mini Name:</label>
                  <input type="text" value={newMini.mini_name}
                    onChange={(e) => setNewMini({ ...newMini, mini_name: e.target.value })}
                    placeholder="Enter a nickname" required className="pmm-input" />
                </div>
                <div className="pmm-col">
                  <label className="pmm-label">Select your child's age range:</label>
                  <div className="pmm-age-wrap">
                    {['4-6', '7-9', '10-12', '13-17'].map(age => (
                      <button key={age} type="button"
                        onClick={() => setNewMini({ ...newMini, age_range: age })}
                        className={`pmm-age-btn ${newMini.age_range === age ? 'selected' : ''}`}>
                        {age}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pmm-row">
                <div className="pmm-col">
                  <label className="pmm-label">Email (optional):</label>
                  <input type="email" value={newMini.email}
                    onChange={(e) => setNewMini({ ...newMini, email: e.target.value })}
                    placeholder="child@email.com" className="pmm-input" />
                </div>
                {newMini.email && (
                  <div className="pmm-col">
                    <label className="pmm-label">Password:</label>
                    <input type="password" value={newMini.password}
                      onChange={(e) => setNewMini({ ...newMini, password: e.target.value })}
                      placeholder="Create a password" required={!!newMini.email} minLength={6} className="pmm-input" />
                  </div>
                )}
              </div>
              <p className="pmm-info">
                Create an account for your child to login independently.{newMini.email ? ' Minimum 6 characters password required.' : ''}
              </p>
            </form>
          </div>

          {/* Alt — Cancel + Add Mini */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexShrink: 0, paddingTop: '5px' }}>
            <button type="button"
              onClick={() => { setMobileAddView(null); setNewMini({ mini_name: '', age_range: '', email: '', password: '' }); }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src={cancelBtnImg} alt="Cancel" style={{ height: '38px', width: 'auto' }} />
            </button>
            <button type="button" onClick={handleAddMini}
              disabled={!newMini.mini_name || !newMini.age_range}
              style={{ background: 'none', border: 'none', padding: 0,
                cursor: (!newMini.mini_name || !newMini.age_range) ? 'not-allowed' : 'pointer',
                opacity: (!newMini.mini_name || !newMini.age_range) ? 0.5 : 1 }}>
              <img src={addMiniBlueBtnImg} alt="Add Mini" style={{ height: '38px', width: 'auto' }} />
            </button>
          </div>
        </div>
      );
    }

    // ════ ADD EXPERT — TAM SAYFA (popup yerine) ════
    if (mobileAddView === 'expert') {
      return (
        <div style={mRoot}>
          {mAlerts}
          <style>{pmmAddStyles}</style>
          <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: '6px' }}>
            <h1 style={{ ...mFont, fontSize: '19px', fontWeight: 900, margin: 0, color: '#E31E24' }}>Connect Expert</h1>
            <p style={{ color: '#666', fontSize: '10px', margin: '2px 0 0' }}>Add an expert to help guide your mini's progress.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: '1 1 0%', minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <div style={{ width: '74px', height: '74px', borderRadius: '50%', backgroundColor: '#FFCC00', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={expertIcon} alt="Expert" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
              </div>
            </div>
            <form onSubmit={handleAddExpert} className="pmm-form">
              <div className="pmm-row">
                <div className="pmm-col">
                  <label className="pmm-label">Select Mini:</label>
                  <select value={newExpert.mini_id}
                    onChange={(e) => setNewExpert({ ...newExpert, mini_id: e.target.value })}
                    required className="pmm-input"
                    style={{ backgroundColor: '#FFFFFF', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Crect width='36' height='36' rx='6' fill='%23237841'/%3E%3Cpath d='M11 14l7 7 7-7' stroke='white' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 5px center', backgroundSize: '22px 22px', paddingRight: '34px' }}>
                    <option value="">Choose a Mini...</option>
                    {approvedMinis.map(mini => (
                      <option key={mini.mini_id} value={mini.mini_id}>
                        {mini.mini_name} ({mini.age_range})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pmm-col">
                  <label className="pmm-label">Expert's Email:</label>
                  <input type="email" value={newExpert.expert_email}
                    onChange={(e) => setNewExpert({ ...newExpert, expert_email: e.target.value })}
                    placeholder="expert@email.com" required className="pmm-input" />
                </div>
              </div>
              <p className="pmm-info">The expert must have an account with this email.</p>
            </form>
          </div>

          {/* Alt — Cancel + Send Request */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexShrink: 0, paddingTop: '5px' }}>
            <button type="button"
              onClick={() => { setMobileAddView(null); setNewExpert({ mini_id: '', expert_email: '' }); }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src={cancelBtnImg} alt="Cancel" style={{ height: '38px', width: 'auto' }} />
            </button>
            <button type="button" onClick={handleAddExpert}
              disabled={!newExpert.mini_id || !newExpert.expert_email}
              style={{ background: 'none', border: 'none', padding: 0,
                cursor: (!newExpert.mini_id || !newExpert.expert_email) ? 'not-allowed' : 'pointer',
                opacity: (!newExpert.mini_id || !newExpert.expert_email) ? 0.5 : 1 }}>
              <img src={sendRequestBtnImg} alt="Send Request" style={{ height: '38px', width: 'auto' }} />
            </button>
          </div>
        </div>
      );
    }

    // ════ LİSTE — Tab'lı görünüm ════
    const tabBtn = (active) => ({
      ...mFont,
      padding: '6px 16px',
      borderRadius: '10px',
      border: '2px solid #E31E24',
      backgroundColor: active ? '#E31E24' : '#FFFFFF',
      color: active ? '#FFFFFF' : '#E31E24',
      fontWeight: 800,
      fontSize: '12px',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    });

    // ── Kart tasarımı: görseldeki gibi düzen (avatar sol + isim/age + altta çizgi + ortada buton) ──
    // Renk webdeki gibi: BEYAZ arka plan + SİYAH çerçeve (web'in hover öncesi normal hali). Pending/istek: kırmızı çerçeve.
    const miniCardBlue = { backgroundColor: '#FFFFFF', border: '3px solid #000000', borderRadius: '16px', padding: '12px 14px', width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
    const miniCardWhite = { ...miniCardBlue };
    const pendingCard = { backgroundColor: '#FFFFFF', border: '3px solid #E31E24', borderRadius: '16px', padding: '12px 14px', width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
    const cardHead = { display: 'flex', alignItems: 'center', gap: '10px' };
    const cardAvatar = () => ({ width: '48px', height: '48px', minWidth: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #000', backgroundColor: '#FFCC00' });
    const cardName = () => ({ ...mFont, fontWeight: 900, fontSize: '15px', lineHeight: 1.15, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
    const cardSub = () => ({ ...mFont, fontWeight: 600, fontSize: '11px', color: '#666' });
    const cardDividerTop = () => ({ borderTop: '1.5px solid #D8D8D8', paddingTop: '8px', display: 'flex', justifyContent: 'center', gap: '8px' });

    return (
      <div style={mRoot}>
        {mAlerts}
        <style>{carouselCss}</style>

        {/* Başlık */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <h1 style={{ ...mFont, fontSize: '20px', fontWeight: 900, margin: 0, color: '#E31E24' }}>MY MINI(S)</h1>
        </div>

        {/* Tab satırı + Add butonu */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '6px 0 4px', flexShrink: 0 }}>
          <button type="button" style={tabBtn(mobileTab === 'minis')} onClick={() => setMobileTab('minis')}>
            Connected Mini(s):
          </button>
          <button type="button" style={tabBtn(mobileTab === 'expert')} onClick={() => setMobileTab('expert')}>
            Connected Expert:
          </button>
          {mobileTab === 'minis' ? (
            <button type="button" onClick={() => setMobileAddView('mini')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src={addMiniBtn} alt="Add Mini" style={{ height: '34px', width: 'auto' }} />
            </button>
          ) : (
            <button type="button" onClick={() => setMobileAddView('expert')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src={addExpertBtn} alt="Add Expert" style={{ height: '34px', width: 'auto' }} />
            </button>
          )}
        </div>

        {/* Açıklama */}
        <p style={{ ...mFont, textAlign: 'center', fontSize: '10px', color: '#555', fontWeight: 600, margin: '0 0 6px', flexShrink: 0 }}>
          {mobileTab === 'minis'
            ? 'Manage your Mini(s) and track their Mini-Talks journey.'
            : 'Experts connected to your Mini can help guide their progress, always with your permission and control.'}
        </p>

        {/* İçerik — kartlar */}
        <div style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {mobileTab === 'minis' ? (
            <>
              {/* Onaylı miniler */}
              {approvedMinis.length === 0 && pendingMinis.length === 0 ? (
                <div style={{ ...mFont, textAlign: 'center', padding: '18px 0' }}>
                  <img src={profileIcon} alt="No minis" style={{ width: '52px', height: '52px', opacity: 0.3, marginBottom: '6px' }} />
                  <div style={{ fontWeight: 900, fontSize: '14px', color: '#444' }}>No Minis Yet</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Click "Add Mini" to get started!</div>
                </div>
              ) : (
                <MobileCarousel count={approvedMinis.length + pendingMinis.length}>
                  {approvedMinis.map((mini) => (
                    <div key={mini.mini_id} className="pmm-card-snap" style={miniCardBlue}>
                      <div style={cardHead}>
                        <div style={cardAvatar()}>
                          <ProfileAvatar role="mini" id={mini.mini_id} size={30} alt={mini.mini_name} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={cardName()}>{mini.mini_name}</div>
                          <div style={cardSub()}>
                            Age Range: {mini.age_range}
                            {mini.current_streak > 0 && (
                              <span style={{ marginLeft: '5px', color: '#237841' }}>🔥 {mini.current_streak}d</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={cardDividerTop()}>
                        <button onClick={() => handleManageClick(mini)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                          <img src={manageBtn} alt="Manage" style={{ height: '32px', width: 'auto' }} />
                        </button>
                        <button onClick={() => handleDeleteClick(mini)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                          <img src={deleteBtn} alt="Delete" style={{ height: '32px', width: 'auto' }} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Pending miniler */}
                  {pendingMinis.map((mini) => (
                    <div key={mini.mini_id} className="pmm-card-snap" style={pendingCard}>
                      <div style={cardHead}>
                        <div style={cardAvatar()}>
                          <ProfileAvatar role="mini" id={mini.mini_id} size={30} alt={mini.mini_name} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={cardName()}>{mini.mini_name}</div>
                          <div style={cardSub()}>Age Range: {mini.age_range}</div>
                          <div style={{ ...cardSub(), color: '#E31E24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <img src={loadingIcon} alt="" style={{ height: '10px', width: '10px', objectFit: 'contain' }} /> Waiting for approval
                          </div>
                        </div>
                      </div>
                      <div style={cardDividerTop()}>
                        <button onClick={() => handleApprove(mini.mini_id, 'approve')}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                          <img src={approveBtn} alt="Approve" style={{ height: '32px', width: 'auto' }} />
                        </button>
                        <button onClick={() => handleApprove(mini.mini_id, 'reject')}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                          <img src={rejectBtn} alt="Reject" style={{ height: '32px', width: 'auto' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </MobileCarousel>
              )}
            </>
          ) : (
            <>
              {/* Expert sekmesi */}
              {expertRequests.approved.length === 0 && expertRequests.pending.length === 0 && (!expertRequests.sent_requests || expertRequests.sent_requests.length === 0) ? (
                <div style={{ ...mFont, textAlign: 'center', padding: '18px 0' }}>
                  <img src={expertIcon} alt="No expert" style={{ width: '52px', height: '52px', opacity: 0.3, marginBottom: '6px' }} />
                  <div style={{ fontWeight: 900, fontSize: '14px', color: '#444' }}>No Expert Connected</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Add an expert to get started</div>
                </div>
              ) : (
                <MobileCarousel count={expertRequests.approved.length + expertRequests.pending.length + (expertRequests.sent_requests ? expertRequests.sent_requests.length : 0)}>
                  {/* Bağlı expertler — MAVİ DOLU */}
                  {expertRequests.approved.map((expert) => (
                    <div key={expert.connection_id} className="pmm-card-snap" style={miniCardBlue}>
                      <div style={cardHead}>
                        <div style={cardAvatar()}>
                          <img src={expertIcon} alt="Expert" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={cardName()}>{expert.expert_name}</div>
                          {expert.expert_organization && (
                            <div style={cardSub()}>{expert.expert_organization}</div>
                          )}
                          <div style={{ ...cardSub(), color: '#237841' }}>✓ {expert.mini_name}</div>
                        </div>
                      </div>
                      <div style={cardDividerTop()}>
                        <button onClick={() => handleDeleteExpertClick(expert)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                          <img src={disconnectBtn} alt="Disconnect" style={{ height: '32px', width: 'auto' }} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Expert bağlantı istekleri (Expert gönderdi, Parent onaylayacak) — KIRMIZI ÇERÇEVE */}
                  {expertRequests.pending.map((request) => {
                    const isProcessing = expertProcessingId === request.connection_id;
                    return (
                      <div key={request.connection_id} className="pmm-card-snap" style={pendingCard}>
                        <div style={cardHead}>
                          <div style={cardAvatar()}>
                            <img src={expertIcon} alt="Expert" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={cardName()}>{request.expert_name}</div>
                            {request.expert_organization && <div style={cardSub()}>{request.expert_organization}</div>}
                            {request.expert_profession && <div style={cardSub()}>{request.expert_profession}</div>}
                          </div>
                        </div>
                        {/* Wants to connect with — beyaz iç kutu */}
                        <div style={{ border: '1.5px solid #E31E24', borderRadius: '9px', padding: '6px 8px' }}>
                          <div style={{ ...cardSub(), marginBottom: '3px' }}>Wants to connect with:</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ ...cardAvatar(), width: '28px', height: '28px', minWidth: '28px', border: '2px solid #000' }}>
                              <ProfileAvatar role="mini" id={request.mini_id} size={16} alt={request.mini_name} />
                            </div>
                            <div>
                              <div style={{ ...mFont, fontWeight: 900, fontSize: '12px' }}>{request.mini_name}</div>
                              <div style={cardSub()}>Age: {request.age_range}</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ ...cardSub(), color: '#E31E24', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          <img src={loadingIcon} alt="" style={{ height: '10px', width: '10px', objectFit: 'contain' }} /> Requested {new Date(request.created_at).toLocaleDateString()}
                        </div>
                        <div style={cardDividerTop()}>
                          <button onClick={() => handleExpertApproval(request.connection_id, 'approve')} disabled={isProcessing}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1 }}>
                            <img src={approveBtn} alt="Approve" style={{ height: '32px', width: 'auto' }} />
                          </button>
                          <button onClick={() => handleExpertApproval(request.connection_id, 'reject')} disabled={isProcessing}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1 }}>
                            <img src={rejectBtn} alt="Reject" style={{ height: '32px', width: 'auto' }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Gönderilen istekler (Parent gönderdi, Expert onaylayacak) — KIRMIZI ÇERÇEVE */}
                  {expertRequests.sent_requests && expertRequests.sent_requests.map((request) => (
                    <div key={request.connection_id} className="pmm-card-snap" style={pendingCard}>
                      <div style={cardHead}>
                        <div style={cardAvatar()}>
                          <img src={expertIcon} alt="Expert" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={cardName()}>{request.expert_name}</div>
                          <div style={cardSub()}>For: {request.mini_name}</div>
                          <div style={{ ...cardSub(), color: '#E31E24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <img src={loadingIcon} alt="" style={{ height: '10px', width: '10px', objectFit: 'contain' }} /> Waiting for expert approval...
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </MobileCarousel>
              )}
            </>
          )}
        </div>

        {/* Onay popup'ları (delete/disconnect) — mobilde de popup kalır, kompakt */}
        {showDeletePopup && miniToDelete && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ margin: '0 16px', maxWidth: '380px', width: '100%' }}>
              <div style={{ backgroundColor: '#E31E24', borderRadius: '16px', overflow: 'hidden', boxShadow: '4px 4px 50px 10px rgba(0,0,0,0.5)' }}>
                <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <h2 style={{ ...mFont, color: '#fff', fontSize: '18px', fontWeight: 900, margin: 0 }}>Delete Mini?</h2>
                </div>
                <div style={{ backgroundColor: '#fff', borderRadius: '13px', margin: '0 5px 5px', padding: '10px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '64px', height: '64px', minWidth: '64px', borderRadius: '50%', backgroundColor: '#FFCC00', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ProfileAvatar role="mini" id={miniToDelete?.mini_id} size={36} alt="Mini" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <p style={{ ...mFont, color: '#000', fontSize: '12px', fontWeight: 500, textAlign: 'center', marginBottom: '4px', lineHeight: 1.4 }}>
                      Are you sure you want to delete<br />
                      <span style={{ color: '#E31E24', fontWeight: 900, fontSize: '13px' }}>"{miniToDelete.mini_name}"?</span>
                    </p>
                    <p style={{ ...mFont, color: '#B91C1C', fontSize: '10px', fontWeight: 600, textAlign: 'center', marginBottom: '8px' }}>
                      ⚠️ This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={handleCancelDelete} disabled={deleteLoading}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: deleteLoading ? 0.5 : 1 }}>
                        <img src={cancelBtnImg} alt="Cancel" style={{ height: '34px', width: 'auto' }} />
                      </button>
                      <button onClick={handleConfirmDelete} disabled={deleteLoading}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: deleteLoading ? 0.5 : 1 }}>
                        <img src={okBtnRed} alt="OK" style={{ height: '34px', width: 'auto' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showExpertDeletePopup && expertToDelete && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ margin: '0 16px', maxWidth: '380px', width: '100%' }}>
              <div style={{ backgroundColor: '#E31E24', borderRadius: '16px', overflow: 'hidden', boxShadow: '4px 4px 50px 10px rgba(0,0,0,0.5)' }}>
                <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <h2 style={{ ...mFont, color: '#fff', fontSize: '18px', fontWeight: 900, margin: 0 }}>Disconnect Expert?</h2>
                </div>
                <div style={{ backgroundColor: '#fff', borderRadius: '13px', margin: '0 5px 5px', padding: '10px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '64px', height: '64px', minWidth: '64px', borderRadius: '50%', backgroundColor: '#FFCC00', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={expertIcon} alt="Expert" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <p style={{ ...mFont, color: '#000', fontSize: '12px', fontWeight: 500, textAlign: 'center', marginBottom: '4px', lineHeight: 1.4 }}>
                      Are you sure you want to disconnect<br />
                      <span style={{ color: '#E31E24', fontWeight: 900, fontSize: '13px' }}>"{expertToDelete.expert_name}"</span><br />
                      <span style={{ color: '#666', fontSize: '11px' }}>from "{expertToDelete.mini_name}"?</span>
                    </p>
                    <p style={{ ...mFont, color: '#B91C1C', fontSize: '10px', fontWeight: 600, textAlign: 'center', marginBottom: '8px' }}>
                      ⚠️ This will remove expert's access.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={handleCancelExpertDelete} disabled={expertDeleteLoading}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: expertDeleteLoading ? 0.5 : 1 }}>
                        <img src={cancelBtnImg} alt="Cancel" style={{ height: '34px', width: 'auto' }} />
                      </button>
                      <button onClick={handleConfirmExpertDelete} disabled={expertDeleteLoading}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: expertDeleteLoading ? 0.5 : 1 }}>
                        <img src={okBtnRed} alt="OK" style={{ height: '34px', width: 'auto' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════ DESKTOP (orijinal) ════════════════════════
  return (
    <>
    <div className="space-y-10 pb-12">
      {/* ✅ Alert Popups */}
      <SuccessPopup 
        show={popup.show && popup.type === 'success'} 
        onClose={closePopup}
        title={popup.title}
        message={popup.message}
      />
      <ErrorAlertPopup 
        show={popup.show && popup.type === 'error'} 
        onClose={closePopup}
        title={popup.title}
        message={popup.message}
      />
      <WarningPopup 
        show={popup.show && popup.type === 'warning'} 
        onClose={closePopup}
        title={popup.title}
        message={popup.message}
      />
      <InfoPopup 
        show={popup.show && popup.type === 'info'} 
        onClose={closePopup}
        title={popup.title}
        message={popup.message}
      />

      {/* Title + Add Mini Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-6xl font-black" style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.02em' }}>
          MY MINI(S)
        </h1>
        
        <button
          onClick={() => setShowAddMiniPopup(true)}
          onMouseEnter={() => setAddMiniHover(true)}
          onMouseLeave={() => setAddMiniHover(false)}
          className="transition-transform hover:scale-105"
        >
          <img 
            src={addMiniHover ? addMiniBtnHover : addMiniBtn}
            alt="Add Mini"
            className="h-14"
          />
        </button>
      </div>

      {/* Connected Mini(s) Section */}
      <div>
        <h2 className="text-2xl font-black mb-2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
          Connected Mini(s):
        </h2>
        <p className="text-gray-600 mb-6 text-base">
          Manage your Mini(s) and track their Mini-Talks journey.
        </p>

        {approvedMinis.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border-4 border-gray-200">
            <img 
              src={profileIcon}
              alt="No minis"
              className="w-24 h-24 mx-auto mb-4 opacity-30"
            />
            <div className="text-2xl font-black text-gray-700 mb-2">No Minis Yet</div>
            <div className="text-gray-500">Click "Add Mini" to get started!</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedMinis.map((mini, index) => {
              const isHovered = cardHoverIndex === index;
              
              return (
                <div
                  key={mini.mini_id}
                  onMouseEnter={() => setCardHoverIndex(index)}
                  onMouseLeave={() => setCardHoverIndex(null)}
                  style={{
                    backgroundColor: isHovered ? '#0055BF' : '#FFFFFF',
                    border: isHovered ? '4px solid #003d8f' : '4px solid #000000',
                    borderRadius: '24px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isHovered ? '0 10px 30px rgba(0,85,191,0.4)' : '0 4px 6px rgba(0,0,0,0.1)',
                    cursor: 'pointer'
                  }}
                >
                  {/* Profile Icon - Sol tarafta, büyütüldü */}
                  <div style={{
                    width: '100px',
                    height: '100px',
                    minWidth: '100px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isHovered ? '4px solid #003d8f' : '4px solid #000000',
                    backgroundColor: isHovered ? '#FFFFFF' : '#FFCC00',
                    transition: 'all 0.2s ease'
                  }}>
                    <ProfileAvatar role="mini" id={mini.mini_id} size={64} alt={mini.mini_name} />
                  </div>

                  {/* Sağ taraf - İsim, Age Range, Butonlar */}
                  <div style={{ flex: 1 }}>
                    {/* Mini Name */}
                    <div style={{
                      fontWeight: 900,
                      fontSize: '1.5rem',
                      marginBottom: '4px',
                      fontFamily: 'Arial Black, sans-serif',
                      color: isHovered ? '#FFFFFF' : '#000000',
                      transition: 'color 0.2s ease'
                    }}>
                      {mini.mini_name}
                    </div>

                    {/* Age Range */}
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '12px',
                      color: isHovered ? 'rgba(255,255,255,0.8)' : '#666666',
                      transition: 'color 0.2s ease'
                    }}>
                      Age Range: {mini.age_range}
                      {mini.current_streak > 0 && (
                        <span style={{
                          marginLeft: '8px',
                          color: isHovered ? '#FFCC00' : '#237841'
                        }}>
                          🔥 {mini.current_streak} day streak!
                        </span>
                      )}
                    </div>
                    
                    {/* Buttons - Manage card hover'a bağlı, Delete kendi hover'ı */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManageClick(mini);
                        }}
                        className="transition-transform hover:scale-105"
                      >
                        <img 
                          src={isHovered ? manageBtnHover : manageBtn}
                          alt="Manage"
                          className="h-12"
                          style={{ width: 'auto', minWidth: '100px' }}
                        />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(mini);
                        }}
                        onMouseEnter={() => setDeleteHoverIndex(index)}
                        onMouseLeave={() => setDeleteHoverIndex(null)}
                        className="transition-transform hover:scale-105"
                      >
                        <img 
                          src={deleteHoverIndex === index ? deleteBtnHover : deleteBtn}
                          alt="Delete"
                          className="h-12"
                          style={{ width: 'auto', minWidth: '100px' }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Approvals Section */}
      {pendingMinis.length > 0 && (
        <div>
          <h2 className="text-2xl font-black mb-4" style={{ fontFamily: 'Arial Black, sans-serif', color: '#E31E24' }}>
            Pending Approvals:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingMinis.map((mini, index) => (
              <div
                key={mini.mini_id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '4px solid #E31E24',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              >
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 bg-yellow-400 border-black shadow-md">
                    <ProfileAvatar role="mini" id={mini.mini_id} size={56} alt={mini.mini_name} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-black text-2xl mb-1">{mini.mini_name}</div>
                    <div className="text-sm text-gray-600 font-semibold">
                      Age Range: {mini.age_range}
                    </div>
                    <div className="text-xs mt-2 font-semibold flex items-center gap-1" style={{ color: '#E31E24' }}>
                      <img src={loadingIcon} alt="" style={{ height: '12px', width: '12px', objectFit: 'contain' }} /> Waiting for approval
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(mini.mini_id, 'approve')}
                    onMouseEnter={() => setApproveHoverIndex(index)}
                    onMouseLeave={() => setApproveHoverIndex(null)}
                    className="transition-transform hover:scale-105"
                  >
                    <img 
                      src={approveHoverIndex === index ? approveBtnHover : approveBtn}
                      alt="Approve"
                      className="h-12"
                      style={{ width: 'auto', minWidth: '120px' }}
                    />
                  </button>
                  <button
                    onClick={() => handleApprove(mini.mini_id, 'reject')}
                    onMouseEnter={() => setRejectHoverIndex(index)}
                    onMouseLeave={() => setRejectHoverIndex(null)}
                    className="transition-transform hover:scale-105"
                  >
                    <img 
                      src={rejectHoverIndex === index ? rejectBtnHover : rejectBtn}
                      alt="Reject"
                      className="h-12"
                      style={{ width: 'auto', minWidth: '120px' }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expert Connection Requests - Expert gönderdi, Parent onaylayacak - KIRMIZI ÇERÇEVE TEMA */}
      {expertRequests.pending.length > 0 && (
        <div>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ fontFamily: 'Arial Black, sans-serif', color: '#E31E24' }}>
            <img src={expertIcon} alt="" style={{ height: '28px', width: '28px', objectFit: 'contain' }} /> Expert Connection Requests:
          </h2>
          <p className="text-gray-600 mb-6 text-base">
            These experts want to connect with your Mini(s). Review and approve or reject.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expertRequests.pending.map((request, index) => {
              const isProcessing = expertProcessingId === request.connection_id;
              
              return (
                <div
                  key={request.connection_id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '4px solid #E31E24',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div 
                      style={{
                        width: '72px',
                        height: '72px',
                        minWidth: '72px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '4px solid #000000',
                        backgroundColor: '#FFCC00'
                      }}
                    >
                      <img src={expertIcon} alt="Expert" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-black text-xl mb-1">{request.expert_name}</div>
                      {request.expert_organization && (
                        <div className="text-sm font-semibold flex items-center gap-1" style={{ color: '#666666' }}>
                          <img src={companyIcon} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain' }} /> {request.expert_organization}
                        </div>
                      )}
                      {request.expert_profession && (
                        <div className="text-sm font-semibold" style={{ color: '#888888' }}>
                          💼 {request.expert_profession}
                        </div>
                      )}
                    </div>
                  </div>

                  <div 
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '12px',
                      marginBottom: '12px',
                      border: '2px solid #E31E24'
                    }}
                  >
                    <div className="text-sm font-semibold mb-1" style={{ color: '#666' }}>Wants to connect with:</div>
                    <div className="flex items-center gap-3">
                      <div 
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #000',
                          backgroundColor: '#FFCC00'
                        }}
                      >
                        <ProfileAvatar role="mini" id={request.mini_id} size={20} alt={request.mini_name} />
                      </div>
                      <div>
                        <div className="font-black text-base">{request.mini_name}</div>
                        <div className="text-xs" style={{ color: '#666' }}>Age: {request.age_range}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs mb-4 text-center font-semibold flex items-center justify-center gap-1" style={{ color: '#E31E24' }}>
                    <img src={loadingIcon} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain' }} /> Requested {new Date(request.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleExpertApproval(request.connection_id, 'approve')}
                      onMouseEnter={() => setExpertApproveHoverIndex(index)}
                      onMouseLeave={() => setExpertApproveHoverIndex(null)}
                      disabled={isProcessing}
                      className={`transition-transform hover:scale-105 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <img 
                        src={expertApproveHoverIndex === index ? approveBtnHover : approveBtn}
                        alt="Approve"
                        className="h-12"
                        style={{ width: 'auto', minWidth: '100px' }}
                      />
                    </button>
                    <button
                      onClick={() => handleExpertApproval(request.connection_id, 'reject')}
                      onMouseEnter={() => setExpertRejectHoverIndex(index)}
                      onMouseLeave={() => setExpertRejectHoverIndex(null)}
                      disabled={isProcessing}
                      className={`transition-transform hover:scale-105 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <img 
                        src={expertRejectHoverIndex === index ? rejectBtnHover : rejectBtn}
                        alt="Reject"
                        className="h-12"
                        style={{ width: 'auto', minWidth: '100px' }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sent Expert Requests - Parent gönderdi, Expert onaylayacak - KIRMIZI ÇERÇEVE TEMA */}
      {expertRequests.sent_requests && expertRequests.sent_requests.length > 0 && (
        <div>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ fontFamily: 'Arial Black, sans-serif', color: '#E31E24' }}>
            <img src={loadingIcon} alt="" style={{ height: '20px', width: '20px', objectFit: 'contain' }} /> Awaiting Expert Approval:
          </h2>
          <p className="text-gray-600 mb-4 text-base">
            You've sent connection requests. Waiting for expert approval.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expertRequests.sent_requests.map((request) => (
              <div
                key={request.connection_id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '4px solid #E31E24',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '4px solid #000000',
                      backgroundColor: '#FFCC00'
                    }}
                  >
                    <img src={expertIcon} alt="Expert" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-black text-xl mb-1">{request.expert_name}</div>
                    <div className="text-sm font-semibold" style={{ color: '#333' }}>
                      For: {request.mini_name}
                    </div>
                    <div className="text-xs mt-1 font-semibold flex items-center gap-1" style={{ color: '#E31E24' }}>
                      <img src={loadingIcon} alt="" style={{ height: '12px', width: '12px', objectFit: 'contain' }} /> Waiting for expert approval...
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Expert Section - MAVİ TEMA */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black mb-2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
              Connected Expert:
            </h2>
            <p className="text-gray-600 text-base">
              Experts can help guide your Mini's progress with your permission.
            </p>
          </div>
          
          <button
            onClick={() => setShowAddExpertPopup(true)}
            onMouseEnter={() => setAddExpertHover(true)}
            onMouseLeave={() => setAddExpertHover(false)}
            className="transition-transform hover:scale-105"
          >
            <img 
              src={addExpertHover ? addExpertBtnHover : addExpertBtn}
              alt="Add Expert"
              className="h-14"
            />
          </button>
        </div>

        {expertRequests.approved.length === 0 ? (
          <div className="bg-gray-50 rounded-3xl p-10 border-4 border-gray-200 text-center">
            <img 
              src={profileIcon}
              alt="No expert"
              className="w-20 h-20 mx-auto mb-4 opacity-30"
            />
            <div className="font-black text-xl mb-2">No Expert Connected</div>
            <div className="text-gray-500">Add an expert to get started</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expertRequests.approved.map((expert, index) => {
              const isHovered = cardHoverIndex === `expert-${index}`;
              
              return (
                <div 
                  key={expert.connection_id}
                  onMouseEnter={() => setCardHoverIndex(`expert-${index}`)}
                  onMouseLeave={() => setCardHoverIndex(null)}
                  style={{
                    backgroundColor: isHovered ? '#0055BF' : '#FFFFFF',
                    border: isHovered ? '4px solid #003d8f' : '4px solid #000000',
                    borderRadius: '24px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isHovered ? '0 10px 30px rgba(0,85,191,0.4)' : '0 4px 6px rgba(0,0,0,0.1)',
                    cursor: 'pointer'
                  }}
                >
                  {/* Expert Icon - Sol tarafta */}
                  <div 
                    style={{
                      width: '100px',
                      height: '100px',
                      minWidth: '100px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isHovered ? '4px solid #003d8f' : '4px solid #000000',
                      backgroundColor: isHovered ? '#FFFFFF' : '#FFCC00',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <img src={expertIcon} alt="Expert" style={{ height: '56px', width: '56px', objectFit: 'contain' }} />
                  </div>
                  
                  {/* Sağ taraf */}
                  <div style={{ flex: 1 }}>
                    <div 
                      className="font-black text-xl mb-1"
                      style={{ 
                        color: isHovered ? '#FFFFFF' : '#000000', 
                        transition: 'color 0.2s ease',
                        fontFamily: 'Arial Black, sans-serif'
                      }}
                    >
                      {expert.expert_name}
                    </div>
                    {expert.expert_organization && (
                      <div 
                        className="text-sm font-semibold flex items-center gap-1"
                        style={{ color: isHovered ? 'rgba(255,255,255,0.8)' : '#666666', transition: 'color 0.2s ease' }}
                      >
                        <img src={companyIcon} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain' }} /> {expert.expert_organization}
                      </div>
                    )}
                    <div 
                      className="text-sm font-semibold mt-1"
                      style={{ color: isHovered ? '#FFCC00' : '#237841', transition: 'color 0.2s ease' }}
                    >
                      ✓ Connected to: {expert.mini_name}
                    </div>
                    
                    {/* Disconnect Button - Kendi hover'ı var */}
                    <div className="mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExpertClick(expert);
                        }}
                        onMouseEnter={() => setExpertDeleteHoverIndex(index)}
                        onMouseLeave={() => setExpertDeleteHoverIndex(null)}
                        className="transition-transform hover:scale-105"
                      >
                        <img 
                          src={expertDeleteHoverIndex === index ? disconnectBtnHover : disconnectBtn}
                          alt="Disconnect"
                          className="h-12"
                          style={{ width: 'auto', minWidth: '100px' }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </div>

      {/* Add Mini Popup - AlertSystem tarzı Yeşil Tema */}
      {showAddMiniPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div style={{ margin: '0 16px', maxWidth: '460px', width: '100%' }}>
            <div
              style={{
                backgroundColor: '#237841',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Green Header */}
              <div
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <h2
                  style={{
                    color: '#ffffff',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '26px',
                    fontWeight: 900,
                    margin: 0,
                    textAlign: 'center'
                  }}
                >
                  Add a Mini
                </h2>
              </div>

              {/* White Content Area */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  margin: '0 6px 6px 6px',
                  padding: '20px 24px',
                  overflowY: 'auto',
                  flex: 1
                }}
              >
                <p
                  style={{
                    color: '#000000',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}
                >
                  Set up a child profile to start playing together.
                </p>

                {/* Profile Icon */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '4px solid #000000'
                    }}
                  >
                    <img
                      src={profileIcon}
                      alt="New mini"
                      style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    />
                  </div>
                </div>

                <form onSubmit={handleAddMini}>
                  {/* Mini Name */}
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 900,
                        fontSize: '14px',
                        marginBottom: '8px',
                        color: '#000000'
                      }}
                    >
                      Mini Name:
                    </label>
                    <input
                      type="text"
                      value={newMini.mini_name}
                      onChange={(e) => setNewMini({ ...newMini, mini_name: e.target.value })}
                      placeholder="Enter a nickname"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '3px solid #000000',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Select Mini(s) - Age Range */}
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 900,
                        fontSize: '14px',
                        marginBottom: '8px',
                        color: '#000000'
                      }}
                    >
                      Select Mini(s):
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {['4-6', '7-9', '10-12', '13-17'].map(age => (
                        <button
                          key={age}
                          type="button"
                          onClick={() => setNewMini({ ...newMini, age_range: age })}
                          style={{
                            padding: '10px 0',
                            border: '3px solid #000000',
                            borderRadius: '12px',
                            fontFamily: "'Montserrat', sans-serif",
                            fontWeight: 900,
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            backgroundColor: newMini.age_range === age ? '#0055BF' : '#FFFFFF',
                            color: newMini.age_range === age ? '#FFFFFF' : '#000000',
                            borderColor: newMini.age_range === age ? '#003d8f' : '#000000',
                            transform: newMini.age_range === age ? 'scale(1.05)' : 'scale(1)'
                          }}
                        >
                          {age}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email (Optional) */}
                  <div style={{ marginBottom: '8px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 900,
                        fontSize: '14px',
                        marginBottom: '8px',
                        color: '#000000'
                      }}
                    >
                      Email (optional):
                    </label>
                    <input
                      type="email"
                      value={newMini.email}
                      onChange={(e) => setNewMini({ ...newMini, email: e.target.value })}
                      placeholder="child@email.com (optional)"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '3px solid #000000',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <p
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '12px',
                        color: '#666666',
                        fontWeight: 600,
                        marginTop: '6px'
                      }}
                    >
                      Create an account for your child to login independently.
                    </p>
                  </div>

                  {/* Password (only if email entered) */}
                  {newMini.email && (
                    <div style={{ marginBottom: '8px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 900,
                          fontSize: '14px',
                          marginBottom: '8px',
                          color: '#000000'
                        }}
                      >
                        Password:
                      </label>
                      <input
                        type="password"
                        value={newMini.password}
                        onChange={(e) => setNewMini({ ...newMini, password: e.target.value })}
                        placeholder="Create a password"
                        required={!!newMini.email}
                        minLength={6}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '3px solid #000000',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <p
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: '12px',
                          color: '#666666',
                          fontWeight: 600,
                          marginTop: '6px'
                        }}
                      >
                        Minimum 6 characters required.
                      </p>
                    </div>
                  )}

                  {/* Buttons - LEGO style */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMiniPopup(false);
                        setNewMini({ mini_name: '', age_range: '', email: '', password: '' });
                      }}
                      onMouseEnter={() => setAddMiniCancelHover(true)}
                      onMouseLeave={() => setAddMiniCancelHover(false)}
                      className="transition-transform hover:scale-105"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <img
                        src={addMiniCancelHover ? cancelBtnImgHover : cancelBtnImg}
                        alt="Cancel"
                        style={{ height: '48px', width: 'auto' }}
                      />
                    </button>

                    <button
                      type="submit"
                      disabled={!newMini.mini_name || !newMini.age_range}
                      onMouseEnter={() => setAddMiniSubmitHover(true)}
                      onMouseLeave={() => setAddMiniSubmitHover(false)}
                      className="transition-transform hover:scale-105"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: (!newMini.mini_name || !newMini.age_range) ? 'not-allowed' : 'pointer',
                        opacity: (!newMini.mini_name || !newMini.age_range) ? 0.5 : 1
                      }}
                    >
                      <img
                        src={addMiniSubmitHover ? addMiniBlueBtnHoverImg : addMiniBlueBtnImg}
                        alt="Add Mini"
                        style={{ height: '48px', width: 'auto' }}
                      />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expert Popup - AlertSystem tarzı Yeşil Tema */}
      {showAddExpertPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div style={{ margin: '0 16px', maxWidth: '460px', width: '100%' }}>
            <div
              style={{
                backgroundColor: '#237841',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Green Header */}
              <div
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <h2
                  style={{
                    color: '#ffffff',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '26px',
                    fontWeight: 900,
                    margin: 0,
                    textAlign: 'center'
                  }}
                >
                  Connect Expert
                </h2>
              </div>

              {/* White Content Area */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  margin: '0 6px 6px 6px',
                  padding: '20px 24px',
                  overflowY: 'auto',
                  flex: 1
                }}
              >
                <p
                  style={{
                    color: '#000000',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}
                >
                  Add an expert to help guide your mini's progress.
                </p>

                {/* Expert Icon */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '4px solid #000000'
                    }}
                  >
                    <img
                      src={expertIcon}
                      alt="Expert"
                      style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    />
                  </div>
                </div>

                <form onSubmit={handleAddExpert}>
                  {/* Select Mini */}
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 900,
                        fontSize: '14px',
                        marginBottom: '8px',
                        color: '#000000'
                      }}
                    >
                      Select Mini:
                    </label>
                    <select
                      value={newExpert.mini_id}
                      onChange={(e) => setNewExpert({ ...newExpert, mini_id: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '3px solid #000000',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: '#FFFFFF',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Crect width='36' height='36' rx='6' fill='%23237841'/%3E%3Cpath d='M11 14l7 7 7-7' stroke='white' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 6px center',
                        backgroundSize: '32px 32px',
                        paddingRight: '48px'
                      }}
                    >
                      <option value="">Choose a Mini...</option>
                      {approvedMinis.map(mini => (
                        <option key={mini.mini_id} value={mini.mini_id}>
                          {mini.mini_name} ({mini.age_range})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expert's Email */}
                  <div style={{ marginBottom: '8px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 900,
                        fontSize: '14px',
                        marginBottom: '8px',
                        color: '#000000'
                      }}
                    >
                      Expert's Email:
                    </label>
                    <input
                      type="email"
                      value={newExpert.expert_email}
                      onChange={(e) => setNewExpert({ ...newExpert, expert_email: e.target.value })}
                      placeholder="expert@email.com"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '3px solid #000000',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <p
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: '12px',
                        color: '#666666',
                        fontWeight: 600,
                        marginTop: '6px'
                      }}
                    >
                      The expert must have an account with this email.
                    </p>
                  </div>

                  {/* Buttons - LEGO style */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddExpertPopup(false);
                        setNewExpert({ mini_id: '', expert_email: '' });
                      }}
                      onMouseEnter={() => setAddExpertCancelHover(true)}
                      onMouseLeave={() => setAddExpertCancelHover(false)}
                      className="transition-transform hover:scale-105"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <img
                        src={addExpertCancelHover ? cancelBtnImgHover : cancelBtnImg}
                        alt="Cancel"
                        style={{ height: '48px', width: 'auto' }}
                      />
                    </button>

                    <button
                      type="submit"
                      disabled={!newExpert.mini_id || !newExpert.expert_email}
                      onMouseEnter={() => setAddExpertSubmitHover(true)}
                      onMouseLeave={() => setAddExpertSubmitHover(false)}
                      className="transition-transform hover:scale-105"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: (!newExpert.mini_id || !newExpert.expert_email) ? 'not-allowed' : 'pointer',
                        opacity: (!newExpert.mini_id || !newExpert.expert_email) ? 0.5 : 1
                      }}
                    >
                      <img
                        src={addExpertSubmitHover ? sendRequestBtnHoverImg : sendRequestBtnImg}
                        alt="Send Request"
                        style={{ height: '48px', width: 'auto' }}
                      />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Mini Confirmation Popup - AlertSystem tarzı */}
      {showDeletePopup && miniToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div style={{ margin: '0 16px', maxWidth: '500px', width: '100%' }}>
            <div
              style={{
                backgroundColor: '#E31E24',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <h2
                  style={{
                    color: '#ffffff',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '26px',
                    fontWeight: 900,
                    margin: 0
                  }}
                >
                  Delete Mini?
                </h2>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  margin: '0 6px 6px 6px',
                  padding: '15px 10px',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                {/* Mini Icon - Sol tarafta */}
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    minWidth: '100px',
                    borderRadius: '50%',
                    backgroundColor: '#FFCC00',
                    border: '4px solid #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <ProfileAvatar
                    role="mini"
                    id={miniToDelete?.mini_id}
                    alt="Mini"
                    size={56}
                  />
                </div>

                {/* Sağ taraf - Mesaj ve Butonlar */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1
                  }}
                >
                  <p
                    style={{
                      color: '#000000',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '16px',
                      fontWeight: 500,
                      textAlign: 'center',
                      marginBottom: '8px',
                      lineHeight: '1.5'
                    }}
                  >
                    Are you sure you want to delete
                    <br />
                    <span style={{ color: '#E31E24', fontWeight: 900, fontSize: '18px' }}>
                      "{miniToDelete.mini_name}"?
                    </span>
                  </p>

                  <p
                    style={{
                      color: '#B91C1C',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                      marginBottom: '16px'
                    }}
                  >
                    ⚠️ This action cannot be undone.
                  </p>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={handleCancelDelete}
                      onMouseEnter={() => setCancelBtnHover(true)}
                      onMouseLeave={() => setCancelBtnHover(false)}
                      disabled={deleteLoading}
                      className="transition-transform hover:scale-105"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: deleteLoading ? 0.5 : 1 }}
                    >
                      <img 
                        src={cancelBtnHover ? cancelBtnImgHover : cancelBtnImg}
                        alt="Cancel"
                        style={{ height: '48px', width: 'auto' }}
                      />
                    </button>

                    <button
                      onClick={handleConfirmDelete}
                      onMouseEnter={() => setOkBtnHover(true)}
                      onMouseLeave={() => setOkBtnHover(false)}
                      disabled={deleteLoading}
                      className="transition-transform hover:scale-105"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: deleteLoading ? 0.5 : 1 }}
                    >
                      <img 
                        src={okBtnHover ? okBtnRedHover : okBtnRed}
                        alt="OK"
                        style={{ height: '48px', width: 'auto' }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Expert Confirmation Popup - AlertSystem tarzı */}
      {showExpertDeletePopup && expertToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div style={{ margin: '0 16px', maxWidth: '500px', width: '100%' }}>
            <div
              style={{
                backgroundColor: '#E31E24',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <h2
                  style={{
                    color: '#ffffff',
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '26px',
                    fontWeight: 900,
                    margin: 0
                  }}
                >
                  Disconnect Expert?
                </h2>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  margin: '0 6px 6px 6px',
                  padding: '15px 10px',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                {/* Expert Icon - Sol tarafta */}
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    minWidth: '100px',
                    borderRadius: '50%',
                    backgroundColor: '#FFCC00',
                    border: '4px solid #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={expertIcon}
                    alt="Expert"
                    style={{
                      width: '56px',
                      height: '56px',
                      objectFit: 'contain'
                    }}
                  />
                </div>

                {/* Sağ taraf - Mesaj ve Butonlar */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1
                  }}
                >
                  <p
                    style={{
                      color: '#000000',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '16px',
                      fontWeight: 500,
                      textAlign: 'center',
                      marginBottom: '8px',
                      lineHeight: '1.5'
                    }}
                  >
                    Are you sure you want to disconnect
                    <br />
                    <span style={{ color: '#E31E24', fontWeight: 900, fontSize: '18px' }}>
                      "{expertToDelete.expert_name}"
                    </span>
                    <br />
                    <span style={{ color: '#666', fontSize: '14px' }}>
                      from "{expertToDelete.mini_name}"?
                    </span>
                  </p>

                  <p
                    style={{
                      color: '#B91C1C',
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                      marginBottom: '16px'
                    }}
                  >
                    ⚠️ This will remove expert's access.
                  </p>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={handleCancelExpertDelete}
                      onMouseEnter={() => setExpertCancelBtnHover(true)}
                      onMouseLeave={() => setExpertCancelBtnHover(false)}
                      disabled={expertDeleteLoading}
                      className="transition-transform hover:scale-105"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: expertDeleteLoading ? 0.5 : 1 }}
                    >
                      <img 
                        src={expertCancelBtnHover ? cancelBtnImgHover : cancelBtnImg}
                        alt="Cancel"
                        style={{ height: '48px', width: 'auto' }}
                      />
                    </button>

                    <button
                      onClick={handleConfirmExpertDelete}
                      onMouseEnter={() => setExpertOkBtnHover(true)}
                      onMouseLeave={() => setExpertOkBtnHover(false)}
                      disabled={expertDeleteLoading}
                      className="transition-transform hover:scale-105"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: expertDeleteLoading ? 0.5 : 1 }}
                    >
                      <img 
                        src={expertOkBtnHover ? okBtnRedHover : okBtnRed}
                        alt="OK"
                        style={{ height: '48px', width: 'auto' }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ParentMyMinis;