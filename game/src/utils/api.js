// src/utils/api.js
import axios from 'axios';

// ⬇️ BUNU KENDİ HOSTUNA GÖRE DÜZENLE ⬇️
// Örnek: https://mini-talks.org/minitalks-api
// IP ile deneyeceksen (geçici):
// const API_BASE_URL = 'https://217.154.240.193/minitalks-api';
const API_BASE_URL = 'https://mini-talks.org/minitalks-api';

export const authAPI = {
  // REGISTER
  register: (data) =>
    axios.post(`${API_BASE_URL}/auth/register.php`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    }),

  // LOGIN (backend’i yazınca bunu da kullanacaksın)
  login: (data) =>
    axios.post(`${API_BASE_URL}/auth/login.php`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    }),

  // Logout için backend varsa endpoint koyarsın, yoksa localStorage temizlemek yeter
  logout: () => {
    // İstersen backend'e de istek atarsın
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Profil API'sini sonra yazacaksan şimdilik böyle placeholder kalabilir
export const profileAPI = {
  getProfile: () =>
    axios.get(`${API_BASE_URL}/profile/me.php`, {
      headers: {
        'Content-Type': 'application/json',
      },
    }),
};
