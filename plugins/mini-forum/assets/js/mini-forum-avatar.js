/**
 * Mini-Forum Avatar — frontend JS (v3.00 — gender removed)
 *
 * Responsibilities:
 *  - Wire up "Customize Avatar" buttons to open the editor popup directly
 *  - Build the editor popup shell (React mounts inside it)
 *  - Reload all on-page avatar imgs after a save
 *  - Provide mfShowConfirm/mfShowAlert helpers (replacement for native dialogs)
 *
 * Public API (window.MFAvatar):
 *  - open()                    open editor popup
 *  - close()                   close editor popup
 *  - reload(newUrl, version)   refresh all avatar imgs on the page after a save
 */
(function ($) {
  'use strict';

  if (typeof window.mf_ajax === 'undefined') return;

  // ────────────────────────────────────────────────────────────────────────
  // Custom confirm / alert modals — replacements for window.confirm/alert
  // Sit ABOVE the avatar popup (z 100001+). Sign-in popup styling.
  // ────────────────────────────────────────────────────────────────────────

  function mfShowConfirm(opts) {
    opts = opts || {};
    $('.mf-confirm-overlay').remove();

    var html =
      '<div class="mf-confirm-overlay">' +
        '<div class="mf-confirm-wrapper">' +
          '<div class="mf-confirm-studs" aria-hidden="true"></div>' +
          '<div class="mf-confirm-modal">' +
            '<div class="mf-confirm-inner">' +
              '<h3 class="mf-confirm-title">' + (opts.title || 'Are you sure?') + '</h3>' +
              '<p class="mf-confirm-message">' + (opts.message || '') + '</p>' +
              '<div class="mf-confirm-actions">' +
                '<button type="button" class="mf-confirm-btn mf-confirm-cancel">' + (opts.cancelText || 'Cancel') + '</button>' +
                '<button type="button" class="mf-confirm-btn mf-confirm-ok ' + (opts.confirmStyle === 'danger' ? 'is-danger' : '') + '">' + (opts.confirmText || 'OK') + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var $modal = $(html).appendTo('body');

    function close(callback) {
      $modal.remove();
      $(document).off('keydown.mfConfirm');
      if (typeof callback === 'function') callback();
    }

    $modal.on('click', '.mf-confirm-cancel', function () { close(opts.onCancel); });
    $modal.on('click', '.mf-confirm-ok',     function () { close(opts.onConfirm); });
    $modal.on('click', function (e) {
      if (e.target === this) close(opts.onCancel);
    });
    $(document).on('keydown.mfConfirm', function (e) {
      if (e.key === 'Escape') close(opts.onCancel);
      if (e.key === 'Enter')  close(opts.onConfirm);
    });
  }

  function mfShowAlert(message, title) {
    mfShowConfirm({
      title: title || 'Notice',
      message: message,
      confirmText: 'OK',
      onConfirm: function () {}
    });
    $('.mf-confirm-cancel').last().hide();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Editor popup shell — React mounts inside .mf-avatar-popup-body
  // Pattern matches sign-in popup: studs strip + red modal + white inner.
  // ────────────────────────────────────────────────────────────────────────

  var $popup = null;

  function buildPopup() {
    if ($popup) return;
    var html =
      '<div class="mf-avatar-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="mf-av-popup-title">' +
        '<div class="mf-avatar-popup-wrapper">' +
          '<div class="mf-avatar-popup-studs" aria-hidden="true"></div>' +
          '<div class="mf-avatar-popup-modal">' +
            '<div class="mf-avatar-popup-inner">' +
              '<div class="mf-avatar-popup-header">' +
                '<h2 id="mf-av-popup-title">Customize Your Mini</h2>' +
                '<div class="mf-avatar-popup-header-actions">' +
                  '<button type="button" class="mf-avatar-popup-close" aria-label="Close">\u2715</button>' +
                '</div>' +
              '</div>' +
              '<div class="mf-avatar-popup-body" id="mf-avatar-editor-root"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    $popup = $(html).appendTo('body');
    $popup.on('click', '.mf-avatar-popup-close', closePopup);
    $popup.on('click', function (e) {
      if (e.target === this) closePopup();
    });
    $(document).on('keydown.mfAvatar', function (e) {
      if (e.key === 'Escape' && $popup && $popup.hasClass('is-open')) closePopup();
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // React editor mount/unmount
  // ────────────────────────────────────────────────────────────────────────

  function mountEditor() {
    var rootEl = document.getElementById('mf-avatar-editor-root');
    if (!rootEl) return;
    if (!window.MFAvatarEditor || typeof window.MFAvatarEditor.mount !== 'function') {
      rootEl.innerHTML =
        '<div class="mf-avatar-popup-coming-soon">' +
          '<h3>Editor not loaded</h3>' +
          '<p>The avatar editor bundle is missing or failed to load.</p>' +
        '</div>';
      return;
    }
    // mf_avatar_editor is a separate localize-script global (mini-forum.php
    // registers it on `mf-avatar-editor` handle). Contains GLB asset paths
    // resolved server-side. Without it, all GLB/PNG URLs would be relative,
    // which 404s on the WordPress origin.
    var cfg = window.mf_avatar_editor || {};
    window.MFAvatarEditor.mount(rootEl, {
      glbBase:       cfg.glb_base       || '',
      bodyGlbUrl:    cfg.body_glb_url   || null,
      initialConfig: cfg.initial_config || null,
      ajaxUrl:       window.mf_ajax.url,
      nonce:         window.mf_ajax.nonce,
      torsoId:       cfg.torso_id       || '02_red',
      role:          cfg.role           || 'Family',
      onSaveSuccess: function (data) {
        // PHP sends {url, version, config} — not avatar_url. Match the keys.
        var newUrl = data && (data.url || data.avatar_url);
        window.MFAvatar.reload(newUrl, data && data.version);
        closePopup();
      },
      onClose: closePopup,
    });
  }

  function unmountEditor() {
    var rootEl = document.getElementById('mf-avatar-editor-root');
    if (rootEl && window.MFAvatarEditor && typeof window.MFAvatarEditor.unmount === 'function') {
      window.MFAvatarEditor.unmount(rootEl);
    }
  }

  function openPopup() {
    buildPopup();
    $popup.addClass('is-open');
    document.body.style.overflow = 'hidden';
    mountEditor();
  }

  function closePopup() {
    if (!$popup) return;
    unmountEditor();
    $popup.removeClass('is-open');
    document.body.style.overflow = '';
  }

  // ────────────────────────────────────────────────────────────────────────
  // Avatar reload — swap src on every .mf-av img after save
  // ────────────────────────────────────────────────────────────────────────

  function reloadAvatars(newUrl, version) {
    if (!newUrl) return;
    var bust = '?v=' + (version || Date.now());
    $('img.mf-av').each(function () {
      var $img = $(this);
      var src = $img.attr('src') || '';
      // Match avatars belonging to current user only (URL contains user_{ID})
      var uid = window.mf_ajax.user_id || (window.mf_ajax.user && window.mf_ajax.user.id);
      if (!uid) {
        // Fallback — reload every avatar
        $img.attr('src', newUrl + bust);
        return;
      }
      if (src.indexOf('user_' + uid + '_') !== -1 || src.indexOf('mf-avatars') !== -1) {
        $img.attr('src', newUrl + bust);
      }
    });
    // Also update header avatar refs
    if (window.mf_ajax.user) {
      window.mf_ajax.user.avatar_url = newUrl;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Wire up edit buttons + click targets
  // ────────────────────────────────────────────────────────────────────────

  $(document).on('click', '.mf-av-edit-btn', function (e) {
    e.preventDefault();
    openPopup();
  });
  $(document).on('click', '.mf-av-editable', function (e) {
    // Don't double-fire if user clicked the edit button inside the avatar
    if ($(e.target).closest('.mf-av-edit-btn').length) return;
    e.preventDefault();
    openPopup();
  });
  $(document).on('keydown', '.mf-av-editable', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPopup();
    }
  });

  // Public API
  window.MFAvatar = {
    open:    openPopup,
    close:   closePopup,
    reload:  reloadAvatars,
    confirm: mfShowConfirm,
    alert:   mfShowAlert,
  };

})(jQuery);
