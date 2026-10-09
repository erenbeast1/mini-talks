import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { profileAPI } from '../utils/api';

const ProfilePage = () => {
  const { user, profile, loadProfile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    mini_name: '',
    age_range: '4-6',
    full_name: '',
    username: '',
    organization: '',
    profession: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let response;
      
      switch(user.role) {
        case 'child':
          response = await profileAPI.createMini({
            mini_name: formData.mini_name,
            age_range: formData.age_range
          });
          break;
        case 'parent':
          response = await profileAPI.createParent({
            full_name: formData.full_name
          });
          break;
        case 'expert':
          response = await profileAPI.createExpert({
            full_name: formData.full_name,
            username: formData.username,
            organization: formData.organization,
            profession: formData.profession
          });
          break;
        case 'builder':
          response = await profileAPI.createBuilder({
            full_name: formData.full_name,
            username: formData.username,
            age_range: formData.age_range
          });
          break;
        default:
          throw new Error('Invalid role');
      }

      setSuccess('Profile created successfully!');
      await loadProfile();
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.has_profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
            <div className="space-y-2">
              {profile.profile && Object.entries(profile.profile).map(([key, value]) => (
                <div key={key}>
                  <strong className="capitalize">{key.replace('_', ' ')}:</strong> {value}
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 bg-lego-blue text-white px-6 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-6">Create Your Profile</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Child/Mini Profile */}
            {user.role === 'child' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Name:</label>
                  <input
                    type="text"
                    name="mini_name"
                    value={formData.mini_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Age Range:</label>
                  <select
                    name="age_range"
                    value={formData.age_range}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="4-6">4-6 years</option>
                    <option value="7-9">7-9 years</option>
                    <option value="10-12">10-12 years</option>
                    <option value="13-17">13-17 years</option>
                  </select>
                </div>
              </>
            )}

            {/* Parent Profile */}
            {user.role === 'parent' && (
              <div>
                <label className="block text-sm font-medium mb-1">Full Name:</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="John Doe"
                />
              </div>
            )}

            {/* Expert Profile */}
            {user.role === 'expert' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name:</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username:</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Organization:</label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Profession:</label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </>
            )}

            {/* Builder Profile */}
            {user.role === 'builder' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name:</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username:</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Age Range:</label>
                  <select
                    name="age_range"
                    value={formData.age_range}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="18-24">18-24 years</option>
                    <option value="25-34">25-34 years</option>
                    <option value="35-44">35-44 years</option>
                    <option value="45+">45+ years</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-lego-green text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;