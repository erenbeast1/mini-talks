// src/components/dashboard/MiniProfile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import profileIcon from '../../assets/profile-icon.png';
import changeAvatarBtn from '../../assets/Change_Avatar_Buton.png';
import changeAvatarBtnHover from '../../assets/Change_Avatar_Buton_Hover.png';
import saveChangesBtn from '../../assets/Save_Changes_Buton.png';
import saveChangesBtnHover from '../../assets/Save_Changes_Buton_Hover.png';

const MiniProfile = ({ user, mini }) => {
  const [avatarHover, setAvatarHover] = useState(false);
  const [saveHover, setSaveHover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // mini prop'u varsa onu kullan (parent/expert mini seçtiğinde), yoksa user'dan al (child login)
  const miniId = mini?.mini_id || user?.profile?.mini_id || user?.mini_id;
  const [miniName, setMiniName] = useState('');

  useEffect(() => {
    // mini prop değişirse veya user değişirse state'i güncelle
    if (mini?.mini_name) {
      setMiniName(mini.mini_name);
    } else if (user?.profile?.mini_name) {
      setMiniName(user.profile.mini_name);
    }
  }, [mini, user]);

  const handleSave = async () => {
    if (!miniId) return;
    
    try {
      setLoading(true);
      setMessage('');
      
      const response = await axios.post('https://mini-talks.org/minitalks-api/profile/update-mini.php', {
        mini_id: miniId,
        mini_name: miniName
      });
      
      if (response.data.success) {
        setMessage('Changes saved successfully!');
        // sessionStorage'daki mini bilgisini güncelle
        if (mini) {
          const updatedMini = { ...mini, mini_name: miniName };
          sessionStorage.setItem('selectedMini', JSON.stringify(updatedMini));
        }
      } else {
        setMessage('Failed to save changes');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const montserratFont = { fontFamily: "'Montserrat', sans-serif" };

  return (
    <div className="bg-white" style={montserratFont}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-black mb-2">MINI PROFILE</h1>
        <p className="text-gray-600">Give your Mini a name and a cool new look!</p>
      </div>

      {/* Content */}
      <div className="flex gap-12">
        {/* Left: Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div 
            className="w-72 h-72 bg-yellow-400 rounded-3xl flex items-center justify-center border-4 border-black"
          >
            <img src={profileIcon} alt="Mini Avatar" className="w-40 h-40" />
          </div>
          <button 
            onMouseEnter={() => setAvatarHover(true)} 
            onMouseLeave={() => setAvatarHover(false)} 
            className="transition-transform hover:scale-105"
          >
            <img 
              src={avatarHover ? changeAvatarBtnHover : changeAvatarBtn} 
              alt="Change Avatar" 
              className="h-12" 
            />
          </button>
        </div>

        {/* Right: Form */}
        <div className="flex-1 max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
            {/* Mini Name */}
            <div>
              <label className="block font-black text-base mb-2">Mini Name:</label>
              <input 
                type="text" 
                value={miniName}
                onChange={(e) => setMiniName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black rounded-xl font-medium"
                placeholder="Enter mini name"
              />
            </div>

            {/* Message */}
            {message && (
              <div className={`text-center py-2 ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-center pt-4">
              <button 
                type="submit" 
                onMouseEnter={() => setSaveHover(true)} 
                onMouseLeave={() => setSaveHover(false)} 
                className="transition-transform hover:scale-105"
                disabled={loading}
              >
                <img 
                  src={saveHover ? saveChangesBtnHover : saveChangesBtn} 
                  alt="Save Changes" 
                  className="h-14" 
                  style={{ opacity: loading ? 0.5 : 1 }}
                />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MiniProfile;
