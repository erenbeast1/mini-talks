/* ==========================================================================
   Mini Devices — Connected Devices
   Cihaza USB (WebSerial) ile baglanir, istatistikleri ceker, kayitlari WAV
   olarak indirir. Cihaz protokolu: satir basina bir JSON.
     ->  {"cmd":"hello"}                 <- {"dev":"F","fw":"1.1","slots":5}
     ->  {"cmd":"time","epoch":...}      <- {"ok":1}
     ->  {"cmd":"stats"}                 <- {"total_s":..,"slots":[...]}
     ->  {"cmd":"dump","slot":1}         <- baslik + ornek akisi + EOF
   ========================================================================== */

(function () {
  'use strict';

  var DEV_LABEL = { F: 'Fig-Talks', B: 'Display-Talks', D: 'Design-Talks' };
  var liveDev = null, liveType = null;   // kit currently held open over serial
  var SR = 16000;

  var port = null, reader = null, writer = null;
  var lineBuf = '';
  var waiters = [];          // {test, resolve, reject, timer}
  var state = {};            // sunucudan gelen cihaz verisi
  var faces = {};            // md_faces: { devUid: { slot: {config,url,name} } }

  var root, listEl, statusEl, connectBtn;

  /* ---------------- yardimcilar ---------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg || '';
    statusEl.className = 'md-status' + (kind ? ' md-status-' + kind : '');
  }

  function fmtDur(ms) {
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' s';
    return Math.floor(s / 60) + ' m ' + (s % 60) + ' s';
  }

  function fmtTotal(sec) {
    if (!sec) return '0 s';
    if (sec < 60) return sec + ' s';
    var m = Math.floor(sec / 60), s = sec % 60;
    if (m < 60) return m + ' m' + (s ? ' ' + s + ' s' : '');
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' m';
  }

  function fmtDate(epoch) {
    if (!epoch) return 'never';
    var d = new Date(epoch * 1000);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function safeName(s) {
    return (s || '').replace(/[^\wğüşıöçĞÜŞİÖÇ .-]/g, '').trim() || null;
  }

  /* ---------------- REST ---------------- */

  function api(path, body) {
    return fetch(MD.rest + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': MD.nonce },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
    }).then(function (r) { return r.json(); });
  }

  /* ---------------- seri port ---------------- */

  function readLoop() {
    var dec = new TextDecoder();
    return reader.read().then(function step(res) {
      if (res.done) return;
      lineBuf += dec.decode(res.value, { stream: true });
      var idx;
      while ((idx = lineBuf.indexOf('\n')) >= 0) {
        var line = lineBuf.slice(0, idx).replace(/\r$/, '');
        lineBuf = lineBuf.slice(idx + 1);
        dispatch(line);
      }
      return reader.read().then(step);
    }).catch(function () { /* port kapandi */ });
  }

  function dispatch(line) {
    for (var i = 0; i < waiters.length; i++) {
      if (waiters[i].test(line)) {
        var w = waiters.splice(i, 1)[0];
        clearTimeout(w.timer);
        w.resolve(line);
        return;
      }
    }
    if (waiters.length && waiters[0].collect) waiters[0].collect(line);
  }

  function waitFor(test, ms, collect) {
    return new Promise(function (resolve, reject) {
      var w = { test: test, resolve: resolve, reject: reject, collect: collect };
      w.timer = setTimeout(function () {
        var k = waiters.indexOf(w);
        if (k >= 0) waiters.splice(k, 1);
        reject(new Error('The kit did not respond'));
      }, ms || 4000);
      waiters.push(w);
    });
  }

  function send(obj) {
    var data = new TextEncoder().encode(JSON.stringify(obj) + '\n');
    return writer.write(data);
  }

  function ask(obj, test, ms) {
    var p = waitFor(test, ms);
    return send(obj).then(function () { return p; });
  }

  /* Cihaz acilirken ilk hello kacabilir; birkac kez dene. */
  function helloWithRetry(tries) {
    var attempt = 0;
    function once() {
      attempt++;
      setStatus('Looking for the kit… (' + attempt + '/' + tries + ')');
      return ask({ cmd: 'hello' }, function (l) { return l.indexOf('"dev"') >= 0; }, 2500)
        .catch(function (e) {
          if (attempt >= tries) throw e;
          return new Promise(function (r) { setTimeout(r, 700); }).then(once);
        });
    }
    return once();
  }

  function connect() {
    if (!('serial' in navigator)) {
      document.getElementById('md-browser-note').hidden = false;
      return;
    }
    setStatus('Choosing a kit…');

    navigator.serial.requestPort()
      .then(function (p) {
        port = p;
        return port.open({ baudRate: 115200 });
      })
      .then(function () {
        reader = port.readable.getReader();
        writer = port.writable.getWriter();
        readLoop();

        // Port acilinca kart resetlenir; acilis ~1.5 sn surer.
        try { port.setSignals({ dataTerminalReady: true, requestToSend: false }); } catch (e) {}

        setStatus('Waking the kit up…');
        return new Promise(function (r) { setTimeout(r, 1800); });
      })
      .then(function () { return helloWithRetry(4); })
      .then(function (line) {
        var hello = JSON.parse(line);
        return checkOwnership(hello);
      })
      .then(function (hello) {
        if (!hello) return null;                       // kullanici vazgecti
        setStatus(DEV_LABEL[hello.dev] + ' connected — syncing the clock…', 'ok');
        return send({ cmd: 'time', epoch: Math.floor(Date.now() / 1000) })
          .then(function () {
            return new Promise(function (r) { setTimeout(function () { r(hello); }, 300); });
          });
      })
      .then(function (hello) { if (hello) return pullStats(hello); })
      .catch(function (e) {
        var msg = String(e && e.message || e);
        if (msg.indexOf('Failed to open serial port') >= 0 || msg.indexOf('AccessDenied') >= 0) {
          msg = 'The port is in use by another program. Close the Arduino IDE serial monitor ' +
                '(or any other app talking to the kit) and try again.';
        } else if (msg.indexOf('No port selected') >= 0 || msg.indexOf('cancel') >= 0) {
          msg = 'No kit selected.';
        } else if (msg === 'The kit did not respond') {
          msg = 'The kit did not respond. Press the RST button on the board once and try again. ' +
                'If it keeps happening, unplug and replug the cable — make sure it is a data cable, not charge-only.';
        } else {
          msg = 'Could not connect: ' + msg;
        }
        setStatus(msg, 'err');
        disconnect();
      });
  }

  /* Cihaz bu profile bagli mi? Degilse baglamayi teklif et. */
  function checkOwnership(hello) {
    var label = DEV_LABEL[hello.dev] || hello.dev;

    if (!hello.uid) {                                  // eski firmware
      setStatus(label + ' connected (older firmware — no profile link).', 'ok');
      return Promise.resolve(hello);
    }

    return api('whoami').then(function (me) {
      var bound = parseInt(hello.profile || 0, 10);

      if (bound === me.profile) {                      // zaten bizim
        return hello;
      }

      if (bound && bound !== me.profile) {             // baskasinin
        var msg = label + ' is linked to another profile' +
                  (hello.owner ? ' (' + hello.owner + ')' : '') +
                  '. Move it to your profile? ' +
                  'Recordings on the kit are kept — only the ownership changes.';
        if (!window.confirm(msg)) {
          setStatus('Cancelled — the kit stays linked to the other profile.', 'err');
          return null;
        }
      } else {                                         // bagsiz
        if (!window.confirm(label + ' is not linked to a profile yet. ' +
                            'Link it to ' + me.owner + '?')) {
          setStatus('The kit was not linked.', 'err');
          return null;
        }
      }

      setStatus('Linking the kit to your profile…');
      return ask({ cmd: 'bind', profile: me.profile, owner: me.owner },
                 function (l) { return l.indexOf('"ok"') >= 0; }, 5000)
        .then(function () {
          hello.profile = me.profile;
          hello.owner = me.owner;
          return hello;
        });
    });
  }

  function pullStats(hello) {
    return ask({ cmd: 'stats' }, function (l) { return l.indexOf('"total_s"') >= 0; }, 5000)
      .then(function (line) {
        var st = JSON.parse(line);
        st.dev = hello.dev;
        st.fw = hello.fw;
        return api('sync', st);
      })
      .then(function (res) {
        if (res && res.code === 'md_other_owner') {
          setStatus(res.message, 'err');
          return;
        }
        state = res.devices || {};
        liveType = hello.dev;
        liveDev  = hello.uid || hello.dev;
        render();
        setStatus(DEV_LABEL[hello.dev] + ' synced. You can open it now.', 'ok');
      });
  }

  function refreshDownloadButtons() {
    render();   // yuz/indirme dugmelerinin tamami baglanti durumuna gore yeniden cizilir
  }

  // Yuz modulunun kullandigi seri kopru
  function serialIO() {
    return {
      send: function (obj) { return send(obj); },
      sendRaw: function (text) { return writer.write(new TextEncoder().encode(text)); },
      waitFor: function (test, ms) { return waitFor(test, ms); },
    };
  }

  function disconnect() {
    try { if (reader) reader.cancel(); } catch (e) {}
    try { if (writer) writer.releaseLock(); } catch (e) {}
    try { if (port) port.close(); } catch (e) {}
    port = reader = writer = null;
    liveDev = liveType = null;
    refreshDownloadButtons();
  }

  /* ---------------- WAV indirme ---------------- */

  function dumpSlot(slotNo, fileName, btn) {
    if (!port) { setStatus('Connect the kit first.', 'err'); return Promise.resolve(false); }

    var samples = [];
    var expected = 0;
    btn.disabled = true;
    var oldText = btn.textContent;
    btn.textContent = 'Downloading…';

    var done = waitFor(
      function (l) { return l === 'EOF' || l.indexOf('"err"') >= 0; },
      120000,
      function (l) {
        if (l.indexOf('"dump"') >= 0) {
          try { expected = JSON.parse(l).samples || 0; } catch (e) {}
          return;
        }
        var parts = l.split(' ');
        for (var i = 0; i < parts.length; i++) {
          var v = parseInt(parts[i], 10);
          if (!isNaN(v)) samples.push(v);
        }
        if (expected) {
          btn.textContent = Math.min(99, Math.round(samples.length / expected * 100)) + '%';
        }
      }
    );

    return send({ cmd: 'dump', slot: slotNo })
      .then(function () { return done; })
      .then(function (last) {
        btn.disabled = false;
        btn.textContent = oldText;
        if (last.indexOf('"err"') >= 0) { setStatus('There is no recording in that slot.', 'err'); return false; }
        if (!samples.length) { setStatus('The recording came back empty.', 'err'); return false; }
        downloadWav(samples, fileName);
        setStatus(fileName + ' downloaded.', 'ok');
        return true;
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = oldText;
        setStatus('Download did not finish: ' + e.message, 'err');
        return false;
      });
  }

  function downloadWav(samples, fileName) {
    var n = samples.length;
    var buf = new ArrayBuffer(44 + n * 2);
    var v = new DataView(buf);

    function str(off, s) { for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }

    str(0, 'RIFF');
    v.setUint32(4, 36 + n * 2, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);          // PCM
    v.setUint16(22, 1, true);          // mono
    v.setUint32(24, SR, true);
    v.setUint32(28, SR * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) {
      var s = Math.max(-32768, Math.min(32767, samples[i]));
      v.setInt16(44 + i * 2, s, true);
    }

    var url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ---------------- sahne kaydi indirme (Version_D) ---------------- */

  function dumpScene(mode, level, mini, isDemo, fileName, btn) {
    if (!port) { setStatus('Connect the kit first.', 'err'); return; }
    var samples = [], expected = 0;
    var old = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Downloading…';

    var done = waitFor(
      function (l) { return l === 'EOF' || l.indexOf('"err"') >= 0; },
      180000,
      function (l) {
        if (l.indexOf('"dump"') >= 0) {
          try { expected = JSON.parse(l).samples || 0; } catch (e) {}
          return;
        }
        var v = parseInt(l, 10);
        if (!isNaN(v)) samples.push(v);
        if (expected && samples.length % 4000 === 0) {
          btn.textContent = Math.min(99, Math.round(samples.length / expected * 100)) + '%';
        }
      }
    );

    send({ cmd: 'dump', scene: mode, level: level, mini: mini, demo: isDemo ? 1 : 0 })
      .then(function () { return done; })
      .then(function (last) {
        btn.disabled = false; btn.textContent = old;
        if (last.indexOf('"err"') >= 0) { setStatus('There is no recording in that slot.', 'err'); return; }
        if (!samples.length) { setStatus('The recording came back empty.', 'err'); return; }
        downloadWav(samples, fileName);
        setStatus(fileName + ' downloaded.', 'ok');
      })
      .catch(function (e) {
        btn.disabled = false; btn.textContent = old;
        setStatus('Download did not finish: ' + e.message, 'err');
      });
  }

  /* ---------------- yuz aktarimi ---------------- */

  function transferFace(devKey, slotNo, config, btn) {
    if (!port) { setStatus('Connect the kit first.', 'err'); return; }
    if (!window.MFAvatarEditor || !window.MFAvatarEditor.exportFace) {
      setStatus('The face engine did not load — is Mini-Forum up to date?', 'err'); return;
    }
    var old = btn.textContent;
    btn.disabled = true;

    setStatus('Preparing the face…');
    window.MFAvatarEditor.exportFace(config || null, {
      onProgress: function (m, p) { btn.textContent = 'Preparing ' + p + '%'; },
    })
      .then(function (pack) {
        var bytes = window.MDFaces.buildFaceFile(pack);
        setStatus('Sending to the kit (' + Math.round(bytes.length / 1024) + ' KB)…');
        return window.MDFaces.sendFace(serialIO(), slotNo, bytes, function (p) {
          btn.textContent = 'Transferring ' + p + '%';
        });
      })
      .then(function () {
        btn.disabled = false; btn.textContent = old;
        setStatus('The face for slot ' + slotNo + ' was transferred.', 'ok');
      })
      .catch(function (e) {
        btn.disabled = false; btn.textContent = old;
        setStatus('Transfer failed: ' + e.message, 'err');
      });
  }

  /* ══════════════════ UI: Mini-Kits shelf + kit popup ══════════════════ */

  /* One entry per Mini-Talks kit. The shelf always shows all three, so a
     kit the user does not own yet still reads as part of the family. */
  var KITS = [
    {
      code: 'F', name: 'Fig-Talks', color: 'red',
      tagline: 'A minifigure that listens, keeps what it hears, and plays it back.',
      sections: ['overview', 'recordings'],
      art: '<svg viewBox="0 0 64 64" aria-hidden="true">' +
           '<rect x="22" y="4" width="20" height="7" rx="3" class="a1"/>' +
           '<rect x="17" y="10" width="30" height="22" rx="7" class="a1"/>' +
           '<circle cx="26" cy="20" r="2.6" class="ink"/><circle cx="38" cy="20" r="2.6" class="ink"/>' +
           '<path d="M26 26 q6 5 12 0" class="stroke"/>' +
           '<rect x="14" y="34" width="36" height="24" rx="5" class="a2"/>' +
           '<rect x="6" y="38" width="9" height="16" rx="4" class="a2"/>' +
           '<rect x="49" y="38" width="9" height="16" rx="4" class="a2"/>' +
           '<circle cx="32" cy="45" r="4.5" class="hole"/></svg>'
    },
    {
      code: 'B', name: 'Display-Talks', color: 'blue',
      tagline: 'A screen kit. Design a face for every slot and send it over.',
      sections: ['overview', 'recordings', 'faces'],
      art: '<svg viewBox="0 0 64 64" aria-hidden="true">' +
           '<rect x="18" y="3" width="8" height="6" rx="2.5" class="a1"/>' +
           '<rect x="38" y="3" width="8" height="6" rx="2.5" class="a1"/>' +
           '<rect x="8" y="8" width="48" height="42" rx="7" class="a1"/>' +
           '<rect x="14" y="15" width="36" height="26" rx="4" class="screen"/>' +
           '<circle cx="25" cy="26" r="3" class="ink"/><circle cx="39" cy="26" r="3" class="ink"/>' +
           '<path d="M25 33 q7 5 14 0" class="stroke"/>' +
           '<rect x="20" y="52" width="24" height="8" rx="3" class="a2"/></svg>'
    },
    {
      code: 'D', name: 'Design-Talks', color: 'yellow',
      tagline: 'Scene cards and level-by-level practice, from sound to dialogue.',
      sections: ['overview', 'scenes'],
      art: '<svg viewBox="0 0 64 64" aria-hidden="true">' +
           '<rect x="6" y="20" width="30" height="38" rx="5" class="a2" transform="rotate(-9 21 39)"/>' +
           '<rect x="18" y="14" width="30" height="38" rx="5" class="a1"/>' +
           '<rect x="24" y="9" width="7" height="6" rx="2.5" class="a1"/>' +
           '<rect x="35" y="9" width="7" height="6" rx="2.5" class="a1"/>' +
           '<rect x="25" y="22" width="16" height="3.5" rx="1.75" class="line"/>' +
           '<rect x="25" y="30" width="16" height="3.5" rx="1.75" class="line"/>' +
           '<rect x="25" y="38" width="10" height="3.5" rx="1.75" class="line"/>' +
           '<circle cx="47" cy="47" r="9" class="chip"/>' +
           '<path d="M43 47h8M47 43v8" class="stroke-w"/></svg>'
    }
  ];

  var LEVELS = ['Sound', 'Word', 'Sentence', 'Dialogue'];

  function kitByCode(code) {
    for (var i = 0; i < KITS.length; i++) if (KITS[i].code === code) return KITS[i];
    return null;
  }

  /* The device key for a kit type, or null when the profile has none. */
  function kitKey(code) {
    var keys = Object.keys(state);
    for (var i = 0; i < keys.length; i++) {
      var d = state[keys[i]];
      if ((d.type || keys[i]) === code) return keys[i];
    }
    return null;
  }

  /* live   — plugged in right now, everything is available
     linked — synced before, read-only view of the last sync
     new    — not part of this profile yet */
  function kitStatus(code) {
    if (port && liveType === code) return 'live';
    return kitKey(code) ? 'linked' : 'new';
  }

  function saveName(payload, input) {
    input.classList.add('md-saving');
    api('name', payload).then(function () {
      input.classList.remove('md-saving');
      input.classList.add('md-saved');
      setTimeout(function () { input.classList.remove('md-saved'); }, 900);
    });
  }

  /* ── shelf ── */

  function pill(status) {
    var map = {
      live:   ['md-pill md-pill-live',   'Connected'],
      linked: ['md-pill md-pill-linked', 'Not connected'],
      'new':  ['md-pill md-pill-new',    'Not linked yet']
    };
    var p = el('span', map[status][0]);
    p.appendChild(el('span', 'md-pill-dot'));
    p.appendChild(document.createTextNode(map[status][1]));
    return p;
  }

  function countRecordings(dev) {
    if (!dev) return 0;
    var n = 0;
    (dev.slots || []).forEach(function (s) { if (s.full) n++; });
    (dev.scenes || []).forEach(function (sc) {
      (sc.slots || []).forEach(function (sl) { if (sl.len_ms) n++; });
    });
    if (dev.cards) Object.keys(dev.cards).forEach(function (u) {
      (dev.cards[u].slots || []).forEach(function (sl) { if (sl.full) n++; });
    });
    return n;
  }

  function kitCard(kit) {
    var status = kitStatus(kit.code);
    var key    = kitKey(kit.code);
    var dev    = key ? state[key] : null;

    var card = el('article', 'md-kit md-kit-' + kit.color + ' is-' + status);

    card.appendChild(el('div', 'md-kit-studs'));

    var body = el('div', 'md-kit-body');

    var art = el('div', 'md-kit-art');
    art.innerHTML = kit.art;
    body.appendChild(art);

    var main = el('div', 'md-kit-main');
    var row  = el('div', 'md-kit-titlerow');
    row.appendChild(el('h4', 'md-kit-name', dev && dev.label ? dev.label : kit.name));
    row.appendChild(pill(status));
    main.appendChild(row);
    main.appendChild(el('p', 'md-kit-tagline', kit.tagline));

    var facts = el('div', 'md-kit-facts');
    if (dev) {
      var n = countRecordings(dev);
      facts.appendChild(fact(String(n), n === 1 ? 'recording' : 'recordings'));
      facts.appendChild(fact(fmtTotal(dev.stats && dev.stats.total_s), 'recorded'));
      facts.appendChild(fact(fmtDate(dev.last_sync).split(' ').slice(0, 3).join(' '), 'last sync'));
    } else {
      facts.appendChild(el('p', 'md-kit-hint',
        'Plug this kit into your computer with a USB data cable, then press “Connect a kit”.'));
    }
    main.appendChild(facts);
    body.appendChild(main);

    var cta = el('div', 'md-kit-cta');
    var open = el('button', 'md-btn md-btn-open', status === 'live' ? 'Open kit' : 'View details');
    open.type = 'button';
    if (status === 'new') {
      open.textContent = 'Connect to open';
      open.disabled = true;
      open.title = 'This kit is not linked to your profile yet.';
    } else {
      open.addEventListener('click', function () { openKit(kit.code); });
    }
    cta.appendChild(open);
    if (status === 'linked') {
      cta.appendChild(el('span', 'md-kit-note', 'Read-only until you plug it in'));
    }
    body.appendChild(cta);

    card.appendChild(body);
    return card;
  }

  function fact(value, label) {
    var f = el('div', 'md-fact');
    f.appendChild(el('strong', 'md-fact-value', String(value)));
    f.appendChild(el('span', 'md-fact-label', label));
    return f;
  }

  function renderShelf() {
    shelfEl.innerHTML = '';
    KITS.forEach(function (k) { shelfEl.appendChild(kitCard(k)); });
  }

  /* Fills the "Kits" counter in the profile header. */
  function syncHeaderStat() {
    var n = Object.keys(state).length;
    var box = document.getElementById('mf-stat-kits');
    if (box) { box.textContent = 'Kits: ' + n; return; }

    // Older Mini-Forum has no id on the box — append our own instead.
    var row = document.querySelector('.mf-stats-row');
    if (!row) return;
    var own = document.getElementById('md-stat-box');
    if (!own) {
      own = el('div', 'mf-stat-box');
      own.id = 'md-stat-box';
      row.appendChild(own);
    }
    own.textContent = 'Kits: ' + n;
  }

  /* ── kit popup ── */

  var openCode = null, openSection = null;

  function openKit(code) {
    openCode = code;
    var kit = kitByCode(code);
    var avail = kit.sections.filter(function (sec) { return sectionAvailable(code, sec); });
    openSection = avail.indexOf(openSection) >= 0 ? openSection : avail[0];
    renderPopup();
    document.body.style.overflow = 'hidden';
  }

  function closeKit() {
    openCode = null;
    modalRoot.innerHTML = '';
    document.body.style.overflow = '';
  }

  function sectionAvailable(code, sec) {
    var key = kitKey(code), dev = key ? state[key] : null;
    if (sec === 'scenes')  return !!(dev && ((dev.scenes || []).length || (dev.cards && Object.keys(dev.cards).length)));
    if (sec === 'faces')   return code === 'B';
    return true;
  }

  function renderPopup() {
    modalRoot.innerHTML = '';
    if (!openCode) return;

    var kit    = kitByCode(openCode);
    var status = kitStatus(openCode);
    var live   = status === 'live';
    var key    = kitKey(openCode);
    var dev    = key ? state[key] : null;
    if (!dev) { closeKit(); return; }

    var overlay = el('div', 'md-overlay');
    overlay.id = 'md-kit-overlay';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeKit(); });

    var wrap  = el('div', 'md-popup-wrapper md-pop-' + kit.color);
    wrap.appendChild(el('div', 'md-popup-studs'));

    var modal = el('div', 'md-popup-modal');
    var inner = el('div', 'md-popup-inner');

    var close = el('button', 'md-popup-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', closeKit);
    inner.appendChild(close);

    /* header */
    var head = el('header', 'md-pop-head');
    var brick = el('span', 'md-pop-brick');
    head.appendChild(brick);
    var htxt = el('div', 'md-pop-headtext');
    htxt.appendChild(el('h2', null, dev.label || kit.name));
    var meta = el('div', 'md-pop-meta');
    if (dev.uid) meta.appendChild(el('span', 'md-uid', dev.uid));
    if (dev.fw)  meta.appendChild(el('span', 'md-fw', 'Firmware ' + dev.fw));
    meta.appendChild(el('span', 'md-sync', 'Last sync: ' + fmtDate(dev.last_sync)));
    htxt.appendChild(meta);
    head.appendChild(htxt);
    head.appendChild(pill(status));
    inner.appendChild(head);

    if (!live) {
      inner.appendChild(el('p', 'md-pop-banner',
        'Not connected — showing the last sync. Plug the kit in to download audio, rename recordings or send faces.'));
    }

    /* section nav */
    var avail = kit.sections.filter(function (sec) { return sectionAvailable(openCode, sec); });
    if (avail.length > 1) {
      var nav = el('nav', 'md-pop-nav');
      avail.forEach(function (sec) {
        var b = el('button', 'md-pop-navbtn' + (sec === openSection ? ' is-on' : ''), sectionLabel(sec));
        b.type = 'button';
        b.addEventListener('click', function () { openSection = sec; renderPopup(); });
        nav.appendChild(b);
      });
      inner.appendChild(nav);
    }

    /* section body */
    var bodyEl = el('div', 'md-pop-body');
    if (openSection === 'overview')        renderOverview(bodyEl, key, dev, live);
    else if (openSection === 'recordings') renderRecordings(bodyEl, key, dev, live);
    else if (openSection === 'faces')      renderFaces(bodyEl, key, dev, live);
    else if (openSection === 'scenes')     renderScenes(bodyEl, key, dev, live);
    inner.appendChild(bodyEl);

    /* footer */
    var foot = el('footer', 'md-pop-foot');
    var full = (dev.slots || []).filter(function (s) { return s.full; });
    if (full.length) {
      var all = el('button', 'md-btn md-btn-ghost', 'Download all ' + full.length + ' recordings');
      all.type = 'button';
      all.disabled = !live;
      all.title = live ? '' : 'Connect the kit to download.';
      all.addEventListener('click', function () { downloadAll(full, all); });
      foot.appendChild(all);
    }
    var forget = el('button', 'md-btn md-btn-danger', 'Remove from profile');
    forget.type = 'button';
    forget.addEventListener('click', function () {
      if (!window.confirm('Remove ' + (dev.label || kit.name) + ' from your profile? ' +
                          'Recordings on the kit itself are not deleted.')) return;
      if (port && liveType === openCode) { try { send({ cmd: 'unbind' }); } catch (e) {} }
      api('forget', { dev: key }).then(function () {
        delete state[key];
        closeKit();
        render();
        setStatus('The kit was removed from your profile.', 'ok');
      });
    });
    foot.appendChild(forget);
    inner.appendChild(foot);

    modal.appendChild(inner);
    wrap.appendChild(modal);
    overlay.appendChild(wrap);
    modalRoot.appendChild(overlay);
  }

  function sectionLabel(sec) {
    return { overview: 'Overview', recordings: 'Recordings', faces: 'Faces', scenes: 'Scenes' }[sec] || sec;
  }

  /* ── popup sections ── */

  function statGrid(stats) {
    var wrap = el('div', 'md-stats');
    [
      ['Total recorded', fmtTotal(stats && stats.total_s)],
      ['Recordings',     String((stats && stats.count) || 0)],
      ['Longest',        fmtTotal(stats && stats.longest_s)],
      ['Most recent',    fmtDate(stats && stats.last_ts)]
    ].forEach(function (it) {
      var b = el('div', 'md-stat');
      b.appendChild(el('span', 'md-stat-label', it[0]));
      b.appendChild(el('span', 'md-stat-value', it[1]));
      wrap.appendChild(b);
    });
    return wrap;
  }

  function renderOverview(host, key, dev, live) {
    host.appendChild(statGrid(dev.stats));

    var used = (dev.slots || []).filter(function (s) { return s.full; }).length;
    var cap  = (dev.slots || []).length;
    if (cap) {
      var bar = el('div', 'md-capacity');
      var lab = el('div', 'md-capacity-head');
      lab.appendChild(el('span', null, 'Slots in use'));
      lab.appendChild(el('strong', null, used + ' / ' + cap));
      bar.appendChild(lab);
      var track = el('div', 'md-capacity-bar');
      var fill  = el('span');
      fill.style.width = (cap ? Math.round(used / cap * 100) : 0) + '%';
      track.appendChild(fill);
      bar.appendChild(track);
      host.appendChild(bar);
    }

    var name = el('div', 'md-field');
    name.appendChild(el('label', null, 'Kit name'));
    var input = el('input', 'md-input');
    input.type = 'text';
    input.value = dev.label || '';
    input.placeholder = kitByCode(openCode).name;
    input.disabled = !live;
    input.title = live ? '' : 'Connect the kit to rename it.';
    input.addEventListener('change', function () {
      dev.label = input.value;
      saveName({ dev: key, device_label: input.value }, input);
      renderShelf();
    });
    name.appendChild(input);
    host.appendChild(name);
  }

  function slotRow(key, folder, slot, live) {
    var row = el('div', 'md-slot' + (slot.full ? '' : ' md-slot-empty'));

    row.appendChild(el('span', 'md-slot-no', String(slot.i)));

    var input = el('input', 'md-slot-name');
    input.type = 'text';
    input.placeholder = !slot.full ? 'Empty slot'
                      : (live ? 'Name this recording' : 'Unnamed recording');
    input.value = slot.name || '';
    input.disabled = !slot.full || !live;
    input.addEventListener('change', function () {
      slot.name = input.value;
      saveName({ dev: key, slot: slot.i, name: input.value }, input);
    });
    row.appendChild(input);

    row.appendChild(el('span', 'md-slot-len', slot.full ? fmtDur(slot.len_ms) : 'empty'));

    if (slot.full) {
      var btn = el('button', 'md-btn md-btn-ghost md-btn-sm', 'Download');
      btn.type = 'button';
      btn.disabled = !live;
      btn.title = live ? 'Download as WAV' : 'Recordings live on the kit — connect it to download.';
      btn.addEventListener('click', function () {
        var base = safeName(slot.name) || ('slot' + slot.i);
        var dir  = folder ? safeName(folder) + ' - ' : '';
        dumpSlot(slot.i, dir + base + '.wav', btn);
      });
      row.appendChild(btn);
    }
    return row;
  }

  function renderRecordings(host, key, dev, live) {
    var slots = dev.slots || [];
    if (!slots.length) {
      host.appendChild(emptyNote('No recordings yet',
        'Record something on the kit, then connect it again to see it here.'));
      return;
    }
    var list = el('div', 'md-slots');
    slots.forEach(function (s) { list.appendChild(slotRow(key, null, s, live)); });
    host.appendChild(list);
  }

  function renderFaces(host, key, dev, live) {
    if (!window.MDFaces) {
      host.appendChild(emptyNote('Face designer unavailable',
        'The face module did not load. Reload the page and try again.'));
      return;
    }

    host.appendChild(el('p', 'md-section-note',
      'Design a face for each slot, then send it to the kit. Faces are stored on your profile, so you can keep editing them while the kit is unplugged.'));

    var list = el('div', 'md-faces');
    (dev.slots || []).forEach(function (slot) {
      var f = (faces[key] && faces[key][slot.i]) || null;
      var tile = el('div', 'md-face' + (f ? ' has-face' : ''));

      var thumbWrap = el('div', 'md-face-thumb');
      if (f && f.url) {
        var img = el('img');
        img.src = f.url;
        img.alt = 'Face for slot ' + slot.i;
        thumbWrap.appendChild(img);
      } else {
        thumbWrap.appendChild(el('span', 'md-face-placeholder', '?'));
      }
      thumbWrap.appendChild(el('span', 'md-face-no', String(slot.i)));
      tile.appendChild(thumbWrap);

      var acts = el('div', 'md-face-acts');

      var design = el('button', 'md-btn md-btn-ghost md-btn-sm', f ? 'Edit face' : 'Design face');
      design.type = 'button';
      design.addEventListener('click', function () {
        window.MDFaces.designFace(f && f.config, function (cfg, img) {
          api('faces', { dev: key, slot: slot.i, config: cfg, image: img }).then(function (res) {
            faces = res.faces || faces;
            render();
            setStatus('The face for slot ' + slot.i + ' was saved.', 'ok');
          });
        });
      });
      acts.appendChild(design);

      var send2 = el('button', 'md-btn md-btn-primary md-btn-sm', 'Send to kit');
      send2.type = 'button';
      send2.disabled = !live || !f;
      send2.title = !f ? 'Design a face for this slot first.'
                       : (!live ? 'Connect the kit to send it.' : '');
      send2.addEventListener('click', function () { transferFace(key, slot.i, f && f.config, send2); });
      acts.appendChild(send2);

      tile.appendChild(acts);
      list.appendChild(tile);
    });
    host.appendChild(list);
  }

  function renderScenes(host, key, dev, live) {
    (dev.scenes || []).forEach(function (sc) {
      var isDefault = sc.mode === 'default';
      var label = isDefault ? 'No scene (default)' : sc.mode.replace(/^scene_/, 'Scene ');

      var folder = el('section', 'md-folder');
      var fh = el('div', 'md-folder-head');
      fh.appendChild(el('span', 'md-folder-uid', isDefault ? 'default' : sc.mode.replace(/^scene_/, '')));
      fh.appendChild(el('strong', 'md-folder-title', label));
      folder.appendChild(fh);

      if (sc.stats) folder.appendChild(statGrid(sc.stats));

      (sc.slots || []).forEach(function (sl) {
        var row = el('div', 'md-slot');
        row.appendChild(el('span', 'md-slot-no', 'L' + sl.l));
        row.appendChild(el('span', 'md-slot-lvl', (LEVELS[sl.l - 1] || '') + ' · Mini ' + sl.m));
        row.appendChild(el('span', 'md-slot-len', sl.len_ms ? fmtDur(sl.len_ms) : 'empty'));

        var stem = (isDefault ? 'Default' : sc.mode.replace(/^scene_/, 'Scene ')) + ' - L' + sl.l + ' M' + sl.m;

        if (sl.len_ms) {
          var b = el('button', 'md-btn md-btn-ghost md-btn-sm', 'Download');
          b.type = 'button';
          b.disabled = !live;
          b.title = live ? '' : 'Connect the kit to download.';
          b.addEventListener('click', function () { dumpScene(sc.mode, sl.l, sl.m, false, stem + '.wav', b); });
          row.appendChild(b);
        }
        if (sl.demo) {
          var bd = el('button', 'md-btn md-btn-quiet md-btn-sm', 'Demo');
          bd.type = 'button';
          bd.disabled = !live;
          bd.addEventListener('click', function () { dumpScene(sc.mode, sl.l, sl.m, true, stem + ' demo.wav', bd); });
          row.appendChild(bd);
        }
        folder.appendChild(row);
      });

      if (!(sc.slots || []).length) {
        folder.appendChild(el('p', 'md-section-note', 'Nothing recorded in this scene yet.'));
      }
      host.appendChild(folder);
    });

    if (dev.cards) Object.keys(dev.cards).forEach(function (uid) {
      var c = dev.cards[uid];
      var folder = el('section', 'md-folder');

      var fh = el('div', 'md-folder-head');
      fh.appendChild(el('span', 'md-folder-uid', uid));
      var nameIn = el('input', 'md-folder-name');
      nameIn.type = 'text';
      nameIn.value = c.name || '';
      nameIn.placeholder = 'Card name (e.g. Café)';
      nameIn.disabled = !live;
      nameIn.addEventListener('change', function () {
        saveName({ dev: key, card: uid, name: nameIn.value }, nameIn);
      });
      fh.appendChild(nameIn);
      folder.appendChild(fh);

      folder.appendChild(statGrid(c.stats));
      (c.slots || []).forEach(function (s) {
        folder.appendChild(slotRow(key, c.name || uid, s, live));
      });
      host.appendChild(folder);
    });
  }

  function emptyNote(title, hint) {
    var e = el('div', 'md-empty');
    e.appendChild(el('p', null, title));
    e.appendChild(el('p', 'md-empty-hint', hint));
    return e;
  }

  function downloadAll(full, btn) {
    btn.disabled = true;
    var label = btn.textContent, i = 0;
    (function next() {
      if (i >= full.length) {
        btn.disabled = false;
        btn.textContent = label;
        setStatus(full.length + ' recordings downloaded.', 'ok');
        return;
      }
      var s = full[i++];
      btn.textContent = 'Downloading ' + i + ' / ' + full.length;
      // One at a time — the serial link carries a single dump per request.
      dumpSlot(s.i, (safeName(s.name) || ('slot' + s.i)) + '.wav',
               { disabled: false, textContent: '' })
        .then(function () { setTimeout(next, 400); });
    })();
  }

  /* ── top-level render ── */

  function render() {
    syncHeaderStat();
    renderShelf();
    if (openCode) renderPopup();
  }

  /* ── boot ── */

  var shelfEl, modalRoot;

  document.addEventListener('DOMContentLoaded', function () {
    root = document.getElementById('md-root');
    if (!root) return;
    shelfEl    = document.getElementById('md-shelf');
    statusEl   = document.getElementById('md-status');
    connectBtn = document.getElementById('md-connect');
    modalRoot  = document.getElementById('md-modal-root') || document.body;

    try { state = JSON.parse(root.dataset.initial || '{}') || {}; } catch (e) { state = {}; }
    if (Array.isArray(state)) state = {};

    if (!('serial' in navigator)) {
      document.getElementById('md-browser-note').hidden = false;
      connectBtn.disabled = true;
    }

    connectBtn.addEventListener('click', connect);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openCode) closeKit();
    });

    render();
    api('faces').then(function (f) { faces = f || {}; render(); }).catch(function () {});
  });
})();
