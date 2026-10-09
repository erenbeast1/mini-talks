// src/pages/AboutPage.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';

// ============================================================
// LAYER CSS — combined from all layer HTML widgets
// ============================================================
const LAYERS_CSS = `
/* ===== Global overflow guard — prevents horizontal scroll from full-width sections ===== */
html, body { overflow-x: hidden; max-width: 100%; }
.l1-challenge, .l3-cafe-wrap, .l4-privacy {
  max-width: 100vw;
  box-sizing: border-box;
}
img { max-width: 100%; }

/* ===== layer1-00-hero.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

/* ============ INTRO HERO ============ */
.l1-intro {
  width: 82%;
  margin: 40px auto 0;
  padding: 20px 0 40px;
  font-family: 'Montserrat', sans-serif;
}

.l1-intro-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 40px;
  align-items: center;
}

/* Mini-Talks Studio title — outlined */
.l1-intro-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(28px, 3.2vw, 48px);
  color: #FFFFFF;
  -webkit-text-stroke: 2px #E52828;
  paint-order: stroke fill;
  text-shadow:
    2px 2px 0 #E52828,
    -2px -2px 0 #E52828,
    2px -2px 0 #E52828,
    -2px 2px 0 #E52828,
    0 2px 0 #E52828,
    0 -2px 0 #E52828,
    2px 0 0 #E52828,
    -2px 0 0 #E52828;
  margin: 0 0 14px 0;
  line-height: 1.1;
}

/* 4 color bars — connected, sharp corners, RED-YELLOW-BLUE-GREEN */
.l1-intro-bars {
  display: flex;
  gap: 0;
  height: 8px;
  margin-bottom: 22px;
  max-width: 360px;
}
.l1-intro-bars span { flex: 1; height: 100%; }

.l1-intro-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #1D1D1B;
  line-height: 1.6;
  margin: 0;
  max-width: 460px;
}

/* Yellow logo card — clean, no bottom border */
.l1-intro-logo-card {
  background: #FFCC00;
  border-radius: 20px;
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  max-width: 440px;
  margin-left: auto;
}
.l1-intro-logo-card img {
  max-width: 180px;
  height: auto;
}

/* ============ BLUE CHALLENGE SECTION ============ */
.l1-challenge {
  background: #0055BF;
  padding: 60px 0 70px;
  width: 100%;
  font-family: 'Montserrat', sans-serif;
}
.l1-challenge-inner {
  width: 82%;
  margin: 0 auto;
}
.l1-challenge h2 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(28px, 3.5vw, 48px);
  color: #FFFFFF;
  margin: 0 0 14px 0;
  line-height: 1.15;
  text-align: center;
}
.l1-challenge-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #FFFFFF;
  line-height: 1.6;
  text-align: center;
  margin: 0 auto 46px;
  max-width: 720px;
}

/* Yellow stats brick — clean, no bottom border */
.l1-stats-brick {
  position: relative;
  background: #FFCC00;
  border-radius: 16px;
  padding: 40px 24px 28px;
  margin-top: 40px;
}
/* PNG studs on top */
.l1-stats-studs {
  position: absolute;
  top: -28px;
  left: 0;
  right: 0;
  height: 30px;
  background-image:
    url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-sari-4.png'),
    url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-sari-4.png'),
    url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-sari-4.png');
  background-repeat: no-repeat, no-repeat, no-repeat;
  background-position: left bottom, center bottom, right bottom;
  background-size: 34% auto, 34% auto, 34% auto;
}

.l1-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
}
.l1-stat-cell {
  padding: 10px 24px;
  position: relative;
}
.l1-stat-cell + .l1-stat-cell::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 2px;
  background: rgba(0,85,191,0.3);
}
.l1-stat-big {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(32px, 3.2vw, 48px);
  color: #0055BF;
  line-height: 1;
  margin-bottom: 10px;
}
.l1-stat-big.infinity {
  -webkit-text-stroke: 2px #0055BF;
  paint-order: stroke fill;
  font-size: clamp(36px, 3.6vw, 52px);
  letter-spacing: -2px;
}
.l1-stat-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: clamp(15px, 1.5vw, 20px);
  color: #0055BF;
  margin-bottom: 6px;
}
.l1-stat-sub {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(12px, 1vw, 14px);
  color: #1D1D1B;
  line-height: 1.4;
}

/* ============ 4 CHAPTER CARDS — LEGO bricks (fig-talks border style, sharp bottom) ============ */
.l1-chapters {
  width: 82%;
  margin: 60px auto 80px;
  font-family: 'Montserrat', sans-serif;
}
.l1-chapters-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  padding-top: 36px;
}

.l1-chapter {
  position: relative;
  background: #FFFFFF;
  border: 4px solid;
  border-bottom-width: 10px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

/* PNG studs on top */
.l1-chapter-studs {
  position: absolute;
  top: -30px;
  left: 2%;
  right: 2%;
  height: 30px;
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 100% auto;
}

/* Content */
.l1-chapter-body {
  padding: 22px 24px 24px;
  flex: 1;
}
.l1-chapter-label {
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: clamp(13px, 1.2vw, 15px);
  margin-bottom: 8px;
}
.l1-chapter-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(20px, 2vw, 28px);
  color: #1D1D1B;
  margin: 0 0 12px 0;
  line-height: 1.2;
}
.l1-chapter-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #1D1D1B;
  line-height: 1.5;
  margin: 0;
}

/* Color variants */
.l1-chapter.c-red    { border-color: #E52828; }
.l1-chapter.c-red    .l1-chapter-label  { color: #E52828; }
.l1-chapter.c-red    .l1-chapter-studs  { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-kirmizi.png'); }

.l1-chapter.c-blue   { border-color: #0055BF; }
.l1-chapter.c-blue   .l1-chapter-label  { color: #0055BF; }
.l1-chapter.c-blue   .l1-chapter-studs  { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-mavi.png'); }

.l1-chapter.c-green  { border-color: #237841; }
.l1-chapter.c-green  .l1-chapter-label  { color: #237841; }
.l1-chapter.c-green  .l1-chapter-studs  { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-yesil.png'); }

.l1-chapter.c-yellow { border-color: #FFCC00; }
.l1-chapter.c-yellow .l1-chapter-label  { color: #D4A017; }
.l1-chapter.c-yellow .l1-chapter-studs  { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-sari.png'); }

/* Responsive */
@media (max-width: 992px) {
  .l1-intro-grid { grid-template-columns: 1fr; }
  .l1-intro-logo-card { margin: 0 auto; }
  .l1-chapters-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 36px;
  }
  .l1-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px 0;
  }
  .l1-stat-cell + .l1-stat-cell::before { display: none; }
}
@media (max-width: 600px) {
  .l1-chapters-grid { grid-template-columns: 1fr; }
  .l1-challenge { padding: 40px 0 50px; }
}

/* ===== layer1-01-header-mainmenu.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

/* ============ LAYER HEADER ============ */
.l1-header {
  width: 82%;
  margin: 60px auto 60px;
  font-family: 'Montserrat', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

/* Sol ve sağ renkli barlar — red, yellow, blue, GREEN (sharp corners) */
.l1-header-bars-left,
.l1-header-bars-right {
  display: flex;
  gap: 0;
  flex: 1;
  height: 8px;
  max-width: 340px;
}
.l1-header-bars-left span,
.l1-header-bars-right span { flex: 1; height: 100%; }
.l1-bar-red    { background: #E52828; }
.l1-bar-yellow { background: #FFCC00; }
.l1-bar-blue   { background: #0055BF; }
.l1-bar-green  { background: #237841; }

/* Layer title container */
.l1-header-title {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
/* "Layer 1:" — solid red text */
.l1-header-title .l1-prefix {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(22px, 2.2vw, 32px);
  color: #E52828;
  white-space: nowrap;
}
/* "Entry & Identity" — konturlu/outlined heading */
.l1-header-title .l1-badge {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(22px, 2.2vw, 32px);
  color: #FFFFFF;
  -webkit-text-stroke: 2px #E52828;
  paint-order: stroke fill;
  text-shadow:
    2px 2px 0 #E52828,
    -2px -2px 0 #E52828,
    2px -2px 0 #E52828,
    -2px 2px 0 #E52828,
    0 2px 0 #E52828,
    0 -2px 0 #E52828,
    2px 0 0 #E52828,
    -2px 0 0 #E52828;
  white-space: nowrap;
  line-height: 1.1;
}

/* ============ MAIN MENU SECTION ============ */
.l1-mm {
  width: 82%;
  margin: 0 auto 80px;
  font-family: 'Montserrat', sans-serif;
}

/* Section title — solid red, NO outline */
.l1-mm-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(28px, 3.2vw, 48px);
  color: #E52828;
  margin: 0 0 16px 0;
  line-height: 1.15;
}

.l1-mm-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #1D1D1B;
  line-height: 1.6;
  margin: 0 0 32px 0;
  max-width: 85%;
}

/* Screenshots grid: 1 big left + 2 small right */
.l1-mm-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

/* Main screenshot — fig-talks border style */
.l1-mm-main-shot {
  border: 4px solid #E52828;
  border-bottom-width: 10px;
  border-radius: 12px;
  overflow: hidden;
  background: #FFFFFF;
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
}
.l1-mm-main-shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.l1-mm-side {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.l1-mm-side-shot {
  flex: 1;
  border: 4px solid;
  border-bottom-width: 10px;
  border-radius: 12px;
  overflow: hidden;
  background: #FFFFFF;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.l1-mm-side-shot.border-blue  { border-color: #0055BF; }
.l1-mm-side-shot.border-green { border-color: #237841; }
.l1-mm-side-shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Responsive */
@media (max-width: 768px) {
  .l1-header {
    flex-wrap: wrap;
    gap: 12px;
  }
  .l1-header-bars-left,
  .l1-header-bars-right { max-width: 100%; }
  .l1-mm-grid { grid-template-columns: 1fr; }
  .l1-mm-side { flex-direction: row; }
  .l1-mm-desc { max-width: 100%; }
}

/* ===== layer1-02-roles-interactive.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l1-roles {
  width: 82%;
  margin: 0 auto 80px;
  font-family: 'Montserrat', sans-serif;
}

/* Section title — SOLID RED (no outline) */
.l1-roles-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(28px, 3.2vw, 48px);
  color: #E52828;
  margin: 0 0 16px 0;
  line-height: 1.15;
}

.l1-roles-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #1D1D1B;
  line-height: 1.6;
  margin: 0 0 28px 0;
  max-width: 85%;
}

/* ============ ROLE TABS — fig-talks border style ============ */
.l1-roles-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 0; /* close to content card */
}

.l1-role-tab {
  position: relative;
  background: #FFFFFF;
  border: 4px solid;
  border-bottom-width: 10px;
  border-radius: 12px;
  padding: 18px 20px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(15px, 1.3vw, 19px);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  user-select: none;
  color: #1D1D1B; /* pasifken siyah */
}

/* Border colors — pasif */
.l1-role-tab.role-red    { border-color: #E52828; }
.l1-role-tab.role-blue   { border-color: #0055BF; }
.l1-role-tab.role-green  { border-color: #237841; }
.l1-role-tab.role-yellow { border-color: #FFCC00; }

.l1-role-tab:hover { transform: translateY(-2px); }

/* Aktif = filled bg + white text (sarı hariç) */
.l1-role-tab.active.role-red    { background: #E52828; color: #FFFFFF; }
.l1-role-tab.active.role-blue   { background: #0055BF; color: #FFFFFF; }
.l1-role-tab.active.role-green  { background: #237841; color: #FFFFFF; }
.l1-role-tab.active.role-yellow { background: #FFCC00; color: #1D1D1B; }

/* ============ ROLE CONTENT CARD — close to tabs ============ */
.l1-role-content {
  display: none;
  border: 3px solid;
  border-bottom-width: 6px;
  border-radius: 12px;
  padding: 14px 18px 20px 36px;
  color: #FFFFFF;
  overflow: hidden;
  margin-top: 18px;
}
.l1-role-content.active {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
  align-items: center;
}

/* Color variants — border same color as bg */
.l1-role-content.bg-red    { background: #E52828; border-color: #E52828; }
.l1-role-content.bg-blue   { background: #0055BF; border-color: #0055BF; }
.l1-role-content.bg-green  { background: #237841; border-color: #237841; }
.l1-role-content.bg-yellow { background: #FFCC00; border-color: #FFCC00; color: #1D1D1B; }

/* Left side — role text */
.l1-role-left h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(22px, 2.2vw, 32px);
  margin: 0 0 6px 0;
  line-height: 1.1;
}
.l1-role-left .l1-role-subtitle {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: clamp(14px, 1.2vw, 17px);
  opacity: 0.92;
  margin: 0 0 22px 0;
}

.l1-role-features {
  list-style: none;
  padding: 0;
  margin: 0;
}
.l1-role-features li {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  line-height: 1.4;
  margin-bottom: 14px;
  padding-left: 34px;
  position: relative;
  min-height: 24px;
  display: flex;
  align-items: center;
}

/* Check box — white filled, rounded */
.l1-role-features li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  background: #FFFFFF;
  border-radius: 5px;
}

/* Checked — dark check inside */
.l1-role-features li.checked::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-65%) rotate(45deg);
  width: 8px;
  height: 14px;
  border: solid #1D1D1B;
  border-width: 0 3px 3px 0;
}

/* Unchecked — dash (minus) inside box, no strikethrough */
.l1-role-features li.unchecked::before {
  background: rgba(255,255,255,0.55);
}
.l1-role-features li.unchecked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 3px;
  background: #1D1D1B;
  border-radius: 2px;
}
.l1-role-features li.unchecked {
  opacity: 0.75;
}

/* Yellow content — unchecked variant */
.l1-role-content.bg-yellow .l1-role-features li.unchecked::before {
  background: rgba(0,0,0,0.2);
}

/* Right side — single WHITE panel with two forms */
.l1-role-forms-panel {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: stretch;
}
.l1-role-form-item {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  min-height: 360px;
  background: transparent;
}
.l1-role-form-item img {
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
}

.l1-role-form-placeholder {
  color: #999;
  font-weight: 700;
  font-size: 13px;
  padding: 20px;
  text-align: center;
}

/* Responsive */
@media (max-width: 992px) {
  .l1-roles-tabs { grid-template-columns: repeat(2, 1fr); }
  .l1-role-content.active { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .l1-roles-tabs {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .l1-role-tab {
    padding: 12px 10px;
    font-size: 13px;
  }
  .l1-role-content.active { padding: 24px; }
  .l1-role-forms-panel { grid-template-columns: 1fr; }
  .l1-roles-desc { max-width: 100%; }
}

/* ===== layer1-03-connections.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l1-conn {
  width: 82%;
  margin: 0 auto 80px;
  font-family: 'Montserrat', sans-serif;
}

/* Title — SOLID RED (no outline) */
.l1-conn-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(28px, 3.2vw, 48px);
  color: #E52828;
  margin: 0 0 16px 0;
  line-height: 1.15;
}

.l1-conn-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #1D1D1B;
  line-height: 1.6;
  margin: 0 0 36px 0;
}

/* ============ FLOW BOX — fig-talks border style ============ */
.l1-flow {
  border: 4px solid;
  border-bottom-width: 10px;
  border-radius: 12px;
  padding: 24px 32px;
  margin-bottom: 24px;
  background: #FFFFFF;
}
.l1-flow.flow-blue   { border-color: #0055BF; }
.l1-flow.flow-yellow { border-color: #FFCC00; }
.l1-flow.flow-green  { border-color: #237841; }

.l1-flow-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(20px, 2vw, 26px);
  margin: 0 0 16px 0;
}
.l1-flow.flow-blue   .l1-flow-title { color: #0055BF; }
.l1-flow.flow-yellow .l1-flow-title { color: #E8B000; }
.l1-flow.flow-green  .l1-flow-title { color: #237841; }

/* Steps row */
.l1-flow-steps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

/* Step pill */
.l1-step {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: clamp(13px, 1.1vw, 15px);
  color: #1D1D1B;
}

/* Numbered small box */
.l1-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 5px;
  color: #FFFFFF;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 13px;
  flex-shrink: 0;
}
.l1-flow.flow-blue   .l1-step-num { background: #0055BF; }
.l1-flow.flow-yellow .l1-step-num { background: #FFCC00; color: #1D1D1B; }
.l1-flow.flow-green  .l1-step-num { background: #237841; }

/* Arrow */
.l1-arrow {
  color: #237841;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  flex-shrink: 0;
}

/* Result chip — green filled */
.l1-result {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #237841;
  color: #FFFFFF;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: clamp(13px, 1.1vw, 15px);
  padding: 8px 16px;
  border-radius: 8px;
  white-space: nowrap;
}
.l1-result::before {
  content: '✓';
  font-weight: 900;
}

/* Responsive */
@media (max-width: 768px) {
  .l1-flow { padding: 20px; }
  .l1-flow-steps {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .l1-arrow {
    transform: rotate(90deg);
    margin: 2px 0;
  }
}

/* ===== layer2-01-header-pickwho.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

/* ============ LAYER 2 HEADER ============ */
.l2-header {
  width: 82%;
  margin: 60px auto 50px;
  font-family: 'Montserrat', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.l2-header-bars-left,
.l2-header-bars-right {
  display: flex;
  gap: 0;
  flex: 1;
  height: 8px;
  max-width: 340px;
}
.l2-header-bars-left span,
.l2-header-bars-right span { flex: 1; height: 100%; }
.l2-bar-red    { background: #E52828; }
.l2-bar-yellow { background: #FFCC00; }
.l2-bar-blue   { background: #0055BF; }
.l2-bar-green  { background: #237841; }

.l2-header-title {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
/* "Layer 2:" — solid red */
.l2-header-title .l2-prefix {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(22px, 2.2vw, 32px);
  color: #E52828;
  white-space: nowrap;
}
/* "Setup & Personalization" — konturlu */
.l2-header-title .l2-badge {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(22px, 2.2vw, 32px);
  color: #FFFFFF;
  -webkit-text-stroke: 2px #E52828;
  paint-order: stroke fill;
  text-shadow:
    2px 2px 0 #E52828,
    -2px -2px 0 #E52828,
    2px -2px 0 #E52828,
    -2px 2px 0 #E52828,
    0 2px 0 #E52828,
    0 -2px 0 #E52828,
    2px 0 0 #E52828,
    -2px 0 0 #E52828;
  white-space: nowrap;
  line-height: 1.1;
}

/* ============ PICK WHO PLAYS CARD ============ */
.l2-pick {
  width: 82%;
  margin: 0 auto 20px;
  font-family: 'Montserrat', sans-serif;
  background: #E52828;
  border: 3px solid #E52828;
  border-bottom-width: 6px;
  border-radius: 12px;
  padding: 10px 14px 18px 36px;
  color: #FFFFFF;
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 28px;
  align-items: center;
}

.l2-pick-left h2 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(20px, 2vw, 28px);
  color: #FFFFFF;
  margin: 0 0 12px 0;
  line-height: 1.15;
}
.l2-pick-left p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #FFFFFF;
  line-height: 1.5;
  margin: 0 0 24px 0;
}

/* Profile pills — flex row, badge sits next to info naturally */
.l2-profiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.l2-profile {
  background: #F2F2F2;
  color: #1D1D1B;
  border-radius: 8px;
  padding: 10px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 52px;
}
.l2-profile-icon {
  width: 28px;
  height: 28px;
  background: #D8D8D8;
  border-radius: 5px;
  flex-shrink: 0;
}
.l2-profile-info {
  flex: 1;
  min-width: 0;
}
.l2-profile-name {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(12px, 1.1vw, 14px);
  line-height: 1.2;
  color: #1D1D1B;
}
.l2-profile-sub {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(10px, 0.9vw, 12px);
  color: #666;
  line-height: 1.2;
  margin-top: 2px;
}
.l2-profile-badge {
  background: #0055BF;
  color: #FFFFFF;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 10px;
  padding: 3px 7px;
  border-radius: 4px;
  flex-shrink: 0;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

/* Right side — white container with screenshot */
.l2-pick-right {
  background: #FFFFFF;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.l2-pick-right img {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
}

/* Responsive */
@media (max-width: 900px) {
  .l2-header {
    flex-wrap: wrap;
    gap: 12px;
  }
  .l2-header-bars-left,
  .l2-header-bars-right { max-width: 100%; }
  .l2-pick {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 24px;
  }
  .l2-profiles {
    grid-template-columns: 1fr;
  }
}

/* ===== layer2-02-scenes.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

/* ============ 50 SCENES CARD ============ */
.l2-scenes {
  width: 82%;
  margin: 0 auto 30px;
  font-family: 'Montserrat', sans-serif;
  background: #E52828;
  border: 3px solid #E52828;
  border-bottom-width: 6px;
  border-radius: 12px;
  padding: 10px 14px 18px 36px;
  color: #FFFFFF;
  display: grid;
  grid-template-columns: 1fr 1.8fr;
  gap: 26px;
  align-items: center;
}

/* Left side — text */
.l2-scenes-label {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #FFFFFF;
  margin: 0 0 4px 0;
}

.l2-scenes h2 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(44px, 6vw, 88px);
  color: #FFFFFF;
  margin: 0 0 22px 0;
  line-height: 1;
  letter-spacing: -1px;
}

.l2-scenes-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 24px;
}
.l2-scenes-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.l2-scenes-list li {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: clamp(13px, 1.2vw, 16px);
  line-height: 1.5;
  color: #FFFFFF;
}
/* "and more..." — italic, last item of RIGHT column */
.l2-scenes-list li.more {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-style: italic;
  font-size: clamp(16px, 1.5vw, 20px);
  color: #FFFFFF;
  margin-top: 10px;
  line-height: 1.2;
}

/* Right side — stacked scene images */
.l2-scenes-stack {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  cursor: pointer;
  user-select: none;
}
.l2-scenes-stack img {
  position: absolute;
  top: 0;
  height: 100%;
  width: 82%;
  border-radius: 14px;
  object-fit: cover;
  box-shadow: -6px 0 14px rgba(0,0,0,0.22);
  transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s ease;
}
/* En soldaki ARKA (en küçük z-index) → sağa doğru ÖNE — tight stacking */
.l2-scenes-stack .scene-1 { left: 0%;    z-index: 1; }
.l2-scenes-stack .scene-2 { left: 3.6%;  z-index: 2; }
.l2-scenes-stack .scene-3 { left: 7.2%;  z-index: 3; }
.l2-scenes-stack .scene-4 { left: 10.8%; z-index: 4; }
.l2-scenes-stack .scene-5 { left: 14.4%; z-index: 5; }
.l2-scenes-stack .scene-6 { left: 18%;   z-index: 6; }

/* Cycling states — when .cycling is added, the front card slides out */
.l2-scenes-stack.cycling img.going-back {
  transform: translateX(-10%) scale(0.92);
  opacity: 0;
  z-index: 0 !important;
}

/* Responsive */
@media (max-width: 900px) {
  .l2-scenes {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px;
  }
  .l2-scenes-stack {
    aspect-ratio: 16 / 10;
  }
}
@media (max-width: 500px) {
  .l2-scenes-list {
    grid-template-columns: 1fr;
  }
}

/* ===== layer2-03-minifigure-custom.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l2-mfc {
  width: 82%;
  margin: 0 auto 30px;
  font-family: 'Montserrat', sans-serif;
}

/* Title — solid red */
.l2-mfc-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(28px, 3.2vw, 48px);
  color: #E52828;
  margin: 0 0 16px 0;
  line-height: 1.15;
}

.l2-mfc-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #1D1D1B;
  line-height: 1.6;
  margin: 0 0 28px 0;
  max-width: 85%;
}

/* ============ TABS (Hair/Head/Torso/Legs) ============ */
.l2-mfc-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 0;
}
.l2-mfc-tab {
  background: #FFFFFF;
  border: 4px solid #E52828;
  border-bottom-width: 10px;
  border-radius: 12px;
  padding: 18px 20px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(15px, 1.3vw, 19px);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  user-select: none;
  color: #1D1D1B;
}
.l2-mfc-tab:hover { transform: translateY(-2px); }
.l2-mfc-tab.active { background: #E52828; color: #FFFFFF; }

/* Tab content wrapper */
.l2-mfc-content { display: none; margin-top: 18px; }
.l2-mfc-content.active { display: block; }

/* Placeholder for Head/Torso/Legs */
.l2-mfc-placeholder {
  background: #E52828;
  border: 3px solid #E52828;
  border-bottom-width: 6px;
  border-radius: 12px;
  padding: 100px 28px;
  color: #FFFFFF;
  text-align: center;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: clamp(16px, 1.5vw, 22px);
  letter-spacing: 0.3px;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ============ HAIR CUSTOMIZATION CARD ============ */
.l2-mfc-card {
  background: #E52828;
  border: 3px solid #E52828;
  border-bottom-width: 6px;
  border-radius: 12px;
  padding: 26px 26px 30px 32px;
  color: #FFFFFF;
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 30px;
  align-items: center;
}
.l2-mfc-card h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(20px, 2vw, 28px);
  color: #FFFFFF;
  margin: 0 0 10px 0;
  line-height: 1.15;
}
.l2-mfc-card-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #FFFFFF;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.l2-mfc-label {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(13px, 1.2vw, 15px);
  color: #FFFFFF;
  margin: 0 0 8px 0;
}

/* White panel (only for Color) */
.l2-mfc-panel {
  background: #FFFFFF;
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 14px;
}
/* Label inside white panel should be black */
.l2-mfc-panel .l2-mfc-label {
  color: #1D1D1B;
}

/* Pill buttons — no outer border, just white fills */
.l2-mfc-pill-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.l2-mfc-pill {
  background: #FFFFFF;
  color: #1D1D1B;
  border: none;
  border-radius: 8px;
  padding: 9px 10px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: clamp(12px, 1.1vw, 14px);
  text-align: center;
}

/* Horizontal divider — WHITE on red bg */
.l2-mfc-hdivider {
  height: 2px;
  background: #FFFFFF;
  margin: 12px 0;
}

/* Color palette — white bg + vertical divider */
.l2-mfc-colors {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.l2-mfc-color {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.15);
  cursor: pointer;
  flex-shrink: 0;
}
.l2-mfc-color.rainbow {
  background: conic-gradient(#E52828, #FFCC00, #237841, #0055BF, #8E44AD, #E52828);
  border-color: rgba(0,0,0,0.15);
}
.l2-mfc-vdivider {
  width: 1px;
  height: 22px;
  background: rgba(0,0,0,0.18);
  margin: 0 4px;
  flex-shrink: 0;
}

/* Right side — screenshot container */
.l2-mfc-shot {
  background: #FFFFFF;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.l2-mfc-shot img {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
}

/* ============ 4 ACTION BRICK BUTTONS ============ */
.l2-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 54px;
}
.l2-action-btn {
  position: relative;
  background: #FFFFFF;
  border: 4px solid;
  border-bottom-width: 12px;
  border-radius: 18px;
  padding: 20px 18px 22px 18px;
  text-align: center;
}

/* LEGO studs on top — PNG (same pattern as chapter cards) */
.l2-action-studs {
  position: absolute;
  top: -30px;
  left: 2%;
  right: 2%;
  height: 30px;
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 100% auto;
}

/* Inner icon/label badge (the PNG the user provided) — inside the body */
.l2-action-icon {
  display: block;
  max-width: 78%;
  width: auto;
  height: auto;
  margin: 0 auto 10px;
}

.l2-action-btn h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(22px, 2vw, 28px);
  margin: 6px 0 6px 0;
  line-height: 1.1;
}
.l2-action-btn p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(12px, 1.1vw, 14px);
  color: #1D1D1B;
  line-height: 1.4;
  margin: 0;
}

/* Color variants — border + stud PNG + title color */
.l2-action-btn.c-red    { border-color: #E52828; }
.l2-action-btn.c-red    h3 { color: #E52828; }
.l2-action-btn.c-red    .l2-action-studs { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-kirmizi.png'); }

.l2-action-btn.c-yellow { border-color: #FFCC00; }
.l2-action-btn.c-yellow h3 { color: #D4A017; }
.l2-action-btn.c-yellow .l2-action-studs { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-sari.png'); }

.l2-action-btn.c-green  { border-color: #237841; }
.l2-action-btn.c-green  h3 { color: #237841; }
.l2-action-btn.c-green  .l2-action-studs { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-yesil.png'); }

.l2-action-btn.c-blue   { border-color: #0055BF; }
.l2-action-btn.c-blue   h3 { color: #0055BF; }
.l2-action-btn.c-blue   .l2-action-studs { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-mavi.png'); }

/* Responsive */
@media (max-width: 900px) {
  .l2-mfc-tabs { grid-template-columns: repeat(2, 1fr); }
  .l2-mfc-card {
    grid-template-columns: 1fr;
    padding: 24px;
  }
  .l2-actions { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 500px) {
  .l2-mfc-tabs, .l2-actions { grid-template-columns: 1fr; }
}

/* ===== layer2-04-color-custom.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l2-colorcust {
  width: 82%;
  margin: 0 auto 20px;
  font-family: 'Montserrat', sans-serif;
  background: #F5F5F5;
  border: 3px solid #C8C8C8;
  border-bottom-width: 6px;
  border-radius: 12px;
  padding: 20px 22px 24px 30px;
  display: grid;
  grid-template-columns: 1fr auto 1.1fr;
  gap: 24px;
  align-items: center;
}

/* Vertical divider in middle — gray, with top/bottom margin */
.l2-colorcust-divider {
  width: 1px;
  background: rgba(0,0,0,0.18);
  margin: 24px 0;
  align-self: stretch;
}

.l2-colorcust-left h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(20px, 2vw, 28px);
  color: #1D1D1B;
  margin: 0 0 10px 0;
  line-height: 1.15;
}
.l2-colorcust-left p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #1D1D1B;
  line-height: 1.5;
  margin: 0 0 18px 0;
}

/* Palette rows container */
.l2-palettes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Single palette row */
.l2-palette {
  background: #FFFFFF;
  border: 2px solid #E5E5E5;
  border-radius: 10px;
  padding: 12px 14px;
}
.l2-palette-label {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(11px, 1vw, 13px);
  color: #1D1D1B;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.l2-palette-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.l2-palette-icon {
  width: 38px;
  height: 38px;
  background: #FFFFFF;
  border: 2px solid #E5E5E5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1D1D1B;
  flex-shrink: 0;
}
.l2-palette-icon svg {
  width: 22px;
  height: 22px;
}
.l2-palette-icon svg[viewBox="0 0 40 20"] {
  width: 32px;
  height: 16px;
}
.l2-palette-swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid transparent;
}
.l2-palette-swatch.selected {
  border-color: #2ECC71;
  box-shadow: 0 0 0 2px #FFFFFF inset;
}

/* Right side — screenshot */
.l2-colorcust-shot {
  background: #FFFFFF;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.l2-colorcust-shot img {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
}

@media (max-width: 900px) {
  .l2-colorcust {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 20px;
  }
  .l2-colorcust-divider { display: none; }
}

/* ===== layer2-05-mini2-reminder.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l2-reminder {
  width: 82%;
  margin: 0 auto 30px;
  font-family: 'Montserrat', sans-serif;
  background: #0055BF;
  border: 3px solid #000000;
  border-bottom-width: 10px;
  border-radius: 12px;
  padding: 22px 30px;
  display: flex;
  align-items: center;
  gap: 28px;
  color: #FFFFFF;
}

.l2-reminder-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.l2-reminder-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.l2-reminder-body {
  flex: 1;
  min-width: 0;
}
.l2-reminder-body h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(18px, 1.8vw, 24px);
  color: #FFFFFF;
  margin: 0 0 6px 0;
  line-height: 1.15;
}
.l2-reminder-body p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #FFFFFF;
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 600px) {
  .l2-reminder {
    padding: 18px 20px;
    gap: 16px;
  }
  .l2-reminder-icon { width: 48px; height: 48px; }
}

/* ===== layer2-06-build-mini.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l2-buildmini {
  width: 82%;
  margin: 0 auto 60px;
  font-family: 'Montserrat', sans-serif;
  background: #FFCC00;
  border: 3px solid #000000;
  border-bottom-width: 10px;
  border-radius: 12px;
  padding: 24px 32px 22px 32px;
  color: #1D1D1B;
}

.l2-buildmini-top {
  display: grid;
  grid-template-columns: 1fr 1.8fr;
  gap: 30px;
  align-items: start;
  margin-bottom: 24px;
}
.l2-buildmini-top h2 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(20px, 2vw, 28px);
  color: #1D1D1B;
  margin: 0;
  line-height: 1.2;
}
.l2-buildmini-top p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #1D1D1B;
  line-height: 1.55;
  margin: 0;
}

/* Demo row: Real Child col | Match | Mini Version col */
.l2-buildmini-demo {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: start;
}

/* White outer wrapper — her iki kart da bu beyaz çerçeveye sahip */
.l2-mini-wrap {
  background: #FFFFFF;
  border-radius: 14px;
  padding: 6px;
}

/* Real Child inner — cream + dashed border */
.l2-mini-inner-real {
  background: #FFF9DB;
  border: 2px dashed rgba(0,0,0,0.22);
  border-radius: 10px;
  padding: 22px 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* Mini Version inner — yellow (section bg) + BLACK solid border */
.l2-mini-inner-mini {
  background: #FFCC00;
  border: 2px solid #000000;
  border-radius: 10px;
  padding: 22px 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.l2-mini-inner-real img,
.l2-mini-inner-mini img {
  width: 58px;
  height: auto;
  display: block;
}
.l2-mini-inner-real h4,
.l2-mini-inner-mini h4 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(15px, 1.4vw, 18px);
  color: #1D1D1B;
  margin: 4px 0 0 0;
}
.l2-mini-inner-real p,
.l2-mini-inner-mini p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(12px, 1.1vw, 14px);
  color: #1D1D1B;
  margin: 0;
  line-height: 1.4;
}

/* AI disclaimer — sadece Real Child kolonunun altında */
.l2-mini-col-real {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.l2-buildmini-foot {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(11px, 1vw, 13px);
  color: rgba(0,0,0,0.55);
  text-align: center;
  margin: 0;
  font-style: italic;
}

/* Match section (ortadaki) */
.l2-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-top: 40px; /* center vertically-ish */
}
.l2-match-arrow {
  display: block;
  line-height: 0;
}
.l2-match-btn {
  background: #FFFFFF;
  color: #1D1D1B;
  border: 2px solid #000000;
  border-bottom-width: 6px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(13px, 1.2vw, 16px);
  padding: 8px 22px;
  border-radius: 10px;
  letter-spacing: 0.3px;
}

@media (max-width: 700px) {
  .l2-buildmini-top {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .l2-buildmini-demo {
    grid-template-columns: 1fr;
  }
  .l2-match {
    flex-direction: row;
    justify-content: center;
    padding-top: 0;
  }
  .l2-match-arrow svg { transform: rotate(90deg); }
}

/* ===== layer3-00-header-colorcoded.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

/* ============ HEADER BAR ============ */
.l3-header-wrap {
  width: 82%;
  margin: 60px auto 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  font-family: 'Montserrat', sans-serif;
}
.l3-bars {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: 5px;
}
.l3-bars span:nth-child(1) { background: #E52828; }
.l3-bars span:nth-child(2) { background: #FFCC00; }
.l3-bars span:nth-child(3) { background: #0055BF; }
.l3-bars span:nth-child(4) { background: #237841; }

.l3-header-title {
  font-weight: 900;
  font-size: clamp(24px, 2.8vw, 42px);
  margin: 0;
  white-space: nowrap;
  line-height: 1.1;
}
.l3-header-title .prefix {
  color: #E52828;
  margin-right: 10px;
}
.l3-header-title .konturlu {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  color: #FFFFFF;
  -webkit-text-stroke: 2px #E52828;
  paint-order: stroke fill;
  text-shadow:
    2px 2px 0 #E52828,
    -2px -2px 0 #E52828,
    2px -2px 0 #E52828,
    -2px 2px 0 #E52828,
    0 2px 0 #E52828,
    0 -2px 0 #E52828,
    2px 0 0 #E52828,
    -2px 0 0 #E52828;
  letter-spacing: 1px;
  white-space: nowrap;
  line-height: 1.1;
}

/* ============ COLOR-CODED CARD ============ */
.l3-colorcoded {
  width: 82%;
  margin: 0 auto 30px;
  background: #F5F5F5;
  border: 3px solid #C8C8C8;
  border-bottom-width: 6px;
  border-radius: 12px;
  padding: 18px 24px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 28px;
  align-items: center;
  font-family: 'Montserrat', sans-serif;
}
.l3-colorcoded-bricks {
  display: flex;
  gap: 6px;
  align-items: center;
}
.l3-colorcoded-bricks img {
  height: 54px;
  width: auto;
  display: block;
}
.l3-colorcoded-right h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(17px, 1.5vw, 22px);
  color: #1D1D1B;
  margin: 0 0 6px 0;
  line-height: 1.2;
}
.l3-colorcoded-right p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #1D1D1B;
  margin: 0;
  line-height: 1.55;
}

@media (max-width: 700px) {
  .l3-header-wrap { gap: 10px; }
  .l3-colorcoded {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .l3-colorcoded-bricks img { height: 42px; }
}

/* ===== layer3-01-categories.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l3-categories {
  width: 82%;
  margin: 0 auto 30px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  font-family: 'Montserrat', sans-serif;
}
.l3-cat {
  background: #FFFFFF;
  border: 4px solid;
  border-bottom-width: 10px;
  border-radius: 18px;
  padding: 16px 18px;
  text-align: left;
}

/* Color variants — border + label color */
.l3-cat.c-red    { border-color: #E52828; }
.l3-cat.c-red    .l3-cat-label { color: #E52828; }

.l3-cat.c-blue   { border-color: #0055BF; }
.l3-cat.c-blue   .l3-cat-label { color: #0055BF; }

.l3-cat.c-green  { border-color: #237841; }
.l3-cat.c-green  .l3-cat-label { color: #237841; }

.l3-cat.c-yellow { border-color: #FFCC00; }
.l3-cat.c-yellow .l3-cat-label { color: #D4A017; }

/* Label — top-left */
.l3-cat-label {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(14px, 1.3vw, 18px);
  margin: 0 0 10px 0;
  line-height: 1.1;
}

/* Inner content (PNG with mini bricks) — fixed height, preserves aspect */
.l3-cat-bricks {
  height: 60px;
  width: auto;
  max-width: 100%;
  display: block;
  margin: 0 auto;
}

@media (max-width: 900px) {
  .l3-categories { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 500px) {
  .l3-categories { grid-template-columns: 1fr; }
}

/* ===== layer3-02-tickbrick.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l3-tickbrick {
  width: 82%;
  margin: 0 auto 20px;
  background: #FFFFFF;
  border: 4px solid #C8C8C8;
  border-bottom-width: 10px;
  border-radius: 14px;
  padding: 16px 24px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 30px;
  align-items: center;
  font-family: 'Montserrat', sans-serif;
}
.l3-tickbrick-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.l3-tickbrick-left img {
  height: 56px;
  width: auto;
  display: block;
}
.l3-tickbrick-arrow {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 24px;
  color: #1D1D1B;
  line-height: 1;
}
.l3-tickbrick-right h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(17px, 1.5vw, 22px);
  color: #1D1D1B;
  margin: 0 0 6px 0;
  line-height: 1.2;
}
.l3-tickbrick-right p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #1D1D1B;
  margin: 0;
  line-height: 1.55;
}

@media (max-width: 700px) {
  .l3-tickbrick {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .l3-tickbrick-left { justify-content: center; }
}

/* ===== layer3-03-dialogue.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l3-dialogue {
  width: 82%;
  margin: 0 auto 30px;
  background: #FFFFFF;
  border: 4px solid #C8C8C8;
  border-bottom-width: 10px;
  border-radius: 14px;
  padding: 16px 24px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 30px;
  align-items: center;
  font-family: 'Montserrat', sans-serif;
}
.l3-dialogue-bricks {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.l3-dialogue-bricks img {
  height: 54px;
  width: auto;
  display: block;
}
.l3-dialogue-right h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(17px, 1.5vw, 22px);
  color: #1D1D1B;
  margin: 0 0 6px 0;
  line-height: 1.2;
}
.l3-dialogue-right p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #1D1D1B;
  margin: 0;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .l3-dialogue {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .l3-dialogue-bricks {
    justify-content: center;
    flex-wrap: wrap;
  }
  .l3-dialogue-bricks img { height: 42px; }
}

/* ===== layer3-04-demo-sequences.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l3-demoseq {
  width: 82%;
  margin: 0 auto 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  font-family: 'Montserrat', sans-serif;
}
.l3-demo-card {
  background: #FFFFFF;
  border: 4px solid #C8C8C8;
  border-bottom-width: 10px;
  border-radius: 14px;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  align-items: center;
}
.l3-demo-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.l3-demo-left img {
  height: 54px;
  width: auto;
  display: block;
}
.l3-demo-arrow {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 22px;
  color: #1D1D1B;
  margin: 0 2px;
}
.l3-demo-right h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(15px, 1.35vw, 19px);
  color: #1D1D1B;
  margin: 0 0 6px 0;
  line-height: 1.2;
}
.l3-demo-right p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(12px, 1.1vw, 14px);
  color: #1D1D1B;
  margin: 0;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .l3-demoseq { grid-template-columns: 1fr; }
}
@media (max-width: 550px) {
  .l3-demo-card {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .l3-demo-left { justify-content: center; }
}

/* ===== layer3-05-blackbrick.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l3-blackbrick {
  width: 82%;
  margin: 0 auto 30px;
  background: #FFFFFF;
  border: 4px solid #C8C8C8;
  border-bottom-width: 10px;
  border-radius: 14px;
  padding: 16px 24px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 30px;
  align-items: center;
  font-family: 'Montserrat', sans-serif;
}
.l3-blackbrick img {
  height: 56px;
  width: auto;
  display: block;
  flex-shrink: 0;
}
.l3-blackbrick-right h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(17px, 1.5vw, 22px);
  color: #1D1D1B;
  margin: 0 0 6px 0;
  line-height: 1.2;
}
.l3-blackbrick-right p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #1D1D1B;
  margin: 0;
  line-height: 1.55;
}

@media (max-width: 700px) {
  .l3-blackbrick {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

/* ===== layer3-06-record-screens.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l3-records {
  width: 82%;
  margin: 0 auto 40px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  font-family: 'Montserrat', sans-serif;
}
.l3-record-card {
  background: #FFFFFF;
  border: 4px solid #C8C8C8;
  border-bottom-width: 10px;
  border-radius: 14px;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 18px;
  align-items: center;
}
.l3-record-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}
.l3-record-text h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(16px, 1.4vw, 20px);
  color: #1D1D1B;
  margin: 0 0 10px 0;
  line-height: 1.25;
}
.l3-record-text p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(12px, 1.1vw, 14px);
  color: #1D1D1B;
  margin: 0 0 8px 0;
  line-height: 1.5;
}
.l3-record-text p:last-child { margin-bottom: 0; }

@media (max-width: 900px) {
  .l3-records { grid-template-columns: 1fr; }
}
@media (max-width: 550px) {
  .l3-record-card { grid-template-columns: 1fr; }
}

/* ===== layer3-07-soundtodialogue.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l3-s2d {
  width: 82%;
  margin: 40px auto 30px;
  font-family: 'Montserrat', sans-serif;
}

.l3-s2d-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(28px, 3.2vw, 48px);
  color: #E52828;
  margin: 0 0 14px 0;
  line-height: 1.15;
}
.l3-s2d-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #1D1D1B;
  line-height: 1.6;
  margin: 0 0 60px 0;
  max-width: 85%;
}

/* 4 RED studded brick cards */
.l3-s2d-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.l3-s2d-card {
  position: relative;
  background: #E52828;
  border: 4px solid #E52828;
  border-bottom-width: 10px;
  border-radius: 18px;
  padding: 22px 18px 20px 18px;
  color: #FFFFFF;
  text-align: left;
}

/* Red LEGO studs on top (all cards same — red) */
.l3-s2d-studs {
  position: absolute;
  top: -30px;
  left: 2%;
  right: 2%;
  height: 30px;
  background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-kirmizi.png');
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 100% auto;
}

/* Round icon at top of body */
.l3-s2d-icon {
  width: 44px;
  height: 44px;
  display: block;
  margin: 0 0 14px 0;
}

.l3-s2d-card h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(20px, 2vw, 28px);
  color: #FFFFFF;
  margin: 0 0 4px 0;
  line-height: 1.15;
}
.l3-s2d-card h4 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: clamp(12px, 1.1vw, 14px);
  color: #FFFFFF;
  margin: 0 0 12px 0;
  line-height: 1.3;
}
.l3-s2d-card p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(12px, 1.1vw, 14px);
  color: #FFFFFF;
  line-height: 1.5;
  margin: 0 0 8px 0;
}
.l3-s2d-card p:last-child { margin-bottom: 0; }

@media (max-width: 900px) {
  .l3-s2d-cards { grid-template-columns: repeat(2, 1fr); row-gap: 40px; }
}
@media (max-width: 500px) {
  .l3-s2d-cards { grid-template-columns: 1fr; }
}

/* ===== layer3-08-scene-cafe.html ===== */
.l3-cafe-wrap {
  width: 100%;
  margin: 20px auto 30px;
  text-align: center;
  line-height: 0;
}
.l3-cafe-wrap img {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

/* ===== layer3-09-scene-integration.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l3-sceneint {
  width: 82%;
  margin: 0 auto 30px;
  background: #E2EFFF;
  border: 4px solid #0055BF;
  border-bottom-width: 10px;
  border-radius: 14px;
  padding: 20px 26px 22px;
  font-family: 'Montserrat', sans-serif;
}

.l3-sceneint h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(18px, 1.7vw, 24px);
  color: #1D1D1B;
  margin: 0 0 6px 0;
  line-height: 1.2;
}
.l3-sceneint-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #1D1D1B;
  line-height: 1.55;
  margin: 0 0 18px 0;
}

.l3-sceneint-divider {
  height: 1px;
  background: rgba(0,85,191,0.3);
  margin: 14px 0 16px;
}

.l3-sceneint-subtitle {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(13px, 1.2vw, 15px);
  color: #1D1D1B;
  margin: 0 0 12px 0;
}

.l3-sceneint-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 24px;
  align-items: center;
}

.l3-sceneint-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.l3-sceneint-pill {
  background: #FFFFFF;
  border: 2px solid;
  border-bottom-width: 6px;
  border-radius: 8px;
  padding: 7px 14px 5px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(12px, 1.1vw, 14px);
  line-height: 1;
  white-space: nowrap;
  color: #1D1D1B;
}
.l3-sceneint-pill.c-red   { border-color: #E52828; }
.l3-sceneint-pill.c-blue  { border-color: #0055BF; }
.l3-sceneint-pill.c-green { border-color: #237841; }

.l3-sceneint-x {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 14px;
  color: #1D1D1B;
}

.l3-sceneint-note {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(12px, 1.1vw, 14px);
  color: #1D1D1B;
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 800px) {
  .l3-sceneint-row {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

/* ===== layer3-10-interaction-flow.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l3-intflow {
  width: 82%;
  margin: 0 auto 30px;
  background: #FFFFFF;
  border: 4px solid #237841;
  border-bottom-width: 10px;
  border-radius: 14px;
  padding: 22px 28px 26px;
  font-family: 'Montserrat', sans-serif;
}

.l3-intflow-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(20px, 2vw, 28px);
  color: #237841;
  margin: 0 0 20px 0;
  line-height: 1.15;
}

.l3-intflow-phase {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: clamp(12px, 1.1vw, 14px);
  color: rgba(0,0,0,0.45);
  margin: 0 0 14px 0;
  letter-spacing: 0.3px;
}

/* ============ PHASE 1 ============ */
.l3-intflow-phase1 {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 24px;
  align-items: center;
  margin-bottom: 8px;
}
.l3-intflow-p1-boxes {
  display: flex;
  align-items: center;
  gap: 12px;
}
.l3-intflow-p1-box {
  width: 56px;
  height: 56px;
  background: #E5E5E5;
  border-radius: 10px;
}
.l3-intflow-p1-arrow {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 22px;
  color: #1D1D1B;
}
.l3-intflow-p1-right h4 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(16px, 1.4vw, 20px);
  color: #1D1D1B;
  margin: 0 0 4px 0;
  line-height: 1.2;
}
.l3-intflow-p1-right p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(13px, 1.2vw, 15px);
  color: #1D1D1B;
  margin: 0;
  line-height: 1.5;
}

.l3-intflow-divider {
  height: 1px;
  background: rgba(35,120,65,0.3);
  margin: 22px 0 18px;
}

/* ============ PHASE 2 — 3 MODE CARDS ============ */
.l3-intflow-modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.l3-intflow-mode {
  border: 3px solid;
  border-bottom-width: 8px;
  border-radius: 14px;
  padding: 14px 16px;
}
.l3-intflow-mode.c-green  { background: #EDF9F1; border-color: #237841; }
.l3-intflow-mode.c-red    { background: #FFE8E8; border-color: #E52828; }
.l3-intflow-mode.c-yellow { background: #FFF5CF; border-color: #FFCC00; }

/* Top icon row */
.l3-intflow-icons {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.l3-intflow-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.l3-intflow-icon img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

/* Icon bg — always GREEN (left) + YELLOW (right), regardless of card color */
.l3-intflow-icon.i-1 { background: #237841; }
.l3-intflow-icon.i-2 { background: #FFCC00; }

/* Icons: white on green, dark on yellow */
.l3-intflow-icon.i-1 img { filter: brightness(0) invert(1); }
.l3-intflow-icon.i-2 img { filter: brightness(0); }

.l3-intflow-mode h4 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(14px, 1.3vw, 17px);
  color: #1D1D1B;
  margin: 0 0 8px 0;
  line-height: 1.2;
}

/* Pills row */
.l3-intflow-mode-pills {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
}
.l3-intflow-mode-pill {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(10px, 0.95vw, 12px);
  padding: 4px 10px;
  border-radius: 6px;
  line-height: 1;
}
.l3-intflow-mode-pill.p-green  { background: #237841; color: #FFFFFF; }
.l3-intflow-mode-pill.p-yellow { background: #FFCC00; color: #1D1D1B; }
.l3-intflow-mode-plus {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: 13px;
  color: #237841;
}

.l3-intflow-mode p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(11px, 1.05vw, 13px);
  color: #1D1D1B;
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 900px) {
  .l3-intflow-phase1 {
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .l3-intflow-modes { grid-template-columns: 1fr; }
}

/* ===== layer4-00-minijourney.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

/* ============ LAYER 4 HEADER BAR ============ */
.l4-header-wrap {
  width: 82%;
  margin: 60px auto 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  font-family: 'Montserrat', sans-serif;
}
.l4-bars {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: 5px;
}
.l4-bars span:nth-child(1) { background: #E52828; }
.l4-bars span:nth-child(2) { background: #FFCC00; }
.l4-bars span:nth-child(3) { background: #0055BF; }
.l4-bars span:nth-child(4) { background: #237841; }

.l4-header-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(24px, 2.8vw, 42px);
  margin: 0;
  white-space: nowrap;
  line-height: 1.1;
}
.l4-header-title .prefix {
  color: #E52828;
  margin-right: 10px;
}
.l4-header-title .konturlu {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  color: #FFFFFF;
  -webkit-text-stroke: 2px #E52828;
  paint-order: stroke fill;
  text-shadow:
    2px 2px 0 #E52828,
    -2px -2px 0 #E52828,
    2px -2px 0 #E52828,
    -2px 2px 0 #E52828,
    0 2px 0 #E52828,
    0 -2px 0 #E52828,
    2px 0 0 #E52828,
    -2px 0 0 #E52828;
  letter-spacing: 1px;
  white-space: nowrap;
  line-height: 1.1;
}

/* ============ MINI JOURNEY ============ */
.l4-mj {
  width: 82%;
  margin: 40px auto 30px;
  font-family: 'Montserrat', sans-serif;
}

.l4-mj-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(28px, 3.2vw, 48px);
  color: #E52828;
  margin: 0 0 12px 0;
  line-height: 1.15;
}
.l4-mj-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 18px);
  color: #1D1D1B;
  line-height: 1.6;
  margin: 0 0 60px 0;
  max-width: 85%;
}

/* Cards grid */
.l4-mj-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}
.l4-mj-card {
  position: relative;
  background: #FFFFFF;
  border: 4px solid;
  border-bottom-width: 10px;
  border-radius: 18px;
  padding: 22px 20px 22px;
}

/* Studs on top — same pattern as Layer 1/2/3 */
.l4-mj-card-studs {
  position: absolute;
  top: -30px;
  left: 2%;
  right: 2%;
  height: 30px;
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 100% auto;
  pointer-events: none;
  z-index: 2;
}

/* Color variants */
.l4-mj-card.c-red    { border-color: #E52828; }
.l4-mj-card.c-red    .l4-mj-card-studs { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-kirmizi.png'); }
.l4-mj-card.c-red    .l4-mj-card-title { color: #E52828; }

.l4-mj-card.c-blue   { border-color: #0055BF; }
.l4-mj-card.c-blue   .l4-mj-card-studs { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-mavi.png'); }
.l4-mj-card.c-blue   .l4-mj-card-title { color: #0055BF; }

.l4-mj-card.c-yellow { border-color: #FFCC00; }
.l4-mj-card.c-yellow .l4-mj-card-studs { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-sari.png'); }
.l4-mj-card.c-yellow .l4-mj-card-title { color: #D4A017; }

.l4-mj-card.c-green  { border-color: #237841; }
.l4-mj-card.c-green  .l4-mj-card-studs { background-image: url('https://mini-talks.org/wp-content/uploads/2026/02/yeni-3-yesil.png'); }
.l4-mj-card.c-green  .l4-mj-card-title { color: #237841; }

/* Head icon */
.l4-mj-card-icon {
  width: 58px;
  height: auto;
  display: block;
  margin: 0 0 14px 0;
}

.l4-mj-card-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(20px, 1.9vw, 28px);
  margin: 0 0 10px 0;
  line-height: 1.1;
}

.l4-mj-card-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(12px, 1.15vw, 15px);
  line-height: 1.5;
  margin: 0;
}
/* Card description color matches title tone (lighter) */
.l4-mj-card.c-red    .l4-mj-card-desc { color: #E86969; }
.l4-mj-card.c-blue   .l4-mj-card-desc { color: #5A83C9; }
.l4-mj-card.c-yellow .l4-mj-card-desc { color: #D4A017; }
.l4-mj-card.c-green  .l4-mj-card-desc { color: #5AA377; }

@media (max-width: 900px) {
  .l4-mj-cards { grid-template-columns: repeat(2, 1fr); row-gap: 44px; }
}
@media (max-width: 500px) {
  .l4-mj-cards { grid-template-columns: 1fr; }
}

/* ===== layer4-01-dashboard-slider.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l4-slider {
  width: 82%;
  margin: 0 auto 40px;
  position: relative;
  font-family: 'Montserrat', sans-serif;
}

/* 2-item grid — fills full 82% width (same as cards above) */
.l4-slider-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Chevron arrow buttons — positioned OUTSIDE the 82% grid */
.l4-slider-btn {
  position: absolute !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 46px !important;
  height: 46px !important;
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: none !important;
  opacity: 0.6;
  transition: opacity 0.2s ease !important;
  z-index: 3;
}
.l4-slider-btn.prev { left: -60px !important; }
.l4-slider-btn.next { right: -60px !important; }

.l4-slider-btn:hover {
  opacity: 1 !important;
  background: transparent !important;
}
.l4-slider-btn:focus {
  outline: none !important;
  background: transparent !important;
}
.l4-slider-btn svg {
  width: 40px !important;
  height: 40px !important;
  display: block !important;
}
.l4-slider-btn svg path {
  stroke: #999999 !important;
  stroke-width: 2.5 !important;
  fill: none !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}

/* Each slide — gray brick bordered card */
.l4-slider-item {
  background: #FFFFFF;
  border: 4px solid #C8C8C8;
  border-bottom-width: 10px;
  border-radius: 14px;
  padding: 10px;
  overflow: hidden;
}
.l4-slider-item img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 6px;
}

@media (max-width: 900px) {
  .l4-slider-grid { grid-template-columns: 1fr; }
  .l4-slider-btn { width: 36px !important; height: 36px !important; }
  .l4-slider-btn.prev { left: -44px !important; }
  .l4-slider-btn.next { right: -44px !important; }
  .l4-slider-btn svg { width: 28px !important; height: 28px !important; }
}
@media (max-width: 700px) {
  .l4-slider-btn.prev { left: 4px !important; }
  .l4-slider-btn.next { right: 4px !important; }
}

/* ===== layer4-02-motivation-tabs.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l4-tabs-wrap {
  width: 82%;
  margin: 0 auto 30px;
  font-family: 'Montserrat', sans-serif;
}

/* ============ TABS ============ */
.l4-tabs {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  margin-bottom: 24px;
  align-items: stretch;
}
.l4-tab {
  background: #FFFFFF;
  border: 3px solid #E52828;
  border-bottom-width: 8px;
  border-radius: 12px;
  padding: 12px 10px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(11px, 1vw, 14px);
  color: #1D1D1B;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  line-height: 1.25;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
}
.l4-tab:hover { transform: translateY(-2px); }
.l4-tab.active {
  background: #E52828;
  color: #FFFFFF;
}

/* ============ CONTENT CARDS ============ */
.l4-tab-content { display: none; }
.l4-tab-content.active { display: block; }

.l4-content-card {
  background: #E52828;
  border: 3px solid #E52828;
  border-bottom-width: 6px;
  border-radius: 14px;
  padding: 26px 28px;
  color: #FFFFFF;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 28px;
  align-items: stretch;
  min-height: 380px;
}

/* Manage/View toggle — pressed (active) vs unpressed (inactive) brick effect */
.l4-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}
.l4-toggle-btn {
  background: #FFFFFF !important;
  color: #000000 !important;
  border: 2px solid #000000 !important;
  border-bottom-width: 6px !important;
  border-radius: 8px !important;
  padding: 6px 22px 4px !important;
  font-family: 'Montserrat', sans-serif !important;
  font-weight: 900 !important;
  font-size: clamp(12px, 1.1vw, 14px) !important;
  cursor: pointer !important;
  user-select: none;
  transition: all 0.15s ease !important;
  margin: 0 !important;
  line-height: 1 !important;
}
.l4-toggle-btn.active {
  background: #000000 !important;
  color: #FFFFFF !important;
  border-bottom-width: 2px !important;
  padding-bottom: 8px !important;
}

/* Mode content — Manage vs View swap */
.l4-mode-content { display: none; }
.l4-mode-content.active { display: block; }

.l4-content-left h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(22px, 2.2vw, 32px);
  color: #FFFFFF;
  margin: 0 0 12px 0;
  line-height: 1.15;
}
.l4-content-left p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #FFFFFF;
  line-height: 1.55;
  margin: 0;
}

/* Right side — screenshot + mode swap, fills stretched column */
.l4-content-shot {
  background: #FFFFFF;
  border-radius: 10px;
  padding: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.l4-shot-mode {
  display: none;
  width: 100%;
  height: 100%;
}
.l4-shot-mode.active {
  display: flex;
  align-items: center;
  justify-content: center;
}
.l4-shot-mode img {
  width: 100%;
  max-height: 100%;
  height: auto;
  display: block;
  border-radius: 6px;
  object-fit: contain;
}
.l4-shot-placeholder {
  background: #F5F5F5;
  border-radius: 6px;
  width: 100%;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: clamp(13px, 1.2vw, 16px);
  color: #999999;
  letter-spacing: 0.3px;
}

/* Left side also vertically centered within stretched column */
.l4-content-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

@media (max-width: 900px) {
  .l4-tabs { grid-template-columns: repeat(4, 1fr); }
  .l4-content-card {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
@media (max-width: 500px) {
  .l4-tabs { grid-template-columns: repeat(2, 1fr); }
}

/* ===== layer4-03-privacy.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l4-privacy {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  background: #237841;
  padding: 40px 0;
  margin-top: 30px;
  margin-bottom: 30px;
  font-family: 'Montserrat', sans-serif;
}
.l4-privacy-inner {
  width: 82%;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 0.8fr;
  gap: 30px;
  align-items: stretch;
}

/* Left column — flex so cards fill height */
.l4-privacy-left {
  display: flex;
  flex-direction: column;
}
.l4-privacy-left h2 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(22px, 2.2vw, 32px);
  color: #FFFFFF;
  margin: 0 0 14px 0;
  line-height: 1.2;
}
.l4-privacy-intro {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(13px, 1.2vw, 15px);
  color: #FFFFFF;
  line-height: 1.55;
  margin: 0 0 22px 0;
  max-width: 95%;
}

/* 3 cards wrapper — fills remaining height */
.l4-privacy-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

/* 3 white info cards — with gray brick border */
.l4-privacy-card {
  background: #FFFFFF;
  border: 3px solid #C8C8C8;
  border-bottom-width: 8px;
  border-radius: 12px;
  padding: 16px 18px;
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 14px;
  align-items: center;
  flex: 1;
}
.l4-privacy-card-icon {
  width: 40px;
  height: 40px;
  background: #E5E5E5;
  border-radius: 8px;
}
.l4-privacy-card h4 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(14px, 1.3vw, 16px);
  color: #237841;
  margin: 0 0 4px 0;
  line-height: 1.2;
}
.l4-privacy-card p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(12px, 1.1vw, 14px);
  color: #1D1D1B;
  line-height: 1.5;
  margin: 0;
}

/* Right side — shield card with gray brick border + centered vertically */
.l4-privacy-right {
  background: #FFFFFF;
  border: 3px solid #C8C8C8;
  border-bottom-width: 8px;
  border-radius: 14px;
  padding: 24px 26px;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.l4-privacy-right-head {
  margin-bottom: 14px;
}
.l4-privacy-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.l4-privacy-shield {
  width: 48px;
  height: auto;
  display: block;
  margin: 0 auto 10px;
}
.l4-privacy-right h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(18px, 1.7vw, 24px);
  color: #237841;
  margin: 0 0 16px 0;
  text-align: center;
  line-height: 1.2;
}
.l4-privacy-item {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(11px, 1.05vw, 13px);
  color: #1D1D1B;
  line-height: 1.3;
}
.l4-privacy-item-mark {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: #FFFFFF;
  font-size: 14px;
}
.l4-privacy-item.check .l4-privacy-item-mark { background: #237841; }
.l4-privacy-item.cross .l4-privacy-item-mark { background: #E52828; }

@media (max-width: 900px) {
  .l4-privacy-inner {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* ===== layer4-04-research.html ===== */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');

.l4-research {
  width: 82%;
  margin: 30px auto 60px;
  font-family: 'Montserrat', sans-serif;
}

.l4-research-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(26px, 2.8vw, 40px);
  color: #E52828;
  margin: 0 0 14px 0;
  line-height: 1.2;
}
.l4-research-desc {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: clamp(14px, 1.3vw, 17px);
  color: #1D1D1B;
  line-height: 1.55;
  margin: 0 0 60px 0;
  max-width: 85%;
}

/* 3x2 cards grid */
.l4-research-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 70px 24px;
}

.l4-research-card {
  position: relative;
  background: #FFFFFF;
  border: 4px solid #E52828;
  border-bottom-width: 12px;
  border-radius: 18px;
  padding: 24px 22px 22px;
}

/* 4-stud red on top — 92% width centered */
.l4-research-studs {
  position: absolute;
  top: -33px;
  left: 0;
  right: 0;
  width: 92%;
  height: 30px;
  margin: 0 auto;
  background-image: url('https://mini-talks.org/wp-content/uploads/2026/04/yeni_kirmizi_studs_4.png');
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: contain;
  pointer-events: none;
  z-index: 2;
}

.l4-research-icon {
  width: 58px;
  height: auto;
  display: block;
  margin: 0 0 16px 0;
}

.l4-research-card h3 {
  font-family: 'Montserrat', sans-serif;
  font-weight: 900;
  font-size: clamp(18px, 1.7vw, 24px);
  color: #E52828;
  margin: 0 0 14px 0;
  line-height: 1.2;
}

.l4-research-card p {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  font-size: clamp(12px, 1.15vw, 14px);
  color: #1D1D1B;
  line-height: 1.55;
  margin: 0;
}

@media (max-width: 900px) {
  .l4-research-cards {
    grid-template-columns: repeat(2, 1fr);
    row-gap: 44px;
  }
}
@media (max-width: 550px) {
  .l4-research-cards { grid-template-columns: 1fr; }
}`;

