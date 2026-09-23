/**
 * Mini-Calendar & Mini-Events — the behaviour that comes with the design.
 *
 * Four independent pieces, each one a no-op unless its markup is on the page:
 * the month calendar, the event popup, the special-day popup, and the month /
 * place filters on a list page. That is why one file serves six screens.
 *
 * The calendar reads the events out of the cards the server already rendered,
 * exactly as the design does. There is no second copy of the data and no
 * request: whatever PHP printed into the grid is what the month shows.
 */
(function () {
  'use strict';

  var root = document.getElementById('me-events');
  if (!root) return;

  var MONTHS = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };
  var MONTH_KEYS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  var PALETTE = { workshop:'#E52828', family:'#FFCC00', expert:'#0055BF', updates:'#237841', special:'#FF7417' };
  var LABELS  = { workshop:'Workshop', family:'Family meetup', expert:'Expert session',
                  updates:'Update', special:'Special day' };
  var NS = 'http://www.w3.org/2000/svg';

  function key(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
                           + '-' + String(d.getDate()).padStart(2, '0');
  }
  function badgeDate(badge) {
    if (!badge) return null;
    var m = badge.dataset.month, d = Number(badge.dataset.day), y = Number(badge.dataset.year);
    if (!(m in MONTHS) || !d || !y) return null;
    return new Date(y, MONTHS[m], d);
  }
  function longDate(d) {
    return new Intl.DateTimeFormat('en', { weekday:'long', month:'long', day:'numeric', year:'numeric' }).format(d);
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  /* ── the month calendar ───────────────────────────────────────────── */
  function calendar() {
    var dates = root.querySelector('#me-dates');
    var label = root.querySelector('#me-month');
    if (!dates || !label) return;

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var events = new Map();

    root.querySelectorAll('.me-section').forEach(function (section) {
      section.querySelectorAll('.me-card').forEach(function (card) {
        var when = badgeDate(card.querySelector('.me-date-badge'));
        if (!when) return;
        card.classList.toggle('is-past', when < today);
        card.classList.toggle('is-upcoming', when >= today);
        var title = card.querySelector('h3');
        var list  = events.get(key(when)) || [];
        list.push({ category: section.dataset.kind, title: title ? title.textContent : '' });
        events.set(key(when), list);
      });
    });

    /* Opens on the month the page was rendered for, which the server sets — so
       a member arriving in March does not land on a fixed October. */
    var start = new Date();
    if (dates.dataset.year && dates.dataset.month) {
      start = new Date(Number(dates.dataset.year), Number(dates.dataset.month) - 1, 1);
    }
    var year = start.getFullYear(), month = start.getMonth();

    function monthLabel() {
      return new Intl.DateTimeFormat('en', { month:'long', year:'numeric' }).format(new Date(year, month, 1));
    }

    /* The sections below the calendar follow it: turning to November shows
       November's events, and says so when there are none. */
    function filterCards() {
      root.querySelectorAll('.me-section').forEach(function (section) {
        var visible = 0;
        section.querySelectorAll('.me-card').forEach(function (card) {
          var badge = card.querySelector('.me-date-badge');
          var match = Boolean(badge) && Number(badge.dataset.year) === year
                                     && MONTHS[badge.dataset.month] === month;
          card.hidden = !match;
          if (match) visible++;
        });
        var grid = section.querySelector('.me-grid');
        if (grid) grid.hidden = visible === 0;
        var empty = section.querySelector('.me-month-empty');
        if (!empty) {
          empty = document.createElement('p');
          empty.className = 'me-month-empty';
          empty.setAttribute('role', 'status');
          section.append(empty);
        }
        empty.textContent = 'No events listed for ' + monthLabel() + '.';
        empty.hidden = visible > 0;
      });
    }

    var PLATE = 'M .22 1.7 H 1.35 Q 1.5 1.7 1.5 1.55 V .22 Q 1.5 0 1.72 0 H 6.08 Q 6.3 0 6.3 .22 V 1.55 '
              + 'Q 6.3 1.7 6.45 1.7 H 7.58 Q 7.8 1.7 7.8 1.92 V 4.68 Q 7.8 4.9 7.58 4.9 H .22 Q 0 4.9 0 4.68 V 1.92 Q 0 1.7 .22 1.7 Z';

    function draw() {
      filterCards();
      label.textContent = monthLabel();
      dates.replaceChildren();

      var offset = (new Date(year, month, 1).getDay() + 6) % 7;      // weeks start Monday
      var count  = new Date(year, month + 1, 0).getDate();
      var total  = Math.ceil((offset + count) / 7) * 7;
      var now    = new Date();

      for (var i = 0; i < total; i++) {
        var date  = new Date(year, month, i - offset + 1);
        var list  = events.get(key(date)) || [];
        var kinds = list.map(function (e) { return e.category; })
                        .filter(function (v, ix, a) { return a.indexOf(v) === ix; });

        var cell = document.createElement('div');
        cell.className = 'me-date';
        if (date.getMonth() !== month) cell.classList.add('is-muted');
        if (key(date) === key(now)) { cell.classList.add('is-today'); cell.setAttribute('aria-current', 'date'); }
        if (kinds.length) cell.classList.add('is-event');

        var described = new Intl.DateTimeFormat('en', { dateStyle:'full' }).format(date)
          + (key(date) === key(now) ? ' · Today' : '')
          + list.map(function (e) { return ' · ' + (LABELS[e.category] || 'Event') + ': ' + e.title; }).join('');
        cell.setAttribute('role', 'img');
        cell.setAttribute('aria-label', described);
        cell.title = described;

        var svg = svgEl('svg', { viewBox:'-0.4 -0.4 8.6 5.7', 'aria-hidden':'true', focusable:'false' });
        if (kinds.length) cell.style.setProperty('--day-fill', PALETTE[kinds[0]] || PALETTE.special);
        svg.append(svgEl('path', { 'class':'me-day-shape', d: PLATE }));

        /* Two kinds on one day nest one whole plate inside the other, never
           split the square in half — a half-brick is not a brick. */
        kinds.slice(1).forEach(function (kind, index) {
          var scale = 1 - 0.26 * (index + 1) / (kinds.length - 1);
          var inner = svgEl('path', { 'class':'me-day-shape', d: PLATE, fill: PALETTE[kind] || PALETTE.special });
          inner.setAttribute('transform', 'translate(' + (3.9 * (1 - scale)) + ',' + (2.45 * (1 - scale)) + ') scale(' + scale + ')');
          svg.append(inner);
        });

        var number = svgEl('text', { x:'3.9', y:'3.45', 'text-anchor':'middle', 'dominant-baseline':'middle' });
        number.textContent = date.getDate();
        svg.append(number);
        cell.append(svg);
        dates.append(cell);
      }
    }

    root.querySelectorAll('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = new Date(year, month + Number(b.dataset.step), 1);
        year = d.getFullYear(); month = d.getMonth();
        draw();
      });
    });
    draw();
  }

  /* ── the event popup ──────────────────────────────────────────────── */
  function eventDialog() {
    var dialog = root.querySelector('.me-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    var opener;

    root.querySelectorAll('[data-detail]').forEach(function (b) {
      b.addEventListener('click', function () {
        opener = b;
        var card    = b.closest('article');
        var section = card.closest('.me-section');
        var full    = card.querySelector('.me-full-details');
        var badge   = card.querySelector('.me-date-badge');
        var kind    = section ? section.dataset.kind : '';

        dialog.querySelector('h2').textContent = b.dataset.detail;
        dialog.style.setProperty('--popup-color', PALETTE[kind] || PALETTE.workshop);
        dialog.style.setProperty('--popup-ink', kind === 'family' ? '#1D1D1B' : '#fff');

        var when = badgeDate(badge);
        var dateLine = dialog.querySelector('.me-popup-date span');
        if (dateLine) dateLine.textContent = when ? longDate(when) : '';

        var meta = card.querySelector('.me-meta');
        var status = card.querySelector('.me-status');
        var metaLine = dialog.querySelector('.me-popup-meta');
        if (metaLine) {
          metaLine.textContent = [meta && meta.textContent, status && status.textContent]
            .filter(Boolean).join(' · ');
        }

        var detail = dialog.querySelector('.me-detail-copy');
        detail.replaceChildren();
        if (full) {
          Array.from(full.children).forEach(function (p) { detail.append(p.cloneNode(true)); });
        } else {
          var desc = card.querySelector('.me-desc');
          detail.textContent = desc ? desc.textContent : '';
        }

        /* A card may carry its own picture and speaker; the popup shows them
           when they exist and stays out of the way when they do not. */
        var art = dialog.querySelector('.mw-popup-art');
        if (art) {
          var src = card.dataset.image || '';
          var img = art.querySelector('img');
          if (src && img) { img.src = src; art.hidden = false; } else { art.hidden = true; }
        }
        var sub = dialog.querySelector('.mw-popup-subtitle');
        if (sub) {
          sub.textContent = card.dataset.subtitle || '';
          sub.hidden = !sub.textContent;
        }

        dialog.showModal();
      });
    });
    dialog.addEventListener('close', function () { if (opener) opener.focus(); });
  }

  /* ── the special-day popup ────────────────────────────────────────── */
  function specialDialog() {
    var dialog = root.querySelector('.me-special-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    var opener;

    root.querySelectorAll('.me-special-trigger').forEach(function (button) {
      button.addEventListener('click', function () {
        opener = button;
        var when = badgeDate(button.querySelector('.me-date-badge'));
        var title = button.querySelector('h3');
        dialog.querySelector('h2').textContent = title ? title.textContent : '';
        var dateLine = dialog.querySelector('.me-special-date span');
        if (dateLine) dateLine.textContent = when ? longDate(when) : '';

        /* The words come from the card the server rendered, not from a table in
           this file: a special day's text is edited in wp-admin. */
        var body = dialog.querySelector('.me-special-description');
        body.replaceChildren();
        var storyEl = button.querySelector('.me-special-story');
        if (storyEl && storyEl.children.length) {
          Array.from(storyEl.children).forEach(function (p) { body.append(p.cloneNode(true)); });
        } else {
          var desc = button.querySelector('.me-desc');
          var p = document.createElement('p');
          p.textContent = desc ? desc.textContent : '';
          body.append(p);
        }
        dialog.showModal();
      });
    });

    var close = dialog.querySelector('.me-special-close');
    if (close) close.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('close', function () { if (opener) opener.focus(); });
  }

  /* ── month and place filters, on a list page ──────────────────────── */
  function filters() {
    var upcoming = root.querySelector('#mw-upcoming-grid');
    var past     = root.querySelector('#mw-past-grid');
    var toggle   = root.querySelector('#mw-month-toggle');
    var options  = root.querySelector('#mw-month-options');
    if (!upcoming || !past) return;

    /* Read once, from both grids: the server may have put a completed event in
       either, and moving cards between them is this function's job. */
    var cards = Array.from(root.querySelectorAll('.me-card'));
    var month = 'all', place = 'all';

    function apply() {
      var up = 0, done = 0;
      cards.forEach(function (card) {
        var badge = card.querySelector('.me-date-badge');
        var metaEl = card.querySelector('.me-meta');
        var meta = metaEl ? metaEl.textContent : '';
        var stamp = badge ? badge.dataset.year + '-' +
          String(MONTH_KEYS.indexOf(badge.dataset.month) + 1).padStart(2, '0') : '';
        var statusEl = card.querySelector('.me-status');
        var completed = Boolean(statusEl) && statusEl.textContent.trim() === 'Completed';
        var match = (month === 'all' || stamp === month) && (place === 'all' || meta.indexOf(place) !== -1);

        (completed ? past : upcoming).append(card);
        card.hidden = !match;
        if (match) { completed ? done++ : up++; }
      });
      upcoming.hidden = !up;
      past.hidden = !done;
      var ue = root.querySelector('#mw-upcoming-empty'); if (ue) ue.hidden = up > 0;
      var pe = root.querySelector('#mw-past-empty');     if (pe) pe.hidden = done > 0;
      var hist = root.querySelector('.mw-history');      if (hist) hist.hidden = !done;
    }

    if (toggle && options) {
      var closeMonths = function () {
        options.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      };
      toggle.addEventListener('click', function () {
        options.hidden = !options.hidden;
        toggle.setAttribute('aria-expanded', String(!options.hidden));
      });
      options.querySelectorAll('[data-month]').forEach(function (button) {
        button.addEventListener('click', function () {
          month = button.dataset.month;
          var caption = toggle.querySelector('span');
          if (caption) caption.textContent = month === 'all' ? 'Month Selection' : button.textContent;
          options.querySelectorAll('[data-month]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b === button));
          });
          closeMonths(); toggle.focus(); apply();
        });
      });
      document.addEventListener('click', function (e) {
        if (!e.target.closest('.mw-month-wrap')) closeMonths();
      });
      root.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !options.hidden) { closeMonths(); toggle.focus(); }
      });
    }

    root.querySelectorAll('[data-location]').forEach(function (button) {
      button.addEventListener('click', function () {
        place = button.dataset.location;
        root.querySelectorAll('[data-location]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === button));
        });
        apply();
      });
    });

    apply();
  }

  calendar();
  eventDialog();
  specialDialog();
  filters();
})();
