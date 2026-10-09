# -*- coding: utf-8 -*-
"""Translate the Turkish comments (and the '#'-prefixed log strings, which the
site never parses) that appear in the code the dossier quotes.

Comments and log text only: no expression, no identifier and no string that
crosses the wire is touched, so nothing here can change behaviour.
"""
import io, os, sys

ROOT = "/home/user/mini-talks"

PAIRS = [
  # ---- game client -------------------------------------------------------
  ("// ★ DEĞIŞIKLIK: prop yerine ref'ten oku (stale closure fix)",
   "// Read the level from the ref, not the prop: useFrame closes over its props once"),
  ("dpr={[1, 2]} // 3x çok aşırıydı, 2x yeterli",
   "dpr={[1, 2]} // 3x was far too heavy on the tablets this runs on; 2x is enough"),
  ("// Tone mapping SceneGLSettings component'inde sahne bazlı ayarlanıyor",
   "// Tone mapping is set per scene in the SceneGLSettings component"),
  ("// Facialhair modelinde ağız mesh'lerini işaretle (konuşurken gizlenecek)",
   "// Tag the mouth meshes inside the facial-hair model (hidden while speaking)"),
  ("// Sakal/bıyık mesh'leri → sakal olarak işaretle",
   "// Beard/moustache meshes -> tag as beard"),
  ("// Geri kalan = ağız/dudak mesh'leri",
   "// Everything else = the mouth/lip meshes"),
  ("// Referansı kaydet (lip sync toggle için)",
   "// Keep the reference, so lip sync can toggle it"),
  ("// Unlock önceliği: allUnlocked > firstNUnlocked > sadece ilki",
   "// Unlock priority: allUnlocked > firstNUnlocked > only the first"),
  ("// Custom mouth/facial hair model yükle — lip sync ile birlikte çalışacak",
   "// Load the custom mouth / facial-hair model — it runs together with lip sync"),
  ("// Önce default ağızı da ekle (lip sync FBX'leri buna bağlı)",
   "// Add the default mouth first: the lip-sync FBX clips are bound to it"),

  # ---- game API ----------------------------------------------------------
  ("// Daily limit kontrolü", "// Daily limit check"),
  ("// Bugün kazanılan reward sayısı", "// How many rewards were earned today"),
  ("// Toplam brick sayısı", "// Total brick count"),
  ("// Daha önce convert edilen medal sayısı", "// Medals already converted before now"),
  ("// Yeni convert edilmesi gereken medal sayısı", "// How many new medals are owed"),
  ("// Total medals güncelle", "// Update the medal total"),
  ("// 2. mission_completions tablosuna da ekle (geriye dönük uyumluluk için)",
   "// 2. Write to mission_completions as well (kept for backward compatibility)"),
  ("// Önce var mı kontrol et", "// Look first: is it already there?"),
  ("// Yoksa ekle", "// If not, insert it"),
  ("// Şifre kontrolü", "// Password check"),
  ("// Hesap aktif mi?", "// Is the account active?"),

  # ---- mini-devices ------------------------------------------------------
  ("// Port acilinca kart resetlenir; acilis ~1.5 sn surer.",
   "// Opening the port resets the board, and it takes ~1.5 s to come back."),
  ("// kullanici vazgecti", "// the user cancelled"),
  ("// eski firmware", "// older firmware"),
  ("// zaten bizim", "// already ours"),
  ("// baskasinin", "// someone else's"),
  ("// bagsiz", "// not bound yet"),

  # ---- firmware: comments ------------------------------------------------
  ("// SITE UYUMU: site hello cevabini \"dev\" anahtarindan tanir, yoksa 4 denemeden",
   "// SITE COMPATIBILITY: the site recognises a hello reply by its \"dev\" key and"),
  ("// sonra baglanti kesilir. uid/profile/owner da sitenin bekledigi adlar.",
   "// gives up after 4 tries. uid/profile/owner are the names it expects too."),
  ("// SITE UYUMU: \"total_s\" + uid/profile + slotlarda \"i\"/\"len_ms\" (bkz. B notu)",
   "// SITE COMPATIBILITY: \"total_s\" + uid/profile, and \"i\"/\"len_ms\" per slot (see B)"),
  ("// site bu adi gonderir", "// the site sends this name"),
  ("// duz metin komut da kabul edilir", "// a plain-text command is accepted too"),
  ("// ---- Mikrofon: I2S0, RX, 32-bit, mono, sol kanal ----",
   "// ---- Microphone: I2S0, RX, 32-bit, mono, left channel ----"),
  ("// 8 x 512 kare = ~256 ms tampon", "// 8 x 512 frames = ~256 ms of buffer"),
  ("// RX yalnizca kayit sirasinda acilir (mikrofon bosta guc tasarrufu yapar)",
   "// RX is opened only while recording (the mic draws nothing when idle)"),
  ("// ---- Amfi: I2S1, TX, 16-bit, stereo (L=R) -> BCLK 512 kHz ----",
   "// ---- Amplifier: I2S1, TX, 16-bit, stereo (L=R) -> BCLK 512 kHz ----"),
  ("// veri yokken sessizlik gonder", "// send silence when there is no data"),
  ("// kisa basis: birakma aninda", "// short press: on release"),
  ("// uzun basis: ~800 ms'de", "// long press: at ~800 ms"),
  ("// okunur, uygulanmaz", "// read, but not acted on"),
  ("// Uyku basisindan hemen uyanmamak icin butonlarin birakilmasini bekle",
   "// Wait for every button to be released: the press that slept it would wake it"),
  ("// MTF1 paketini dogrular; hata varsa aciklama dondurur, gecerliyse nullptr",
   "// Validates an MTF1 pack: returns a named reason on failure, nullptr when valid"),
  ("// Tanilama satirlari '#' ile baslar; istemci yalnizca JSON beklememeli",
   "// Diagnostic lines start with '#', so a client must not expect only JSON"),
  ("// eski karakter korunur", "// the previous face is kept"),
  ("// Sakal/biyik mesh'leri sakal olarak isaretle", "// Tag beard/moustache meshes as beard"),

  # ---- firmware: '#'-prefixed log text (never parsed by the site) --------
  ("logMsg(\"kapaniyor (uyku)\")", "logMsg(\"powering down (sleep)\")"),
  ("logMsg(\"hareketsizlik\")", "logMsg(\"idle timeout\")"),
  ("logMsg(\"ON/OFF: kapat\")", "logMsg(\"ON/OFF: power off\")"),
  ("btnLog(bi, \"bas\", -1)", "btnLog(bi, \"press\", -1)"),
  ("btnLog(bi, \"birak\", (int32_t)(now - b.pressedAt))",
   "btnLog(bi, \"release\", (int32_t)(now - b.pressedAt))"),
  ("Serial.print(\"# buton haritasi:\")", "Serial.print(\"# button map:\")"),
  ("String(\"karakter gecersiz slot \")", "String(\"face pack invalid in slot \")"),
  ("String(\"karakter yukleme hatasi: \")", "String(\"face pack upload failed: \")"),

  # ---- firmware: faceValidate reason codes --------------------------------
  # The site only tests whether an "err" key is present, never its value, and
  # the firmware only logs them, so these are local names.
  ("return \"acilamadi\";",      "return \"open_failed\";"),
  ("return \"kisa_dosya\";",     "return \"short_file\";"),
  ("return \"baslik\";",         "return \"bad_header\";"),
  ("return \"taban_boyutu\";",   "return \"base_size\";"),
  ("return \"kare_sayisi\";",    "return \"frame_count\";"),
  ("return \"agiz_alani\";",     "return \"mouth_area\";"),
  ("return \"eksik_blok\";",     "return \"missing_block\";"),
  ("return \"blok_uzunlugu\";",  "return \"block_length\";"),
  ("return \"okuma\";",          "return \"read_failed\";"),
  ("return \"saglama\";",        "return \"checksum\";"),
  ("return \"fazla_veri\";",     "return \"trailing_data\";"),
]

TREES = ["game", "game-api", "mini-kits-firmware",
         os.path.join("plugins", "mini-devices")]
EXTS = (".js", ".jsx", ".php", ".ino")

hits = {}
touched = []
for tree in TREES:
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, tree)):
        dirnames[:] = [d for d in dirnames if d not in ("node_modules", "dist", "vendor", ".git")]
        for fn in filenames:
            if not fn.endswith(EXTS):
                continue
            p = os.path.join(dirpath, fn)
            s = io.open(p, encoding="utf-8", errors="strict").read()
            orig = s
            for a, b in PAIRS:
                if a in s:
                    hits[a] = hits.get(a, 0) + s.count(a)
                    s = s.replace(a, b)
            if s != orig:
                io.open(p, "w", encoding="utf-8").write(s)
                touched.append(os.path.relpath(p, ROOT))

print("files changed: %d" % len(touched))
for t in sorted(touched):
    print("  " + t)
missing = [a for (a, b) in PAIRS if a not in hits]
print("\nreplacements applied: %d of %d" % (len(PAIRS) - len(missing), len(PAIRS)))
if missing:
    print("NOT FOUND (left alone):")
    for m in missing:
        print("  " + m)