// ============================================================
// LAYER HTML — combined body content from all widgets
// ============================================================
const LAYERS_HTML = `<!-- ===== layer1-00-hero.html ===== -->
<div class="l1-intro">
  <div class="l1-intro-grid">
    <div class="l1-intro-left">
      <h1 class="l1-intro-title">Mini-Talks Studio</h1>
      <div class="l1-intro-bars">
        <span style="background:#E52828"></span>
        <span style="background:#FFCC00"></span>
        <span style="background:#0055BF"></span>
        <span style="background:#237841"></span>
      </div>
      <p class="l1-intro-desc">
        A safe communication practice app for children with selective mutism — built with animation, personalized Minis, and structured speech levels.
      </p>
    </div>
    <div class="l1-intro-right">
      <div class="l1-intro-logo-card">
        <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="Mini-Talks" />
      </div>
    </div>
  </div>
</div>


<div class="l1-challenge">
  <div class="l1-challenge-inner">
    <h2>Selective mutism is a silent challenge.</h2>
    <p class="l1-challenge-desc">
      Children want to speak. But they can't in every setting. Mini-Talks bridges that gap with a safe, structured, and playful experience.
    </p>

    <div class="l1-stats-brick">
      <div class="l1-stats-studs"></div>
      <div class="l1-stats-grid">
        <div class="l1-stat-cell">
          <div class="l1-stat-big">1 in 140</div>
          <div class="l1-stat-title">Prevalence in children</div>
          <div class="l1-stat-sub">Anxiety-based disorder</div>
        </div>
        <div class="l1-stat-cell">
          <div class="l1-stat-big">4</div>
          <div class="l1-stat-title">Speech levels</div>
          <div class="l1-stat-sub">Sound → Word → Sentence → Dialogue</div>
        </div>
        <div class="l1-stat-cell">
          <div class="l1-stat-big">4</div>
          <div class="l1-stat-title">User roles</div>
          <div class="l1-stat-sub">Child, Parent, Expert, Builder</div>
        </div>
        <div class="l1-stat-cell">
          <div class="l1-stat-big infinity">∞</div>
          <div class="l1-stat-title">Mini combinations</div>
          <div class="l1-stat-sub">Hair × Head × Torso × Legs</div>
        </div>
      </div>
    </div>
  </div>
</div>


<div class="l1-chapters">
  <div class="l1-chapters-grid">

    <div class="l1-chapter c-red">
      <div class="l1-chapter-studs"></div>
      <div class="l1-chapter-body">
        <div class="l1-chapter-label">Chapter 1</div>
        <h3 class="l1-chapter-title">Entry &amp; Identity</h3>
        <p class="l1-chapter-desc">4 roles, secure sign in, parent-child expert connections.</p>
      </div>
    </div>

    <div class="l1-chapter c-blue">
      <div class="l1-chapter-studs"></div>
      <div class="l1-chapter-body">
        <div class="l1-chapter-label">Chapter 2</div>
        <h3 class="l1-chapter-title">Setup &amp; Personalization</h3>
        <p class="l1-chapter-desc">59 scenes, Mini figure builder, Hair/Head/Torso/Legs</p>
      </div>
    </div>

    <div class="l1-chapter c-green">
      <div class="l1-chapter-studs"></div>
      <div class="l1-chapter-body">
        <div class="l1-chapter-label">Chapter 3</div>
        <h3 class="l1-chapter-title">Interaction System</h3>
        <p class="l1-chapter-desc">Brick slot system, demo, record, animated playback, expert black brick.</p>
      </div>
    </div>

    <div class="l1-chapter c-yellow">
      <div class="l1-chapter-studs"></div>
      <div class="l1-chapter-body">
        <div class="l1-chapter-label">Chapter 4</div>
        <h3 class="l1-chapter-title">Progress &amp; Dashboard</h3>
        <p class="l1-chapter-desc">8 widgets, View/Manage roles, clinical observation infrastructure</p>
      </div>
    </div>

  </div>
</div>

<!-- ===== layer1-01-header-mainmenu.html ===== -->
<div class="l1-header">
  <div class="l1-header-bars-left">
    <span class="l1-bar-red"></span>
    <span class="l1-bar-yellow"></span>
    <span class="l1-bar-blue"></span>
    <span class="l1-bar-green"></span>
  </div>
  <div class="l1-header-title">
    <span class="l1-prefix">Layer 1:</span>
    <span class="l1-badge">Entry &amp; Identity</span>
  </div>
  <div class="l1-header-bars-right">
    <span class="l1-bar-red"></span>
    <span class="l1-bar-yellow"></span>
    <span class="l1-bar-blue"></span>
    <span class="l1-bar-green"></span>
  </div>
</div>


<div class="l1-mm">
  <h2 class="l1-mm-title">Main Menu</h2>
  <p class="l1-mm-desc">
    The main menu is intentionally simple. Three brick buttons: Play, About, Settings. No clutter, no pressure. Sign up from the top-right corner to unlock the full experience — 50 scenes, full customization, Mini Journey dashboard. Or just press Play without an account.
  </p>

  <div class="l1-mm-grid">
    <div class="l1-mm-main-shot">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/eaa52c602f6e3126fec05fa64bda03211575ebe6.png" alt="Mini-Talks Main Menu" />
    </div>

    <div class="l1-mm-side">
      <div class="l1-mm-side-shot border-blue">
        <img src="https://mini-talks.org/wp-content/uploads/2026/04/fd03fc950280b61266a4ba5a377cbc01f7a12f95.jpg" alt="About Page" />
      </div>
      <div class="l1-mm-side-shot border-green">
        <img src="https://mini-talks.org/wp-content/uploads/2026/04/7f100ec40e098fc5c9f9d5120d1b27916bc3c6d5.png" alt="Settings Page" />
      </div>
    </div>
  </div>
</div>

<!-- ===== layer1-02-roles-interactive.html ===== -->
<div class="l1-roles">
  <h2 class="l1-roles-title">4 Roles, 4 Distinct Experiences</h2>
  <p class="l1-roles-desc">
    When creating an account, users choose from 4 roles. Each role brings a different registration form and different permissions.
  </p>

  
  <div class="l1-roles-tabs">
    <div class="l1-role-tab role-red active" data-role="child" onclick="l1SelectRole(this, 'child')">Child (Mini)</div>
    <div class="l1-role-tab role-blue" data-role="parent" onclick="l1SelectRole(this, 'parent')">Parent</div>
    <div class="l1-role-tab role-green" data-role="expert" onclick="l1SelectRole(this, 'expert')">Expert</div>
    <div class="l1-role-tab role-yellow" data-role="builder" onclick="l1SelectRole(this, 'builder')">Builder</div>
  </div>

  
  <div class="l1-role-content bg-red active" data-content="child">
    <div class="l1-role-left">
      <h3>Child (Mini)</h3>
      <div class="l1-role-subtitle">Plays, records</div>
      <ul class="l1-role-features">
        <li class="checked">Create &amp; play Mini</li>
        <li class="checked">Record &amp; playback voice</li>
        <li class="checked">Sees their own Journey</li>
        <li class="unchecked">No dashboard management</li>
      </ul>
    </div>
    <div class="l1-role-forms-panel">
      <div class="l1-role-form-item">
        <img src="https://mini-talks.org/wp-content/uploads/2026/04/4e1a6770fda409b8251621157b780e6e4b019df3.png" alt="Child Form Step 1" />
      </div>
      <div class="l1-role-form-item">
        <img src="https://mini-talks.org/wp-content/uploads/2026/04/257f66f84fca90421a54eacf22b37c689b8dc52f.png" alt="Child Form Step 2" />
      </div>
    </div>
  </div>

  
  <div class="l1-role-content bg-blue" data-content="parent">
    <div class="l1-role-left">
      <h3>Parent</h3>
      <div class="l1-role-subtitle">Manages, approves, monitors</div>
      <ul class="l1-role-features">
        <li class="checked">Manages child profiles</li>
        <li class="checked">Approves expert connections</li>
        <li class="checked">Views progress dashboard</li>
        <li class="checked">Manages settings</li>
      </ul>
    </div>
    <div class="l1-role-forms-panel">
      <div class="l1-role-form-item">
        <div class="l1-role-form-placeholder">Parent Form 1<br>— image pending —</div>
      </div>
      <div class="l1-role-form-item">
        <div class="l1-role-form-placeholder">Parent Form 2<br>— image pending —</div>
      </div>
    </div>
  </div>

  
  <div class="l1-role-content bg-green" data-content="expert">
    <div class="l1-role-left">
      <h3>Expert</h3>
      <div class="l1-role-subtitle">Observes, guides (view-only)</div>
      <ul class="l1-role-features">
        <li class="checked">Tracks connected Mini's progress</li>
        <li class="checked">Access via parent approval</li>
        <li class="checked">Clinical observation infrastructure</li>
        <li class="unchecked">Cannot edit settings or profile</li>
      </ul>
    </div>
    <div class="l1-role-forms-panel">
      <div class="l1-role-form-item">
        <div class="l1-role-form-placeholder">Expert Form 1<br>— image pending —</div>
      </div>
      <div class="l1-role-form-item">
        <div class="l1-role-form-placeholder">Expert Form 2<br>— image pending —</div>
      </div>
    </div>
  </div>

  
  <div class="l1-role-content bg-yellow" data-content="builder">
    <div class="l1-role-left">
      <h3>Builder</h3>
      <div class="l1-role-subtitle">Creates, customizes (18+)</div>
      <ul class="l1-role-features">
        <li class="checked">Customizes own figures</li>
        <li class="checked">Plays &amp; records scenes</li>
        <li class="checked">LEGO Creations section</li>
        <li class="unchecked">No Mini management</li>
      </ul>
    </div>
    <div class="l1-role-forms-panel">
      <div class="l1-role-form-item">
        <div class="l1-role-form-placeholder">Builder Form 1<br>— image pending —</div>
      </div>
      <div class="l1-role-form-item">
        <div class="l1-role-form-placeholder">Builder Form 2<br>— image pending —</div>
      </div>
    </div>
  </div>

</div>

<!-- ===== layer1-03-connections.html ===== -->
<div class="l1-conn">
  <h2 class="l1-conn-title">How connections work.</h2>
  <p class="l1-conn-desc">
    Three paths, one rule: nothing happens without parent approval.
  </p>

  
  <div class="l1-flow flow-blue">
    <h3 class="l1-flow-title">Child Starts</h3>
    <div class="l1-flow-steps">
      <div class="l1-step"><span class="l1-step-num">1</span> Child fills sign-up form + enters parent's email</div>
      <span class="l1-arrow">→</span>
      <div class="l1-step"><span class="l1-step-num">2</span> 'Send Parents Request' is triggered</div>
      <span class="l1-arrow">→</span>
      <div class="l1-step"><span class="l1-step-num">3</span> Parent approves</div>
      <span class="l1-arrow">→</span>
      <div class="l1-result">Account activates</div>
    </div>
  </div>

  
  <div class="l1-flow flow-yellow">
    <h3 class="l1-flow-title">Parent Starts</h3>
    <div class="l1-flow-steps">
      <div class="l1-step"><span class="l1-step-num">1</span> Parent signs into their account</div>
      <span class="l1-arrow">→</span>
      <div class="l1-step"><span class="l1-step-num">2</span> Creates child profile via 'Add Child'</div>
      <span class="l1-arrow">→</span>
      <div class="l1-result">Active immediately (parent is already approving)</div>
    </div>
  </div>

  
  <div class="l1-flow flow-green">
    <h3 class="l1-flow-title">Expert Starts</h3>
    <div class="l1-flow-steps">
      <div class="l1-step"><span class="l1-step-num">1</span> Expert taps 'Add Mini'</div>
      <span class="l1-arrow">→</span>
      <div class="l1-step"><span class="l1-step-num">2</span> Parent receives request</div>
      <span class="l1-arrow">→</span>
      <div class="l1-step"><span class="l1-step-num">3</span> Parent approves</div>
      <span class="l1-arrow">→</span>
      <div class="l1-result">View-only access</div>
    </div>
  </div>

</div>

<!-- ===== layer2-01-header-pickwho.html ===== -->
<div class="l2-header">
  <div class="l2-header-bars-left">
    <span class="l2-bar-red"></span>
    <span class="l2-bar-yellow"></span>
    <span class="l2-bar-blue"></span>
    <span class="l2-bar-green"></span>
  </div>
  <div class="l2-header-title">
    <span class="l2-prefix">Layer 2:</span>
    <span class="l2-badge">Setup &amp; Personalization</span>
  </div>
  <div class="l2-header-bars-right">
    <span class="l2-bar-red"></span>
    <span class="l2-bar-yellow"></span>
    <span class="l2-bar-blue"></span>
    <span class="l2-bar-green"></span>
  </div>
</div>


<div class="l2-pick">
  <div class="l2-pick-left">
    <h2>Pick who plays.</h2>
    <p>Parents can register multiple children. When Play is pressed, they choose which profile will play. Each child's scenes, progress, and rewards are independent.</p>

    <div class="l2-profiles">
      <div class="l2-profile">
        <div class="l2-profile-icon"></div>
        <div class="l2-profile-info">
          <div class="l2-profile-name">Child-1</div>
          <div class="l2-profile-sub">Age: 7-9</div>
        </div>
        <span class="l2-profile-badge">Active</span>
      </div>
      <div class="l2-profile">
        <div class="l2-profile-icon"></div>
        <div class="l2-profile-info">
          <div class="l2-profile-name">Child-2</div>
          <div class="l2-profile-sub">Age: 4-6</div>
        </div>
      </div>
      <div class="l2-profile">
        <div class="l2-profile-icon"></div>
        <div class="l2-profile-info">
          <div class="l2-profile-name">Parent</div>
          <div class="l2-profile-sub">Manage</div>
        </div>
      </div>
    </div>
  </div>

  <div class="l2-pick-right">
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/0777784d8556917f83b0e0b931fb90b29df28322.png" alt="Pick who plays — Mini-Talks Play screen" />
  </div>
</div>

<!-- ===== layer2-02-scenes.html ===== -->
<div class="l2-scenes">
  <div class="l2-scenes-left">
    <div class="l2-scenes-label">Real-life scenes</div>
    <h2>50 SCENES</h2>

    <div class="l2-scenes-list">
      <ul>
        <li>Basketball</li>
        <li>Beach</li>
        <li>Cafe</li>
        <li>Classroom</li>
        <li>Orchestra</li>
      </ul>
      <ul>
        <li>Playground</li>
        <li>Pool Party</li>
        <li>Robot Tournament</li>
        <li>Supermarket</li>
        <li>Tennis</li>
        <li class="more">and more...</li>
      </ul>
    </div>
  </div>

  <div class="l2-scenes-right">
    <div class="l2-scenes-stack" onclick="l2ScenesCycle(this)">
      
      <img class="scene-1" src="https://mini-talks.org/wp-content/uploads/2026/04/1bcc15012d55089e5ba6e4e1994ee1c29c9efff7.png" alt="Scene 1" />
      <img class="scene-2" src="https://mini-talks.org/wp-content/uploads/2026/04/84c6f278ed3f027cfce6091e020e29be1d09eb13.png" alt="Scene 2" />
      <img class="scene-3" src="https://mini-talks.org/wp-content/uploads/2026/04/afcb13bb75f3b3f676a974dced8c780744ea2070.png" alt="Scene 3" />
      <img class="scene-4" src="https://mini-talks.org/wp-content/uploads/2026/04/2ee73e7960e25cdf4b0323f8ce01b54e3a0bdb85.png" alt="Scene 4" />
      <img class="scene-5" src="https://mini-talks.org/wp-content/uploads/2026/04/f60c83c6e859fe177ceb37a18896e1702060ca3a.png" alt="Scene 5" />
      <img class="scene-6" src="https://mini-talks.org/wp-content/uploads/2026/04/cd67811cb0658adaf22491c2d0a1d386ae5bd0a8.png" alt="Scene 6" />
    </div>
  </div>
</div>

<!-- ===== layer2-03-minifigure-custom.html ===== -->
<div class="l2-mfc">
  <h2 class="l2-mfc-title">Mini Figure Customization</h2>
  <p class="l2-mfc-desc">
    4 sections × Female/Male/Child category × dozens of styles × color palette. Surprise Me or use defaults. In dialogue mode, two Minis are built simultaneously.
  </p>

  
  <div class="l2-mfc-tabs">
    <div class="l2-mfc-tab active" data-target="hair" onclick="l2MfcTabSwitch(this, 'hair')">Hair</div>
    <div class="l2-mfc-tab" data-target="head" onclick="l2MfcTabSwitch(this, 'head')">Head</div>
    <div class="l2-mfc-tab" data-target="torso" onclick="l2MfcTabSwitch(this, 'torso')">Torso</div>
    <div class="l2-mfc-tab" data-target="legs" onclick="l2MfcTabSwitch(this, 'legs')">Legs</div>
  </div>

  
  <div class="l2-mfc-content active" data-mfc="hair">
    <div class="l2-mfc-card">
      <div class="l2-mfc-card-left">
        <h3>Hair Customization</h3>
        <p class="l2-mfc-card-desc">
          Simple and Expressive subcategories. Bald option available. ~30 styles per category in different colors: brown, black, red, gray, and more.
        </p>

        
        <div class="l2-mfc-label">Categories:</div>
        <div class="l2-mfc-pill-row">
          <div class="l2-mfc-pill">Female</div>
          <div class="l2-mfc-pill">Male</div>
          <div class="l2-mfc-pill">Child</div>
        </div>
        <div class="l2-mfc-hdivider"></div>
        <div class="l2-mfc-pill-row">
          <div class="l2-mfc-pill">Short</div>
          <div class="l2-mfc-pill">Long</div>
          <div class="l2-mfc-pill">Hat</div>
        </div>

        
        <div class="l2-mfc-panel">
          <div class="l2-mfc-label">Color:</div>
          <div class="l2-mfc-colors">
            <span class="l2-mfc-color rainbow"></span>
            <div class="l2-mfc-vdivider"></div>
            <span class="l2-mfc-color" style="background:#1D1D1B"></span>
            <span class="l2-mfc-color" style="background:#E67E22"></span>
            <span class="l2-mfc-color" style="background:#F1C40F"></span>
            <span class="l2-mfc-color" style="background:#95A5A6"></span>
            <span class="l2-mfc-color" style="background:#FFFFFF; border-color:#DDD"></span>
            <span class="l2-mfc-color" style="background:#FF6BCB"></span>
          </div>
        </div>
      </div>

      <div class="l2-mfc-shot">
        <img src="https://mini-talks.org/wp-content/uploads/2026/04/38b9516eb20dcb976768034fce600ea67ad76a0d.png" alt="Hair Customization Screen" />
      </div>
    </div>
  </div>

  
  <div class="l2-mfc-content" data-mfc="head">
    <div class="l2-mfc-placeholder">Head Customization — coming soon</div>
  </div>

  
  <div class="l2-mfc-content" data-mfc="torso">
    <div class="l2-mfc-placeholder">Torso Customization — coming soon</div>
  </div>

  
  <div class="l2-mfc-content" data-mfc="legs">
    <div class="l2-mfc-placeholder">Legs Customization — coming soon</div>
  </div>

  
  <div class="l2-actions">
    <div class="l2-action-btn c-red">
      <div class="l2-action-studs"></div>
      <img class="l2-action-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/Group-139-1.png" alt="Reset" />
      <h3>Reset</h3>
      <p>Reset all selections to default</p>
    </div>
    <div class="l2-action-btn c-yellow">
      <div class="l2-action-studs"></div>
      <img class="l2-action-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/Group-52.png" alt="Surprise Me" />
      <h3>Surprise Me!</h3>
      <p>Generate a random combination</p>
    </div>
    <div class="l2-action-btn c-green">
      <div class="l2-action-studs"></div>
      <img class="l2-action-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/Group-139.png" alt="User Ready" />
      <h3>User Ready</h3>
      <p>Start quickly with the default Mini</p>
    </div>
    <div class="l2-action-btn c-blue">
      <div class="l2-action-studs"></div>
      <img class="l2-action-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/Group-140-1.png" alt="Save" />
      <h3>Save</h3>
      <p>Save Mini and proceed to scene</p>
    </div>
  </div>
</div>

<!-- ===== layer2-04-color-custom.html ===== -->
<div class="l2-colorcust">
  <div class="l2-colorcust-left">
    <h3>Color Customization</h3>
    <p>In Female mode, shown as 'Brows &amp; Lashes'. For glasses: select shape first, then color.</p>

    <div class="l2-palettes">
      
      <div class="l2-palette">
        <div class="l2-palette-label">BROWS</div>
        <div class="l2-palette-row">
          <div class="l2-palette-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M4 14 Q12 6, 20 14" />
            </svg>
          </div>
          <span class="l2-palette-swatch" style="background:#1D1D1B"></span>
          <span class="l2-palette-swatch" style="background:#D8D8D8; border-color:#DDD"></span>
          <span class="l2-palette-swatch" style="background:#A8A8A8"></span>
          <span class="l2-palette-swatch" style="background:#6B3410"></span>
          <span class="l2-palette-swatch" style="background:#4A2510"></span>
          <span class="l2-palette-swatch" style="background:#A52A2A"></span>
        </div>
      </div>

      
      <div class="l2-palette">
        <div class="l2-palette-label">EYES</div>
        <div class="l2-palette-row">
          <div class="l2-palette-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M2 12 Q12 4, 22 12 Q12 20, 2 12 Z" />
              <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <span class="l2-palette-swatch" style="background:#1D1D1B"></span>
          <span class="l2-palette-swatch" style="background:#6B3410"></span>
          <span class="l2-palette-swatch" style="background:#7A8B3C"></span>
          <span class="l2-palette-swatch" style="background:#2E5C2E"></span>
          <span class="l2-palette-swatch" style="background:#2E6FC7"></span>
        </div>
      </div>

      
      <div class="l2-palette">
        <div class="l2-palette-label">GLASSES</div>
        <div class="l2-palette-row">
          <div class="l2-palette-icon">
            <svg viewBox="0 0 40 20" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="10" cy="10" r="6.5" />
              <circle cx="30" cy="10" r="6.5" />
              <line x1="16.5" y1="10" x2="23.5" y2="10" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="l2-palette-swatch" style="background:#1D1D1B"></span>
          <span class="l2-palette-swatch" style="background:#6B3410"></span>
          <span class="l2-palette-swatch" style="background:#1F3A8A"></span>
          <span class="l2-palette-swatch" style="background:#E52828"></span>
          <span class="l2-palette-swatch" style="background:#237841"></span>
          <span class="l2-palette-swatch" style="background:#E67E22"></span>
          <span class="l2-palette-swatch" style="background:#FF6BCB"></span>
          <span class="l2-palette-swatch" style="background:#8E44AD"></span>
          <span class="l2-palette-swatch" style="background:#95A5A6"></span>
        </div>
      </div>
    </div>
  </div>

  <div class="l2-colorcust-divider"></div>

  <div class="l2-colorcust-shot">
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/51977175da4faeff46ad5a7d3fdcb719902c4203.png" alt="Color Customization Screen" />
  </div>
</div>

<!-- ===== layer2-05-mini2-reminder.html ===== -->
<div class="l2-reminder">
  <div class="l2-reminder-icon">
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Vector.png" alt="Warning" />
  </div>
  <div class="l2-reminder-body">
    <h3>Mini 2 Reminder</h3>
    <p>When saving Mini 1 without customizing Mini 2, a 'Wait a Second!' prompt appears. Three options: Customize / Use Ready / Surprise Me!</p>
  </div>
</div>

<!-- ===== layer2-06-build-mini.html ===== -->
<div class="l2-buildmini">
  <div class="l2-buildmini-top">
    <h2>Build a Mini that<br>looks like you.</h2>
    <p>The child builds two Mini characters separately: Mini 1 represents themselves, Mini 2 represents the person they'll talk to. Hair color, eye color, glasses style — every detail is in the child's control. Building a character that looks like them strengthens the bond with the Mini and directly increases recording motivation.</p>
  </div>

  <div class="l2-buildmini-demo">

    
    <div class="l2-mini-col-real">
      <div class="l2-mini-wrap">
        <div class="l2-mini-inner-real">
          <img src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Real Child" />
          <h4>Real Child</h4>
          <p>Red glasses · Blue eyes · Brown hair</p>
        </div>
      </div>
      <p class="l2-buildmini-foot">Images are AI-generated to protect identity.</p>
    </div>

    
    <div class="l2-match">
      <div class="l2-match-arrow">
        <svg width="52" height="18" viewBox="0 0 52 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 9 H44 M36 2 L44 9 L36 16" stroke="#000000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="l2-match-btn">Match</span>
    </div>

    
    <div class="l2-mini-col-mini">
      <div class="l2-mini-wrap">
        <div class="l2-mini-inner-mini">
          <img src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Mini Version" />
          <h4>Mini Version</h4>
          <p>Red glasses · Blue eyes · Brown hair</p>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ===== layer3-00-header-colorcoded.html ===== -->
<div class="l3-header-wrap">
  <div class="l3-bars"><span></span><span></span><span></span><span></span></div>
  <h2 class="l3-header-title">
    <span class="prefix">Layer 3:</span><span class="konturlu">Interaction System</span>
  </h2>
  <div class="l3-bars"><span></span><span></span><span></span><span></span></div>
</div>


<div class="l3-colorcoded">
  <div class="l3-colorcoded-bricks">
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-686.png" alt="Red slot" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-687.png" alt="Blue slot" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-688.png" alt="Green slot" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-689.png" alt="Yellow slot" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-690.png" alt="Red tick" />
  </div>
  <div class="l3-colorcoded-right">
    <h3>Color-coded brick slot system</h3>
    <p>Tap a slot to reveal its options. Once a choice is made, the slot fills and the next one activates.</p>
  </div>
</div>

<!-- ===== layer3-01-categories.html ===== -->
<div class="l3-categories">
  <div class="l3-cat c-red">
    <div class="l3-cat-label">Level</div>
    <img class="l3-cat-bricks" src="https://mini-talks.org/wp-content/uploads/2026/04/Frame-22.png" alt="Level bricks" />
  </div>
  <div class="l3-cat c-blue">
    <div class="l3-cat-label">Mini</div>
    <img class="l3-cat-bricks" src="https://mini-talks.org/wp-content/uploads/2026/04/MINI-FGURE.png" alt="Mini bricks" />
  </div>
  <div class="l3-cat c-green">
    <div class="l3-cat-label">Audio</div>
    <img class="l3-cat-bricks" src="https://mini-talks.org/wp-content/uploads/2026/04/VOICE.png" alt="Audio bricks" />
  </div>
  <div class="l3-cat c-yellow">
    <div class="l3-cat-label">Action</div>
    <img class="l3-cat-bricks" src="https://mini-talks.org/wp-content/uploads/2026/04/ACTION.png" alt="Action bricks" />
  </div>
</div>

<!-- ===== layer3-02-tickbrick.html ===== -->
<div class="l3-tickbrick">
  <div class="l3-tickbrick-left">
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-690.png" alt="Red tick" />
    <span class="l3-tickbrick-arrow">→</span>
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-681.png" alt="Green tick" />
  </div>
  <div class="l3-tickbrick-right">
    <h3>Tick Brick: Red → Green</h3>
    <p>The tick brick stays red while there are empty slots. When all slots are filled, it automatically turns green — the system is ready, animation can begin.</p>
  </div>
</div>

<!-- ===== layer3-03-dialogue.html ===== -->
<div class="l3-dialogue">
  <div class="l3-dialogue-bricks">
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-165.png" alt="Dialogue" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-166.png" alt="Mini-1" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-688.png" alt="Slot" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-175.png" alt="Mini-2" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-688.png" alt="Slot" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-689.png" alt="Slot" />
    <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-690.png" alt="Tick" />
  </div>
  <div class="l3-dialogue-right">
    <h3>Dialogue</h3>
    <p>When Dialogue mode is selected, Mini 2 + Audio 2 slots expand automatically. Hidden in other levels. Two Minis, two demos, two recordings.</p>
  </div>
</div>

<!-- ===== layer3-04-demo-sequences.html ===== -->
<div class="l3-demoseq">
  
  <div class="l3-demo-card">
    <div class="l3-demo-left">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-684.png" alt="Demo-1" />
      <span class="l3-demo-arrow">→</span>
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-158.png" alt="Play" />
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-162.png" alt="Reset" />
    </div>
    <div class="l3-demo-right">
      <h3>When Demo is selected</h3>
      <p>Play &amp; Reset active<br>Record &amp; Delete inactive</p>
    </div>
  </div>

  
  <div class="l3-demo-card">
    <div class="l3-demo-left">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-159.png" alt="Record" />
      <span class="l3-demo-arrow">→</span>
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-682.png" alt="Play" />
    </div>
    <div class="l3-demo-right">
      <h3>After recording</h3>
      <p>Play auto-selected<br>Delete active<br>Reset active</p>
    </div>
  </div>
</div>

<!-- ===== layer3-05-blackbrick.html ===== -->
<div class="l3-blackbrick">
  <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-685.png" alt="Black Save Brick" />
  <div class="l3-blackbrick-right">
    <h3>Black Brick: Expert Save</h3>
    <p>The expert saves a connected child's recording to their own panel. Audio stays on the device — only numerical data (duration, level, date) goes to the server. Requires parent approval.</p>
  </div>
</div>

<!-- ===== layer3-06-record-screens.html ===== -->
<div class="l3-records">
  
  <div class="l3-record-card">
    <img class="l3-record-img" src="https://mini-talks.org/wp-content/uploads/2026/04/image-4.png" alt="Record screen" />
    <div class="l3-record-text">
      <h3>Record<br>Sound, Word, Sentence</h3>
      <p>Single Mini voice input.</p>
      <p>The system records one audio stream mapped to: Scene × Level × Mini × Record Slot.</p>
      <p>Duration is limited and controlled in real time.</p>
    </div>
  </div>

  
  <div class="l3-record-card">
    <img class="l3-record-img" src="https://mini-talks.org/wp-content/uploads/2026/04/image-2.png" alt="Record dialogue screen" />
    <div class="l3-record-text">
      <h3>Record - Dialogue</h3>
      <p>Dual Mini interaction.</p>
      <p>Each Mini holds an independent audio slot.</p>
      <p>The user selects the active Mini and records separately.</p>
      <p>This enables sequential multi-role interaction within the same scene.</p>
    </div>
  </div>
</div>

<!-- ===== layer3-07-soundtodialogue.html ===== -->
<div class="l3-s2d">
  <h2 class="l3-s2d-title">From sound to dialogue, step by step.</h2>
  <p class="l3-s2d-desc">
    Gradual exposure is the core approach in selective mutism treatment. Mini-Talks translates this principle into four communication levels — each level starts where the child is ready.
  </p>

  <div class="l3-s2d-cards">
    
    <div class="l3-s2d-card">
      <div class="l3-s2d-studs"></div>
      <img class="l3-s2d-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/Rectangle-632.png" alt="Sound" />
      <h3>Sound</h3>
      <h4>Level 1 — Wordless sounds</h4>
      <p>Non-verbal vocal output within a scene context.</p>
      <p>Simple, repeatable sounds associated with the environment.</p>
      <p>No linguistic requirement — focus on voice activation.</p>
    </div>

    
    <div class="l3-s2d-card">
      <div class="l3-s2d-studs"></div>
      <img class="l3-s2d-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/Rectangle-632-1.png" alt="Word" />
      <h3>Word</h3>
      <h4>Level 2 — Single word responses</h4>
      <p>Single-word production linked to scene elements.</p>
      <p>Objects and actions are named within context, introducing controlled speech without increasing pressure.</p>
    </div>

    
    <div class="l3-s2d-card">
      <div class="l3-s2d-studs"></div>
      <img class="l3-s2d-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/Rectangle-632-2.png" alt="Sentence" />
      <h3>Sentence</h3>
      <h4>Level 3 — Complete sentences</h4>
      <p>Structured sentence production within the scene.</p>
      <p>The child expresses requests, reactions, or descriptions using short sentences tied to the current context.</p>
    </div>

    
    <div class="l3-s2d-card">
      <div class="l3-s2d-studs"></div>
      <img class="l3-s2d-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/Rectangle-632-3.png" alt="Dialogue" />
      <h3>Dialogue</h3>
      <h4>Level 4 — Two Minis, back and forth</h4>
      <p>Multi-role interaction using two Minis.</p>
      <p>The child produces sequential speech within a shared context, forming basic dialogue structures.</p>
    </div>
  </div>
</div>

<!-- ===== layer3-08-scene-cafe.html ===== -->
<div class="l3-cafe-wrap">
  <img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-722.png" alt="LEGO Cafe Scene — Sound, Word, Sentence, Dialogue" />
</div>

<!-- ===== layer3-09-scene-integration.html ===== -->
<div class="l3-sceneint">
  <h3>Scene Integration</h3>
  <p class="l3-sceneint-desc">The customized Mini is placed into the selected scene. After a short scene animation, the speaking animation begins with those Minis. During Demo playback, the Mini's mouth animation also plays — the child sees their character speaking.</p>

  <div class="l3-sceneint-divider"></div>

  <div class="l3-sceneint-subtitle">Content Structure</div>

  <div class="l3-sceneint-row">
    <div class="l3-sceneint-pills">
      <span class="l3-sceneint-pill c-red">Scene</span>
      <span class="l3-sceneint-x">×</span>
      <span class="l3-sceneint-pill c-red">Level</span>
      <span class="l3-sceneint-x">×</span>
      <span class="l3-sceneint-pill c-blue">Mini Speaking Role</span>
      <span class="l3-sceneint-x">×</span>
      <span class="l3-sceneint-pill c-green">Demo &amp; Talk</span>
    </div>
    <p class="l3-sceneint-note">Every demo content and recording expectation is determined by the intersection of these four dimensions.</p>
  </div>
</div>

<!-- ===== layer3-10-interaction-flow.html ===== -->
<div class="l3-intflow">
  <h3 class="l3-intflow-title">Interaction Flow</h3>

  
  <div class="l3-intflow-phase">Phase 1 — Every Interaction Starts Here</div>
  <div class="l3-intflow-phase1">
    <div class="l3-intflow-p1-boxes">
      <div class="l3-intflow-p1-box"></div>
      <span class="l3-intflow-p1-arrow">→</span>
      <div class="l3-intflow-p1-box"></div>
    </div>
    <div class="l3-intflow-p1-right">
      <h4>Minis Enter the Scene</h4>
      <p>Customized Minis are placed into the selected scene. A short scene-related intro animation plays. Then the interaction mode begins.</p>
    </div>
  </div>

  <div class="l3-intflow-divider"></div>

  
  <div class="l3-intflow-phase">Phase 2 — Three Interaction Modes</div>
  <div class="l3-intflow-modes">

    
    <div class="l3-intflow-mode c-green">
      <div class="l3-intflow-icons">
        <div class="l3-intflow-icon i-1"><img src="https://mini-talks.org/wp-content/uploads/2026/04/volume_up.png" alt="Sound" /></div>
        <div class="l3-intflow-icon i-2"><img src="https://mini-talks.org/wp-content/uploads/2026/04/Polygon-1.png" alt="Play" /></div>
      </div>
      <h4>Watch &amp; Listen</h4>
      <div class="l3-intflow-mode-pills">
        <span class="l3-intflow-mode-pill p-green">Demo</span>
        <span class="l3-intflow-mode-plus">+</span>
        <span class="l3-intflow-mode-pill p-yellow">Play</span>
      </div>
      <p>Demo audio plays while Mini's mouth moves in sync. The child sees and hears their character speaking.</p>
    </div>

    
    <div class="l3-intflow-mode c-red">
      <div class="l3-intflow-icons">
        <div class="l3-intflow-icon i-1"><img src="https://mini-talks.org/wp-content/uploads/2026/04/MicFill.png" alt="Mic" /></div>
        <div class="l3-intflow-icon i-2"><img src="https://mini-talks.org/wp-content/uploads/2026/04/Ellipse-14.png" alt="Record" /></div>
      </div>
      <h4>Record</h4>
      <div class="l3-intflow-mode-pills">
        <span class="l3-intflow-mode-pill p-green">Talk</span>
        <span class="l3-intflow-mode-plus">+</span>
        <span class="l3-intflow-mode-pill p-yellow">Record</span>
      </div>
      <p>The child speaks as their Mini's voice and records. Audio stays on device — only numerical data goes to the server.</p>
    </div>

    
    <div class="l3-intflow-mode c-yellow">
      <div class="l3-intflow-icons">
        <div class="l3-intflow-icon i-1"><img src="https://mini-talks.org/wp-content/uploads/2026/04/MicFill.png" alt="Mic" /></div>
        <div class="l3-intflow-icon i-2"><img src="https://mini-talks.org/wp-content/uploads/2026/04/Polygon-1.png" alt="Play" /></div>
      </div>
      <h4>Animated Playback</h4>
      <div class="l3-intflow-mode-pills">
        <span class="l3-intflow-mode-pill p-green">Talk</span>
        <span class="l3-intflow-mode-plus">+</span>
        <span class="l3-intflow-mode-pill p-yellow">Play</span>
      </div>
      <p>The child's own voice plays back in sync with Mini's mouth animation. Builds ownership and motivation.</p>
    </div>

  </div>
</div>

<!-- ===== layer4-00-minijourney.html ===== -->
<div class="l4-header-wrap">
  <div class="l4-bars"><span></span><span></span><span></span><span></span></div>
  <h2 class="l4-header-title">
    <span class="prefix">Layer 4:</span><span class="konturlu">Progress &amp; Dashboard</span>
  </h2>
  <div class="l4-bars"><span></span><span></span><span></span><span></span></div>
</div>


<div class="l4-mj">
  <h2 class="l4-mj-title">Mini Journey Dashboard</h2>
  <p class="l4-mj-desc">All progress is tracked from one place. 7 widgets, each with a Manage and View screen.</p>

  <div class="l4-mj-cards">
    <div class="l4-mj-card c-red">
      <div class="l4-mj-card-studs"></div>
      <img class="l4-mj-card-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Parent" />
      <h3 class="l4-mj-card-title">Parent</h3>
      <p class="l4-mj-card-desc">Can manage settings and view detailed progress.</p>
    </div>

    <div class="l4-mj-card c-blue">
      <div class="l4-mj-card-studs"></div>
      <img class="l4-mj-card-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Expert" />
      <h3 class="l4-mj-card-title">Expert</h3>
      <p class="l4-mj-card-desc">Can view detailed progress with parent permission.</p>
    </div>

    <div class="l4-mj-card c-yellow">
      <div class="l4-mj-card-studs"></div>
      <img class="l4-mj-card-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Child" />
      <h3 class="l4-mj-card-title">Child</h3>
      <p class="l4-mj-card-desc">Can access the main dashboard without detailed data.</p>
    </div>

    <div class="l4-mj-card c-green">
      <div class="l4-mj-card-studs"></div>
      <img class="l4-mj-card-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Builder" />
      <h3 class="l4-mj-card-title">Builder</h3>
      <p class="l4-mj-card-desc">Can view detailed progress of their own activity.</p>
    </div>
  </div>
</div>

<!-- ===== layer4-01-dashboard-slider.html ===== -->
<div class="l4-slider">
  <button class="l4-slider-btn prev" type="button" aria-label="Previous" data-slider-dir="-1" onclick="l4SliderGo(-1)">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 6l-6 6 6 6"/>
    </svg>
  </button>

  <div class="l4-slider-grid">
    <div class="l4-slider-item">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/96be4cf1917bb4a714b04201819b1ec20ed81dfe.png" alt="Mini Journey - Child View" id="l4Slide1" />
    </div>
    <div class="l4-slider-item">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/83558e9ff1d6886503f3bcf59b94bd3cb4cf61af.png" alt="Mini Journey - Parent View" id="l4Slide2" />
    </div>
  </div>

  <button class="l4-slider-btn next" type="button" aria-label="Next" data-slider-dir="1" onclick="l4SliderGo(1)">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 6l6 6-6 6"/>
    </svg>
  </button>
</div>

<!-- ===== layer4-02-motivation-tabs.html ===== -->
<div class="l4-tabs-wrap">

  
  <div class="l4-tabs">
    <div class="l4-tab active" data-target="mm" onclick="l4TabSwitch(this, 'mm')">Motivation Messages</div>
    <div class="l4-tab" data-target="scenes" onclick="l4TabSwitch(this, 'scenes')">Scenes &amp; Levels</div>
    <div class="l4-tab" data-target="rec" onclick="l4TabSwitch(this, 'rec')">Recordings</div>
    <div class="l4-tab" data-target="streak" onclick="l4TabSwitch(this, 'streak')">Streak</div>
    <div class="l4-tab" data-target="missions" onclick="l4TabSwitch(this, 'missions')">Missions</div>
    <div class="l4-tab" data-target="rewards" onclick="l4TabSwitch(this, 'rewards')">Rewards</div>
    <div class="l4-tab" data-target="minis" onclick="l4TabSwitch(this, 'minis')">Customized Minis</div>
  </div>

  
  <div class="l4-tab-content active" data-tab="mm">
    <div class="l4-content-card">
      <div class="l4-content-left">
        <div class="l4-toggle">
          <button class="l4-toggle-btn active" data-mode-target="manage" onclick="l4ModeSwitch(this, 'manage')">Manage</button>
          <button class="l4-toggle-btn" data-mode-target="view" onclick="l4ModeSwitch(this, 'view')">View</button>
        </div>
        <div class="l4-mode-content active" data-mode="manage">
          <h3>Motivation Messages</h3>
          <p>Set up daily motivation messages for your child. Choose message themes, write custom notes, and schedule when they appear. Messages are shown before each session to keep the child encouraged and focused.</p>
        </div>
        <div class="l4-mode-content" data-mode="view">
          <h3>Motivation Messages</h3>
          <p>Review which messages have been shown and how the child responded. Engagement stats across themes, timing, and frequency help you fine-tune what works best — all without storing any personal content.</p>
        </div>
      </div>
      <div class="l4-content-shot">
        <div class="l4-shot-mode active" data-mode="manage">
          <img src="https://mini-talks.org/wp-content/uploads/2026/04/e8fe9d626b36b56e9f4aec28729506ab5c9fdb30.png" alt="Motivation Messages Manager" />
        </div>
        <div class="l4-shot-mode" data-mode="view">
          <div class="l4-shot-placeholder">View mode — coming soon</div>
        </div>
      </div>
    </div>
  </div>

  
  <div class="l4-tab-content" data-tab="scenes">
    <div class="l4-content-card">
      <div class="l4-content-left">
        <div class="l4-toggle">
          <button class="l4-toggle-btn active" data-mode-target="manage" onclick="l4ModeSwitch(this, 'manage')">Manage</button>
          <button class="l4-toggle-btn" data-mode-target="view" onclick="l4ModeSwitch(this, 'view')">View</button>
        </div>
        <div class="l4-mode-content active" data-mode="manage">
          <h3>Scenes &amp; Levels</h3>
          <p>Set up daily motivation messages for your child. Choose message themes, write custom notes, and schedule when they appear. Messages are shown before each session to keep the child encouraged and focused.</p>
        </div>
        <div class="l4-mode-content" data-mode="view">
          <h3>Scenes &amp; Levels</h3>
          <p>Review which messages have been shown and how the child responded. Engagement stats across themes, timing, and frequency help you fine-tune what works best — all without storing any personal content.</p>
        </div>
      </div>
      <div class="l4-content-shot">
        <div class="l4-shot-mode active" data-mode="manage">
          <div class="l4-shot-placeholder">Coming soon</div>
        </div>
        <div class="l4-shot-mode" data-mode="view">
          <div class="l4-shot-placeholder">View mode — coming soon</div>
        </div>
      </div>
    </div>
  </div>

  
  <div class="l4-tab-content" data-tab="rec">
    <div class="l4-content-card">
      <div class="l4-content-left">
        <div class="l4-toggle">
          <button class="l4-toggle-btn active" data-mode-target="manage" onclick="l4ModeSwitch(this, 'manage')">Manage</button>
          <button class="l4-toggle-btn" data-mode-target="view" onclick="l4ModeSwitch(this, 'view')">View</button>
        </div>
        <div class="l4-mode-content active" data-mode="manage">
          <h3>Recordings</h3>
          <p>Set up daily motivation messages for your child. Choose message themes, write custom notes, and schedule when they appear. Messages are shown before each session to keep the child encouraged and focused.</p>
        </div>
        <div class="l4-mode-content" data-mode="view">
          <h3>Recordings</h3>
          <p>Review which messages have been shown and how the child responded. Engagement stats across themes, timing, and frequency help you fine-tune what works best — all without storing any personal content.</p>
        </div>
      </div>
      <div class="l4-content-shot">
        <div class="l4-shot-mode active" data-mode="manage">
          <div class="l4-shot-placeholder">Coming soon</div>
        </div>
        <div class="l4-shot-mode" data-mode="view">
          <div class="l4-shot-placeholder">View mode — coming soon</div>
        </div>
      </div>
    </div>
  </div>

  
  <div class="l4-tab-content" data-tab="streak">
    <div class="l4-content-card">
      <div class="l4-content-left">
        <div class="l4-toggle">
          <button class="l4-toggle-btn active" data-mode-target="manage" onclick="l4ModeSwitch(this, 'manage')">Manage</button>
          <button class="l4-toggle-btn" data-mode-target="view" onclick="l4ModeSwitch(this, 'view')">View</button>
        </div>
        <div class="l4-mode-content active" data-mode="manage">
          <h3>Streak</h3>
          <p>Set up daily motivation messages for your child. Choose message themes, write custom notes, and schedule when they appear. Messages are shown before each session to keep the child encouraged and focused.</p>
        </div>
        <div class="l4-mode-content" data-mode="view">
          <h3>Streak</h3>
          <p>Review which messages have been shown and how the child responded. Engagement stats across themes, timing, and frequency help you fine-tune what works best — all without storing any personal content.</p>
        </div>
      </div>
      <div class="l4-content-shot">
        <div class="l4-shot-mode active" data-mode="manage">
          <div class="l4-shot-placeholder">Coming soon</div>
        </div>
        <div class="l4-shot-mode" data-mode="view">
          <div class="l4-shot-placeholder">View mode — coming soon</div>
        </div>
      </div>
    </div>
  </div>

  
  <div class="l4-tab-content" data-tab="missions">
    <div class="l4-content-card">
      <div class="l4-content-left">
        <div class="l4-toggle">
          <button class="l4-toggle-btn active" data-mode-target="manage" onclick="l4ModeSwitch(this, 'manage')">Manage</button>
          <button class="l4-toggle-btn" data-mode-target="view" onclick="l4ModeSwitch(this, 'view')">View</button>
        </div>
        <div class="l4-mode-content active" data-mode="manage">
          <h3>Missions</h3>
          <p>Set up daily motivation messages for your child. Choose message themes, write custom notes, and schedule when they appear. Messages are shown before each session to keep the child encouraged and focused.</p>
        </div>
        <div class="l4-mode-content" data-mode="view">
          <h3>Missions</h3>
          <p>Review which messages have been shown and how the child responded. Engagement stats across themes, timing, and frequency help you fine-tune what works best — all without storing any personal content.</p>
        </div>
      </div>
      <div class="l4-content-shot">
        <div class="l4-shot-mode active" data-mode="manage">
          <div class="l4-shot-placeholder">Coming soon</div>
        </div>
        <div class="l4-shot-mode" data-mode="view">
          <div class="l4-shot-placeholder">View mode — coming soon</div>
        </div>
      </div>
    </div>
  </div>

  
  <div class="l4-tab-content" data-tab="rewards">
    <div class="l4-content-card">
      <div class="l4-content-left">
        <div class="l4-toggle">
          <button class="l4-toggle-btn active" data-mode-target="manage" onclick="l4ModeSwitch(this, 'manage')">Manage</button>
          <button class="l4-toggle-btn" data-mode-target="view" onclick="l4ModeSwitch(this, 'view')">View</button>
        </div>
        <div class="l4-mode-content active" data-mode="manage">
          <h3>Rewards</h3>
          <p>Set up daily motivation messages for your child. Choose message themes, write custom notes, and schedule when they appear. Messages are shown before each session to keep the child encouraged and focused.</p>
        </div>
        <div class="l4-mode-content" data-mode="view">
          <h3>Rewards</h3>
          <p>Review which messages have been shown and how the child responded. Engagement stats across themes, timing, and frequency help you fine-tune what works best — all without storing any personal content.</p>
        </div>
      </div>
      <div class="l4-content-shot">
        <div class="l4-shot-mode active" data-mode="manage">
          <div class="l4-shot-placeholder">Coming soon</div>
        </div>
        <div class="l4-shot-mode" data-mode="view">
          <div class="l4-shot-placeholder">View mode — coming soon</div>
        </div>
      </div>
    </div>
  </div>

  
  <div class="l4-tab-content" data-tab="minis">
    <div class="l4-content-card">
      <div class="l4-content-left">
        <div class="l4-toggle">
          <button class="l4-toggle-btn active" data-mode-target="manage" onclick="l4ModeSwitch(this, 'manage')">Manage</button>
          <button class="l4-toggle-btn" data-mode-target="view" onclick="l4ModeSwitch(this, 'view')">View</button>
        </div>
        <div class="l4-mode-content active" data-mode="manage">
          <h3>Customized Minis</h3>
          <p>Set up daily motivation messages for your child. Choose message themes, write custom notes, and schedule when they appear. Messages are shown before each session to keep the child encouraged and focused.</p>
        </div>
        <div class="l4-mode-content" data-mode="view">
          <h3>Customized Minis</h3>
          <p>Review which messages have been shown and how the child responded. Engagement stats across themes, timing, and frequency help you fine-tune what works best — all without storing any personal content.</p>
        </div>
      </div>
      <div class="l4-content-shot">
        <div class="l4-shot-mode active" data-mode="manage">
          <div class="l4-shot-placeholder">Coming soon</div>
        </div>
        <div class="l4-shot-mode" data-mode="view">
          <div class="l4-shot-placeholder">View mode — coming soon</div>
        </div>
      </div>
    </div>
  </div>

</div>

<!-- ===== layer4-03-privacy.html ===== -->
<div class="l4-privacy">
  <div class="l4-privacy-inner">

    
    <div class="l4-privacy-left">
      <h2>Voice recordings are never stored.<br>No personal data collected.</h2>
      <p class="l4-privacy-intro">Mini-Talks puts your child's privacy above everything. Voice recordings are never permanently stored — not on our servers, not on the device. They exist only during the session, can be played back, and disappear when the session ends.</p>

      <div class="l4-privacy-cards">
        <div class="l4-privacy-card">
          <div class="l4-privacy-card-icon"></div>
          <div>
            <h4>Voice recordings are never stored</h4>
            <p>Voice recordings are never permanently saved anywhere. The child records into slots and listens back during the session — when the session ends, audio data is automatically cleared. Our servers only keep numerical progress data.</p>
          </div>
        </div>

        <div class="l4-privacy-card">
          <div class="l4-privacy-card-icon"></div>
          <div>
            <h4>Every access requires parent approval</h4>
            <p>Experts can only access child data with parent approval. Child accounts don't activate without parent consent. Full control stays with the parent.</p>
          </div>
        </div>

        <div class="l4-privacy-card">
          <div class="l4-privacy-card-icon"></div>
          <div>
            <h4>No personal information collected</h4>
            <p>No real name, photo, or identity information is requested from the child. No personal data is stored beyond Mini name and age range. Dashboard contains only anonymous statistical data.</p>
          </div>
        </div>
      </div>
    </div>

    
    <div class="l4-privacy-right">
      <div class="l4-privacy-right-head">
        <img class="l4-privacy-shield" src="https://mini-talks.org/wp-content/uploads/2026/04/Security.png" alt="Security" />
        <h3>What's on our servers?</h3>
      </div>

      <div class="l4-privacy-items">
        <div class="l4-privacy-item check">
          <div class="l4-privacy-item-mark">✓</div>
          <span>Recording count, duration, scene &amp; level data</span>
        </div>
        <div class="l4-privacy-item check">
          <div class="l4-privacy-item-mark">✓</div>
          <span>Scene progress status &amp; level matrix</span>
        </div>
        <div class="l4-privacy-item check">
          <div class="l4-privacy-item-mark">✓</div>
          <span>Play time &amp; daily activity patterns</span>
        </div>
        <div class="l4-privacy-item check">
          <div class="l4-privacy-item-mark">✓</div>
          <span>Streak, mission &amp; reward statistics</span>
        </div>
        <div class="l4-privacy-item check">
          <div class="l4-privacy-item-mark">✓</div>
          <span>Motivation message usage data</span>
        </div>
        <div class="l4-privacy-item check">
          <div class="l4-privacy-item-mark">✓</div>
          <span>Mini character preferences &amp; customization</span>
        </div>
        <div class="l4-privacy-item cross">
          <div class="l4-privacy-item-mark">✕</div>
          <span>Audio files, name, photo, identity</span>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ===== layer4-04-research.html ===== -->
<div class="l4-research">
  <h2 class="l4-research-title">Generates data while playing.<br>Lays the groundwork for research.</h2>
  <p class="l4-research-desc">
    Mini-Talks is also a structured, ethical, and parent-approved observation platform for selective mutism research. Research can be conducted using only numerical dashboard data, without accessing any audio files.
  </p>

  <div class="l4-research-cards">

    <div class="l4-research-card">
      <div class="l4-research-studs"></div>
      <img class="l4-research-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Head" />
      <h3>Graded Exposure Progression</h3>
      <p>Progression rate and recording duration trends across the Sound → Word → Sentence → Dialogue hierarchy. Time-series analysis of verbal output production. Primary dataset for quantitative monitoring of non-pharmacological intervention outcomes.</p>
    </div>

    <div class="l4-research-card">
      <div class="l4-research-studs"></div>
      <img class="l4-research-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Head" />
      <h3>Social Context Generalization</h3>
      <p>Cross-context generalization is measurable through scene-level clustering across 50 scenes. Anxiety hierarchy responses in familiar (Classroom) vs novel (Cinema) settings reveal which social contexts feel safe for the child.</p>
    </div>

    <div class="l4-research-card">
      <div class="l4-research-studs"></div>
      <img class="l4-research-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Head" />
      <h3>Longitudinal Behavioral Analysis</h3>
      <p>Full per-day activity report: session duration, scenes, recording count, levels, Mini preferences, motivation message, and rewards. Enables longitudinal behavioral pattern analysis suited for single-case experimental design (SCED) methodology.</p>
    </div>

    <div class="l4-research-card">
      <div class="l4-research-studs"></div>
      <img class="l4-research-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Head" />
      <h3>Therapeutic Task Analysis</h3>
      <p>Mission completion rate, type, and level correlation measure the effectiveness of anxiety hierarchy steps configured by parents. Which missions are completed more readily can guide individual stimulus fading strategies.</p>
    </div>

    <div class="l4-research-card">
      <div class="l4-research-studs"></div>
      <img class="l4-research-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Head" />
      <h3>Reinforcement &amp; Motivation Profile</h3>
      <p>Brick → Medal → Cup reward distribution reveals the effectiveness of positive reinforcement mechanisms in selective mutism intervention. Which reward category drives engagement maps the child's individual behavioral motivation profile.</p>
    </div>

    <div class="l4-research-card">
      <div class="l4-research-studs"></div>
      <img class="l4-research-icon" src="https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png" alt="Head" />
      <h3>Character-Mediated Verbal Production</h3>
      <p>Character type preference vs. recording duration correlation provides unique data for researching verbal production through psychological distancing. Multi-Mini usage patterns support hypotheses about avatar attachment and communication confidence.</p>
    </div>

  </div>
</div>`;

