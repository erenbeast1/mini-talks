# Mini Devices — Connected Devices (v1.2.0)

Kullanıcı profiline "Connected Devices" bölümü ekler. Cihazlar USB kablosuyla
(WebSerial) bağlanır; kayıt istatistikleri profile işlenir, ses kayıtları
klasör bazlı WAV olarak indirilir.

## Kurulum

1. `mini-devices` klasörünü `/wp-content/plugins/` altına yükle
2. Eklentiler → **Mini Devices** → Etkinleştir
Bu kadar — **başka bir şey yapmana gerek yok.**

Forum tek bir kısa koddan render edildiği ve ayrı bir "profil sayfası"
bulunmadığı için eklenti, forum kısa kodunun çıktısını yakalar ve görünüm
profil ise (`?view=profile`) Connected Devices bölümünü sonuna ekler.
mini-forum dosyalarına dokunulmaz.

### Elle yerleştirmek istersen

```
[connected_devices]
```

### Otomatik yerleştirmeyi değiştirmek

`functions.php` içine:

```php
// Otomatik eklemeyi kapat
add_filter('md_is_forum_tag', '__return_false');

// Başka bir görünümde göster
add_filter('md_is_profile_view', function ($is, $view) {
    return $view === 'settings';
}, 10, 2);
```

## Cihaz ↔ profil bağı (v1.1)

Firmware v1.2+ her cihaza MAC adresinden türetilen değişmez bir kimlik verir
(`F-3C71BF2A` gibi) ve `/owner.json` içinde hangi WordPress profiline bağlı
olduğunu tutar.

Bağlanma akışı:

1. Sayfa `hello` gönderir, cihaz `uid` + `profile` döner
2. `profile` boşsa → "Bu cihaz profiline bağlansın mı?" sorulur, onay verilirse
   `bind` komutuyla cihaza kullanıcı ID'si ve adı yazılır
3. `profile` başka bir kullanıcıya aitse → uyarı çıkar; kullanıcı isterse
   sahipliği devralabilir (kayıtlar silinmez)
4. Sunucu tarafı da korur: `sync` isteği başka profile bağlı cihazdan gelirse
   **409** ile reddedilir

"Profilden kaldır" hem sunucudaki kaydı siler hem cihaza `unbind` gönderir.

Cihaz verisi artık **uid ile anahtarlanır** — aynı kullanıcı birden fazla
Version_F sahibi olabilir, karışmaz. Eski firmware'ler (uid göndermeyen)
tip koduyla geriye dönük çalışmaya devam eder.

## Kayıt geçmişi

Cihaz her kaydı `/log.jsonl` içine yazar (son ~100 kayıt, dolunca başa döner):

```
{"slot":2,"ts":1786649100,"len":4200}
```

`{"cmd":"history"}` ile okunur. Arayüz bunu henüz göstermiyor — veri hazır.

## Veri nerede tutuluyor

`usermeta` → anahtar **`md_devices`** (JSON). Yeni tablo açılmaz.

```
{
  "F": {
    "fw": "1.1",
    "last_sync": 1786650000,
    "stats": { "total_s": 84, "count": 6, "longest_s": 22, "last_ts": 1786649100 },
    "slots": [ { "i": 1, "full": 1, "len_ms": 4200, "name": "Anne" }, ... ]
  },
  "D": {
    "cards": { "04A1B2": { "name": "Kafe", "stats": {...} } }
  }
}
```

**Slot ve kart isimleri kullanıcıya aittir**, cihazda tutulmaz — her
eşitlemede korunur, cihaz sıfırlansa bile profilde kalır.

## REST uçları

| Yol | Metot | İş |
|---|---|---|
| `/wp-json/mini-devices/v1/data` | GET | Kullanıcının cihaz verisi |
| `/wp-json/mini-devices/v1/sync` | POST | Cihazdan gelen istatistik + slot listesi |
| `/wp-json/mini-devices/v1/name` | POST | Slot / kart / cihaz adı güncelle |
| `/wp-json/mini-devices/v1/whoami` | GET | Bağlama için kullanıcı kimliği |
| `/wp-json/mini-devices/v1/forget` | POST | Cihazı profilden kaldır |

Hepsi oturum açmış kullanıcıyla sınırlı, `X-WP-Nonce` ile korunur.

## Cihaz protokolü

Satır başına bir JSON, 115200 baud:

| Gönderilen | Dönen |
|---|---|
| `{"cmd":"hello"}` | `{"dev":"F","fw":"1.1","slots":5}` |
| `{"cmd":"time","epoch":1786650000}` | `{"ok":1}` |
| `{"cmd":"stats"}` | `{"total_s":..,"count":..,"longest_s":..,"last_ts":..,"slots":[...]}` |
| `{"cmd":"dump","slot":1}` | `{"dump":1,"samples":N,"sr":16000}` + örnek akışı + `EOF` |
| `{"cmd":"bind","profile":12,"owner":"Eren"}` | `{"ok":1,"uid":"F-...","profile":12}` |
| `{"cmd":"unbind"}` | `{"ok":1,"profile":0}` |
| `{"cmd":"history"}` | `{"history":1}` + satır satır kayıt + `EOF` |

`dev` alanı: **F** = Version_F · **B** = Version_B · **D** = Version_D.
Sayfa bu koddan cihaz adını kendisi türetir.

## Tarayıcı desteği

WebSerial yalnız **masaüstü Chrome / Edge / Opera**'da çalışır. Safari,
Firefox ve mobil tarayıcılarda sayfa açılır, kayıtlı veriler görünür, ama
"Cihaz bağla" düğmesi kapalıdır ve kullanıcıya sebebi yazılır.

Site **HTTPS** olmalı (localhost hariç) — WebSerial güvenli bağlam ister.

## Ses kayıtları nerede

**Sunucuda değil.** Kayıtlar cihazın flash belleğinde durur; site yalnızca
cihaz USB ile bağlıyken `dump` komutuyla okur ve tarayıcıda WAV'a çevirip
indirir. Sunucuya hiçbir ses yüklenmez.

Bunun sonucu: cihaz bağlı değilken indirme düğmeleri pasiftir ve sebebini
yazar. Profilde kalıcı olan tek şey **istatistikler ve isimlerdir** — cihaz
sıfırlansa bile bunlar durur.

## Bilinen sınırlar

- Ses aktarımı seri porttan metin olarak akıyor: 30 saniyelik kayıt ~15-20 sn
  sürer. İkili aktarım ileride hızlandırılabilir.
- "Hepsini indir" kayıtları sırayla iner; tarayıcı çoklu indirmeye izin
  vermezse tek tek indirmek gerekir.
- Version_D kart bazlı ses dökümü, cihaz firmware'i kart klasörlerini
  raporlamaya başlayınca etkinleşir (yapı hazır, `cards` alanı bekliyor).
