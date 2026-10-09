/*
 * ============================================================
 *  Brick-Talks Firmware - ESP32-S3 N8 (PSRAM yok)
 *  Surum: BT-S3-1.0.0
 *  Davranis referansi: BT-FW-SPEC-001
 *  Ses/pin altyapisi: Fig-Talks FT-S3 (donanimda dogrulanmis)
 * ============================================================
 *  Arduino IDE ayarlari:
 *    Board            : ESP32S3 Dev Module (esp32 by Espressif 3.3.x)
 *    USB CDC On Boot  : Enabled
 *    USB Mode         : Hardware CDC and JTAG
 *    Flash Size       : 8MB (64Mb)
 *    Partition Scheme : (sketch klasorundeki partitions.csv otomatik kullanilir,
 *                        ~4.8 MB dosya alani)
 *    PSRAM            : Disabled
 *  Kutuphaneler (Library Manager): Adafruit GFX Library, Adafruit ILI9341
 *
 *  Donanim:
 *    Butonlar (INPUT_PULLUP, basinca LOW):
 *      ON/OFF=40, PLAY=41, RECORD=48, NEXT=3
 *    LED'ler (GPIO->direnc->LED->GND):
 *      LED1 ON/OFF=36, LED2 PLAY=37 (PWM), LED3 RECORD=42, LED4 NEXT=47
 *    INMP441 (I2S0 RX, L/R=GND): SCK=1, WS=5, SD=2
 *    MAX98357 (I2S1 TX): BCLK=7, LRCLK=14, DIN=21, SD=15
 *    Waveshare 2.4" ILI9341 (SPI): DIN=11, CLK=12, CS=9, DC=8, RST=18, BL=6
 *    USB: GPIO19/20
 *
 *  Sartnameden farklar (donanim nedeniyle):
 *    - N8'de PSRAM yok: ses kayit sirasinda dogrudan flash'a yazilir.
 *    - Ses flash'ta IMA ADPCM (4-bit) saklanir: 5 x 30 sn = 1.2 MB.
 *      USB dump komutu yine 16-bit PCM ornek gonderir.
 *    - Karakter goruntusu RAM'e acilmaz, flash'tan dogrudan ekrana cizilir.
 *    - Dosya sistemi FFat yerine LittleFS.
 * ============================================================
 */

#include <Arduino.h>
#include <FS.h>
#include <LittleFS.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <math.h>
#include <time.h>
#include <sys/time.h>
#include "driver/i2s_std.h"
#include "driver/gpio.h"
#include "esp_sleep.h"
#include "freertos/stream_buffer.h"

// ======================= AYARLAR =======================
#define FW_VERSION          "BT-S3-1.0.10"   // 1.0.1 protokol · 1.0.2 agiz · 1.0.3 cizirti + uyku · 1.0.6 kayit tik kirpma · 1.0.7 buton logu · 1.0.8 ON/OFF + LED + pil · 1.0.9 PLAY/REC yer degisimi + Ingilizce ekran + pil otomatik algilama · kayit bip sesleri · 1.0.10 pil olcumu varsayilan kapali
#define DEVICE_NAME         "Brick-Talks"

#define LED_ACTIVE_HIGH     true
#define USE_LIGHT_SLEEP     true
#define NO_SLEEP_ON_USB     true
// 1.0.3 — USB bilgisayara takiliyken otomatik uykuya hic girme (ekran da kararmaz)
#define NO_AUTO_SLEEP_ON_USB true
// 1.0.3 — hareketsizlikte otomatik uyku suresi (dakika)
#define AUTO_SLEEP_MIN      10

// ---- Ses ----
#define MIC_SHIFT           16      // mikrofon hassasiyeti (Fig-Talks'ta ayarlandi)
#define NOISE_GATE_RMS      0       // 0 = kapali

// 1.0.6 — kayit bas/son TIK kirpma
#define REC_TRIM_START_MS   300     // basta atilan: mikrofon acilis + filtre oturma tiki (eskisi 150)
#define REC_TRIM_END_MS     500     // sonda kesilen: REC tusuna basis + birakis tiki
#define REC_FADE_OUT_MS     40      // kesim noktasinda yumusak kapanis (kesimin kendisi tik yapmasin)
#define PLAY_GAIN_X100      100     // oynatma kazanci x100 (sartname: 260)
#define LEVEL_LOG           false   // kayitta seviyeyi Serial'e yaz

// ---- Agiz animasyonu (RMS -> seviye 0..13) ----
#define PLAY_LVL_MIN        300     // bu RMS'in alti = sessiz agiz
#define PLAY_LVL_MAX        6000    // bu RMS ve ustu = en acik agiz
#define REC_LVL_MIN         250
#define REC_LVL_MAX         4000
#define MOUTH_MIN_MS        60      // agiz cizimleri arasi en az sure

// 1.0.2 — oynatmada agiz seviyesi kaydin kendi tepe seviyesine gore hesaplanir
// Sabit PLAY_LVL_MIN/MAX esikleriyle sessiz kayitlarda
// agiz hic tam acilmiyordu. 0 yaparsaniz eski sabit esik davranisi doner.
#define MOUTH_ADAPTIVE      1
#define MOUTH_PEAK_FLOOR    1500    // tepe tahmini bu degerin altina inmez (kazanc oncesi RMS)
#define MOUTH_IDLE_DIV      6       // rms < tepe/6 ise sessiz agiz (seviye 0)

// 1.0.2 — CIZIRTI TESTI: 0 yapilirsa oynatma sirasinda agiz hic cizilmez.
// Cizirti kaybolursa sebep ekran cizimi, kaybolmazsa ses/donanim tarafi.
#define PLAY_MOUTH_ANIM     1

// 1.0.5 — 0 yapilirsa KAYIT sirasinda agiz cizilmez (varsayilan 1 = cizilir).
// Kayit sirasindaki yogun ekran cizimi (SPI) mikrofon hattina parazit bindirip
// cizirtiyi kaydin icine gomerse 0 yapilir; o zaman kayitta ekranda sabit yuz +
// kirmizi kayit noktasi + sure gorunur. Oynatmada agiz animasyonu her durumda calisir.
#define REC_MOUTH_ANIM      1

// ---- Ekran ----
#define TFT_SPI_HZ          20000000
#define TFT_ROTATION        3
#define BL_LEVEL            255     // arka isik parlakligi 0..255

// 1.0.7: buton logu. 1 = her basis/birakis ve hattaki kisa darbeler (gurultu)
// Serial'e "# btn..." satiri olarak yazilir. {"cmd":"pins"} anlik pin durumunu verir.
#define BTN_LOG             1

// 1.0.8: ON/OFF ac/kapa
//   Acikken ON/OFF LED'i yanik kalir. ON/OFF basili tutulunca kapanir (uyku, ekran sonuk).
//   Kapaliyken yalnizca ON/OFF acar; PLAY/REC/NEXT cihazi uyandirmaz.
#define ONOFF_ONLY_WAKES    true

// 1.0.8: LED davranisi (surekli yanip sonme yok)
//   ON/OFF acikken sabit, RECORD kayitta sabit, PLAY oynatmada sabit.
//   Beklemede PLAY LED'i: 0 = sonuk, 1 = secili slotta kayit varsa sabit, 2 = eski nefes efekti
#define IDLE_PLAY_LED       0
#define REC_LED_BLINK       0

// 1.0.9: kayit sesli uyarisi (figurlu cihazdaki gibi): baslarken bip, bitince bi-dip.
// Bip mikrofon acilmadan once calar, kayda girmez. 0 = sessiz.
#define REC_BEEPS           1     // 1 = kayitta RECORD LED'i ve ekrandaki kirmizi nokta yanip soner

// 1.0.8: PIL GOSTERGESI
// Ana kartta pil gerilimi ve sarj durumu ESP32'ye bagli DEGIL (sarj entegresinin
// kendi LED'leri var). Ekranda gosterge icin iki bolucu eklenmeli:
//   VBAT --100k--+--100k-- GND  (+100nF orta nokta-GND)  orta nokta -> IO4  (H7.3 "MLED1", bu cihazda bos)
//   +5V  --10k---+--20k--- GND                           orta nokta -> IO44 (H1.2 "RXD")
// 1.0.10: boluculer takilana kadar KAPALI (-1). Takilinca BAT_ADC_PIN 4, USB_SENSE_PIN 44.
#define BAT_ADC_PIN         -1    // 4
#define BAT_DIV_X1000       2000  // bolucu orani x1000 (100k/100k = 2.000)
#define USB_SENSE_PIN       -1    // 44  (HIGH = sarj kablosu takili)
#define BAT_VALID_MIN_MV    2900  // bu araligin disindaki olcum = pil/bolucu yok
#define BAT_VALID_MAX_MV    4500
#define BAT_FULL_MV         4150  // kablo takiliyken bu gerilimin ustu = DOLU
#define BAT_LOW_PCT         15    // bu yuzdenin alti kirmizi
#define BAT_SLEEP_MV        3350  // kablo takili degilken bu gerilimin altinda cihaz kapanir (0 = kapali)

// ----------------------- Pinler -----------------------
static const uint8_t PIN_BTN_ONOFF = 40;
// 1.0.9: PLAY ile RECORD yer degistirdi (LED'leri de birlikte)
static const uint8_t PIN_BTN_PLAY  = 48;
static const uint8_t PIN_BTN_REC   = 41;
static const uint8_t PIN_BTN_NEXT  = 3;

static const uint8_t PIN_LED1      = 36;   // ON/OFF
static const uint8_t PIN_LED2      = 42;   // PLAY (PWM)  - 1.0.9: 37 -> 42
static const uint8_t PIN_LED3      = 37;   // RECORD      - 1.0.9: 42 -> 37
static const uint8_t PIN_LED4      = 47;   // NEXT

static const uint8_t PIN_MIC_SCK   = 1;
static const uint8_t PIN_MIC_WS    = 5;
static const uint8_t PIN_MIC_SD    = 2;

static const uint8_t PIN_AMP_BCLK  = 7;
static const uint8_t PIN_AMP_LRC   = 14;
static const uint8_t PIN_AMP_DIN   = 21;
static const uint8_t PIN_AMP_SD    = 15;   // HIGH = amfi acik

static const uint8_t PIN_TFT_MOSI  = 11;
static const uint8_t PIN_TFT_SCK   = 12;
static const uint8_t PIN_TFT_CS    = 9;
static const uint8_t PIN_TFT_DC    = 8;
static const uint8_t PIN_TFT_RST   = 18;
static const uint8_t PIN_TFT_BL    = 6;

// ----------------------- Sabitler -----------------------
static const uint32_t SR             = 16000;
static const uint32_t MAX_SEC        = 30;
static const int32_t  REC_GAIN       = 4;
static const uint32_t MAX_SAMPLES    = SR * MAX_SEC;          // 480000
static const uint32_t MAX_REC_BYTES  = MAX_SAMPLES / 2;       // 240000
static const int32_t  TONE_AMP       = 8000;
static const uint8_t  NUM_SLOTS      = 5;
static const uint32_t SLOT_MIN_BYTES = 64;
static const uint32_t LOG_MAX_BYTES  = 8000;

