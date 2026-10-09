# Firmware projesi: Version_F / Version_B / Version_D (ESP32-S3)

Bu klasör, elektronik firmanın tasarladığı PCB'ler için 3 cihaz firmware'ini içerir.
Kodlar firmanın orijinal .ino dosyaları üzerine yapılan düzeltmelerdir.
Kullanıcıyla Türkçe, kısa ve net konuş. Kod verirken parça değil, eksiksiz dosya ver.

## Çalışma kuralları

- **Önce ölç, sonra değiştir.** Donanım bende değil. Bir hata hipotezini değişiklikten önce
  Serial log ile doğrulat (kodda `BTN_LOG`, `{"cmd":"pins"}`, `{"cmd":"bat"}` gibi araçlar var).
- Her değişiklikte `FW_VERSION` yükselt ve satır sonundaki sürüm notuna kısa açıklama ekle.
  Yeni ayarlar `#define` ile ve açıklamalı yorumla eklenir; eski davranışa dönüş seçeneği bırakılır.
- Yorumlar Türkçe ama **ASCII** (ç/ş/ğ/ı/ö/ü yok), mevcut stile uy.
- Firmaya gidecek dosyalara **bizim eklediğimiz** yorumlarda ürün/proje adı yazma
  (Mini-Talks, Fig/Brick/Design-Talks vb.). Sadece Version_F / Version_B / Version_D kodları.
  Firmanın kendi yazdığı adlar (DEVICE_NAME vb.) dokunulmadan kalabilir. OKUBENI dosyası gönderilmez.
- Seri protokol JSON anahtarlarını değiştirme (WordPress eklentisi bunlara bağlı).
- Derlemeyi ben yapamıyorsam bunu açıkça söyle; "çalışıyor" deme, "kartta denenmedi" de.

## Klasörler

| Klasör | Cihaz | Sürüm | Not |
|---|---|---|---|
| `Version_F/F_versiyon/` | F: figürlü, 3 buton | FT-S3-1.0.5 | LittleFS, IMA ADPCM, tek slot |
| `Version_B/BrickTalks_S3/` | B: ekranlı (ILI9341), 4 buton | BT-S3-1.0.10 | LittleFS, 5 slot, yüz (MTF1 RLE) aktarımı; `partitions.csv` gerekli |
| `Version_D/D_versiyon/` | D: RFID (RC522) + SD, 10 buton | DT-S3-1.0.11 | SD yoksa LittleFS'e düşer (`FLASH_FALLBACK`) |

## Derleme

Donanım: ESP32-S3-WROOM-1 N8 (8 MB flash, PSRAM yok). Core: esp32 by Espressif 3.3.x.

Arduino IDE ayarları:
- Board: ESP32S3 Dev Module
- USB CDC On Boot: Enabled
- USB Mode: Hardware CDC and JTAG
- Upload Mode: UART0 / Hardware CDC
- Flash Size: 8MB
- Partition: F ve D için "8M with spiffs (3MB APP/1.5MB SPIFFS)". B için "Custom": sketch klasöründeki `partitions.csv` kullanılır.
- PSRAM: Disabled
- B için kütüphaneler: Adafruit GFX Library, Adafruit ILI9341

arduino-cli (seçenek adlarını `arduino-cli board details -b esp32:esp32:esp32s3` ile doğrula):
```
arduino-cli compile -b "esp32:esp32:esp32s3:CDCOnBoot=cdc,USBMode=hwcdc,FlashSize=8M,PartitionScheme=default_8MB,PSRAM=disabled" Version_F/F_versiyon
arduino-cli compile -b "esp32:esp32:esp32s3:CDCOnBoot=cdc,USBMode=hwcdc,FlashSize=8M,PSRAM=disabled" Version_B/BrickTalks_S3
```
Yeni (boş) kartta ilk yükleme: BOOT basılıyken USB tak, sonra Upload.

## Seri protokol (115200, satır sonlu JSON)

