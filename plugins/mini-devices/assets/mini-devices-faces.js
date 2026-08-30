/* ==========================================================================
   Mini Devices — Yuz tasarim + cihaza aktarim  (Version_B)
   --------------------------------------------------------------------------
   · Slot basina yuz tasarlama: mevcut mini-forum avatar editoru acilir,
     kaydetme istegi yakalanir, config md_faces[slot]'a yazilir.
     mini-forum'a HIC dokunulmaz.
   · Cihaza aktarim: MFAvatarEditor.exportFace ile base + idle + 13 agiz
     uretilir, RGB565 + RLE'ye cevrilir, WebSerial ile gonderilir.

   Cihaz dosya bicimi (/faceN.bin):
     "MTF1" | baseW u16 | baseH u16 | mX u16 | mY u16 | mW u16 | mH u16 | n u16
     ardindan n+1 blok:  blokLen u32 + RLE veri
     RLE: (count u16, color u16) ciftleri
   ========================================================================== */

(function () {
  'use strict';

  var MDF = {};
  window.MDFaces = MDF;

  /* ---------------- RGB565 + RLE ---------------- */

  function toRGB565(r, g, b) {
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
  }

  // ImageData -> RLE bayt dizisi (count u16, color u16)
  function encodeRLE(imageData) {
    var d = imageData.data;
    var n = imageData.width * imageData.height;
    var out = [];
    var run = 0, cur = -1;

    for (var i = 0; i < n; i++) {
      var p = i * 4;
      var c = toRGB565(d[p], d[p + 1], d[p + 2]);
      if (c === cur && run < 65535) { run++; continue; }
      if (cur >= 0) { out.push(run & 0xFF, run >> 8, cur & 0xFF, cur >> 8); }
      cur = c; run = 1;
    }
    if (cur >= 0) out.push(run & 0xFF, run >> 8, cur & 0xFF, cur >> 8);
    return new Uint8Array(out);
  }

  function u16(v) { return [v & 0xFF, (v >> 8) & 0xFF]; }
  function u32(v) { return [v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF]; }

  /** exportFace paketini cihaz dosyasina cevirir. */
  MDF.buildFaceFile = function (pack) {
    var frames = [];
    frames.push(pack.base);
    if (pack.mouthIdle) frames.push(pack.mouthIdle);      // seviye 0 = sessiz
    pack.mouths.forEach(function (m) { frames.push(m); });

    var blocks = frames.map(encodeRLE);
    var header = [];
    'MTF1'.split('').forEach(function (ch) { header.push(ch.charCodeAt(0)); });
    header = header
      .concat(u16(pack.width))
      .concat(u16(pack.height))
      .concat(u16(pack.mouthBox.x))
      .concat(u16(pack.mouthBox.y))
      .concat(u16(pack.mouthBox.w))
      .concat(u16(pack.mouthBox.h))
      .concat(u16(blocks.length - 1));                    // agiz karesi sayisi

    var total = header.length;
    blocks.forEach(function (b) { total += 4 + b.length; });

    var buf = new Uint8Array(total);
    var o = 0;
    buf.set(header, o); o += header.length;
    blocks.forEach(function (b) {
      buf.set(u32(b.length), o); o += 4;
      buf.set(b, o); o += b.length;
    });
    return buf;
  };

  /* ---------------- base64 ---------------- */

  var B64C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function b64Chunk(bytes, from, len) {
    var s = '';
    for (var i = from; i < from + len; i += 3) {
      var b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
      s += B64C[b0 >> 2];
      s += B64C[((b0 & 3) << 4) | ((b1 === undefined ? 0 : b1) >> 4)];
      s += (b1 === undefined) ? '=' : B64C[((b1 & 15) << 2) | ((b2 === undefined ? 0 : b2) >> 6)];
      s += (b2 === undefined) ? '=' : B64C[b2 & 63];
    }
    return s;
  }

  /* ---------------- cihaza gonder ---------------- */

  /**
   * @param {object} io  { send(obj), sendRaw(text), waitFor(test, ms) }
   */
  MDF.sendFace = function (io, slotNo, bytes, onProgress) {
    var ready = io.waitFor(function (l) {
      return l.indexOf('"ready"') >= 0 || l.indexOf('"err"') >= 0;
    }, 8000);

    return io.send({ cmd: 'face', slot: slotNo })
      .then(function () { return ready; })
      .then(function (line) {
        if (line.indexOf('"err"') >= 0) throw new Error('The kit is not ready: ' + line);

        var CH = 180;                         // 180 bayt -> 240 karakterlik satir
        var total = bytes.length;
        var sent = 0;
        var done = io.waitFor(function (l) { return l.indexOf('"ok"') >= 0; }, 300000);

        // Akis kontrolu: cihaz her satiri isleyince "." gonderiyor.
        // Onayi beklemeden yollarsak seri tampon tasip bayt dusuyordu.
        function next() {
          if (sent >= total) return io.sendRaw('EOF\n');
          var len = Math.min(CH, total - sent);
          var line = b64Chunk(bytes, sent, len) + '\n';
          var ack = io.waitFor(function (l) { return l === '.' || l.indexOf('"ok"') >= 0; }, 10000);
          sent += len;
          if (onProgress) onProgress(Math.round(sent / total * 100));
          return io.sendRaw(line)
            .then(function () { return ack; })
            .then(next);
        }

        return next().then(function () { return done; });
      })
      .then(function (line) {
        var ok = false;
        try { ok = JSON.parse(line).ok === 1; } catch (e) {}
        if (!ok) throw new Error('The kit rejected the file: ' + line);
        return true;
      });
  };

  /* ---------------- editoru ac, kaydi yakala ---------------- */

  /**
   * mini-forum avatar editorunu acar; kullanici Save'e basinca editorun
   * mf_avatar_save istegi ARAYA GIRILIR — profil avatari degismez, config
   * bizim callback'imize gelir. mini-forum dosyalarina dokunulmaz.
   */
  MDF.designFace = function (initialConfig, onSaved) {
    if (!window.MFAvatarEditor || !window.MFAvatarEditor.mount) {
      alert('The avatar editor did not load. Reload the page and try again.');
      return;
    }

    var cfgWp = window.mf_avatar_editor || {};
    var overlay = document.createElement('div');
    overlay.className = 'mdf-overlay';
    var box = document.createElement('div');
    box.className = 'mdf-modal';
    var host = document.createElement('div');
    host.className = 'mdf-editor-host';
    box.appendChild(host);

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'mdf-back';
    back.setAttribute('aria-label', 'Close the face designer without saving');
    back.innerHTML = '<span aria-hidden="true">\u2190</span> Back';
    back.addEventListener('click', function () { close(); });
    box.appendChild(back);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);

    // --- mf_avatar_save isteklerini gecici olarak yakala ---
    var origFetch = window.fetch;
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    var captured = null;

    function capture(formData) {
      try {
        var cfg = formData.get('config');
        captured = {
          config: cfg ? JSON.parse(cfg) : null,
          image: formData.get('image') || null,
        };
      } catch (e) { console.warn('[MDFaces] config okunamadi', e); }
    }

    window.fetch = function (input, init) {
      try {
        var body = init && init.body;
        if (body instanceof FormData && body.get('action') === 'mf_avatar_save') {
          capture(body);
          return Promise.resolve(new Response(
            JSON.stringify({ success: true, data: { url: captured && captured.image, version: 1 } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          ));
        }
      } catch (e) {}
      return origFetch.apply(this, arguments);
    };

    XMLHttpRequest.prototype.open = function () {
      this.__mdfUrl = arguments[1];
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      try {
        if (body instanceof FormData && body.get('action') === 'mf_avatar_save') {
          capture(body);
          var self = this;
          Object.defineProperty(self, 'readyState', { value: 4 });
          Object.defineProperty(self, 'status', { value: 200 });
          Object.defineProperty(self, 'responseText', {
            value: JSON.stringify({ success: true, data: { url: captured && captured.image } }),
          });
          setTimeout(function () {
            if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
            if (typeof self.onload === 'function') self.onload();
          }, 0);
          return;
        }
      } catch (e) {}
      return origSend.apply(this, arguments);
    };

    function restore() {
      window.fetch = origFetch;
      XMLHttpRequest.prototype.open = origOpen;
      XMLHttpRequest.prototype.send = origSend;
    }

    function close() {
      document.removeEventListener('keydown', onKey);
      try { window.MFAvatarEditor.unmount(host); } catch (e) {}
      restore();
      overlay.remove();
    }

    window.MFAvatarEditor.mount(host, {
      initialConfig: initialConfig || cfgWp.initial_config || null,
      glbBase: cfgWp.glb_base,
      bodyGlbUrl: cfgWp.body_glb_url,
      torsoId: cfgWp.torso_id,
      role: cfgWp.role,
      ajaxUrl: cfgWp.ajax_url || (window.ajaxurl || '/wp-admin/admin-ajax.php'),
      nonce: cfgWp.nonce,
      onSaveSuccess: function () {
        close();
        if (captured) onSaved(captured.config, captured.image);
      },
      onClose: close,
    });
  };
})();