static const uint32_t LONG_PRESS_MS     = 800;
static const uint32_t DEBOUNCE_MS       = 30;
static const uint32_t IDLE_SLEEP_MS     = (uint32_t)AUTO_SLEEP_MIN * 60UL * 1000UL;   // 1.0.3: 5 dk -> ayarlanabilir
static const uint32_t DELETE_CONFIRM_MS = 5000;
static const uint32_t STATUS_HOLD_MS    = 1500;
static const uint32_t UPLOAD_TIMEOUT_MS = 120000;

static const uint8_t  FACE_MAX_FRAMES = 14;
static const uint32_t FACE_CACHE_MAX  = 140000;  // 1.0.3: 96 KB -> 140 KB (buyuyen agiz kutusu RAM'e sigsin, oynatmada flash okunmasin)

static const int TX_DMA_DESC   = 8;     // 1.0.3: 4 -> 8 (128 ms -> 256 ms tampon; ekran cizimi sesi aksatmasin)
static const int TX_DMA_FRAMES = 512;
static const int TX_DELAY_BLOCKS = (TX_DMA_DESC * TX_DMA_FRAMES) / 512;  // animasyon gecikme telafisi
static const uint32_t TX_BUF_MS  = (uint32_t)TX_DMA_DESC * TX_DMA_FRAMES * 1000UL / SR;  // 1.0.3: tampon suresi

// ---- Ekran yerlesimi (320 x 240) ----
static const int16_t SCR_W   = 320;
static const int16_t SCR_H   = 240;
static const int16_t AREA_W  = 292;   // karakter alani
static const int16_t AREA_H  = 210;
static const int16_t STRIP_Y = 210;   // alt durum seridi
static const int16_t STRIP_H = 30;

static const uint16_t COL_BG     = 0xFFFF;
static const uint16_t COL_STRIP  = 0x18E6;
static const uint16_t COL_TEXT   = 0xFFFF;
static const uint16_t COL_BLUE   = 0x1C9F;
static const uint16_t COL_RED    = 0xF800;
static const uint16_t COL_YELLOW = 0xFFE0;
static const uint16_t COL_GREEN  = 0x07E0;
static const uint16_t COL_DARK   = 0x2104;
static const uint16_t COL_MOUTH  = 0x8000;

static const uint16_t FALLBACK_COLORS[NUM_SLOTS] = { 0xFEA0, 0x5E7F, 0xFB2C, 0x87F0, 0xC61F };

// ======================= VERI TIPLERI =======================
// Arduino IDE fonksiyon bildirimlerini dosyanin basina ekler;
// bu nedenle fonksiyonlarda kullanilan tipler burada tanimlanir.
typedef int16_t txs_t;

struct AdpcmState {
  int32_t pred  = 0;
  int     index = 0;
};

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

struct FaceInfo {
  bool     valid = false;
  uint16_t bw = 0, bh = 0, mx = 0, my = 0, mw = 0, mh = 0, n = 0;
  uint32_t baseOff = 0, baseLen = 0;
  uint32_t fOff[FACE_MAX_FRAMES] = { 0 };
  uint32_t fLen[FACE_MAX_FRAMES] = { 0 };
};

struct CaptureCtx {
  volatile bool     run     = false;
  volatile bool     done    = false;
  volatile bool     i2sErr  = false;
  volatile uint32_t samples = 0;
  volatile uint32_t dropped = 0;
  volatile uint32_t rms     = 0;
  volatile uint32_t rmsSeq  = 0;
};

struct Stats {
  uint32_t totalMs   = 0;
  uint32_t count     = 0;
  uint32_t longestMs = 0;
  uint32_t lastTs    = 0;
};

enum State { ST_IDLE, ST_RECORDING, ST_PLAYING, ST_SLEEPING, ST_CONFIRM_DEL };

// Buton olay bitleri (hepsi birakmada; HOLD basili tutarken 800 ms'de)
enum : uint8_t { EVB_SHORT = 1, EVB_HOLD = 2, EVB_LONGREL = 4 };
static const uint8_t EVB_RELEASE = EVB_SHORT | EVB_LONGREL;
static const uint8_t EVB_ANY     = EVB_SHORT | EVB_HOLD | EVB_LONGREL;

enum { B_ONOFF = 0, B_PLAY = 1, B_REC = 2, B_NEXT = 3 };

struct Button {
  uint8_t  pin;
  bool     rawPressed;
  bool     pressed;
  bool     suppress;
  bool     holdFired;
  uint32_t rawChangedAt;
  uint32_t pressedAt;
  uint8_t  events;
  uint16_t glitch;      // 1.0.7: kararli olmayan ham degisim sayisi
};

// ======================= DURUM =======================
State    state = ST_IDLE;
uint8_t  curSlot = 0;
bool     slotFull[NUM_SLOTS]   = { false };
bool     faceExists[NUM_SLOTS] = { false };
bool     fsOk = false;

uint32_t lastActivity    = 0;
uint32_t sleepQuietSince = 0;
uint32_t statusUntil     = 0;
uint32_t confirmUntil    = 0;
uint32_t led4Until       = 0;

Stats    stats;
String   deviceId;
String   profileId;
String   profileName;
uint32_t boundAt = 0;

static uint8_t ioBuf[1024];

// ======================= DOSYA ADLARI =======================
String slotPath(uint8_t i)  { return String("/slot") + i + ".adp"; }
String slotTmp(uint8_t i)   { return String("/slot") + i + ".tmp"; }
String facePath(uint8_t i)  { return String("/face") + i + ".bin"; }
String faceTmp(uint8_t i)   { return String("/face") + i + ".tmp"; }

static const char* STATS_FILE = "/stats.json";
static const char* LOG_FILE   = "/log.jsonl";
static const char* OWNER_FILE = "/owner.json";

// ======================= BUTONLAR =======================
Button buttons[4] = { { PIN_BTN_ONOFF }, { PIN_BTN_PLAY }, { PIN_BTN_REC }, { PIN_BTN_NEXT } };
static const uint8_t NBTN = 4;
const char *BTN_NAME[NBTN] = { "ON/OFF", "PLAY", "RECORD", "NEXT" };

#if BTN_LOG
void btnLog(uint8_t i, const char *what, int32_t ms) {
  Serial.printf("# btn: %s (IO%d) %s", BTN_NAME[i], buttons[i].pin, what);
  if (ms >= 0) Serial.printf(" %ldms", (long)ms);
  Serial.println();
}
#else
void btnLog(uint8_t, const char *, int32_t) {}
#endif

void printButtonMap() {
  Serial.print("# buton haritasi:");
  for (uint8_t i = 0; i < NBTN; i++) Serial.printf(" %s=IO%d", BTN_NAME[i], buttons[i].pin);
  Serial.println();
}

// {"cmd":"pins"}: 1 = serbest (HIGH), 0 = basili (LOW)
void printPins() {
  Serial.print("{\"pins\":{");
  for (uint8_t i = 0; i < NBTN; i++)
    Serial.printf("%s\"%s\":{\"io\":%d,\"v\":%d}", i ? "," : "", BTN_NAME[i],
                  buttons[i].pin, digitalRead(buttons[i].pin));
  Serial.println("}}");
}

void btnNoiseReport(uint32_t now) {
#if BTN_LOG
  static uint32_t lastNoise = 0;
  if (now - lastNoise < 1000) return;
  lastNoise = now;
  for (uint8_t i = 0; i < NBTN; i++) {
    Button &b = buttons[i];
    if (b.glitch < 2 || b.pressed || b.rawPressed) continue;
    Serial.printf("# btn-gurultu: %s (IO%d) %u darbe\n", BTN_NAME[i], b.pin, b.glitch);
    b.glitch = 0;
  }
#endif
}

void updateButtons() {
  uint32_t now = millis();
  for (uint8_t bi = 0; bi < NBTN; bi++) {
    Button &b = buttons[bi];
    bool raw = (digitalRead(b.pin) == LOW);
    if (raw != b.rawPressed) {
      b.rawPressed   = raw;
      b.rawChangedAt = now;
      if (b.glitch < 0xFFFF) b.glitch++;
    }
    if (raw != b.pressed && (now - b.rawChangedAt) >= DEBOUNCE_MS) {
      b.pressed = raw;
      b.glitch  = 0;
      if (raw) btnLog(bi, "bas", -1);
      else     btnLog(bi, "birak", (int32_t)(now - b.pressedAt));
      if (raw) {
        b.pressedAt = now;
        b.suppress  = false;
        b.holdFired = false;
      } else if (!b.suppress) {
        b.events |= (now - b.pressedAt >= LONG_PRESS_MS) ? EVB_LONGREL : EVB_SHORT;
      }
    }
    if (b.pressed && !b.suppress && !b.holdFired && (now - b.pressedAt) >= LONG_PRESS_MS) {
      b.holdFired = true;
      b.events |= EVB_HOLD;
    }
  }
  btnNoiseReport(now);
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
  for (auto &b : buttons) {
    if (b.pressed || b.rawPressed) return true;
  }
  return false;
}

// ======================= LED =======================
void ledSet(uint8_t pin, bool on) {
  bool level = LED_ACTIVE_HIGH ? on : !on;
  digitalWrite(pin, level ? HIGH : LOW);
}

void greenLevel(uint8_t v) {
  ledcWrite(PIN_LED2, LED_ACTIVE_HIGH ? v : (255 - v));
}

void greenSet(bool on) { greenLevel(on ? 255 : 0); }

bool powerOn = true;          // 1.0.8: ON/OFF LED'i acik durumda yanik kalir

void ledsOff() {
  ledSet(PIN_LED1, powerOn);
  greenSet(false);
  ledSet(PIN_LED3, false);
  ledSet(PIN_LED4, false);
}

