// src/components/dashboard/MiniJourney.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import profileIcon from '../../assets/profile-icon.png';

// LEGO Brick Button Component
const LegoBrickButton = ({ onClick, variant = 'red', children, className = '' }) => {
  const colors = {
    red: { bg: '#E52828', border: '#C41E1E', text: '#E52828' },
    blue: { bg: '#0055BF', border: '#003D8C', text: '#0055BF' },
    green: { bg: '#237841', border: '#1A5C31', text: '#237841' },
    yellow: { bg: '#FFCC00', border: '#D4AA00', text: '#000000' }
  };
  
  const color = colors[variant] || colors.red;
  
  return (
    <button onClick={onClick} className={`relative group transition-transform hover:scale-105 ${className}`}>
      {/* LEGO studs on top */}
      <div className="flex gap-2 justify-center mb-[-2px] relative z-10">
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className="w-6 h-2 rounded-t-md"
            style={{ backgroundColor: color.bg }}
          />
        ))}
      </div>
      {/* Main button body */}
      <div 
        className="px-8 py-3 rounded-lg border-4 font-black text-base relative"
        style={{ 
          backgroundColor: '#ffffff',
          borderColor: color.bg,
          color: color.text
        }}
      >
        {children}
      </div>
    </button>
  );
};

// Brick Icon for Calendar
const BrickIcon = ({ filled = false, color = 'blue' }) => {
  const colors = {
    blue: { main: '#0055BF', dark: '#003D8C' },
    green: { main: '#4CAF50', dark: '#388E3C' },
    gray: { main: '#9E9E9E', dark: '#757575' }
  };
  const c = colors[color] || colors.blue;
  
  return (
    <div className="relative w-6 h-5">
      {/* Stud */}
      <div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-1.5 rounded-t-sm"
        style={{ backgroundColor: filled ? c.main : c.dark }}
      />
      {/* Body */}
      <div 
        className="absolute bottom-0 w-full h-4 rounded-sm"
        style={{ backgroundColor: filled ? c.main : c.dark, opacity: filled ? 1 : 0.4 }}
      />
    </div>
  );
};

// Progress Bar Colors
const getProgressColor = (index, completed) => {
  if (!completed) return { main: '#E0E0E0', dark: '#BDBDBD' };
  if (index < 2) return { main: '#E52828', dark: '#C41E1E' };
  if (index < 4) return { main: '#FFCC00', dark: '#D4AA00' };
  if (index < 6) return { main: '#0055BF', dark: '#003D8C' };
  return { main: '#4CAF50', dark: '#388E3C' };
};

