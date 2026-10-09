// src/components/popups/AddExpertPopup.jsx
import React, { useState } from 'react';
import axios from 'axios';

const AddExpertPopup = ({ show, onClose, parentId, minis }) => {
  const [selectedMini, setSelectedMini] = useState('');
  const [expertEmail, setExpertEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'https://mini-talks.org/minitalks-api/auth/add-expert.php',
        {
          parent_id: parentId,
          mini_id: selectedMini,
          expert_email: expertEmail
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setSelectedMini('');
          setExpertEmail('');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expert');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border-4 border-green-600">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-3xl font-black mb-3" style={{ fontFamily: 'Arial Black, sans-serif' }}>
            Request Sent!
          </h3>
          <p className="text-gray-700">
            The expert will be notified and can connect once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full border-4 border-green-600">
        <h3 className="text-4xl font-black mb-3 text-center" style={{ fontFamily: 'Arial Black, sans-serif' }}>
          Connect with Expert
        </h3>
        <p className="text-center text-gray-600 mb-6">
          Add an expert to help guide your Mini's progress. They'll need parent approval.
        </p>

        {/* LEGO Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center text-5xl border-4 border-black">
            😊
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-center font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Select Mini */}
          <div>
            <label className="block font-black text-sm mb-2">Select Mini:</label>
            <select
              value={selectedMini}
              onChange={(e) => setSelectedMini(e.target.value)}
              className="w-full px-4 py-3 border-2 border-black rounded-xl"
              required
            >
              <option value="">Choose a Mini...</option>
              {minis.map(mini => (
                <option key={mini.mini_id} value={mini.mini_id}>
                  {mini.mini_name} ({mini.age_range})
                </option>
              ))}
            </select>
          </div>

          {/* Expert Email */}
          <div>
            <label className="block font-black text-sm mb-2">Expert's Email:</label>
            <input
              type="email"
              value={expertEmail}
              onChange={(e) => setExpertEmail(e.target.value)}
              placeholder="expert@email.com"
              className="w-full px-4 py-3 border-2 border-black rounded-xl"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The expert must have an account with this email.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 text-black rounded-xl font-black hover:bg-gray-300 border-2 border-black"
              disabled={loading}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMini || !expertEmail}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-black hover:bg-green-700 border-2 border-black disabled:opacity-50"
            >
              {loading ? 'SENDING...' : 'SEND REQUEST'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpertPopup;