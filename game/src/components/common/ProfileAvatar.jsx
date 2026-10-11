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
import { avatarImageStyle } from '../../utils/avatars';
import profileIcon from '../../assets/profile-icon.png';

const ProfileAvatar = ({
  role = 'mini',
  id,
  size = 30,
  alt = '',
  style = {},
  className,
}) => {
  const { avatarUrl, checked } = useAvatar(role, id);

  const img = (
    <img
      src={avatarUrl || profileIcon}
      alt={alt}
      className={className}
      style={{
        // One rule for how a saved avatar is framed, in utils/avatars.js.
        ...avatarImageStyle(avatarUrl, size),
        // Fade in rather than flashing the placeholder first.
        opacity: checked ? 1 : 0,
        transition: 'opacity 0.25s ease',
        ...style,
      }}
    />
  );

  // The framing zooms slightly, so it has to be clipped or it spills out of
  // whatever ring the caller drew. The wrapper inherits that ring's radius, so
  // a round badge stays round and a rounded square stays square.
  if (!avatarUrl) return img;
  return (
    <span
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    >
      {img}
    </span>
  );
};

export default ProfileAvatar;
