/*
 * ============================================================
 *  Design-Talks Firmware - ESP32-S3 N8
 *  Surum: DT-S3-1.0.0
 *  Davranis referansi: DT-FW-SPEC-001
 *  Ses altyapisi: Fig-Talks / Brick-Talks (donanimda dogrulanmis)
 * ============================================================
 *  Arduino IDE ayarlari:
 *    Board            : ESP32S3 Dev Module (esp32 by Espressif 3.3.x)
 *    USB CDC On Boot  : Enabled
 *    USB Mode         : Hardware CDC and JTAG
 *    Flash Size       : 8MB (64Mb)
 *    Partition Scheme : 8M with spiffs (varsayilan yeterli)
 *    PSRAM            : Disabled
 *  Ek kutuphane gerekmez (RC522 surucusu bu dosyada).
 *
 *  Sesler ve profil SD kartta tutulur:
 *    /voice/<mod>/L<1..4>/M<1..2>/user.wav | demo.wav | user.tmp
 *    /voice/<mod>/stats.json      /owner.json
 *    <mod> = "default" veya "scene_<etiket>"
 * ============================================================
 */

#include <Arduino.h>
#include <FS.h>
#include <SD.h>
#include <LittleFS.h>
#include <SPI.h>
#include <math.h>
#include <time.h>
#include <sys/time.h>
#include "driver/i2s_std.h"
#include "driver/gpio.h"
#include "esp_sleep.h"
#include "freertos/stream_buffer.h"

// ======================= AYARLAR =======================
#define FW_VERSION          "DT-S3-1.0.11"  // 1.0.11 seviye LED'leri (buton ile ortak pin) · 1.0.10 buton sirasi (ON/OFF-DEMO-RECORD-PLAY) + buton logu · 1.0.1 site · 1.0.2 uyku + tik + tek haneli etiket · 1.0.3 RC522 SD'den once · 1.0.4 SD yoksa gecici dahili hafiza · 1.0.5 SD hatasi sonrasi SPI/RC522 · 1.0.6 MIFARE Classic + kartla uyanma · 1.0.7 CRC ve uyku sayaci · 1.0.8 etiket geri okuma · 1.0.9 dahili hafizada WAV baslik/yerlestirme duzeltmesi
#define DEVICE_NAME         "Design-Talks"

#define LED_ACTIVE_HIGH     true
#define USE_LIGHT_SLEEP     true
#define NO_SLEEP_ON_USB     true
// 1.0.4 — GECICI: SD kart yoksa ayni klasor yapisi ve WAV bicimiyle dahili
// hafizaya (LittleFS, ~1.5 MB ~ 45 sn ses) yazilir. SD takilinca otomatik SD
// kullanilir; SD geldikten sonra 0 yapilabilir.
#define FLASH_FALLBACK      1
// 1.0.6 — uykudayken kart okutulunca uyan. Pille (light sleep) RFID_SLEEP_POLL_MS'de
// bir kisa uyanip kart bakar; USB takiliyken surekli bakar.
#define RFID_WAKE           1
#define RFID_SLEEP_POLL_MS  500
// 1.0.2 — USB bilgisayara takiliyken otomatik uykuya hic girme
#define NO_AUTO_SLEEP_ON_USB true
// 1.0.2 — hareketsizlikte otomatik uyku suresi (dakika)
#define AUTO_SLEEP_MIN      10
// 1.0.2 — kayit bas/son TIK kirpma
#define REC_TRIM_START_MS   300     // basta atilan: mikrofon acilis + filtre oturma tiki (eskisi 100)
#define REC_TRIM_END_MS     500     // sonda kesilen: RECORD tusuna basis + birakis tiki
#define REC_FADE_OUT_MS     40      // kesim noktasinda yumusak kapanis
#define ONOFF_HOLD_SLEEPS   true    // ON/OFF uzun basis uykuya alir (sartname disi ek)

#define MIC_SHIFT           16      // mikrofon hassasiyeti (Fig-Talks'ta ayarlandi)
#define REC_GAIN_X100       400
#define PLAY_GAIN_X100      220     // sartname: PLAY_GAIN = 2.2
#define NOISE_GATE_RMS      0
#define TONE_AMP            8000

#define SD_HZ               8000000
#define RFID_HZ             4000000
#define RFID_SCAN_MS        300     // READY'de kart tarama araligi

// ----------------------- Pinler -----------------------
// Ses (Fig-Talks ile ayni)
static const int8_t PIN_MIC_SCK   = 1;
static const int8_t PIN_MIC_WS    = 5;
static const int8_t PIN_MIC_SD    = 2;
static const int8_t PIN_AMP_BCLK  = 7;
static const int8_t PIN_AMP_LRC   = 14;
static const int8_t PIN_AMP_DIN   = 21;
static const int8_t PIN_AMP_SD    = 15;

// Ortak SPI (SD + RC522)
static const int8_t PIN_SPI_SCK   = 12;
static const int8_t PIN_SPI_MOSI  = 11;
static const int8_t PIN_SPI_MISO  = 13;
static const int8_t PIN_SD_CS     = 10;
static const int8_t PIN_RC_CS     = 16;
static const int8_t PIN_RC_RST    = 17;

// Butonlar (INPUT_PULLUP, basinca LOW)
static const int8_t PIN_BTN_ONOFF    = 40;
// 1.0.10: 4'lu kart soldan saga ON/OFF - DEMO - RECORD - PLAY olacak sekilde
// PLAY ile DEMO yer degistirdi (kartta 2. konum IO41, 4. konum IO3).
static const int8_t PIN_BTN_PLAY     = 3;
static const int8_t PIN_BTN_RECORD   = 48;
static const int8_t PIN_BTN_DEMO     = 41;
static const int8_t PIN_BTN_SOUND    = 9;    // IO10 SD CS'e gitti
static const int8_t PIN_BTN_WORD     = 18;
static const int8_t PIN_BTN_SENTENCE = 8;
static const int8_t PIN_BTN_DIALOGUE = 6;    // IO13 MISO oldugu icin degistirildi
static const int8_t PIN_BTN_MINI1    = 38;
static const int8_t PIN_BTN_MINI2    = 39;

// LED'ler (GPIO->direnc->LED->GND). -1 = bagli degil
static const int8_t PIN_LED_ONOFF    = 36;
static const int8_t PIN_LED_PLAY     = 47;   // 1.0.10: buton ile birlikte yer degistirdi
static const int8_t PIN_LED_RECORD   = 42;
static const int8_t PIN_LED_DEMO     = 37;
static const int8_t PIN_LED_SOUND    = -1;   // seviye LED'leri: pin verilince doldurun
static const int8_t PIN_LED_WORD     = -1;
static const int8_t PIN_LED_SENTENCE = -1;
static const int8_t PIN_LED_DIALOGUE = -1;
static const int8_t PIN_LED_MINI1    = 4;
static const int8_t PIN_LED_MINI2    = 35;

// 1.0.10: buton logu. 1 = her basis/birakis ve hattaki kisa darbeler (gurultu)
// Serial'e "# btn..." satiri olarak yazilir. {"cmd":"pins"} anlik pin durumunu verir.
#define BTN_LOG             1

// 1.0.11: seviye LED'leri. Ana kartta seviye LED'leri icin ayri pin yok; H4
// soketinde her seviye hatti iki kez var (3=10 IO9, 4=11 IO18, 5=12 IO8, 8=13 IO6).
// Buton ve LED ayni GPIO'ya baglanir: secili seviyenin pini HIGH surulur (LED yanar),
// basis pin HIGH surulurken pedin LOW'a cekilmesinden okunur. Pull-up ile okuma
// LED yuku yuzunden kararsiz kaldigi icin kullanilmaz.
// 0 = eski davranis (seviye butonlari duz INPUT_PULLUP, seviye LED'i yok)
#define LEVEL_LED_SHARED    1
static const uint32_t LVL_SAMPLE_MS = 4;      // secili olmayan seviyeler bu aralikla okunur

// ----------------------- Sabitler -----------------------
static const uint32_t SR          = 16000;
static const uint32_t DEBOUNCE_MS = 20;
static const uint32_t LONG_PRESS_MS = 800;
static const uint32_t IDLE_SLEEP_MS = (uint32_t)AUTO_SLEEP_MIN * 60UL * 1000UL;   // 1.0.2: 5 dk -> ayarlanabilir

// Seviye basina kayit siniri (saniye): L1 SOUND, L2 WORD, L3 SENTENCE, L4 DIALOGUE
static const uint16_t LEVEL_SEC[4] = { 10, 10, 20, 60 };
static const char *LEVEL_NAME[4]   = { "SOUND", "WORD", "SENTENCE", "DIALOGUE" };

static const size_t CAP_STREAM_BYTES = 48000;   // ~1.5 sn PCM tamponu
static const size_t SD_WRITE_CHUNK   = 4096;

// ======================= VERI TIPLERI =======================
typedef int16_t txs_t;

struct MicProc {
  int32_t xPrev = 0;
  int32_t yPrev = 0;
  bool    init  = false;
};

struct MicLevel {
  int32_t  peak    = 0;
  uint64_t sumSq   = 0;
  uint32_t count   = 0;
  uint32_t clipped = 0;
};

struct CaptureCtx {
  volatile bool     run     = false;
  volatile bool     done    = false;
  volatile bool     i2sErr  = false;
  volatile uint32_t samples = 0;
  volatile uint32_t dropped = 0;
};

struct WavInfo {
  bool     ok       = false;
  uint32_t dataOff  = 0;
  uint32_t dataLen  = 0;
  uint32_t rate     = 0;
  uint16_t channels = 0;
  uint16_t bits     = 0;
};

struct ModeStats {
  uint32_t totalS   = 0;
  uint32_t count    = 0;
  uint32_t longestS = 0;
  uint32_t lastTs   = 0;
};

// Buton indeksleri (LED'ler ayni sirada)
enum {
  B_ONOFF = 0, B_PLAY, B_RECORD, B_DEMO,
  B_SOUND, B_WORD, B_SENTENCE, B_DIALOGUE,
  B_MINI1, B_MINI2, B_COUNT
};

enum : uint8_t { EVB_SHORT = 1, EVB_HOLD = 2, EVB_LONGREL = 4 };
static const uint8_t EVB_RELEASE = EVB_SHORT | EVB_LONGREL;

struct Button {
  int8_t   pin;
  bool     rawPressed;
  bool     pressed;
  bool     suppress;
  bool     holdFired;
  uint32_t rawChangedAt;
  uint32_t pressedAt;
  uint8_t  events;
  uint16_t glitch;      // 1.0.10: kararli olmayan ham degisim sayisi
};

enum State {
  ST_READY, ST_DEMO_PLAYING, ST_RECORDING, ST_FINALIZING,
  ST_USER_PLAYING, ST_SLEEPING
};

// ======================= DURUM =======================
State    state = ST_READY;
bool     sdOk  = false;          // 1.0.4: "depolama hazir" anlaminda (SD veya dahili)
fs::FS  *store = &SD;           // 1.0.4: aktif depolama
bool     storeFlash = false;    // 1.0.4: true = SD yok, dahili hafiza kullaniliyor
uint32_t recSampleCap = 0xFFFFFFFF;   // 1.0.4: dahili hafizada bos alana gore kayit siniri
#define STORE (*store)

