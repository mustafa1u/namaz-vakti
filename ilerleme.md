# İlerleme Notu

## Commit Mesajı
`PAKETLEME v1.0.0 + CAMI KONUMU GUNCELLEME -- Üretim paketleme altyapısı, ikon akışı, renderer çıktı yolu, log davranışı, lokasyon kataloğu ve yerleşik cami listesi güncellendi.`

## Commit Zamanı
`2026-02-25 02:16:25 +03:00`

## Bu Committe Yapılanlar

1. **Paketleme sürümü ve dağıtım komutları güncellendi**
- `desktop-app/package.json` içinde uygulama sürümü `1.0.0` olarak yükseltildi.
- `dist:win` ve `dist:linux` script’leri eklendi.
- Paket içeriğine `assets/schedules/**/*` ve `assets/templates/**/*` dahil edildi.
- `extraResources` ile `build/icons` klasörü paket içine taşınacak şekilde tanımlandı.

2. **Renderer çıktı yolu paketleme beklentisiyle hizalandı**
- `desktop-app/electron.vite.config.ts` içinde renderer build çıktısı `dist/renderer` olarak ayarlandı.
- Bu değişiklikle ana süreçte beklenen `dist/renderer/index.html` yolu ile gerçek derleme çıktısı aynı noktaya alındı.

3. **Ana süreçte (main) ikon çözümleme ve üretim log davranışı iyileştirildi**
- `desktop-app/src/main/index.ts` içinde:
  - `IS_DEV = !app.isPackaged` eklendi.
  - `devLog` ve `devError` yardımcıları eklendi.
  - `resolveAppIconPath()` aramasına `process.resourcesPath` dahil edildi.
  - Üretimde gereksiz konsol çıktısı verilmemesi için debug loglar dev koşuluna alındı.

4. **IPC katmanında üretim logları susturuldu**
- `desktop-app/src/main/ipc-handlers.ts` içinde:
  - `IS_DEV` ve `devLog(...args)` eklendi.
  - `LIST_MONTHS`, `GENERATE_OUTPUTS`, `ZHUHR_PERIODS`, `SELECT_OUTPUT_FOLDER` logları koşullu hale getirildi.

5. **Renderer tarafında loglama üretim modunda kapatıldı**
- `desktop-app/src/renderer/src/main.ts` içinde:
  - `IS_DEV = window.location.protocol === "http:"` eklendi.
  - `log()` ve `logError()` çağrıları yalnızca geliştirme modunda konsola yazacak şekilde güncellendi.

6. **Konum kataloğu ve cami verisi genişletildi**
- Build çıktısına yansıyan renderer bundle değişikliğine göre:
  - Yeni şehir/eyalet seçenekleri eklendi (ör. Brooklyn, Albany, New Haven, Springfield, New Castle, Levittown, Lancaster, Cliffside Park, Burlington, Port Jefferson Station, Monroeville).
  - Türkiye tarafında adlandırmalar güncellendi (`Altındağ`, `Fatih`, `Efeler`, `Türkiye`).
  - Yerleşik cami listesi önemli ölçüde genişletildi ve Efeler/Aydın camileri listeye dahil edildi.

7. **UI düzeninde konum satırı genişlik dengesi güncellendi**
- Build çıktısına yansıyan HTML değişikliğine göre:
  - `State/Province` seçim kutusu daraltıldı.
  - `City/Town` seçim kutusu genişletildi.

8. **Uygulama ikonu güncellendi**
- `desktop-app/build/icons/app.ico` dosyası yeni ikon içeriğiyle güncellendi.

9. **Derleme çıktıları commit kapsamına alındı**
- `desktop-app/out/renderer/index.html` güncellendi.
- Renderer JS varlığı hash değişikliğiyle yeniden üretildi (`index-BBDW1EPv.js` -> `index-Dh_l4uUE.js`).

## Neden Bu Değişiklikler Yapıldı?

- Paketlenen uygulamada kaynakların (özellikle takvimler ve şablonlar) eksik kalmasını engellemek.
- Geliştirme ve üretim davranışını ayrıştırarak son kullanıcıya gereksiz CLI/debug çıktısı yansıtmamak.
- Paketleme sırasında renderer dosya yolu uyuşmazlığından kaynaklanan boş/işlevsiz pencere riskini azaltmak.
- Konum ve cami seçimini saha ihtiyaçlarına uygun ölçekte genişletmek.
- Uygulama ikonunu kurumsal görsele yaklaştırmak ve dağıtım tutarlılığını artırmak.

## Nasıl Yapıldı? (Teknik Yaklaşım)

- Yapılandırma katmanında (`electron.vite.config.ts`, `package.json`) üretim artefaktlarının yolu ve paket kapsamı netleştirildi.
- Ana süreçte (`src/main`) `app.isPackaged` tabanlı koşullu loglama uygulanarak üretim terminal gürültüsü düşürüldü.
- Renderer katmanında protokol tabanlı geliştirme tespitiyle (`http:`) loglar dev modla sınırlandırıldı.
- Lokasyon/mosque veri modeli mevcut seçim mimarisini bozmayacak şekilde genişletildi; mevcut akışa yeni seçenekler entegre edildi.
- Görsel düzen değişiklikleri doğrudan renderer HTML/CSS çıktısına yansıtıldı.

## Commit Sonrası Beklenen Etki

- Uygulama paketlendiğinde gerekli schedule/template dosyaları erişilebilir olur.
- Üretimde konsol logları belirgin biçimde azalır.
- Konum ve cami seçimi daha geniş veri setiyle çalışır.
- Konum satırındaki kullanım ergonomisi (şehir alanı) iyileşir.
- İkon altyapısı güncel kaynaklarla dağıtıma hazır hale gelir.