void breathe() {
  static uint32_t lastUpd = 0;
  uint32_t now = millis();
  if (now - lastUpd < 20) return;
  lastUpd = now;
  const uint32_t period = 2400;
  uint32_t p = now % period;
  uint32_t tri = (p < period / 2) ? (p * 255 / (period / 2))
                                  : ((period - p) * 255 / (period / 2));
  greenLevel((uint8_t)((tri * tri) / 255));
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

size_t fileSize(const String &path) {
  if (!LittleFS.exists(path)) return 0;
  File f = LittleFS.open(path, "r");
  if (!f) return 0;
  size_t sz = f.size();
  f.close();
  return sz;
}

bool writeTextFile(const char *path, const String &content) {
  File f = LittleFS.open(path, "w");
  if (!f) return false;
  size_t w = f.print(content);
  f.close();
  return w == content.length();
}

String readTextFile(const char *path) {
  if (!LittleFS.exists(path)) return "";
  File f = LittleFS.open(path, "r");
  if (!f) return "";
  String s = f.readString();
  f.close();
  return s;
}

uint8_t rmsToLevel(uint32_t rms, uint32_t lo, uint32_t hi) {
  if (rms < lo) return 0;
  if (rms >= hi) return 13;
  return (uint8_t)(1 + (uint64_t)(rms - lo) * 12ULL / (hi - lo));
}

// ======================= I2S =======================
i2s_chan_handle_t rxChan = nullptr;
i2s_chan_handle_t txChan = nullptr;
bool rxEnabled = false;
bool ampOn     = false;

static int32_t rxBuf[256];
static int16_t pcmBuf[256];
static volatile uint32_t rxOverflows = 0;

static bool IRAM_ATTR onRxOverflow(i2s_chan_handle_t h, i2s_event_data_t *e, void *ctx) {
  rxOverflows++;
  return false;
}

bool initI2S() {
  // Mikrofon: I2S0, RX, 32-bit, mono, sol kanal
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

  // Amfi: I2S1, TX, 16-bit, stereo (L=R)
  i2s_chan_config_t txc = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_1, I2S_ROLE_MASTER);
  txc.auto_clear    = true;
  txc.dma_desc_num  = TX_DMA_DESC;
  txc.dma_frame_num = TX_DMA_FRAMES;
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
  if (i2s_channel_enable(txChan) != ESP_OK) return false;
  return true;
}

void rxStart() {
  if (!rxEnabled && rxChan) { i2s_channel_enable(rxChan); rxEnabled = true; }
}

void rxStop() {
  if (rxEnabled && rxChan) { i2s_channel_disable(rxChan); rxEnabled = false; }
}

void rxFlush() {
  size_t br = 0;
  for (int i = 0; i < 50; i++) {
    if (i2s_channel_read(rxChan, rxBuf, sizeof(rxBuf), &br, 0) != ESP_OK || br == 0) break;
  }
}

// ======================= SES CIKISI / BIPLER =======================
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
  float    ph    = 0.0f;
  float    inc   = 2.0f * (float)M_PI * freq / SR;
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

void playTone(uint16_t freq, uint16_t ms) {
  playToneAmp(freq, ms, TONE_AMP);
}

void audioBegin() {
  if (!ampOn) {
    digitalWrite(PIN_AMP_SD, HIGH);
    ampOn = true;
    playSilence(30);
  }
}

void audioEndTail(uint32_t tailMs) {
  playSilence(tailMs);                   // tampondaki sesin calinmasini bekle
  digitalWrite(PIN_AMP_SD, LOW);
  ampOn = false;
}

void audioEnd() {
  audioEndTail(TX_BUF_MS + 60);          // 1.0.3: tampon buyudu, son kisim kesilmesin
}

void ampMute() {
  digitalWrite(PIN_AMP_SD, LOW);
  ampOn = false;
}

// ======================= IMA ADPCM =======================
static const int8_t IMA_INDEX[16] = {
  -1, -1, -1, -1, 2, 4, 6, 8,
  -1, -1, -1, -1, 2, 4, 6, 8
};

static const int16_t IMA_STEP[89] = {
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
  50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
  253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
  1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
  3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442,
  11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794,
  32767
};

static inline void adpcmUpdate(AdpcmState &st, uint8_t nib, int32_t step) {
  int32_t diff = step >> 3;
  if (nib & 4) diff += step;
  if (nib & 2) diff += step >> 1;
  if (nib & 1) diff += step >> 2;
  st.pred += (nib & 8) ? -diff : diff;
  if (st.pred > 32767)  st.pred = 32767;
  if (st.pred < -32768) st.pred = -32768;
  st.index += IMA_INDEX[nib];
  if (st.index < 0)  st.index = 0;
  if (st.index > 88) st.index = 88;
}

uint8_t adpcmEncode(AdpcmState &st, int16_t sample) {
  int32_t step = IMA_STEP[st.index];
  int32_t diff = (int32_t)sample - st.pred;
  uint8_t nib = 0;
  if (diff < 0) { nib = 8; diff = -diff; }
  int32_t s = step;
  if (diff >= s) { nib |= 4; diff -= s; }
  s >>= 1;
  if (diff >= s) { nib |= 2; diff -= s; }
  s >>= 1;
  if (diff >= s) { nib |= 1; }
  adpcmUpdate(st, nib, step);
  return nib;
}

int16_t adpcmDecode(AdpcmState &st, uint8_t nib) {
  adpcmUpdate(st, nib & 0x0F, IMA_STEP[st.index]);
  return (int16_t)st.pred;
}

// ======================= EKRAN =======================
Adafruit_ILI9341 tft(&SPI, PIN_TFT_DC, PIN_TFT_CS, PIN_TFT_RST);

FaceInfo face;                    // yalnizca curSlot'un karakteri
uint8_t *mouthCache = nullptr;    // tum agiz bloklari tek tampon (tek sahip)
uint32_t cacheOff[FACE_MAX_FRAMES] = { 0 };
File     faceFile;
bool     faceFileOpen = false;
int16_t  faceOx = 0, faceOy = 0;
uint8_t  shownMouth = 255;
uint32_t lastMouthDraw = 0;

// Yedek yuz geometrisi
static const int16_t FB_CX = AREA_W / 2;
static const int16_t FB_CY = AREA_H / 2;
static const int16_t FB_R  = 85;
static const int16_t FB_MX = FB_CX - 36;
static const int16_t FB_MY = FB_CY + 20;
static const int16_t FB_MW = 72;
static const int16_t FB_MH = 44;

void blSet(uint8_t v) { ledcWrite(PIN_TFT_BL, v); }

// 1.0.3: Gercek yuzlerde (golge/doku) RLE kosulari cok kisa (1-3 piksel);
// her kosu icin ayri writeColor cagrisi bir agiz karesini onlarca ms'ye
// cikariyor ve oynatmada ses tamponunu bosaltip cizirti yapiyordu.
// Kisa kosular bir tamponda toplanip tek writePixels ile gonderilir.
static uint16_t rleLine[256];
void drawRle(const uint8_t *p, uint32_t len) {
  uint16_t n = 0;
  for (uint32_t i = 0; i + 3 < len; i += 4) {
    uint16_t cnt = (uint16_t)(p[i] | (p[i + 1] << 8));
    uint16_t col = (uint16_t)(p[i + 2] | (p[i + 3] << 8));
    if (!cnt) continue;
    if (cnt >= 32) {                                   // uzun kosu: dogrudan doldur
      if (n) { tft.writePixels(rleLine, n); n = 0; }
      tft.writeColor(col, cnt);
      continue;
    }
    while (cnt--) {
      rleLine[n++] = col;
      if (n == 256) { tft.writePixels(rleLine, n); n = 0; }
    }
  }
  if (n) tft.writePixels(rleLine, n);
}

void drawRleMem(const uint8_t *p, uint32_t len, int16_t x, int16_t y, uint16_t w, uint16_t h) {
  tft.startWrite();
  tft.setAddrWindow(x, y, w, h);
  drawRle(p, len);
  tft.endWrite();
}

bool drawRleFile(uint32_t off, uint32_t len, int16_t x, int16_t y, uint16_t w, uint16_t h) {
  if (!faceFileOpen || !faceFile.seek(off)) return false;
  tft.startWrite();
  tft.setAddrWindow(x, y, w, h);
  uint32_t left = len;
  bool ok = true;
  while (left > 0) {
    uint32_t chunk = left > sizeof(ioBuf) ? sizeof(ioBuf) : left;
    if (faceFile.read(ioBuf, chunk) != (int)chunk) { ok = false; break; }
    drawRle(ioBuf, chunk);
    left -= chunk;
  }
  tft.endWrite();
  return ok;
}

// MTF1 paketini dogrular; hata varsa aciklama dondurur, gecerliyse nullptr
const char *faceValidate(const String &path, FaceInfo &fi) {
  fi = FaceInfo();
  File f = LittleFS.open(path, "r");
  if (!f) return "acilamadi";
  size_t size = f.size();
  uint8_t h[18];
  if (size < 18 || f.read(h, 18) != 18) { f.close(); return "kisa_dosya"; }
  if (memcmp(h, "MTF1", 4) != 0)         { f.close(); return "baslik"; }

  uint16_t v[7];
  for (int i = 0; i < 7; i++) v[i] = (uint16_t)(h[4 + i * 2] | (h[5 + i * 2] << 8));
  fi.bw = v[0]; fi.bh = v[1]; fi.mx = v[2]; fi.my = v[3];
  fi.mw = v[4]; fi.mh = v[5]; fi.n = v[6];

  if (fi.bw == 0 || fi.bh == 0 || fi.bw > AREA_W || fi.bh > AREA_H) { f.close(); return "taban_boyutu"; }
  if (fi.n > FACE_MAX_FRAMES) { f.close(); return "kare_sayisi"; }
  if (fi.n > 0 && (fi.mw == 0 || fi.mh == 0 ||
                   (uint32_t)fi.mx + fi.mw > fi.bw || (uint32_t)fi.my + fi.mh > fi.bh)) {
    f.close();
    return "agiz_alani";
  }

  uint32_t pos = 18;
  for (uint16_t blk = 0; blk <= fi.n; blk++) {
    uint8_t lb[4];
    if (pos + 4 > size || !f.seek(pos) || f.read(lb, 4) != 4) { f.close(); return "eksik_blok"; }
    uint32_t len = (uint32_t)lb[0] | ((uint32_t)lb[1] << 8) | ((uint32_t)lb[2] << 16) | ((uint32_t)lb[3] << 24);
    pos += 4;
    if ((len % 4) != 0 || len > size - pos) { f.close(); return "blok_uzunlugu"; }

    uint32_t expected = (blk == 0) ? (uint32_t)fi.bw * fi.bh : (uint32_t)fi.mw * fi.mh;
    uint32_t sum = 0;
    uint32_t left = len;
    while (left > 0) {
      uint32_t chunk = left > sizeof(ioBuf) ? sizeof(ioBuf) : left;
      if (f.read(ioBuf, chunk) != (int)chunk) { f.close(); return "okuma"; }
      for (uint32_t i = 0; i + 3 < chunk; i += 4) sum += (uint16_t)(ioBuf[i] | (ioBuf[i + 1] << 8));
      left -= chunk;
    }
    if (sum != expected) { f.close(); return "piksel_sayisi"; }

    if (blk == 0) { fi.baseOff = pos; fi.baseLen = len; }
    else          { fi.fOff[blk - 1] = pos; fi.fLen[blk - 1] = len; }
    pos += len;
  }
  f.close();
  if (pos != size) return "fazla_veri";
  fi.valid = true;
  return nullptr;
}

void faceFree() {
  if (mouthCache) { free(mouthCache); mouthCache = nullptr; }
  if (faceFileOpen) { faceFile.close(); faceFileOpen = false; }
  face = FaceInfo();
}