uint8_t  curLevel = 1;          // 1..4
uint8_t  curMini  = 1;          // 1..2
bool     sceneMode = false;
String   sceneId;               // scene_<etiket> icin etiket kismi
String   pendingTagWrite;       // "W D01" ile bekleyen NTAG yazimi

uint32_t lastActivity = 0;
uint32_t sleepQuietSince = 0;
uint32_t lastScan = 0;

String   deviceId;
String   profileId;
String   profileName;
uint32_t boundAt = 0;

static uint8_t  ioBuf[512];
static int32_t  rxBuf[256];
static int16_t  pcmBuf[256];

// ======================= BUTONLAR =======================
Button buttons[B_COUNT] = {
  { PIN_BTN_ONOFF }, { PIN_BTN_PLAY }, { PIN_BTN_RECORD }, { PIN_BTN_DEMO },
  { PIN_BTN_SOUND }, { PIN_BTN_WORD }, { PIN_BTN_SENTENCE }, { PIN_BTN_DIALOGUE },
  { PIN_BTN_MINI1 }, { PIN_BTN_MINI2 }
};

const int8_t LED_PINS[B_COUNT] = {
  PIN_LED_ONOFF, PIN_LED_PLAY, PIN_LED_RECORD, PIN_LED_DEMO,
  PIN_LED_SOUND, PIN_LED_WORD, PIN_LED_SENTENCE, PIN_LED_DIALOGUE,
  PIN_LED_MINI1, PIN_LED_MINI2
};

const char *BTN_NAME[B_COUNT] = {
  "ON/OFF", "PLAY", "RECORD", "DEMO",
  "SOUND", "WORD", "SENTENCE", "DIALOGUE",
  "MINI1", "MINI2"
};

void btnLog(uint8_t i, const char *what, int32_t ms) {
#if BTN_LOG
  Serial.printf("# btn: %s (IO%d) %s", BTN_NAME[i], buttons[i].pin, what);
  if (ms >= 0) Serial.printf(" %ldms", (long)ms);
  Serial.println();
#endif
}

void printButtonMap() {
  Serial.print("# buton haritasi:");
  for (uint8_t i = 0; i < B_COUNT; i++) {
    if (buttons[i].pin < 0) continue;
    Serial.printf(" %s=IO%d", BTN_NAME[i], buttons[i].pin);
  }
  Serial.println();
}

// ---------- 1.0.11: seviye butonu + LED ortak pin ----------
#if LEVEL_LED_SHARED
static bool     lvlLed[4]  = { false, false, false, false };
static bool     lvlLast[4] = { false, false, false, false };
static uint32_t lvlSampleAt = 0;

static inline gpio_num_t lvlPin(uint8_t i) { return (gpio_num_t)buttons[B_SOUND + i].pin; }

// Ornekler arasi durum: secili ise HIGH (LED yanik), degilse LOW (LED sonuk)
void lvlIdle(uint8_t i) {
  gpio_num_t p = lvlPin(i);
  gpio_pullup_dis(p);
  gpio_set_drive_capability(p, GPIO_DRIVE_CAP_0);   // basisda kisa devre akimi dusuk kalsin
  gpio_set_level(p, lvlLed[i] ? 1 : 0);
  gpio_set_direction(p, GPIO_MODE_INPUT_OUTPUT);
}

void lvlInitPins() {
  for (uint8_t i = 0; i < 4; i++) if (buttons[B_SOUND + i].pin >= 0) lvlIdle(i);
}

// Uyku oncesi: GPIO uyandirma icin duz INPUT_PULLUP
void lvlPrepareSleep() {
  for (uint8_t i = 0; i < 4; i++) {
    if (buttons[B_SOUND + i].pin < 0) continue;
    gpio_num_t p = lvlPin(i);
    gpio_set_direction(p, GPIO_MODE_INPUT);
    gpio_pullup_en(p);
  }
}

// true = basili. Pin HIGH surulurken buton GND'ye cekerse ped LOW okunur.
bool lvlRead(uint8_t i, uint32_t now) {
  gpio_num_t p = lvlPin(i);
  if (lvlLed[i]) {                       // zaten HIGH suruluyor
    lvlIdle(i);
    lvlLast[i] = (gpio_get_level(p) == 0);
    return lvlLast[i];
  }
  if (now - lvlSampleAt < LVL_SAMPLE_MS && !lvlLast[i]) return lvlLast[i];
  gpio_set_drive_capability(p, GPIO_DRIVE_CAP_0);
  gpio_set_direction(p, GPIO_MODE_INPUT_OUTPUT);
  gpio_set_level(p, 1);
  delayMicroseconds(4);
  lvlLast[i] = (gpio_get_level(p) == 0);
  gpio_set_level(p, 0);
  return lvlLast[i];
}

void lvlLedSet(uint8_t i, bool on) {
  lvlLed[i] = on;
  if (buttons[B_SOUND + i].pin >= 0) lvlIdle(i);
}
#endif

bool btnRaw(uint8_t i, uint32_t now) {
#if LEVEL_LED_SHARED
  if (i >= B_SOUND && i <= B_DIALOGUE) return lvlRead(i - B_SOUND, now);
#endif
  return digitalRead(buttons[i].pin) == LOW;
}

// {"cmd":"pins"}: 1 = serbest (HIGH), 0 = basili (LOW)
void printPins() {
  Serial.print("{\"pins\":{");
  bool first = true;
  for (uint8_t i = 0; i < B_COUNT; i++) {
    if (buttons[i].pin < 0) continue;
    Serial.printf("%s\"%s\":{\"io\":%d,\"v\":%d}", first ? "" : ",", BTN_NAME[i],
                  buttons[i].pin, btnRaw(i, millis()) ? 0 : 1);
    first = false;
  }
  Serial.println("}}");
}

void updateButtons() {
  uint32_t now = millis();
  for (uint8_t i = 0; i < B_COUNT; i++) {
    Button &b = buttons[i];
    if (b.pin < 0) continue;
    bool raw = btnRaw(i, now);
    if (raw != b.rawPressed) {
      b.rawPressed = raw; b.rawChangedAt = now;
      if (b.glitch < 0xFFFF) b.glitch++;
    }
    if (raw != b.pressed && (now - b.rawChangedAt) >= DEBOUNCE_MS) {
      b.pressed = raw;
      b.glitch = 0;
      if (raw) { b.pressedAt = now; b.suppress = false; b.holdFired = false; btnLog(i, "bas", -1); }
      else {
        btnLog(i, "birak", (int32_t)(now - b.pressedAt));
        if (!b.suppress)
          b.events |= (now - b.pressedAt >= LONG_PRESS_MS) ? EVB_LONGREL : EVB_SHORT;
      }
    }
    if (b.pressed && !b.suppress && !b.holdFired && (now - b.pressedAt) >= LONG_PRESS_MS) {
      b.holdFired = true;
      b.events |= EVB_HOLD;
    }
  }
#if LEVEL_LED_SHARED
  if (now - lvlSampleAt >= LVL_SAMPLE_MS) lvlSampleAt = now;
#endif
#if BTN_LOG
  // Kararli basisa donusmeyen kisa darbeler: hat bosta / kablo temassiz / komsu hattan sizma
  static uint32_t lastNoise = 0;
  if (now - lastNoise >= 1000) {
    lastNoise = now;
    for (uint8_t i = 0; i < B_COUNT; i++) {
      Button &b = buttons[i];
      if (b.pin < 0 || b.glitch < 2 || b.pressed || b.rawPressed) continue;
      Serial.printf("# btn-gurultu: %s (IO%d) %u darbe\n", BTN_NAME[i], b.pin, b.glitch);
      b.glitch = 0;
    }
  }
#endif
}

uint8_t takeEvent(uint8_t idx) {
  uint8_t e = buttons[idx].events;
  buttons[idx].events = 0;
  return e;
}

void clearButtonEvents() {
  for (auto &b : buttons) {
    b.events = 0;
    if (b.pressed) b.suppress = true;
  }
}

bool anyButtonHeld() {
  for (auto &b : buttons) if (b.pressed || b.rawPressed) return true;
  return false;
}

// ======================= LED =======================
void ledSet(uint8_t idx, bool on) {
#if LEVEL_LED_SHARED
  if (idx >= B_SOUND && idx <= B_DIALOGUE) { lvlLedSet(idx - B_SOUND, on); return; }
#endif
  int8_t pin = LED_PINS[idx];
  if (pin < 0) return;
  bool level = LED_ACTIVE_HIGH ? on : !on;
  digitalWrite(pin, level ? HIGH : LOW);
}

void ledsAllOff() {
  for (uint8_t i = 0; i < B_COUNT; i++) ledSet(i, false);
}

// Secim LED'leri: seviye + MINI. Islem oncesi, sirasinda ve sonrasinda yanik kalir.
void refreshSelectionLeds() {
  for (uint8_t i = 0; i < 4; i++) ledSet(B_SOUND + i, (curLevel - 1) == i);
  ledSet(B_MINI1, curMini == 1);
  ledSet(B_MINI2, curMini == 2);
  ledSet(B_ONOFF, state != ST_SLEEPING);     // cihaz acik gostergesi
}

void actionLed(uint8_t idx, bool on) {
  ledSet(idx, on);                            // islem bitince yalnizca bu soner
}

// ======================= YARDIMCILAR =======================
void logMsg(const String &msg) {
  Serial.print("# ");
  Serial.println(msg);
}

void serialWriteAll(const uint8_t *d, size_t n) {
  size_t off = 0;
  uint32_t t0 = millis();
  while (off < n && millis() - t0 < 3000) {
    size_t w = Serial.write(d + off, n - off);
    off += w;
    if (!w) delay(1);
  }
}

uint32_t nowEpoch() {
  time_t t = time(nullptr);
  return (t > 1600000000) ? (uint32_t)t : 0;
}

String jsonEscape(const String &s) {
  String o;
  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '"' || c == '\\') { o += '\\'; o += c; }
    else if ((uint8_t)c >= 0x20) o += c;
  }
  return o;
}

String jsonStr(const String &s, const char *key) {
  String k = String("\"") + key + "\"";
  int i = s.indexOf(k);
  if (i < 0) return "";
  i = s.indexOf(':', i + k.length());
  if (i < 0) return "";
  i++;
  int len = (int)s.length();
  while (i < len && s[i] == ' ') i++;
  if (i >= len) return "";
  if (s[i] == '"') {
    String out;
    i++;
    while (i < len) {
      char c = s[i++];
      if (c == '\\' && i < len) { out += s[i++]; continue; }
      if (c == '"') break;
      out += c;
    }
    return out;
  }
  int j = i;
  while (j < len && (isDigit(s[j]) || s[j] == '-' || s[j] == '.')) j++;
  return s.substring(i, j);
}

double jsonNum(const String &s, const char *key, double def) {
  String v = jsonStr(s, key);
  return v.length() ? v.toDouble() : def;
}

// ======================= SD YOLLARI =======================
String modeKey() {
  return sceneMode ? (String("scene_") + sceneId) : String("default");
}

String modeDir(const String &mk)  { return String("/voice/") + mk; }
String slotDir(const String &mk, uint8_t level, uint8_t mini) {
  return modeDir(mk) + "/L" + level + "/M" + mini;
}
String userPath(const String &mk, uint8_t l, uint8_t m) { return slotDir(mk, l, m) + "/user.wav"; }
String demoPath(const String &mk, uint8_t l, uint8_t m) { return slotDir(mk, l, m) + "/demo.wav"; }
String tmpPath (const String &mk, uint8_t l, uint8_t m) { return slotDir(mk, l, m) + "/user.tmp"; }
String statsPath(const String &mk) { return modeDir(mk) + "/stats.json"; }

