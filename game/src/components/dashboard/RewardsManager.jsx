import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Asset imports
import BrickToMedalImg from '../../assets/rewards/brick_to_medal.png';
import MedalToCupImg from '../../assets/rewards/medal_to_cup.png';
import LimitImg from '../../assets/rewards/limit_img.png';
import LogoHead from '../../assets/logo-head.png';
import LogoText from '../../assets/logo-text.png';
import BrickBorder from '../../assets/12-kirmizi.png'; // Brick border

const COLORS = {
  red: '#E31E24',
  white: '#FFFFFF',
  blue: '#0055BF',
  gray: '#D8D8D8',
  darkGray: '#666666',
};

const RewardsManager = ({ isOpen, onClose, miniId, parentId, onTotalsUpdate }) => {
  const [settings, setSettings] = useState({
    brick_to_medal: 10,
    medal_to_cup: 10,
    daily_limit: 0
  });
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [okHover, setOkHover] = useState(false);

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

  useEffect(() => {
    if (isOpen && miniId) {
      fetchSettings();
    }
  }, [isOpen, miniId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `https://mini-talks.org/minitalks-api/rewards/get-settings.php?mini_id=${miniId}`
      );
      if (response.data.success && response.data.data) {
        setSettings({
          brick_to_medal: response.data.data.brick_to_medal,
          medal_to_cup: response.data.data.medal_to_cup,
          daily_limit: response.data.data.daily_limit
        });
        if (response.data.data.totals) {
          setTotals(response.data.data.totals);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);
    
    try {
      const response = await axios.post('https://mini-talks.org/minitalks-api/rewards/save-settings.php', {
        mini_id: miniId,
        parent_id: parentId,
        ...newSettings
      });
      
      if (response.data.success && response.data.data?.totals) {
        setTotals(response.data.data.totals);
      }
    } catch (error) {
      console.error('Failed to save setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (onTotalsUpdate && totals) {
      onTotalsUpdate(totals);
    }
    onClose();
  };

  if (!isOpen) return null;

  // Radio Option Component
  const RadioOption = ({ label, value, currentValue, onChange, isDefault }) => {
    const isSelected = currentValue === value;
    return (
      <div 
        className="rm-radio-row"
        style={{
          display: '-webkit-flex',
          display: 'flex',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          padding: '10px 12px',
          backgroundColor: '#fff',
          borderRadius: '6px',
          marginBottom: '6px',
          cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.7 : 1,
          WebkitTransition: 'opacity 0.2s',
          transition: 'opacity 0.2s'
        }}
        onClick={() => !saving && onChange(value)}
      >
        <div className="rm-radio-box" style={{
          width: '22px',
          height: '22px',
          borderRadius: '4px',
          border: isSelected ? 'none' : '2px solid #E31E24',
          backgroundColor: isSelected ? '#E31E24' : 'transparent',
          display: '-webkit-flex',
          display: 'flex',
          WebkitAlignItems: 'center',
          alignItems: 'center',
          WebkitJustifyContent: 'center',
          justifyContent: 'center',
          marginRight: '10px',
          WebkitFlexShrink: 0,
          flexShrink: 0
        }}>
          {isSelected && (
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M2 7L5 10L12 3" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          )}
        </div>
        
        <span className="rm-radio-label" style={{ 
          fontSize: '14px', 
          color: '#333',
          WebkitBoxFlex: 1,
          WebkitFlex: '1 1 0%',
          flex: 1,
          fontWeight: 600
        }}>
          {label}
        </span>
        
        {isDefault && (
          <span className="rm-radio-default" style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#333',
            WebkitFlexShrink: 0,
            flexShrink: 0
          }}>
            Default
          </span>
        )}
      </div>
    );
  };

  // 3 kolonun içeriği (PC + mobil paylaşır)
  const renderColumns = () => (
    <>
      {/* Brick Medal Conversion */}
      <div className="rm-column">
        <img src={BrickToMedalImg} alt="Brick to Medal" className="rm-column-img" />
        <div className="rm-card">
          <div className="rm-card-header">
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 900 }}>Brick Medal Conversion</span>
          </div>
          <div className="rm-card-body">
            <RadioOption label="5 Bricks → 1 Medal" value={5} currentValue={settings.brick_to_medal} onChange={(v) => handleSettingChange('brick_to_medal', v)} />
            <RadioOption label="10 Bricks → 1 Medal" value={10} currentValue={settings.brick_to_medal} onChange={(v) => handleSettingChange('brick_to_medal', v)} isDefault={true} />
            <RadioOption label="20 Bricks → 1 Medal" value={20} currentValue={settings.brick_to_medal} onChange={(v) => handleSettingChange('brick_to_medal', v)} />
          </div>
        </div>
      </div>

      {/* Medal Cup Conversion */}
      <div className="rm-column">
        <img src={MedalToCupImg} alt="Medal to Cup" className="rm-column-img" />
        <div className="rm-card">
          <div className="rm-card-header">
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 900 }}>Medal Cup Conversion</span>
          </div>
          <div className="rm-card-body">
            <RadioOption label="5 Medals → 1 Cup" value={5} currentValue={settings.medal_to_cup} onChange={(v) => handleSettingChange('medal_to_cup', v)} />
            <RadioOption label="10 Medals → 1 Cup" value={10} currentValue={settings.medal_to_cup} onChange={(v) => handleSettingChange('medal_to_cup', v)} isDefault={true} />
            <RadioOption label="20 Medals → 1 Cup" value={20} currentValue={settings.medal_to_cup} onChange={(v) => handleSettingChange('medal_to_cup', v)} />
          </div>
        </div>
      </div>

      {/* Daily Reward Limit */}
      <div className="rm-column">
        <img src={LimitImg} alt="Daily Limit" className="rm-column-img" />
        <div className="rm-card">
          <div className="rm-card-header">
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 900 }}>Daily Reward Limit</span>
          </div>
          <div className="rm-card-body">
            <RadioOption label="Unlimited" value={0} currentValue={settings.daily_limit} onChange={(v) => handleSettingChange('daily_limit', v)} isDefault={true} />
            <RadioOption label="Max 3 rewards per day" value={3} currentValue={settings.daily_limit} onChange={(v) => handleSettingChange('daily_limit', v)} />
            <RadioOption label="Max 5 rewards per day" value={5} currentValue={settings.daily_limit} onChange={(v) => handleSettingChange('daily_limit', v)} />
          </div>
        </div>
      </div>
    </>
  );

  const styles = `
    .rm-overlay {
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
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .rm-modal-wrapper {
      position: relative;
      width: 95vw;
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
    .rm-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 30px 30px 0 0;
    }
    .rm-modal {
      width: 100%;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.red};
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
    .rm-header {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 12px;
      padding: 15px 0 12px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .rm-content {
      background: ${COLORS.white};
      margin: 0 15px 15px;
      border-radius: 18px;
      padding: 25px 35px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      min-height: 0;
      -webkit-min-height: 0;
    }
    .rm-title-row {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      justify-content: space-between;
      -webkit-box-align: start;
      -webkit-align-items: flex-start;
      align-items: flex-start;
      margin-bottom: 30px;
      gap: 20px;
    }
    .rm-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1;
    }
    .rm-ok-btn {
      background: ${COLORS.blue};
      color: ${COLORS.white};
      border: none;
      border-radius: 10px;
      padding: 12px 30px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .rm-ok-btn:hover {
      background: #0066CC;
    }
    .rm-btn-spacer {
      width: 80px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .rm-grid {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 24px 1fr 24px 1fr;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .rm-column {
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
    }
    .rm-column-img {
      width: 180px;
      height: 140px;
      object-fit: contain;
      margin-bottom: 20px;
    }
    .rm-card {
      width: 100%;
      background: ${COLORS.red};
      border-radius: 10px;
      overflow: hidden;
    }
    .rm-card-header {
      padding: 12px 14px;
      border-bottom: 2px solid rgba(255,255,255,0.3);
    }
    .rm-card-body {
      padding: 10px;
    }
    .rm-loading {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      padding: 60px;
      color: ${COLORS.darkGray};
      font-size: 16px;
    }

    /* ════ MOBİL ════ */
    .rm-mobile-overlay {
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
    .rm-m-content {
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
    .rm-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    /* 3 kart yan yana, eşit */
    .rm-m-grid {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 10px;
      -webkit-box-align: stretch;
      -webkit-align-items: stretch;
      align-items: stretch;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .rm-m-grid .rm-column {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      -webkit-box-pack: start;
      -webkit-justify-content: flex-start;
      justify-content: flex-start;
    }
    .rm-m-grid .rm-column-img {
      width: 80px;
      height: 64px;
      margin-bottom: 10px;
    }
    .rm-m-grid .rm-card-header { padding: 7px 8px; }
    .rm-m-grid .rm-card-header span { font-size: 10px !important; }
    .rm-m-grid .rm-card-body { padding: 6px; }
    .rm-m-grid .rm-radio-row { padding: 7px 7px !important; margin-bottom: 5px !important; }
    .rm-m-grid .rm-radio-box { width: 16px !important; height: 16px !important; margin-right: 6px !important; }
    .rm-m-grid .rm-radio-label { font-size: 10px !important; }
    .rm-m-grid .rm-radio-default { font-size: 9px !important; }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    return (
      <div className="rm-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="rm-m-content">
          {/* Başlık */}
          <div className="rm-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Rewards Manager
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '600px', fontFamily: "'Montserrat', sans-serif" }}>
              Adjust how quickly your Mini earns Medals and Cups by choosing reward conversion rates and daily limits.
            </p>
          </div>

          {loading ? (
            <div className="rm-loading">Loading...</div>
          ) : (
            <div className="rm-m-grid">
              {renderColumns()}
            </div>
          )}

          {/* Alt: ortalı Ok */}
          {!loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, paddingTop: '8px' }}>
              <button onClick={handleClose} style={{
                width: '140px', height: '42px', background: COLORS.blue, color: COLORS.white, border: 'none',
                borderRadius: '8px', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", WebkitAppearance: 'none'
              }}>
                Ok
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════ DESKTOP RENDER (orijinal) ════════════════════
  return (
    <div className="rm-overlay">
      <style>{styles}</style>
      
      <div className="rm-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="rm-brick-border" />
        
        <div className="rm-modal">
          {/* Logo */}
          <div className="rm-header">
            <img src={LogoHead} alt="" style={{ height: '45px' }} />
            <img src={LogoText} alt="Mini-Talks" style={{ height: '36px' }} />
          </div>

        {/* White Content Area */}
        <div className="rm-content">
          {/* Header */}
          <div className="rm-title-row">
            <div className="rm-btn-spacer" />
            <div className="rm-title-center">
              <h2 style={{ fontSize: '28px', fontWeight: 900, margin: 0 }}>
                Rewards Manager
              </h2>
              <p style={{ color: COLORS.darkGray, margin: '8px auto 0', fontSize: '14px', maxWidth: '600px' }}>
                Adjust how quickly your Mini earns Medals and Cups by choosing the reward 
                conversion rates and setting daily reward limits.
              </p>
            </div>
            <button onClick={handleClose} className="rm-ok-btn">
              Ok
            </button>
          </div>

          {loading ? (
            <div className="rm-loading">Loading...</div>
          ) : (
            /* Three Sections */
            <div className="rm-grid">
              {renderColumns()}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default RewardsManager;