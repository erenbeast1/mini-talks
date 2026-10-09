// src/components/dashboard/CustomMinisManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AlertPopup, ConfirmPopup } from '../popups/AlertSystem';

import LogoHead from '../../assets/logo-head.png';
import LogoText from '../../assets/logo-text.png';
import MiniImage from '../../assets/custommini/Mini_image.png';
import LeftBtn from '../../assets/custommini/Left_btn.png';
import RightBtn from '../../assets/custommini/Right_btn.png';
import minisEnvironment from '../../assets/Minis Environment Image.png';
import BrickBorder from '../../assets/12-sari.png';

const COLORS = {
  yellow: '#FFCC00',
  white: '#FFFFFF',
  blue: '#0055BF',
  red: '#E52828',
  black: '#1A1A1A',
  green: '#237841',
  gray: '#D8D8D8',
  darkGray: '#666666',
};

const CustomMinisManager = ({ isOpen, onClose, miniId, parentId }) => {
  const [minis, setMinis] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [mSlide, setMSlide] = useState(0); // mobil carousel kaydırma konumu
  const [loading, setLoading] = useState(true);
  const [okHover, setOkHover] = useState(false);
  
  // Alert/Confirm popup states
  const [alertPopup, setAlertPopup] = useState({ show: false, title: '', message: '', theme: 'info' });
  const [confirmPopup, setConfirmPopup] = useState({ show: false, title: '', message: '', miniToDelete: null });
  
  // Drag & Drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [edgeHover, setEdgeHover] = useState(null); // 'left' | 'right' | null
  const edgeTimerRef = React.useRef(null);

  // Mobil touch-drag state
  const [touchDragIndex, setTouchDragIndex] = useState(null);   // sürüklenen kartın global index'i
  const [touchOverIndex, setTouchOverIndex] = useState(null);   // üzerine gelinen kart
  const longPressTimerRef = useRef(null);
  const touchDragActiveRef = useRef(false);
  const cardRefs = useRef({});

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

  // Mobil carousel — görünür kart genişliği ölçümü
  const carouselRef = useRef(null);
  const [carouselW, setCarouselW] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (carouselRef.current) setCarouselW(carouselRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', () => setTimeout(measure, 180));
    const t = setTimeout(measure, 220);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [screenSize, loading]);

  // Boyut değişince mobil carousel başa sar
  useEffect(() => {
    setMSlide(0);
  }, [screenSize, carouselW]);

  const itemsPerPage = 4;
  const totalPages = Math.ceil(minis.length / itemsPerPage);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (edgeTimerRef.current) {
        clearTimeout(edgeTimerRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && miniId) {
      fetchMinis();
    }
  }, [isOpen, miniId]);

  const fetchMinis = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/custommini/get-custom-minis.php?mini_id=${miniId}&include_hidden=true`
      );
      if (response.data.success && response.data.data?.minis) {
        setMinis(response.data.data.minis);
        setSelectedIndex(0);
      } else {
        setMinis([]);
      }
    } catch (error) {
      console.error('Failed to fetch minis:', error);
      setMinis([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    const selectedMini = isSmallScreen ? minis[selectedIndex] : getVisibleMinis()[selectedIndex];
    if (!selectedMini) return;
    
    setConfirmPopup({
      show: true,
      title: 'Delete Confirmation',
      message: `Are you sure you want to delete "${selectedMini.name || 'this Mini'}"?\nThis action cannot be undone.`,
      miniToDelete: selectedMini
    });
  };

  const handleConfirmDelete = async () => {
    const miniToDelete = confirmPopup.miniToDelete;
    setConfirmPopup({ ...confirmPopup, show: false, miniToDelete: null });
    
    if (!miniToDelete) return;
    
    try {
      await axios.post('https://mini-talks.org/minitalks-api/custommini/update-custom-mini.php', {
        custom_mini_id: miniToDelete.id,
        action: 'delete'
      });
      await fetchMinis();
      setAlertPopup({ show: true, title: 'Success!', message: 'Mini deleted successfully!', theme: 'success' });
    } catch (error) {
      console.error('Failed to delete mini:', error);
      setAlertPopup({ show: true, title: 'Oops!', message: 'Failed to delete mini', theme: 'error' });
    }
  };

  const handleCancelDelete = () => {
    setConfirmPopup({ ...confirmPopup, show: false, miniToDelete: null });
  };

  const handleToggleVisibility = async () => {
    const selectedMini = isSmallScreen ? minis[selectedIndex] : getVisibleMinis()[selectedIndex];
    if (!selectedMini) return;
    
    try {
      await axios.post('https://mini-talks.org/minitalks-api/custommini/update-custom-mini.php', {
        custom_mini_id: selectedMini.id,
        action: selectedMini.is_hidden ? 'unhide' : 'hide'
      });
      fetchMinis();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, index) => {
    const globalIndex = currentPage * itemsPerPage + index;
    setDraggedItem(globalIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverItem(null);
    setEdgeHover(null);
    if (edgeTimerRef.current) {
      clearTimeout(edgeTimerRef.current);
      edgeTimerRef.current = null;
    }
  };

  // Edge zone hover - sayfa değiştirme
  const handleEdgeDragEnter = (edge) => {
    if (draggedItem === null) return;
    setEdgeHover(edge);
    
    // 500ms bekle sonra sayfa değiştir
    edgeTimerRef.current = setTimeout(() => {
      if (edge === 'left' && currentPage > 0) {
        setCurrentPage(prev => prev - 1);
      } else if (edge === 'right' && currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
      }
      setEdgeHover(null);
    }, 500);
  };

  const handleEdgeDragLeave = () => {
    setEdgeHover(null);
    if (edgeTimerRef.current) {
      clearTimeout(edgeTimerRef.current);
      edgeTimerRef.current = null;
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    const globalIndex = currentPage * itemsPerPage + index;
    if (draggedItem !== globalIndex) {
      setDragOverItem(globalIndex);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    const globalDropIndex = currentPage * itemsPerPage + dropIndex;
    
    if (draggedItem === null || draggedItem === globalDropIndex) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Yeni sıralamayı oluştur
    const newMinis = [...minis];
    const draggedMini = newMinis[draggedItem];
    
    // Elemanı eski yerinden çıkar
    newMinis.splice(draggedItem, 1);
    
    // Yeni yerine ekle
    const adjustedDropIndex = draggedItem < globalDropIndex ? globalDropIndex - 1 : globalDropIndex;
    newMinis.splice(adjustedDropIndex, 0, draggedMini);
    
    // State güncelle
    setMinis(newMinis);
    setDraggedItem(null);
    setDragOverItem(null);
    
    // Backend'e gönder - tüm sıralamayı güncelle
    try {
      const orderUpdates = newMinis.map((mini, idx) => ({
        custom_mini_id: mini.id,
        new_order: idx + 1
      }));
      
      await axios.post('https://mini-talks.org/minitalks-api/custommini/update-custom-mini.php', {
        action: 'bulk_update_order',
        updates: orderUpdates
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      // Hata durumunda yeniden fetch et
      fetchMinis();
    }
  };

  // Ortak: yeni sıraya göre state güncelle + backend'e kaydet
  const applyReorder = async (fromIndex, toIndex) => {
    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    const newMinis = [...minis];
    const moved = newMinis[fromIndex];
    newMinis.splice(fromIndex, 1);
    const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex;
    newMinis.splice(adjusted, 0, moved);
    setMinis(newMinis);
    try {
      const orderUpdates = newMinis.map((mini, idx) => ({ custom_mini_id: mini.id, new_order: idx + 1 }));
      await axios.post('https://mini-talks.org/minitalks-api/custommini/update-custom-mini.php', {
        action: 'bulk_update_order',
        updates: orderUpdates
      });
    } catch (error) {
      console.error('Failed to update order:', error);
      fetchMinis();
    }
  };

  // ── Mobil touch-drag (parmakla basılı tut + sürükle) ──
  const handleTouchStartCard = (e, globalIndex) => {
    // long-press ile sürükleme modunu başlat (250ms)
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    touchDragActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      touchDragActiveRef.current = true;
      setTouchDragIndex(globalIndex);
      setTouchOverIndex(globalIndex);
      if (navigator.vibrate) navigator.vibrate(15);
    }, 250);
    // başlangıç pozisyonunu sakla (move'da sapma kontrolü için)
    e.currentTarget._startX = startX;
    e.currentTarget._startY = startY;
  };

  const handleTouchMoveCard = (e) => {
    // long-press henüz dolmadıysa ve parmak kaydıysa → iptal (carousel/scroll serbest)
    if (!touchDragActiveRef.current) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }
    // Sürükleme aktif: parmağın altındaki kartı bul
    e.preventDefault();
    const touch = e.touches[0];

    // Kenar tespiti — görünür alanın sağ/sol kenarına gelince carousel'i kaydır
    if (carouselRef.current) {
      const rect = carouselRef.current.getBoundingClientRect();
      const edgeZone = 50; // kenar bölgesi px
      const nearLeft = touch.clientX < rect.left + edgeZone;
      const nearRight = touch.clientX > rect.right - edgeZone;
      if (nearRight && !edgeTimerRef.current) {
        edgeTimerRef.current = setTimeout(() => {
          setMSlide(s => Math.min(mMaxSlide, s + 1));
          edgeTimerRef.current = null;
        }, 350);
      } else if (nearLeft && !edgeTimerRef.current) {
        edgeTimerRef.current = setTimeout(() => {
          setMSlide(s => Math.max(0, s - 1));
          edgeTimerRef.current = null;
        }, 350);
      } else if (!nearLeft && !nearRight && edgeTimerRef.current) {
        clearTimeout(edgeTimerRef.current);
        edgeTimerRef.current = null;
      }
    }

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const cardEl = el.closest('[data-card-index]');
    if (cardEl) {
      const idx = parseInt(cardEl.getAttribute('data-card-index'), 10);
      if (!isNaN(idx)) setTouchOverIndex(idx);
    }
  };

  const handleTouchEndCard = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (edgeTimerRef.current) {
      clearTimeout(edgeTimerRef.current);
      edgeTimerRef.current = null;
    }
    if (touchDragActiveRef.current && touchDragIndex !== null && touchOverIndex !== null) {
      applyReorder(touchDragIndex, touchOverIndex);
    }
    touchDragActiveRef.current = false;
    setTouchDragIndex(null);
    setTouchOverIndex(null);
  };

  const getVisibleMinis = () => {
    const start = currentPage * itemsPerPage;
    return minis.slice(start, start + itemsPerPage);
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      setSelectedIndex(0);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      setSelectedIndex(0);
    }
  };

  // Görüntülenecek resmi al
  const getDisplayImage = (mini) => {
    if (mini.image_url) return mini.image_url;
    if (mini.display_image) return mini.display_image;
    if (mini.scene_image) return mini.scene_image;
    return MiniImage;
  };

  // Sahne arkaplan resmini al
  const getSceneBackground = (mini) => {
    if (mini.scene_background) return mini.scene_background;
    if (mini.scene_image) return mini.scene_image;
    return minisEnvironment;
  };

  // Action Button Component
  const ActionButton = ({ label, onClick, variant = 'default' }) => {
    const [hover, setHover] = useState(false);
    const styles = {
      default: { bg: COLORS.white, border: COLORS.black, color: COLORS.black },
      danger: { bg: COLORS.white, border: COLORS.red, color: COLORS.red },
      success: { bg: COLORS.white, border: COLORS.green, color: COLORS.green },
    };
    const style = styles[variant];
    
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="cmm-action-btn"
        style={{
          backgroundColor: hover ? style.border : style.bg,
          border: `2px solid ${style.border}`,
          color: hover ? COLORS.white : style.color,
        }}
      >
        {label}
      </button>
    );
  };

  if (!isOpen) return null;

  const visibleMinis = getVisibleMinis();
  const selectedMini = isSmallScreen ? minis[selectedIndex] : visibleMinis[selectedIndex];

  // ── Mobil carousel hesabı (MiniManage tarzı, dinamik) ──
  const cardGap = 12;
  const carouselSidePad = 40 * 2; // okların yatay payı
  const usableW = Math.max(0, carouselW - carouselSidePad);
  const mCardMinW = 170;                            // bir kartın minimum genişliği
  const mVisibleCards = (usableW > 0)
    ? Math.max(1, Math.floor((usableW + cardGap) / (mCardMinW + cardGap)))
    : 3;
  const mCardW = (mVisibleCards > 0 && usableW > 0)
    ? (usableW - (mVisibleCards - 1) * cardGap) / mVisibleCards
    : mCardMinW;
  const mViewportW = mCardW * mVisibleCards + (mVisibleCards - 1) * cardGap;
  const mMaxSlide = Math.max(0, minis.length - mVisibleCards);

  const styles = `
    .cmm-overlay {
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
    .cmm-modal-wrapper {
      position: relative;
      width: 96vw;
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
    .cmm-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .cmm-modal {
      width: 100%;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.yellow};
      border-radius: 15px 15px 15px 15px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
    }
    .cmm-header {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 12px;
      padding: 15px 0 12px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .cmm-content {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.white};
      border-radius: 18px;
      margin: 0 15px 15px;
      padding: 25px 35px;
      border: 3px solid ${COLORS.yellow};
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
    .cmm-title-row {
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
    .cmm-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .cmm-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .cmm-ok-btn {
      background: ${COLORS.blue};
      color: ${COLORS.white};
      border: none;
      border-radius: 10px;
      padding: 12px 30px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .cmm-ok-btn:hover {
      background: #0066CC;
    }
    .cmm-pagination {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 6px;
      margin-top: 16px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .cmm-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .cmm-carousel {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
    }
    .cmm-nav-wrapper {
      position: relative;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .cmm-nav-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      -webkit-appearance: none;
      appearance: none;
    }
    .cmm-nav-btn:disabled {
      cursor: default;
      opacity: 0.3;
    }
    .cmm-edge-indicator {
      position: absolute;
      top: -50px;
      bottom: -50px;
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
      -webkit-transition: all 0.2s;
      transition: all 0.2s;
      pointer-events: none;
      z-index: 10;
    }
    .cmm-edge-indicator.left {
      left: -20px;
      right: -10px;
    }
    .cmm-edge-indicator.right {
      left: -10px;
      right: -20px;
    }
    .cmm-cards-container {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 16px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      padding: 4px;
      min-width: 0;
      -webkit-min-width: 0;
    }
    .cmm-card {
      width: 220px;
      min-width: 180px;
      border-radius: 16px;
      overflow: hidden;
      cursor: grab;
      -webkit-transition: all 0.2s ease;
      transition: all 0.2s ease;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .cmm-card-handle {
      height: 8px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 4px;
      padding: 4px 0;
    }
    .cmm-card-image {
      height: 250px;
      margin: 8px;
      border-radius: 12px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: flex-end;
      -webkit-align-items: flex-end;
      align-items: flex-end;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      overflow: hidden;
    }
    .cmm-card-image img {
      max-width: 85%;
      max-height: 90%;
      -o-object-fit: contain;
      object-fit: contain;
      pointer-events: none;
    }
    .cmm-card-info {
      padding: 12px;
      text-align: center;
      position: relative;
    }
    .cmm-card-name {
      font-size: 14px;
      font-weight: 700;
      color: ${COLORS.black};
    }
    .cmm-card-hidden {
      font-size: 11px;
      color: ${COLORS.darkGray};
      margin-top: 4px;
    }
    .cmm-actions {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 20px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-flex-wrap: wrap;
      flex-wrap: wrap;
    }
    .cmm-action-btn {
      padding: 12px 28px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      -webkit-transition: all 0.2s;
      transition: all 0.2s;
      min-width: 150px;
      -webkit-appearance: none;
      appearance: none;
    }
    .cmm-loading {
      padding: 60px;
      color: ${COLORS.darkGray};
      text-align: center;
    }

    /* ════ MOBİL ════ */
    .cmm-mobile-overlay {
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
    .cmm-m-content {
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
    .cmm-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 6px;
    }
    .cmm-m-carousel {
      position: relative;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
      overflow: hidden;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      padding: 0 40px;
    }
    .cmm-m-card {
      border-radius: 14px;
      overflow: hidden;
      min-width: 0;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .cmm-m-card-image {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      margin: 6px;
      border-radius: 10px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: flex-end;
      -webkit-align-items: flex-end;
      align-items: flex-end;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      background-size: cover;
      background-position: center;
      overflow: hidden;
    }
    .cmm-m-card-image img {
      max-width: 85%;
      max-height: 92%;
      object-fit: contain;
    }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    const mSafe = Math.min(mSlide, mMaxSlide);
    return (
      <div className="cmm-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="cmm-m-content">
          {/* Başlık */}
          <div className="cmm-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Customized Minis Manager
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
              Select one of your Minis below and manage its display order, visibility, or deletion options.
            </p>
          </div>

          {loading ? (
            <div className="cmm-loading">Loading...</div>
          ) : minis.length === 0 ? (
            <div className="cmm-loading">No customized minis yet</div>
          ) : (
            <div ref={carouselRef} className="cmm-m-carousel">
              {/* Sol ok */}
              <button
                onClick={() => mMaxSlide > 0 && setMSlide(Math.max(0, mSafe - 1))}
                disabled={mSafe === 0}
                style={{
                  position: 'absolute', left: '2px', zIndex: 5,
                  background: 'none', border: 'none', padding: 0,
                  cursor: mSafe === 0 ? 'default' : 'pointer', opacity: mSafe === 0 ? 0.25 : 1,
                  WebkitAppearance: 'none'
                }}
              >
                <img src={LeftBtn} alt="Previous" style={{ width: '26px', height: '26px' }} />
              </button>

              {/* Görünür alan — tam kart genişliğine kırpılı */}
              <div style={{
                overflow: 'hidden',
                width: usableW > 0 ? `${mViewportW}px` : '100%',
                maxWidth: '100%', margin: '0 auto', height: '100%',
                display: 'flex', alignItems: 'stretch'
              }}>
                <div style={{
                  display: 'flex', gap: `${cardGap}px`, height: '100%',
                  transform: `translateX(-${mSafe * (mCardW + cardGap)}px)`,
                  transition: 'transform 0.3s ease',
                  alignItems: 'stretch'
                }}>
                  {minis.map((mini, index) => {
                    const isSelected = index === selectedIndex;
                    const isDragging = touchDragIndex === index;
                    const isDragOver = touchDragIndex !== null && touchOverIndex === index && touchDragIndex !== index;
                    return (
                      <div
                        key={mini.id}
                        data-card-index={index}
                        onClick={() => { if (!touchDragActiveRef.current) setSelectedIndex(index); }}
                        onTouchStart={(e) => handleTouchStartCard(e, index)}
                        onTouchMove={handleTouchMoveCard}
                        onTouchEnd={handleTouchEndCard}
                        className="cmm-m-card"
                        style={{
                          width: `${mCardW}px`,
                          height: '100%',
                          backgroundColor: isSelected ? COLORS.yellow : COLORS.white,
                          border: isDragOver
                            ? `3px dashed ${COLORS.blue}`
                            : isSelected ? `3px solid ${COLORS.yellow}` : `2px solid ${COLORS.gray}`,
                          opacity: mini.is_hidden ? 0.6 : (isDragging ? 0.4 : 1),
                          transform: 'scale(1)',
                          boxShadow: isDragOver ? `inset 0 0 0 3px ${COLORS.blue}` : 'none',
                          transition: 'opacity 0.15s, box-shadow 0.15s',
                          WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none'
                        }}
                      >
                        <div className="cmm-m-card-image" style={{ backgroundImage: `url(${getSceneBackground(mini)})` }}>
                          <img src={getDisplayImage(mini)} alt={mini.scene_name} draggable={false} />
                        </div>
                        <div style={{ padding: '6px', textAlign: 'center', backgroundColor: isSelected ? COLORS.yellow : COLORS.white, flexShrink: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.black }}>{mini.scene_name || 'Scene'}</div>
                          {mini.is_hidden && <div style={{ fontSize: '9px', color: COLORS.darkGray }}>(Hidden)</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sağ ok */}
              <button
                onClick={() => mMaxSlide > 0 && setMSlide(Math.min(mMaxSlide, mSafe + 1))}
                disabled={mSafe >= mMaxSlide}
                style={{
                  position: 'absolute', right: '2px', zIndex: 5,
                  background: 'none', border: 'none', padding: 0,
                  cursor: mSafe >= mMaxSlide ? 'default' : 'pointer', opacity: mSafe >= mMaxSlide ? 0.25 : 1,
                  WebkitAppearance: 'none'
                }}
              >
                <img src={RightBtn} alt="Next" style={{ width: '26px', height: '26px' }} />
              </button>
            </div>
          )}

          {/* Nokta göstergesi */}
          {!loading && minis.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '7px', padding: '6px 0', minHeight: '20px', flexShrink: 0 }}>
              {Array.from({ length: mMaxSlide + 1 }, (_, i) => (
                <button key={i} onClick={() => setMSlide(i)} style={{
                  width: i === mSafe ? '24px' : '8px', height: '8px', borderRadius: '4px',
                  background: i === mSafe ? COLORS.black : COLORS.gray, border: 'none', padding: 0,
                  cursor: 'pointer', WebkitAppearance: 'none', flexShrink: 0
                }} />
              ))}
            </div>
          )}

          {/* Action butonları */}
          {!loading && minis.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexShrink: 0, flexWrap: 'wrap', paddingTop: '4px' }}>
              <button onClick={handleDelete} style={{
                flex: '0 1 130px', background: COLORS.white, border: `2px solid ${COLORS.red}`,
                color: COLORS.red, borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
              }}>
                Delete Mini
              </button>
              <button onClick={handleToggleVisibility} style={{
                flex: '0 1 130px', background: COLORS.white, border: `2px solid ${COLORS.black}`,
                color: COLORS.black, borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
              }}>
                {selectedMini?.is_hidden ? 'Unhide Mini' : 'Hide Mini'}
              </button>
              <button onClick={onClose} style={{
                flex: '0 1 100px', background: COLORS.blue, border: 'none',
                color: COLORS.white, borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
              }}>
                Ok
              </button>
            </div>
          )}
        </div>

        {/* Alert / Confirm popup */}
        <AlertPopup
          show={alertPopup.show}
          onClose={() => setAlertPopup({ ...alertPopup, show: false })}
          title={alertPopup.title}
          message={alertPopup.message}
          theme={alertPopup.theme}
        />
        <ConfirmPopup
          show={confirmPopup.show}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          title={confirmPopup.title}
          message={confirmPopup.message}
          theme="error"
          confirmTheme="danger"
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="cmm-overlay">
      <style>{styles}</style>
      
      <div className="cmm-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="cmm-brick-border" />
        
        <div className="cmm-modal">
          {/* Header */}
          <div className="cmm-header">
            <img src={LogoHead} alt="" style={{ height: '45px' }} />
            <img src={LogoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* Content */}
          <div className="cmm-content">
            {/* Title Row */}
            <div className="cmm-title-row">
              <div className="cmm-btn-spacer" />
              <div className="cmm-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0 }}>
                  Customized Minis Manager
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '600px' }}>
                  Drag and drop cards to reorder. Click to select, then use buttons below to manage.
                </p>
              </div>
              <button
                onClick={onClose}
                className="cmm-ok-btn"
              >
                Ok
              </button>
            </div>

            {/* Carousel - DRAG & DROP */}
            <div className="cmm-carousel">
              {/* Left Arrow + Drop Zone */}
              <div
                className="cmm-nav-wrapper"
                onDragEnter={() => handleEdgeDragEnter('left')}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleEdgeDragLeave}
              >
                {/* Drop Zone Indicator */}
                {draggedItem !== null && currentPage > 0 && (
                  <div 
                    className="cmm-edge-indicator left"
                    style={{
                      backgroundColor: edgeHover === 'left' ? 'rgba(0,85,191,0.2)' : 'transparent',
                      border: edgeHover === 'left' ? `3px dashed ${COLORS.blue}` : '3px dashed transparent',
                    }}
                  >
                    {edgeHover === 'left' && (
                      <span style={{ color: COLORS.blue, fontWeight: 700, fontSize: '24px' }}>◀</span>
                    )}
                  </div>
                )}
                <button
                  onClick={handlePrev}
                  disabled={currentPage === 0}
                  className="cmm-nav-btn"
                >
                  <img src={LeftBtn} alt="Previous" style={{ width: '26px', height: '26px' }} />
                </button>
              </div>

              {/* Mini Cards */}
              <div className="cmm-cards-container">
                {loading ? (
                  <div className="cmm-loading">Loading...</div>
                ) : visibleMinis.length === 0 ? (
                  <div className="cmm-loading">No customized minis yet</div>
                ) : (
                  visibleMinis.map((mini, index) => {
                    const isSelected = index === selectedIndex;
                    const globalIndex = currentPage * itemsPerPage + index;
                    const isDragging = draggedItem === globalIndex;
                    const isDragOver = dragOverItem === globalIndex;
                    
                    return (
                      <div
                        key={mini.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => setSelectedIndex(index)}
                        className="cmm-card"
                        style={{
                          backgroundColor: isSelected ? COLORS.yellow : COLORS.white,
                          border: isDragOver 
                            ? `4px dashed ${COLORS.blue}` 
                            : isSelected 
                              ? `4px solid ${COLORS.yellow}` 
                              : `3px solid ${COLORS.gray}`,
                          opacity: mini.is_hidden ? 0.6 : isDragging ? 0.5 : 1,
                          transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isDragOver ? '0 8px 20px rgba(0,85,191,0.3)' : 'none'
                        }}
                      >
                        {/* Drag Handle Indicator */}
                        <div 
                          className="cmm-card-handle"
                          style={{ backgroundColor: isSelected ? COLORS.yellow : COLORS.gray }}
                        >
                          <span style={{ fontSize: '10px', color: COLORS.darkGray }}>⋮⋮</span>
                        </div>
                        
                        {/* Mini Image with Scene Background */}
                        <div 
                          className="cmm-card-image"
                          style={{ 
                            backgroundImage: `url(${getSceneBackground(mini)})`
                          }}
                        >
                          <img
                            src={getDisplayImage(mini)}
                            alt={mini.scene_name}
                          />
                        </div>
                        
                        {/* Scene Name */}
                        <div 
                          className="cmm-card-info"
                          style={{ backgroundColor: isSelected ? COLORS.yellow : COLORS.white }}
                        >
                          <div className="cmm-card-name">
                            {mini.scene_name || 'Scene'}
                          </div>
                          {mini.is_hidden && (
                            <div className="cmm-card-hidden">(Hidden)</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Arrow + Drop Zone */}
              <div
                className="cmm-nav-wrapper"
                onDragEnter={() => handleEdgeDragEnter('right')}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleEdgeDragLeave}
              >
                {/* Drop Zone Indicator */}
                {draggedItem !== null && currentPage < totalPages - 1 && (
                  <div 
                    className="cmm-edge-indicator right"
                    style={{
                      backgroundColor: edgeHover === 'right' ? 'rgba(0,85,191,0.2)' : 'transparent',
                      border: edgeHover === 'right' ? `3px dashed ${COLORS.blue}` : '3px dashed transparent',
                    }}
                  >
                    {edgeHover === 'right' && (
                      <span style={{ color: COLORS.blue, fontWeight: 700, fontSize: '24px' }}>▶</span>
                    )}
                  </div>
                )}
                <button
                  onClick={handleNext}
                  disabled={currentPage >= totalPages - 1}
                  className="cmm-nav-btn"
                >
                  <img src={RightBtn} alt="Next" style={{ width: '26px', height: '26px' }} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="cmm-actions">
              <ActionButton 
                label="Delete Mini" 
                onClick={handleDelete}
                variant="danger"
              />
              <ActionButton 
                label={selectedMini?.is_hidden ? "Unhide Mini" : "Hide Mini"} 
                onClick={handleToggleVisibility}
                variant="default"
              />
            </div>

            {/* Pagination Dots - En altta */}
            {totalPages > 1 && (
              <div className="cmm-pagination">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => { setCurrentPage(i); setSelectedIndex(0); }}
                    className="cmm-dot"
                    style={{ backgroundColor: i === currentPage ? COLORS.black : COLORS.gray }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Popup */}
      <AlertPopup
        show={alertPopup.show}
        onClose={() => setAlertPopup({ ...alertPopup, show: false })}
        title={alertPopup.title}
        message={alertPopup.message}
        theme={alertPopup.theme}
      />

      {/* Confirm Popup */}
      <ConfirmPopup
        show={confirmPopup.show}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title={confirmPopup.title}
        message={confirmPopup.message}
        theme="error"
        confirmTheme="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CustomMinisManager;