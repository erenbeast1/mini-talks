/*
 * ============================================================
 *  Fig-Talks Firmware - ESP32-S3 N8
 *  Surum: FT-S3-1.0.0
 *  Referans: FT-FW-SPEC-001 (VersionF_firmware_v20_c3.ino davranisi)
 * ============================================================
 *  Arduino IDE ayarlari (Tools menusu):
 *    Board              : ESP32S3 Dev Module  (esp32 by Espressif 3.x)
 *    USB CDC On Boot    : Enabled
 *    USB Mode           : Hardware CDC and JTAG
 *    Upload Mode        : UART0 / Hardware CDC
 *    Flash Size         : 8MB (64Mb)
 *    Partition Scheme   : 8M with spiffs (3MB APP/1.5MB SPIFFS)
 *    PSRAM              : Disabled
 *
 *  Donanim:
 *    Butonlar (INPUT_PULLUP, basinca LOW), soldan saga: ON/OFF, RECORD, PLAY
 *    Pinler BTN_CABLE_REVERSED ayarina gore (asagida)
 *    INMP441 (I2S0, RX, L/R=GND -> sol kanal): SCK=1, WS=5, SD=2
 *    MAX98357 (I2S1, TX): BCLK=7, LRCLK=4, DIN=21, SD(kapatma)=15
 *    USB: GPIO19/20 (native USB, Serial buradan calisir)
 * ============================================================
 */

#include <Arduino.h>
#include <FS.h>
#include <LittleFS.h>
#include <math.h>
#include <time.h>
#include <sys/time.h>
#include "driver/i2s_std.h"
#include "driver/gpio.h"
#include "esp_sleep.h"
#include "freertos/stream_buffer.h"

// ======================= AYARLAR =======================
#define FW_VERSION          "FT-S3-1.0.5"   // 1.0.1: site protokol uyumu · 1.0.2 buton sirasi (ON/OFF-RECORD-PLAY) + buton logu · 1.0.3 ON/OFF ac/kapa · 1.0.4 ters kablolu kart + gurultu kapisi kapali · 1.0.5 yanip sonen LED yok

// LED baglanti yonu:
//   true  -> GPIO -> direnc -> LED -> GND   (HIGH = yanik)
//   false -> 3V3 -> LED -> direnc -> GPIO   (LOW  = yanik)
#define LED_ACTIVE_HIGH     true

// 1.0.3: ON/OFF ac/kapa
//   Acikken ON/OFF LED'i yanik kalir.
//   ON/OFF basili tutulunca (LONG_PRESS_MS) cihaz kapanir (uyku).
//   Kapaliyken yalnizca ON/OFF acar; PLAY/RECORD cihazi uyandirmaz.
#define ONOFF_ONLY_WAKES    true

// SLEEPING durumunda gercek light sleep kullan
#define USE_LIGHT_SLEEP     true
// USB bilgisayara bagliyken light sleep'e girme (seri iletisim kopmasin)
#define NO_SLEEP_ON_USB     true

// 1.0.2: buton logu. 1 = her basis/birakis ve hattaki kisa darbeler (gurultu)
// Serial'e "# btn..." satiri olarak yazilir. {"cmd":"pins"} anlik pin durumunu verir.
#define BTN_LOG             1

// 1.0.4: buton kartinin kablosu ters baglanmis (SW1 <-> SW3, LED1 <-> LED3):
// en sagdaki tus ON/OFF gibi davraniyor, en soldaki LED nefes aliyordu.
//   1 = ters kablo (su anki prototip)   0 = duz kablo (kart H1.1 -> ana kart H6.1 ...)
// Her iki durumda da kart uzerinde soldan saga: SW1 ON/OFF - SW2 RECORD - SW3 PLAY
#define BTN_CABLE_REVERSED  0

// 1.0.5: LED davranisi (surekli yanip sonme yok)
//   ON/OFF: cihaz acikken sabit yanik
//   RECORD: kayit boyunca sabit yanik
//   PLAY  : oynatma boyunca sabit yanik
//   Beklemede PLAY LED'i: 0 = sonuk, 1 = kayit varsa sabit yanik, 2 = eski nefes efekti
#define IDLE_PLAY_LED       0
#define REC_LED_BLINK       0     // 1 = kayitta RECORD LED'i eskisi gibi yanip soner

// ----------------------- Pinler -----------------------
#if BTN_CABLE_REVERSED
static const uint8_t PIN_BTN_ONOFF = 48;
static const uint8_t PIN_BTN_REC   = 41;
static const uint8_t PIN_BTN_PLAY  = 40;
static const uint8_t PIN_LED1      = 42;   // ON/OFF LED
static const uint8_t PIN_LED2      = 36;   // PLAY LED (nefes efekti)
static const uint8_t PIN_LED3      = 37;   // RECORD LED
#else
static const uint8_t PIN_BTN_ONOFF = 40;
static const uint8_t PIN_BTN_REC   = 41;
static const uint8_t PIN_BTN_PLAY  = 48;
static const uint8_t PIN_LED1      = 36;   // ON/OFF LED
static const uint8_t PIN_LED2      = 42;   // PLAY LED (nefes efekti)
static const uint8_t PIN_LED3      = 37;   // RECORD LED
#endif

static const uint8_t PIN_MIC_SCK   = 1;
static const uint8_t PIN_MIC_WS    = 5;
static const uint8_t PIN_MIC_SD    = 2;

static const uint8_t PIN_AMP_BCLK  = 7;
static const uint8_t PIN_AMP_LRC   = 14;
static const uint8_t PIN_AMP_DIN   = 21;
static const uint8_t PIN_AMP_SD    = 15;   // HIGH = amfi acik