Site (WordPress `mini-devices` eklentisi, WebSerial) sırası: `hello` → `bind` → `time` → `stats` (5 sn içinde `total_s` beklenir).
- `{"cmd":"hello"}` → `dev` ("F"/"B"/"D"), `uid`, `profile`, `owner`, `fw`
- `{"cmd":"bind","profile":<id>,"owner":"..."}` → `ok`
- `{"cmd":"time","epoch":<sn>}`
- `{"cmd":"stats"}` → `total_s`, `longest_s`, slotlar (`i`, `len_ms`); D'de `scenes`
- `{"cmd":"dump",...}` WAV/ADPCM indirme. B'de `{"cmd":"face",...}` yüz yükleme ("." akış kontrolü)
- Teşhis: `{"cmd":"pins"}` (buton pin durumları), B'de `{"cmd":"bat"}`, `mictest`, `tonetest`
- `#` ile başlayan satırlar log'dur; site yok sayar.

## Ana kart pinleri (PCB1, üç cihazda ortak)

- H6 (9 pin): 1 BUTON1=IO40, 2 BUTON2=IO41, 3 BUTON3=IO48, 4 LED1=IO36, 5 LED2=IO37, 6 LED3=IO42, 7 GND, 8 BUTON4=IO3, 9 LED4=IO47
- H7 (5 pin): MBUTON1=IO38, MBUTON2=IO39, MLED1=IO4, MLED2=IO35, GND
- H4 (14 pin, LCD soketi): 1 3V3, 2 GND, 3 LCD_CS=IO9, 4 LCD_RST=IO18, 5 LCD_RS=IO8, 6 MOSI=IO11, 7 SCK=IO12, 8 LED=IO6, 9 D0/MISO=IO13, **10=IO9, 11=IO18, 12=IO8, 13=IO6 (3-5 ve 8'in tekrarı)**
- H5 (RFID): 3V3, RF_RST=IO17, GND, -, MISO=IO13, MOSI=IO11, SCK=IO12, RF_CS=IO16
- H1: ESP_TXD=IO43, ESP_RXD=IO44, GND (USB CDC kullanıldığı için boş)
- Ses: mikrofon INMP441 SCK=1, WS=5, SD=2; amfi MAX98357 BCLK=7, LRC=14, DIN=21, SD(enable)=15
- SD_CS=IO10. USB IO19/20.
- Şarj entegresi (TP4056 benzeri, U8) ve pil koruması (U9) var; **pil gerilimi ve şarj durumu ESP'ye bağlı değil.**
  Şarj LED'leri doğrudan +5V'tan.

## Cihaz bazında buton/LED düzeni (kart üzerinde soldan sağa)

- **F:** ON/OFF, RECORD, PLAY. `BTN_CABLE_REVERSED 0` (düz kablo). ON/OFF=40, REC=41, PLAY=48; LED ON/OFF=36, REC=37, PLAY(PWM)=42.
- **B:** 4 buton. 1.0.10'da PLAY=48, REC=41 (yer değiştirdi), NEXT=3, ON/OFF=40; LED PLAY(PWM)=42, REC=37, NEXT=47, ON/OFF=36.
- **D:** 4'lü kart ON/OFF, DEMO, RECORD, PLAY (ON/OFF=40, DEMO=41, REC=48, PLAY=3; LED 36/37/42/47).
  Seviye kartı (kare kart): SW1 sol üst SOUND=IO9, SW2 sol alt WORD=IO18, SW3 sağ alt SENTENCE=IO8, SW4 sağ üst DIALOGUE=IO6.
  Seviye LED'i için ayrı pin yok → `LEVEL_LED_SHARED 1`: buton ve LED aynı GPIO (H4'te 3=10 vb.),
  seçili seviye pini HIGH sürülür, basış pin HIGH iken pedin LOW'a çekilmesinden okunur (DRIVE_CAP_0).
  MINI kartı: MINI1=38 (LED 4), MINI2=39 (LED 35).

## Ortak davranışlar