void faceLoad(uint8_t slot) {
  faceFree();
  String p = facePath(slot);
  faceExists[slot] = LittleFS.exists(p);
  if (!faceExists[slot]) return;

  const char *err = faceValidate(p, face);
  if (err) {
    logMsg(String("karakter gecersiz slot ") + (slot + 1) + ": " + err);
    face = FaceInfo();
    return;
  }
  faceOx = (AREA_W - face.bw) / 2;
  faceOy = (AREA_H - face.bh) / 2;

  faceFile = LittleFS.open(p, "r");
  faceFileOpen = (bool)faceFile;
  if (!faceFileOpen) { face = FaceInfo(); return; }

  // Agiz karelerini RAM'e al (sigarsa); animasyon sirasinda flash okumasi azalir
  uint32_t total = 0;
  for (uint16_t i = 0; i < face.n; i++) total += face.fLen[i];
  if (face.n > 0 && total > 0 && total <= FACE_CACHE_MAX) {
    mouthCache = (uint8_t *)malloc(total);
    if (mouthCache) {
      uint32_t off = 0;
      for (uint16_t i = 0; i < face.n; i++) {
        cacheOff[i] = off;
        if (!faceFile.seek(face.fOff[i]) ||
            faceFile.read(mouthCache + off, face.fLen[i]) != (int)face.fLen[i]) {
          free(mouthCache);
          mouthCache = nullptr;
          break;
        }
        off += face.fLen[i];
      }
    }
  }
}

void drawFallbackFace() {
  uint16_t c = FALLBACK_COLORS[curSlot];
  tft.fillCircle(FB_CX, FB_CY, FB_R, c);
  tft.drawCircle(FB_CX, FB_CY, FB_R, COL_DARK);
  tft.fillCircle(FB_CX - 30, FB_CY - 22, 10, COL_DARK);
  tft.fillCircle(FB_CX + 30, FB_CY - 22, 10, COL_DARK);
  tft.fillCircle(FB_CX - 27, FB_CY - 25, 3, COL_BG);
  tft.fillCircle(FB_CX + 33, FB_CY - 25, 3, COL_BG);
}

void drawMouth(uint8_t level) {
  if (level > 13) level = 13;
  shownMouth = level;
  lastMouthDraw = millis();

  if (face.valid) {
    if (face.n == 0) return;
    uint16_t idx = 0;
    if (level > 0 && face.n >= 2) idx = 1 + (uint16_t)((level - 1) * (face.n - 2) / 12);
    int16_t x = faceOx + face.mx;
    int16_t y = faceOy + face.my;
    if (mouthCache) drawRleMem(mouthCache + cacheOff[idx], face.fLen[idx], x, y, face.mw, face.mh);
    else            drawRleFile(face.fOff[idx], face.fLen[idx], x, y, face.mw, face.mh);
    return;
  }

  // Yedek yuz agzi
  uint16_t c = FALLBACK_COLORS[curSlot];
  tft.fillRect(FB_MX, FB_MY, FB_MW, FB_MH, c);
  if (level == 0) {
    tft.fillRoundRect(FB_MX + 12, FB_MY + FB_MH / 2 - 2, FB_MW - 24, 5, 2, COL_MOUTH);
  } else {
    int16_t hgt = 6 + (int16_t)level * (FB_MH - 6) / 13;
    int16_t wid = FB_MW - 20 + level;
    int16_t r = hgt / 2 < 12 ? hgt / 2 : 12;
    tft.fillRoundRect(FB_CX - wid / 2, FB_MY + (FB_MH - hgt) / 2, wid, hgt, r, COL_MOUTH);
  }
}

// Sinirli hizla, yumusak kapanan agiz guncellemesi
void updateMouth(uint8_t level) {
  if (millis() - lastMouthDraw < MOUTH_MIN_MS) return;
  uint8_t target = level;
  if (shownMouth != 255 && target + 2 < shownMouth) target = shownMouth - 2;   // yavas kapanma
  if (target == shownMouth) return;
  drawMouth(target);
}

void drawFaceArea() {
  tft.fillRect(0, 0, AREA_W, AREA_H, COL_BG);
  bool drawn = false;
  if (face.valid) drawn = drawRleFile(face.baseOff, face.baseLen, faceOx, faceOy, face.bw, face.bh);
  if (!drawn) {
    if (face.valid) faceFree();
    drawFallbackFace();
  }
  drawMouth(0);
}

void drawDots() {
  tft.fillRect(AREA_W, 0, SCR_W - AREA_W, STRIP_Y, COL_BG);
  int16_t cx = AREA_W + 14;
  for (uint8_t i = 0; i < NUM_SLOTS; i++) {
    int16_t cy = 25 + i * 40;
    if (i == curSlot) {
      tft.fillCircle(cx, cy, 9, COL_BLUE);
    } else {
      tft.drawCircle(cx, cy, 9, COL_BLUE);
      tft.drawCircle(cx, cy, 8, COL_BLUE);
      if (slotFull[i]) tft.fillCircle(cx, cy, 3, COL_BLUE);
    }
  }
}

void drawRecDot(bool on) {
  tft.fillCircle(16, STRIP_Y + STRIP_H / 2, 7, on ? COL_RED : COL_STRIP);
}

// ======================= PIL (1.0.8) =======================
int16_t  batMv    = -1;       // -1 = olcum yok
int8_t   batPct   = -1;
uint8_t  batChg   = 0;        // 0 = kablo yok, 1 = sarj oluyor, 2 = dolu
uint32_t batNextAt = 0;
bool     batWarned = false;

static int8_t mvToPct(int32_t mv) {
  static const int16_t T[][2] = { {4200,100},{4100,90},{4000,80},{3900,65},{3800,50},
                                  {3700,30},{3600,15},{3500,7},{3400,3},{3300,0} };
  if (mv >= T[0][0]) return 100;
  for (uint8_t i = 1; i < sizeof(T) / sizeof(T[0]); i++) {
    if (mv >= T[i][0]) {
      int32_t a = T[i][0], b = T[i - 1][0], pa = T[i][1], pb = T[i - 1][1];
      return (int8_t)(pa + (mv - a) * (pb - pa) / (b - a));
    }
  }
  return 0;
}

// Gecerli olcum: 8 ornek birbirine yakin ve pil gerilimi araliginda.
// Bos (bagli olmayan) pin dalgalanir ya da 0'a yakin okur -> -1.
int32_t batReadMv() {
#if BAT_ADC_PIN >= 0
  uint32_t sum = 0, mn = 0xFFFFFFFF, mx = 0;
  for (uint8_t i = 0; i < 8; i++) {
    uint32_t v = analogReadMilliVolts(BAT_ADC_PIN);
    sum += v; if (v < mn) mn = v; if (v > mx) mx = v;
  }
  int32_t mv = (int32_t)(sum / 8) * BAT_DIV_X1000 / 1000;
  int32_t spread = (int32_t)(mx - mn) * BAT_DIV_X1000 / 1000;
  if (mv < BAT_VALID_MIN_MV || mv > BAT_VALID_MAX_MV || spread > 80) return -1;
  return mv;
#else
  return -1;
#endif
}

bool usbPowerPresent() {
#if USB_SENSE_PIN >= 0
  return digitalRead(USB_SENSE_PIN) == HIGH;
#else
  return false;
#endif
}

void drawBattery() {
#if BAT_ADC_PIN >= 0
  const int16_t x = 222, y = STRIP_Y + 8, w = 28, h = 14;
  tft.fillRect(x - 1, y - 1, w + 6, h + 2, COL_STRIP);
  if (batPct < 0) return;
  uint16_t c = batChg ? COL_GREEN : (batPct < BAT_LOW_PCT ? COL_RED : (batPct < 40 ? COL_YELLOW : COL_GREEN));
  tft.drawRect(x, y, w, h, COL_TEXT);
  tft.fillRect(x + w, y + 4, 3, h - 8, COL_TEXT);
  int16_t fw = (int16_t)((w - 4) * (batChg == 2 ? 100 : batPct) / 100);
  if (fw > 0) tft.fillRect(x + 2, y + 2, fw, h - 4, c);
  if (batChg == 1) {                                   // sarj: simsek
    int16_t cx = x + w / 2, cy = y + h / 2;
    tft.fillTriangle(cx + 2, y + 1, cx - 4, cy + 1, cx + 1, cy + 1, COL_YELLOW);
    tft.fillTriangle(cx - 2, y + h - 2, cx + 4, cy - 1, cx - 1, cy - 1, COL_YELLOW);
    tft.drawLine(cx + 2, y + 1, cx - 4, cy + 1, COL_DARK);
    tft.drawLine(cx - 2, y + h - 2, cx + 4, cy - 1, COL_DARK);
  }
#endif
}

void enterSleep();
void showStatus(const char *text, uint16_t color);

// Beklemede 5 sn'de bir olcer; degisince seridi gunceller
void batteryStep() {
#if BAT_ADC_PIN >= 0
  uint32_t now = millis();
  if ((int32_t)(now - batNextAt) < 0) return;
  batNextAt = now + 5000;
  static uint8_t okCnt = 0, badCnt = 0;
  uint32_t tRd = millis();
  int32_t mv = batReadMv();
  tRd = millis() - tRd;
  if (tRd > 50) logMsg("UYARI: pil olcumu " + String(tRd) + " ms surdu");
  if (mv < 0) {                                    // pil/bolucu yok: 3 kez ust uste -> gizle
    okCnt = 0;
    if (++badCnt >= 3 && batPct != -1) { batPct = -1; batMv = -1; batChg = 0; if (!statusUntil) drawBattery(); }
    return;
  }
  badCnt = 0;
  if (batPct < 0 && ++okCnt < 3) { batNextAt = now + 1000; return; }   // 3 gecerli olcumden sonra goster
  batMv = (batMv < 0) ? (int16_t)mv : (int16_t)((batMv * 3 + mv) / 4);   // yumusatma
  bool plug = usbPowerPresent();
  uint8_t chg = plug ? (batMv >= BAT_FULL_MV ? 2 : 1) : 0;
  int8_t pct = mvToPct(batMv);
  if (pct != batPct || chg != batChg) {
    batPct = pct; batChg = chg;
    if (!statusUntil) drawBattery();
  }
  if (!plug && batPct < BAT_LOW_PCT && !batWarned) {
    batWarned = true;
    logMsg("pil zayif: " + String(batMv) + " mV");
    showStatus("LOW BATTERY", COL_RED);
  }
  if (plug || batPct >= BAT_LOW_PCT + 5) batWarned = false;
#if BAT_SLEEP_MV > 0
  if (!plug && batMv < BAT_SLEEP_MV) {
    logMsg("pil bitti: " + String(batMv) + " mV, kapaniyor");
    enterSleep();
  }
#endif
#endif
}

void drawStrip(const char *text, uint16_t color) {
  tft.fillRect(0, STRIP_Y, SCR_W, STRIP_H, COL_STRIP);
  tft.setTextSize(2);
  tft.setTextColor(color, COL_STRIP);
  tft.setCursor(34, STRIP_Y + 8);
  tft.print(text);
  if (strlen(text) <= 15) {
    tft.setTextColor(COL_TEXT, COL_STRIP);
    tft.setCursor(SCR_W - 60, STRIP_Y + 8);
    tft.printf("%u/%u", curSlot + 1, NUM_SLOTS);
    drawBattery();
  }
}

