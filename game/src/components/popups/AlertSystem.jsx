// src/components/popups/AlertSystem.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

// LEGO head görseli
import legoHead from '../../assets/5.png';

// Button images
import okBtnBlue from '../../assets/ok_btn_blue.png';
import okBtnBlueHover from '../../assets/ok_btn_blue_hover.png';
import okBtnRed from '../../assets/ok_btn_red.png';
import okBtnRedHover from '../../assets/ok_btn_red_hover.png';
import cancelBtnImg from '../../assets/cancel_btn.png';
import cancelBtnImgHover from '../../assets/cancel_btn_hover.png';

/**
 * Renk temaları
 * success: Yeşil - Başarılı işlemler
 * error: Kırmızı - Hata mesajları
 * warning: Turuncu - Uyarılar
 * info: Mavi - Bilgilendirme
 * danger: Koyu kırmızı - Tehlikeli işlemler (silme vs)
 */
const THEMES = {
  success: {
    primary: '#237841',
    primaryHover: '#1c5f34',
    buttonType: 'blue' // Mavi OK butonu
  },
  error: {
    primary: '#E31E24',
    primaryHover: '#c41a1f',
    buttonType: 'red' // Kırmızı OK butonu
  },
  warning: {
    primary: '#F5A623',
    primaryHover: '#d9911e',
    buttonType: 'red' // Kırmızı OK butonu
  },
  info: {
    primary: '#0055BF',
    primaryHover: '#004499',
    buttonType: 'blue' // Mavi OK butonu
  },
  danger: {
    primary: '#B91C1C',
    primaryHover: '#991b1b',
    buttonType: 'red' // Kırmızı OK butonu
  }
};

// Context
const AlertContext = createContext(null);

/**
 * AlertPopup Component
 * Tek butonlu uyarı popup'ı (OK + opsiyonel Cancel)
 */
