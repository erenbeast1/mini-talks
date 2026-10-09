// src/components/popups/EmailPopups.jsx
import React, { useState } from 'react';

// LEGO head görseli
import legoHead from '../../assets/5.png';

// Butonlar
import okBtn from '../../assets/Ok_Buton.png';
import okBtnHover from '../../assets/Ok_Buton_Hover.png';

/**
 * "Check your email" popup - Tüm roller için
 */
export const CheckEmailPopup = ({ show, onClose, email }) => {
  const [okHover, setOkHover] = useState(false);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div style={{ margin: '0 16px' }}>
        <div
          style={{
            backgroundColor: '#237841',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Green Header */}
          <div
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <h2
              style={{
                color: '#ffffff',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '28px',
                fontWeight: 900,
                margin: 0
              }}
            >
              Check Your Email!
            </h2>
          </div>

          {/* White content area */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              margin: '0 6px 6px 6px',
              padding: '10px 6px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0px'
            }}
          >
            {/* LEGO Head */}
            <img 
              src={legoHead} 
              alt="LEGO Character" 
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                flexShrink: 0
              }}
            />

            {/* Right side content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <p
                style={{
                  color: '#000000',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '18px',
                  fontWeight: 500,
                  textAlign: 'center',
                  marginBottom: '4px',
                  lineHeight: '1.4',
                  whiteSpace: 'nowrap'
                }}
              >
                We've sent a verification link to:
              </p>
              <p
                style={{
                  color: '#0055BF',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '16px',
                  fontWeight: 700,
                  textAlign: 'center',
                  marginBottom: '12px',
                  wordBreak: 'break-all'
                }}
              >
                {email}
              </p>

              {/* OK Button */}
              <button
                type="button"
                onClick={onClose}
                onMouseEnter={() => setOkHover(true)}
                onMouseLeave={() => setOkHover(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer'
                }}
                className="transition-transform hover:scale-105"
              >
                <img 
                  src={okHover ? okBtnHover : okBtn}
                  alt="OK"
                  style={{ height: '50px', width: 'auto' }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * "Parent invitation sent" popup - Child kayıt olduğunda
 */
export const ParentInvitationSentPopup = ({ show, onClose, parentEmail, childName }) => {
  const [okHover, setOkHover] = useState(false);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div style={{ margin: '0 16px' }}>
        <div
          style={{
            backgroundColor: '#237841',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Green Header */}
          <div
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <h2
              style={{
                color: '#ffffff',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '28px',
                fontWeight: 900,
                margin: 0
              }}
            >
              Parent Invitation Sent!
            </h2>
          </div>

          {/* White content area */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              margin: '0 6px 6px 6px',
              padding: '10px 6px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0px'
            }}
          >
            {/* LEGO Head */}
            <img 
              src={legoHead} 
              alt="LEGO Character" 
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                flexShrink: 0
              }}
            />

            {/* Right side content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <p
                style={{
                  color: '#000000',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '18px',
                  fontWeight: 500,
                  textAlign: 'center',
                  marginBottom: '16px',
                  lineHeight: '1.4',
                  whiteSpace: 'nowrap'
                }}
              >
                You can start exploring after your parent<br />
                approves your Mini-Talks account.
              </p>

              {/* OK Button */}
              <button
                type="button"
                onClick={onClose}
                onMouseEnter={() => setOkHover(true)}
                onMouseLeave={() => setOkHover(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer'
                }}
                className="transition-transform hover:scale-105"
              >
                <img 
                  src={okHover ? okBtnHover : okBtn}
                  alt="OK"
                  style={{ height: '50px', width: 'auto' }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * "Request Sent!" popup - Expert approval request
 */
export const RequestSentPopup = ({ show, onClose }) => {
  const [okHover, setOkHover] = useState(false);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div style={{ margin: '0 16px' }}>
        <div
          style={{
            backgroundColor: '#237841',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Green Header */}
          <div
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <h2
              style={{
                color: '#ffffff',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '28px',
                fontWeight: 900,
                margin: 0
              }}
            >
              Request Sent!
            </h2>
          </div>

          {/* White content area */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              margin: '0 6px 6px 6px',
              padding: '10px 6px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0px'
            }}
          >
            {/* LEGO Head */}
            <img 
              src={legoHead} 
              alt="LEGO Character" 
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                flexShrink: 0
              }}
            />

            {/* Right side content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <p
                style={{
                  color: '#000000',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '18px',
                  fontWeight: 500,
                  textAlign: 'center',
                  marginBottom: '16px',
                  lineHeight: '1.4',
                  whiteSpace: 'nowrap'
                }}
              >
                Your request has been sent successfully.<br />
                You'll be notified when it's approved.
              </p>

              {/* OK Button */}
              <button
                type="button"
                onClick={onClose}
                onMouseEnter={() => setOkHover(true)}
                onMouseLeave={() => setOkHover(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer'
                }}
                className="transition-transform hover:scale-105"
              >
                <img 
                  src={okHover ? okBtnHover : okBtn}
                  alt="OK"
                  style={{ height: '50px', width: 'auto' }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Error popup - Genel hata mesajları için
 */
export const ErrorPopup = ({ show, onClose, message, title = 'Oops!' }) => {
  const [okHover, setOkHover] = useState(false);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div style={{ margin: '0 16px' }}>
        <div
          style={{
            backgroundColor: '#E31E24',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '4px 4px 50px 10px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Red Header */}
          <div
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <h2
              style={{
                color: '#ffffff',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '28px',
                fontWeight: 900,
                margin: 0
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
              padding: '10px 6px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0px'
            }}
          >
            {/* LEGO Head */}
            <img 
              src={legoHead} 
              alt="LEGO Character" 
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'contain',
                flexShrink: 0
              }}
            />

            {/* Right side content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <p
                style={{
                  color: '#000000',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '18px',
                  fontWeight: 500,
                  textAlign: 'center',
                  marginBottom: '16px',
                  lineHeight: '1.4',
                  whiteSpace: 'nowrap'
                }}
              >
                {message || 'An error occurred. Please try again.'}
              </p>

              {/* OK Button */}
              <button
                type="button"
                onClick={onClose}
                onMouseEnter={() => setOkHover(true)}
                onMouseLeave={() => setOkHover(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer'
                }}
                className="transition-transform hover:scale-105"
              >
                <img 
                  src={okHover ? okBtnHover : okBtn}
                  alt="OK"
                  style={{ height: '50px', width: 'auto' }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};