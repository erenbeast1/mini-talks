// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { authAPI, profileAPI } from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const guestUser = localStorage.getItem('guestUser');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      loadProfile();
    } else if (guestUser) {
      const guest = JSON.parse(guestUser);
      setUser(guest);
      setProfile(guest.profile);
    }
    setLoading(false);
  }, []);

  const loadProfile = async () => {
    try {
      const response = await profileAPI.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const login = async (email, password) => {
    // Guest ve session verilerini temizle
    localStorage.removeItem('guestUser');
    sessionStorage.removeItem('selectedMini');
    sessionStorage.removeItem('currentScene');
    sessionStorage.removeItem('characterCustomizations');
    
    const response = await authAPI.login({ email, password });
    const { token, user } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
    await loadProfile();

    return response.data;
  };

  const loginAsGuest = () => {
    // Eski tüm verileri temizle
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('selectedMini');
    sessionStorage.removeItem('currentScene');
    sessionStorage.removeItem('characterCustomizations');
    
    const guestUser = {
      id: `guest_${Date.now()}`,
      user_id: `guest_${Date.now()}`,
      email: null,
      role: 'guest',
      isGuest: true,
      profile: {
        username: 'Guest Player',
        full_name: 'Guest',
        mini_name: 'Guest Mini'
      }
    };

    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    setUser(guestUser);
    setProfile(guestUser.profile);
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    return response.data;
  };

  const logout = () => {
    // Sadece auth verilerini temizle - sessionStorage'a DOKUNMA
    if (user?.isGuest) {
      localStorage.removeItem('guestUser');
    } else {
      authAPI.logout();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('guestUser');
    // sessionStorage temizlemeyi KALDIRDIK - login/loginAsGuest zaten yapıyor
    
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        loginAsGuest,
        register,
        logout,
        loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};