// ----------------------- Ses -----------------------
static const uint32_t SR           = 16000;
static const uint32_t MAX_SEC      = 30;
static const int32_t  REC_GAIN     = 4;
// Mikrofon hassasiyeti: 32-bit veriden kac bit kaydirilacak.
//   16 = cok sessiz (eski deger), 14 = 4 kat yuksek, 13 = 8 kat, 12 = 16 kat
#define MIC_SHIFT           16
// Gurultu kapisi: sessiz bloklari kisar (0 = kapali). mictest ile gorulen
// "sessiz ortam rms" degerinin ~2 kati iyi bir baslangictir.
// 1.0.4: 300 -> 0. Kapi 16 ms'lik bloklari ani kisip actigi icin sessiz kisimlarda
// ve kelime sonlarinda cizirti/tirtiklanma yapiyordu (B ve D'de de kapali).
#define NOISE_GATE_RMS      0
// Oynatma ses seviyesi (%)
#define PLAY_VOLUME_PCT     100
// Kayit sirasinda Serial'e seviye yaz
#define LEVEL_LOG           true
// Mikrofon kanal secimi: INMP441 L/R=GND -> sol (false). Sessizde gurultu
// yuksekse slottest komutuyla kontrol edin.
#define MIC_SLOT_RIGHT      false
// Mikrofon saat kenarini ters cevir (uzun kablolarda bit kaymasi icin deneme)
#define MIC_BCLK_INVERT     false
// I2S saat/veri pinlerinin akim gucu: 0 (en zayif) .. 3 (en guclu).
// Uzun kablolarda dusuk deger yansimalari ve cizirtiyi azaltir.
#define I2S_DRIVE_CAP       2
// Amfi veri bicimi: 0 = I2S (Philips, MAX98357A), 1 = Left-justified (MSB,
// MAX98357B / bazi klonlar), 2 = PCM kisa. fmttest komutuyla hangisinin temiz
// oldugunu bulun ve buraya yazin.
#define TX_FORMAT           0
static const uint8_t  SLOT_COUNT   = 1;
static const uint32_t MAX_SAMPLES  = SR * MAX_SEC;
static const uint32_t MAX_REC_BYTES = MAX_SAMPLES / 2;   // 240000
static const int32_t  TONE_AMP     = 8000;               // bip genligi (16-bit)

// ----------------------- Zamanlama -----------------------
static const uint32_t LONG_PRESS_MS = 800;
static const uint32_t DEBOUNCE_MS   = 25;
static const uint32_t IDLE_SLEEP_MS = 5UL * 60UL * 1000UL;
static const uint32_t SLOT_MIN_BYTES = 64;
static const uint32_t LOG_MAX_BYTES  = 8000;

// ----------------------- Dosyalar -----------------------
static const char* SLOT_FILE  = "/slot0.adp";
static const char* TMP_FILE   = "/slot0.tmp";
static const char* STATS_FILE = "/stats.json";
static const char* LOG_FILE   = "/log.jsonl";
static const char* OWNER_FILE = "/owner.json";

// ======================= VERI TIPLERI =======================
// Arduino IDE fonksiyon bildirimlerini dosyanin basina ekler;
// bu nedenle fonksiyonlarda kullanilan yapilar burada tanimlanir.
typedef int16_t txs_t;                      // amfiye giden ornek tipi (16-bit)

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

struct RawStat {
  uint32_t n = 0;
  uint32_t lowByteNonZero = 0;
  uint32_t allSame = 0;       // 0x00000000 veya 0xFFFFFFFF
};

// ======================= DURUM =======================
enum State { ST_IDLE, ST_RECORDING, ST_PLAYING, ST_SLEEPING };
State state = ST_IDLE;

uint32_t lastActivity    = 0;
uint32_t sleepQuietSince = 0;
bool     slotFull[SLOT_COUNT] = { false };
bool     fsOk            = false;

struct Stats {
  uint32_t totalMs   = 0;
  uint32_t count     = 0;
  uint32_t longestMs = 0;
  uint32_t lastTs    = 0;
} stats;

String   deviceId;
String   profileId;
String   profileName;
uint32_t boundAt = 0;

// ======================= BUTONLAR =======================
enum ButtonEvent : uint8_t { EV_NONE = 0, EV_SHORT, EV_LONG };
enum { B_ONOFF = 0, B_PLAY = 1, B_REC = 2 };

struct Button {
  uint8_t  pin;
  bool     rawPressed;
  bool     pressed;
  bool     suppress;      // uzun basis tetiklendi / olaylar temizlendi
  uint32_t rawChangedAt;
  uint32_t pressedAt;
  uint8_t  event;
  uint16_t glitch;      // 1.0.2: kararli olmayan ham degisim sayisi
};

Button buttons[3] = { { PIN_BTN_ONOFF }, { PIN_BTN_PLAY }, { PIN_BTN_REC } };
static const uint8_t NBTN = 3;
const char *BTN_NAME[NBTN] = { "ON/OFF", "PLAY", "RECORD" };

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
  Serial.print("# button map:");
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
      if (raw) btnLog(bi, "press", -1);
      else     btnLog(bi, "release", (int32_t)(now - b.pressedAt));
      if (raw) {
        b.pressedAt = now;
        b.suppress  = false;
      } else if (!b.suppress) {
        b.event = EV_SHORT;              // short press: on release
      }
    }
    if (b.pressed && !b.suppress && (now - b.pressedAt) >= LONG_PRESS_MS) {
      b.suppress = true;
      b.event    = EV_LONG;              // long press: at ~800 ms
    }
  }
  btnNoiseReport(now);
}

uint8_t takeEvent(uint8_t idx) {
  uint8_t e = buttons[idx].event;
  buttons[idx].event = EV_NONE;
  return e;
}