bool sdExists(const String &p) { return sdOk && STORE.exists(p); }

size_t sdSize(const String &p) {
  if (!sdExists(p)) return 0;
  File f = STORE.open(p, FILE_READ);
  if (!f) return 0;
  size_t s = f.size();
  f.close();
  return s;
}

void ensureDir(const String &p) {
  if (!STORE.exists(p)) STORE.mkdir(p);
}

// Secili adresin klasorlerini hazirla
bool ensureSlotDirs(const String &mk, uint8_t level, uint8_t mini) {
  if (!sdOk) return false;
  ensureDir("/voice");
  ensureDir(modeDir(mk));
  ensureDir(modeDir(mk) + "/L" + level);
  ensureDir(slotDir(mk, level, mini));
  return STORE.exists(slotDir(mk, level, mini));
}

bool writeTextFile(const String &path, const String &content) {
  if (!sdOk) return false;
  File f = STORE.open(path, FILE_WRITE);
  if (!f) return false;
  size_t w = f.print(content);
  f.close();
  return w == content.length();
}

String readTextFile(const String &path) {
  if (!sdExists(path)) return "";
  File f = STORE.open(path, FILE_READ);
  if (!f) return "";
  String s = f.readString();
  f.close();
  return s;
}

// ======================= I2S =======================
i2s_chan_handle_t rxChan = nullptr;
i2s_chan_handle_t txChan = nullptr;
bool rxEnabled = false;
bool ampOn     = false;
static volatile uint32_t rxOverflows = 0;

static bool IRAM_ATTR onRxOverflow(i2s_chan_handle_t h, i2s_event_data_t *e, void *ctx) {
  rxOverflows++;
  return false;
}

bool initI2S() {
  i2s_chan_config_t rxc = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
  rxc.dma_desc_num  = 8;
  rxc.dma_frame_num = 512;
  if (i2s_new_channel(&rxc, nullptr, &rxChan) != ESP_OK) return false;

  i2s_std_config_t rcfg = {
    .clk_cfg  = I2S_STD_CLK_DEFAULT_CONFIG(SR),
    .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO),
    .gpio_cfg = {
      .mclk = I2S_GPIO_UNUSED,
      .bclk = (gpio_num_t)PIN_MIC_SCK,
      .ws   = (gpio_num_t)PIN_MIC_WS,
      .dout = I2S_GPIO_UNUSED,
      .din  = (gpio_num_t)PIN_MIC_SD,
      .invert_flags = { .mclk_inv = false, .bclk_inv = false, .ws_inv = false },
    },
  };
  rcfg.slot_cfg.slot_mask = I2S_STD_SLOT_LEFT;
  if (i2s_channel_init_std_mode(rxChan, &rcfg) != ESP_OK) return false;
  i2s_event_callbacks_t cbs = {};
  cbs.on_recv_q_ovf = onRxOverflow;
  i2s_channel_register_event_callback(rxChan, &cbs, nullptr);

  i2s_chan_config_t txc = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_1, I2S_ROLE_MASTER);
  txc.auto_clear    = true;
  txc.dma_desc_num  = 6;
  txc.dma_frame_num = 512;
  if (i2s_new_channel(&txc, &txChan, nullptr) != ESP_OK) return false;

  i2s_std_config_t tcfg = {
    .clk_cfg  = I2S_STD_CLK_DEFAULT_CONFIG(SR),
    .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO),
    .gpio_cfg = {
      .mclk = I2S_GPIO_UNUSED,
      .bclk = (gpio_num_t)PIN_AMP_BCLK,
      .ws   = (gpio_num_t)PIN_AMP_LRC,
      .dout = (gpio_num_t)PIN_AMP_DIN,
      .din  = I2S_GPIO_UNUSED,
      .invert_flags = { .mclk_inv = false, .bclk_inv = false, .ws_inv = false },
    },
  };
  if (i2s_channel_init_std_mode(txChan, &tcfg) != ESP_OK) return false;
  return i2s_channel_enable(txChan) == ESP_OK;
}

void rxStart() { if (!rxEnabled && rxChan) { i2s_channel_enable(rxChan); rxEnabled = true; } }
void rxStop()  { if (rxEnabled && rxChan) { i2s_channel_disable(rxChan); rxEnabled = false; } }

void rxFlush() {
  size_t br = 0;
  for (int i = 0; i < 50; i++) {
    if (i2s_channel_read(rxChan, rxBuf, sizeof(rxBuf), &br, 0) != ESP_OK || br == 0) break;
  }
}

// ======================= SES CIKISI =======================
void writeStereo(const txs_t *buf, size_t count) {
  size_t bw = 0;
  i2s_channel_write(txChan, buf, count * sizeof(txs_t), &bw, portMAX_DELAY);
}

void playSilence(uint32_t ms) {
  static txs_t zeros[512] = { 0 };
  uint32_t frames = SR * ms / 1000;
  while (frames > 0) {
    uint32_t n = frames > 256 ? 256 : frames;
    writeStereo(zeros, n * 2);
    frames -= n;
  }
}

void playToneAmp(uint16_t freq, uint16_t ms, int32_t amp) {
  static txs_t buf[512];
  uint32_t total = SR * ms / 1000;
  uint32_t fade  = SR / 200;
  float ph = 0.0f, inc = 2.0f * (float)M_PI * freq / SR;
  uint32_t i = 0;
  while (i < total) {
    size_t k = 0;
    while (k < 512 && i < total) {
      float env = 1.0f;
      if (i < fade)              env = (float)i / fade;
      else if (total - i < fade) env = (float)(total - i) / fade;
      txs_t v = (txs_t)(sinf(ph) * amp * env);
      buf[k++] = v;
      buf[k++] = v;
      ph += inc;
      if (ph > 2.0f * (float)M_PI) ph -= 2.0f * (float)M_PI;
      i++;
    }
    writeStereo(buf, k);
  }
}

void playTone(uint16_t freq, uint16_t ms) { playToneAmp(freq, ms, TONE_AMP); }

void audioBegin() {
  if (!ampOn) {
    digitalWrite(PIN_AMP_SD, HIGH);
    ampOn = true;
    playSilence(30);
  }
}

void audioEndTail(uint32_t tailMs) {
  playSilence(tailMs);
  digitalWrite(PIN_AMP_SD, LOW);
  ampOn = false;
}

void audioEnd() { audioEndTail(200); }

void ampMute() { digitalWrite(PIN_AMP_SD, LOW); ampOn = false; }

// ---- Sartnamedeki bip desenleri ----
void beepBoot() {
  audioBegin();
  playTone(700, 90);
  playSilence(60);
  playTone(950, 120);
  audioEnd();
}

void beepRecStart() {
  audioBegin();
  playTone(880, 130);
  playSilence(200);                  // kayit bu bekleme sonrasinda baslar
  ampMute();                         // kayit boyunca hoparlor sessiz
}

void beepRecEnd() {
  audioBegin();
  playTone(660, 90);
  playSilence(70);
  playTone(880, 110);
  audioEnd();
}

void beepScene() {
  audioBegin();
  playTone(1046, 90);
  playSilence(60);
  playTone(1318, 110);
  audioEnd();
}

void beepError() {
  audioBegin();
  playTone(300, 200);
  audioEnd();
}

void beepNotFound() {
  audioBegin();
  playTone(440, 90);
  playSilence(60);
  playTone(300, 160);
  audioEnd();
}

void beepSleep() {
  audioBegin();
  playTone(600, 120);
  playSilence(60);
  playTone(400, 180);
  audioEnd();
}

// ======================= MIKROFON ISLEME =======================
void processMicBlock(MicProc &m, const int32_t *in, int16_t *out, size_t n, MicLevel &lv) {
  uint64_t blockSq = 0;
  for (size_t i = 0; i < n; i++) {
    int32_t x = in[i] >> MIC_SHIFT;
    if (!m.init) { m.xPrev = x; m.init = true; }
    int32_t hp = x - m.xPrev + ((m.yPrev * 251) >> 8);      // ~50 Hz yuksek geciren
    m.xPrev = x;
    m.yPrev = hp;

    int32_t y = hp * REC_GAIN_X100 / 100;
    const int32_t knee = 24000;
    if (y > knee)       y = knee + (y - knee) / 4;
    else if (y < -knee) y = -knee + (y + knee) / 4;
    if (y > 32767)  { y = 32767;  lv.clipped++; }
    if (y < -32768) { y = -32768; lv.clipped++; }

    out[i] = (int16_t)y;
    int32_t a = y < 0 ? -y : y;
    if (a > lv.peak) lv.peak = a;
    blockSq += (uint64_t)((int64_t)y * y);
  }
  lv.sumSq += blockSq;
  lv.count += n;

#if NOISE_GATE_RMS > 0
  if (n) {
    uint32_t r = (uint32_t)sqrt((double)blockSq / n);
    if (r < NOISE_GATE_RMS) for (size_t i = 0; i < n; i++) out[i] /= 4;
  }
#endif
}

void printLevel(const MicLevel &lv) {
  uint32_t rms = lv.count ? (uint32_t)sqrt((double)lv.sumSq / lv.count) : 0;
  Serial.printf("# seviye peak=%ld rms=%lu clip=%lu tasma=%lu\n",
                (long)lv.peak, (unsigned long)rms,
                (unsigned long)lv.clipped, (unsigned long)rxOverflows);
}

// ======================= WAV =======================
void wavPutU32(uint8_t *p, uint32_t v) {
  p[0] = v; p[1] = v >> 8; p[2] = v >> 16; p[3] = v >> 24;
}
void wavPutU16(uint8_t *p, uint16_t v) { p[0] = v; p[1] = v >> 8; }

// 44 baytlik standart basligi yazar (veri uzunlugu sonra guncellenir)
bool wavWriteHeader(File &f, uint32_t dataBytes) {
  uint8_t h[44];
  memcpy(h, "RIFF", 4);
  wavPutU32(h + 4, 36 + dataBytes);
  memcpy(h + 8, "WAVEfmt ", 8);
  wavPutU32(h + 16, 16);
  wavPutU16(h + 20, 1);              // PCM
  wavPutU16(h + 22, 1);              // mono
  wavPutU32(h + 24, SR);
  wavPutU32(h + 28, SR * 2);         // byte rate
  wavPutU16(h + 32, 2);              // block align
  wavPutU16(h + 34, 16);             // bits
  memcpy(h + 36, "data", 4);
  wavPutU32(h + 40, dataBytes);
  return f.write(h, 44) == 44;
}