// ============================================================
// LAYER JS INIT — attaches interactive tab/slider handlers to window
// so inline onclick="..." handlers inside LAYERS_HTML resolve correctly.
// ============================================================
function initLayersJS() {
  // Role tabs (Layer 1-02)
  window.l1SelectRole = function(tab, roleKey) {
    document.querySelectorAll('.l1-role-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.l1-role-content').forEach(function(c) { c.classList.remove('active'); });
    tab.classList.add('active');
    var target = document.querySelector('.l1-role-content[data-content="' + roleKey + '"]');
    if (target) target.classList.add('active');
  };

  // Mini Figure Customization tabs (Layer 2-03)
  window.l2MfcTabSwitch = function(el, name) {
    var tabs = document.querySelectorAll('.l2-mfc-tab');
    tabs.forEach(function(t) { t.classList.remove('active'); });
    el.classList.add('active');
    var contents = document.querySelectorAll('.l2-mfc-content');
    contents.forEach(function(c) {
      if (c.getAttribute('data-mfc') === name) { c.classList.add('active'); }
      else { c.classList.remove('active'); }
    });
  };

  // Scene stack cycling animation (Layer 2-02) — React-safe version
  window.l2ScenesCycle = function(stackEl) {
    if (!stackEl) return;
    if (window._l2ScenesAnimating) return;
    window._l2ScenesAnimating = true;

    var classOrder = ['scene-1','scene-2','scene-3','scene-4','scene-5','scene-6'];
    var positions = [
      { left: '0%',    z: 1 },
      { left: '3.6%',  z: 2 },
      { left: '7.2%',  z: 3 },
      { left: '10.8%', z: 4 },
      { left: '14.4%', z: 5 },
      { left: '18%',   z: 6 }
    ];

    // Read current order from data-attribute (survives re-renders)
    var orderStr = stackEl.getAttribute('data-order');
    var order = orderStr ? orderStr.split(',') : classOrder.slice();

    var frontClass = order[order.length - 1];
    var frontImg = stackEl.querySelector('.' + frontClass);
    if (!frontImg) { window._l2ScenesAnimating = false; return; }

    frontImg.classList.add('going-back');
    stackEl.classList.add('cycling');

    setTimeout(function() {
      var moved = order.pop();
      order.unshift(moved);

      // Persist order in DOM attribute
      stackEl.setAttribute('data-order', order.join(','));

      frontImg.style.transition = 'none';
      frontImg.classList.remove('going-back');

      order.forEach(function(cls, idx) {
        var el = stackEl.querySelector('.' + cls);
        if (!el) return;
        var pos = positions[idx];
        el.style.left = pos.left;
        el.style.zIndex = pos.z;
      });

      void frontImg.offsetWidth;
      frontImg.style.transition = '';
      stackEl.classList.remove('cycling');

      window._l2ScenesAnimating = false;
    }, 500);
  };

  // Fallback DOM listener — in case inline onclick doesn't fire in React.
  // Exposed globally so useEffect can retry attaching after mount.
  window.__l2AttachListeners = function() {
    // Scene stack
    document.querySelectorAll('.l2-scenes-stack').forEach(function(stackEl) {
      if (stackEl._listenerAttached) return;
      stackEl._listenerAttached = true;
      stackEl.addEventListener('click', function() {
        window.l2ScenesCycle(stackEl);
      });
    });

    // Layer 1 role tabs — bind from data-role attribute
    document.querySelectorAll('.l1-role-tab').forEach(function(tab) {
      if (tab._listenerAttached) return;
      tab._listenerAttached = true;
      tab.addEventListener('click', function() {
        var key = tab.getAttribute('data-role');
        if (key) window.l1SelectRole(tab, key);
      });
    });

    // Layer 2 Mini Figure tabs — bind from data-target
    document.querySelectorAll('.l2-mfc-tab').forEach(function(tab) {
      if (tab._listenerAttached) return;
      tab._listenerAttached = true;
      tab.addEventListener('click', function() {
        var key = tab.getAttribute('data-target');
        if (key) window.l2MfcTabSwitch(tab, key);
      });
    });

    // Layer 4 top tabs — bind from data-target
    document.querySelectorAll('.l4-tab').forEach(function(tab) {
      if (tab._listenerAttached) return;
      tab._listenerAttached = true;
      tab.addEventListener('click', function() {
        var key = tab.getAttribute('data-target');
        if (key) window.l4TabSwitch(tab, key);
      });
    });

    // Layer 4 Manage/View toggle buttons — bind from data-mode-target
    document.querySelectorAll('.l4-toggle-btn').forEach(function(btn) {
      if (btn._listenerAttached) return;
      btn._listenerAttached = true;
      btn.addEventListener('click', function() {
        var mode = btn.getAttribute('data-mode-target');
        if (mode) window.l4ModeSwitch(btn, mode);
      });
    });

    // Slider arrows
    document.querySelectorAll('[data-slider-dir]').forEach(function(btn) {
      if (btn._listenerAttached) return;
      btn._listenerAttached = true;
      btn.addEventListener('click', function() {
        var dir = parseInt(btn.getAttribute('data-slider-dir'), 10);
        if (window.l4SliderGo) window.l4SliderGo(dir);
      });
    });
  };

  // Run once on init
  setTimeout(window.__l2AttachListeners, 100);

  // Dashboard slider (Layer 4-01)
  window.l4SlideImages = [
    'https://mini-talks.org/wp-content/uploads/2026/04/96be4cf1917bb4a714b04201819b1ec20ed81dfe.png',
    'https://mini-talks.org/wp-content/uploads/2026/04/83558e9ff1d6886503f3bcf59b94bd3cb4cf61af.png'
  ];
  window.l4SliderGo = function(dir) {
    var s1 = document.getElementById('l4Slide1');
    var s2 = document.getElementById('l4Slide2');
    if (!s1 || !s2) return;
    var tmp = s1.src;
    s1.src = s2.src;
    s2.src = tmp;
  };

  // Motivation Messages tabs (Layer 4-02)
  window.l4TabSwitch = function(el, name) {
    var tabs = document.querySelectorAll('.l4-tab');
    tabs.forEach(function(t) { t.classList.remove('active'); });
    el.classList.add('active');
    var contents = document.querySelectorAll('.l4-tab-content');
    contents.forEach(function(c) {
      if (c.getAttribute('data-tab') === name) { c.classList.add('active'); }
      else { c.classList.remove('active'); }
    });
  };

  // Manage / View mode toggle inside each tab (Layer 4-02)
  window.l4ModeSwitch = function(btn, mode) {
    var tabContent = btn.closest('.l4-tab-content');
    if (!tabContent) return;
    var btns = tabContent.querySelectorAll('.l4-toggle-btn');
    btns.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    var modes = tabContent.querySelectorAll('.l4-mode-content');
    modes.forEach(function(m) {
      if (m.getAttribute('data-mode') === mode) { m.classList.add('active'); }
      else { m.classList.remove('active'); }
    });
    var shots = tabContent.querySelectorAll('.l4-shot-mode');
    shots.forEach(function(s) {
      if (s.getAttribute('data-mode') === mode) { s.classList.add('active'); }
      else { s.classList.remove('active'); }
    });
  };
}