const MiniJourney = ({ user }) => {
  const [recordings, setRecordings] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [missions, setMissions] = useState([]);
  const [customizations, setCustomizations] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  // Slider states
  const [recordingsPage, setRecordingsPage] = useState(0);
  const [scenesPage, setScenesPage] = useState(0);
  const [customsPage, setCustomsPage] = useState(0);

  const miniId = user?.profile?.mini_id || user?.mini_id;
  const montserratFont = { fontFamily: "'Montserrat', sans-serif" };

  useEffect(() => {
    if (miniId) {
      fetchMiniData();
    }
  }, [miniId]);

  const fetchMiniData = async () => {
    try {
      setLoading(true);
      
      const [recordingsRes, scenesRes, missionsRes, customsRes, activityRes] = await Promise.all([
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-recordings.php?mini_id=${miniId}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-scenes.php?mini_id=${miniId}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-missions.php?mini_id=${miniId}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-customizations.php?mini_id=${miniId}`).catch(() => ({ data: { data: [] } })),
        axios.get(`https://mini-talks.org/minitalks-api/mini/get-activity.php?mini_id=${miniId}&month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`).catch(() => ({ data: { data: {} } }))
      ]);

      setRecordings(recordingsRes.data?.data || getDemoRecordings());
      setScenes(scenesRes.data?.data || getDemoScenes());
      setMissions(missionsRes.data?.data || getDemoMissions());
      setCustomizations(customsRes.data?.data || getDemoCustomizations());
      setCalendarData(activityRes.data?.data || getDemoCalendarData());
      
    } catch (error) {
      console.error('Failed to fetch mini data:', error);
      setRecordings(getDemoRecordings());
      setScenes(getDemoScenes());
      setMissions(getDemoMissions());
      setCustomizations(getDemoCustomizations());
      setCalendarData(getDemoCalendarData());
    } finally {
      setLoading(false);
    }
  };

  // Demo data functions
  const getDemoRecordings = () => [
    { recording_id: 1, scene_name: 'Basketball', word_name: 'Word', duration_seconds: 7, created_at: new Date().toISOString() },
    { recording_id: 2, scene_name: 'Basketball', word_name: 'Word', duration_seconds: 7, created_at: new Date().toISOString() },
    { recording_id: 3, scene_name: 'Basketball', word_name: 'Word', duration_seconds: 7, created_at: new Date().toISOString() },
    { recording_id: 4, scene_name: 'Basketball', word_name: 'Word', duration_seconds: 7, created_at: new Date().toISOString() }
  ];

  const getDemoScenes = () => [
    { scene_id: 1, scene_name: 'Basketball Court', is_locked: false, words_completed: 4, total_words: 8 },
    { scene_id: 2, scene_name: 'Classroom', is_locked: false, words_completed: 5, total_words: 8 },
    { scene_id: 3, scene_name: 'Market', is_locked: true, words_completed: 0, total_words: 8 }
  ];

  const getDemoMissions = () => [
    { mission_id: 1, mission_title: 'Record 2 levels today.', is_completed: true },
    { mission_id: 2, mission_title: 'Record 2 levels today.', is_completed: true }
  ];

  const getDemoCustomizations = () => [
    { customization_id: 1, customization_name: 'My Mini 1' },
    { customization_id: 2, customization_name: 'My Mini 2' },
    { customization_id: 3, customization_name: 'My Mini 3' }
  ];

  const getDemoCalendarData = () => {
    const data = {};
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      data[d.toISOString().split('T')[0]] = true;
    }
    return data;
  };

  // Calendar helpers
  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7;
    
    const days = [];
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({ day: prevMonth.getDate() - i, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ 
        day: i, 
        isCurrentMonth: true, 
        hasActivity: calendarData[dateStr] || false,
        isToday: new Date().toISOString().split('T')[0] === dateStr
      });
    }
    
    return days;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-pulse">🧱 Loading your journey...</div>
      </div>
    );
  }

  const miniProfile = user?.profile || {};

  return (
    <div className="bg-white" style={montserratFont}>
      <div className="grid grid-cols-12 gap-6">
        
        {/* ===== ROW 1 ===== */}
        
        {/* Mini Profile Card (Left) */}
        <div className="col-span-3">
          <div className="bg-white rounded-3xl border-4 border-gray-300 p-6 h-full flex flex-col items-center">
            {/* Avatar */}
            <div className="w-44 h-44 bg-yellow-400 rounded-3xl flex items-center justify-center mb-4 border-4 border-yellow-500 shadow-lg">
              <img 
                src={profileIcon} 
                alt={miniProfile.mini_name}
                className="w-32 h-32 object-contain"
              />
            </div>
            
            {/* Mini Name */}
            <div className="text-xl font-semibold text-gray-700 mb-2">
              {miniProfile.mini_name || 'Mini'}
            </div>
            
            {/* Tagline */}
            <div className="text-2xl font-black text-center leading-tight mb-6">
              {miniProfile.tagline || 'The bravest Mini ever!'}
            </div>
            
            {/* Play Button */}
            <LegoBrickButton variant="red" className="w-full">
              Play
            </LegoBrickButton>
          </div>
        </div>

        {/* Recordings (Yellow) */}
        <div className="col-span-3">
          <div className="bg-yellow-400 rounded-3xl p-5 h-full relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black text-white drop-shadow-[2px_2px_0px_#000]">
                Recordings
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setRecordingsPage(Math.max(0, recordingsPage - 1))}
                  className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold hover:bg-blue-700"
                >
                  ▼
                </button>
                <button 
                  onClick={() => setRecordingsPage(recordingsPage + 1)}
                  className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold hover:bg-blue-700"
                >
                  ▲
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {recordings.slice(recordingsPage * 4, (recordingsPage + 1) * 4).map((rec) => (
                <div 
                  key={rec.recording_id}
                  className="bg-white rounded-xl p-2 flex items-center gap-3 border-2 border-yellow-500"
                >
                  <div className="w-16 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-l-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">🎬</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 font-semibold">{formatDate(rec.created_at)}</div>
                    <div className="font-black text-sm truncate">{rec.scene_name}</div>
                    <div className="text-xs font-bold text-gray-600">{rec.word_name}</div>
                  </div>
                  
                  <div className="text-sm font-bold text-gray-700">
                    {formatDuration(rec.duration_seconds)}
                  </div>
                  
                  <button className="w-9 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700">
                    ▶
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Streak Calendar (Blue) */}
        <div className="col-span-3">
          <div className="bg-blue-600 rounded-3xl p-5 h-full">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-2xl font-black text-white drop-shadow-[2px_2px_0px_#000]">
                Streak
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="text-white hover:text-yellow-300 text-lg">◀</button>
                <span className="text-white font-bold text-sm">
                  {currentMonth.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </span>
                <button onClick={nextMonth} className="text-white hover:text-yellow-300 text-lg">▶</button>
              </div>
            </div>
            
            <div className="text-yellow-300 font-bold text-sm mb-3">
              {miniProfile.current_streak || 5} day streak!
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-white text-xs font-bold">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {getMonthDays().map((day, idx) => (
                <div 
                  key={idx}
                  className={`relative flex flex-col items-center py-1 ${!day.isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <BrickIcon filled={day.hasActivity} color={day.hasActivity ? 'green' : 'blue'} />
                  <span className={`text-xs font-bold ${day.isToday ? 'text-yellow-300' : 'text-white'}`}>
                    {day.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Missions & Rewards */}
        <div className="col-span-3 space-y-4">
          {/* Mini Missions (Green) */}
          <div className="bg-green-700 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-white drop-shadow-[2px_2px_0px_#000]">
                Mini Missions
              </h3>
              <div className="flex items-center gap-2">
                <button className="text-white hover:text-yellow-300">◀</button>
                <span className="text-white font-bold text-sm">Today</span>
                <button className="text-white hover:text-yellow-300">▶</button>
              </div>
            </div>
            
            <div className="space-y-2">
              {missions.slice(0, 2).map(mission => (
                <div key={mission.mission_id} className="bg-white rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                    mission.is_completed ? 'bg-green-500 border-green-600' : 'bg-white border-gray-400'
                  }`}>
                    {mission.is_completed && <span className="text-white text-sm">✓</span>}
                  </div>
                  <span className="font-bold text-sm">{mission.mission_title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards (Red) */}
          <div className="bg-red-600 rounded-3xl p-5">
            <h3 className="text-xl font-black text-white drop-shadow-[2px_2px_0px_#000] mb-4">
              Rewards
            </h3>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 text-center">
                <div className="text-xs font-bold text-gray-600 mb-1">Bricks</div>
                <div className="text-2xl mb-1">🧱</div>
                <div className="font-black text-lg">{miniProfile.total_bricks || 100}</div>
              </div>
              
              <div className="bg-white rounded-xl p-3 text-center">
                <div className="text-xs font-bold text-gray-600 mb-1">Medals</div>
                <div className="text-2xl mb-1">🏅</div>
                <div className="font-black text-lg">{miniProfile.total_medals || 10}</div>
              </div>
              
              <div className="bg-white rounded-xl p-3 text-center">
                <div className="text-xs font-bold text-gray-600 mb-1">Cup</div>
                <div className="text-2xl mb-1">🏆</div>
                <div className="font-black text-lg">{miniProfile.total_cups || 3}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== ROW 2 ===== */}

        {/* Mini Scenes (Green) */}
        <div className="col-span-6">
          <div className="bg-green-700 rounded-3xl p-5">
            <h3 className="text-2xl font-black text-white drop-shadow-[2px_2px_0px_#000] mb-4">
              Mini Scenes
            </h3>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setScenesPage(Math.max(0, scenesPage - 1))}
                className="text-white text-3xl hover:text-yellow-300 flex-shrink-0"
              >
                ◀
              </button>
              
              <div className="flex gap-4 overflow-hidden flex-1">
                {scenes.slice(scenesPage * 3, (scenesPage + 1) * 3).map((scene) => (
                  <div 
                    key={scene.scene_id}
                    className="flex-1 bg-white rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                  >
                    <div className="h-36 bg-gradient-to-br from-gray-300 to-gray-400 relative">
                      {scene.is_locked && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-4xl">🔒</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 text-center">
                      <div className="font-black text-sm mb-2">{scene.scene_name}</div>
                      
                      <div className="flex gap-1 justify-center">
                        {Array.from({ length: 8 }).map((_, i) => {
                          const completed = i < (scene.words_completed || 0);
                          const color = getProgressColor(i, completed);
                          return (
                            <div key={i} className="relative w-4">
                              <div className="w-2 h-1 mx-auto rounded-t-sm" style={{ backgroundColor: color.dark }} />
                              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: color.main }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => setScenesPage(scenesPage + 1)}
                className="text-white text-3xl hover:text-yellow-300 flex-shrink-0"
              >
                ▶
              </button>
            </div>
            
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: Math.ceil(scenes.length / 3) }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${i === scenesPage ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* My Customized Minis (Yellow) */}
        <div className="col-span-6">
          <div className="bg-yellow-400 rounded-3xl p-5">
            <h3 className="text-2xl font-black text-white drop-shadow-[2px_2px_0px_#000] mb-4">
              My Customized Minis
            </h3>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCustomsPage(Math.max(0, customsPage - 1))}
                className="text-white text-3xl hover:text-blue-600 flex-shrink-0"
              >
                ◀
              </button>
              
              <div className="flex gap-4 overflow-hidden flex-1">
                {customizations.slice(customsPage * 3, (customsPage + 1) * 3).map((custom) => (
                  <div 
                    key={custom.customization_id}
                    className="flex-1 bg-white rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                  >
                    <div className="h-44 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <div className="w-24 h-32 bg-gradient-to-b from-red-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-4xl">🧱</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => setCustomsPage(customsPage + 1)}
                className="text-white text-3xl hover:text-blue-600 flex-shrink-0"
              >
                ▶
              </button>
            </div>
            
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: Math.ceil(customizations.length / 3) }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${i === customsPage ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MiniJourney;