// Chunk'lari gezerek fmt ve data bolumlerini bulur
WavInfo wavParse(File &f) {
  WavInfo w;
  uint8_t hdr[12];
  if (f.size() < 44 || f.read(hdr, 12) != 12) return w;
  if (memcmp(hdr, "RIFF", 4) != 0 || memcmp(hdr + 8, "WAVE", 4) != 0) return w;

  uint32_t pos = 12, size = f.size();
  bool haveFmt = false;
  while (pos + 8 <= size) {
    uint8_t ch[8];
    if (!f.seek(pos) || f.read(ch, 8) != 8) break;
    uint32_t clen = (uint32_t)ch[4] | ((uint32_t)ch[5] << 8) | ((uint32_t)ch[6] << 16) | ((uint32_t)ch[7] << 24);
    uint32_t body = pos + 8;
    if (memcmp(ch, "fmt ", 4) == 0 && clen >= 16) {
      uint8_t fmt[16];
      if (f.read(fmt, 16) != 16) break;
      uint16_t tag = (uint16_t)(fmt[0] | (fmt[1] << 8));
      w.channels = (uint16_t)(fmt[2] | (fmt[3] << 8));
      w.rate     = (uint32_t)fmt[4] | ((uint32_t)fmt[5] << 8) | ((uint32_t)fmt[6] << 16) | ((uint32_t)fmt[7] << 24);
      w.bits     = (uint16_t)(fmt[14] | (fmt[15] << 8));
      if (tag != 1) return w;
      haveFmt = true;
    } else if (memcmp(ch, "data", 4) == 0) {
      w.dataOff = body;
      w.dataLen = (body + clen <= size) ? clen : (size - body);
      if (haveFmt) w.ok = (w.channels == 1 && w.bits == 16);
      return w;
    }
    pos = body + clen + (clen & 1);
  }
  return w;
}

// ======================= RC522 (yerlesik surucu) =======================
static const uint8_t RC_CommandReg   = 0x01, RC_ComIEnReg   = 0x02, RC_ComIrqReg = 0x04;
static const uint8_t RC_ErrorReg     = 0x06, RC_Status2Reg  = 0x08, RC_FIFODataReg = 0x09;
static const uint8_t RC_FIFOLevelReg = 0x0A, RC_ControlReg  = 0x0C, RC_BitFramingReg = 0x0D;
static const uint8_t RC_CollReg      = 0x0E, RC_ModeReg     = 0x11, RC_TxControlReg = 0x14;
static const uint8_t RC_TxASKReg     = 0x15, RC_CRCResultH  = 0x21, RC_CRCResultL = 0x22;
static const uint8_t RC_TModeReg     = 0x2A, RC_TPrescaler  = 0x2B, RC_TReloadH = 0x2C;
static const uint8_t RC_TReloadL     = 0x2D, RC_VersionReg  = 0x37;

static const uint8_t RC_CmdIdle = 0x00, RC_CmdCalcCRC = 0x03, RC_CmdTransceive = 0x0C, RC_CmdSoftReset = 0x0F;
static SPISettings rcSpi(RFID_HZ, MSBFIRST, SPI_MODE0);

void rcWrite(uint8_t reg, uint8_t val) {
  SPI.beginTransaction(rcSpi);
  digitalWrite(PIN_RC_CS, LOW);
  SPI.transfer((uint8_t)((reg << 1) & 0x7E));
  SPI.transfer(val);
  digitalWrite(PIN_RC_CS, HIGH);
  SPI.endTransaction();
}

uint8_t rcRead(uint8_t reg) {
  SPI.beginTransaction(rcSpi);
  digitalWrite(PIN_RC_CS, LOW);
  SPI.transfer((uint8_t)(0x80 | ((reg << 1) & 0x7E)));
  uint8_t v = SPI.transfer(0);
  digitalWrite(PIN_RC_CS, HIGH);
  SPI.endTransaction();
  return v;
}

void rcSetBits(uint8_t reg, uint8_t mask) { rcWrite(reg, rcRead(reg) | mask); }
void rcClearBits(uint8_t reg, uint8_t mask) { rcWrite(reg, rcRead(reg) & (uint8_t)~mask); }

void rcAntennaOn() {
  if (!(rcRead(RC_TxControlReg) & 0x03)) rcSetBits(RC_TxControlReg, 0x03);
}

bool rcInit() {
  pinMode(PIN_RC_CS, OUTPUT);
  digitalWrite(PIN_RC_CS, HIGH);
  pinMode(PIN_RC_RST, OUTPUT);
  digitalWrite(PIN_RC_RST, LOW);
  delay(5);
  digitalWrite(PIN_RC_RST, HIGH);
  delay(50);

  rcWrite(RC_CommandReg, RC_CmdSoftReset);
  delay(50);
  rcWrite(RC_TModeReg, 0x80);
  rcWrite(RC_TPrescaler, 0xA9);
  rcWrite(RC_TReloadH, 0x03);
  rcWrite(RC_TReloadL, 0xE8);
  rcWrite(RC_TxASKReg, 0x40);
  rcWrite(RC_ModeReg, 0x3D);
  rcAntennaOn();

  uint8_t v = rcRead(RC_VersionReg);
  Serial.printf("# RC522 surum kaydi: 0x%02X\n", v);   // 1.0.3: tani icin
  // 1.0.3: klon yongalar farkli surum dondurebiliyor (0x12, 0x15, 0x18 ...).
  // 0x00/0xFF = hat yok (baglanti/besleme sorunu); digerleri calisir kabul edilir.
  return (v != 0x00 && v != 0xFF);
}

bool rcCalcCRC(const uint8_t *data, uint8_t len, uint8_t *out) {
  rcWrite(RC_CommandReg, RC_CmdIdle);
  rcWrite(RC_ComIrqReg, 0x04);
  // 1.0.7: CRCIRq bayragi DivIrqReg'dedir (0x05) ve temizlenmiyordu. Ilk CRC'den
  // sonra bayrak acik kaldigi icin sonraki hesaplar beklenmeden ESKI sonucu
  // donduruyor, karta yanlis CRC gidiyordu (etiket yazma/okuma basarisiz).
  rcWrite(0x05, 0x04);
  rcSetBits(RC_FIFOLevelReg, 0x80);
  for (uint8_t i = 0; i < len; i++) rcWrite(RC_FIFODataReg, data[i]);
  rcWrite(RC_CommandReg, RC_CmdCalcCRC);
  uint32_t t0 = millis();
  while (millis() - t0 < 50) {
    if (rcRead(0x05) & 0x04) {                    // DivIrqReg CRCIRq
      rcWrite(RC_CommandReg, RC_CmdIdle);
      out[0] = rcRead(RC_CRCResultL);
      out[1] = rcRead(RC_CRCResultH);
      return true;
    }
  }
  return false;
}

// Transceive: gonderilen veriye gore yanit alir. rxAlign/bit sayisi icin txLastBits.
bool rcTransceive(const uint8_t *send, uint8_t sendLen, uint8_t *back, uint8_t *backLen,
                  uint8_t *validBits, uint8_t txLastBits) {
  rcWrite(RC_CommandReg, RC_CmdIdle);
  rcWrite(RC_ComIrqReg, 0x7F);
  rcSetBits(RC_FIFOLevelReg, 0x80);
  for (uint8_t i = 0; i < sendLen; i++) rcWrite(RC_FIFODataReg, send[i]);
  rcWrite(RC_BitFramingReg, txLastBits);
  rcWrite(RC_CommandReg, RC_CmdTransceive);
  rcSetBits(RC_BitFramingReg, 0x80);

  uint32_t t0 = millis();
  uint8_t irq = 0;
  while (millis() - t0 < 40) {
    irq = rcRead(RC_ComIrqReg);
    if (irq & 0x30) break;                         // RxIRq | IdleIRq
    if (irq & 0x01) return false;                  // TimerIRq
  }
  rcClearBits(RC_BitFramingReg, 0x80);
  if (!(irq & 0x30)) return false;
  if (rcRead(RC_ErrorReg) & 0x13) return false;    // Buffer/Parity/Protocol

  uint8_t n = rcRead(RC_FIFOLevelReg);
  if (n > *backLen) return false;
  for (uint8_t i = 0; i < n; i++) back[i] = rcRead(RC_FIFODataReg);
  *backLen = n;
  uint8_t bits = rcRead(RC_ControlReg) & 0x07;
  if (validBits) *validBits = bits;
  return true;
}

// 1.0.8: WUPA — HALT durumundaki karti da uyandirir (geri okuma dogrulamasi icin)
bool rcWakeupA(uint8_t *atqa) {
  uint8_t cmd = 0x52;
  uint8_t len = 2, bits = 0;
  rcWrite(RC_CollReg, 0x80);
  return rcTransceive(&cmd, 1, atqa, &len, &bits, 0x07) && len == 2;
}

bool rcRequestA(uint8_t *atqa) {
  uint8_t cmd = 0x26;                              // REQA
  uint8_t len = 2, bits = 0;
  rcWrite(RC_CollReg, 0x80);
  return rcTransceive(&cmd, 1, atqa, &len, &bits, 0x07) && len == 2;
}

static uint8_t lastSak = 0;   // 1.0.6: son secilen kartin SAK degeri

// Tek ve cift kademeli UID okuma (4 veya 7 bayt)
bool rcReadUid(uint8_t *uid, uint8_t *uidLen) {
  const uint8_t levels[2] = { 0x93, 0x95 };
  uint8_t idx = 0;
  for (uint8_t lv = 0; lv < 2; lv++) {
    uint8_t buf[9];
    buf[0] = levels[lv];
    buf[1] = 0x20;
    uint8_t rl = 5, bits = 0;
    uint8_t resp[5];
    rcWrite(RC_CollReg, 0x80);
    if (!rcTransceive(buf, 2, resp, &rl, &bits, 0) || rl != 5) return false;
    uint8_t bcc = resp[0] ^ resp[1] ^ resp[2] ^ resp[3];
    if (bcc != resp[4]) return false;

    // SELECT
    buf[0] = levels[lv];
    buf[1] = 0x70;
    memcpy(buf + 2, resp, 5);
    if (!rcCalcCRC(buf, 7, buf + 7)) return false;
    uint8_t sak[3];
    uint8_t sl = 3;
    if (!rcTransceive(buf, 9, sak, &sl, &bits, 0) || sl != 3) return false;
    lastSak = sak[0];                               // 1.0.6: kart tipi (0x08 = MIFARE Classic)

    if (resp[0] == 0x88) {                          // kademeli UID
      memcpy(uid + idx, resp + 1, 3);
      idx += 3;
    } else {
      memcpy(uid + idx, resp, 4);
      idx += 4;
      *uidLen = idx;
      return true;
    }
    if (!(sak[0] & 0x04)) { *uidLen = idx; return true; }
  }
  *uidLen = idx;
  return idx > 0;
}

void rcHalt() {
  uint8_t buf[4] = { 0x50, 0x00, 0, 0 };
  rcCalcCRC(buf, 2, buf + 2);
  uint8_t back[4];
  uint8_t bl = 0, bits = 0;
  rcTransceive(buf, 4, back, &bl, &bits, 0);
  rcClearBits(RC_Status2Reg, 0x08);
}

// NTAG/Ultralight okuma: tek komutta 16 bayt (4 sayfa) doner
bool ntagRead(uint8_t page, uint8_t *out16) {
  uint8_t buf[4] = { 0x30, page, 0, 0 };
  if (!rcCalcCRC(buf, 2, buf + 2)) return false;
  uint8_t len = 18, bits = 0;
  uint8_t resp[18];
  if (!rcTransceive(buf, 4, resp, &len, &bits, 0) || len < 16) return false;
  memcpy(out16, resp, 16);
  return true;
}

bool ntagWrite(uint8_t page, const uint8_t *data4) {
  uint8_t buf[8] = { 0xA2, page, data4[0], data4[1], data4[2], data4[3], 0, 0 };
  if (!rcCalcCRC(buf, 6, buf + 6)) return false;
  uint8_t resp[4];
  uint8_t len = 4, bits = 0;
  if (!rcTransceive(buf, 8, resp, &len, &bits, 0)) return false;
  return len >= 1 && (resp[0] & 0x0F) == 0x0A;      // ACK
}

