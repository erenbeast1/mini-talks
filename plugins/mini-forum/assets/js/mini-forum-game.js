/**
 * Connect Profile — the browser half.
 *
 * The popup is the site's own LEGO shell (#mf-game-overlay), opened and closed
 * the same way Sign in and Settings are: display flex, fade, Escape and a click
 * on the dim close it. Its three steps — ask, sent, confirm a disconnect — swap
 * inside it, so nothing here ever leaves the profile or falls back to a browser
 * dialog.
 *
 * Every button is bound by its data-mf-action, never by an onclick attribute:
 * this markup lives on the Design page, where wp_kses strips onclick, so a
 * binding written into the HTML would quietly stop working the first time
 * somebody edited the design. Delegated from document, so a card redrawn after
 * a refresh keeps working with no rebinding.
 */
(function ($) {
  'use strict';

  if (typeof mf_game === 'undefined') return;

  var T = mf_game.text || {};

  function card()    { return document.getElementById('mf-game-card'); }
  function overlay() { return document.getElementById('mf-game-overlay'); }
  function panels()  { return document.getElementById('mf-game-panels'); }

  function step(which) {
    var o = overlay();
    if (!o) return;
    o.querySelectorAll('[data-mf-game-step]').forEach(function (el) {
      el.hidden = el.getAttribute('data-mf-game-step') !== which;
    });
  }

  /* A refusal belongs inside the popup, next to the field it is about — printed
     above the page, behind an open popup, it is a message nobody reads. */
  function msg(text, kind, where) {
    var o = overlay();
    if (!o) return;
    var el = o.querySelector('[' + (where || 'data-mf-game-msg') + ']');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'mf-game-msg' + (text && kind ? ' mf-game-msg-' + kind : '');
  }

  function open(which) {
    var o = overlay();
    if (!o) return;
    step(which || 'form');
    msg('', '');
    msg('', '', 'data-mf-game-msg-off');
    $(o).css({ display: 'flex', opacity: 0 }).animate({ opacity: 1 }, 180);
    if (!which || which === 'form') {
      var field = document.getElementById('mf-game-email');
      if (field) setTimeout(function () { field.focus(); }, 200);
    }
  }

  function close() {
    var o = overlay();
    if (!o || o.style.display === 'none') return;
    $(o).animate({ opacity: 0 }, 160, function () { this.style.display = 'none'; });
  }

  function post(action, data, done) {
    $.post(mf_game.url, $.extend({ action: action, nonce: mf_game.nonce }, data || {}))
      .done(function (res) { done(res && res.success ? res : null, res); })
      .fail(function (x) { done(null, x && x.responseJSON); });
  }

  function busy(btn, on, label) {
    if (!btn) return label;
    if (on) { btn.dataset.mfLabel = btn.textContent; btn.disabled = true; btn.textContent = label || T.working; }
    else    { btn.disabled = false; if (btn.dataset.mfLabel) btn.textContent = btn.dataset.mfLabel; }
  }

  /* The card is replaced whole after every action, so its state can never drift
     from the server's. The one-time "Connected." line is dropped at the same
     time: it answers the link that was just opened, not whatever happens next. */
  function replaceCard(data) {
    var c = card();
    if (c && data && typeof data.html === 'string') c.innerHTML = data.html;
    // The detail panels are built in the same pass as the card, so they travel
    // with it; keeping the old ones would open last refresh's numbers.
    if (data && typeof data.panels === 'string') {
      var p = panels();
      if (p && p.parentNode) p.parentNode.removeChild(p);
      if (data.panels) document.body.insertAdjacentHTML('beforeend', data.panels);
    }
    clearNotice();
  }

  /* The green line answers the link that was just opened. It is gone the moment
     anything else happens — a refresh, a disconnect, a detail — because by then
     it is answering a question nobody asked. */
  function clearNotice() {
    document.querySelectorAll('.mf-game-notice').forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
  }

  /* ── send the confirmation link ── */
  function send(btn) {
    var field = document.getElementById('mf-game-email');
    var email = field ? field.value.trim() : '';
    if (!email) { msg(T.needemail, 'bad'); if (field) field.focus(); return; }

    busy(btn, true, T.sending);
    msg('', '');

    post('mf_game_request', { email: email }, function (ok, raw) {
      busy(btn, false);
      if (!ok) { msg((raw && raw.data && raw.data.message) || T.failed, 'bad'); return; }
      var where = overlay() && overlay().querySelector('[data-mf-game-email]');
      if (where) where.textContent = email;
      step('sent');
    });
  }

  /* ── the card's own buttons ── */
  function refresh(btn, quiet) {
    if (!quiet) busy(btn, true, T.working);
    post('mf_game_refresh', {}, function (ok) {
      if (!quiet) busy(btn, false);
      if (ok && ok.data) replaceCard(ok.data);
    });
  }

  function disconnect(btn) {
    busy(btn, true, T.working);
    post('mf_game_disconnect', {}, function (ok, raw) {
      busy(btn, false);
      if (!ok) { msg((raw && raw.data && raw.data.message) || T.failed, 'bad', 'data-mf-game-msg-off'); return; }
      replaceCard(ok.data);
      close();
    });
  }

  /* Copying the game figure across changes the avatar everywhere on the page, so
     every <img> already drawn for this member is repointed at the new file
     rather than leaving the old face on screen until a reload. */
  function useGameAvatar(btn) {
    busy(btn, true, T.working);
    post('mf_game_avatar', {}, function (ok, raw) {
      busy(btn, false);
      if (!ok) { flash(btn, (raw && raw.data && raw.data.message) || T.failed, 'bad'); return; }
      var url = ok.data && ok.data.avatar_url;
      if (url) {
        document.querySelectorAll('.mf-avatar img, .mf-avatar-lg img, .mf-avatar-sm img, .mf-avatar-md img')
          .forEach(function (img) { img.src = url; });
        if (window.mf_ajax && mf_ajax.user) mf_ajax.user.avatar_url = url;
      }
      flash(btn, (ok.data && ok.data.message) || '', 'ok');
    });
  }

  /* A short line under the buttons, rather than an alert() the member has to
     dismiss for something that already worked. */
  function flash(btn, text, kind) {
    if (!text) return;
    var foot = btn && btn.closest ? btn.closest('.mf-game-foot') : null;
    if (!foot) { window.alert(text); return; }
    var el = foot.querySelector('.mf-game-flash');
    if (!el) {
      el = document.createElement('p');
      el.className = 'mf-game-flash mf-game-fine';
      foot.appendChild(el);
    }
    el.textContent = text;
    el.style.color = kind === 'bad' ? '#B91C1C' : '#17512C';
  }

  /* One Mini's detail, moved into the popup: the card carries the headline and
     the popup carries the rest, so a family of three still fits on a screen. */
  function detail(btn) {
    var key = btn && btn.getAttribute('data-value');
    var src = key && panels() ? panels().querySelector('[data-mf-panel-for="' + key + '"]') : null;
    var o   = overlay();
    if (!src || !o) return;
    var body = o.querySelector('[data-mf-detail-body]');
    var name = o.querySelector('[data-mf-detail-name]');
    var sub  = o.querySelector('[data-mf-detail-sub]');
    if (body) body.innerHTML = src.innerHTML;
    if (name) name.textContent = src.getAttribute('data-name') || '';
    if (sub)  { sub.textContent = src.getAttribute('data-sub') || ''; sub.hidden = !sub.textContent; }
    clearNotice();
    open('detail');
  }

  var actions = {
    'game-detail':         function (btn) { detail(btn); },
    'game-open':           function ()    { open('form'); },
    'game-close':          function ()    { close(); },
    'game-send':           function (btn) { send(btn); },
    'game-refresh':        function (btn) { refresh(btn); },
    'game-disconnect':     function ()    { open('off'); },
    'game-disconnect-yes': function (btn) { disconnect(btn); },
    'game-avatar':         function (btn) { useGameAvatar(btn); }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-mf-action]') : null;
    if (!el) {
      if (e.target === overlay()) close();     // the dim around the box
      return;
    }
    var fn = actions[el.getAttribute('data-mf-action')];
    if (!fn) return;
    e.preventDefault();
    fn(el);
  });

  document.addEventListener('keydown', function (e) {
    var o = overlay();
    var isOpen = o && o.style.display !== 'none';
    if (e.key === 'Escape' && isOpen) { close(); return; }
    if (e.key !== 'Enter' || !e.target || e.target.id !== 'mf-game-email') return;
    e.preventDefault();
    send(o ? o.querySelector('[data-mf-action="game-send"]') : null);
  });

  $(function () {
    /* Opening the tab is the moment the numbers matter, so read the game again
       then — in the background, with the card already on screen. */
    document.addEventListener('mf:panel', function (e) {
      if (!e.detail || e.detail.panel !== 'studio') return;
      if (!card() || !card().querySelector('.mf-game-on')) return;
      refresh(null, true);
    });
  });

})(jQuery);
