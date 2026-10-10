// src/components/dashboard/ExpertMyMinis.jsx
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import axios from 'axios';
import leftBtnBig from '../../assets/Left Buton_Buyuk.png';
import rightBtnBig from '../../assets/Right Buton_Buyuk.png';

// ── Mobil carousel: içeriği ölçer, taşıyorsa MiniManage tarzı PNG ok + boncuk gösterir; sığıyorsa ortalı + göstergesiz ──
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

  const arrowStyle = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, WebkitFlexShrink: 0, alignSelf: 'center' };
  const arrowImg = { width: '30px', height: '30px' };

  return (
    <div className="emm-carousel-row" style={{ display: 'flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: '6px', flex: '1 1 0%', minHeight: 0, flexDirection: 'column' }}>
      <div style={{ display: 'flex', WebkitBoxAlign: 'center', WebkitAlignItems: 'center', alignItems: 'center', gap: '6px', width: '100%', flex: '1 1 0%', minHeight: 0 }}>
        {overflow && (
          <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 0}
            style={{ ...arrowStyle, opacity: page <= 0 ? 0.3 : 1, pointerEvents: page <= 0 ? 'none' : 'auto' }} aria-label="Previous">
            <img src={leftBtnBig} alt="Prev" style={arrowImg} />
          </button>
        )}
        <div ref={scrollRef} className={`emm-carousel ${overflow ? 'many' : 'few'}`} onScroll={onScroll}>
          {children}
        </div>
        {overflow && (
          <button type="button" onClick={() => goTo(page + 1)} disabled={page >= pageCount - 1}
            style={{ ...arrowStyle, opacity: page >= pageCount - 1 ? 0.3 : 1, pointerEvents: page >= pageCount - 1 ? 'none' : 'auto' }} aria-label="Next">
            <img src={rightBtnBig} alt="Next" style={arrowImg} />
          </button>
        )}
      </div>
      {overflow && pageCount > 1 && (
        <div className="emm-dots">
          {Array.from({ length: pageCount }, (_, i) => (
            <div key={i} className={`emm-dot ${i === page ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
};


// AlertSystem Popups
import { SuccessPopup, ErrorAlertPopup, WarningPopup, InfoPopup } from '../popups/AlertSystem';

// Components
import MiniManage from './MiniManage';

// PNG Assets
import viewBtn from '../../assets/View_Buton.png';
import viewBtnHover from '../../assets/View_Buton_Hover.png';
import addMiniBtn from '../../assets/add_mini_btn.png';
import addMiniBtnHover from '../../assets/add_mini_btn_hover.png';
import profileIcon from '../../assets/profile-icon.png';
import ProfileAvatar from '../common/ProfileAvatar';
import approveBtn from '../../assets/approve_btn.png';
import approveBtnHover from '../../assets/approve_btn_hover.png';
import rejectBtn from '../../assets/reject_btn.png';
import rejectBtnHover from '../../assets/reject_btn_hover.png';
import disconnectBtn from '../../assets/Disconnect Btn.png';
import disconnectBtnHover from '../../assets/Disconnect Btn Hover.png';
import expertIcon from '../../assets/expert.png';
import loadingIcon from '../../assets/loading.png';
import okBtnRed from '../../assets/ok_btn_red.png';
import okBtnRedHover from '../../assets/ok_btn_red_hover.png';
import cancelBtnImg from '../../assets/cancel_btn.png';
import cancelBtnImgHover from '../../assets/cancel_btn_hover.png';
import sendRequestBtnImg from '../../assets/Send Request Blue Btn.png';
import sendRequestBtnHoverImg from '../../assets/Send Request Blue Btn Hover.png';

const ExpertMyMinis = ({ user }) => {
  const [minis, setMinis] = useState([]);
  const [pendingConnections, setPendingConnections] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selected mini for view
  const [selectedMini, setSelectedMini] = useState(null);
  const [showMiniView, setShowMiniView] = useState(false);
  
  // Add Mini popup
  const [showAddMiniPopup, setShowAddMiniPopup] = useState(false);
  const [addMiniForm, setAddMiniForm] = useState({
    parent_email: '',
    selected_minis: []
  });
  const [addMiniLoading, setAddMiniLoading] = useState(false);
  const [availableMinis, setAvailableMinis] = useState([]);
  const [hasParentAccount, setHasParentAccount] = useState(true);
  
  // Disconnect confirmation popup
  const [showDisconnectPopup, setShowDisconnectPopup] = useState(false);
  const [miniToDisconnect, setMiniToDisconnect] = useState(null);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  
  // Popup button hover states
  const [okBtnHover, setOkBtnHover] = useState(false);
  const [cancelBtnHover, setCancelBtnHover] = useState(false);
  
  // Button hover states
  const [addMiniHover, setAddMiniHover] = useState(false);
  
  // Disconnect button hover states (ayrı, card hover'dan bağımsız)
  const [disconnectHoverIndex, setDisconnectHoverIndex] = useState(null);
  
  // Approve/Reject hover states for pending connections
  const [approveHoverIndex, setApproveHoverIndex] = useState(null);
  const [rejectHoverIndex, setRejectHoverIndex] = useState(null);
  
  // Card hover state
  const [cardHoverIndex, setCardHoverIndex] = useState(null);

  // Processing state for buttons
  const [processingId, setProcessingId] = useState(null);

  // Add Mini popup button hover states
  const [addMiniCancelHover, setAddMiniCancelHover] = useState(false);
  const [addMiniSubmitHover, setAddMiniSubmitHover] = useState(false);

  // ✅ Alert/Popup states
  const [popup, setPopup] = useState({
    show: false,
    type: 'success', // success, error, warning, info
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
  // mobileAddView: null | 'mini' — Add Mini (Send Parent Request) popup yerine TAM SAYFA
  const [mobileAddView, setMobileAddView] = useState(null);

  useEffect(() => {
    if (user && user.user_id) {
      fetchMinis();
    }
  }, [user]);

  const fetchMinis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/auth/get-expert-minis.php?expert_id=${user.user_id}`
      );
      
      if (response.data.success) {
        setMinis(response.data.data.minis || []);
        setPendingConnections(response.data.data.pending_connections || []);
        setSentRequests(response.data.data.sent_requests || []);
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

  // Handle connection approval/rejection
  const handleConnectionAction = async (connectionId, action) => {
    try {
      setProcessingId(connectionId);
      
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/approve-expert-connection.php',
        {
          expert_id: user.user_id,
          connection_id: connectionId,
          action: action
        }
      );

      if (response.data.success) {
        fetchMinis();
        showPopup(
          'success',
          response.data.message,
          action === 'approve' ? '🎉 Connected!' : 'Declined'
        );
      } else {
        showPopup('error', response.data.message || 'Failed to process request');
      }
    } catch (error) {
      console.error('Failed to process connection:', error);
      showPopup('error', error.response?.data?.message || 'Failed to process request');
    } finally {
      setProcessingId(null);
    }
  };

  // Disconnect connection - Popup ile onay
  const handleDisconnectClick = (mini) => {
    setMiniToDisconnect(mini);
    setShowDisconnectPopup(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!miniToDisconnect) return;

    try {
      setDisconnectLoading(true);
      
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/delete-expert-connection.php',
        {
          user_id: user.user_id,
          connection_id: miniToDisconnect.connection_id,
          role: 'expert'
        }
      );

      if (response.data.success) {
        setShowDisconnectPopup(false);
        setMiniToDisconnect(null);
        fetchMinis();
        showPopup('success', response.data.message, 'Disconnected');
      } else {
        showPopup('error', response.data.message || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
      showPopup('error', error.response?.data?.message || 'Failed to disconnect');
    } finally {
      setDisconnectLoading(false);
    }
  };

  const handleCancelDisconnect = () => {
    setShowDisconnectPopup(false);
    setMiniToDisconnect(null);
  };

  // Search parent by email
  const handleSearchParent = async () => {
    if (!addMiniForm.parent_email) return;
    
    try {
      setAddMiniLoading(true);
      setAvailableMinis([]);
      setAddMiniForm(prev => ({ ...prev, selected_minis: [] }));
      
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/add-mini-by-expert.php',
        {
          expert_id: user.user_id,
          parent_email: addMiniForm.parent_email,
          mini_names: []
        }
      );

      // Success means single mini was auto-selected and request sent
      if (response.data.success) {
        setShowAddMiniPopup(false);
        setMobileAddView(null);
        setAddMiniForm({ parent_email: '', selected_minis: [] });
        setAvailableMinis([]);
        fetchMinis();
        
        const msg = response.data.data?.has_parent_account === false
          ? 'Request sent! An approval email has been sent to the parent.'
          : response.data.message;
        
        showPopup('success', msg, '📩 Request Sent!');
      }
    } catch (error) {
      console.error('Search parent:', error);
      
      // Check if we got mini list
      if (error.response?.data?.data?.available_minis) {
        setAvailableMinis(error.response.data.data.available_minis);
        setHasParentAccount(error.response.data.data.has_parent_account !== false);
        
        // If only one mini, auto-select it
        if (error.response.data.data.available_minis.length === 1) {
          const miniName = error.response.data.data.available_minis[0].mini_name;
          setAddMiniForm(prev => ({ ...prev, selected_minis: [miniName] }));
        }
      } else {
        showPopup('error', error.response?.data?.message || 'Failed to find parent');
      }
    } finally {
      setAddMiniLoading(false);
    }
  };

  // Toggle mini selection
  const toggleMiniSelection = (miniName) => {
    setAddMiniForm(prev => {
      const isSelected = prev.selected_minis.includes(miniName);
      return {
        ...prev,
        selected_minis: isSelected
          ? prev.selected_minis.filter(n => n !== miniName)
          : [...prev.selected_minis, miniName]
      };
    });
  };

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (addMiniForm.selected_minis.length === availableMinis.length) {
      setAddMiniForm(prev => ({ ...prev, selected_minis: [] }));
    } else {
      setAddMiniForm(prev => ({ 
        ...prev, 
        selected_minis: availableMinis.map(m => m.mini_name) 
      }));
    }
  };

  // Send connection request
  const handleSendRequest = async () => {
    if (addMiniForm.selected_minis.length === 0) {
      showPopup('warning', 'Please select at least one Mini');
      return;
    }
    
    try {
      setAddMiniLoading(true);
      
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/add-mini-by-expert.php',
        {
          expert_id: user.user_id,
          parent_email: addMiniForm.parent_email,
          mini_names: addMiniForm.selected_minis
        }
      );

      if (response.data.success) {
        setShowAddMiniPopup(false);
        setMobileAddView(null);
        setAddMiniForm({ parent_email: '', selected_minis: [] });
        setAvailableMinis([]);
        fetchMinis();
        
        const msg = response.data.data?.has_parent_account === false
          ? 'Request sent! An approval email has been sent to the parent.'
          : response.data.message;
        
        showPopup('success', msg, '📩 Request Sent!');
      } else {
        showPopup('error', response.data.message);
      }
    } catch (error) {
      console.error('Failed to send request:', error);
      showPopup('error', error.response?.data?.message || 'Failed to send request');
    } finally {
      setAddMiniLoading(false);
    }
  };

  // Handle view button click
  const handleViewClick = (mini) => {
    setSelectedMini(mini);
    setShowMiniView(true);
  };

  // Close view
  const handleCloseView = () => {
    setShowMiniView(false);
    setSelectedMini(null);
  };

  // Reset popup state
  const handleClosePopup = () => {
    setShowAddMiniPopup(false);
    setMobileAddView(null);
    setAddMiniForm({ parent_email: '', selected_minis: [] });
    setAvailableMinis([]);
    setHasParentAccount(true);
  };

  // If MiniManage is open (view mode), show it
  if (showMiniView && selectedMini) {
    return (
      <MiniManage 
        mini={selectedMini}
        onClose={handleCloseView}
        viewerRole="expert"
        viewOnly={true}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-4xl">
          <img src={loadingIcon} alt="" style={{ height: '40px', width: '40px', objectFit: 'contain' }} /> Loading...
        </div>
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

    // ── Add (Send Parent Request) form CSS — register stili ──
    const emmAddStyles = `
      .emm-form { width: 100%; max-width: 480px; margin: 0 auto; font-family: 'Montserrat', sans-serif; }
      .emm-form *, .emm-form input, .emm-form button, .emm-form label { font-family: 'Montserrat', sans-serif; box-sizing: border-box; }
      .emm-label { display: block; font-size: 11px; font-weight: 700; color: #000; margin-bottom: 3px; }
      .emm-input { width: 100%; padding: 7px 11px; border: 2px solid #000; border-radius: 8px; font-size: 12px; outline: none; background: #FFF; }
      .emm-input:focus { border-color: #0055BF; -webkit-box-shadow: 0 0 0 3px rgba(0,85,191,0.25); box-shadow: 0 0 0 3px rgba(0,85,191,0.25); }
      .emm-search-btn { padding: 7px 16px; background: #0055BF; color: #FFF; border: none; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; white-space: nowrap; }
      .emm-mini-btn {
        width: 100%; padding: 7px 10px; border: 2px solid #000; border-radius: 9px;
        font-weight: 700; font-size: 12px; cursor: pointer; background: #FFF; color: #000;
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-box-align: center; -webkit-align-items: center; align-items: center; gap: 9px; text-align: left;
      }
      .emm-mini-btn.selected { background: #0055BF; border-color: #003d8f; color: #FFF; }
      .emm-info { font-size: 10px; color: #555; line-height: 1.4; margin: 4px 0 0; font-weight: 600; }
    `;

    // ── Carousel CSS ──
    const carouselCss = `
      .emm-carousel {
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-flex-wrap: nowrap; flex-wrap: nowrap; gap: 14px;
        overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch;
        scroll-snap-type: x mandatory; scroll-behavior: smooth; padding: 4px 0 6px;
        -webkit-box-align: center; -webkit-align-items: center; align-items: center; height: 100%; width: 100%;
      }
      .emm-carousel::-webkit-scrollbar { display: none; }
      .emm-carousel { -ms-overflow-style: none; scrollbar-width: none; }
      .emm-carousel.few { -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center; }
      .emm-carousel.many { -webkit-box-pack: start; -webkit-justify-content: flex-start; justify-content: flex-start; }
      .emm-card-snap { scroll-snap-align: start; }
      .emm-dots {
        display: -webkit-box; display: -webkit-flex; display: flex;
        -webkit-box-pack: center; -webkit-justify-content: center; justify-content: center;
        -webkit-box-align: center; -webkit-align-items: center; align-items: center;
        gap: 6px; padding: 4px 0 2px; flex-shrink: 0;
      }
      .emm-dot { width: 8px; height: 8px; border-radius: 2px; background: #C8C8C8; -webkit-transition: all 0.2s; transition: all 0.2s; }
      .emm-dot.active { background: #E31E24; width: 16px; }
    `;

    // ════ ADD MINI (Send Parent Request) — TAM SAYFA ════
    if (mobileAddView === 'mini') {
      return (
        <div style={mRoot}>
          {mAlerts}
          <style>{emmAddStyles}</style>
          <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: '6px' }}>
            <h1 style={{ ...mFont, fontSize: '19px', fontWeight: 900, margin: 0, color: '#E31E24' }}>Send Parent Request</h1>
            <p style={{ color: '#666', fontSize: '10px', margin: '2px 0 0' }}>Send a request to connect with selected Mini(s).</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: '1 1 0%', minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Üstte ortalı avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <div style={{ width: '74px', height: '74px', borderRadius: '50%', backgroundColor: '#FFCC00', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={profileIcon} alt="Mini" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
              </div>
            </div>

            <div className="emm-form">
              {/* Parent's Email + Search */}
              <div style={{ marginBottom: '10px' }}>
                <label className="emm-label">Parent's Email:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="email" value={addMiniForm.parent_email}
                    onChange={(e) => { setAddMiniForm({ parent_email: e.target.value, selected_minis: [] }); setAvailableMinis([]); }}
                    placeholder="parent@email.com" className="emm-input" style={{ flex: 1 }} />
                  <button type="button" onClick={handleSearchParent}
                    disabled={!addMiniForm.parent_email || addMiniLoading} className="emm-search-btn"
                    style={{ opacity: (!addMiniForm.parent_email || addMiniLoading) ? 0.5 : 1, cursor: (!addMiniForm.parent_email || addMiniLoading) ? 'not-allowed' : 'pointer' }}>
                    {addMiniLoading ? <img src={loadingIcon} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain' }} /> : 'Search'}
                  </button>
                </div>
              </div>

              {/* Mini seçim listesi */}
              {availableMinis.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <label className="emm-label" style={{ marginBottom: 0 }}>Select Mini(s):</label>
                    {availableMinis.length > 1 && (
                      <button type="button" onClick={toggleSelectAll}
                        style={{ ...mFont, fontWeight: 700, fontSize: '11px', color: '#0055BF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {addMiniForm.selected_minis.length === availableMinis.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {!hasParentAccount && (
                    <div style={{ backgroundColor: '#FEF9C3', border: '2px solid #FACC15', borderRadius: '9px', padding: '7px 9px', marginBottom: '7px' }}>
                      <p style={{ ...mFont, fontSize: '10px', color: '#854D0E', fontWeight: 600, margin: 0 }}>
                        📧 This parent doesn't have a Mini-Talks account. An approval email will be sent to them.
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {availableMinis.map((mini, idx) => {
                      const isSelected = addMiniForm.selected_minis.includes(mini.mini_name);
                      return (
                        <button key={idx} type="button" onClick={() => toggleMiniSelection(mini.mini_name)}
                          className={`emm-mini-btn ${isSelected ? 'selected' : ''}`}>
                          <div style={{ width: '18px', height: '18px', minWidth: '18px', borderRadius: '4px', border: isSelected ? '2px solid #FFF' : '2px solid #999', backgroundColor: isSelected ? '#FFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isSelected && <span style={{ color: '#0055BF', fontWeight: 900, fontSize: '11px' }}>✓</span>}
                          </div>
                          <div style={{ width: '30px', height: '30px', minWidth: '30px', borderRadius: '50%', backgroundColor: '#FFCC00', border: isSelected ? '2px solid #FFCC00' : '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={profileIcon} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 900, fontSize: '12px' }}>{mini.mini_name}</div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: isSelected ? 'rgba(255,255,255,0.75)' : '#666' }}>Age: {mini.age_range}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ ...mFont, fontSize: '10px', color: '#666', fontWeight: 600, textAlign: 'center', margin: '7px 0 0' }}>
                    {addMiniForm.selected_minis.length} of {availableMinis.length} Mini(s) selected
                  </p>
                </div>
              )}

              {availableMinis.length === 0 && (
                <p className="emm-info" style={{ textAlign: 'center' }}>Enter the parent's email and tap Search to find their Mini(s).</p>
              )}
            </div>
          </div>

          {/* Alt — Cancel + Send Request */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexShrink: 0, paddingTop: '5px' }}>
            <button type="button" onClick={handleClosePopup}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src={cancelBtnImg} alt="Cancel" style={{ height: '38px', width: 'auto' }} />
            </button>
            {availableMinis.length > 0 && (
              <button type="button" onClick={handleSendRequest}
                disabled={addMiniForm.selected_minis.length === 0 || addMiniLoading}
                style={{ background: 'none', border: 'none', padding: 0,
                  cursor: (addMiniForm.selected_minis.length === 0 || addMiniLoading) ? 'not-allowed' : 'pointer',
                  opacity: (addMiniForm.selected_minis.length === 0 || addMiniLoading) ? 0.5 : 1 }}>
                <img src={sendRequestBtnImg} alt="Send Request" style={{ height: '38px', width: 'auto' }} />
              </button>
            )}
          </div>
        </div>
      );
    }

    // ════ LİSTE ════
    const miniCard = { backgroundColor: '#FFFFFF', border: '3px solid #000000', borderRadius: '16px', padding: '12px 14px', width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
    const pendingCard = { ...miniCard, border: '3px solid #E31E24' };
    const cardHead = { display: 'flex', alignItems: 'center', gap: '10px' };
    const cardAvatar = () => ({ width: '48px', height: '48px', minWidth: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #000', backgroundColor: '#FFCC00' });
    const cardName = () => ({ ...mFont, fontWeight: 900, fontSize: '15px', lineHeight: 1.15, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
    const cardSub = () => ({ ...mFont, fontWeight: 600, fontSize: '11px', color: '#666' });
    const cardDividerTop = () => ({ borderTop: '1.5px solid #D8D8D8', paddingTop: '8px', display: 'flex', justifyContent: 'center', gap: '8px' });

    const totalCount = minis.length + pendingConnections.length + sentRequests.length;

    return (
      <div style={mRoot}>
        {mAlerts}
        <style>{carouselCss}</style>

        {/* Başlık + Add Mini */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexShrink: 0 }}>
          <h1 style={{ ...mFont, fontSize: '20px', fontWeight: 900, margin: 0, color: '#E31E24' }}>MY MINI(S)</h1>
          <button type="button" onClick={() => setMobileAddView('mini')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <img src={addMiniBtn} alt="Add Mini" style={{ height: '34px', width: 'auto' }} />
          </button>
        </div>

        {/* Açıklama */}
        <p style={{ ...mFont, textAlign: 'center', fontSize: '10px', color: '#555', fontWeight: 600, margin: '6px 0 6px', flexShrink: 0 }}>
          View and track the progress of Mini(s) assigned to you by their parents.
        </p>

        {/* İçerik */}
        <div style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {totalCount === 0 ? (
            <div style={{ ...mFont, textAlign: 'center', padding: '18px 0' }}>
              <img src={profileIcon} alt="No minis" style={{ width: '52px', height: '52px', opacity: 0.3, marginBottom: '6px' }} />
              <div style={{ fontWeight: 900, fontSize: '14px', color: '#444' }}>No Minis Yet</div>
              <div style={{ fontSize: '11px', color: '#888' }}>Tap "Add Mini" to connect with a parent's Mini.</div>
            </div>
          ) : (
            <MobileCarousel count={totalCount}>
              {/* Bağlı miniler */}
              {minis.map((mini) => (
                <div key={mini.mini_id} className="emm-card-snap" style={miniCard}>
                  <div style={cardHead}>
                    <div style={cardAvatar()}>
                      <ProfileAvatar role="mini" id={mini.mini_id} size={30} alt={mini.mini_name} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={cardName()}>{mini.mini_name}</div>
                      <div style={cardSub()}>Age Range: {mini.age_range}</div>
                      <div style={cardSub()}>Parent: {mini.parent_name || 'N/A'}</div>
                    </div>
                  </div>
                  <div style={cardDividerTop()}>
                    <button onClick={() => handleViewClick(mini)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      <img src={viewBtn} alt="View" style={{ height: '30px', width: 'auto' }} />
                    </button>
                    <button onClick={() => handleDisconnectClick(mini)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      <img src={disconnectBtn} alt="Disconnect" style={{ height: '30px', width: 'auto' }} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Pending bağlantı istekleri (Parent gönderdi, Expert onaylayacak) */}
              {pendingConnections.map((connection) => {
                const isProcessing = processingId === connection.connection_id;
                return (
                  <div key={connection.connection_id} className="emm-card-snap" style={pendingCard}>
                    <div style={cardHead}>
                      <div style={cardAvatar()}>
                        <ProfileAvatar role="mini" id={connection.mini_id} size={30} alt={connection.mini_name} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={cardName()}>{connection.mini_name}</div>
                        <div style={cardSub()}>Age Range: {connection.age_range}</div>
                        <div style={{ ...cardSub(), color: '#E31E24' }}>Parent: {connection.parent_name || connection.parent_email || 'N/A'}</div>
                      </div>
                    </div>
                    <div style={{ ...cardSub(), color: '#E31E24', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <img src={loadingIcon} alt="" style={{ height: '10px', width: '10px', objectFit: 'contain' }} /> Requested {new Date(connection.requested_at).toLocaleDateString()}
                    </div>
                    <div style={cardDividerTop()}>
                      <button onClick={() => handleConnectionAction(connection.connection_id, 'approve')} disabled={isProcessing}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1 }}>
                        <img src={approveBtn} alt="Accept" style={{ height: '32px', width: 'auto' }} />
                      </button>
                      <button onClick={() => handleConnectionAction(connection.connection_id, 'reject')} disabled={isProcessing}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1 }}>
                        <img src={rejectBtn} alt="Decline" style={{ height: '32px', width: 'auto' }} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Gönderilen istekler (Expert gönderdi, Parent onaylayacak) */}
              {sentRequests.map((request) => (
                <div key={request.connection_id} className="emm-card-snap" style={pendingCard}>
                  <div style={cardHead}>
                    <div style={cardAvatar()}>
                      <ProfileAvatar role="mini" id={request.mini_id} size={30} alt={request.mini_name} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={cardName()}>{request.mini_name}</div>
                      <div style={cardSub()}>Parent: {request.parent_name || request.parent_email || 'N/A'}</div>
                      <div style={{ ...cardSub(), color: '#E31E24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <img src={loadingIcon} alt="" style={{ height: '10px', width: '10px', objectFit: 'contain' }} /> Waiting for approval...
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </MobileCarousel>
          )}
        </div>

        {/* Disconnect onay popup'ı — kompakt */}
        {showDisconnectPopup && miniToDisconnect && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ margin: '0 16px', maxWidth: '380px', width: '100%' }}>
              <div style={{ backgroundColor: '#E31E24', borderRadius: '16px', overflow: 'hidden', boxShadow: '4px 4px 50px 10px rgba(0,0,0,0.5)' }}>
                <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <h2 style={{ ...mFont, color: '#fff', fontSize: '18px', fontWeight: 900, margin: 0 }}>Disconnect Mini?</h2>
                </div>
                <div style={{ backgroundColor: '#fff', borderRadius: '13px', margin: '0 5px 5px', padding: '10px 12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '64px', height: '64px', minWidth: '64px', borderRadius: '50%', backgroundColor: '#FFCC00', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ProfileAvatar role="mini" id={miniToDisconnect?.mini_id} size={36} alt="Mini" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <p style={{ ...mFont, color: '#000', fontSize: '12px', fontWeight: 500, textAlign: 'center', marginBottom: '4px', lineHeight: 1.4 }}>
                      Are you sure you want to disconnect from<br />
                      <span style={{ color: '#E31E24', fontWeight: 900, fontSize: '13px' }}>"{miniToDisconnect.mini_name}"?</span>
                    </p>
                    <p style={{ ...mFont, color: '#B91C1C', fontSize: '10px', fontWeight: 600, textAlign: 'center', marginBottom: '8px' }}>
                      ⚠️ You will lose access to this Mini.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={handleCancelDisconnect} disabled={disconnectLoading}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: disconnectLoading ? 0.5 : 1 }}>
                        <img src={cancelBtnImg} alt="Cancel" style={{ height: '34px', width: 'auto' }} />
                      </button>
                      <button onClick={handleConfirmDisconnect} disabled={disconnectLoading}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: disconnectLoading ? 0.5 : 1 }}>
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

      {/* Connected Mini(s) Section - Yatay Layout */}
      <div>
        <h2 className="text-2xl font-black mb-2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
          Connected Mini(s):
        </h2>
        <p className="text-gray-600 mb-6 text-base">
          View and track the progress of Mini(s) assigned to you by their parents.
        </p>

        {minis.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border-4 border-gray-200">
            <img 
              src={profileIcon}
              alt="No minis"
              className="w-24 h-24 mx-auto mb-4 opacity-30"
            />
            <div className="text-2xl font-black text-gray-700 mb-2">No Minis Yet</div>
            <div className="text-gray-500">Click "Add Mini" to connect with a parent's Mini.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {minis.map((mini, index) => {
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
                  {/* Profile Icon - Sol tarafta */}
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

                  {/* Sağ taraf - İsim, Age Range, Parent, Butonlar */}
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
                      marginBottom: '4px',
                      color: isHovered ? 'rgba(255,255,255,0.8)' : '#666666',
                      transition: 'color 0.2s ease'
                    }}>
                      Age Range: {mini.age_range}
                    </div>

                    {/* Parent */}
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      marginBottom: '12px',
                      color: isHovered ? 'rgba(255,255,255,0.7)' : '#888888',
                      transition: 'color 0.2s ease'
                    }}>
                      Parent: {mini.parent_name || 'N/A'}
                    </div>
                    
                    {/* Buttons - View card hover'a bağlı, Disconnect kendi hover'ı */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewClick(mini);
                        }}
                        className="transition-transform hover:scale-105"
                      >
                        <img 
                          src={isHovered ? viewBtn : viewBtnHover}
                          alt="View"
                          className="h-10"
                          style={{ width: 'auto', minWidth: '90px' }}
                        />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisconnectClick(mini);
                        }}
                        onMouseEnter={() => setDisconnectHoverIndex(index)}
                        onMouseLeave={() => setDisconnectHoverIndex(null)}
                        className="transition-transform hover:scale-105"
                      >
                        <img 
                          src={disconnectHoverIndex === index ? disconnectBtnHover : disconnectBtn}
                          alt="Disconnect"
                          className="h-10"
                          style={{ width: 'auto', minWidth: '90px' }}
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

      {/* Pending Connection Requests - Parent'ın gönderdiği, Expert onaylayacak - KIRMIZI ÇERÇEVE TEMA */}
      {pendingConnections.length > 0 && (
        <div>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ fontFamily: 'Arial Black, sans-serif', color: '#E31E24' }}>
            <img src={profileIcon} alt="" style={{ height: '28px', width: '28px', objectFit: 'contain' }} /> Connection Requests:
          </h2>
          <p className="text-gray-600 mb-6 text-base">
            Parents want to connect their Mini(s) with you. Review and accept or decline.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingConnections.map((connection, index) => {
              const isProcessing = processingId === connection.connection_id;
              
              return (
                <div
                  key={connection.connection_id}
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
                      <img src={profileIcon} alt="Mini" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-black text-xl mb-1">{connection.mini_name}</div>
                      <div className="text-sm font-semibold" style={{ color: '#666' }}>
                        Age Range: {connection.age_range}
                      </div>
                      <div className="text-sm font-semibold mt-1" style={{ color: '#E31E24' }}>
                        👨‍👩‍👧 Parent: {connection.parent_name || connection.parent_email || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs mb-4 text-center font-semibold flex items-center justify-center gap-1" style={{ color: '#E31E24' }}>
                    <img src={loadingIcon} alt="" style={{ height: '14px', width: '14px', objectFit: 'contain' }} /> Requested {new Date(connection.requested_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConnectionAction(connection.connection_id, 'approve')}
                      onMouseEnter={() => setApproveHoverIndex(index)}
                      onMouseLeave={() => setApproveHoverIndex(null)}
                      disabled={isProcessing}
                      className={`transition-transform hover:scale-105 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <img 
                        src={approveHoverIndex === index ? approveBtnHover : approveBtn}
                        alt="Accept"
                        className="h-12"
                        style={{ width: 'auto', minWidth: '100px' }}
                      />
                    </button>
                    <button
                      onClick={() => handleConnectionAction(connection.connection_id, 'reject')}
                      onMouseEnter={() => setRejectHoverIndex(index)}
                      onMouseLeave={() => setRejectHoverIndex(null)}
                      disabled={isProcessing}
                      className={`transition-transform hover:scale-105 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <img 
                        src={rejectHoverIndex === index ? rejectBtnHover : rejectBtn}
                        alt="Decline"
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

      {/* Sent Requests - Expert'in gönderdiği, Parent onaylayacak - KIRMIZI ÇERÇEVE TEMA */}
      {sentRequests.length > 0 && (
        <div>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ fontFamily: 'Arial Black, sans-serif', color: '#E31E24' }}>
            <img src={loadingIcon} alt="" style={{ height: '20px', width: '20px', objectFit: 'contain' }} /> Awaiting Parent Approval:
          </h2>
          <p className="text-gray-600 mb-4 text-base">
            You've sent connection requests. Waiting for parent approval.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sentRequests.map((request) => (
              <div
                key={request.connection_id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '4px solid #E31E24',
                  borderRadius: '24px',
                  padding: '20px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    style={{
                      width: '64px',
                      height: '64px',
                      minWidth: '64px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '4px solid #000000',
                      backgroundColor: '#FFCC00'
                    }}
                  >
                    <img 
                      src={profileIcon}
                      alt={request.mini_name}
                      style={{ height: '36px', width: '36px', objectFit: 'contain' }}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-black text-xl mb-1">{request.mini_name}</div>
                    <div className="text-sm font-semibold" style={{ color: '#333' }}>
                      Parent: {request.parent_name || request.parent_email || 'N/A'}
                    </div>
                    <div className="text-xs mt-1 font-semibold flex items-center gap-1" style={{ color: '#E31E24' }}>
                      <img src={loadingIcon} alt="" style={{ height: '12px', width: '12px', objectFit: 'contain' }} /> Waiting for approval...
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>

      {/* Send Parent Request Popup - AlertSystem tarzı Yeşil Tema */}
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
                  Send Parent Request
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
                  Send a request to connect with selected Mini(s).
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
                      alt="Mini"
                      style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    />
                  </div>
                </div>

                <div>
                  {/* Parent's Email */}
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
                      Parent's Email:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="email"
                        value={addMiniForm.parent_email}
                        onChange={(e) => {
                          setAddMiniForm({ parent_email: e.target.value, selected_minis: [] });
                          setAvailableMinis([]);
                        }}
                        placeholder="parent@email.com"
                        style={{
                          flex: 1,
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
                      <button
                        type="button"
                        onClick={handleSearchParent}
                        disabled={!addMiniForm.parent_email || addMiniLoading}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#0055BF',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '12px',
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 900,
                          fontSize: '15px',
                          cursor: (!addMiniForm.parent_email || addMiniLoading) ? 'not-allowed' : 'pointer',
                          opacity: (!addMiniForm.parent_email || addMiniLoading) ? 0.5 : 1,
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {addMiniLoading ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <img src={loadingIcon} alt="" style={{ height: '16px', width: '16px', objectFit: 'contain' }} />
                          </span>
                        ) : (
                          'Search'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mini Selection */}
                  {availableMinis.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label
                          style={{
                            fontFamily: "'Montserrat', sans-serif",
                            fontWeight: 900,
                            fontSize: '14px',
                            color: '#000000'
                          }}
                        >
                          Select Mini(s):
                        </label>
                        {availableMinis.length > 1 && (
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            style={{
                              fontFamily: "'Montserrat', sans-serif",
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#0055BF',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            {addMiniForm.selected_minis.length === availableMinis.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>
                      
                      {/* Parent account info */}
                      {!hasParentAccount && (
                        <div
                          style={{
                            backgroundColor: '#FEF9C3',
                            border: '2px solid #FACC15',
                            borderRadius: '12px',
                            padding: '12px',
                            marginBottom: '12px'
                          }}
                        >
                          <p
                            style={{
                              fontFamily: "'Montserrat', sans-serif",
                              fontSize: '12px',
                              color: '#854D0E',
                              fontWeight: 600,
                              margin: 0
                            }}
                          >
                            📧 This parent doesn't have a Mini-Talks account. An approval email will be sent to them.
                          </p>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {availableMinis.map((mini, idx) => {
                          const isSelected = addMiniForm.selected_minis.includes(mini.mini_name);
                          
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => toggleMiniSelection(mini.mini_name)}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: isSelected ? '3px solid #003d8f' : '3px solid #000000',
                                borderRadius: '12px',
                                fontFamily: "'Montserrat', sans-serif",
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                backgroundColor: isSelected ? '#0055BF' : '#FFFFFF',
                                color: isSelected ? '#FFFFFF' : '#000000',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                textAlign: 'left'
                              }}
                            >
                              {/* Checkbox */}
                              <div
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  minWidth: '22px',
                                  borderRadius: '4px',
                                  border: isSelected ? '2px solid #FFFFFF' : '2px solid #999999',
                                  backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {isSelected && (
                                  <span style={{ color: '#0055BF', fontWeight: 900, fontSize: '14px' }}>✓</span>
                                )}
                              </div>
                              
                              {/* Mini Icon */}
                              <div
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  minWidth: '40px',
                                  borderRadius: '50%',
                                  backgroundColor: '#FFCC00',
                                  border: isSelected ? '2px solid #FFCC00' : '2px solid #000000',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <img src={profileIcon} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                              </div>
                              
                              {/* Mini Info */}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 900, fontSize: '15px' }}>{mini.mini_name}</div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'rgba(255,255,255,0.7)' : '#666666' }}>
                                  Age: {mini.age_range}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Selected count */}
                      <p
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: '13px',
                          color: '#666666',
                          fontWeight: 600,
                          textAlign: 'center',
                          marginTop: '12px',
                          marginBottom: 0
                        }}
                      >
                        {addMiniForm.selected_minis.length} of {availableMinis.length} Mini(s) selected
                      </p>
                    </div>
                  )}

                  {/* Buttons - LEGO style */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={handleClosePopup}
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

                    {availableMinis.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSendRequest}
                        disabled={addMiniForm.selected_minis.length === 0 || addMiniLoading}
                        onMouseEnter={() => setAddMiniSubmitHover(true)}
                        onMouseLeave={() => setAddMiniSubmitHover(false)}
                        className="transition-transform hover:scale-105"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: (addMiniForm.selected_minis.length === 0 || addMiniLoading) ? 'not-allowed' : 'pointer',
                          opacity: (addMiniForm.selected_minis.length === 0 || addMiniLoading) ? 0.5 : 1
                        }}
                      >
                        <img
                          src={addMiniSubmitHover ? sendRequestBtnHoverImg : sendRequestBtnImg}
                          alt="Send Request"
                          style={{ height: '48px', width: 'auto' }}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Popup - AlertSystem tarzı */}
      {showDisconnectPopup && miniToDisconnect && (
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
                  Disconnect Mini?
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
                  <img
                    src={profileIcon}
                    alt="Mini"
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
                    Are you sure you want to disconnect from
                    <br />
                    <span style={{ color: '#E31E24', fontWeight: 900, fontSize: '18px' }}>
                      "{miniToDisconnect.mini_name}"?
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
                    ⚠️ You will lose access to this Mini.
                  </p>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={handleCancelDisconnect}
                      onMouseEnter={() => setCancelBtnHover(true)}
                      onMouseLeave={() => setCancelBtnHover(false)}
                      disabled={disconnectLoading}
                      className="transition-transform hover:scale-105"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: disconnectLoading ? 0.5 : 1 }}
                    >
                      <img 
                        src={cancelBtnHover ? cancelBtnImgHover : cancelBtnImg}
                        alt="Cancel"
                        style={{ height: '48px', width: 'auto' }}
                      />
                    </button>

                    <button
                      onClick={handleConfirmDisconnect}
                      onMouseEnter={() => setOkBtnHover(true)}
                      onMouseLeave={() => setOkBtnHover(false)}
                      disabled={disconnectLoading}
                      className="transition-transform hover:scale-105"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: disconnectLoading ? 0.5 : 1 }}
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
    </>
  );
};

export default ExpertMyMinis;