// ---- 1.0.6: MIFARE Classic (RC522 kitleriyle gelen kart/anahtarlik) ----
// Etiket blok 4'e (sektor 1, ilk veri blogu) yazilir; fabrika anahtari FFFFFFFFFFFF.
static const uint8_t MFC_KEY[6] = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF };
static const uint8_t MFC_LABEL_BLOCK = 4;

bool isClassic() { return (lastSak & 0x08) != 0; }

bool mfcAuth(uint8_t block, const uint8_t *uid, uint8_t uidLen) {
  const uint8_t *u = uid + (uidLen >= 7 ? uidLen - 4 : 0);   // son 4 bayt (7 baytli UID icin)
  rcWrite(RC_CommandReg, RC_CmdIdle);
  rcWrite(RC_ComIrqReg, 0x7F);
  rcSetBits(RC_FIFOLevelReg, 0x80);
  rcWrite(RC_FIFODataReg, 0x60);                  // Key A ile dogrula
  rcWrite(RC_FIFODataReg, block);
  for (uint8_t i = 0; i < 6; i++) rcWrite(RC_FIFODataReg, MFC_KEY[i]);
  for (uint8_t i = 0; i < 4; i++) rcWrite(RC_FIFODataReg, u[i]);
  rcWrite(RC_CommandReg, 0x0E);                   // MFAuthent
  uint32_t t0 = millis();
  while (millis() - t0 < 40) {
    uint8_t irq = rcRead(RC_ComIrqReg);
    if (irq & 0x10) break;                        // IdleIRq
    if (irq & 0x01) return false;                 // TimerIRq
  }
  return (rcRead(RC_Status2Reg) & 0x08) != 0;     // MFCrypto1On
}

bool mfcRead(uint8_t block, uint8_t *out16) {
  uint8_t buf[4] = { 0x30, block, 0, 0 };
  if (!rcCalcCRC(buf, 2, buf + 2)) return false;
  uint8_t resp[18];
  uint8_t len = 18, bits = 0;
  if (!rcTransceive(buf, 4, resp, &len, &bits, 0) || len < 16) return false;
  memcpy(out16, resp, 16);
  return true;
}

bool mfcWrite(uint8_t block, const uint8_t *data16) {
  uint8_t buf[18] = { 0xA0, block };
  if (!rcCalcCRC(buf, 2, buf + 2)) return false;
  uint8_t resp[4];
  uint8_t len = 4, bits = 0;
  if (!rcTransceive(buf, 4, resp, &len, &bits, 0) || len < 1 || (resp[0] & 0x0F) != 0x0A) return false;
  memcpy(buf, data16, 16);
  if (!rcCalcCRC(buf, 16, buf + 16)) return false;
  len = 4;
  if (!rcTransceive(buf, 18, resp, &len, &bits, 0) || len < 1 || (resp[0] & 0x0F) != 0x0A) return false;
  return true;
}

// Karta 1-4 karakterlik etiket yaz (NTAG: sayfa 4, MIFARE Classic: blok 4)
bool tagWriteLabel(const String &label, const uint8_t *uid, uint8_t uidLen) {
  uint8_t d[16];
  memset(d, ' ', sizeof(d));
  for (uint8_t i = 0; i < 4 && i < label.length(); i++) d[i] = (uint8_t)label[i];
  if (isClassic()) {
    if (!mfcAuth(MFC_LABEL_BLOCK, uid, uidLen)) { logMsg("MIFARE dogrulama basarisiz (anahtar farkli olabilir)"); return false; }
    return mfcWrite(MFC_LABEL_BLOCK, d);
  }
  return ntagWrite(4, d);
}

// Etiketin ham 4 baytini oku
bool tagReadLabelRaw(uint8_t *out4, const uint8_t *uid, uint8_t uidLen) {
  uint8_t b[16];
  if (isClassic()) {
    if (!mfcAuth(MFC_LABEL_BLOCK, uid, uidLen) || !mfcRead(MFC_LABEL_BLOCK, b)) return false;
  } else {
    if (!ntagRead(4, b)) return false;
  }
  memcpy(out4, b, 4);
  return true;
}

// ======================= ISTATISTIK VE PROFIL =======================
ModeStats loadModeStats(const String &mk) {
  ModeStats s;
  String t = readTextFile(statsPath(mk));
  if (!t.length()) return s;
  s.totalS   = (uint32_t)jsonNum(t, "total_s", 0);
  s.count    = (uint32_t)jsonNum(t, "count", 0);
  s.longestS = (uint32_t)jsonNum(t, "longest_s", 0);
  s.lastTs   = (uint32_t)jsonNum(t, "last_ts", 0);
  return s;
}

bool saveModeStats(const String &mk, const ModeStats &s) {
  String t = "{\"total_s\":" + String(s.totalS) +
             ",\"count\":" + String(s.count) +
             ",\"longest_s\":" + String(s.longestS) +
             ",\"last_ts\":" + String(s.lastTs) + "}";
  return writeTextFile(statsPath(mk), t);
}

void makeDeviceId() {
  uint64_t mac = ESP.getEfuseMac();
  char id[16];
  snprintf(id, sizeof(id), "DT-%02X%02X%02X",
           (uint8_t)(mac >> 24), (uint8_t)(mac >> 32), (uint8_t)(mac >> 40));
  deviceId = id;
}

bool saveOwner() {
  String s = "{\"uid\":\"" + jsonEscape(deviceId) +
             "\",\"profile\":\"" + jsonEscape(profileId) +
             "\",\"owner\":\"" + jsonEscape(profileName) +
             "\",\"bound_at\":" + String(boundAt) + "}";
  return writeTextFile("/owner.json", s);
}

void loadOwner() {
  String s = readTextFile("/owner.json");
  if (!s.length()) { saveOwner(); return; }
  profileId   = jsonStr(s, "profile");
  profileName = jsonStr(s, "owner");
  boundAt     = (uint32_t)jsonNum(s, "bound_at", 0);
  if (jsonStr(s, "uid") != deviceId) saveOwner();
}

// ======================= KAYIT =======================
static CaptureCtx           cap;
static StreamBufferHandle_t capStream = nullptr;
static uint8_t              wrBuf[SD_WRITE_CHUNK];

void captureTask(void *arg) {
  static int32_t tBuf[256];
  static int16_t tPcm[256];
  MicProc  mic;
  int      timeouts = 0;
  uint32_t maxSamples = (uint32_t)LEVEL_SEC[curLevel - 1] * SR;
  if (maxSamples > recSampleCap) maxSamples = recSampleCap;   // 1.0.4: dahili hafiza siniri
  const uint32_t SETTLE = SR * REC_TRIM_START_MS / 1000;   // 1.0.2: 100 -> 300 ms
  const uint32_t FADE   = SR * 80 / 1000;                  // 1.0.2: 40 -> 80 ms
  uint32_t settled = 0, faded = 0;
  MicLevel lv;

  // 1.0.2: Son kirpma icin gecikme hatti. Ornekler REC_TRIM_END+FADE_OUT kadar
  // bekletilip SD'ye gider; kayit durunca hatta kalan son kisim (RECORD tusunun
  // basis/birakis tiki) atilir, kesim noktasi yumusak kapanir.
  static int16_t dly[(16000 * (REC_TRIM_END_MS + REC_FADE_OUT_MS)) / 1000];
  static int16_t outPcm[256];
  static int16_t fadePcm[(16000 * REC_FADE_OUT_MS) / 1000 + 1];
  const uint32_t DLY = sizeof(dly) / sizeof(dly[0]);
  uint32_t dHead = 0, dFill = 0;
  auto sendPcm = [&](const int16_t *src, size_t cnt) {
    size_t bytes = cnt * sizeof(int16_t);
    size_t sent = xStreamBufferSend(capStream, src, bytes, pdMS_TO_TICKS(20));
    if (sent < bytes) cap.dropped += (bytes - sent);
  };

  while (cap.run && cap.samples < maxSamples) {
    size_t want = sizeof(tBuf);
    uint32_t left = maxSamples - cap.samples;
    if (left * sizeof(int32_t) < want) want = left * sizeof(int32_t);

    size_t br = 0;
    esp_err_t e = i2s_channel_read(rxChan, tBuf, want, &br, 100);
    if (e != ESP_OK && br == 0) {
      if (++timeouts > 10) { cap.i2sErr = true; break; }
      continue;
    }
    timeouts = 0;
    size_t n = br / sizeof(int32_t);
    processMicBlock(mic, tBuf, tPcm, n, lv);

    if (settled < SETTLE) { settled += n; continue; }        // mikrofon oturma suresi
    for (size_t i = 0; i < n && faded < FADE; i++, faded++) {
      tPcm[i] = (int16_t)((int32_t)tPcm[i] * (int32_t)faded / (int32_t)FADE);
    }

    // gecikme hattina yaz; hat doluysa en eski ornek cikar ve SD'ye gider
    size_t oc = 0;
    for (size_t i = 0; i < n; i++) {
      if (dFill == DLY) {
        outPcm[oc++] = dly[dHead];
        dHead = (dHead + 1) % DLY;
        dFill--;
      }
      dly[(dHead + dFill) % DLY] = tPcm[i];
      dFill++;
    }
    if (oc) sendPcm(outPcm, oc);
    cap.samples += n;
  }

  // kayit bitti: hattin basindan FADE_OUT kadarini yumusak kapatarak yaz,
  // kalanini (RECORD tusu tiki) at
  {
    const uint32_t fo = (uint32_t)SR * REC_FADE_OUT_MS / 1000;
    uint32_t take = dFill < fo ? dFill : fo;
    for (uint32_t i = 0; i < take; i++) {
      int16_t v = dly[(dHead + i) % DLY];
      fadePcm[i] = (int16_t)((int32_t)v * (int32_t)(take - i) / (int32_t)take);
    }
    if (take) sendPcm(fadePcm, take);
  }
  cap.done = true;
  vTaskDelete(nullptr);
}

void backToReady() {
  state = ST_READY;
  refreshSelectionLeds();
  lastActivity = millis();
  clearButtonEvents();
}

void actionError(const char *why) {
  logMsg(String("hata: ") + why);
  beepError();
  backToReady();
}

