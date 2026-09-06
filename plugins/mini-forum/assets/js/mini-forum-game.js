/**
 * Connect Profile — the browser half.
 *
 * Every button is bound by its data-mf-action, never by an onclick attribute:
 * the markup for this card lives on the Design page, where wp_kses strips
 * onclick, so a binding written into the HTML would silently stop working the
 * first time somebody edited the design. Delegated from document, so a card
 * redrawn after a refresh or a disconnect keeps working with no rebinding.
 */
(function ($) {
  'use strict';

  if (typeof mf_game === 'undefined') return;

  var T = mf_game.text || {};

  function card()  { return document.getElementById('mf-game-card'); }
  function pop()   { return document.getElementById('mf-game-pop'); }

  function step(which) {
    var p = pop();
    if (!p) return;
    p.querySelectorAll('[data-mf-game-step]').forEach(function (el) {
      el.hidden = el.getAttribute('data-mf-game-step') !== which;
    });
  }

  /* Refusals belong inside the popup, next to the field they are about — a
     message printed above the page, behind an open popup, is a message nobody
     reads. */
  function msg(text, kind) {
    var p = pop();
    if (!p) return;
    var el = p.querySelector('[data-mf-game-msg]');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'mf-game-msg' + (text && kind ? ' mf-game-msg-' + kind : '');
  }

  function open() {
    var p = pop();
    if (!p) return;
    step('form');
    msg('', '');
    p.hidden = false;
    document.body.classList.add('mf-game-open');
    var field = document.getElementById('mf-game-email');
    if (field) { field.value = field.value || ''; field.focus(); }
  }

  function close() {
    var p = pop();
    if (!p) return;
    p.hidden = true;
    document.body.classList.remove('mf-game-open');
  }

  function post(action, data, done) {
    $.post(mf_game.url, $.extend({ action: action, nonce: mf_game.nonce }, data || {}))
      .done(function (res) { done(res && res.success ? res : null, res); })
      .fail(function () { done(null, null); });
  }

  /* ── send the confirmation link ── */
  function send(btn) {
    var field = document.getElementById('mf-game-email');
    var email = field ? field.value.trim() : '';
    if (!email) { msg(T.failed || '', 'bad'); if (field) field.focus(); return; }

    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = T.sending || 'Sending…'; }
    msg('', '');

    post('mf_game_request', { email: email }, function (ok, raw) {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      if (!ok) {
        msg((raw && raw.data && raw.data.message) || T.failed, 'bad');
        return;
      }
      var where = pop() && pop().querySelector('[data-mf-game-email]');
      if (where) where.textContent = email;
      step('sent');
    });
  }

  /* ── the card's own buttons ── */
  function replaceCard(html) {
    var c = card();
    if (c && typeof html === 'string') c.innerHTML = html;
  }

  function refresh(btn) {
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = T.working || 'One moment…'; }
    post('mf_game_refresh', {}, function (ok) {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      if (ok && ok.data) replaceCard(ok.data.html);
    });
  }

  function disconnect(btn) {
    if (!window.confirm(T.confirm || 'Disconnect?')) return;
    if (btn) btn.disabled = true;
    post('mf_game_disconnect', {}, function (ok) {
      if (btn) btn.disabled = false;
      if (ok && ok.data) replaceCard(ok.data.html);
    });
  }

  /* Copying the game figure across changes the avatar everywhere on the page,
     so every <img> already drawn for this member is repointed at the new file
     rather than leaving the old face on screen until a reload. */
  function useGameAvatar(btn) {
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = T.working || 'One moment…'; }
    post('mf_game_avatar', {}, function (ok, raw) {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      if (!ok) { window.alert((raw && raw.data && raw.data.message) || T.failed); return; }
      var url = ok.data && ok.data.avatar_url;
      if (url) {
        document.querySelectorAll('.mf-avatar img, .mf-avatar-lg img, .mf-avatar-sm img, .mf-avatar-md img')
          .forEach(function (img) { img.src = url; });
        if (window.mf_ajax && mf_ajax.user) mf_ajax.user.avatar_url = url;
      }
      if (ok.data && ok.data.message) window.alert(ok.data.message);
    });
  }

  var actions = {
    'game-open':       function ()    { open(); },
    'game-close':      function ()    { close(); },
    'game-send':       function (btn) { send(btn); },
    'game-refresh':    function (btn) { refresh(btn); },
    'game-disconnect': function (btn) { disconnect(btn); },
    'game-avatar':     function (btn) { useGameAvatar(btn); }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-mf-action]') : null;
    if (!el) {
      // Clicking the dimmed area around the box closes it.
      if (e.target === pop()) close();
      return;
    }
    var fn = actions[el.getAttribute('data-mf-action')];
    if (!fn) return;
    e.preventDefault();
    fn(el);
  });

  // Enter in the address field sends, the way it would in any other form.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pop() && !pop().hidden) { close(); return; }
    if (e.key !== 'Enter') return;
    if (!e.target || e.target.id !== 'mf-game-email') return;
    e.preventDefault();
    var btn = pop() ? pop().querySelector('[data-mf-action="game-send"]') : null;
    send(btn);
  });

})(jQuery);
