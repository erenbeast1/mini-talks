// src/components/dashboard/ExpertMyMinis.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Components
import MiniManage from './MiniManage';

// PNG Assets
import viewBtn from '../../assets/View_Buton.png';
import viewBtnHover from '../../assets/View_Buton_Hover.png';
import profileIcon from '../../assets/profile-icon.png';

const ExpertMyMinis = ({ user }) => {
  const [minis, setMinis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selected mini for view
  const [selectedMini, setSelectedMini] = useState(null);
  const [showMiniView, setShowMiniView] = useState(false);
  
  // Button hover states
  const [viewHoverIndex, setViewHoverIndex] = useState(null);

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
      } else {
        // Demo data fallback
        setMinis([
          { mini_id: 1, mini_name: 'Demo Mini', age_range: '7-9', parent_name: 'Demo Parent', current_streak: 5, tagline: 'The bravest Mini ever!' }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch minis:', error);
      // Demo data on error
      setMinis([
        { mini_id: 1, mini_name: 'Demo Mini', age_range: '7-9', parent_name: 'Demo Parent', current_streak: 5, tagline: 'The bravest Mini ever!' }
      ]);
    } finally {
      setLoading(false);
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
        <div className="text-4xl">⏳ Loading...</div>
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

  return (
    <div className="space-y-10 pb-12">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-6xl font-black" style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.02em' }}>
          MY MINI(S)
        </h1>
      </div>

      {/* Connected Mini(s) Section */}
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
            <div className="text-gray-500">Parents can connect their Mini(s) with you.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {minis.map((mini, index) => (
              <div
                key={mini.mini_id}
                className={`rounded-3xl p-8 border-4 transition-all ${
                  index === 0 
                    ? 'bg-green-600 text-white border-green-800 shadow-lg' 
                    : 'bg-white border-black shadow-md hover:shadow-xl'
                }`}
              >
                <div className="flex items-center gap-6 mb-6">
                  {/* Profile Icon */}
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center border-4 shadow-md ${
                    index === 0 ? 'bg-white border-green-800' : 'bg-yellow-400 border-black'
                  }`}>
                    <img 
                      src={profileIcon}
                      alt={mini.mini_name}
                      className="w-16 h-16"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-black text-3xl mb-2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                      {mini.mini_name}
                    </div>
                    <div className={`text-sm font-semibold ${index === 0 ? 'text-green-100' : 'text-gray-600'}`}>
                      Age Range: {mini.age_range}
                    </div>
                    <div className={`text-sm font-semibold ${index === 0 ? 'text-green-200' : 'text-gray-500'}`}>
                      Parent: {mini.parent_name || 'N/A'}
                    </div>
                    {/* Show streak info */}
                    {mini.current_streak > 0 && (
                      <div className={`text-sm font-semibold mt-1 ${index === 0 ? 'text-yellow-300' : 'text-green-600'}`}>
                        🔥 {mini.current_streak} day streak!
                      </div>
                    )}
                  </div>
                </div>
                
                {/* View Button - Expert sadece View yapabilir */}
                <button
                  onClick={() => handleViewClick(mini)}
                  onMouseEnter={() => setViewHoverIndex(index)}
                  onMouseLeave={() => setViewHoverIndex(null)}
                  className="transition-transform hover:scale-105"
                >
                  <img 
                    src={viewHoverIndex === index ? viewBtnHover : viewBtn}
                    alt="View"
                    className="h-12"
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expert Note */}
      <div className="bg-blue-50 rounded-3xl p-8 border-4 border-blue-200">
        <h3 className="font-black text-xl mb-3 text-blue-800">Expert Access Note:</h3>
        <p className="text-blue-700">
          As an expert, you can view Mini progress, recordings, and journey data. 
          Management features are restricted to parents only.
        </p>
      </div>
    </div>
  );
};

export default ExpertMyMinis;
