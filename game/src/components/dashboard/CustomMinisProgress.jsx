// src/components/dashboard/CustomMinisProgress.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import LogoHead from '../../assets/logo-head.png';
import LogoText from '../../assets/logo-text.png';
import MiniImage from '../../assets/custommini/Mini_image.png';
import LeftBtn from '../../assets/custommini/Left_btn.png';
import RightBtn from '../../assets/custommini/Right_btn.png';
import LongestRecordingSticker from '../../assets/custommini/Longest_Recording_Sticker.png';
import minisEnvironment from '../../assets/Minis Environment Image.png';
import BrickBorder from '../../assets/12-sari.png';

const COLORS = {
  yellow: '#FFCC00',
  white: '#FFFFFF',
  blue: '#0055BF',
  black: '#1A1A1A',
  gray: '#D8D8D8',
  darkGray: '#666666',
};

const CustomMinisProgress = ({ isOpen, onClose, miniId, entityType = 'mini' }) => {
  const [minis, setMinis] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    characterTypes: { female: 0, male: 0, child: 0 }
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mobil: tek kart index'i
  const [mIndex, setMIndex] = useState(0);

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

  // entityType'a göre entityId belirle
  const entityId = miniId;

  const itemsPerPage = 3;

  useEffect(() => {
    if (isOpen && entityId) {
      fetchProgress();
    }
  }, [isOpen, entityId]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const apiUrl = entityType === 'builder'
        ? `https://mini-talks.org/minitalks-api/builder/get-customizations.php?builder_id=${entityId}`
        : `https://mini-talks.org/minitalks-api/custommini/get-custom-minis.php?mini_id=${entityId}`;
      const response = await axios.get(apiUrl);
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        // Builder API farklı format dönebilir, uyumlu hale getir
        const minisData = data.minis || data;
        setMinis(Array.isArray(minisData) ? minisData : []);
        setStats({
          total: data.stats?.total || (Array.isArray(minisData) ? minisData.length : 0),
          thisWeek: data.stats?.this_week || 0,
          thisMonth: data.stats?.this_month || 0,
          characterTypes: data.stats?.types || { female: 0, male: 0, child: 0 }
        });
      } else {
        setMinis([]);
        setStats({ total: 0, thisWeek: 0, thisMonth: 0, characterTypes: { female: 0, male: 0, child: 0 } });
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
      setMinis([]);
      setStats({ total: 0, thisWeek: 0, thisMonth: 0, characterTypes: { female: 0, male: 0, child: 0 } });
    } finally {
      setLoading(false);
    }
  };

  const getVisibleMinis = () => {
    const start = currentPage * itemsPerPage;
    return minis.slice(start, start + itemsPerPage);
  };

  const totalPages = Math.ceil(minis.length / itemsPerPage);

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return '00:00';
    }
    const secs = parseInt(seconds, 10);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  const formatLevelsUsed = (levels) => {
    if (!levels) return '-';
    if (Array.isArray(levels)) {
      return levels.length > 0 ? levels.join(', ') : '-';
    }
    if (typeof levels === 'string') {
      return levels || '-';
    }
    return '-';
  };

  // Görüntülenecek resmi al (screenshot > scene_image > default)
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

  if (!isOpen) return null;

  const visibleMinis = getVisibleMinis();

  const styles = `
    .cmp-overlay {
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
    .cmp-modal-wrapper {
      position: relative;
      width: 98vw;
      max-width: 1500px;
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
    .cmp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .cmp-modal {
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
    .cmp-header {
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
    .cmp-content {
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
    .cmp-title-row {
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
    .cmp-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .cmp-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .cmp-ok-btn {
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
      font-family: 'Montserrat', sans-serif;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .cmp-ok-btn:hover {
      background: #0066CC;
    }
    .cmp-pagination {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 6px;
      margin-bottom: 16px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .cmp-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      cursor: pointer;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .cmp-carousel {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
    }
    .cmp-nav-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-appearance: none;
      appearance: none;
    }
    .cmp-nav-btn:disabled {
      cursor: default;
      opacity: 0.3;
    }
    .cmp-cards-container {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 16px 1fr 16px 1fr;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      -webkit-min-width: 0;
      padding: 4px;
    }
    .cmp-card {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      border-radius: 14px;
      overflow: hidden;
      position: relative;
      width: 100%;
      cursor: pointer;
      -webkit-transition: all 0.2s ease;
      transition: all 0.2s ease;
    }
    .cmp-card-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 10;
    }
    .cmp-card-image {
      width: 45%;
      min-width: 120px;
      max-width: 180px;
      aspect-ratio: 3/4;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      border-radius: 10px;
      margin: 8px;
    }
    .cmp-card-image img {
      width: 100%;
      height: 100%;
      -o-object-fit: contain;
      object-fit: contain;
      border-radius: 10px;
    }
    .cmp-card-info {
      padding: 14px 14px 14px 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
    }
    .cmp-card-field {
      margin-bottom: 10px;
    }
    .cmp-card-field:last-child {
      margin-bottom: 0;
    }
    .cmp-card-label {
      font-size: 12px;
      font-weight: 600;
      color: ${COLORS.darkGray};
      font-family: 'Montserrat', sans-serif;
    }
    .cmp-card-value {
      font-size: 14px;
      font-weight: 700;
      color: ${COLORS.black};
      font-family: 'Montserrat', sans-serif;
    }
    .cmp-card-value.scene {
      font-size: 16px;
      font-weight: 800;
    }
    .cmp-stats-row {
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
    .cmp-stats-card {
      width: 280px;
      background: ${COLORS.blue};
      border-radius: 12px;
      overflow: hidden;
    }
    .cmp-stats-header {
      padding: 12px 16px;
      border-bottom: 3px solid rgba(255,255,255,0.5);
    }
    .cmp-stats-title {
      color: ${COLORS.white};
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      font-family: 'Montserrat', sans-serif;
    }
    .cmp-stats-body {
      padding: 10px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 8px;
    }
    .cmp-stats-item {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      justify-content: space-between;
      padding: 10px 14px;
      background: ${COLORS.white};
      border-radius: 8px;
    }
    .cmp-stats-label {
      font-size: 14px;
      font-weight: 600;
      color: ${COLORS.blue};
      font-family: 'Montserrat', sans-serif;
    }
    .cmp-stats-value {
      font-size: 14px;
      font-weight: 800;
      font-family: 'Montserrat', sans-serif;
    }
    .cmp-loading {
      padding: 40px;
      color: ${COLORS.darkGray};
      text-align: center;
      font-size: 16px;
      font-family: 'Montserrat', sans-serif;
    }

    /* ════ MOBİL ════ */
    .cmp-mobile-overlay {
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
    .cmp-m-content {
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
    .cmp-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 6px;
    }
    .cmp-m-main {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 10px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      -webkit-min-height: 0;
    }
    .cmp-m-stats {
      width: 38%;
      max-width: 280px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
      -webkit-min-height: 0;
      height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .cmp-m-right {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
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
    .cmp-m-cardarea {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      position: relative;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      padding: 0 38px;
    }
    .cmp-m-card {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      height: 100%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      border-radius: 14px;
      overflow: hidden;
      min-width: 0;
    }
    .cmp-m-card-image {
      width: 46%;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin: 8px;
      border-radius: 10px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      background-size: cover;
      background-position: center;
      overflow: hidden;
    }
    .cmp-m-card-image img {
      width: 100%; height: 100%;
      object-fit: contain;
    }
    .cmp-m-card-info {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      padding: 10px 10px 10px 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 7px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    const mSafe = minis.length > 0 ? Math.min(mIndex, minis.length - 1) : 0;
    const mMini = minis[mSafe];
    return (
      <div className="cmp-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="cmp-m-content">
          {/* Başlık */}
          <div className="cmp-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Customized Minis Progress
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
              View each Customized Mini's scenes, levels, recording times, and overall design style here.
            </p>
          </div>

          {loading ? (
            <div className="cmp-loading">Loading...</div>
          ) : (
            <div className="cmp-m-main">
              {/* SOL — 2 stats kartı (üst üste, tam sayfa boyu) */}
              <div className="cmp-m-stats">
                <div className="cmp-stats-card" style={{ flexShrink: 0 }}>
                  <div className="cmp-stats-header" style={{ padding: '6px 10px', borderBottomWidth: '2px' }}>
                    <span className="cmp-stats-title" style={{ fontSize: '10px' }}>Number of Minis Customized</span>
                  </div>
                  <div className="cmp-stats-body" style={{ padding: '6px', gap: '5px' }}>
                    {[
                      { label: 'Total:', value: stats.total },
                      { label: 'This Week:', value: stats.thisWeek },
                      { label: 'This Month:', value: stats.thisMonth }
                    ].map((item, i) => (
                      <div key={i} className="cmp-stats-item" style={{ padding: '6px 9px' }}>
                        <span className="cmp-stats-label" style={{ fontSize: '11px' }}>{item.label}</span>
                        <span className="cmp-stats-value" style={{ fontSize: '11px' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="cmp-stats-card" style={{ flexShrink: 0 }}>
                  <div className="cmp-stats-header" style={{ padding: '6px 10px', borderBottomWidth: '2px' }}>
                    <span className="cmp-stats-title" style={{ fontSize: '10px' }}>Mini Character Types</span>
                  </div>
                  <div className="cmp-stats-body" style={{ padding: '6px', gap: '5px' }}>
                    {[
                      { label: 'Female:', value: stats.characterTypes?.female || 0 },
                      { label: 'Male:', value: stats.characterTypes?.male || 0 },
                      { label: 'Child:', value: stats.characterTypes?.child || 0 }
                    ].map((item, i) => (
                      <div key={i} className="cmp-stats-item" style={{ padding: '6px 9px' }}>
                        <span className="cmp-stats-label" style={{ fontSize: '11px' }}>{item.label}</span>
                        <span className="cmp-stats-value" style={{ fontSize: '11px' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SAĞ — dikey kolon: kart (flex:1) + altında ortalı sayaç/ok */}
              <div className="cmp-m-right">
                <div className="cmp-m-cardarea">
                  {minis.length === 0 ? (
                    <div className="cmp-loading">No customized minis yet</div>
                  ) : (
                    <>
                      {/* Sol ok */}
                      <button
                        onClick={() => setMIndex(Math.max(0, mSafe - 1))}
                        disabled={mSafe === 0}
                        style={{
                          position: 'absolute', left: '2px', zIndex: 5,
                          background: 'none', border: 'none', padding: 0,
                          cursor: mSafe === 0 ? 'default' : 'pointer', opacity: mSafe === 0 ? 0.25 : 1,
                          WebkitAppearance: 'none'
                        }}
                      >
                        <img src={LeftBtn} alt="Previous" style={{ width: '28px', height: '28px' }} />
                      </button>

                      {/* Kart */}
                      <div className="cmp-m-card" style={{
                        backgroundColor: COLORS.yellow,
                        border: `3px solid ${COLORS.yellow}`
                      }}>
                        {mMini.is_longest && (
                          <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10 }}>
                            <img src={LongestRecordingSticker} alt="Longest Recording" style={{ height: '24px' }} />
                          </div>
                        )}
                        <div className="cmp-m-card-image" style={{ backgroundImage: `url(${getSceneBackground(mMini)})` }}>
                          <img src={getDisplayImage(mMini)} alt={mMini.scene_name} />
                        </div>
                        <div className="cmp-m-card-info">
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.darkGray }}>Scene:</div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.black }}>{mMini.scene_name || '-'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.darkGray }}>Levels Used:</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.black }}>{formatLevelsUsed(mMini.levels_used)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.darkGray }}>Date Created:</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.black }}>{formatDate(mMini.date_created)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.darkGray }}>Recording Time:</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.black }}>{formatTime(mMini.recording_time)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.darkGray }}>Recording Count:</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: COLORS.black }}>{mMini.recording_count || 0}</div>
                          </div>
                        </div>
                      </div>

                      {/* Sağ ok */}
                      <button
                        onClick={() => setMIndex(Math.min(minis.length - 1, mSafe + 1))}
                        disabled={mSafe >= minis.length - 1}
                        style={{
                          position: 'absolute', right: '2px', zIndex: 5,
                          background: 'none', border: 'none', padding: 0,
                          cursor: mSafe >= minis.length - 1 ? 'default' : 'pointer', opacity: mSafe >= minis.length - 1 ? 0.25 : 1,
                          WebkitAppearance: 'none'
                        }}
                      >
                        <img src={RightBtn} alt="Next" style={{ width: '28px', height: '28px' }} />
                      </button>
                    </>
                  )}
                </div>

                {/* Sağ kartın ALTINDA ortalı: sayaç + Ok */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexShrink: 0, paddingTop: '8px' }}>
                  {minis.length > 0 && (
                    <div style={{
                      border: `2px solid ${COLORS.yellow}`, borderRadius: '10px',
                      padding: '6px 16px', fontWeight: 800, fontSize: '14px',
                      fontFamily: "'Montserrat', sans-serif", color: COLORS.black
                    }}>
                      {mSafe + 1}/{minis.length}
                    </div>
                  )}
                  <button onClick={onClose} style={{
                    background: COLORS.blue, color: COLORS.white, border: 'none',
                    borderRadius: '8px', padding: '8px 28px', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
                  }}>
                    Ok
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="cmp-overlay">
      <style>{styles}</style>
      
      <div className="cmp-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="cmp-brick-border" />
        
        <div className="cmp-modal">
          {/* Header */}
          <div className="cmp-header">
            <img src={LogoHead} alt="" style={{ height: '45px' }} />
            <img src={LogoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

          {/* Content */}
          <div className="cmp-content">
            {/* Title Row */}
            <div className="cmp-title-row">
              <div className="cmp-btn-spacer" />
              <div className="cmp-title-center">
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
                  Customized Minis Progress
                </h2>
                <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
                  View each Customized Mini's scenes, levels, recording times, and overall design style here.
                </p>
              </div>
              <button
                onClick={onClose}
                className="cmp-ok-btn"
              >
                Ok
              </button>
            </div>

            {/* Carousel */}
            <div className="cmp-carousel">
              {/* Left Arrow */}
              <button
                onClick={handlePrev}
                disabled={currentPage === 0}
                className="cmp-nav-btn"
              >
                <img src={LeftBtn} alt="Previous" style={{ width: '32px', height: '32px' }} />
              </button>

              {/* Mini Cards */}
              <div className="cmp-cards-container">
                {loading ? (
                  <div className="cmp-loading">Loading...</div>
                ) : visibleMinis.length === 0 ? (
                  <div className="cmp-loading">No customized minis yet</div>
                ) : (
                  visibleMinis.map((mini, index) => {
                    const isSelected = selectedIndex === index;
                    return (
                      <div
                        key={mini.id}
                        onClick={() => setSelectedIndex(index)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className="cmp-card"
                        style={{
                          backgroundColor: isSelected ? COLORS.yellow : COLORS.white,
                          border: `3px solid ${isSelected ? COLORS.yellow : COLORS.gray}`
                        }}
                      >
                        {/* Longest Recording Badge */}
                        {mini.is_longest && (
                          <div className="cmp-card-badge">
                            <img src={LongestRecordingSticker} alt="Longest Recording" style={{ height: '28px' }} />
                          </div>
                        )}

                        {/* Mini Image with Scene Background */}
                        <div 
                          className="cmp-card-image"
                          style={{
                            backgroundImage: `url(${getSceneBackground(mini)})`
                          }}
                        >
                          <img
                            src={getDisplayImage(mini)}
                            alt={mini.scene_name}
                          />
                        </div>

                        {/* Info */}
                        <div className="cmp-card-info">
                          <div className="cmp-card-field">
                            <div className="cmp-card-label">Scene:</div>
                            <div className="cmp-card-value scene">{mini.scene_name || '-'}</div>
                          </div>
                          <div className="cmp-card-field">
                            <div className="cmp-card-label">Levels Used:</div>
                            <div className="cmp-card-value">{formatLevelsUsed(mini.levels_used)}</div>
                          </div>
                          <div className="cmp-card-field">
                            <div className="cmp-card-label">Date Created:</div>
                            <div className="cmp-card-value">{formatDate(mini.date_created)}</div>
                          </div>
                          <div className="cmp-card-field">
                            <div className="cmp-card-label">Recording Time:</div>
                            <div className="cmp-card-value">{formatTime(mini.recording_time)}</div>
                          </div>
                          <div className="cmp-card-field">
                            <div className="cmp-card-label">Recording Count:</div>
                            <div className="cmp-card-value">{mini.recording_count || 0}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Arrow */}
              <button
                onClick={handleNext}
                disabled={currentPage >= totalPages - 1}
                className="cmp-nav-btn"
              >
                <img src={RightBtn} alt="Next" style={{ width: '32px', height: '32px' }} />
              </button>
            </div>

            {/* Pagination Dots - Stats kartlarının üstünde */}
            {totalPages > 1 && (
              <div className="cmp-pagination">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className="cmp-dot"
                    style={{ backgroundColor: i === currentPage ? COLORS.black : COLORS.gray }}
                  />
                ))}
              </div>
            )}

            {/* Stats Cards */}
            <div className="cmp-stats-row">
              {/* Number of Minis Customized */}
              <div className="cmp-stats-card">
                <div className="cmp-stats-header">
                  <span className="cmp-stats-title">Number of Minis Customized</span>
                </div>
                <div className="cmp-stats-body">
                  {[
                    { label: 'Total:', value: stats.total },
                    { label: 'This Week:', value: stats.thisWeek },
                    { label: 'This Month:', value: stats.thisMonth }
                  ].map((item, i) => (
                    <div key={i} className="cmp-stats-item">
                      <span className="cmp-stats-label">{item.label}</span>
                      <span className="cmp-stats-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini Character Types */}
              <div className="cmp-stats-card">
                <div className="cmp-stats-header">
                  <span className="cmp-stats-title">Mini Character Types</span>
                </div>
                <div className="cmp-stats-body">
                  {[
                    { label: 'Female:', value: stats.characterTypes?.female || 0 },
                    { label: 'Male:', value: stats.characterTypes?.male || 0 },
                    { label: 'Child:', value: stats.characterTypes?.child || 0 }
                  ].map((item, i) => (
                    <div key={i} className="cmp-stats-item">
                      <span className="cmp-stats-label">{item.label}</span>
                      <span className="cmp-stats-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomMinisProgress;