// src/pages/ParentDashboard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ParentProfile from '../components/parent/ParentProfile';
import MyMinis from '../components/parent/MyMinis';

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'myminis'

  if (!user || user.role !== 'parent') {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo & Main Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-red-600 font-bold hover:text-red-700 flex items-center gap-2"
            >
              <span className="text-2xl">←</span>
              <span>Main menu</span>
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl">
                😊
              </div>
              <span className="font-black text-xl" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                Mini-Talks
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-3 font-black rounded-t-lg transition-all ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-black hover:bg-gray-300'
              }`}
              style={{ fontFamily: 'Arial Black, sans-serif' }}
            >
              PARENT PROFILE
            </button>
            <button
              onClick={() => setActiveTab('myminis')}
              className={`px-6 py-3 font-black rounded-t-lg transition-all ${
                activeTab === 'myminis'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-black hover:bg-gray-300'
              }`}
              style={{ fontFamily: 'Arial Black, sans-serif' }}
            >
              MY MINI(S)
            </button>
          </div>

          {/* User Info & Dropdown */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                😊
              </div>
              <div className="text-left">
                <div className="text-xs">Parent</div>
                <div className="font-bold">{user.profile?.full_name || 'Parent'}</div>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'profile' && <ParentProfile user={user} />}
        {activeTab === 'myminis' && <MyMinis user={user} />}
      </div>
    </div>
  );
};

export default ParentDashboard;