void clearButtonEvents() {
  for (auto &b : buttons) {
    b.event = EV_NONE;
    if (b.pressed) b.suppress = true;    // basili tutulan buton birakilinca olay uretmesin
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

bool powerOn = true;          // 1.0.3: ON/OFF LED'i acik durumda yanik kalir

void ledsOff() {
  ledSet(PIN_LED1, powerOn);
  greenSet(false);
  ledSet(PIN_LED3, false);
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
  greenLevel((uint8_t)((tri * tri) / 255));     // basit gama
}

// ======================= I2S =======================
i2s_chan_handle_t rxChan = nullptr;
i2s_chan_handle_t txChan = nullptr;
bool rxEnabled = false;
bool ampOn     = false;

static int32_t rxBuf[256];
static volatile uint32_t rxOverflows = 0;   // I2S alim tamponu tasma sayisi

static bool IRAM_ATTR onRxOverflow(i2s_chan_handle_t h, i2s_event_data_t *e, void *ctx) {
  rxOverflows++;
  return false;
}

i2s_std_slot_config_t txSlotConfig(int fmt, bool bits32) {
  i2s_data_bit_width_t w = bits32 ? I2S_DATA_BIT_WIDTH_32BIT : I2S_DATA_BIT_WIDTH_16BIT;
  if (fmt == 1) {
    i2s_std_slot_config_t c = I2S_STD_MSB_SLOT_DEFAULT_CONFIG(w, I2S_SLOT_MODE_STEREO);
    return c;
  }
  if (fmt == 2) {
    i2s_std_slot_config_t c = I2S_STD_PCM_SLOT_DEFAULT_CONFIG(w, I2S_SLOT_MODE_STEREO);
    return c;
  }
  i2s_std_slot_config_t c = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(w, I2S_SLOT_MODE_STEREO);
  return c;
}

bool initI2S() {
  // ---- Microphone: I2S0, RX, 32-bit, mono, left channel ----
  i2s_chan_config_t rxc = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
  rxc.dma_desc_num  = 8;                // 8 x 512 frames = ~256 ms of buffer
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
  rcfg.slot_cfg.slot_mask = MIC_SLOT_RIGHT ? I2S_STD_SLOT_RIGHT : I2S_STD_SLOT_LEFT;
  rcfg.gpio_cfg.invert_flags.bclk_inv = MIC_BCLK_INVERT;
  if (i2s_channel_init_std_mode(rxChan, &rcfg) != ESP_OK) return false;
  i2s_event_callbacks_t cbs = {};
  cbs.on_recv_q_ovf = onRxOverflow;
  i2s_channel_register_event_callback(rxChan, &cbs, nullptr);
  // RX is opened only while recording (the mic draws nothing when idle)

  // ---- Amplifier: I2S1, TX, 16-bit, stereo (L=R) -> BCLK 512 kHz ----
  i2s_chan_config_t txc = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_1, I2S_ROLE_MASTER);
  txc.auto_clear = true;                // send silence when there is no data
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
  tcfg.slot_cfg = txSlotConfig(TX_FORMAT, false);
  if (i2s_channel_init_std_mode(txChan, &tcfg) != ESP_OK) return false;
  if (i2s_channel_enable(txChan) != ESP_OK) return false;

  const uint8_t fastPins[] = { PIN_MIC_SCK, PIN_MIC_WS, PIN_AMP_BCLK, PIN_AMP_LRC, PIN_AMP_DIN };
  for (uint8_t p : fastPins) {
    gpio_set_drive_capability((gpio_num_t)p, (gpio_drive_cap_t)I2S_DRIVE_CAP);
  }
  return true;
}

void rxStart() {
  if (!rxEnabled && rxChan) {
    i2s_channel_enable(rxChan);
    rxEnabled = true;
  }
}

void rxStop() {
  if (rxEnabled && rxChan) {
    i2s_channel_disable(rxChan);
    rxEnabled = false;
  }
}

void rxFlush() {
  size_t br = 0;
  for (int i = 0; i < 50; i++) {
    if (i2s_channel_read(rxChan, rxBuf, sizeof(rxBuf), &br, 0) != ESP_OK || br == 0) break;
  }
}

// ======================= SES CIKISI / BIPLER =======================
void writeStereo(const txs_t* buf, size_t count) {
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
  uint32_t fade  = SR / 200;                     // 5 ms yumusak gecis
  double   ph    = 0.0;
  double   inc   = 2.0 * M_PI * freq / SR;
  uint32_t i     = 0;
  while (i < total) {
    size_t k = 0;
    while (k < 512 && i < total) {
      float env = 1.0f;
      if (i < fade)                env = (float)i / fade;
      else if (total - i < fade)   env = (float)(total - i) / fade;
      txs_t v = (txs_t)(sin(ph) * amp * env);
      buf[k++] = v;
      buf[k++] = v;
      ph += inc;
      i++;
    }
    writeStereo(buf, k);
  }
}

void playTone(uint16_t freq, uint16_t ms) {
  playToneAmp(freq, ms, TONE_AMP);
}

// ---- Amfi tani testleri ----
void txReconfigFmt(uint32_t rate, bool bits32, int fmt) {
  i2s_channel_disable(txChan);
  i2s_std_clk_config_t c = I2S_STD_CLK_DEFAULT_CONFIG(rate);
  i2s_channel_reconfig_std_clock(txChan, &c);
  i2s_std_slot_config_t sl = txSlotConfig(fmt, bits32);
  i2s_channel_reconfig_std_slot(txChan, &sl);
  i2s_channel_enable(txChan);
}

void txReconfig(uint32_t rate, bool bits32) {
  txReconfigFmt(rate, bits32, TX_FORMAT);
}

void rawTone(uint32_t rate, bool bits32, uint16_t freq, uint16_t ms, int32_t amp) {
  static int16_t b16[512];
  static int32_t b32[512];
  uint32_t total = rate * ms / 1000;
  uint32_t fade  = rate / 200;
  float    ph    = 0.0f;
  float    inc   = 2.0f * (float)M_PI * freq / rate;
  uint32_t i = 0;
  while (i < total) {
    size_t k = 0;
    while (k < 512 && i < total) {
      float env = 1.0f;
      if (i < fade)              env = (float)i / fade;
      else if (total - i < fade) env = (float)(total - i) / fade;
      int32_t v = (int32_t)(sinf(ph) * amp * env);
      if (bits32) { b32[k] = v * 65536; b32[k + 1] = b32[k]; }
      else        { b16[k] = (int16_t)v; b16[k + 1] = (int16_t)v; }
      k += 2;
      ph += inc;
      if (ph > 2.0f * (float)M_PI) ph -= 2.0f * (float)M_PI;
      i++;
    }
    size_t bw = 0;
    if (bits32) i2s_channel_write(txChan, b32, k * sizeof(int32_t), &bw, portMAX_DELAY);
    else        i2s_channel_write(txChan, b16, k * sizeof(int16_t), &bw, portMAX_DELAY);
  }
}


void audioBegin() {
  if (!ampOn) {
    digitalWrite(PIN_AMP_SD, HIGH);
    ampOn = true;
    playSilence(30);
  }
}

// tailMs kadar sessizlik yazilir; boylece tampondaki ses calinmadan amfi kapanmaz
void audioEnd(uint32_t tailMs = 100) {
  playSilence(tailMs);
  digitalWrite(PIN_AMP_SD, LOW);
  ampOn = false;
}

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

// Amfi acik, ses yok: cizirti duyuluyorsa sorun besleme/topraklama
void silenceTest() {
  logMsg("silencetest: amfi 4 sn acik, SES GONDERILMIYOR");
  audioBegin();
  playSilence(4000);
  audioEnd();
  Serial.println("EOF");
}

// Ayni tonu farkli hiz ve bit genisliginde calar
void txTest() {
  struct Mode { uint32_t rate; bool b32; const char *name; };
  const Mode modes[] = {
    { 16000, false, "A: 16 kHz / 16-bit (su anki ayar)" },
    { 48000, false, "B: 48 kHz / 16-bit" },
    { 44100, true,  "C: 44.1 kHz / 32-bit" },
  };
  for (const Mode &m : modes) {
    Serial.printf("# %s\n", m.name);
    txReconfig(m.rate, m.b32);
    digitalWrite(PIN_AMP_SD, HIGH);
    ampOn = true;
    rawTone(m.rate, m.b32, 440, 50, 0);
    rawTone(m.rate, m.b32, 440, 1500, 8000);
    rawTone(m.rate, m.b32, 440, 300, 0);
    digitalWrite(PIN_AMP_SD, LOW);
    ampOn = false;
    delay(700);
  }
  txReconfig(SR, false);          // normal ayara don
  Serial.println("EOF");
}

// Ayni tonu uc farkli veri biciminde calar (16 kHz / 16-bit)
void fmtTest() {
  const char *names[3] = {
    "0: I2S Philips (MAX98357A)",
    "1: Left-justified / MSB (MAX98357B)",
    "2: PCM kisa"
  };
  for (int f = 0; f < 3; f++) {
    Serial.printf("# bicim %s\n", names[f]);
    txReconfigFmt(SR, false, f);
    digitalWrite(PIN_AMP_SD, HIGH);
    ampOn = true;
    rawTone(SR, false, 440, 50, 0);
    rawTone(SR, false, 440, 1500, 8000);
    rawTone(SR, false, 440, 300, 0);
    digitalWrite(PIN_AMP_SD, LOW);
    ampOn = false;
    delay(900);
  }
  txReconfig(SR, false);
  Serial.println("EOF");
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
  adpcmUpdate(st, nib, step);            // kod cozucu ile ayni tahmin
  return nib;
}

int16_t adpcmDecode(AdpcmState &st, uint8_t nib) {
  adpcmUpdate(st, nib & 0x0F, IMA_STEP[st.index]);
  return (int16_t)st.pred;
}

// ======================= YARDIMCILAR =======================
void logMsg(const String &msg) {
  // Diagnostic lines start with '#', so a client must not expect only JSON
  Serial.print("# ");
  Serial.println(msg);
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

// Basit anahtar arama (tam JSON ayrıştırıcı degildir)
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
  String v = s.substring(i, j);
  if (v.length() == 0 && s.startsWith("true", i)) return "true";
  return v;
}

double jsonNum(const String &s, const char *key, double def) {
  String v = jsonStr(s, key);
  return v.length() ? v.toDouble() : def;
}

size_t fileSize(const char *path) {
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

// ======================= KALICI VERILER =======================
void scanSlots() {
  for (uint8_t i = 0; i < SLOT_COUNT; i++) {
    slotFull[i] = fileSize(SLOT_FILE) > SLOT_MIN_BYTES;
  }
}

// Onceki kayit sirasinda guc kesildiyse gecici dosyayi toparla
void recoverTempFile() {
  if (!LittleFS.exists(TMP_FILE)) return;
  if (LittleFS.exists(SLOT_FILE)) {
    LittleFS.remove(TMP_FILE);                   // yarim kalmis yeni kayit, eskisi korunur
    logMsg("yarim kayit silindi");
  } else if (fileSize(TMP_FILE) > SLOT_MIN_BYTES) {
    LittleFS.rename(TMP_FILE, SLOT_FILE);        // degistirme sirasinda kesinti
    logMsg("gecici kayit kurtarildi");
  } else {
    LittleFS.remove(TMP_FILE);
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
  if (!f) { logMsg("log yazilamadi"); return; }
  f.printf("{\"slot\":%u,\"ts\":%lu,\"dur_ms\":%lu}\n",
           (unsigned)slotNo, (unsigned long)ts, (unsigned long)durMs);
  f.close();
}

void makeDeviceId() {
  uint64_t mac = ESP.getEfuseMac();
  char id[16];
  snprintf(id, sizeof(id), "FT-%02X%02X%02X",
           (uint8_t)(mac >> 24), (uint8_t)(mac >> 32), (uint8_t)(mac >> 40));
  deviceId = id;
}

bool saveOwner() {
  String s = "{\"device_id\":\"" + jsonEscape(deviceId) +
             "\",\"profile_id\":\"" + jsonEscape(profileId) +
             "\",\"profile_name\":\"" + jsonEscape(profileName) +
             "\",\"bound_at\":" + String(boundAt) + "}";
  return writeTextFile(OWNER_FILE, s);
}

void loadOwner() {
  String s = readTextFile(OWNER_FILE);
  if (!s.length()) {
    saveOwner();                                 // ilk acilista cihaz kimligini yaz
    return;
  }
  profileId   = jsonStr(s, "profile_id");
  profileName = jsonStr(s, "profile_name");
  boundAt     = (uint32_t)jsonNum(s, "bound_at", 0);
  if (jsonStr(s, "device_id") != deviceId) saveOwner();
}

// ======================= KAYIT =======================

static uint8_t wrBuf[2048];
static int16_t pcmBuf[256];


void processMicBlock(MicProc &m, const int32_t *in, int16_t *out, size_t n, MicLevel &lv) {
  uint64_t blockSq = 0;
  for (size_t i = 0; i < n; i++) {
    int32_t x = in[i] >> MIC_SHIFT;
    if (!m.init) { m.xPrev = x; m.init = true; }
    int32_t hp = x - m.xPrev + ((m.yPrev * 251) >> 8);   // ~50 Hz yuksek geciren
    m.xPrev = x;
    m.yPrev = hp;

    int32_t y = hp * REC_GAIN;
    const int32_t knee = 24000;                          // yumusak sinirlama
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

// ---- Yakalama gorevi: I2S okuma + isleme + ADPCM, flash yazimindan bagimsiz ----
struct CaptureCtx {
  volatile bool     run      = false;
  volatile bool     done     = false;
  volatile bool     i2sErr   = false;
  volatile uint32_t samples  = 0;
  volatile uint32_t dropped  = 0;    // akis tamponu dolunca kaybolan bayt
  MicLevel          level;           // son yarim saniyenin olcumu
  volatile bool     levelReady = false;
};

static CaptureCtx          cap;
static StreamBufferHandle_t capStream = nullptr;
static const size_t        CAP_STREAM_BYTES = 32000;   // ~4 sn ADPCM

void captureTask(void *arg) {
  static int32_t tBuf[256];
  static int16_t tPcm[256];
  uint8_t  out[128];
  MicProc  mic;
  AdpcmState enc;
  MicLevel lv;
  bool     half = false;
  uint8_t  cur = 0;
  int      timeouts = 0;
  uint32_t lastLevel = millis();
  const uint32_t SETTLE = SR * 150 / 1000;   // atilacak baslangic ornekleri
  const uint32_t FADE   = SR * 60 / 1000;    // yumusak giris
  uint32_t settled = 0;
  uint32_t faded   = 0;

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

    // Oturma suresi: filtre calisir ama ornekler dosyaya yazilmaz
    if (settled < SETTLE) {
      settled += n;
      lv = MicLevel();
      continue;
    }
    for (size_t i = 0; i < n && faded < FADE; i++, faded++) {
      tPcm[i] = (int16_t)((int32_t)tPcm[i] * (int32_t)faded / (int32_t)FADE);
    }

    size_t olen = 0;
    for (size_t i = 0; i < n; i++) {
      uint8_t nib = adpcmEncode(enc, tPcm[i]);
      if (!half) { cur = nib << 4; half = true; }               // once ust 4 bit
      else       { out[olen++] = cur | nib; half = false; }     // sonra alt 4 bit
    }
    if (olen) {
      size_t sent = xStreamBufferSend(capStream, out, olen, pdMS_TO_TICKS(20));
      if (sent < olen) cap.dropped += (olen - sent);
    }
    cap.samples += n;

    if (millis() - lastLevel >= 500 && !cap.levelReady) {
      cap.level = lv;
      cap.levelReady = true;
      lv = MicLevel();
      lastLevel = millis();
    }
  }
  if (half) xStreamBufferSend(capStream, &cur, 1, pdMS_TO_TICKS(50));
  cap.done = true;
  vTaskDelete(nullptr);
}

void recordFail(const char *why) {
  logMsg(String("kayit hatasi: ") + why);
  errorFeedback();
  state = ST_IDLE;
  lastActivity = millis();
  clearButtonEvents();
}

void startRecording() {
  state = ST_RECORDING;
  lastActivity = millis();
  ledsOff();

  if (!fsOk) { recordFail("dosya sistemi yok"); return; }

  if (!capStream) capStream = xStreamBufferCreate(CAP_STREAM_BYTES, 1);
  if (!capStream) { recordFail("bellek"); return; }
  xStreamBufferReset(capStream);

  size_t freeB = LittleFS.totalBytes() - LittleFS.usedBytes();
  if (freeB < MAX_REC_BYTES + 16384 && LittleFS.exists(SLOT_FILE)) {
    LittleFS.remove(SLOT_FILE);
    slotFull[0] = false;
    logMsg("yer az: eski kayit once silindi");
  }

  // Dosyayi bip'ten once ac: acma gecikmesi kayit baslangicini etkilemesin
  File f = LittleFS.open(TMP_FILE, "w");
  if (!f) { recordFail("dosya acilamadi"); return; }

  rxStart();
  audioBegin();
  playTone(880, 130);
  playSilence(200);
  digitalWrite(PIN_AMP_SD, LOW);                 // kayit boyunca amfi kapali
  ampOn = false;

  rxFlush();
  clearButtonEvents();
  rxOverflows = 0;

  cap.done = false;
  cap.i2sErr = false;
  cap.samples = 0;
  cap.dropped = 0;
  cap.levelReady = false;
  cap.run = true;
  if (xTaskCreatePinnedToCore(captureTask, "cap", 6144, nullptr, 10, nullptr, 0) != pdPASS) {
    f.close();
    LittleFS.remove(TMP_FILE);
    rxStop();
    recordFail("gorev");
    return;
  }

  size_t written  = 0;
  bool   writeErr = false;
  uint32_t lastBlink = millis();
  bool red = true;
  ledSet(PIN_LED3, true);

  while (true) {
    updateButtons();
    if (takeEvent(B_REC) == EV_SHORT) cap.run = false;
    takeEvent(B_ONOFF);                          // read, but not acted on
    takeEvent(B_PLAY);

#if REC_LED_BLINK
    uint32_t now = millis();
    if (now - lastBlink >= 250) {
      red = !red;
      ledSet(PIN_LED3, red);
      lastBlink = now;
    }
#else
    (void)lastBlink; (void)red;
#endif

    if (LEVEL_LOG && cap.levelReady) {
      printLevel(cap.level);
      cap.levelReady = false;
    }

    size_t got = xStreamBufferReceive(capStream, wrBuf, sizeof(wrBuf), pdMS_TO_TICKS(20));
    if (got && !writeErr) {
      if (f.write(wrBuf, got) != got) { writeErr = true; cap.run = false; }
      else written += got;
    }

    if (cap.done && xStreamBufferIsEmpty(capStream)) break;
  }

  f.close();
  rxStop();
  ledsOff();

  Serial.printf("# kayit ozeti: ornek=%lu i2s_tasma=%lu tampon_kayip=%lu\n",
                (unsigned long)cap.samples, (unsigned long)rxOverflows,
                (unsigned long)cap.dropped);

  if (writeErr || cap.i2sErr) {
    LittleFS.remove(TMP_FILE);
    recordFail(writeErr ? "yazma" : "mikrofon");
    return;
  }

  if (LittleFS.exists(SLOT_FILE)) LittleFS.remove(SLOT_FILE);
  if (!LittleFS.rename(TMP_FILE, SLOT_FILE)) {
    scanSlots();
    recordFail("yeniden adlandirma");
    return;
  }
  scanSlots();

  uint32_t durMs = (uint32_t)((uint64_t)cap.samples * 1000ULL / SR);
  if (slotFull[0]) {
    stats.count++;
    stats.totalMs += durMs;
    if (durMs > stats.longestMs) stats.longestMs = durMs;
    stats.lastTs = nowEpoch();
    if (!saveStats()) logMsg("istatistik yazilamadi");
    appendLog(1, stats.lastTs, durMs);
  }
  logMsg("kayit bitti: " + String(durMs) + " ms, " + String(written) + " bayt");

  audioBegin();
  playTone(660, 100);
  playSilence(80);
  playTone(880, 140);
  audioEnd();

  state = ST_IDLE;
  lastActivity = millis();
  clearButtonEvents();
}

// ---- Seri komut: mictest (5 sn seviye olcumu, kayit yapmaz) ----
// Ham veri istatistigi: INMP441 24-bit veri gonderir, 32-bit kelimenin alt
// 8 biti her zaman 0 olmalidir. Degilse saat/veri hattinda bit kaymasi var.

void rawAccumulate(RawStat &r, const int32_t *buf, size_t n) {
  for (size_t i = 0; i < n; i++) {
    uint32_t v = (uint32_t)buf[i];
    if (v & 0xFF) r.lowByteNonZero++;
    if (v == 0 || v == 0xFFFFFFFFUL) r.allSame++;
  }
  r.n += n;
}

void printRaw(const RawStat &r) {
  uint32_t pct = r.n ? (r.lowByteNonZero * 100UL / r.n) : 0;
  Serial.printf("# ham: ornek=%lu altbayt_hatali=%%%lu sabit=%lu\n",
                (unsigned long)r.n, (unsigned long)pct, (unsigned long)r.allSame);
}

void micTest() {
  logMsg("mictest: ilk 2 sn SESSIZ kalin, sonra 3 sn normal konusun");
  rxStart();
  delay(150);                                   // mikrofon acilis suresi
  rxFlush();
  rxOverflows = 0;
  MicProc  m;
  MicLevel lv;
  RawStat  raw;
  uint32_t t0 = millis(), last = t0;
  bool quietDone = false;
  while (millis() - t0 < 5000) {
    size_t br = 0;
    if (i2s_channel_read(rxChan, rxBuf, sizeof(rxBuf), &br, 100) == ESP_OK && br) {
      size_t n = br / sizeof(int32_t);
      rawAccumulate(raw, rxBuf, n);
      processMicBlock(m, rxBuf, pcmBuf, n, lv);
    }
    if (!quietDone && millis() - t0 >= 2000) {
      Serial.println("# --- simdi konusun ---");
      quietDone = true;
    }
    if (millis() - last >= 250) { printLevel(lv); lv = MicLevel(); last = millis(); }
  }
  printRaw(raw);
  Serial.print("# ham ornekler:");
  for (int i = 0; i < 8; i++) Serial.printf(" %08lx", (unsigned long)rxBuf[i]);
  Serial.println();
  rxStop();
  Serial.println("EOF");
}

// ---- Seri komut: slottest ----
// Sol ve sag kanali ayri ayri 1.5 sn okur (sessiz ortamda calistirin).
// Mikrofonun oldugu kanalda: rms dusuk, altbayt_hatali ~%0 olmalidir.
void slotTest() {
  logMsg("slottest: sessiz kalin");
  rxStop();
  for (int side = 0; side < 2; side++) {
    i2s_std_slot_config_t sc = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO);
    sc.slot_mask = side ? I2S_STD_SLOT_RIGHT : I2S_STD_SLOT_LEFT;
    i2s_channel_reconfig_std_slot(rxChan, &sc);
    rxStart();
    delay(150);
    rxFlush();
    MicProc m;
    MicLevel lv;
    RawStat raw;
    uint32_t t0 = millis();
    while (millis() - t0 < 1500) {
      size_t br = 0;
      if (i2s_channel_read(rxChan, rxBuf, sizeof(rxBuf), &br, 100) == ESP_OK && br) {
        size_t n = br / sizeof(int32_t);
        rawAccumulate(raw, rxBuf, n);
        processMicBlock(m, rxBuf, pcmBuf, n, lv);
      }
    }
    rxStop();
    Serial.printf("# kanal %s:\n", side ? "SAG" : "SOL");
    printLevel(lv);
    printRaw(raw);
  }
  // Ayarli kanala geri don
  i2s_std_slot_config_t sc = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO);
  sc.slot_mask = MIC_SLOT_RIGHT ? I2S_STD_SLOT_RIGHT : I2S_STD_SLOT_LEFT;
  i2s_channel_reconfig_std_slot(rxChan, &sc);
  Serial.println("EOF");
}

// ---- Seri komut: looptest ----
// 3 sn sesi flash'a yazmadan RAM'e alir ve iki kez calar:
//   1) ham PCM (ADPCM yok)   2) ADPCM'den gecmis hali
void loopTest() {
  const uint32_t N = SR * 3;
  int16_t *pcm = (int16_t *)malloc(N * sizeof(int16_t));
  if (!pcm) { logMsg("looptest: bellek yok"); Serial.println("EOF"); return; }

  logMsg("looptest: bipten sonra 3 sn konusun");
  audioBegin();
  playTone(880, 130);
  playSilence(200);
  digitalWrite(PIN_AMP_SD, LOW);
  ampOn = false;

  rxStart();
  rxFlush();
  rxOverflows = 0;
  MicProc  m;
  MicLevel lv;
  uint32_t got = 0;
  while (got < N) {
    size_t want = sizeof(rxBuf);
    if ((N - got) * sizeof(int32_t) < want) want = (N - got) * sizeof(int32_t);
    size_t br = 0;
    if (i2s_channel_read(rxChan, rxBuf, want, &br, 200) != ESP_OK && br == 0) break;
    size_t n = br / sizeof(int32_t);
    processMicBlock(m, rxBuf, pcm + got, n, lv);
    got += n;
  }
  rxStop();
  printLevel(lv);

  static txs_t ob[512];
  delay(300);
  logMsg("looptest 1/2: ham PCM");
  audioBegin();
  for (uint32_t i = 0; i < got; ) {
    size_t k = 0;
    while (k < 512 && i < got) { txs_t v = pcm[i++]; ob[k++] = v; ob[k++] = v; }
    writeStereo(ob, k);
  }
  audioEnd();

  delay(500);
  logMsg("looptest 2/2: ADPCM kodla/coz");
  AdpcmState enc, dec;
  audioBegin();
  for (uint32_t i = 0; i < got; ) {
    size_t k = 0;
    while (k < 512 && i < got) {
      uint8_t nib = adpcmEncode(enc, pcm[i++]);
      txs_t v = adpcmDecode(dec, nib);
      ob[k++] = v; ob[k++] = v;
    }
    writeStereo(ob, k);
  }
  audioEnd();

  free(pcm);
  lastActivity = millis();
  Serial.println("EOF");
}

// ======================= OYNATMA =======================
static uint8_t inBuf[256];
static txs_t outBuf[1024];

void startPlayback() {
  lastActivity = millis();
  if (!slotFull[0]) {
    errorFeedback();
    clearButtonEvents();
    return;
  }
  File f = LittleFS.open(SLOT_FILE, "r");
  if (!f) {
    slotFull[0] = false;
    errorFeedback();
    clearButtonEvents();
    return;
  }

  state = ST_PLAYING;
  clearButtonEvents();
  ledsOff();
  greenSet(true);
  audioBegin();

  AdpcmState dec;
  const uint32_t FADE = SR * 30 / 1000;
  uint32_t played = 0;
  while (true) {
    updateButtons();
    if (takeEvent(B_PLAY) == EV_SHORT) break;    // uzun basis durdurmaz
    takeEvent(B_ONOFF);
    takeEvent(B_REC);

    int r = f.read(inBuf, sizeof(inBuf));
    if (r <= 0) break;

    size_t k = 0;
    for (int i = 0; i < r; i++) {
      uint8_t b = inBuf[i];
      int32_t v1 = (int32_t)adpcmDecode(dec, b >> 4) * PLAY_VOLUME_PCT / 100;
      int32_t v2 = (int32_t)adpcmDecode(dec, b & 0x0F) * PLAY_VOLUME_PCT / 100;
      if (played < FADE) { v1 = v1 * (int32_t)played / (int32_t)FADE; played++; }
      if (played < FADE) { v2 = v2 * (int32_t)played / (int32_t)FADE; played++; }
      txs_t s1 = (txs_t)v1;
      txs_t s2 = (txs_t)v2;
      outBuf[k++] = s1; outBuf[k++] = s1;
      outBuf[k++] = s2; outBuf[k++] = s2;
    }
    writeStereo(outBuf, k);
  }

  f.close();
  audioEnd();
  ledsOff();
  state = ST_IDLE;
  lastActivity = millis();
  clearButtonEvents();
}

// ======================= UYKU =======================
bool usbHostConnected() {
  return (bool)Serial;
}

void holdOutputs(bool en) {
  const uint8_t pins[] = { PIN_AMP_SD, PIN_LED1, PIN_LED2, PIN_LED3 };
  for (uint8_t p : pins) {
    if (en) gpio_hold_en((gpio_num_t)p);
    else    gpio_hold_dis((gpio_num_t)p);
  }
}

void lightSleepOnce() {
#if ONOFF_ONLY_WAKES
  const uint8_t btns[] = { PIN_BTN_ONOFF };
#else
  const uint8_t btns[] = { PIN_BTN_ONOFF, PIN_BTN_PLAY, PIN_BTN_REC };
#endif
  for (uint8_t p : btns) {
    gpio_sleep_sel_dis((gpio_num_t)p);           // uykuda pull-up korunsun
    gpio_wakeup_enable((gpio_num_t)p, GPIO_INTR_LOW_LEVEL);
  }
  esp_sleep_enable_gpio_wakeup();

  Serial.flush();
  holdOutputs(true);
  esp_light_sleep_start();
  holdOutputs(false);

  for (uint8_t p : btns) {
    gpio_wakeup_disable((gpio_num_t)p);
    pinMode(p, INPUT_PULLUP);
  }
  sleepQuietSince = millis();
}

void enterSleep() {
  logMsg("powering down (sleep)");
  powerOn = false;
  sleepFeedback();
  rxStop();
  digitalWrite(PIN_AMP_SD, LOW);
  ampOn = false;

  // Wait for every button to be released: the press that slept it would wake it
  while (anyButtonHeld()) {
    updateButtons();
    delay(5);
  }
  clearButtonEvents();
  state = ST_SLEEPING;
  sleepQuietSince = millis();
}

void wakeUp() {
  powerOn = true;
  state = ST_IDLE;
  lastActivity = millis();
  clearButtonEvents();
  logMsg("uyandi");
  bootFeedback();
  lastActivity = millis();
}

void sleepStep() {
  // 1.0.3: yalnizca ON/OFF acar (ONOFF_ONLY_WAKES false ise her buton)
  bool woke = (takeEvent(B_ONOFF) != EV_NONE);
  bool other = (takeEvent(B_PLAY) != EV_NONE);
  other |= (takeEvent(B_REC) != EV_NONE);
#if !ONOFF_ONLY_WAKES
  woke |= other;
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
  if (usbHostConnected()) return;              // USB bagliyken seri islem surer
  #endif
  lightSleepOnce();
#endif
}

// ======================= IDLE =======================
void idleStep() {
#if IDLE_PLAY_LED == 2
  breathe();
#elif IDLE_PLAY_LED == 1
  greenSet(slotFull[0]);
#else
  greenSet(false);
#endif
  if (anyButtonHeld()) lastActivity = millis();

  if (takeEvent(B_ONOFF) == EV_LONG) { logMsg("ON/OFF: power off"); enterSleep(); return; }

  uint8_t ep = takeEvent(B_PLAY);
  if (ep == EV_SHORT || ep == EV_LONG) { startPlayback(); return; }

  if (takeEvent(B_REC) == EV_SHORT) { startRecording(); return; }

  if (millis() - lastActivity >= IDLE_SLEEP_MS) { logMsg("idle timeout"); enterSleep(); }
}

// ======================= SERI KOMUTLAR =======================
void sendHello() {
  // SITE COMPATIBILITY: the site recognises a hello reply by its "dev" key and
  // gives up after 4 tries. uid/profile/owner are the names it expects too.
  String s = "{\"type\":\"hello\",\"dev\":\"F\",\"fw\":\"" FW_VERSION "\",\"chip\":\"ESP32-S3\"";
  s += ",\"slots\":" + String(SLOT_COUNT);
  s += ",\"uid\":\"" + jsonEscape(deviceId) + "\"";
  s += ",\"profile\":\"" + jsonEscape(profileId) + "\"";
  s += ",\"owner\":\"" + jsonEscape(profileName) + "\"";
  s += ",\"device_id\":\"" + jsonEscape(deviceId) + "\"";
  s += ",\"bound\":" + String(profileId.length() ? "true" : "false");
  s += ",\"profile_id\":\"" + jsonEscape(profileId) + "\"";
  s += ",\"profile_name\":\"" + jsonEscape(profileName) + "\"";
  s += ",\"bound_at\":" + String(boundAt);
  s += ",\"time_valid\":" + String(nowEpoch() ? "true" : "false");
  s += "}";
  Serial.println(s);
}

void sendStats() {
  // SITE COMPATIBILITY: "total_s" + uid/profile, and "i"/"len_ms" per slot (see B)
  String s = "{\"type\":\"stats\"";
  s += ",\"uid\":\"" + jsonEscape(deviceId) + "\"";
  s += ",\"profile\":\"" + jsonEscape(profileId) + "\"";
  s += ",\"total_s\":" + String((stats.totalMs + 500) / 1000);
  s += ",\"longest_s\":" + String((stats.longestMs + 500) / 1000);
  s += ",\"total_ms\":" + String(stats.totalMs);
  s += ",\"count\":" + String(stats.count);
  s += ",\"longest_ms\":" + String(stats.longestMs);
  s += ",\"last_ts\":" + String(stats.lastTs);
  s += ",\"slots\":[";
  for (uint8_t i = 0; i < SLOT_COUNT; i++) {
    size_t b = fileSize(SLOT_FILE);
    if (i) s += ",";
    s += "{\"i\":" + String(i + 1) +
         ",\"slot\":" + String(i + 1) +
         ",\"full\":" + String(slotFull[i] ? 1 : 0) +
         ",\"len_ms\":" + String(slotFull[i] ? (uint32_t)((uint64_t)b * 2000ULL / SR) : 0) +
         ",\"bytes\":" + String(b) +
         ",\"dur_ms\":" + String((uint32_t)((uint64_t)b * 2000ULL / SR)) + "}";
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

// USB CDC tamponu dolunca write kismi yazabilir; hepsi gidene kadar dene
static void dumpWriteAll(const uint8_t *d, size_t n) {
  size_t off = 0;
  uint32_t t0 = millis();
  while (off < n && millis() - t0 < 3000) {
    size_t w = Serial.write(d + off, n - off);
    if (w) { off += w; t0 = millis(); } else delay(1);
  }
}

void sendDump(int slotNo) {
  if (slotNo < 1 || slotNo > SLOT_COUNT || !slotFull[slotNo - 1]) {
    Serial.println("{\"type\":\"error\",\"cmd\":\"dump\",\"err\":\"slot_empty_or_invalid\"}");
    Serial.println("EOF");
    return;
  }
  File f = LittleFS.open(SLOT_FILE, "r");
  if (!f) {
    Serial.println("{\"type\":\"error\",\"cmd\":\"dump\",\"err\":\"open_failed\"}");
    Serial.println("EOF");
    return;
  }
  // SITE UYUMU: satir basina TEK ornek (site ve brick_tool.py boyle okur).
  // Virgullu 32'li satirlarda site her satirin yalniz ilk ornegini aliyordu.
  Serial.setTxTimeoutMs(500);
  Serial.println("{\"type\":\"dump\",\"dump\":" + String(slotNo) +
                 ",\"slot\":" + String(slotNo) +
                 ",\"rate\":" + String(SR) + ",\"sr\":" + String(SR) +
                 ",\"samples\":" + String((uint32_t)(f.size() * 2)) + "}");
  AdpcmState dec;
  static uint8_t inb[512];
  char out[2048];
  size_t ol = 0;
  int r;
  while ((r = f.read(inb, sizeof(inb))) > 0) {
    for (int i = 0; i < r; i++) {
      int16_t a = adpcmDecode(dec, inb[i] >> 4);
      int16_t b = adpcmDecode(dec, inb[i] & 0x0F);
      ol += snprintf(out + ol, sizeof(out) - ol, "%d\n%d\n", a, b);
      if (ol > sizeof(out) - 32) { dumpWriteAll((const uint8_t *)out, ol); ol = 0; }
    }
  }
  if (ol) dumpWriteAll((const uint8_t *)out, ol);
  f.close();
  Serial.println("EOF");
  Serial.setTxTimeoutMs(0);
}

void handleCommand(String line) {
  line.trim();
  if (!line.length()) return;

  String cmd = jsonStr(line, "cmd");
  if (!cmd.length()) cmd = jsonStr(line, "type");
  if (!cmd.length()) cmd = line;                 // a plain-text command is accepted too
  cmd.toLowerCase();

  if (cmd == "pins") {
    printPins(); printButtonMap();
  } else if (cmd == "hello") {
    sendHello();
  } else if (cmd == "bind") {
    String pid = jsonStr(line, "profile_id");
    if (!pid.length()) pid = jsonStr(line, "profile");        // the site sends this name
    if (!pid.length()) {
      Serial.println("{\"type\":\"bind\",\"ok\":false,\"msg\":\"profile_id_missing\"}");
    } else {
      profileId   = pid;
      profileName = jsonStr(line, "profile_name");
      if (!profileName.length()) profileName = jsonStr(line, "owner");
      boundAt     = nowEpoch();
      bool ok = saveOwner();
      Serial.println(String("{\"type\":\"bind\",\"ok\":") + (ok ? "true" : "false") + "}");
    }
  } else if (cmd == "unbind") {
    profileId = "";
    profileName = "";
    boundAt = 0;
    bool ok = saveOwner();
    Serial.println(String("{\"type\":\"unbind\",\"ok\":") + (ok ? "true" : "false") + "}");
  } else if (cmd == "stats") {
    sendStats();
  } else if (cmd == "history") {
    sendHistory();
  } else if (cmd == "time") {
    double ep = jsonNum(line, "epoch", 0);
    bool ok = ep > 1600000000.0;
    if (ok) {
      struct timeval tv = { (time_t)ep, 0 };
      settimeofday(&tv, nullptr);
    }
    Serial.println(String("{\"type\":\"time\",\"ok\":") + (ok ? "true" : "false") +
                   ",\"epoch\":" + String(nowEpoch()) + "}");
  } else if (cmd == "mictest") {
    micTest();
  } else if (cmd == "looptest") {
    loopTest();
  } else if (cmd == "tonetest") {
    // 3 seviye: dusuk / orta / yuksek. Sadece yuksek bozuksa hoparlor veya
    // besleme yetmiyor; hepsi ayni bozuksa sorun baglanti/saat sinyalinde.
    const int32_t levels[3] = { 2000, 8000, 20000 };
    for (int i = 0; i < 3; i++) {
      Serial.printf("# ton %d/3 genlik=%ld\n", i + 1, (long)levels[i]);
      audioBegin();
      playToneAmp(440, 1000, levels[i]);
      audioEnd(300);
      delay(400);
    }
    Serial.println("EOF");
  } else if (cmd == "silencetest") {
    silenceTest();
  } else if (cmd == "fmttest") {
    fmtTest();
  } else if (cmd == "txtest") {
    txTest();
  } else if (cmd == "slottest") {
    slotTest();
  } else if (cmd == "dump") {
    sendDump((int)jsonNum(line, "slot", 1));
  } else {
    Serial.println("{\"type\":\"error\",\"msg\":\"unknown_cmd\"}");
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
    } else if (c != '\r') {
      if (len < sizeof(buf) - 1) buf[len++] = c;
    }
  }
}

// ======================= SETUP / LOOP =======================
void setup() {
  // Amfiyi hemen kapat (pull-up nedeniyle acik baslar)
  pinMode(PIN_AMP_SD, OUTPUT);
  digitalWrite(PIN_AMP_SD, LOW);

  pinMode(PIN_BTN_ONOFF, INPUT_PULLUP);
  pinMode(PIN_BTN_PLAY,  INPUT_PULLUP);
  pinMode(PIN_BTN_REC,   INPUT_PULLUP);

  pinMode(PIN_LED1, OUTPUT);
  pinMode(PIN_LED3, OUTPUT);
  ledcAttach(PIN_LED2, 5000, 8);
  ledsOff();

  Serial.begin(115200);
  Serial.setTxTimeoutMs(0);                      // USB bagli degilken takilma
  delay(200);
  logMsg("Fig-Talks " FW_VERSION " basliyor");
  printButtonMap();

  makeDeviceId();

  fsOk = LittleFS.begin(false);
  if (!fsOk) {
    logMsg("LittleFS baglanamadi, bicimlendiriliyor");
    fsOk = LittleFS.format() && LittleFS.begin(false);
  }
  if (fsOk) {
    recoverTempFile();
    scanSlots();
    loadStats();
    loadOwner();
  } else {
    logMsg("HATA: dosya sistemi kullanilamiyor");
  }

  if (!initI2S()) {
    logMsg("HATA: I2S baslatilamadi");
  }

  for (auto &b : buttons) {
    b.rawPressed = b.pressed = (digitalRead(b.pin) == LOW);
    b.suppress = b.pressed;                      // acilista basili buton olay uretmesin
    b.rawChangedAt = millis();
  }

  bootFeedback();
  if (!fsOk) errorFeedback();

  state = ST_IDLE;
  lastActivity = millis();
}

void loop() {
  updateButtons();
  handleSerial();

  switch (state) {
    case ST_IDLE:     idleStep();  break;
    case ST_SLEEPING: sleepStep(); break;
    default:          state = ST_IDLE; break;   // kayit/oynatma kendi dongusunde calisir
  }
  delay(2);
}