void doRecord() {
  if (!sdOk) { actionError("sd_yok"); return; }
  if (curLevel < 1 || curLevel > 4 || curMini < 1 || curMini > 2) { actionError("gecersiz_secim"); return; }

  String mk = modeKey();                       // eylem adresi burada sabitlenir
  uint8_t level = curLevel, mini = curMini;
  if (!ensureSlotDirs(mk, level, mini)) { actionError("klasor"); return; }

  String tmp = tmpPath(mk, level, mini);
  if (STORE.exists(tmp)) STORE.remove(tmp);

  // 1.0.4: dahili hafizada bos alana gore kayit suresini sinirla
  recSampleCap = 0xFFFFFFFF;
  if (storeFlash) {
    // 1.0.9: dahili hafiza kucuk; ayni adresteki eski kayit once silinir ki
    // yeni kayda yer kalsin (gecici mod)
    String old = userPath(mk, level, mini);
    if (STORE.exists(old)) STORE.remove(old);
    size_t used = LittleFS.usedBytes(), tot = LittleFS.totalBytes();
    size_t freeB = tot > used ? tot - used : 0;
    size_t reserve = 48 * 1024;                       // klasor/istatistik payi
    uint32_t avail = freeB > reserve ? (uint32_t)((freeB - reserve) / 2) : 0;
    if (avail < SR) { actionError("hafiza_dolu"); return; }
    recSampleCap = avail;
    Serial.printf("# dahili hafiza: bos %u bayt, en fazla %lu sn kayit\n",
                  (unsigned)freeB, (unsigned long)(avail / SR));
  }
  File f = STORE.open(tmp, FILE_WRITE);
  if (!f) { actionError("dosya"); return; }
  // 1.0.9: LittleFS'te dosyanin basina geri donup basligi yeniden yazmak tum
  // dosyanin kopyalanmasini gerektiriyor (yer yetmeyince kapanmiyor, dosya acik
  // kaliyor, yerlestirme basarisiz). Dahili hafizada baslik bastan EN FAZLA
  // uzunlukla yazilir; okuyan taraf (wavParse) uzunlugu dosya boyuna kirpar.
  uint32_t hdrBytes = 0;
  if (storeFlash) {
    uint32_t ms = (uint32_t)LEVEL_SEC[level - 1] * SR;
    if (ms > recSampleCap) ms = recSampleCap;
    hdrBytes = ms * 2;
  }
  if (!wavWriteHeader(f, hdrBytes)) { f.close(); STORE.remove(tmp); actionError("baslik"); return; }

  if (!capStream) capStream = xStreamBufferCreate(CAP_STREAM_BYTES, 1);
  if (!capStream) { f.close(); STORE.remove(tmp); actionError("bellek"); return; }
  xStreamBufferReset(capStream);

  state = ST_RECORDING;
  actionLed(B_RECORD, true);
  refreshSelectionLeds();
  rxStart();
  beepRecStart();                              // 880 Hz + 200 ms sessizlik
  rxFlush();                                   // bip kayda karismasin
  clearButtonEvents();
  rxOverflows = 0;

  cap.done = false; cap.i2sErr = false; cap.samples = 0; cap.dropped = 0;
  cap.run = true;
  if (xTaskCreatePinnedToCore(captureTask, "cap", 6144, nullptr, 10, nullptr, 0) != pdPASS) {
    f.close(); STORE.remove(tmp); rxStop();
    actionLed(B_RECORD, false);
    actionError("gorev");
    return;
  }

  uint32_t dataBytes = 0;
  bool     writeErr = false;
  uint32_t t0 = millis();
  uint32_t limitMs = (uint32_t)LEVEL_SEC[level - 1] * 1000UL + 5000UL;

  while (true) {
    updateButtons();
    if (takeEvent(B_RECORD) & EVB_RELEASE) cap.run = false;
    for (uint8_t i = 0; i < B_COUNT; i++) if (i != B_RECORD) takeEvent(i);   // digerleri uygulanmaz

    if (millis() - t0 > limitMs) cap.run = false;

    size_t got = xStreamBufferReceive(capStream, wrBuf, sizeof(wrBuf), pdMS_TO_TICKS(10));
    if (got && !writeErr) {
      if (f.write(wrBuf, got) != got) { writeErr = true; cap.run = false; }
      else dataBytes += got;
    }
    if (cap.done && xStreamBufferIsEmpty(capStream)) break;
  }

  // FINALIZING: basligi tamamla, dosyayi yerine koy
  state = ST_FINALIZING;
  rxStop();
  bool ok = !writeErr && !cap.i2sErr && dataBytes > 0;
  if (ok && !storeFlash) {                     // SD'de baslik gercek uzunlukla yeniden yazilir
    if (!f.seek(0) || !wavWriteHeader(f, dataBytes)) ok = false;
  }
  f.close();

  Serial.printf("# kayit: %s L%u M%u ornek=%lu bayt=%lu tasma=%lu kayip=%lu\n",
                mk.c_str(), level, mini, (unsigned long)cap.samples,
                (unsigned long)dataBytes, (unsigned long)rxOverflows,
                (unsigned long)cap.dropped);

  if (!ok) {
    STORE.remove(tmp);
    actionLed(B_RECORD, false);
    actionError(writeErr ? "yazma" : (cap.i2sErr ? "mikrofon" : "bos_kayit"));
    return;
  }

  String dst = userPath(mk, level, mini);
  if (STORE.exists(dst)) STORE.remove(dst);
  if (!STORE.rename(tmp, dst)) {
    STORE.remove(tmp);
    actionLed(B_RECORD, false);
    actionError("yerlestirme");
    return;
  }

  uint32_t durS = dataBytes / (SR * 2);
  ModeStats st = loadModeStats(mk);
  st.count++;
  st.totalS += durS;
  if (durS > st.longestS) st.longestS = durS;
  st.lastTs = nowEpoch();
  saveModeStats(mk, st);

  beepRecEnd();
  actionLed(B_RECORD, false);                  // yalnizca eylem LED'i soner
  backToReady();                               // seviye/MINI/sahne korunur
}

// ======================= OYNATMA (DEMO ve PLAY) =======================
static uint8_t  rdBuf[1024];
static txs_t    outBuf[1024];

void playFile(const String &path, uint8_t actionIdx) {
  File f = STORE.open(path, FILE_READ);
  if (!f) { beepNotFound(); backToReady(); return; }
  WavInfo w = wavParse(f);
  if (!w.ok || w.dataLen == 0) {
    f.close();
    logMsg("wav bicimi uygun degil: " + path);
    beepError();
    backToReady();
    return;
  }

  state = (actionIdx == B_DEMO) ? ST_DEMO_PLAYING : ST_USER_PLAYING;
  actionLed(actionIdx, true);
  refreshSelectionLeds();
  clearButtonEvents();
  f.seek(w.dataOff);
  audioBegin();

  uint32_t left = w.dataLen;
  const uint32_t FADE = SR / 50;               // 20 ms yumusak giris
  uint32_t played = 0;

  while (left > 0) {
    updateButtons();
    if (takeEvent(actionIdx) & EVB_RELEASE) break;          // ayni buton durdurur
    if (takeEvent(B_RECORD) & EVB_RELEASE) break;           // RECORD yalnizca durdurur
    for (uint8_t i = 0; i < B_COUNT; i++) if (i != actionIdx && i != B_RECORD) takeEvent(i);

    uint32_t want = left > sizeof(rdBuf) ? sizeof(rdBuf) : left;
    int r = f.read(rdBuf, want);
    if (r <= 0) break;
    left -= r;

    size_t n = r / 2;
    size_t k = 0;
    for (size_t i = 0; i < n; i++) {
      int16_t s = (int16_t)(rdBuf[i * 2] | (rdBuf[i * 2 + 1] << 8));
      int32_t v = (int32_t)s * PLAY_GAIN_X100 / 100;
      if (played < FADE) { v = v * (int32_t)played / (int32_t)FADE; played++; }
      const int32_t knee = 24000;
      if (v > knee)       v = knee + (v - knee) / 4;
      else if (v < -knee) v = -knee + (v + knee) / 4;
      if (v > 32000)  v = 32000;
      if (v < -32000) v = -32000;
      outBuf[k++] = (txs_t)v;
      outBuf[k++] = (txs_t)v;
    }
    writeStereo(outBuf, k);
  }

  f.close();
  audioEnd();
  actionLed(actionIdx, false);                 // yalnizca eylem LED'i soner
  backToReady();
}

void doPlayUser() {
  if (!sdOk) { actionError("sd_yok"); return; }
  String p = userPath(modeKey(), curLevel, curMini);
  if (!STORE.exists(p)) {
    logMsg("kayit bulunamadi: " + p);
    beepNotFound();                            // secimler korunur
    backToReady();
    return;
  }
  playFile(p, B_PLAY);
}

void doPlayDemo() {
  if (!sdOk) { actionError("sd_yok"); return; }
  String p = demoPath(modeKey(), curLevel, curMini);
  if (!STORE.exists(p)) {
    logMsg("demo bulunamadi: " + p);
    beepNotFound();
    backToReady();
    return;
  }
  playFile(p, B_DEMO);
}

// ======================= SECIM =======================
void selectLevel(uint8_t level) {
  if (level < 1 || level > 4) return;
  curLevel = level;
  refreshSelectionLeds();
  ensureSlotDirs(modeKey(), curLevel, curMini);
  logMsg(String("level: ") + LEVEL_NAME[level - 1]);
  lastActivity = millis();
}

void selectMini(uint8_t mini) {
  if (mini < 1 || mini > 2) return;
  curMini = mini;
  refreshSelectionLeds();
  ensureSlotDirs(modeKey(), curLevel, curMini);
  logMsg(String("mini: ") + mini);
  lastActivity = millis();
}

// Sahne secimi: her zaman SOUND + MINI 1 ile baslar
void applyScene(const String &id) {
  sceneMode = true;
  sceneId = id;
  curLevel = 1;
  curMini  = 1;
  refreshSelectionLeds();
  ensureSlotDirs(modeKey(), 1, 1);
  logMsg("sahne: " + modeKey());
  lastActivity = millis();
}

void backToDefault() {
  if (!sceneMode) { logMsg("zaten default"); return; }
  sceneMode = false;
  sceneId = "";
  refreshSelectionLeds();                      // seviye ve MINI korunur
  ensureSlotDirs(modeKey(), curLevel, curMini);
  logMsg("default moda donuldu");
  lastActivity = millis();
}

// ======================= RFID SAHNE =======================
// Klasor adinda guvenli karakterler; en fazla 15 karakter
String sanitizeId(const String &in) {
  String o;
  for (size_t i = 0; i < in.length() && o.length() < 15; i++) {
    char c = in[i];
    bool ok = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
              (c >= '0' && c <= '9') || c == '_' || c == '-';
    if (ok) o += c;
  }
  return o;
}

String uidToHex(const uint8_t *uid, uint8_t len) {
  String s;
  char b[3];
  for (uint8_t i = 0; i < len && s.length() < 15; i++) {
    snprintf(b, sizeof(b), "%02X", uid[i]);
    s += b;
  }
  return s;
}

// Etiketin ilk dort baytindan 1..4 karakterlik etiket (NTAG sayfa 4 / MIFARE blok 4)
String readTagLabel(const uint8_t *uid, uint8_t uidLen) {
  uint8_t page[4];
  if (!tagReadLabelRaw(page, uid, uidLen)) return "";
  String t;
  for (uint8_t i = 0; i < 4; i++) {
    char c = (char)page[i];
    if (c <= 0x20 || c >= 0x7F) break;          // bosluk veya gecersiz: dur
    t += c;
  }
  if (t.length() < 1) return "";                 // 1.0.2: tek haneli etiket (1, 2 ...) de gecerli
  return sanitizeId(t);
}

