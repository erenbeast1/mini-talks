/**
 * Mini-Forum Profile — tab switching + Settings popup.
 *
 * Tabs are declared in forum-profile.php with data-mf-panel="<key>"; each
 * panel is a .mf-profile-panel with the matching data-mf-panel-id. Plugins
 * that add their own panel (Mini-Devices) render inside the Mini-Kits panel
 * via the mf_profile_kits_panel action, so they need no tab logic of their own.
 */
(function ($) {
  'use strict';

  /* ─────────────────────────── tabs ─────────────────────────── */

  var TAB_SEL   = '.mf-profile-tab[data-mf-panel]';
  var PANEL_SEL = '.mf-profile-panel[data-mf-panel-id]';

  function panels()  { return document.querySelectorAll(PANEL_SEL); }
  function tabs()    { return document.querySelectorAll(TAB_SEL); }

  function activate(key, push) {
    var found = false;

    panels().forEach(function (p) {
      var on = p.getAttribute('data-mf-panel-id') === key;
      p.hidden = !on;
      if (on) found = true;
    });
    if (!found) return false;

    tabs().forEach(function (t) {
      var on = t.getAttribute('data-mf-panel') === key;
      t.classList.toggle('mf-tab-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    // Let a panel's owner know it became visible (devices refreshes on show).
    document.dispatchEvent(new CustomEvent('mf:panel', { detail: { panel: key } }));

    if (push && window.history && history.replaceState) {
      history.replaceState(null, '', '#' + key);
    }
    return true;
  }

  window.mfShowProfilePanel = function (key) { return activate(key, true); };

  function initTabs() {
    if (!document.querySelector(PANEL_SEL)) return;

    tabs().forEach(function (t) {
      t.addEventListener('click', function (e) {
        e.preventDefault();
        activate(t.getAttribute('data-mf-panel'), true);
      });
    });

    // #kits in the URL opens that panel directly; otherwise the first tab wins.
    var hash = (location.hash || '').replace('#', '');
    if (!hash || !activate(hash, false)) {
      var first = document.querySelector(TAB_SEL);
      if (first) activate(first.getAttribute('data-mf-panel'), false);
    }
  }

  /* ───────────────────────── settings ───────────────────────── */

  function msg(text, kind) {
    var $m = $('#mf-settings-msg');
    if (!text) { $m.hide(); return; }
    $m.text(text).attr('class', 'mf-settings-msg mf-settings-msg-' + kind).show();
  }

  function clearFields() {
    $('#mf-set-current, #mf-set-new, #mf-set-new2').val('');
    $('#mf-pwd-meter').removeAttr('data-level');
  }

  window.mfOpenSettings = function () {
    if (!document.getElementById('mf-settings-overlay')) return;
    msg('');
    clearFields();
    $('#mf-settings-overlay').css({ display: 'flex', opacity: 0 }).animate({ opacity: 1 }, 200);
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#mf-set-current').trigger('focus'); }, 220);
  };

  window.mfCloseSettings = function () {
    $('#mf-settings-overlay').animate({ opacity: 0 }, 200, function () {
      $(this).css('display', 'none');
    });
    document.body.style.overflow = '';
  };

  /* Rough strength read — length plus character variety, 0-3. */
  function strength(pw) {
    if (pw.length < 8) return 0;
    var variety = 0;
    if (/[a-z]/.test(pw)) variety++;
    if (/[A-Z]/.test(pw)) variety++;
    if (/[0-9]/.test(pw)) variety++;
    if (/[^A-Za-z0-9]/.test(pw)) variety++;
    if (pw.length >= 12 && variety >= 3) return 3;
    if (variety >= 3 || pw.length >= 12) return 2;
    return 1;
  }

  window.mfSubmitPassword = function () {
    var cur  = $('#mf-set-current').val(),
        pw   = $('#mf-set-new').val(),
        pw2  = $('#mf-set-new2').val();

    if (!cur || !pw || !pw2)      return msg('Please fill in all three fields.', 'err');
    if (pw.length < 8)            return msg('New password must be at least 8 characters.', 'err');
    if (pw !== pw2)               return msg('New passwords do not match.', 'err');
    if (pw === cur)               return msg('The new password must be different from the current one.', 'err');

    var $btn = $('#mf-set-save'), label = $btn.text();
    $btn.prop('disabled', true).text('Updating...').css('opacity', .6);
    msg('');

    $.post(mf_ajax.url, {
      action: 'mf_change_password',
      nonce: mf_ajax.nonce,
      current_password: cur,
      new_password: pw
    }, function (res) {
      $btn.prop('disabled', false).text(label).css('opacity', 1);
      if (res && res.success) {
        clearFields();
        msg('Password updated. You are still signed in on this device.', 'ok');
      } else {
        msg((res && res.data && res.data.message) || 'Something went wrong.', 'err');
      }
    }).fail(function () {
      $btn.prop('disabled', false).text(label).css('opacity', 1);
      msg('Something went wrong. Please try again.', 'err');
    });
  };

  /* ───────────────────────── wiring ───────────────────────── */

  $(function () {
    initTabs();

    $(document).on('click', '#mf-settings-overlay', function (e) {
      if (e.target === this) mfCloseSettings();
    });
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape' && $('#mf-settings-overlay').is(':visible')) mfCloseSettings();
    });
    $(document).on('keydown', '#mf-set-new2', function (e) {
      if (e.key === 'Enter') mfSubmitPassword();
    });
    $(document).on('input', '#mf-set-new', function () {
      $('#mf-pwd-meter').attr('data-level', strength(this.value));
    });
  });
})(jQuery);