- **ON/OFF (F, B):** açıkken ON/OFF LED sabit; ON/OFF basılı tut = kapan (light sleep, B'de ekran söner);
  kapalıyken yalnızca ON/OFF açar (`ONOFF_ONLY_WAKES`). Hareketsizlikte otomatik kapanma.
- **LED politikası (F, B):** sürekli yanıp sönme yok. Kayıtta REC LED sabit, oynatmada PLAY LED sabit,
  beklemede PLAY LED sönük (`IDLE_PLAY_LED`, `REC_LED_BLINK`). Kısa açılış/hata sinyalleri kalabilir.
- **Kayıt sesleri:** başta 880 Hz bip (mikrofon açılmadan), sonda 660+880 "bi-dip" (F'de vardı, B'ye `REC_BEEPS` ile eklendi).
- **Kayıt tık kırpma (B, D):** `REC_TRIM_START_MS 300`, `REC_TRIM_END_MS 500`, `REC_FADE_OUT_MS 40`.
- `NOISE_GATE_RMS 0` (F'de 300 iken cızırtı yapıyordu).
- B ekran yazıları İngilizce (READY, RECORDING, PLAYING, SAVED, EMPTY SLOT...). Serial logları Türkçe kalabilir.

## D (RFID) notları

- RC522 bare-metal sürücü dosyada. Sürüm kaydı 0x82 kabul. RC522 SD'den ÖNCE başlatılır; SD.begin başarısızsa SPI ve RC522 yeniden kurulur.
- Kartlar: NTAG213/215 veya MIFARE Classic (13,56 MHz). 125 kHz T5577 çalışmaz.
- Sahne etiketi "1"=Classroom, "2"=Coffee Shop (site tarafında `SCENE_NAMES`). Etiket yazma seri komutla yapılır (kodda `pendingTagWrite`), yazım geri okumayla doğrulanır.
- CRC hesabında DivIrqReg (0x05) bit 0x04 kullanılır. Uyku sayaçlarında işaretli fark (`(int32_t)(millis()-x)`).
- Dahili hafıza modunda WAV başlığı baştan maksimum uzunlukla yazılır, sonradan geri dönülüp yeniden yazılmaz (LittleFS copy-on-write / yer sorunu).

## Açık konular

1. **B pil göstergesi:** kod hazır, `BAT_ADC_PIN -1` / `USB_SENSE_PIN -1` ile kapalı.
   Donanım eklenince: VBAT–100k–orta–100k–GND (+100nF) → IO4 (H7.3); +5V–10k–orta–20k–GND → IO44 (H1.2, dahili pull-down).
   Sonra `BAT_ADC_PIN 4`, `USB_SENSE_PIN 44`. 1.0.9'da IO13'te varsayılan açıkken butonlar ~5 sn gecikmeli tepki verdi
   (şüphe: ölçüm döngüsü bloklanıyor). Açınca `{"cmd":"bat"}` ve "pil olcumu X ms surdu" logu ile ölç.
2. **B 1.0.10 doğrulanmadı:** NEXT/REC/PLAY anında tepki veriyor mu, oynatmada ses geliyor mu (önceki bir testte "ses yok, ağız oynuyor" bildirildi).
3. **D seviye kartı kablosu:** testte SW2 ve SW4 ikisi de IO9'a düşüyordu, IO6'da buton yoktu (donanım/kablo). SW4 → H4.8, LED → H4.13 olmalı.
4. **Yeni PCB partisi:** sağlam bilinen ESP takılınca da hiç ışık yok; güç yolu ölçülmeli (USB 5V, D4 diyot, U5 LDO, 3V3). Ölçmeden yeni karta ESP takılmasın.
5. Sonraki PCB revizyonu önerisi: pil/USB bölücüleri karta (IO4, IO44); D'de MINI1 LED IO4 → IO43.

## Geçmişte bulunan hatalar (tekrarlama)

- Site bağlantısı: `dev` alanı/`total_s` eksikti (protokol uyumu 1.0.1).
- Sürüm sayaçlarında unsigned taşma → anında uyku.
- B cızırtısı: ekran çizimi sesi aksatıyordu → TX DMA 8 tanım, RLE `writePixels`, ağız önbelleği 140 KB.
- Light sleep'te buton pull-up kayboluyordu → `gpio_sleep_sel_dis`.
- B uykudan sonra ekran/LED PWM: `ledcDetach/ledcAttach` + `tft.begin` yeniden.