// 1.0.6: kart islendiyse true doner (uykudan uyandirmak icin)
bool rfidScan() {
  uint8_t atqa[2];
  if (!rcRequestA(atqa)) return false;          // kart yok
  uint8_t uid[10] = { 0 };
  uint8_t uidLen = 0;
  lastSak = 0;
  if (!rcReadUid(uid, &uidLen) || uidLen == 0) { rcHalt(); return false; }
  const char *kind = isClassic() ? "mifare_classic" : "ntag";

  if (pendingTagWrite.length()) {
    bool ok = tagWriteLabel(pendingTagWrite, uid, uidLen);
    if (!ok) {
      // 1.0.8: bazi kartlar yazmayi tamamlayip son onayi (ACK) gec/eksik gonderiyor.
      // Karti yeniden secip etiketi geri oku; dogruysa yazma basarili sayilir.
      rcHalt();
      delay(20);
      uint8_t a2[2], u2[10] = { 0 }, l2 = 0;
      if (rcWakeupA(a2) && rcReadUid(u2, &l2) && l2 == uidLen && memcmp(u2, uid, uidLen) == 0) {
        String back = readTagLabel(u2, l2);
        ok = (back == sanitizeId(pendingTagWrite));
        if (ok) logMsg("yazma onayi gelmedi ama geri okuma dogru: etiket yazildi");
      }
    }
    Serial.printf("{\"write\":\"%s\",\"ok\":%d,\"uid\":\"%s\",\"type\":\"%s\",\"sak\":\"%02X\"}\n",
                  pendingTagWrite.c_str(), ok ? 1 : 0, uidToHex(uid, uidLen).c_str(), kind, lastSak);
    pendingTagWrite = "";
    if (ok) beepScene(); else beepError();
    rcHalt();
    lastActivity = millis();
    return true;                                // yazma isleminde sahne secilmez
  }

  String label = readTagLabel(uid, uidLen);
  String id = label.length() ? label : sanitizeId(uidToHex(uid, uidLen));
  rcHalt();
  if (!id.length()) return false;

  if (sceneMode && id == sceneId) {             // ayni kart tekrar okundu
    applyScene(id);                             // SOUND + MINI 1'e doner
  } else {
    applyScene(id);
  }
  beepScene();
  Serial.printf("{\"scene\":\"%s\",\"uid\":\"%s\",\"type\":\"%s\",\"label\":%s}\n",
                modeKey().c_str(), uidToHex(uid, uidLen).c_str(), kind, label.length() ? "true" : "false");
  clearButtonEvents();
  return true;
}

// ======================= USB KOMUTLARI =======================
uint32_t wavDurationS(const String &path) {
  size_t sz = sdSize(path);
  return sz > 44 ? (uint32_t)((sz - 44) / (SR * 2)) : 0;
}

void sendHello() {
  String s = "{\"dev\":\"D\",\"name\":\"" DEVICE_NAME "\",\"fw\":\"" FW_VERSION "\"";
  s += ",\"uid\":\"" + jsonEscape(deviceId) + "\"";
  s += ",\"profile\":\"" + jsonEscape(profileId) + "\"";
  s += ",\"owner\":\"" + jsonEscape(profileName) + "\"";
  s += ",\"bound\":" + String(profileId.length() ? "true" : "false");
  s += ",\"scenes\":1";
  s += ",\"mode\":\"" + modeKey() + "\"";
  s += ",\"level\":" + String(curLevel);
  s += ",\"mini\":" + String(curMini);
  s += ",\"sd\":" + String((sdOk && !storeFlash) ? "true" : "false");
  s += ",\"storage\":\"" + String(!sdOk ? "none" : (storeFlash ? "flash" : "sd")) + "\"";
  s += ",\"time_valid\":" + String(nowEpoch() ? "true" : "false");
  s += "}";
  Serial.println(s);
}

// SITE UYUMU: site stats'i {"uid","profile","total_s",...,"scenes":[{mode,stats,slots:[{l,m,len_ms,demo}]}]}
// biciminde bekliyor (sunucu "modes" anahtarini okumuyor, sahneler bos gorunuyordu).
// Onceki alanlar (level, mini, user, user_s, mod bazli total_s ...) korunuyor.
uint32_t wavDurationMs(const String &path) {
  size_t sz = sdSize(path);
  return sz > 44 ? (uint32_t)((uint64_t)(sz - 44) * 1000ULL / (SR * 2)) : 0;
}

void sendModeStats(const String &mk, bool &first, ModeStats &sum) {
  String slots;
  bool any = false;
  for (uint8_t l = 1; l <= 4; l++) {
    for (uint8_t m = 1; m <= 2; m++) {
      bool u = sdExists(userPath(mk, l, m));
      bool d = sdExists(demoPath(mk, l, m));
      if (!u && !d) continue;                   // bos secimler listeye girmez
      uint32_t ms = u ? wavDurationMs(userPath(mk, l, m)) : 0;
      if (any) slots += ",";
      slots += "{\"l\":" + String(l) + ",\"m\":" + String(m) +
               ",\"len_ms\":" + String(ms) +
               ",\"demo\":" + String(d ? 1 : 0) +
               ",\"level\":" + String(l) + ",\"mini\":" + String(m) +
               ",\"user\":" + String(u ? "true" : "false") +
               ",\"user_s\":" + String((ms + 500) / 1000) + "}";
      any = true;
    }
  }
  ModeStats st = loadModeStats(mk);
  sum.totalS += st.totalS;
  sum.count  += st.count;
  if (st.longestS > sum.longestS) sum.longestS = st.longestS;
  if (st.lastTs > sum.lastTs)     sum.lastTs   = st.lastTs;
  if (!first) Serial.print(",");
  first = false;
  Serial.printf("{\"mode\":\"%s\",\"stats\":{\"total_s\":%lu,\"count\":%lu,\"longest_s\":%lu,\"last_ts\":%lu},"
                "\"total_s\":%lu,\"count\":%lu,\"longest_s\":%lu,\"last_ts\":%lu,\"slots\":[%s]}",
                mk.c_str(),
                (unsigned long)st.totalS, (unsigned long)st.count,
                (unsigned long)st.longestS, (unsigned long)st.lastTs,
                (unsigned long)st.totalS, (unsigned long)st.count,
                (unsigned long)st.longestS, (unsigned long)st.lastTs, slots.c_str());
}

void sendStats() {
  Serial.print("{\"stats\":1,\"uid\":\"" + jsonEscape(deviceId) +
               "\",\"profile\":\"" + jsonEscape(profileId) + "\",\"scenes\":[");
  bool first = true;
  ModeStats sum;
  sendModeStats("default", first, sum);
  if (sdOk) {
    File dir = STORE.open("/voice");
    if (dir) {
      File e = dir.openNextFile();
      while (e) {
        String name = String(e.name());
        int sl = name.lastIndexOf('/');
        if (sl >= 0) name = name.substring(sl + 1);
        if (e.isDirectory() && name.startsWith("scene_")) sendModeStats(name, first, sum);
        e.close();
        e = dir.openNextFile();
      }
      dir.close();
    }
  }
  // cihaz toplami (profil ust satiri icin)
  Serial.printf("],\"total_s\":%lu,\"count\":%lu,\"longest_s\":%lu,\"last_ts\":%lu}\n",
                (unsigned long)sum.totalS, (unsigned long)sum.count,
                (unsigned long)sum.longestS, (unsigned long)sum.lastTs);
}

void sendDump(const String &line) {
  String mk = jsonStr(line, "scene");
  if (!mk.length()) mk = "default";
  int level = (int)jsonNum(line, "level", 1);
  int mini  = (int)jsonNum(line, "mini", 1);
  bool demo = line.indexOf("\"demo\":1") >= 0;
  if (level < 1 || level > 4 || mini < 1 || mini > 2) {
    Serial.println("{\"dump\":0,\"err\":\"adres\"}");
    Serial.println("EOF");
    return;
  }
  String p = demo ? demoPath(mk, level, mini) : userPath(mk, level, mini);
  File f = STORE.open(p, FILE_READ);
  if (!f) {
    Serial.printf("{\"dump\":0,\"err\":\"dosya_yok\",\"path\":\"%s\"}\n", p.c_str());
    Serial.println("EOF");
    return;
  }
  WavInfo w = wavParse(f);
  if (!w.ok) {
    f.close();
    Serial.println("{\"dump\":0,\"err\":\"wav\"}");
    Serial.println("EOF");
    return;
  }
  Serial.setTxTimeoutMs(500);
  Serial.printf("{\"dump\":1,\"path\":\"%s\",\"samples\":%lu,\"sr\":%lu}\n",
                p.c_str(), (unsigned long)(w.dataLen / 2), (unsigned long)w.rate);
  f.seek(w.dataOff);
  uint32_t left = w.dataLen;
  char out[2048];
  size_t ol = 0;
  while (left > 0) {
    uint32_t want = left > sizeof(rdBuf) ? sizeof(rdBuf) : left;
    int r = f.read(rdBuf, want);
    if (r <= 0) break;
    left -= r;
    for (int i = 0; i + 1 < r; i += 2) {
      int16_t s = (int16_t)(rdBuf[i] | (rdBuf[i + 1] << 8));
      ol += snprintf(out + ol, sizeof(out) - ol, "%d\n", s);
      if (ol > sizeof(out) - 16) { serialWriteAll((const uint8_t *)out, ol); ol = 0; }
    }
  }
  if (ol) serialWriteAll((const uint8_t *)out, ol);
  f.close();
  Serial.println("EOF");
  Serial.setTxTimeoutMs(50);
}

void micTest() {
  logMsg("mictest: 2 sn sessiz kalin, sonra konusun");
  rxStart();
  delay(150);
  rxFlush();
  rxOverflows = 0;
  MicProc m;
  MicLevel lv;
  uint32_t t0 = millis(), last = t0;
  while (millis() - t0 < 5000) {
    size_t br = 0;
    if (i2s_channel_read(rxChan, rxBuf, sizeof(rxBuf), &br, 100) == ESP_OK && br) {
      processMicBlock(m, rxBuf, pcmBuf, br / sizeof(int32_t), lv);
    }
    if (millis() - last >= 250) { printLevel(lv); lv = MicLevel(); last = millis(); }
  }
  rxStop();
  Serial.println("EOF");
}

void toneTest() {
  const int32_t levels[3] = { 2000, 8000, 20000 };
  for (int i = 0; i < 3; i++) {
    Serial.printf("# ton %d/3 genlik=%ld\n", i + 1, (long)levels[i]);
    audioBegin();
    playToneAmp(440, 1000, levels[i]);
    audioEndTail(300);
    delay(400);
  }
  Serial.println("EOF");
}

void handleCommand(String line) {
  line.trim();
  if (!line.length()) return;

  // "W D01": sonraki karta sahne etiketi yaz (JSON degil)
  if (line.length() > 1 && (line[0] == 'W' || line[0] == 'w') && line[1] == ' ') {
    String tag = sanitizeId(line.substring(2));
    if (tag.length() < 1 || tag.length() > 4) {
      Serial.println("{\"write\":0,\"err\":\"etiket 1-4 karakter olmali\"}");
      return;
    }
    pendingTagWrite = tag;
    Serial.printf("{\"write_pending\":\"%s\"}\n", tag.c_str());
    logMsg("karti okutun: etiket yazilacak");
    return;
  }

  String cmd = jsonStr(line, "cmd");
  if (!cmd.length()) cmd = line;
  cmd.toLowerCase();

  if (cmd == "hello")        sendHello();
  else if (cmd == "stats")   sendStats();
  else if (cmd == "dump")    sendDump(line);
  else if (cmd == "mictest") micTest();
  else if (cmd == "tonetest") toneTest();
  else if (cmd == "pins")    { printPins(); printButtonMap(); }
  else if (cmd == "bind") {
    String pid = jsonStr(line, "profile");
    String own = jsonStr(line, "owner");
    if (!pid.length()) Serial.println("{\"bind\":1,\"ok\":0,\"err\":\"profile\"}");
    else {
      profileId = pid; profileName = own; boundAt = nowEpoch();
      Serial.printf("{\"bind\":1,\"ok\":%d}\n", saveOwner() ? 1 : 0);
    }
  } else if (cmd == "unbind") {
    profileId = ""; profileName = ""; boundAt = 0;
    Serial.printf("{\"unbind\":1,\"ok\":%d}\n", saveOwner() ? 1 : 0);
  } else if (cmd == "time") {
    double ep = jsonNum(line, "epoch", 0);
    bool ok = ep > 1600000000.0;
    if (ok) { struct timeval tv = { (time_t)ep, 0 }; settimeofday(&tv, nullptr); }
    Serial.printf("{\"time\":1,\"ok\":%d,\"epoch\":%lu}\n", ok ? 1 : 0, (unsigned long)nowEpoch());
  } else {
    Serial.println("{\"err\":\"unknown_cmd\"}");
  }
}