void drawRecTime(uint32_t sec) {
  tft.setTextSize(2);
  tft.setTextColor(COL_TEXT, COL_STRIP);
  tft.setCursor(170, STRIP_Y + 8);
  tft.printf("%2lus ", (unsigned long)sec);
}

void showStatus(const char *text, uint16_t color) {
  drawStrip(text, color);
  statusUntil = millis() + STATUS_HOLD_MS;
}

void drawScreen() {
  drawFaceArea();
  drawDots();
  drawStrip("READY", COL_TEXT);
}

void displaySleep(bool sleep) {
  if (sleep) {
    blSet(0);
    tft.sendCommand(ILI9341_SLPIN);
  } else {
    tft.sendCommand(ILI9341_SLPOUT);
    delay(120);
  }
}

// ======================= GERI BILDIRIM =======================
void bootFeedback() {
  ledsOff();
  for (int i = 0; i < 2; i++) {
    greenSet(true);  delay(120);
    greenSet(false); delay(120);
  }
  audioBegin();
  playTone(700, 90);
  playSilence(60);
  playTone(950, 120);
  audioEnd();
}

void sleepFeedback() {
  ledsOff();
  ledSet(PIN_LED1, true);
  audioBegin();
  playTone(600, 120);
  playSilence(60);
  playTone(400, 180);
  audioEnd();
  ledsOff();
}

void errorFeedback() {
  ledsOff();
  audioBegin();
  playTone(300, 200);
  audioEnd();
  for (int i = 0; i < 2; i++) {
    ledSet(PIN_LED3, true);  greenSet(true);  delay(150);
    ledSet(PIN_LED3, false); greenSet(false); delay(150);
  }
}

// ======================= KALICI VERILER =======================
void scanSlots() {
  for (uint8_t i = 0; i < NUM_SLOTS; i++) {
    slotFull[i]   = fileSize(slotPath(i)) > SLOT_MIN_BYTES;
    faceExists[i] = LittleFS.exists(facePath(i));
  }
}

void recoverTempFiles() {
  for (uint8_t i = 0; i < NUM_SLOTS; i++) {
    String t = slotTmp(i), p = slotPath(i);
    if (LittleFS.exists(t)) {
      if (LittleFS.exists(p))                    LittleFS.remove(t);
      else if (fileSize(t) > SLOT_MIN_BYTES)     LittleFS.rename(t, p);
      else                                       LittleFS.remove(t);
    }
    String ft = faceTmp(i);
    if (LittleFS.exists(ft)) LittleFS.remove(ft);   // yarim karakter yuklemesi
  }
}

void loadStats() {
  String s = readTextFile(STATS_FILE);
  if (!s.length()) return;
  stats.totalMs   = (uint32_t)jsonNum(s, "total_ms", 0);
  stats.count     = (uint32_t)jsonNum(s, "count", 0);
  stats.longestMs = (uint32_t)jsonNum(s, "longest_ms", 0);
  stats.lastTs    = (uint32_t)jsonNum(s, "last_ts", 0);
}

bool saveStats() {
  String s = "{\"total_ms\":" + String(stats.totalMs) +
             ",\"count\":" + String(stats.count) +
             ",\"longest_ms\":" + String(stats.longestMs) +
             ",\"last_ts\":" + String(stats.lastTs) + "}";
  return writeTextFile(STATS_FILE, s);
}

void appendLog(uint8_t slotNo, uint32_t ts, uint32_t durMs) {
  if (fileSize(LOG_FILE) > LOG_MAX_BYTES) LittleFS.remove(LOG_FILE);
  File f = LittleFS.open(LOG_FILE, "a");
  if (!f) return;
  f.printf("{\"slot\":%u,\"ts\":%lu,\"dur_ms\":%lu}\n",
           (unsigned)slotNo, (unsigned long)ts, (unsigned long)durMs);
  f.close();
}

void makeDeviceId() {
  uint64_t mac = ESP.getEfuseMac();
  char id[16];
  snprintf(id, sizeof(id), "BT-%02X%02X%02X",
           (uint8_t)(mac >> 24), (uint8_t)(mac >> 32), (uint8_t)(mac >> 40));
  deviceId = id;
}

bool saveOwner() {
  String s = "{\"uid\":\"" + jsonEscape(deviceId) +
             "\",\"profile\":\"" + jsonEscape(profileId) +
             "\",\"owner\":\"" + jsonEscape(profileName) +
             "\",\"bound_at\":" + String(boundAt) + "}";
  return writeTextFile(OWNER_FILE, s);
}

void loadOwner() {
  String s = readTextFile(OWNER_FILE);
  if (!s.length()) { saveOwner(); return; }
  profileId   = jsonStr(s, "profile");
  profileName = jsonStr(s, "owner");
  boundAt     = (uint32_t)jsonNum(s, "bound_at", 0);
  if (jsonStr(s, "uid") != deviceId) saveOwner();
}

// ======================= MIKROFON ISLEME =======================
void processMicBlock(MicProc &m, const int32_t *in, int16_t *out, size_t n, MicLevel &lv) {
  uint64_t blockSq = 0;
  for (size_t i = 0; i < n; i++) {
    int32_t x = in[i] >> MIC_SHIFT;
    if (!m.init) { m.xPrev = x; m.init = true; }
    int32_t hp = x - m.xPrev + ((m.yPrev * 251) >> 8);   // ~50 Hz yuksek geciren
    m.xPrev = x;
    m.yPrev = hp;

    int32_t y = hp * REC_GAIN;
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
    uint32_t blockRms = (uint32_t)sqrt((double)blockSq / n);
    if (blockRms < NOISE_GATE_RMS) {
      for (size_t i = 0; i < n; i++) out[i] /= 4;
    }
  }
#endif
}

void printLevel(const MicLevel &lv) {
  uint32_t rms = lv.count ? (uint32_t)sqrt((double)lv.sumSq / lv.count) : 0;
  Serial.printf("# seviye peak=%ld rms=%lu clip=%lu tasma=%lu\n",
                (long)lv.peak, (unsigned long)rms,
                (unsigned long)lv.clipped, (unsigned long)rxOverflows);
}

uint32_t blockRms(const int16_t *p, size_t n) {
  if (!n) return 0;
  uint64_t sq = 0;
  for (size_t i = 0; i < n; i++) sq += (uint64_t)((int32_t)p[i] * p[i]);
  return (uint32_t)sqrt((double)sq / n);
}

// ======================= KAYIT =======================
static CaptureCtx           cap;
static StreamBufferHandle_t capStream = nullptr;
static const size_t         CAP_STREAM_BYTES = 32000;
static uint8_t              wrBuf[2048];

void captureTask(void *arg) {
  static int32_t tBuf[256];
  static int16_t tPcm[256];
  uint8_t    out[128];
  MicProc    mic;
  AdpcmState enc;
  MicLevel   lv;
  bool       half = false;
  uint8_t    cur = 0;
  int        timeouts = 0;
  const uint32_t SETTLE = SR * REC_TRIM_START_MS / 1000;   // 1.0.6: 150 -> 300 ms
  const uint32_t FADE   = SR * 80 / 1000;                  // 1.0.6: 60 -> 80 ms yumusak giris
  uint32_t settled = 0, faded = 0;

  // 1.0.6: Son kirpma icin gecikme hatti. Ornekler REC_TRIM_END+FADE_OUT kadar
  // bekletildikten sonra kodlanip dosyaya gider. Kayit durunca hatta kalan son
  // kisim (REC tusunun basis/birakis tiki) atilir, kesim noktasi yumusak kapanir.
  static int16_t dly[(16000 * (REC_TRIM_END_MS + REC_FADE_OUT_MS)) / 1000];
  static int16_t outPcm[256];
  static int16_t fadePcm[(16000 * REC_FADE_OUT_MS) / 1000 + 1];
  const uint32_t DLY = sizeof(dly) / sizeof(dly[0]);
  uint32_t dHead = 0, dFill = 0, kept = 0;
  auto encodeOut = [&](const int16_t *src, size_t cnt) {
    size_t olen = 0;
    for (size_t i = 0; i < cnt; i++) {
      uint8_t nib = adpcmEncode(enc, src[i]);
      if (!half) { cur = nib << 4; half = true; }
      else       { out[olen++] = cur | nib; half = false; }
      if (olen == sizeof(out)) {
        size_t sent = xStreamBufferSend(capStream, out, olen, pdMS_TO_TICKS(20));
        if (sent < olen) cap.dropped += (olen - sent);
        olen = 0;
      }
    }
    if (olen) {
      size_t sent = xStreamBufferSend(capStream, out, olen, pdMS_TO_TICKS(20));
      if (sent < olen) cap.dropped += (olen - sent);
    }
  };

  while (cap.run && cap.samples < MAX_SAMPLES) {
    size_t want = sizeof(tBuf);
    uint32_t left = MAX_SAMPLES - cap.samples;
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

    if (settled < SETTLE) { settled += n; lv = MicLevel(); continue; }
    for (size_t i = 0; i < n && faded < FADE; i++, faded++) {
      tPcm[i] = (int16_t)((int32_t)tPcm[i] * (int32_t)faded / (int32_t)FADE);
    }

    cap.rms = blockRms(tPcm, n);          // animasyon icin canli seviye
    cap.rmsSeq++;

    // gecikme hattina yaz; hat doluysa en eski ornek cikar ve kodlanir
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
    if (oc) { encodeOut(outPcm, oc); kept += oc; }
    cap.samples += n;
  }

  // kayit bitti: hattin basindan FADE_OUT kadarini yumusak kapatarak yaz,
  // kalanini (REC tusu tiki) at
  {
    const uint32_t fo = (uint32_t)SR * REC_FADE_OUT_MS / 1000;
    uint32_t take = dFill < fo ? dFill : fo;
    for (uint32_t i = 0; i < take; i++) {
      int16_t v = dly[(dHead + i) % DLY];
      fadePcm[i] = (int16_t)((int32_t)v * (int32_t)(take - i) / (int32_t)take);
    }
    if (take) { encodeOut(fadePcm, take); kept += take; }
  }
  cap.samples = kept;                    // sure/istatistik kirpilmis uzunluga gore
  if (half) xStreamBufferSend(capStream, &cur, 1, pdMS_TO_TICKS(50));
  cap.done = true;
  vTaskDelete(nullptr);
}

void recordFail(const char *why) {
  logMsg(String("kayit hatasi: ") + why);
  drawMouth(0);
  showStatus("RECORD ERROR", COL_RED);
  errorFeedback();
  state = ST_IDLE;
  lastActivity = millis();
  clearButtonEvents();
}