export const AlertPopup = ({
  show,
  onClose,
  title = 'Alert',
  message,
  theme = 'info',
  showCancel = false,
  okText = 'OK',
  cancelText = 'Cancel',
  onCancel,
  customIcon = null
}) => {
  const [okHover, setOkHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  if (!show) return null;

  const colors = THEMES[theme] || THEMES.info;
  const isBlueButton = colors.buttonType === 'blue';

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div style={{ margin: '0 16px', maxWidth: '500px', width: '100%' }}>
        <div
          style={{
            backgroundColor: colors.primary,
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <h2
              style={{
                color: '#ffffff',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '26px',
                fontWeight: 900,
                margin: 0,
                textAlign: 'center'
              }}
            >
              {title}
            </h2>
          </div>

          {/* White content area */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              margin: '0 6px 6px 6px',
              padding: '15px 10px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {/* Custom Icon or LEGO Head */}
            {customIcon ? (
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  backgroundColor: '#FFCC00',
                  border: '4px solid #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <img
                  src={customIcon}
                  alt="Icon"
                  style={{
                    width: '56px',
                    height: '56px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            ) : (
              <img
                src={legoHead}
                alt="LEGO Character"
                style={{
                  width: '120px',
                  height: '120px',
                  objectFit: 'contain',
                  flexShrink: 0
                }}
              />
            )}

            {/* Right side content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1
              }}
            >
              <p
                style={{
                  color: '#000000',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '16px',
                  fontWeight: 500,
                  textAlign: 'center',
                  marginBottom: '16px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {message}
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {showCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    onMouseEnter={() => setCancelHover(true)}
                    onMouseLeave={() => setCancelHover(false)}
                    className="transition-transform hover:scale-105"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <img 
                      src={cancelHover ? cancelBtnImgHover : cancelBtnImg}
                      alt={cancelText}
                      style={{ height: '48px', width: 'auto' }}
                    />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  onMouseEnter={() => setOkHover(true)}
                  onMouseLeave={() => setOkHover(false)}
                  className="transition-transform hover:scale-105"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img 
                    src={isBlueButton 
                      ? (okHover ? okBtnBlueHover : okBtnBlue)
                      : (okHover ? okBtnRedHover : okBtnRed)
                    }
                    alt={okText}
                    style={{ height: '48px', width: 'auto' }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ConfirmPopup Component
 * İki butonlu onay popup'ı (Confirm + Cancel)
 */
export const ConfirmPopup = ({
  show,
  onConfirm,
  onCancel,
  title = 'Confirm',
  message,
  theme = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmTheme = null, // Confirm butonu için farklı renk (örn: danger)
  customIcon = null
}) => {
  const [confirmHover, setConfirmHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  if (!show) return null;

  const headerColors = THEMES[theme] || THEMES.warning;
  const confirmColors = THEMES[confirmTheme || theme] || headerColors;
  const isBlueButton = confirmColors.buttonType === 'blue';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div style={{ margin: '0 16px', maxWidth: '500px', width: '100%' }}>
        <div
          style={{
            backgroundColor: headerColors.primary,
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <h2
              style={{
                color: '#ffffff',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '26px',
                fontWeight: 900,
                margin: 0,
                textAlign: 'center'
              }}
            >
              {title}
            </h2>
          </div>

          {/* White content area */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              margin: '0 6px 6px 6px',
              padding: '15px 10px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {/* Custom Icon or LEGO Head */}
            {customIcon ? (
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  backgroundColor: '#FFCC00',
                  border: '4px solid #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <img
                  src={customIcon}
                  alt="Icon"
                  style={{
                    width: '56px',
                    height: '56px',
                    objectFit: 'contain'
                  }}
                />
              </div>
            ) : (
              <img
                src={legoHead}
                alt="LEGO Character"
                style={{
                  width: '120px',
                  height: '120px',
                  objectFit: 'contain',
                  flexShrink: 0
                }}
              />
            )}

            {/* Right side content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1
              }}
            >
              <p
                style={{
                  color: '#000000',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '16px',
                  fontWeight: 500,
                  textAlign: 'center',
                  marginBottom: '16px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {message}
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={onCancel}
                  onMouseEnter={() => setCancelHover(true)}
                  onMouseLeave={() => setCancelHover(false)}
                  className="transition-transform hover:scale-105"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img 
                    src={cancelHover ? cancelBtnImgHover : cancelBtnImg}
                    alt={cancelText}
                    style={{ height: '48px', width: 'auto' }}
                  />
                </button>

                <button
                  type="button"
                  onClick={onConfirm}
                  onMouseEnter={() => setConfirmHover(true)}
                  onMouseLeave={() => setConfirmHover(false)}
                  className="transition-transform hover:scale-105"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <img 
                    src={isBlueButton 
                      ? (confirmHover ? okBtnBlueHover : okBtnBlue)
                      : (confirmHover ? okBtnRedHover : okBtnRed)
                    }
                    alt={confirmText}
                    style={{ height: '48px', width: 'auto' }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * SuccessPopup - Başarı mesajları için kısayol (Mavi OK butonu)
 */
export const SuccessPopup = ({ show, onClose, title = 'Success!', message, customIcon = null }) => (
  <AlertPopup
    show={show}
    onClose={onClose}
    title={title}
    message={message}
    theme="success"
    okText="OK"
    customIcon={customIcon}
  />
);

/**
 * ErrorPopup - Hata mesajları için kısayol (Kırmızı OK butonu)
 */
export const ErrorAlertPopup = ({ show, onClose, title = 'Oops!', message, customIcon = null }) => (
  <AlertPopup
    show={show}
    onClose={onClose}
    title={title}
    message={message}
    theme="error"
    okText="OK"
    customIcon={customIcon}
  />
);

/**
 * WarningPopup - Uyarı mesajları için kısayol (Kırmızı OK butonu)
 */
export const WarningPopup = ({ show, onClose, title = 'Warning', message, showCancel = false, onCancel, customIcon = null }) => (
  <AlertPopup
    show={show}
    onClose={onClose}
    title={title}
    message={message}
    theme="warning"
    showCancel={showCancel}
    onCancel={onCancel}
    okText="OK"
    customIcon={customIcon}
  />
);

/**
 * InfoPopup - Bilgilendirme için kısayol (Mavi OK butonu)
 */
export const InfoPopup = ({ show, onClose, title = 'Info', message, customIcon = null }) => (
  <AlertPopup
    show={show}
    onClose={onClose}
    title={title}
    message={message}
    theme="info"
    okText="Got it!"
    customIcon={customIcon}
  />
);

/**
 * DeleteConfirmPopup - Silme onayı için özel popup (Kırmızı OK butonu)
 */
export const DeleteConfirmPopup = ({
  show,
  onConfirm,
  onCancel,
  title = 'Delete Confirmation',
  message = 'Are you sure you want to delete this? This action cannot be undone.',
  itemName = '',
  customIcon = null
}) => (
  <ConfirmPopup
    show={show}
    onConfirm={onConfirm}
    onCancel={onCancel}
    title={title}
    message={itemName ? `Are you sure you want to delete "${itemName}"?\nThis action cannot be undone.` : message}
    theme="error"
    confirmTheme="danger"
    confirmText="Delete"
    cancelText="Cancel"
    customIcon={customIcon}
  />
);

/**
 * LockedPopup - Kilitli içerik için özel popup
 */
export const LockedPopup = ({
  show,
  onClose,
  title = '🔒 Locked!',
  message = 'This content is locked.\nAsk your parent to unlock it from the dashboard.'
}) => (
  <AlertPopup
    show={show}
    onClose={onClose}
    title={title}
    message={message}
    theme="warning"
    okText="OK"
  />
);

// ============================================
// CONTEXT API - Global Alert/Confirm Sistemi
// ============================================

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    show: false,
    type: 'alert', // 'alert' | 'confirm'
    title: '',
    message: '',
    theme: 'info',
    showCancel: false,
    okText: 'OK',
    cancelText: 'Cancel',
    confirmText: 'Confirm',
    confirmTheme: null,
    customIcon: null,
    onConfirm: null,
    onCancel: null,
    onClose: null
  });

  // Alert göster (tek buton)
  const showAlert = useCallback((options) => {
    return new Promise((resolve) => {
      setAlertState({
        show: true,
        type: 'alert',
        title: options.title || 'Alert',
        message: options.message || '',
        theme: options.theme || 'info',
        showCancel: options.showCancel || false,
        okText: options.okText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        customIcon: options.customIcon || null,
        onClose: () => {
          setAlertState(prev => ({ ...prev, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setAlertState(prev => ({ ...prev, show: false }));
          resolve(false);
        }
      });
    });
  }, []);

  // Confirm göster (iki buton)
  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setAlertState({
        show: true,
        type: 'confirm',
        title: options.title || 'Confirm',
        message: options.message || '',
        theme: options.theme || 'warning',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        confirmTheme: options.confirmTheme || null,
        customIcon: options.customIcon || null,
        onConfirm: () => {
          setAlertState(prev => ({ ...prev, show: false }));
          resolve(true);
        },
        onCancel: () => {
          setAlertState(prev => ({ ...prev, show: false }));
          resolve(false);
        }
      });
    });
  }, []);

  // Kısayol metodlar
  const alert = {
    success: (message, title = 'Success!', customIcon = null) => showAlert({ message, title, theme: 'success', customIcon }),
    error: (message, title = 'Oops!', customIcon = null) => showAlert({ message, title, theme: 'error', customIcon }),
    warning: (message, title = 'Warning', customIcon = null) => showAlert({ message, title, theme: 'warning', customIcon }),
    info: (message, title = 'Info', customIcon = null) => showAlert({ message, title, theme: 'info', customIcon }),
    locked: (message = 'This content is locked.\nAsk your parent to unlock it.') =>
      showAlert({ message, title: '🔒 Locked!', theme: 'warning' })
  };

  const confirm = {
    delete: (itemName = '', customIcon = null) =>
      showConfirm({
        title: 'Delete Confirmation',
        message: itemName
          ? `Are you sure you want to delete "${itemName}"?\nThis action cannot be undone.`
          : 'Are you sure you want to delete this?\nThis action cannot be undone.',
        theme: 'error',
        confirmTheme: 'danger',
        confirmText: 'Delete',
        customIcon
      }),
    action: (message, title = 'Confirm Action', customIcon = null) =>
      showConfirm({ message, title, theme: 'warning', customIcon }),
    reset: (message = 'Are you sure you want to reset?\nThis action cannot be undone.') =>
      showConfirm({
        message,
        title: 'Reset Confirmation',
        theme: 'warning',
        confirmTheme: 'danger',
        confirmText: 'Reset'
      })
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, alert, confirm }}>
      {children}

      {/* Global Alert Popup */}
      {alertState.show && alertState.type === 'alert' && (
        <AlertPopup
          show={true}
          onClose={alertState.onClose}
          title={alertState.title}
          message={alertState.message}
          theme={alertState.theme}
          showCancel={alertState.showCancel}
          okText={alertState.okText}
          cancelText={alertState.cancelText}
          onCancel={alertState.onCancel}
          customIcon={alertState.customIcon}
        />
      )}

      {/* Global Confirm Popup */}
      {alertState.show && alertState.type === 'confirm' && (
        <ConfirmPopup
          show={true}
          onConfirm={alertState.onConfirm}
          onCancel={alertState.onCancel}
          title={alertState.title}
          message={alertState.message}
          theme={alertState.theme}
          confirmText={alertState.confirmText}
          cancelText={alertState.cancelText}
          confirmTheme={alertState.confirmTheme}
          customIcon={alertState.customIcon}
        />
      )}
    </AlertContext.Provider>
  );
};

/**
 * useAlert Hook - Context'i kullanmak için
 * 
 * Kullanım:
 * const { alert, confirm } = useAlert();
 * 
 * // Alert örnekleri
 * await alert.success('Settings saved!');
 * await alert.error('Something went wrong');
 * await alert.warning('This is a warning');
 * await alert.info('Did you know?');
 * await alert.locked();
 * 
 * // Confirm örnekleri
 * const result = await confirm.delete('Mini Name');
 * if (result) { // kullanıcı onayladı }
 * 
 * const result = await confirm.action('Are you sure?');
 * const result = await confirm.reset();
 */
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export default AlertProvider;