void handleSerial() {
  static char buf[512];
  static size_t len = 0;
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      buf[len] = 0;
      String line(buf);
      len = 0;
      handleCommand(line);
      lastActivity = millis();
      clearButtonEvents();
      return;
    } else if (c != '\r') {
      if (len < sizeof(buf) - 1) buf[len++] = c;
    }
  }
}

// ======================= UYKU =======================
bool usbHostConnected() { return (bool)Serial; }

void holdOutputs(bool en) {
  for (uint8_t i = 0; i < B_COUNT; i++) {
    if (LED_PINS[i] < 0) continue;
    if (en) gpio_hold_en((gpio_num_t)LED_PINS[i]);
    else    gpio_hold_dis((gpio_num_t)LED_PINS[i]);
  }
  if (en) gpio_hold_en((gpio_num_t)PIN_AMP_SD);
  else    gpio_hold_dis((gpio_num_t)PIN_AMP_SD);
}

static volatile bool gpioWoke = false;   // 1.0.2: tusla uyanildi mi

void lightSleepOnce() {
#if LEVEL_LED_SHARED
  lvlPrepareSleep();
#endif
  for (uint8_t i = 0; i < B_COUNT; i++) {
    if (buttons[i].pin >= 0) {
      // 1.0.2: uykuda INPUT_PULLUP korunsun; IDF uyku ayarina gecerse
      // pull-up kalkip tus uyandiramayabiliyordu
      gpio_sleep_sel_dis((gpio_num_t)buttons[i].pin);
      gpio_wakeup_enable((gpio_num_t)buttons[i].pin, GPIO_INTR_LOW_LEVEL);
    }
  }
  esp_sleep_enable_gpio_wakeup();
#if RFID_WAKE
  esp_sleep_enable_timer_wakeup((uint64_t)RFID_SLEEP_POLL_MS * 1000ULL);   // 1.0.6: kart kontrolu
#endif
  Serial.flush();
  holdOutputs(true);
  esp_light_sleep_start();
  holdOutputs(false);
  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
#if RFID_WAKE
  esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_TIMER);
#endif
  if (cause == ESP_SLEEP_WAKEUP_GPIO) gpioWoke = true;
  for (uint8_t i = 0; i < B_COUNT; i++) {
    if (buttons[i].pin >= 0) {
      gpio_wakeup_disable((gpio_num_t)buttons[i].pin);
      pinMode(buttons[i].pin, INPUT_PULLUP);
    }
  }
#if LEVEL_LED_SHARED
  lvlInitPins();
#endif
  sleepQuietSince = millis();
#if RFID_WAKE
  // zamanlayici uyanmasi: kart bakildiktan hemen sonra tekrar uyunabilsin
  if (cause == ESP_SLEEP_WAKEUP_TIMER) { sleepQuietSince = millis() - 300; lastScan = 0; }
#endif
}

void enterSleep() {
  logMsg("uyku");
  beepSleep();
  rxStop();
  ampMute();
  ledsAllOff();
  while (anyButtonHeld()) { updateButtons(); delay(5); }
  clearButtonEvents();
  state = ST_SLEEPING;
  sleepQuietSince = millis();
}

void wakeUp() {
  state = ST_READY;
  // 1.0.2: uyandiran tus birakilana kadar bekle; birakma olayi RECORD/PLAY
  // gibi bir islemi tetiklemesin
  for (uint32_t t0 = millis(); millis() - t0 < 1500; ) {
    updateButtons();
    if (!anyButtonHeld()) break;
    delay(5);
  }
  clearButtonEvents();
  refreshSelectionLeds();
  beepBoot();
  logMsg("uyandi");
  lastActivity = millis();
}

void sleepStep() {
  if (gpioWoke) { gpioWoke = false; wakeUp(); return; }   // 1.0.2: basar basmaz uyan
  for (uint8_t i = 0; i < B_COUNT; i++) {
    if (takeEvent(i)) { wakeUp(); return; }
  }
#if RFID_WAKE
  // 1.0.6: uykudayken de kart bak; okutulursa uyan (sahne/etiket islemi yapilmis olur)
  if (millis() - lastScan >= RFID_SCAN_MS) {
    lastScan = millis();
    if (rfidScan()) { wakeUp(); return; }
  }
#endif
#if USE_LIGHT_SLEEP
  if (anyButtonHeld()) { sleepQuietSince = millis(); return; }
  if (millis() - sleepQuietSince < 300) return;
  #if NO_SLEEP_ON_USB
  if (usbHostConnected()) return;
  #endif
  lightSleepOnce();
#endif
}

// ======================= READY =======================
void readyStep() {
  uint32_t now = millis();
  if (anyButtonHeld()) lastActivity = now;
#if NO_AUTO_SLEEP_ON_USB
  if (usbHostConnected()) lastActivity = now;   // 1.0.2: USB takiliyken otomatik uyku yok
#endif

  uint8_t e = takeEvent(B_ONOFF);
  if (ONOFF_HOLD_SLEEPS && (e & EVB_HOLD)) { logMsg("uyku sebebi: ON/OFF uzun basis"); enterSleep(); return; }
  if (e & EVB_SHORT) { backToDefault(); return; }

  if (takeEvent(B_RECORD) & EVB_RELEASE) { doRecord();   return; }
  if (takeEvent(B_PLAY)   & EVB_RELEASE) { doPlayUser(); return; }
  if (takeEvent(B_DEMO)   & EVB_RELEASE) { doPlayDemo(); return; }

  for (uint8_t i = 0; i < 4; i++) {
    if (takeEvent(B_SOUND + i) & EVB_RELEASE) { selectLevel(i + 1); return; }
  }
  if (takeEvent(B_MINI1) & EVB_RELEASE) { selectMini(1); return; }
  if (takeEvent(B_MINI2) & EVB_RELEASE) { selectMini(2); return; }

  if (now - lastScan >= RFID_SCAN_MS) {        // kart taramasi yalnizca READY'de
    lastScan = now;
    rfidScan();
  }
  // 1.0.7: 'now' bu fonksiyonun basinda alindi; arada lastActivity daha yeni bir
  // millis() ile guncellenirse (kart islemi) cikarma isaretsiz tasip dev bir sayi
  // veriyor ve cihaz hemen uykuya giriyordu. Guncel zamanla, isaretli farkla bak.
  if ((int32_t)(millis() - lastActivity) >= (int32_t)IDLE_SLEEP_MS) {
    logMsg(String("uyku sebebi: hareketsizlik, usb=") + (usbHostConnected() ? "var" : "yok"));
    enterSleep();
  }
}

// ======================= SETUP / LOOP =======================
void setup() {
  pinMode(PIN_AMP_SD, OUTPUT);
  digitalWrite(PIN_AMP_SD, LOW);

  for (uint8_t i = 0; i < B_COUNT; i++) {
    if (buttons[i].pin >= 0) pinMode(buttons[i].pin, INPUT_PULLUP);
    if (LED_PINS[i] >= 0)    pinMode(LED_PINS[i], OUTPUT);
  }
#if LEVEL_LED_SHARED
  lvlInitPins();
#endif
  ledsAllOff();

  Serial.begin(115200);
  Serial.setTxTimeoutMs(50);
  delay(200);
  logMsg(DEVICE_NAME " " FW_VERSION " basliyor");
  printButtonMap();

  makeDeviceId();

  SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, -1);
  pinMode(PIN_SD_CS, OUTPUT);
  digitalWrite(PIN_SD_CS, HIGH);
  pinMode(PIN_RC_CS, OUTPUT);
  digitalWrite(PIN_RC_CS, HIGH);

  // 1.0.3: RC522 SD'DEN ONCE baslatilir. SD
  // once baslayinca ortak SPI hattinda RC522 cevap vermiyordu.
  if (!rcInit()) logMsg("UYARI: RC522 bulunamadi (sahne secimi calismaz)");
  else           logMsg("RC522 hazir");

  sdOk = SD.begin(PIN_SD_CS, SPI, SD_HZ);
  if (sdOk) {
    store = &SD; storeFlash = false;
    logMsg("SD karti hazir: " + String((uint32_t)(SD.cardSize() / (1024ULL * 1024ULL))) + " MB");
  } else {
    logMsg("HATA: SD karti bulunamadi (kart takili mi, FAT32 mi?)");
    // 1.0.5: basarisiz SD.begin ortak SPI hattini kapatabiliyor (SPI.end);
    // RC522 bu yuzden kart okumuyordu. Hat ve RC522 yeniden kurulur.
    SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, -1);
    digitalWrite(PIN_SD_CS, HIGH);
    digitalWrite(PIN_RC_CS, HIGH);
    if (rcInit()) logMsg("RC522 yeniden hazir");
    else          logMsg("UYARI: RC522 SD denemesinden sonra cevap vermiyor");
#if FLASH_FALLBACK
    if (LittleFS.begin(true)) {
      store = &LittleFS; storeFlash = true; sdOk = true;
      logMsg("GECICI: SD yok, dahili hafiza kullaniliyor (" +
             String((uint32_t)(LittleFS.totalBytes() - LittleFS.usedBytes())) + " bayt bos)");
    } else {
      logMsg("HATA: dahili hafiza da acilamadi");
    }
#endif
  }
  if (sdOk) {
    ensureDir("/voice");
    loadOwner();
  }
  digitalWrite(PIN_SD_CS, HIGH);                // SD hatti serbest kalsin
  digitalWrite(PIN_RC_CS, HIGH);

  if (!initI2S()) logMsg("HATA: I2S baslatilamadi");

  for (uint8_t i = 0; i < B_COUNT; i++) {
    Button &b = buttons[i];
    if (b.pin < 0) continue;
    b.rawPressed = b.pressed = btnRaw(i, millis());
    b.suppress = b.pressed;
    b.rawChangedAt = millis();
  }

  // Acilis: default + SOUND + MINI 1; iki secim LED'i yanik
  sceneMode = false;
  curLevel = 1;
  curMini  = 1;
  refreshSelectionLeds();
  ensureSlotDirs(modeKey(), curLevel, curMini);

  beepBoot();
  if (!sdOk) beepError();

  state = ST_READY;
  lastActivity = millis();
}

void loop() {
  updateButtons();
  switch (state) {
    case ST_READY:
      handleSerial();
      if (state == ST_READY) readyStep();
      break;
    case ST_SLEEPING:
      handleSerial();
      if (state == ST_SLEEPING) sleepStep();
      break;
    default:
      state = ST_READY;
      break;
  }
  delay(2);
}