void startRecording() {
  state = ST_RECORDING;
  lastActivity = millis();
  ledsOff();
  uint8_t slot = curSlot;

  if (!fsOk) { recordFail("dosya sistemi yok"); return; }
  if (!capStream) capStream = xStreamBufferCreate(CAP_STREAM_BYTES, 1);
  if (!capStream) { recordFail("bellek"); return; }
  xStreamBufferReset(capStream);

  size_t freeB = LittleFS.totalBytes() - LittleFS.usedBytes();
  if (freeB < MAX_REC_BYTES + 16384 && LittleFS.exists(slotPath(slot))) {
    LittleFS.remove(slotPath(slot));
    slotFull[slot] = false;
    logMsg("yer az: eski kayit once silindi");
  }

  File f = LittleFS.open(slotTmp(slot), "w");
  if (!f) { recordFail("dosya acilamadi"); return; }

#if REC_BEEPS
  audioBegin();                                // kayit oncesi uyari
  playTone(880, 130);
  audioEnd();
#endif
  ampMute();                                   // kayit boyunca hoparlor sessiz
  drawMouth(0);
  drawStrip("RECORDING", COL_TEXT);
  drawRecDot(true);
  drawRecTime(0);

  rxStart();
  delay(50);
  rxFlush();
  clearButtonEvents();
  rxOverflows = 0;

  cap.done = false; cap.i2sErr = false; cap.samples = 0;
  cap.dropped = 0; cap.rms = 0; cap.rmsSeq = 0;
  cap.run = true;
  if (xTaskCreatePinnedToCore(captureTask, "cap", 6144, nullptr, 10, nullptr, 0) != pdPASS) {
    f.close();
    LittleFS.remove(slotTmp(slot));
    rxStop();
    recordFail("gorev");
    return;
  }

  size_t   written  = 0;
  bool     writeErr = false;
  uint32_t t0 = millis();
  uint32_t lastBlink = t0;
  uint32_t lastSec = 0;
  uint32_t seenSeq = 0;
  bool     blinkOn = true;
  ledSet(PIN_LED3, true);

  while (true) {
    updateButtons();
    if (takeEvent(B_REC) & EVB_SHORT) cap.run = false;   // uzun basis kaydi bitirmez
    takeEvent(B_ONOFF);
    takeEvent(B_PLAY);
    takeEvent(B_NEXT);

    uint32_t now = millis();
#if REC_LED_BLINK
    if (now - lastBlink >= 400) {
      blinkOn = !blinkOn;
      ledSet(PIN_LED3, blinkOn);
      drawRecDot(blinkOn);
      lastBlink = now;
    }
#else
    (void)lastBlink; (void)blinkOn;
#endif
    uint32_t sec = cap.samples / SR;
    if (sec != lastSec) { drawRecTime(sec); lastSec = sec; }

    if (cap.rmsSeq != seenSeq) {
      seenSeq = cap.rmsSeq;
#if REC_MOUTH_ANIM
      updateMouth(rmsToLevel(cap.rms, REC_LVL_MIN, REC_LVL_MAX));
#endif
      if (LEVEL_LOG) Serial.printf("# rms=%lu\n", (unsigned long)cap.rms);
    }

    if (now - t0 > (MAX_SEC + 5) * 1000UL) cap.run = false;   // duvar saati emniyeti

    size_t got = xStreamBufferReceive(capStream, wrBuf, sizeof(wrBuf), pdMS_TO_TICKS(10));
    if (got && !writeErr) {
      if (f.write(wrBuf, got) != got) { writeErr = true; cap.run = false; }
      else written += got;
    }
    if (cap.done && xStreamBufferIsEmpty(capStream)) break;
  }

  f.close();
  rxStop();
  ledsOff();
  drawMouth(0);

  Serial.printf("# kayit ozeti: slot=%u ornek=%lu i2s_tasma=%lu tampon_kayip=%lu\n",
                slot + 1, (unsigned long)cap.samples,
                (unsigned long)rxOverflows, (unsigned long)cap.dropped);

  if (writeErr || cap.i2sErr) {
    LittleFS.remove(slotTmp(slot));
    recordFail(writeErr ? "yazma" : "mikrofon");
    return;
  }

  if (LittleFS.exists(slotPath(slot))) LittleFS.remove(slotPath(slot));
  if (!LittleFS.rename(slotTmp(slot), slotPath(slot))) {
    scanSlots();
    recordFail("yeniden adlandirma");
    return;
  }
  scanSlots();

  uint32_t durMs = (uint32_t)((uint64_t)cap.samples * 1000ULL / SR);
  if (slotFull[slot]) {
    stats.count++;
    stats.totalMs += durMs;
    if (durMs > stats.longestMs) stats.longestMs = durMs;
    stats.lastTs = nowEpoch();
    if (!saveStats()) logMsg("istatistik yazilamadi");
    appendLog(slot + 1, stats.lastTs, durMs);
  }

  drawDots();
  showStatus("SAVED", COL_GREEN);
#if REC_BEEPS
  audioBegin();                                // kayit bitti
  playTone(660, 100);
  playSilence(80);
  playTone(880, 140);
  audioEnd();
#endif
  state = ST_IDLE;
  lastActivity = millis();
  clearButtonEvents();
}

// ======================= OYNATMA =======================
static uint8_t inBuf[256];
static int16_t decBuf[512];
static txs_t   outBuf[1024];

