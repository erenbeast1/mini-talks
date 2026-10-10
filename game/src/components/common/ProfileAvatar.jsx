// src/components/common/ProfileAvatar.jsx
//
// A profile's picture, wherever one is shown: the My Mini(s) cards, the
// dashboard panels, the header pill. Reads through the shared avatar cache, so
// every one of them changes the moment an avatar is saved anywhere in the app.
//
//   <ProfileAvatar role="mini" id={mini.mini_id} size={30} alt={mini.mini_name} />
//
// Until a profile has made an avatar it shows the LEGO-head placeholder at
// `size`, sitting inside whatever ring the caller drew. Once there is one it
// fills that ring instead — the same rule the existing profile screens use.

import React from 'react';
import { useAvatar } from '../../hooks/useAvatar';
import profileIcon from '../../assets/profile-icon.png';

const ProfileAvatar = ({
  role = 'mini',
  id,
  size = 30,
  alt = '',
  rounded = true,
  style = {},
  className,
}) => {
  const { avatarUrl, checked } = useAvatar(role, id);
  const px = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={avatarUrl || profileIcon}
      alt={alt}
      className={className}
      style={{
        width: avatarUrl ? '100%' : px,
        height: avatarUrl ? '100%' : px,
        objectFit: avatarUrl ? 'cover' : 'contain',
        // The rings around these are drawn as round divs with no overflow
        // clipping, so the picture has to round its own corners.
        borderRadius: avatarUrl && rounded ? '50%' : 0,
        // Fade in rather than flashing the placeholder first.
        opacity: checked ? 1 : 0,
        transition: 'opacity 0.25s ease',
        ...style,
      }}
    />
  );
};

export default ProfileAvatar;