const AboutPage = () => {
  const navigate = useNavigate();
  const layersRef = useRef(null);

  // Navigation items
  const navigationItems = [
    { id: 'play', label: 'PLAY', action: () => navigate('/scene-selection') },
    { id: 'about', label: 'ABOUT', action: () => {} },
    { id: 'settings', label: 'SETTINGS', action: () => navigate('/settings') }
  ];

  // Register JS handlers on mount so inline onclick="..." and DOM fallbacks work
  useEffect(() => {
    initLayersJS();

    // Multi-try attach (React strict mode may delay DOM availability)
    var tries = 0;
    function tryAttach() {
      if (typeof window.__l2AttachListeners === 'function') {
        window.__l2AttachListeners();
      }
      tries++;
      if (tries < 5) setTimeout(tryAttach, 50);
    }
    tryAttach();
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', fontFamily: "'Montserrat', sans-serif", overflowX: 'hidden' }}>

      {/* Header - Ortak Component */}
      <Header
        showBackButton={true}
        onBack={() => navigate('/')}
        navigationItems={navigationItems}
        activeNavItem="about"
      />

      {/* Layer Styles */}
      <style dangerouslySetInnerHTML={{ __html: LAYERS_CSS }} />

      {/* ============================================== */}
      {/* ALL LAYER CONTENT (1 through 4)                */}
      {/* Rendered via dangerouslySetInnerHTML so the    */}
      {/* original HTML widget structure is preserved.   */}
      {/* ============================================== */}
      <div
        ref={layersRef}
        style={{ width: '100%', overflowX: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: LAYERS_HTML }}
      />

    </div>
  );
};

export default AboutPage;