void startPlayback() {
  lastActivity = millis();
  uint8_t slot = curSlot;
  if (!slotFull[slot]) {
    showStatus("EMPTY SLOT", COL_YELLOW);
    errorFeedback();
    clearButtonEvents();
    return;
  }
  File f = LittleFS.open(slotPath(slot), "r");
  if (!f) {
    slotFull[slot] = false;
    showStatus("EMPTY SLOT", COL_YELLOW);
    errorFeedback();
    clearButtonEvents();
    return;
  }

  state = ST_PLAYING;
  clearButtonEvents();
  ledsOff();
  greenSet(true);
  drawStrip("PLAYING", COL_TEXT);
  drawMouth(0);
  audioBegin();

  AdpcmState dec;
  const uint32_t FADE = SR * 30 / 1000;
  uint32_t played = 0;
  uint8_t  lvlQ[16] = { 0 };                    // 1.0.3: 8 -> 16 (TX_DELAY_BLOCKS = 8)
  uint8_t  qi = 0;
  int32_t  peakEst = MOUTH_PEAK_FLOOR;          // 1.0.2: uyarlanir agiz

  while (true) {
    updateButtons();
    if (takeEvent(B_PLAY) & EVB_RELEASE) break;   // PLAY'e basip birakmak durdurur
    takeEvent(B_ONOFF);
    takeEvent(B_REC);
    takeEvent(B_NEXT);

    int r = f.read(inBuf, sizeof(inBuf));
    if (r <= 0) break;

    size_t n = 0;
    for (int i = 0; i < r; i++) {
      decBuf[n++] = adpcmDecode(dec, inBuf[i] >> 4);
      decBuf[n++] = adpcmDecode(dec, inBuf[i] & 0x0F);
    }
    uint32_t rms = blockRms(decBuf, n);          // kazanc oncesi RMS

    size_t k = 0;
    for (size_t i = 0; i < n; i++) {
      int32_t v = (int32_t)decBuf[i] * PLAY_GAIN_X100 / 100;
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

    // Yazilan blok ~TX_DELAY_BLOCKS blok sonra duyulur: animasyonu esitle
#if MOUTH_ADAPTIVE
    if ((int32_t)rms > peakEst) peakEst = (int32_t)rms;
    else                        peakEst -= peakEst >> 8;
    if (peakEst < MOUTH_PEAK_FLOOR) peakEst = MOUTH_PEAK_FLOOR;
    uint8_t lvl = 0;
    if ((int32_t)rms >= peakEst / MOUTH_IDLE_DIV) {
      uint32_t l = (uint64_t)rms * 14ULL / (uint32_t)(peakEst + 1);
      lvl = (uint8_t)(l < 1 ? 1 : (l > 13 ? 13 : l));
    }
    lvlQ[qi] = lvl;
#else
    lvlQ[qi] = rmsToLevel(rms, PLAY_LVL_MIN, PLAY_LVL_MAX);
#endif
    uint8_t show = lvlQ[(qi + 16 - TX_DELAY_BLOCKS) % 16];
    qi = (qi + 1) % 16;
#if PLAY_MOUTH_ANIM
    updateMouth(show);
#else
    (void)show;
#endif
  }

  f.close();
  audioEnd();
  drawMouth(0);
  ledsOff();
  drawStrip("READY", COL_TEXT);
  state = ST_IDLE;
  lastActivity = millis();
  clearButtonEvents();
}

// ======================= SLOT / SILME =======================
void selectNext() {
  curSlot = (curSlot + 1) % NUM_SLOTS;
  faceLoad(curSlot);
  drawFaceArea();
  drawDots();
  drawStrip("READY", COL_TEXT);
  statusUntil = 0;
  ledSet(PIN_LED4, true);
  led4Until = millis() + 150;
  lastActivity = millis();
}

void enterConfirmDelete() {
  lastActivity = millis();
  if (!slotFull[curSlot]) {
    showStatus("EMPTY SLOT", COL_YELLOW);
    errorFeedback();
    clearButtonEvents();
    return;
  }
  state = ST_CONFIRM_DEL;
  confirmUntil = millis() + DELETE_CONFIRM_MS;
  greenSet(false);
  drawStrip("PRESS AGAIN TO DELETE", COL_YELLOW);
  clearButtonEvents();
}

void cancelDelete() {
  state = ST_IDLE;
  ledsOff();
  showStatus("CANCELLED", COL_TEXT);
  lastActivity = millis();
  clearButtonEvents();
}

void confirmStep() {
  static uint32_t lastBlink = 0;
  if (millis() - lastBlink >= 150) {
    ledSet(PIN_LED3, (millis() / 150) % 2);
    lastBlink = millis();
  }

  if (takeEvent(B_REC) & EVB_RELEASE) {
    // Yalnizca ses kaydi silinir; karakter korunur
    bool ok = LittleFS.remove(slotPath(curSlot));
    scanSlots();
    state = ST_IDLE;
    ledsOff();
    drawDots();
    showStatus(ok ? "DELETED" : "DELETE ERROR", ok ? COL_GREEN : COL_RED);
    logMsg(String("slot ") + (curSlot + 1) + (ok ? " silindi" : " silinemedi"));
    lastActivity = millis();
    clearButtonEvents();
    return;
  }
  for (uint8_t i = 0; i < 4; i++) {
    if (i != B_REC && (takeEvent(i) & EVB_ANY)) { cancelDelete(); return; }
  }
  if (millis() > confirmUntil) cancelDelete();
}

// ======================= UYKU =======================
bool usbHostConnected() { return (bool)Serial; }

void holdOutputs(bool en) {
  const uint8_t pins[] = { PIN_AMP_SD, PIN_LED1, PIN_LED2, PIN_LED3, PIN_LED4, PIN_TFT_BL };
  for (uint8_t p : pins) {
    if (en) gpio_hold_en((gpio_num_t)p);
    else    gpio_hold_dis((gpio_num_t)p);
  }
}

static volatile bool gpioWoke = false;   // 1.0.3: tusla uyanildi mi

void lightSleepOnce() {
#if ONOFF_ONLY_WAKES
  const uint8_t btns[] = { PIN_BTN_ONOFF };
#else
  const uint8_t btns[] = { PIN_BTN_ONOFF, PIN_BTN_PLAY, PIN_BTN_REC, PIN_BTN_NEXT };
#endif
  for (uint8_t p : btns) {
    // 1.0.3: uykuda pinin normal ayari (INPUT_PULLUP) korunsun; IDF uyku
    // konfigurasyonuna gecerse pull-up kalkip tus uyandiramayabiliyordu
    gpio_sleep_sel_dis((gpio_num_t)p);
    gpio_wakeup_enable((gpio_num_t)p, GPIO_INTR_LOW_LEVEL);
  }
  esp_sleep_enable_gpio_wakeup();

  Serial.flush();
  holdOutputs(true);
  esp_light_sleep_start();
  holdOutputs(false);

  if (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_GPIO) gpioWoke = true;

  for (uint8_t p : btns) {
    gpio_wakeup_disable((gpio_num_t)p);
    pinMode(p, INPUT_PULLUP);
  }
  sleepQuietSince = millis();
}

void enterSleep() {
  logMsg("kapaniyor (uyku)");
  powerOn = false;
  sleepFeedback();
  rxStop();
  ampMute();
  ledsOff();
  displaySleep(true);
  while (anyButtonHeld()) { updateButtons(); delay(5); }
  clearButtonEvents();
  state = ST_SLEEPING;
  sleepQuietSince = millis();
}

void wakeUp() {
  powerOn = true;
  batNextAt = 0;                        // uyanista pil hemen olculsun
  state = ST_IDLE;
  // 1.0.3: uyandiran tus birakilana kadar bekle; birakma olayi PLAY/REC gibi
  // bir islemi tetiklemesin
  for (uint32_t t0 = millis(); millis() - t0 < 1500; ) {
    updateButtons();
    if (!anyButtonHeld()) break;
    delay(5);
  }
  clearButtonEvents();
  logMsg("uyandi");
  // 1.0.3: ekran ve arka isik uykudan sonra bastan kurulur (yalniz SLPOUT
  // gondermek bazen ekrani karanlik birakiyordu)
  ledcDetach(PIN_TFT_BL);
  ledcAttach(PIN_TFT_BL, 5000, 8);
  ledcDetach(PIN_LED2);
  ledcAttach(PIN_LED2, 5000, 8);
  blSet(0);
  tft.begin(TFT_SPI_HZ);
  tft.setRotation(TFT_ROTATION);
  drawScreen();
  blSet(BL_LEVEL);
  bootFeedback();
  lastActivity = millis();
}

void sleepStep() {
  bool woke = gpioWoke;                  // 1.0.3: tusla uyandiysa birakmayi bekleme
  gpioWoke = false;
#if ONOFF_ONLY_WAKES
  // 1.0.8: yalnizca ON/OFF acar; diger tuslarin olaylari atilir
  if (takeEvent(B_ONOFF) & EVB_ANY) woke = true;
  else if (woke && !(buttons[B_ONOFF].pressed || buttons[B_ONOFF].rawPressed)) woke = false;
  for (uint8_t i = 1; i < 4; i++) takeEvent(i);
#else
  for (uint8_t i = 0; i < 4; i++) {
    if (takeEvent(i) & EVB_ANY) woke = true;
  }
#endif
  if (woke) { wakeUp(); return; }

#if USE_LIGHT_SLEEP
#if ONOFF_ONLY_WAKES
  if (buttons[B_ONOFF].pressed || buttons[B_ONOFF].rawPressed) { sleepQuietSince = millis(); return; }
#else
  if (anyButtonHeld()) { sleepQuietSince = millis(); return; }
#endif
  if (millis() - sleepQuietSince < 300) return;
  #if NO_SLEEP_ON_USB
  if (usbHostConnected()) return;
  #endif
  lightSleepOnce();
#endif
}

// ======================= IDLE =======================
void idleStep() {
#if IDLE_PLAY_LED == 2
  breathe();
#elif IDLE_PLAY_LED == 1
  greenSet(slotFull[curSlot]);
#else
  greenSet(false);
#endif
  batteryStep();
  if (state != ST_IDLE) return;
  uint32_t now = millis();
  if (anyButtonHeld()) lastActivity = now;
#if NO_AUTO_SLEEP_ON_USB
  if (usbHostConnected()) lastActivity = now;   // 1.0.3: USB takiliyken otomatik uyku yok
#endif
  if (led4Until && now > led4Until) { ledSet(PIN_LED4, false); led4Until = 0; }
  if (statusUntil && now > statusUntil) { drawStrip("READY", COL_TEXT); statusUntil = 0; }

  if (takeEvent(B_ONOFF) & EVB_HOLD)    { logMsg("ON/OFF: kapat"); enterSleep(); return; }
  if (takeEvent(B_PLAY)  & EVB_RELEASE) { startPlayback(); return; }

  uint8_t er = takeEvent(B_REC);
  if (er & EVB_SHORT)   { startRecording(); return; }
  if (er & EVB_LONGREL) { enterConfirmDelete(); return; }

  if (takeEvent(B_NEXT) & EVB_RELEASE)  { selectNext(); return; }

  if (now - lastActivity >= IDLE_SLEEP_MS) { logMsg("hareketsizlik"); enterSleep(); }
}

// ======================= USB: KARAKTER YUKLEME =======================
static char    upLine[8200];
static uint8_t upBin[6200];

int b64val(char c) {
  if (c >= 'A' && c <= 'Z') return c - 'A';
  if (c >= 'a' && c <= 'z') return c - 'a' + 26;
  if (c >= '0' && c <= '9') return c - '0' + 52;
  if (c == '+') return 62;
  if (c == '/') return 63;
  return -1;
}

// Donus: cozulen bayt sayisi, hata -1
int b64decode(const char *s, uint8_t *out, size_t outMax) {
  uint32_t acc = 0;
  int bits = 0;
  size_t n = 0;
  for (; *s; s++) {
    char c = *s;
    if (c == '=' ) break;
    if (c == ' ' || c == '\r' || c == '\t') continue;
    int v = b64val(c);
    if (v < 0) return -1;
    acc = (acc << 6) | (uint32_t)v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      if (n >= outMax) return -1;
      out[n++] = (uint8_t)(acc >> bits);
    }
  }
  return (int)n;
}

void faceReceive(int slotNo) {
  if (slotNo < 1 || slotNo > NUM_SLOTS) {
    Serial.println("{\"ok\":0,\"err\":\"slot\"}");
    return;
  }
  uint8_t idx = slotNo - 1;
  String tmp = faceTmp(idx);
  File f = LittleFS.open(tmp, "w");
  if (!f) {
    Serial.printf("{\"ok\":0,\"slot\":%d,\"err\":\"dosya\"}\n", slotNo);
    return;
  }
  drawStrip("RECEIVING FACE", COL_TEXT);
  Serial.printf("{\"ready\":1,\"slot\":%d}\n", slotNo);

  size_t   len = 0;
  size_t   total = 0;
  bool     eof = false, overflow = false;
  const char *err = nullptr;
  uint32_t last = millis();

  while (!eof && !err) {
    if (millis() - last > UPLOAD_TIMEOUT_MS) { err = "zaman_asimi"; break; }
    if (!Serial.available()) { delay(1); continue; }
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c != '\n') {
      if (len < sizeof(upLine) - 1) upLine[len++] = c;
      else overflow = true;
      continue;
    }
    upLine[len] = 0;
    len = 0;
    last = millis();
    if (overflow) { err = "satir_uzun"; break; }
    if (strcmp(upLine, "EOF") == 0) { eof = true; break; }
    if (upLine[0] == 0) { Serial.println("."); continue; }

    int n = b64decode(upLine, upBin, sizeof(upBin));
    if (n < 0) { err = "base64"; break; }
    if (n > 0 && f.write(upBin, n) != (size_t)n) { err = "yazma"; break; }
    total += n;
    Serial.println(".");
  }
  f.close();

  if (!err) {
    FaceInfo test;
    err = faceValidate(tmp, test);
  }
  if (err) {
    LittleFS.remove(tmp);                      // eski karakter korunur
    Serial.printf("{\"ok\":0,\"slot\":%d,\"err\":\"%s\",\"bytes\":%u}\n", slotNo, err, (unsigned)total);
    logMsg(String("karakter yukleme hatasi: ") + err);
    if (state != ST_SLEEPING) showStatus("UPLOAD ERROR", COL_RED);
    return;
  }

  if (idx == curSlot) faceFree();              // acik dosyayi birak
  String dst = facePath(idx);
  if (LittleFS.exists(dst)) LittleFS.remove(dst);
  bool ok = LittleFS.rename(tmp, dst);
  faceExists[idx] = LittleFS.exists(dst);

  Serial.printf("{\"ok\":%d,\"slot\":%d,\"bytes\":%u}\n", ok ? 1 : 0, slotNo, (unsigned)total);

  if (state == ST_SLEEPING) {
    if (idx == curSlot) faceLoad(curSlot);     // uyaninca cizilir
    return;
  }
  if (idx == curSlot) {
    faceLoad(curSlot);
    drawFaceArea();
  }
  showStatus(ok ? "FACE LOADED" : "UPLOAD ERROR", ok ? COL_GREEN : COL_RED);
}

// ======================= USB: DIGER KOMUTLAR =======================
String boolArray(const bool *a) {
  String s = "[";
  for (uint8_t i = 0; i < NUM_SLOTS; i++) {
    if (i) s += ",";
    s += a[i] ? "1" : "0";
  }
  return s + "]";
}

void sendHello() {
  // SITE UYUMU: "dev" tek harf tip kodu olmali (F/B/D). Site bu koda gore
  // cihazi tanir; "Brick-Talks" gelirse sunucu 400 (md_bad_dev) doner.
  String s = "{\"dev\":\"B\",\"name\":\"" DEVICE_NAME "\",\"fw\":\"" FW_VERSION "\"";
  s += ",\"slots\":" + String(NUM_SLOTS);
  s += ",\"uid\":\"" + jsonEscape(deviceId) + "\"";
  s += ",\"profile\":\"" + jsonEscape(profileId) + "\"";
  s += ",\"owner\":\"" + jsonEscape(profileName) + "\"";
  s += ",\"bound\":" + String(profileId.length() ? "true" : "false");
  s += ",\"faces\":" + boolArray(faceExists);
  s += ",\"recs\":" + boolArray(slotFull);
  s += ",\"cur\":" + String(curSlot + 1);
  s += ",\"time_valid\":" + String(nowEpoch() ? "true" : "false");
  s += "}";
  Serial.println(s);
}

