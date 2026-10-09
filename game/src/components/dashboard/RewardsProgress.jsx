import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Asset imports
import BrickIcon from '../../assets/rewards/Rewards_Brick.png';
import BrickIcon2 from '../../assets/rewards/Rewards_Brick_2.png';
import MedalIcon from '../../assets/rewards/Rewards_Medal.png';
import MedalIcon2 from '../../assets/rewards/Rewards_Medal_2.png';
import CupIcon from '../../assets/rewards/Rewards_Cup.png';
import CupIcon2 from '../../assets/rewards/Rewards_Cup_2.png';
import LogoHead from '../../assets/logo-head.png';
import LogoText from '../../assets/logo-text.png';
import BrickBorder from '../../assets/12-kirmizi.png';

const COLORS = {
  red: '#E31E24',
  white: '#FFFFFF',
  blue: '#0055BF',
  gray: '#D8D8D8',
  darkGray: '#666666',
};

const RewardsProgress = ({ isOpen, onClose, miniId, entityType = 'mini' }) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [okHover, setOkHover] = useState(false);

  // Mobil: seçili kategori (0:Overview 1:Bricks 2:Medals 3:Cups)
  const [mCategory, setMCategory] = useState(0);

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

  const entityId = miniId;

  const defaultProgress = {
    totals: { bricks: 0, medals: 0, cups: 0 },
    weekly: { bricks: 0, medals: 0, cups: 0 },
    monthly: { bricks: 0, medals: 0, cups: 0 },
    bricks: {
      daily_brick: 0,
      recording_brick: 0,
      streak_brick: 0,
      mini_creation_brick: 0,
      mission_brick: 0
    },
    medals: {
      new_scene_medal: 0,
      new_level_medal: 0,
      completion_medal: 0,
      streak_medal: 0,
      progress_medal: 0,
      achievement_medal: 0
    },
    cups: {
      gold_cup: 0,
      streak_champion_cup: 0,
      mini_champion_cup: 0
    }
  };

  useEffect(() => {
    if (isOpen && entityId) {
      fetchProgress();
    }
  }, [isOpen, entityId]);

  const fetchProgress = async () => {
    try {
      const apiUrl = entityType === 'builder'
        ? `https://mini-talks.org/minitalks-api/builder/get-rewards.php?builder_id=${entityId}`
        : `https://mini-talks.org/minitalks-api/rewards/get-progress.php?mini_id=${entityId}`;
      const response = await axios.get(apiUrl);
      if (response.data.success && response.data.data) {
        setProgress(response.data.data);
      } else {
        setProgress(defaultProgress);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
      setProgress(defaultProgress);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const data = progress || defaultProgress;

  // Stat Row Component - Figma style
  const StatRow = ({ label, value, description }) => (
    <div className="rp-stat-row">
      <div className="rp-stat-top">
        <div className="rp-stat-label">{label}</div>
        <div className="rp-stat-value-box">{value}</div>
      </div>
      {description && (
        <>
          <div className="rp-stat-divider"></div>
          <div className="rp-stat-desc">{description}</div>
        </>
      )}
    </div>
  );

  // Overview Stat Row
  const OverviewStatRow = ({ label, value }) => (
    <div className="rp-overview-row">
      <span className="rp-overview-label">{label}</span>
      <span className="rp-overview-value">{value}</span>
    </div>
  );

  // Weekly/Monthly rewards display - çizgi label'ın altında
  const RewardIconsRow = ({ bricks, medals, cups, label }) => (
    <div className="rp-icons-wrapper">
      <div className="rp-weekly-label">{label}</div>
      <div className="rp-icons-divider"></div>
      <div className="rp-icons-row">
        <div className="rp-icon-item">
          <img src={BrickIcon2} alt="" style={{ width: '18px', height: '18px' }} />
          <span>{bricks}</span>
        </div>
        <div className="rp-icon-item">
          <img src={MedalIcon2} alt="" style={{ width: '18px', height: '18px' }} />
          <span>{medals}</span>
        </div>
        <div className="rp-icon-item">
          <img src={CupIcon2} alt="" style={{ width: '18px', height: '18px' }} />
          <span>{cups}</span>
        </div>
      </div>
    </div>
  );

  // ── Kategori içerik render'ları (PC + mobil paylaşır) ──
  const renderOverviewCard = () => (
    <div className="rp-card">
      <div className="rp-card-body">
        <OverviewStatRow label="Total Bricks Earned:" value={data.totals.bricks} />
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.5)', margin: '0 14px' }}></div>
        <OverviewStatRow label="Total Medals Earned:" value={data.totals.medals} />
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.5)', margin: '0 14px' }}></div>
        <OverviewStatRow label="Total Cups Earned:" value={data.totals.cups} />
        <div className="rp-weekly-section">
          <RewardIconsRow label="Rewards Earned This Week:" bricks={data.weekly.bricks} medals={data.weekly.medals} cups={data.weekly.cups} />
        </div>
        <div className="rp-weekly-section">
          <RewardIconsRow label="Rewards Earned This Month:" bricks={data.monthly.bricks} medals={data.monthly.medals} cups={data.monthly.cups} />
        </div>
      </div>
    </div>
  );

  const renderBricksCard = () => (
    <div className="rp-card">
      <div className="rp-card-body rp-statgrid">
        <StatRow label="Daily Brick:" value={data.bricks.daily_brick} description="Given for each day your Mini is active in the app." />
        <StatRow label="Recording Brick:" value={data.bricks.recording_brick} description="Earned for every recording your Mini completes." />
        <StatRow label="Streak Brick:" value={data.bricks.streak_brick} description="Awarded for maintaining a 5-day activity streak." />
        <StatRow label="Mini Creation Brick:" value={data.bricks.mini_creation_brick} description="Earned when a new Mini is customized." />
        <StatRow label="Mission Brick:" value={data.bricks.mission_brick} description="Earned for completing daily missions." />
      </div>
    </div>
  );

  const renderMedalsCard = () => (
    <div className="rp-card">
      <div className="rp-card-body rp-statgrid">
        <StatRow label="New Scene Medal:" value={data.medals.new_scene_medal} description="Earned when your Mini starts a scene for the first time." />
        <StatRow label="New Level Medal:" value={data.medals.new_level_medal} description="Given when your Mini attempts a level they've never tried before." />
        <StatRow label="Completion Medal:" value={data.medals.completion_medal} description="Earned for completing a scene or level." />
        <StatRow label="Streak Medal:" value={data.medals.streak_medal} description="Awarded for maintaining a 10-day streak." />
        <StatRow label="Progress Medal:" value={data.medals.progress_medal} description="Given for strong overall improvement across scenes, levels, or recording skills." />
        <StatRow label="Achievement Medal:" value={data.medals.achievement_medal} description="Given for strong overall improvement across scenes, levels, or recording skills." />
      </div>
    </div>
  );

  const renderCupsCard = () => (
    <div className="rp-card">
      <div className="rp-card-body">
        <StatRow label="Gold Cup:" value={data.cups.gold_cup} description="Awarded after collecting a large number of medals." />
        <StatRow label="Streak Champion Cup:" value={data.cups.streak_champion_cup} description="Given for maintaining a streak of 30 days or longer." />
        <StatRow label="Mini-Champion Cup:" value={data.cups.mini_champion_cup} description="Awarded for exceptional dedication, courage, or overall Mini progress." />
      </div>
    </div>
  );

  // Kategori config (ikon + başlık + açıklama + render)
  const CATEGORIES = [
    { key: 'overview', title: 'Rewards Overview', icon: null, desc: 'Your Mini\'s total Bricks, Medals, and Cups, plus weekly and monthly totals.', render: renderOverviewCard },
    { key: 'bricks', title: 'Bricks', icon: BrickIcon, desc: 'Small rewards earned through daily actions and consistent engagement. Bricks motivate regular participation without pressure.', render: renderBricksCard },
    { key: 'medals', title: 'Medals', icon: MedalIcon, desc: 'Bigger rewards earned by reaching meaningful milestones. Medals celebrate progress, courage, and new steps.', render: renderMedalsCard },
    { key: 'cups', title: 'Cups', icon: CupIcon, desc: 'Top-tier rewards for long-term consistency and exceptional progress. Cups represent big achievements.', render: renderCupsCard }
  ];

  const styles = `
    .rp-overlay {
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
    .rp-modal-wrapper {
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
      border-radius: 24px;
    }
    .rp-brick-border {
      width: 100%;
      display: block;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      border-radius: 24px 24px 0 0;
    }
    .rp-modal {
      width: 100%;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.red};
      border-radius: 12px 12px 12px 12px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      overflow: hidden;
    }
    .rp-header {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 10px;
      padding: 12px 0 10px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .rp-content {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      background: ${COLORS.white};
      border-radius: 16px;
      margin: 0 12px 12px;
      padding: 18px 24px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      min-height: 0;
      -webkit-min-height: 0;
    }
    .rp-title-row {
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
    .rp-title-center {
      text-align: center;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1;
    }
    .rp-title {
      font-size: 24px;
      font-weight: 900;
      margin: 0;
      font-family: 'Montserrat', sans-serif;
    }
    .rp-subtitle {
      color: ${COLORS.darkGray};
      margin: 6px auto 0;
      font-size: 13px;
      font-family: 'Montserrat', sans-serif;
      max-width: 700px;
    }
    .rp-btn-spacer {
      width: 72px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .rp-ok-btn {
      background: ${COLORS.blue};
      color: ${COLORS.white};
      border: none;
      border-radius: 10px;
      padding: 10px 26px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      -webkit-appearance: none;
      appearance: none;
      font-family: 'Montserrat', sans-serif;
      -webkit-transition: background-color 0.2s;
      transition: background-color 0.2s;
    }
    .rp-ok-btn:hover {
      background: #0066CC;
    }
    .rp-main {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 16px 1fr 16px 1fr 16px 1fr;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      min-height: 0;
      -webkit-min-height: 0;
      -webkit-align-items: start;
      align-items: start;
      min-width: 900px;
    }
    .rp-column {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .rp-column-header {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: flex-start;
      -webkit-align-items: flex-start;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
      min-height: 75px;
    }
    .rp-column-header-center {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: flex-end;
      -webkit-align-items: flex-end;
      align-items: flex-end;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 8px;
      min-height: 75px;
    }
    .rp-column-title {
      font-size: 16px;
      font-weight: 900;
      font-family: 'Montserrat', sans-serif;
    }
    .rp-column-desc {
      font-size: 12px;
      color: #666;
      margin: 3px 0 0;
      line-height: 1.3;
      font-family: 'Montserrat', sans-serif;
    }
    .rp-card {
      background: ${COLORS.blue};
      border-radius: 10px;
      overflow: hidden;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .rp-card-body {
      padding: 6px 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .rp-stat-row {
      padding: 5px 14px;
    }
    .rp-stat-row:last-child {
      padding-bottom: 8px;
    }
    .rp-stat-top {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      justify-content: space-between;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 10px;
    }
    .rp-stat-label {
      font-size: 13px;
      font-weight: 700;
      color: #FFF;
      font-family: 'Montserrat', sans-serif;
    }
    .rp-stat-value-box {
      background: #FFF;
      border-radius: 6px;
      padding: 4px 14px;
      font-size: 13px;
      font-weight: 800;
      color: #333;
      font-family: 'Montserrat', sans-serif;
      min-width: 50px;
      text-align: center;
    }
    .rp-stat-divider {
      height: 1px;
      background: rgba(255,255,255,0.5);
      margin: 5px 0;
    }
    .rp-stat-desc {
      font-size: 12px;
      color: #FFF;
      line-height: 1.3;
      font-family: 'Montserrat', sans-serif;
    }
    .rp-overview-row {
      padding: 5px 14px;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-pack: justify;
      -webkit-justify-content: space-between;
      justify-content: space-between;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
    }
    .rp-overview-label {
      font-size: 13px;
      font-weight: 700;
      color: #FFF;
      font-family: 'Montserrat', sans-serif;
    }
    .rp-overview-value {
      background: #FFF;
      border-radius: 6px;
      padding: 4px 14px;
      font-size: 13px;
      font-weight: 800;
      color: #333;
      font-family: 'Montserrat', sans-serif;
      min-width: 50px;
      text-align: center;
    }
    .rp-icons-wrapper {
      padding: 3px 14px;
    }
    .rp-icons-row {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 8px;
      margin-top: 4px;
      -webkit-flex-wrap: wrap;
      flex-wrap: wrap;
    }
    .rp-icons-divider {
      height: 1px;
      background: rgba(255,255,255,0.5);
      margin-top: 2px;
    }
    .rp-icon-item {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      gap: 5px;
      background: #FFF;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .rp-icon-item span {
      font-weight: 800;
      font-size: 13px;
      color: #333;
      font-family: 'Montserrat', sans-serif;
    }
    .rp-loading {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-align: center;
      -webkit-align-items: center;
      align-items: center;
      -webkit-box-pack: center;
      -webkit-justify-content: center;
      justify-content: center;
      color: ${COLORS.darkGray};
      font-size: 18px;
      font-family: 'Montserrat', sans-serif;
    }
    .rp-weekly-section {
      padding: 0;
      margin-top: 2px;
    }
    .rp-weekly-section:last-child {
      padding-bottom: 2px;
    }
    .rp-weekly-label {
      font-size: 13px;
      font-weight: 700;
      color: #FFF;
      font-family: 'Montserrat', sans-serif;
    }

    /* ════ MOBİL ════ */
    .rp-mobile-overlay {
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
    .rp-m-content {
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
    .rp-m-titlebar {
      text-align: center;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    .rp-m-main {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 12px;
    }
    /* Sol — ikon menü + açıklama */
    .rp-m-menu {
      width: 42%;
      max-width: 320px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      -webkit-box-orient: vertical;
      -webkit-box-direction: normal;
      -webkit-flex-direction: column;
      flex-direction: column;
      min-height: 0;
      border-right: 2px solid ${COLORS.gray};
      padding-right: 12px;
    }
    .rp-m-icons {
      display: -webkit-box;
      display: -webkit-flex;
      display: flex;
      gap: 6px;
      -webkit-flex-shrink: 0;
      flex-shrink: 0;
    }
    .rp-m-icon-btn {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
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
      gap: 4px;
      padding: 8px 4px;
      border-radius: 10px;
      border: 2px solid ${COLORS.gray};
      background: ${COLORS.white};
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
    }
    .rp-m-icon-btn img { width: 26px; height: 26px; object-fit: contain; }
    .rp-m-icon-btn span { font-size: 9px; font-weight: 700; color: #333; text-align: center; line-height: 1.1; font-family: 'Montserrat', sans-serif; }
    .rp-m-desc {
      margin-top: 10px;
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .rp-m-desc-title { font-size: 15px; font-weight: 900; color: #333; font-family: 'Montserrat', sans-serif; }
    .rp-m-desc-text { font-size: 11px; color: #666; line-height: 1.35; margin-top: 4px; font-family: 'Montserrat', sans-serif; }
    /* Sağ — seçili içerik */
    .rp-m-detail {
      -webkit-box-flex: 1;
      -webkit-flex: 1 1 0%;
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    /* Mobilde stat/overview kompakt */
    .rp-m-detail .rp-stat-label,
    .rp-m-detail .rp-overview-label,
    .rp-m-detail .rp-weekly-label { font-size: 11px !important; }
    .rp-m-detail .rp-stat-value-box,
    .rp-m-detail .rp-overview-value { font-size: 11px !important; padding: 3px 10px !important; min-width: 38px !important; }
    .rp-m-detail .rp-stat-desc { font-size: 10px !important; }
    .rp-m-detail .rp-icon-item span { font-size: 11px !important; }
    /* Sağ kartta stat'ları 2 sütun yap (Bricks/Medals/Cups) */
    .rp-m-detail .rp-statgrid {
      display: -ms-grid;
      display: grid;
      -ms-grid-columns: 1fr 8px 1fr;
      grid-template-columns: 1fr 1fr;
      gap: 0 10px;
      padding: 6px 8px;
    }
    .rp-m-detail .rp-statgrid .rp-stat-row { padding: 5px 0; }
  `;

  // ════════════════════ MOBİL RENDER ════════════════════
  if (isSmallScreen) {
    const cat = CATEGORIES[mCategory];
    return (
      <div className="rp-mobile-overlay" style={{ top: `${headerBottom}px` }}>
        <style>{styles}</style>

        <div className="rp-m-content">
          {/* Başlık */}
          <div className="rp-m-titlebar">
            <h2 style={{ fontSize: '17px', fontWeight: 900, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
              Rewards Progress
            </h2>
            <p style={{ color: COLORS.darkGray, margin: '2px auto 0', fontSize: '10px', maxWidth: '700px', fontFamily: "'Montserrat', sans-serif" }}>
              View your Mini's total Bricks, Medals, and Cups, and how each reward type contributes to progress.
            </p>
          </div>

          {loading ? (
            <div className="rp-loading">Loading...</div>
          ) : (
            <div className="rp-m-main">
              {/* SOL — ikon menü + açıklama */}
              <div className="rp-m-menu">
                <div className="rp-m-icons">
                  {CATEGORIES.map((c, i) => {
                    const active = i === mCategory;
                    return (
                      <button
                        key={c.key}
                        onClick={() => setMCategory(i)}
                        className="rp-m-icon-btn"
                        style={{
                          borderColor: active ? COLORS.blue : COLORS.gray,
                          background: active ? 'rgba(0,85,191,0.08)' : COLORS.white
                        }}
                      >
                        {c.icon ? (
                          <img src={c.icon} alt={c.title} />
                        ) : (
                          <div style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>★</div>
                        )}
                        <span>{c.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Seçilenin açıklaması */}
                <div className="rp-m-desc">
                  <div className="rp-m-desc-title">{cat.title}</div>
                  <div className="rp-m-desc-text">{cat.desc}</div>
                </div>
              </div>

              {/* SAĞ — seçili kategorinin içeriği */}
              <div className="rp-m-detail">
                {cat.render()}
              </div>
            </div>
          )}

          {/* Alt: ortalı Ok */}
          {!loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, paddingTop: '8px' }}>
              <button onClick={onClose} style={{
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
    <div className="rp-overlay">
      <style>{styles}</style>
      
      <div className="rp-modal-wrapper">
        {/* Brick Border - Modal'ın üstünde */}
        <img src={BrickBorder} alt="" className="rp-brick-border" />
        
        <div className="rp-modal">
          {/* Logo Header */}
          <div className="rp-header">
            <img src={LogoHead} alt="" style={{ height: '40px' }} />
            <img src={LogoText} alt="Mini-Talks" style={{ height: '32px' }} />
          </div>

          {/* White Content Area */}
          <div className="rp-content">
            {/* Title Row */}
            <div className="rp-title-row">
              <div className="rp-btn-spacer" />
              <div className="rp-title-center">
                <h2 className="rp-title">Rewards Progress</h2>
                <p className="rp-subtitle">
                  View your Mini's total Bricks, Medals, and Cups, and see how each reward type contributes to their overall progress.
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="rp-ok-btn"
              >
                Ok
              </button>
            </div>

            {loading ? (
              <div className="rp-loading">Loading...</div>
            ) : (
              <div className="rp-main">
                {/* Column 1 - Rewards Overview */}
                <div className="rp-column">
                  <div className="rp-column-header-center">
                    <span className="rp-column-title">Rewards Overview</span>
                  </div>
                  {renderOverviewCard()}
                </div>

                {/* Column 2 - Bricks */}
                <div className="rp-column">
                  <div className="rp-column-header">
                    <img src={BrickIcon} alt="Bricks" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                    <div>
                      <span className="rp-column-title">Bricks</span>
                      <p className="rp-column-desc">
                        Small rewards earned through daily actions and consistent engagement. Bricks motivate regular participation without pressure.
                      </p>
                    </div>
                  </div>
                  {renderBricksCard()}
                </div>

                {/* Column 3 - Medals */}
                <div className="rp-column">
                  <div className="rp-column-header">
                    <img src={MedalIcon} alt="Medals" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                    <div>
                      <span className="rp-column-title">Medals</span>
                      <p className="rp-column-desc">
                        Bigger rewards earned by reaching meaningful milestones. Medals celebrate progress, courage, and new steps.
                      </p>
                    </div>
                  </div>
                  {renderMedalsCard()}
                </div>

                {/* Column 4 - Cups */}
                <div className="rp-column">
                  <div className="rp-column-header">
                    <img src={CupIcon} alt="Cups" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                    <div>
                      <span className="rp-column-title">Cups</span>
                      <p className="rp-column-desc">
                        Top-tier rewards for long-term consistency and exceptional progress. Cups represent big achievements.
                      </p>
                    </div>
                  </div>
                  {renderCupsCard()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsProgress;