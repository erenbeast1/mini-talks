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

  var DEV_LABEL = { F: 'Fig-Talks', B: 'Brick-Talks', D: 'Design-Talks' };
  var liveDev = null, liveType = null;   // kit currently held open over serial

  /* Demo mode — an admin-only front-end preview. It swaps in sample kits so
     every screen can be walked through without hardware. Nothing touches the
     server: api() is short-circuited and downloads are synthesised locally. */
  var demo = false, publicDemo = false;
  var kits = null;  // requests + Fig-Talks design + Mini-Designs catalogue, from /kits
  var realState = null, realFaces = null, realKits = null;
  var onlyKits = null;   // public preview may show a single kit

  function demoFace(bg, mouth) {
    return 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">' +
      '<rect width="80" height="80" rx="10" fill="' + bg + '"/>' +
      '<circle cx="28" cy="32" r="5"/><circle cx="52" cy="32" r="5"/>' +
      '<path d="' + mouth + '" stroke="#000" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '</svg>');
  }

  function demoData() {
    var now = Math.floor(Date.now() / 1000);
    return {
      state: {
        'F-3C71BF2A': {
          type: 'F', uid: 'F-3C71BF2A', fw: '1.4', label: '', last_sync: now - 240, connected_at: now - 864000,
          stats: { total_s: 214, count: 6, longest_s: 63, last_ts: now - 3600 },
          slots: [
            { i: 1, full: 1, len_ms: 12400, name: 'Mum' },
            { i: 2, full: 1, len_ms: 8100,  name: 'Good morning' },
            { i: 3, full: 1, len_ms: 63000, name: '' },
            { i: 4, full: 0, len_ms: 0,     name: '' },
            { i: 5, full: 0, len_ms: 0,     name: '' }
          ]
        },
        'B-91A0C4E2': {
          type: 'B', uid: 'B-91A0C4E2', fw: '2.1', label: '', last_sync: now - 120, connected_at: now - 864000,
          stats: { total_s: 96, count: 3, longest_s: 41, last_ts: now - 5400 },
          slots: [
            { i: 1, full: 1, len_ms: 41000, name: 'Hello' },
            { i: 2, full: 1, len_ms: 22000, name: 'Story time' },
            { i: 3, full: 1, len_ms: 33000, name: '' },
            { i: 4, full: 0, len_ms: 0,     name: '' }
          ]
        },
        'D-77BE10A5': {
          type: 'D', uid: 'D-77BE10A5', fw: '2.3', label: '', last_sync: now - 60, connected_at: now - 864000,
          stats: { total_s: 402, count: 11, longest_s: 88, last_ts: now - 900 },
          slots: [],
          scenes: [
            { mode: 'default', stats: { total_s: 96, count: 4, longest_s: 31, last_ts: now - 7200 },
              slots: [
                { l: 1, m: 1, len_ms: 4200,  demo: 1 },
                { l: 1, m: 2, len_ms: 6800,  demo: 0 },
                { l: 2, m: 1, len_ms: 15300, demo: 1 },
                { l: 3, m: 1, len_ms: 0,     demo: 1 }
              ] },
            { mode: 'scene_02', stats: { total_s: 187, count: 5, longest_s: 88, last_ts: now - 1800 },
              slots: [
                { l: 2, m: 1, len_ms: 21000, demo: 0 },
                { l: 3, m: 2, len_ms: 47000, demo: 1 },
                { l: 4, m: 1, len_ms: 88000, demo: 0 }
              ] }
          ],
          cards: {
            '04A1B2': { name: 'Caf\u00e9', stats: { total_s: 74, count: 2, longest_s: 44, last_ts: now - 10800 },
              slots: [ { i: 1, full: 1, len_ms: 30000, name: 'Ordering' },
                       { i: 2, full: 1, len_ms: 44000, name: '' } ] },
            '04C9D7': { name: '', stats: { total_s: 45, count: 1, longest_s: 45, last_ts: now - 86400 },
              slots: [ { i: 1, full: 1, len_ms: 45000, name: 'At the desk' } ] }
          }
        }
      },
      faces: {
        'B-91A0C4E2': {
          1: { url: demoFace('#FFCC00', 'M26 50 q14 12 28 0'), config: { demo: 1 } },
          3: { url: demoFace('#4FC3F7', 'M26 54 q14 -10 28 0'), config: { demo: 1 } }
        }
      }
    };
  }

  function setDemo(on) {
    if (on === demo) return;
    if (on) {
      realState = state; realFaces = faces; realKits = kits;
      kits = { kits: {}, design: null, catalogue: (kits && kits.catalogue) || [] };
      var d = demoData();
      state = d.state; faces = d.faces;
      demo = true;
      if (!publicDemo) {
        setStatus('Demo mode is on — these are sample kits. Nothing you change here is saved.', 'ok');
      }
    } else {
      state = realState || {}; faces = realFaces || {};
      kits = realKits || null;
      realState = realFaces = realKits = null;
      demo = false;
      closeKit();
      setStatus('Demo mode is off.', 'ok');
    }
    var btn = document.getElementById('md-demo-toggle');
    if (btn) btn.textContent = demo ? 'Leave demo mode' : 'Enter demo mode';
    var bar = document.getElementById('md-demo-bar');
    if (bar) bar.classList.toggle('is-on', demo);
    if (root) root.classList.toggle('md-is-demo', demo && !publicDemo);
    render();
  }
  var SR = 16000;

  var port = null, reader = null, writer = null;
  var lineBuf = '';
  var waiters = [];          // {test, resolve, reject, timer}
  var state = {};            // sunucudan gelen cihaz verisi
  var faces = {};            // md_faces: { devUid: { slot: {config,url,name} } }

  var root, listEl, statusEl;

  /* ---------------- yardimcilar ---------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* A message answers the thing that was just done, so it belongs where that
     happened. The shelf's status line sits behind the overlay — a refusal shown
     there is a refusal nobody sees. */
  function setStatus(msg, kind) {
    var pop = modalRoot && modalRoot.querySelector('.md-pop-msg');
    if (pop) {
      pop.hidden = !msg;
      pop.textContent = msg || '';
      pop.className = 'md-pop-msg md-status' + (kind ? ' md-status-' + kind : '');
      if (msg && pop.scrollIntoView) pop.scrollIntoView({ block: 'nearest' });
      return;
    }
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
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function safeName(s) {
    return (s || '').replace(/[^\wğüşıöçĞÜŞİÖÇ .-]/g, '').trim() || null;
  }

  /* ---------------- REST ---------------- */

  function api(path, body) {
    // Demo mode mutates the in-memory sample data and resolves as the server
    // would, so the same UI code paths run without writing anything.
    if (demo) return demoApi(path, body);

    return fetch(MD.rest + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': MD.nonce },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
    }).then(function (r) { return r.json(); });
  }

  function demoApi(path, body) {
    var res = { ok: true };
    if (path === 'faces' && body) {
      if (!faces[body.dev]) faces[body.dev] = {};
      faces[body.dev][body.slot] = {
        config: body.config,
        url: (body.image && body.image.indexOf('data:image') === 0)
               ? body.image
               : (faces[body.dev][body.slot] || {}).url || demoFace('#B0BEC5', 'M26 50 q14 8 28 0')
      };
      res.faces = faces;
    } else if (path === 'faces') {
      res = faces;
    } else if (path === 'forget') {
      delete state[body.dev];
    }
    return new Promise(function (r) { setTimeout(function () { r(res); }, 220); });
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
    if (demo) {
      setStatus('Leave demo mode before connecting a real kit.', 'err');
      return;
    }
    if (!('serial' in navigator)) {
      setStatus('This browser cannot talk to USB devices. Open the page in Chrome, Edge or Opera ' +
                'on a desktop computer.', 'err');
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

  /* A short chirp standing in for a real recording, so demo downloads produce
     a WAV that actually plays. */
  function demoSamples(ms) {
    var n = Math.max(1, Math.round(SR * Math.min(ms || 1500, 6000) / 1000));
    var out = new Array(n);
    for (var i = 0; i < n; i++) {
      var t = i / SR;
      var env = Math.min(1, t * 8) * Math.min(1, (n - i) / SR * 8);
      out[i] = Math.round(9000 * env * Math.sin(2 * Math.PI * (240 + 90 * Math.sin(t * 2.2)) * t));
    }
    return out;
  }

  function demoDump(fileName, ms, btn) {
    var label = btn.textContent, step = 0;
    btn.disabled = true;
    var iv = setInterval(function () {
      step += 20;
      btn.textContent = Math.min(99, step) + '%';
    }, 90);
    return new Promise(function (r) {
      setTimeout(function () {
        clearInterval(iv);
        btn.disabled = false;
        btn.textContent = label;
        downloadWav(demoSamples(ms), fileName);
        setStatus(fileName + ' downloaded (demo audio).', 'ok');
        r(true);
      }, 700);
    });
  }

  function dumpSlot(slotNo, fileName, btn) {
    if (demo) {
      var sl = null, keys = Object.keys(state);
      for (var i = 0; i < keys.length && !sl; i++) {
        (state[keys[i]].slots || []).forEach(function (x) { if (x.i === slotNo && x.full) sl = x; });
      }
      return demoDump(fileName, sl ? sl.len_ms : 2000, btn);
    }
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
    if (demo) { demoDump(fileName, 3000, btn); return; }
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
    if (demo) {
      var lbl = btn.textContent, pct = 0;
      btn.disabled = true;
      var iv = setInterval(function () {
        pct += 25;
        btn.textContent = 'Transferring ' + Math.min(100, pct) + '%';
        if (pct >= 100) {
          clearInterval(iv);
          btn.disabled = false;
          btn.textContent = lbl;
          setStatus('The face for slot ' + slotNo + ' was transferred (demo).', 'ok');
        }
      }, 220);
      return;
    }
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
  /* The four Mini-Kits. The profile is organised by kit, not by action:
     Mini-Kits → pick one → that kit's own screen. What differs between them is
     the step before a request; after that they share one lifecycle. */
  var KITS = [
    {
      slug: 'mini-designs', code: '', colour: 'green',
      name: 'Mini-Designs',
      tagline: 'Buildable scenes for Mini-Talks.',
      pre: 'catalogue', cta: 'Choose your Mini-Designs',
      art: '<svg viewBox="0 0 64 64" aria-hidden="true">' +
           '<rect x="5" y="20" width="26" height="26" rx="4" class="a2"/>' +
           '<rect x="33" y="20" width="26" height="26" rx="4" class="a1"/>' +
           '<rect x="5" y="48" width="26" height="12" rx="4" class="a1"/>' +
           '<rect x="33" y="48" width="26" height="12" rx="4" class="a2"/>' +
           '<rect x="11" y="14" width="7" height="6" rx="2.5" class="a2"/>' +
           '<rect x="21" y="14" width="7" height="6" rx="2.5" class="a2"/>' +
           '<rect x="39" y="14" width="7" height="6" rx="2.5" class="a1"/>' +
           '<rect x="49" y="14" width="7" height="6" rx="2.5" class="a1"/></svg>'
    },
    {
      slug: 'design-talks', code: 'D', colour: 'yellow',
      name: 'Design-Talks',
      tagline: 'Turn Mini-Designs into interactive communication experiences.',
      pre: '', cta: 'Request Design-Talks',
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
    },
    {
      slug: 'brick-talks', code: 'B', colour: 'blue',
      name: 'Brick-Talks',
      tagline: 'Bring personalized characters to life through voice and animation.',
      pre: '', cta: 'Request Brick-Talks',
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
      slug: 'fig-talks', code: 'F', colour: 'red',
      name: 'Fig-Talks',
      tagline: 'A personalized figure designed to represent the child.',
      pre: 'personalize', cta: 'Personalize Fig-Talks',
      art: '<svg viewBox="0 0 64 64" aria-hidden="true">' +
           '<rect x="22" y="4" width="20" height="7" rx="3" class="a1"/>' +
           '<rect x="17" y="10" width="30" height="22" rx="7" class="a1"/>' +
           '<circle cx="26" cy="20" r="2.6" class="ink"/><circle cx="38" cy="20" r="2.6" class="ink"/>' +
           '<path d="M26 26 q6 5 12 0" class="stroke"/>' +
           '<rect x="14" y="34" width="36" height="24" rx="5" class="a2"/>' +
           '<rect x="6" y="38" width="9" height="16" rx="4" class="a2"/>' +
           '<rect x="49" y="38" width="9" height="16" rx="4" class="a2"/>' +
           '<circle cx="32" cy="45" r="4.5" class="hole"/></svg>'
    }
  ];

  function kitBySlug(slug) {
    for (var i = 0; i < KITS.length; i++) if (KITS[i].slug === slug) return KITS[i];
    return null;
  }

  var LEVELS = ['Sound', 'Word', 'Sentence', 'Dialogue'];

  function kitByCode(code) {
    if (!code) return null;
    for (var i = 0; i < KITS.length; i++) if (KITS[i].code === code) return KITS[i];
    return null;
  }

  /* The device key for a kit type, or null when the profile has none. */
  /* The device key for a kit that has hardware, or null. */
  function kitKey(kit) {
    if (!kit || !kit.code) return null;
    var keys = Object.keys(state);
    for (var i = 0; i < keys.length; i++) {
      var d = state[keys[i]];
      if ((d.type || keys[i]) === kit.code) return keys[i];
    }
    return null;
  }

  function kitStatus(kit) {
    if (!kit.code) return 'none';
    if (demo) return kitKey(kit) ? 'live' : 'new';
    if (port && liveType === kit.code) return 'live';
    return kitKey(kit) ? 'linked' : 'new';
  }

  function saveName(payload, input) {
    input.classList.add('md-saving');
    api('name', payload).then(function () {
      input.classList.remove('md-saving');
      input.classList.add('md-saved');
      setTimeout(function () { input.classList.remove('md-saved'); }, 900);
    });
  }

  function pill(status) {
    var map = {
      live:   ['md-pill md-pill-live',   'Connected'],
      linked: ['md-pill md-pill-linked', 'Not connected']
    };
    if (!map[status]) return null;
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

  /* ── shelf ──
     Four cards, kept plain. No "Not Requested" caption: that reads as a
     database column, not an invitation. The whole card opens the kit. */

  function kitCard(kit) {
    var req    = reqFor(kit.slug);
    var key    = kitKey(kit);
    var dev    = key ? state[key] : null;
    var status = kitStatus(kit);

    var card = el('article', 'md-kit md-kit-' + kit.colour +
                  (req || dev ? ' is-active' : ' is-quiet'));
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.setAttribute('aria-label', 'Open ' + kit.name);

    card.appendChild(el('div', 'md-kit-studs'));

    var brick = el('div', 'md-kit-brick');
    var body  = el('div', 'md-kit-body');

    var art = el('div', 'md-kit-art');
    var iconUrl = window.MD && MD.icons && MD.icons[kit.slug];
    if (iconUrl) {
      var icon = el('img', 'md-kit-icon');
      icon.src = iconUrl;
      icon.alt = '';
      icon.loading = 'lazy';
      icon.addEventListener('error', function () { art.innerHTML = kit.art; });
      art.appendChild(icon);
    } else {
      art.innerHTML = kit.art;
    }
    body.appendChild(art);

    var main = el('div', 'md-kit-main');
    var row  = el('div', 'md-kit-titlerow');
    row.appendChild(el('h4', 'md-kit-name', dev && dev.label ? dev.label : kit.name));
    if (req) row.appendChild(statusBadge(req));
    else if (dev) { var p = pill(status); if (p) row.appendChild(p); }
    main.appendChild(row);
    main.appendChild(el('p', 'md-kit-tagline', kit.tagline));

    if (req && req.status_note) main.appendChild(el('p', 'md-kit-line', req.status_note));
    if (req && req.submitted)   main.appendChild(el('p', 'md-fig-when', 'Submitted on ' + fmtDay(req.submitted)));

    if (dev) {
      var facts = el('div', 'md-kit-facts');
      var n = countRecordings(dev);
      facts.appendChild(fact(String(n), n === 1 ? 'recording' : 'recordings'));
      facts.appendChild(fact(fmtTotal(dev.stats && dev.stats.total_s), 'recorded'));
      facts.appendChild(fact(fmtDay(dev.last_sync), 'last sync'));
      main.appendChild(facts);
    }
    body.appendChild(main);

    var cta = el('div', 'md-kit-cta');
    var open = el('button', 'md-btn md-btn-open', cardAction(kit, req, dev));
    open.type = 'button';
    open.addEventListener('click', function (e) { e.stopPropagation(); openKit(kit.slug); });
    cta.appendChild(open);
    body.appendChild(cta);

    brick.appendChild(body);
    card.appendChild(brick);

    card.addEventListener('click', function () { openKit(kit.slug); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openKit(kit.slug); }
    });
    return card;
  }

  /* One action per state, never a menu of everything. */
  function cardAction(kit, req, dev) {
    if (!req) return dev ? 'Open kit' : 'Open';
    if (req.status === 'draft') {
      return kit.pre === 'personalize' ? 'Review your design'
           : kit.pre === 'catalogue'   ? 'Review your selection'
                                       : 'Finish your request';
    }
    if (req.status === 'connected' && dev) return 'Open kit';
    if (req.status === 'ready') return 'Connect it';
    return kit.pre === 'personalize' ? 'View My Design' : 'View Request';
  }

  function fact(value, label) {
    var f = el('div', 'md-fact');
    f.appendChild(el('strong', 'md-fact-value', String(value)));
    f.appendChild(el('span', 'md-fact-label', label));
    return f;
  }

  function renderShelf() {
    shelfEl.innerHTML = '';
    KITS.filter(function (k) { return !onlyKits || onlyKits.indexOf(k.slug) >= 0 || (k.code && onlyKits.indexOf(k.code.toLowerCase()) >= 0); })
        .forEach(function (k) { shelfEl.appendChild(kitCard(k)); });
  }

  function syncHeaderStat() {
    syncKitStat();
    var n = Object.keys(state).length;
    var box = document.getElementById('mf-stat-kits');
    if (box) { box.textContent = 'Kits: ' + n; return; }
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

  /* The member's own profile carries how many requests are in flight. */
  function syncKitStat() {
    var row = document.querySelector('.mf-stats-row');
    if (!row) return;
    var live = [];
    KITS.forEach(function (k) {
      var r = reqFor(k.slug);
      if (r && r.status !== 'draft') live.push(k.name + ': ' + r.status_label);
    });
    var box = document.getElementById('md-stat-requests');
    if (!live.length) { if (box) box.remove(); return; }
    if (!box) {
      box = el('div', 'mf-stat-box md-stat-figtalks');
      box.id = 'md-stat-requests';
      row.appendChild(box);
    }
    box.textContent = live.length === 1 ? live[0] : 'Mini-Kit requests: ' + live.length;
    box.title = live.join(' · ');
  }

  /* ── kit detail ──
     The architecture the team settled on: a kit screen has three top-level
     buttons and only three. Mini-Designs has no hardware, so it reads
     Explore | Request | My Designs; the three devices read
     Request | Connect | Manage, and everything a connected kit can do lives
     under Manage. */

  var openSlug = null, openSection = null, openManage = null;

  function kitSections(kit) {
    return kit.code ? ['request', 'connect', 'manage']
                    : ['explore', 'request', 'my-designs'];
  }

  /* What Manage holds differs per kit.
     Brick-Talks keeps one list, not three: a slot holds one Fig and one
     recording, so Figs, Slots and Recordings were the same five objects shown
     three times over — you had to match slot numbers by eye to see what
     belonged with what. One card per slot carries both. */
  function manageSections(kit) {
    if (kit.code === 'D') return ['scenes', 'recordings', 'device'];
    if (kit.code === 'B') return ['slots', 'device'];
    if (kit.code === 'F') return ['my-fig', 'recordings', 'device'];
    return [];
  }

  function sectionLabel(sec) {
    return { explore: 'Explore', request: 'Request', 'my-designs': 'My Designs',
             connect: 'Connect', manage: 'Manage',
             scenes: 'Scenes', recordings: 'Recordings', slots: 'Figs & Slots',
             device: 'Device Details',
             'my-fig': 'My Fig' }[sec] || sec;
  }

  /* Which button is live at which point in the lifecycle.
     Connect stays open for a member who owns a kit but has no request on
     record — the profiles that pre-date requests would otherwise be shut out
     of their own hardware. */
  function sectionLocked(kit, sec) {
    var req = reqFor(kit.slug), st = req ? req.status : '';

    if (!kit.code) {                       // Mini-Designs
      if (sec === 'request') return !pickedIds().length && !req;
      return false;
    }
    var linked = !!kitKey(kit);
    if (sec === 'manage')  return !linked;
    // Connected without a device record means the team marked it connected
    // before the kit ever synced. Leaving Connect shut there would strand the
    // member with no way in.
    if (sec === 'connect') return !linked && !!req && st !== 'ready' && st !== 'connected';
    return false;
  }

  function lockReason(kit, sec) {
    if (sec === 'request')  return 'Pick at least one Mini-Design in Explore first.';
    if (sec === 'connect')  return 'Available once your ' + kit.name + ' is ready to connect.';
    return 'Available once your ' + kit.name + ' is connected.';
  }

  function openKit(slug) {
    openSlug = slug;
    var kit  = kitBySlug(slug);
    var open = kitSections(kit).filter(function (sec) { return !sectionLocked(kit, sec); });
    if (open.indexOf(openSection) < 0) openSection = open[0] || kitSections(kit)[0];
    var subs = manageSections(kit);
    if (subs.indexOf(openManage) < 0) openManage = subs[0] || null;
    renderPopup();
    document.body.style.overflow = 'hidden';
  }

  function closeKit() {
    openSlug = null;
    modalRoot.innerHTML = '';
    document.body.style.overflow = '';
  }

  function gotoSection(sec) { openSection = sec; renderPopup(); }

  function renderPopup() {
    // Picking a design re-renders the popup, and rebuilding the body reset the
    // scroll to the top — so choosing the ninth scene threw you back to the
    // first. Carry the scroll position across the rebuild.
    var wasOpen = modalRoot.querySelector('.md-pop-body');
    var keepTop = wasOpen ? wasOpen.scrollTop : 0;
    var keepSec = openSection, keepSub = openManage;

    modalRoot.innerHTML = '';
    if (!openSlug) return;

    var kit  = kitBySlug(openSlug);
    var req  = reqFor(openSlug);
    var key  = kitKey(kit);
    var dev  = key ? state[key] : null;
    var live = kitStatus(kit) === 'live';

    var overlay = el('div', 'md-overlay');
    overlay.id = 'md-kit-overlay';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeKit(); });

    var wrap = el('div', 'md-popup-wrapper md-pop-' + kit.colour);
    wrap.appendChild(el('div', 'md-popup-studs'));

    var modal = el('div', 'md-popup-modal');
    var inner = el('div', 'md-popup-inner');

    var close = el('button', 'md-popup-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', closeKit);
    inner.appendChild(close);

    var head = el('header', 'md-pop-head');
    head.appendChild(el('span', 'md-pop-brick'));
    var htxt = el('div', 'md-pop-headtext');
    htxt.appendChild(el('h2', null, dev && dev.label ? dev.label : kit.name));
    var meta = el('div', 'md-pop-meta');
    if (dev) {
      if (dev.uid) meta.appendChild(el('span', 'md-uid', dev.uid));
      if (dev.fw)  meta.appendChild(el('span', 'md-fw', 'Firmware ' + dev.fw));
      meta.appendChild(el('span', 'md-sync', 'Last sync: ' + fmtDate(dev.last_sync)));
    } else {
      meta.appendChild(el('span', 'md-sync', kit.tagline));
    }
    htxt.appendChild(meta);
    head.appendChild(htxt);
    if (req) head.appendChild(statusBadge(req));
    else if (dev) { var hp = pill(kitStatus(kit)); if (hp) head.appendChild(hp); }
    inner.appendChild(head);

    if (demo) {
      inner.appendChild(el('p', 'md-pop-banner md-pop-banner-demo', publicDemo
        ? 'Preview — try anything; nothing is saved.'
        : 'Demo mode — sample data. Everything here is interactive, and nothing is saved.'));
    } else if (dev && !live) {
      inner.appendChild(el('p', 'md-pop-banner',
        'Not connected — showing the last sync. Plug the kit in to download audio, rename recordings or send Figs.'));
    }

    var secs = kitSections(kit);
    if (secs.indexOf(openSection) < 0) openSection = secs[0];
    var nav = el('nav', 'md-pop-nav');
    secs.forEach(function (sec) {
      var lock  = sectionLocked(kit, sec);
      var label = (sec === 'connect' && key) ? 'Connected \u2713' : sectionLabel(sec);
      var b = el('button', 'md-pop-navbtn' + (sec === openSection ? ' is-on' : '') + (lock ? ' is-locked' : ''),
                 label);
      b.type = 'button';
      b.disabled = lock;
      if (lock) b.title = lockReason(kit, sec);
      else b.addEventListener('click', function () { gotoSection(sec); });
      nav.appendChild(b);
    });
    inner.appendChild(nav);

    var msg = el('div', 'md-pop-msg');
    msg.hidden = true;
    inner.appendChild(msg);

    var bodyEl = el('div', 'md-pop-body');
    if      (openSection === 'explore')     renderExplore(bodyEl, kit);
    else if (openSection === 'request')     renderRequest(bodyEl, kit);
    else if (openSection === 'my-designs')  renderMyDesigns(bodyEl, kit);
    else if (openSection === 'connect')     renderConnect(bodyEl, kit, key, dev, live);
    else if (openSection === 'manage')      renderManage(bodyEl, kit, key, dev, live);
    inner.appendChild(bodyEl);

    if (dev && !publicDemo) {
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
        if (!window.confirm(demo
              ? 'Remove ' + (dev.label || kit.name) + ' from the demo shelf? Nothing real is affected.'
              : 'Remove ' + (dev.label || kit.name) + ' from your profile? ' +
                'Recordings on the kit itself are not deleted.')) return;
        if (!demo && port && liveType === kit.code) { try { send({ cmd: 'unbind' }); } catch (e) {} }
        api('forget', { dev: key }).then(function () {
          delete state[key];
          closeKit();
          render();
          setStatus('The kit was removed from your profile.', 'ok');
        });
      });
      foot.appendChild(forget);
      inner.appendChild(foot);
    }

    modal.appendChild(inner);
    wrap.appendChild(modal);
    overlay.appendChild(wrap);
    modalRoot.appendChild(overlay);

    // Only when the member is still on the same screen: moving to another
    // section should start at its top.
    if (keepTop && keepSec === openSection && keepSub === openManage) bodyEl.scrollTop = keepTop;
  }

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

  /* ══════════════ Fig-Talks personalisation ══════════════
     Not a shop. A member personalises a figure and sends the design to the
     Mini-Talks team, who get in touch. Personalise → Send My Request →
     the team contacts you. A sent request is frozen; designing again opens a
     new one, so the team never has work change under them. */

  /* ══════════════ Requests ══════════════
     Every Mini-Kit is made to order, so none of them are bought. A member opens
     a kit and asks for it; what differs is the step before the ask. After that
     all four share one lifecycle, and each screen shows the one action that
     fits where the request actually is. */

  function kitsState() { return kits || { kits: {}, design: null, catalogue: [] }; }
  function reqFor(slug) {
    var k = kitsState().kits || {};
    return (k[slug] && k[slug].request) || null;
  }

  function fmtDay(epoch) {
    if (!epoch) return '';
    return new Date(epoch * 1000).toLocaleDateString('en-GB',
      { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function statusBadge(req) {
    var b = el('span', 'md-fig-badge is-' + (req.status || 'draft'));
    b.appendChild(el('span', 'md-fig-badge-dot'));
    b.appendChild(document.createTextNode((req.status_label || req.status).toUpperCase()));
    return b;
  }

  /* Deliberately not a delivery tracker: no shipping words, no ETA. */
  function statusRail(req) {
    var steps = (req && req.steps) || [];
    if (!steps.length) return null;
    var at = 0;
    steps.forEach(function (st, i) { if (st.key === req.status) at = i; });

    var rail = el('ol', 'md-fig-rail');
    steps.forEach(function (st, i) {
      var li = el('li', 'md-fig-rail-step' + (i < at ? ' is-past' : (i === at ? ' is-now' : '')));
      li.appendChild(el('span', 'md-fig-rail-dot'));
      li.appendChild(el('span', 'md-fig-rail-label', st.label));
      rail.appendChild(li);
    });
    return rail;
  }

  function kitApi(path, body) {
    if (demo) return new Promise(function (r) { setTimeout(function () { r(demoKits(path, body)); }, 260); });
    return fetch(MD.rest + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': MD.nonce },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
    }).then(function (r) { return r.json(); });
  }

  function demoSteps(kit) {
    var first = kit.pre === 'personalize' ? 'Personalized' : (kit.pre === 'catalogue' ? 'Selected' : 'Started');
    return [{ key: 'draft', label: first }, { key: 'submitted', label: 'Submitted' },
            { key: 'contacted', label: 'Contacted' }, { key: 'preparing', label: 'Preparing' },
            { key: 'ready', label: 'Ready to Connect' }, { key: 'connected', label: 'Connected' }];
  }

  var DEMO_NOTES = {
    draft:     'Your design is still being personalized.',
    submitted: 'Your request has been shared with the Mini-Talks team.'
  };

  function demoKits(path, body) {
    var st = kitsState();
    st.kits = st.kits || {};
    if (path === 'kits/design') {
      st.design = { config: body.config, url: body.image || (st.design || {}).url };
      var cur = st.kits['fig-talks'] && st.kits['fig-talks'].request;
      if (!cur || cur.status === 'draft') {
        st.kits['fig-talks'] = { request: { kit: 'fig-talks', status: 'draft', status_label: 'Draft',
          status_note: DEMO_NOTES.draft, steps: demoSteps(kitBySlug('fig-talks')) }, editable: true };
      }
    } else if (path === 'kits/request') {
      var kit = kitBySlug(body.kit);
      var was = st.kits[body.kit] || {};
      st.kits[body.kit] = { request: { kit: body.kit, status: 'submitted', status_label: 'Submitted',
        status_note: DEMO_NOTES.submitted, steps: demoSteps(kit),
        submitted: Math.floor(Date.now() / 1000), note: body.note || '',
        designs: body.designs || [], design_names: designNames(body.designs || []) }, editable: false };
      // Keep the roll-up the real state carries, so a second demo request does
      // not hide the first.
      if (kit && kit.pre === 'catalogue') {
        var roll = st.kits[body.kit].designs = (was.designs || []).slice();
        (body.designs || []).forEach(function (id) {
          if (!roll.some(function (d) { return d.id === id; })) {
            roll.push({ id: id, status: 'submitted', status_label: 'Submitted',
                        submitted: Math.floor(Date.now() / 1000) });
          }
        });
      }
    }
    kits = st;
    return st;
  }

  function designNames(ids) {
    var out = [], cat = kitsState().catalogue || [];
    ids.forEach(function (id) {
      cat.forEach(function (d) { if (String(d.id) === String(id)) out.push(d.name); });
    });
    return out;
  }

  function openFigEditor() {
    if (!window.MDFaces || !window.MFAvatarEditor) {
      setStatus('The designer did not load on this page. Reload and try again.', 'err');
      return;
    }
    var st = kitsState();
    window.MDFaces.designFace(st.design && st.design.config, function (cfg, img) {
      kitApi('kits/design', { config: cfg, image: img }).then(function (res) {
        if (!res || !res.kits) { setStatus('The design could not be saved.', 'err'); return; }
        kits = res;
        render();
        setStatus('Your Fig-Talks design was saved.', 'ok');
      });
    }, { title: 'Create Your Fig-Talks', subtitle: 'Face · Hairstyle · Hair colour', color: 'red' });
  }

  /* Optional note, on every kit's request. */
  function noteField(existing) {
    var wrap = el('div', 'md-note-field');
    var lab  = el('label', null, 'Add a note');
    lab.appendChild(el('span', 'md-note-optional', 'Optional'));
    wrap.appendChild(lab);
    var ta = el('textarea', 'md-note-input');
    ta.rows = 3;
    ta.placeholder = 'Anything you’d like us to know?';
    ta.value = existing || '';
    wrap.appendChild(ta);
    wrap.input = ta;
    return wrap;
  }

  function sendButton(label, onSend) {
    var b = el('button', 'md-btn md-btn-primary', label);
    b.type = 'button';
    b.addEventListener('click', function () {
      var old = b.textContent;
      b.disabled = true;
      b.textContent = 'Sending…';
      onSend(function (ok, msg) {
        b.disabled = false;
        b.textContent = old;
        if (!ok) setStatus(msg || 'The request could not be sent.', 'err');
      });
    });
    return b;
  }

  function submitRequest(slug, payload, done) {
    kitApi('kits/request', Object.assign({ kit: slug }, payload)).then(function (res) {
      if (!res || !res.kits || !(res.kits[slug] && res.kits[slug].request)) {
        done(false, res && res.message); return;
      }
      kits = res;
      // The scenes are with the team now; leaving them ticked in Explore made
      // it look as though nothing had been sent.
      if (payload && payload.designs) designPick = {};
      done(true);
      render();
      setStatus('Request sent — the Mini-Talks team will be in touch.', 'ok');
    });
  }

  /* ── the Mini-Designs catalogue ──
     Every scene stays on show. Hiding what cannot be built right now would make
     Mini-Designs look far smaller than it is. */

  var designPick = {};

  /* Everything already requested, keyed by design id. A scene that is already
     with the team must not read as a fresh choice. */
  function requested(slug) {
    var k = (kitsState().kits || {})[slug || 'mini-designs'];
    var out = {};
    if (!k) return out;
    var list = k.designs;
    if (!list && k.request && k.request.designs) {
      list = k.request.designs.map(function (id) {
        return { id: id, status: k.request.status, status_label: k.request.status_label,
                 submitted: k.request.submitted };
      });
    }
    (list || []).forEach(function (d) { out[d.id] = d; });
    return out;
  }

  function designGrid(kit) {
    var cat  = kitsState().catalogue || [];
    var grid = el('div', 'md-designs');
    if (!cat.length) {
      return emptyNote('The catalogue is empty', 'Mini-Designs will appear here once the team adds them.');
    }
    var mine = requested(kit.slug);
    cat.forEach(function (d) {
      var got  = mine[d.id];
      var card = el('article', 'md-design' + (d.selectable && !got ? '' : ' is-unavailable') +
                               (designPick[d.id] ? ' is-picked' : '') + (got ? ' is-requested' : ''));
      var thumb = el('div', 'md-design-thumb');
      if (d.image) {
        var img = el('img'); img.src = d.image; img.alt = ''; img.loading = 'lazy';
        thumb.appendChild(img);
      } else {
        thumb.appendChild(el('span', 'md-face-placeholder', d.name.slice(0, 1)));
      }
      card.appendChild(thumb);
      card.appendChild(el('h5', 'md-design-name', d.name));
      if (got) {
        card.appendChild(el('span', 'md-design-flag md-design-status',
                            got.status_label || got.status));
      } else if (!d.selectable) {
        card.appendChild(el('span', 'md-design-flag', d.label));
      } else {
        var pick = el('button', 'md-btn md-btn-ghost md-btn-sm md-design-pick',
                      designPick[d.id] ? 'Selected' : 'Select');
        pick.type = 'button';
        pick.addEventListener('click', function () {
          if (designPick[d.id]) delete designPick[d.id]; else designPick[d.id] = true;
          renderPopup();
        });
        card.appendChild(pick);
      }
      grid.appendChild(card);
    });
    return grid;
  }

  function pickedIds() { return Object.keys(designPick).map(Number); }

  function designsById(ids) {
    var cat = kitsState().catalogue || [], out = [];
    (ids || []).forEach(function (id) {
      for (var i = 0; i < cat.length; i++) if (String(cat[i].id) === String(id)) { out.push(cat[i]); return; }
    });
    return out;
  }

  /* Small read-only cards, for reviewing a selection and for My Designs. */
  function designPreviews(items, extra) {
    var grid = el('div', 'md-designs md-designs-preview');
    items.forEach(function (d) {
      var card = el('article', 'md-design');
      var thumb = el('div', 'md-design-thumb');
      if (d.image) {
        var img = el('img'); img.src = d.image; img.alt = ''; img.loading = 'lazy';
        thumb.appendChild(img);
      } else {
        thumb.appendChild(el('span', 'md-face-placeholder', d.name.slice(0, 1)));
      }
      card.appendChild(thumb);
      card.appendChild(el('h5', 'md-design-name', d.name));
      if (extra) { var x = extra(d); if (x) card.appendChild(x); }
      grid.appendChild(card);
    });
    return grid;
  }

  /* ── Explore ── the catalogue, and nothing else. */
  function renderExplore(host, kit) {
    host.appendChild(el('h3', 'md-fig-title', 'Explore Mini-Designs'));
    host.appendChild(el('p', 'md-section-note',
      'Every scene is on show. Pick the ones you would like built \u2014 anything that cannot be ' +
      'built right now says so, and can be picked another time.'));
    host.appendChild(designGrid(kit));

    var picked = pickedIds();
    var bar = el('div', 'md-explore-bar');
    bar.appendChild(el('p', 'md-designs-count',
      picked.length ? picked.length + (picked.length === 1 ? ' design selected' : ' designs selected')
                    : 'Nothing selected yet.'));
    var go = el('button', 'md-btn md-btn-primary', 'Continue to Request');
    go.type = 'button';
    go.disabled = !picked.length;
    go.addEventListener('click', function () { gotoSection('request'); });
    bar.appendChild(go);
    host.appendChild(bar);
  }

  /* ── My Designs ── everything the member asked for, and where each stands.
     Read from the roll-up across all their requests, so a second request never
     hides the first. */
  function renderMyDesigns(host, kit) {
    var mine = requested(kit.slug);
    var ids  = Object.keys(mine).map(Number);
    var items = designsById(ids);

    if (!items.length) {
      host.appendChild(emptyNote('No Mini-Designs yet',
        'The scenes you request appear here with their status.'));
      var go = el('button', 'md-btn md-btn-primary md-fig-cta', 'Explore Mini-Designs');
      go.type = 'button';
      go.addEventListener('click', function () { gotoSection('explore'); });
      host.appendChild(go);
      return;
    }

    host.appendChild(el('h3', 'md-fig-title', 'My Mini-Designs'));
    host.appendChild(el('p', 'md-section-note',
      items.length + (items.length === 1 ? ' scene is' : ' scenes are') + ' with the Mini-Talks team.'));

    host.appendChild(designPreviews(items, function (d) {
      var m = mine[d.id] || {};
      var wrap = el('div', 'md-design-meta');
      wrap.appendChild(el('span', 'md-design-flag md-design-status', m.status_label || m.status || ''));
      if (m.submitted) wrap.appendChild(el('span', 'md-design-when', fmtDay(m.submitted)));
      return wrap;
    }));

    var open = el('button', 'md-btn md-btn-ghost md-fig-cta', 'View My Request');
    open.type = 'button';
    open.addEventListener('click', function () { gotoSection('request'); });
    host.appendChild(open);
  }

  /* ── the request screen ── */

  function renderRequest(host, kit) {
    var req = reqFor(kit.slug);
    var st  = kitsState();

    // A selection waiting to be sent is the whole point of this screen, so it
    // comes before any earlier request's status.
    if (kit.pre === 'catalogue' && pickedIds().length) { renderDesignReview(host, kit, req); return; }

    /* nothing asked for yet */
    if (!req) {
      host.appendChild(el('h3', 'md-fig-title', kit.pre === 'personalize'
        ? 'Create Your Fig-Talks' : 'Request ' + kit.name));
      host.appendChild(el('p', 'md-section-note', requestIntro(kit)));

      if (kit.pre === 'personalize') {
        host.appendChild(figStepList());
        var start = el('button', 'md-btn md-btn-primary md-fig-cta', kit.cta);
        start.type = 'button';
        start.addEventListener('click', openFigEditor);
        host.appendChild(start);
        return;
      }

      if (kit.pre === 'catalogue') {
        host.appendChild(emptyNote('Nothing selected yet',
          'Pick your scenes in Explore, then come back here to send the request.'));
        var back = el('button', 'md-btn md-btn-primary md-fig-cta', 'Explore Mini-Designs');
        back.type = 'button';
        back.addEventListener('click', function () { gotoSection('explore'); });
        host.appendChild(back);
        return;
      }

      var note2 = noteField('');
      host.appendChild(note2);
      var send2 = sendButton(kit.cta, function (done) {
        submitRequest(kit.slug, { note: note2.input.value }, done);
      });
      send2.classList.add('md-fig-cta');
      host.appendChild(send2);
      return;
    }

    /* designed or selected, not sent */
    if (req.status === 'draft') {
      var row = el('div', 'md-fig-review');
      if (kit.pre === 'personalize') row.appendChild(figPreview(st.design && st.design.url));

      var side = el('div', 'md-fig-review-main');
      side.appendChild(el('h3', 'md-fig-title', kit.pre === 'personalize'
        ? 'Review My Fig' : 'Review your selection'));
      side.appendChild(el('p', 'md-section-note',
        'Send your request to the Mini-Talks team. We’ll contact you about the next steps.'));

      if (kit.pre === 'personalize' && st.design && st.design.config) {
        var spec = el('dl', 'md-fig-spec');
        figSpecLines(st.design.config).forEach(function (pair) {
          spec.appendChild(el('dt', null, pair[0]));
          spec.appendChild(el('dd', null, pair[1]));
        });
        side.appendChild(spec);
      }

      var note3 = noteField(req.note);
      side.appendChild(note3);

      var acts = el('div', 'md-fig-acts');
      acts.appendChild(sendButton('Send My Request', function (done) {
        var payload = { note: note3.input.value };
        if (kit.pre === 'catalogue') payload.designs = pickedIds();
        submitRequest(kit.slug, payload, done);
      }));
      var again = el('button', 'md-btn md-btn-ghost',
        kit.pre === 'personalize' ? 'Edit Personalization' : 'Change selection');
      again.type = 'button';
      again.addEventListener('click', kit.pre === 'personalize' ? openFigEditor : function () {
        kits.kits[kit.slug] = { request: null, editable: true };
        if (kit.pre === 'catalogue') { gotoSection('explore'); return; }
        renderPopup();
      });
      acts.appendChild(again);
      side.appendChild(acts);
      row.appendChild(side);
      host.appendChild(row);
      return;
    }

    /* sent — one view, whatever stage it is at */
    var row2 = el('div', 'md-fig-review');
    if (kit.pre === 'personalize') row2.appendChild(figPreview(st.design && st.design.url));

    var main = el('div', 'md-fig-review-main');
    main.appendChild(el('h3', 'md-fig-title',
      req.status === 'submitted' ? 'Request sent!' : 'Your ' + kit.name + ' request'));
    main.appendChild(statusBadge(req));
    main.appendChild(el('p', 'md-section-note', req.status_note || ''));
    if (req.submitted) main.appendChild(el('p', 'md-fig-when', 'Submitted on ' + fmtDay(req.submitted)));

    if (req.design_names && req.design_names.length) {
      var list = el('ul', 'md-req-designs');
      req.design_names.forEach(function (n) { list.appendChild(el('li', null, n)); });
      main.appendChild(el('p', 'md-req-label', 'Your Mini-Designs'));
      main.appendChild(list);
    }
    if (req.note) {
      main.appendChild(el('p', 'md-req-label', 'Your note'));
      main.appendChild(el('p', 'md-req-note', req.note));
    }

    if (kit.code && !sectionLocked(kit, 'manage')) {
      var mn = el('div', 'md-fig-acts');
      var manage = el('button', 'md-btn md-btn-ghost', 'Manage ' + kit.name);
      manage.type = 'button';
      manage.addEventListener('click', function () { gotoSection('manage'); });
      mn.appendChild(manage);
      main.appendChild(mn);
    } else if (kit.code && !sectionLocked(kit, 'connect')) {
      var cn = el('div', 'md-fig-acts');
      var conn = el('button', 'md-btn md-btn-primary', 'Connect ' + kit.name);
      conn.type = 'button';
      conn.addEventListener('click', function () { gotoSection('connect'); });
      cn.appendChild(conn);
      main.appendChild(cn);
    }

    row2.appendChild(main);
    host.appendChild(row2);

    var rail = statusRail(req);
    if (rail) host.appendChild(rail);

    if (kit.pre === 'personalize') {
      host.appendChild(el('p', 'md-fig-foot',
        'Your sent request stays exactly as it was. Designing again starts a new request rather than changing this one.'));
    }
  }

  /* Review what was picked in Explore, and send it. An earlier request is not
     edited by this — it stays as it was sent, and this becomes a second one. */
  function renderDesignReview(host, kit, req) {
    var picked = pickedIds();
    var live   = req && req.status !== 'draft';

    host.appendChild(el('h3', 'md-fig-title', live ? 'Another request' : 'Review your selection'));
    host.appendChild(el('p', 'md-section-note', live
      ? 'Your earlier request is still with the team and is not changed by this. ' +
        'Sending these adds a second request.'
      : requestIntro(kit)));

    host.appendChild(el('p', 'md-designs-count',
      picked.length + (picked.length === 1 ? ' design selected' : ' designs selected')));
    host.appendChild(designPreviews(designsById(picked)));

    var change = el('button', 'md-btn md-btn-ghost md-btn-sm md-change-sel', 'Change selection');
    change.type = 'button';
    change.addEventListener('click', function () { gotoSection('explore'); });
    host.appendChild(change);

    var note = noteField('');
    host.appendChild(note);
    var send = sendButton('Send Request', function (done) {
      submitRequest(kit.slug, { designs: pickedIds(), note: note.input.value }, done);
    });
    send.classList.add('md-fig-cta');
    host.appendChild(send);
  }

  function requestIntro(kit) {
    if (kit.pre === 'personalize') {
      return 'Personalize your figure to create a Fig-Talks character that feels familiar and uniquely yours. ' +
             'Your Fig-Talks is made with the character you design here, so this comes first.';
    }
    if (kit.pre === 'catalogue') {
      return 'These are the scenes you picked. Add anything the team should know, then send your ' +
             'request \u2014 they will get in touch about the next steps.';
    }
    return kit.tagline + ' Every Mini-Kit is made to order, so tell the team you would like one ' +
           'and they will get in touch.';
  }

  var FIG_STEPS = ['Choose Your Face', 'Choose Your Hairstyle',
                   'Choose Your Hair Color', 'Review My Fig'];

  function figStepList() {
    var ol = el('ol', 'md-fig-steps');
    FIG_STEPS.forEach(function (label, i) {
      var li = el('li', 'md-fig-step' + (i < 3 ? '' : ' is-next'));
      li.appendChild(el('span', 'md-fig-step-no', String(i + 1)));
      li.appendChild(el('span', null, label));
      ol.appendChild(li);
    });
    return ol;
  }

  function figPreview(url) {
    var box = el('div', 'md-fig-preview');
    if (url) {
      var img = el('img');
      img.src = url;
      img.alt = 'Your Fig-Talks design';
      box.appendChild(img);
    } else {
      box.appendChild(el('span', 'md-face-placeholder', '?'));
    }
    return box;
  }

  /* ── Connect ──
     Pairing happens over the kit's USB cable: the kit sends its own id, and the
     site binds that id to this profile. That is the pairing route, and the only
     one \u2014 the kit is in the child's hands, and the cable is what they have. */
  function renderConnect(host, kit, key, dev, live) {
    if (key) {
      host.appendChild(el('h3', 'md-fig-title', (dev.label || kit.name) + ' is connected.'));
      host.appendChild(el('p', 'md-section-note', live
        ? 'The kit is plugged in right now, so everything under Manage is live.'
        : 'Linked to your profile. Plug it in when you want to download audio or send Figs.'));
      var facts = el('div', 'md-connect-facts');
      if (dev.uid) facts.appendChild(fact(dev.uid, 'Device ID'));
      if (dev.fw)  facts.appendChild(fact(dev.fw, 'Firmware'));
      facts.appendChild(fact(fmtDate(dev.connected_at || dev.last_sync), 'Connected'));
      host.appendChild(facts);

      var go = el('button', 'md-btn md-btn-primary md-fig-cta', 'Manage ' + kit.name);
      go.type = 'button';
      go.addEventListener('click', function () { gotoSection('manage'); });
      host.appendChild(go);
      return;
    }

    host.appendChild(el('h3', 'md-fig-title', 'Connect your ' + kit.name));
    host.appendChild(el('p', 'md-section-note',
      'Plug the kit into this computer with its USB cable, then press Connect. Your browser ' +
      'will ask which device to use \u2014 pick the kit, and it links itself to your profile.'));

    var ol = el('ol', 'md-fig-steps');
    ['Plug the kit in', 'Press Connect and pick the kit', 'Confirm \u2014 it is yours'].forEach(function (t, i) {
      var li = el('li', 'md-fig-step' + (i === 2 ? ' is-next' : ''));
      li.appendChild(el('span', 'md-fig-step-no', String(i + 1)));
      li.appendChild(el('span', null, t));
      ol.appendChild(li);
    });
    host.appendChild(ol);

    var b = el('button', 'md-btn md-btn-primary md-fig-cta', 'Connect ' + kit.name);
    b.type = 'button';
    if (!navigator.serial && !demo) {
      b.disabled = true;
      b.title = 'This browser cannot talk to the kit. Use Chrome or Edge on a computer.';
    }
    b.addEventListener('click', function () { connect(); });
    host.appendChild(b);

    if (!navigator.serial && !demo) {
      host.appendChild(el('p', 'md-fig-foot',
        'Connecting needs Chrome or Edge on a computer \u2014 phones and Safari cannot reach the kit yet.'));
    }
  }

  /* ── Manage ── one home for everything a connected kit can do. */
  function renderManage(host, kit, key, dev, live) {
    var subs = manageSections(kit);
    if (subs.indexOf(openManage) < 0) openManage = subs[0];

    var nav = el('nav', 'md-pop-subnav');
    subs.forEach(function (sec) {
      var b = el('button', 'md-pop-subbtn' + (sec === openManage ? ' is-on' : ''), sectionLabel(sec));
      b.type = 'button';
      b.addEventListener('click', function () { openManage = sec; renderPopup(); });
      nav.appendChild(b);
    });
    host.appendChild(nav);

    var body = el('div', 'md-manage-body');
    if      (openManage === 'device')     renderOverview(body, key, dev, live);
    else if (openManage === 'recordings') renderRecordings(body, key, dev, live);
    else if (openManage === 'slots')      renderSlots(body, key, dev, live);
    else if (openManage === 'scenes')     renderScenes(body, key, dev, live);
    else if (openManage === 'my-fig')     renderMyFig(body, kit);
    host.appendChild(body);
  }

  /* ── My Fig ── the physical figure the member designed before requesting. */
  function renderMyFig(host, kit) {
    var st  = kitsState();
    var req = reqFor(kit.slug);
    var cfg = st.design && st.design.config;

    if (!st.design && !req) {
      host.appendChild(emptyNote('No Fig yet',
        'The figure you personalize when you request your ' + kit.name + ' appears here.'));
      return;
    }

    var row = el('div', 'md-fig-review');
    row.appendChild(figPreview(st.design && st.design.url));

    var main = el('div', 'md-fig-review-main');
    main.appendChild(el('h3', 'md-fig-title', 'My Fig'));
    if (cfg) {
      var dl = el('dl', 'md-fig-spec');
      figSpecLines(cfg).forEach(function (pair) {
        dl.appendChild(el('dt', null, pair[0]));
        dl.appendChild(el('dd', null, pair[1]));
      });
      main.appendChild(dl);
    }
    if (req && req.submitted) main.appendChild(el('p', 'md-fig-when', 'Created for the request sent on ' + fmtDay(req.submitted)));
    if (req) {
      var open = el('button', 'md-btn md-btn-ghost', 'View My Request');
      open.type = 'button';
      open.addEventListener('click', function () { gotoSection('request'); });
      main.appendChild(open);
    }
    row.appendChild(main);
    host.appendChild(row);
  }

  /* The editor's config in words. Kept in step with the same read on the PHP
     side, which is what the team sees on the request. */
  var HAIR_PALETTE = ['#4D1F00', '#834400', '#E7CA63', '#000000', '#A8A8A8', '#F4F4F4', '#CC4422'];
  var HAIR_CATS = { short: 'Short', medium: 'Medium', long: 'Long', tied: 'Tied',
                    curly: 'Curly', fun: 'Fun', bun: 'Bun' };
  var COLOUR_NAMES = {
    '#000000': 'Black', '#1C1C1C': 'Black', '#4D1F00': 'Dark brown', '#5A3825': 'Dark brown',
    '#6B3E26': 'Brown', '#834400': 'Brown', '#8B5A2B': 'Light brown', '#E7CA63': 'Blond',
    '#A8A8A8': 'Grey', '#B0B0B0': 'Grey', '#F4F4F4': 'White', '#CC4422': 'Ginger',
    '#D62828': 'Red', '#274C9B': 'Blue', '#4682B4': 'Blue', '#4E8B3A': 'Green',
    '#2E7D32': 'Green', '#FF6F00': 'Orange', '#EC4899': 'Pink', '#8E63C7': 'Purple'
  };

  function colourLabel(hex) {
    if (!hex) return '';
    var k = String(hex).toUpperCase();
    if (k.charAt(0) !== '#') k = '#' + k;
    return (COLOUR_NAMES[k] || k);
  }

  function modelLabel(name, slot) {
    if (!name) return 'Default';
    var t = String(name).replace(/\.(glb|gltf)$/i, '').replace(/[_-]+/g, ' ').trim();
    if (slot) t = t.replace(new RegExp('^' + slot + '\\s+', 'i'), '') || t;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function figSpecLines(cfg) {
    var out = [];
    var cat = cfg.hairCategory ? (HAIR_CATS[cfg.hairCategory] || cfg.hairCategory) : '';
    var tex = typeof cfg.hairTextureIndex === 'number' ? cfg.hairTextureIndex : null;
    var hair = tex === 0 ? 'No hair'
             : [cat, tex !== null ? 'style ' + tex : ''].filter(Boolean).join(' \u2014 ');
    if (tex !== 0 && typeof cfg.hairColor === 'number' && HAIR_PALETTE[cfg.hairColor]) {
      hair += (hair ? ', ' : '') + colourLabel(HAIR_PALETTE[cfg.hairColor]);
    }
    out.push(['Hair', hair || '\u2014']);
    out.push(['Face', 'Eyes: ' + modelLabel(cfg.eyeModelName, 'eyes') +
                      ' \u00b7 Mouth: ' + modelLabel(cfg.mouthModelName, 'mouth')]);
    if (cfg.eyeColor)     out.push(['Eye colour', colourLabel(cfg.eyeColor)]);
    if (cfg.eyebrowColor) out.push(['Brows & lashes', colourLabel(cfg.eyebrowColor)]);
    return out;
  }

  function renderOverview(host, key, dev, live) {
    host.appendChild(statGrid(dev.stats));

    var rows = [
      ['Device ID', dev.uid || '\u2014'],
      ['Connection', live ? 'Connected' : 'Linked \u2014 not plugged in'],
      ['Connected on', fmtDate(dev.connected_at || dev.last_sync)],
      ['Firmware', dev.fw || '\u2014'],
      ['Last sync', fmtDate(dev.last_sync)]
    ];
    var dl = el('dl', 'md-fig-spec md-device-spec');
    rows.forEach(function (r) {
      dl.appendChild(el('dt', null, r[0]));
      dl.appendChild(el('dd', null, r[1]));
    });
    host.appendChild(dl);

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
    name.appendChild(el('label', null, 'Device name'));
    var input = el('input', 'md-input');
    input.type = 'text';
    input.value = dev.label || '';
    input.placeholder = kitBySlug(openSlug).name;
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
      var acts = el('div', 'md-slot-acts');
      var btn = el('button', 'md-btn md-btn-ghost md-btn-sm', 'Download');
      btn.type = 'button';
      btn.disabled = !live;
      btn.title = live ? 'Download as WAV' : 'Recordings live on the kit — connect it to download.';
      btn.addEventListener('click', function () {
        var base = safeName(slot.name) || ('slot' + slot.i);
        var dir  = folder ? safeName(folder) + ' - ' : '';
        dumpSlot(slot.i, dir + base + '.wav', btn);
      });
      acts.appendChild(btn);
      row.appendChild(acts);
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

  /* Brick-Talks: one card per slot, carrying that slot's Fig and its recording
     together. They are two halves of the same object — splitting them across
     tabs made you line up slot numbers by eye. */
  function renderSlots(host, key, dev, live) {
    var hasEditor = window.MDFaces && window.MFAvatarEditor;

    host.appendChild(el('p', 'md-section-note', hasEditor
      ? 'Each slot holds one Fig and one recording. Figs are kept on your profile, so you can keep working on them while the kit is unplugged, and send them over when you plug it in.'
      : 'Each slot holds one Fig and one recording. The avatar editor did not load on this page, so Figs cannot be designed here \u2014 reload, and check that Mini-Forum is active.'));

    var slots = dev.slots || [];
    if (!slots.length) {
      host.appendChild(emptyNote('No slots reported yet',
        'Connect the kit once so it can tell the site how many Figs it holds.'));
      return;
    }

    var list = el('div', 'md-slotcards');
    slots.forEach(function (slot) {
      var f = (faces[key] && faces[key][slot.i]) || null;
      var card = el('article', 'md-slotcard' + (slot.full ? '' : ' is-empty'));

      var thumb = el('div', 'md-face-thumb' + (f ? ' has-face' : ''));
      if (f && f.url) {
        var img = el('img');
        img.src = f.url;
        img.alt = 'Fig in slot ' + slot.i;
        thumb.appendChild(img);
      } else {
        thumb.appendChild(el('span', 'md-face-placeholder', '?'));
      }
      card.appendChild(thumb);

      var main = el('div', 'md-slotcard-main');
      var top = el('div', 'md-slotcard-top');
      top.appendChild(el('span', 'md-slot-no', String(slot.i)));

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
      top.appendChild(input);
      top.appendChild(el('span', 'md-slot-len', slot.full ? fmtDur(slot.len_ms) : 'empty'));
      main.appendChild(top);

      var acts = el('div', 'md-slotcard-acts');

      var design = el('button', 'md-btn md-btn-ghost md-btn-sm', f ? 'Change Fig' : 'Assign Fig');
      design.type = 'button';
      design.disabled = !hasEditor;
      design.addEventListener('click', function () {
        window.MDFaces.designFace(f && f.config, function (cfg, img) {
          api('faces', { dev: key, slot: slot.i, config: cfg, image: img }).then(function (res) {
            faces = res.faces || faces;
            render();
            setStatus('The Fig in slot ' + slot.i + ' was saved.', 'ok');
          });
        }, {
          title: f ? 'Change Fig' : 'Assign a Fig',
          subtitle: (dev.label || kitBySlug(openSlug).name) + ' \u00b7 Slot ' + slot.i,
          color: kitBySlug(openSlug).colour
        });
      });
      acts.appendChild(design);

      if (f) {
        var del = el('button', 'md-btn md-btn-danger md-btn-sm', 'Delete Fig');
        del.type = 'button';
        del.addEventListener('click', function () {
          if (!window.confirm('Delete the Fig in slot ' + slot.i +
                              '? The recording in that slot is not touched.')) return;
          api('faces', { dev: key, slot: slot.i, remove: true }).then(function (res) {
            faces = res.faces || faces;
            render();
            setStatus('The Fig in slot ' + slot.i + ' was deleted.', 'ok');
          });
        });
        acts.appendChild(del);
      }

      var send = el('button', 'md-btn md-btn-primary md-btn-sm', 'Send Fig');
      send.type = 'button';
      send.disabled = !live || !f;
      send.title = !f ? 'Assign a Fig to this slot first.'
                      : (!live ? 'Connect the kit to send it.' : '');
      send.addEventListener('click', function () { transferFace(key, slot.i, f && f.config, send); });
      acts.appendChild(send);

      if (slot.full) {
        var dl = el('button', 'md-btn md-btn-ghost md-btn-sm', 'Download audio');
        dl.type = 'button';
        dl.disabled = !live;
        dl.title = live ? 'Download as WAV' : 'Recordings live on the kit \u2014 connect it to download.';
        dl.addEventListener('click', function () {
          dumpSlot(slot.i, (safeName(slot.name) || ('slot' + slot.i)) + '.wav', dl);
        });
        acts.appendChild(dl);
      }

      main.appendChild(acts);
      card.appendChild(main);
      list.appendChild(card);
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

        // Demo first, Download last, so the primary action holds the same
        // right-hand position on every row.
        var acts = el('div', 'md-slot-acts');
        if (sl.demo) {
          var bd = el('button', 'md-btn md-btn-quiet md-btn-sm', 'Demo');
          bd.type = 'button';
          bd.disabled = !live;
          bd.title = 'Download the built-in demo clip for this step.';
          bd.addEventListener('click', function () { dumpScene(sc.mode, sl.l, sl.m, true, stem + ' demo.wav', bd); });
          acts.appendChild(bd);
        }
        if (sl.len_ms) {
          var b = el('button', 'md-btn md-btn-ghost md-btn-sm', 'Download');
          b.type = 'button';
          b.disabled = !live;
          b.title = live ? '' : 'Connect the kit to download.';
          b.addEventListener('click', function () { dumpScene(sc.mode, sl.l, sl.m, false, stem + '.wav', b); });
          acts.appendChild(b);
        }
        row.appendChild(acts);
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
    if (openSlug) renderPopup();
  }

  /* ── boot ── */

  var shelfEl, modalRoot;

  document.addEventListener('DOMContentLoaded', function () {
    root = document.getElementById('md-root');
    if (!root) return;
    shelfEl    = document.getElementById('md-shelf');
    statusEl   = document.getElementById('md-status');
    modalRoot  = document.getElementById('md-modal-root') || document.body;

    try { state = JSON.parse(root.dataset.initial || '{}') || {}; } catch (e) { state = {}; }
    if (Array.isArray(state)) state = {};
    try { kits = JSON.parse(root.dataset.kits || 'null'); } catch (e) { kits = null; }

    publicDemo = root.dataset.demo === '1';
    onlyKits = (root.dataset.only || '').split(',')
                 .map(function (t) { return t.trim().toLowerCase(); })
                 .filter(Boolean);
    if (!onlyKits.length) onlyKits = null;

    var demoBtn = document.getElementById('md-demo-toggle');
    if (demoBtn && window.MD && MD.admin) {
      demoBtn.addEventListener('click', function () { setDemo(!demo); });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !openSlug) return;
      // The face designer sits on top and closes itself on Escape; one press
      // should not collapse the kit popup underneath it as well.
      if (document.querySelector('.mdf-overlay')) return;
      closeKit();
    });

    if (publicDemo) { setDemo(true); return; }

    render();
    api('faces').then(function (f) {
      if (demo) { realFaces = f || {}; return; }
      faces = f || {};
      render();
    }).catch(function () {});
  });
})();