void sendStats() {
  // SITE UYUMU: site bu satiri "total_s" anahtarindan tanir (yoksa 5 sn sonra
  // "The kit did not respond" verir). uid/profile da stats'ta olmali, sunucu
  // cihazi uid ile kaydeder. Slotlarda site "i" ve "len_ms" okur.
  // Eski alanlar (total_ms, slot, dur_ms ...) korunur, mevcut araclar etkilenmez.
  String s = "{\"stats\":1";
  s += ",\"uid\":\"" + jsonEscape(deviceId) + "\"";
  s += ",\"profile\":\"" + jsonEscape(profileId) + "\"";
  s += ",\"total_s\":" + String((stats.totalMs + 500) / 1000);
  s += ",\"longest_s\":" + String((stats.longestMs + 500) / 1000);
  s += ",\"total_ms\":" + String(stats.totalMs);
  s += ",\"count\":" + String(stats.count);
  s += ",\"longest_ms\":" + String(stats.longestMs);
  s += ",\"last_ts\":" + String(stats.lastTs);
  s += ",\"slots\":[";
  for (uint8_t i = 0; i < NUM_SLOTS; i++) {
    size_t b = fileSize(slotPath(i));
    uint32_t ms = slotFull[i] ? (uint32_t)((uint64_t)b * 2000ULL / SR) : 0;
    if (i) s += ",";
    s += "{\"i\":" + String(i + 1) +
         ",\"slot\":" + String(i + 1) +
         ",\"full\":" + String(slotFull[i] ? 1 : 0) +
         ",\"len_ms\":" + String(ms) +
         ",\"dur_ms\":" + String(ms) +
         ",\"face\":" + String(faceExists[i] ? 1 : 0) + "}";
  }
  s += "]";
  if (fsOk) {
    s += ",\"fs_total\":" + String((uint32_t)LittleFS.totalBytes());
    s += ",\"fs_used\":" + String((uint32_t)LittleFS.usedBytes());
  }
  s += "}";
  Serial.println(s);
}

void sendHistory() {
  File f = LittleFS.open(LOG_FILE, "r");
  if (f) {
    while (f.available()) {
      String line = f.readStringUntil('\n');
      line.trim();
      if (line.length()) Serial.println(line);
    }
    f.close();
  }
  Serial.println("EOF");
}

void sendDump(int slotNo) {
  if (slotNo < 1 || slotNo > NUM_SLOTS || !slotFull[slotNo - 1]) {
    Serial.printf("{\"dump\":%d,\"err\":\"slot_bos\"}\n", slotNo);
    Serial.println("EOF");
    return;
  }
  File f = LittleFS.open(slotPath(slotNo - 1), "r");
  if (!f) {
    Serial.printf("{\"dump\":%d,\"err\":\"acilamadi\"}\n", slotNo);
    Serial.println("EOF");
    return;
  }
  drawStrip("TRANSFERRING", COL_TEXT);
  Serial.setTxTimeoutMs(500);
  Serial.printf("{\"dump\":%d,\"samples\":%lu,\"sr\":%lu}\n",
                slotNo, (unsigned long)(f.size() * 2), (unsigned long)SR);

  AdpcmState dec;
  char out[2048];
  size_t ol = 0;
  int r;
  while ((r = f.read(inBuf, sizeof(inBuf))) > 0) {
    for (int i = 0; i < r; i++) {
      int16_t a = adpcmDecode(dec, inBuf[i] >> 4);
      int16_t b = adpcmDecode(dec, inBuf[i] & 0x0F);
      ol += snprintf(out + ol, sizeof(out) - ol, "%d\n%d\n", a, b);
      if (ol > sizeof(out) - 32) { serialWriteAll((const uint8_t *)out, ol); ol = 0; }
    }
  }
  if (ol) serialWriteAll((const uint8_t *)out, ol);
  f.close();
  Serial.println("EOF");
  Serial.setTxTimeoutMs(50);
  drawStrip("READY", COL_TEXT);
}

void micTest() {
  logMsg("mictest: ilk 2 sn sessiz kalin, sonra konusun");
  rxStart();
  delay(150);
  rxFlush();
  rxOverflows = 0;
  MicProc  m;
  MicLevel lv;
  uint32_t t0 = millis(), last = t0;
  while (millis() - t0 < 5000) {
    size_t br = 0;
    if (i2s_channel_read(rxChan, rxBuf, sizeof(rxBuf), &br, 100) == ESP_OK && br) {
      size_t n = br / sizeof(int32_t);
      processMicBlock(m, rxBuf, pcmBuf, n, lv);
      updateMouth(rmsToLevel(blockRms(pcmBuf, n), REC_LVL_MIN, REC_LVL_MAX));
    }
    if (millis() - last >= 250) { printLevel(lv); lv = MicLevel(); last = millis(); }
  }
  rxStop();
  drawMouth(0);
  Serial.println("EOF");
}

void toneTest() {
  const int32_t levels[3] = { 2000, 8000, 20000 };
  for (int i = 0; i < 3; i++) {
    Serial.printf("# ton %d/3 genlik=%ld\n", i + 1, (long)levels[i]);
    audioBegin();
    playToneAmp(440, 1000, levels[i]);
    audioEndTail(TX_BUF_MS + 60 > 300 ? TX_BUF_MS + 60 : 300);
    delay(400);
  }
  Serial.println("EOF");
}

void handleCommand(String line) {
  line.trim();
  if (!line.length()) return;

  String cmd = jsonStr(line, "cmd");
  if (!cmd.length()) cmd = line;
  cmd.toLowerCase();

  if (cmd == "bat") {
    int32_t mv = batReadMv();
#if BAT_ADC_PIN >= 0
    Serial.printf("# bat ham pin mV=%lu\n", (unsigned long)analogReadMilliVolts(BAT_ADC_PIN));
#endif
    Serial.printf("{\"bat\":1,\"mv\":%ld,\"pct\":%d,\"usb\":%d,\"chg\":%u,\"adc_pin\":%d,\"usb_pin\":%d}\n",
                  (long)mv, mv > 0 ? mvToPct(mv) : -1, usbPowerPresent() ? 1 : 0, batChg,
                  BAT_ADC_PIN, USB_SENSE_PIN);
  } else if (cmd == "pins") {
    printPins(); printButtonMap();
  } else if (cmd == "hello") {
    sendHello();
  } else if (cmd == "face") {
    faceReceive((int)jsonNum(line, "slot", 0));
  } else if (cmd == "dump") {
    sendDump((int)jsonNum(line, "slot", 0));
  } else if (cmd == "stats") {
    sendStats();
  } else if (cmd == "history") {
    sendHistory();
  } else if (cmd == "bind") {
    String pid = jsonStr(line, "profile");
    if (!pid.length()) pid = jsonStr(line, "profile_id");
    String own = jsonStr(line, "owner");
    if (!own.length()) own = jsonStr(line, "profile_name");
    if (!pid.length()) {
      Serial.println("{\"bind\":1,\"ok\":0,\"err\":\"profile\"}");
    } else {
      profileId = pid;
      profileName = own;
      boundAt = nowEpoch();
      Serial.printf("{\"bind\":1,\"ok\":%d}\n", saveOwner() ? 1 : 0);
    }
  } else if (cmd == "unbind") {
    profileId = "";
    profileName = "";
    boundAt = 0;
    Serial.printf("{\"unbind\":1,\"ok\":%d}\n", saveOwner() ? 1 : 0);
  } else if (cmd == "time") {
    double ep = jsonNum(line, "epoch", 0);
    bool ok = ep > 1600000000.0;
    if (ok) {
      struct timeval tv = { (time_t)ep, 0 };
      settimeofday(&tv, nullptr);
    }
    Serial.printf("{\"time\":1,\"ok\":%d,\"epoch\":%lu}\n", ok ? 1 : 0, (unsigned long)nowEpoch());
  } else if (cmd == "mictest") {
    micTest();
  } else if (cmd == "tonetest") {
    toneTest();
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
      return;                                  // uzun komutlardan sonra donguye don
    } else if (c != '\r') {
      if (len < sizeof(buf) - 1) buf[len++] = c;
    }
  }
}

// ======================= SETUP / LOOP =======================
void setup() {
  pinMode(PIN_AMP_SD, OUTPUT);
  digitalWrite(PIN_AMP_SD, LOW);

  pinMode(PIN_BTN_ONOFF, INPUT_PULLUP);
  pinMode(PIN_BTN_PLAY,  INPUT_PULLUP);
  pinMode(PIN_BTN_REC,   INPUT_PULLUP);
  pinMode(PIN_BTN_NEXT,  INPUT_PULLUP);
#if USB_SENSE_PIN >= 0
  pinMode(USB_SENSE_PIN, INPUT_PULLDOWN);     // bolucu yoksa LOW kalsin (kablo takili degil)
#endif
#if BAT_ADC_PIN >= 0
  analogSetPinAttenuation(BAT_ADC_PIN, ADC_11db);
#endif

  pinMode(PIN_LED1, OUTPUT);
  pinMode(PIN_LED3, OUTPUT);
  pinMode(PIN_LED4, OUTPUT);
  ledcAttach(PIN_LED2, 5000, 8);
  ledcAttach(PIN_TFT_BL, 5000, 8);
  blSet(0);
  ledsOff();

  Serial.setRxBufferSize(8192);
  Serial.begin(115200);
  Serial.setTxTimeoutMs(50);
  delay(200);
  logMsg(DEVICE_NAME " " FW_VERSION " basliyor");
  printButtonMap();

  SPI.begin(PIN_TFT_SCK, -1, PIN_TFT_MOSI, PIN_TFT_CS);
  tft.begin(TFT_SPI_HZ);
  tft.setRotation(TFT_ROTATION);
  tft.fillScreen(COL_BG);
  blSet(BL_LEVEL);
  drawStrip("STARTING...", COL_TEXT);

  makeDeviceId();

  fsOk = LittleFS.begin(false);
  if (!fsOk) {
    logMsg("LittleFS baglanamadi, bicimlendiriliyor");
    drawStrip("PREPARING MEMORY", COL_YELLOW);
    fsOk = LittleFS.format() && LittleFS.begin(false);
  }
  if (fsOk) {
    recoverTempFiles();
    scanSlots();
    loadStats();
    loadOwner();
    logMsg("dosya alani: " + String((uint32_t)LittleFS.totalBytes()) + " bayt");
  } else {
    logMsg("HATA: dosya sistemi kullanilamiyor");
  }

  if (!initI2S()) logMsg("HATA: I2S baslatilamadi");

  for (auto &b : buttons) {
    b.rawPressed = b.pressed = (digitalRead(b.pin) == LOW);
    b.suppress = b.pressed;
    b.rawChangedAt = millis();
  }

  curSlot = 0;
  faceLoad(curSlot);
  drawScreen();

  bootFeedback();
  if (!fsOk) {
    showStatus("MEMORY ERROR", COL_RED);
    errorFeedback();
  }

  state = ST_IDLE;
  lastActivity = millis();
}

void loop() {
  updateButtons();

  switch (state) {
    case ST_IDLE:
      handleSerial();
      if (state == ST_IDLE) idleStep();
      break;
    case ST_SLEEPING:
      handleSerial();
      if (state == ST_SLEEPING) sleepStep();
      break;
    case ST_CONFIRM_DEL:
      confirmStep();
      break;
    default:
      state = ST_IDLE;
      break;
  }
  delay(2);
}
