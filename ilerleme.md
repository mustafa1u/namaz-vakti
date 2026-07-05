# İlerleme Notu

## Biçim Açıklaması
- Bu nottaki açıklamalar güzel bir teknik Türkçe ile yazılır ve Türkçe karakterler kullanılır. Mojibake karakter olmamasına dikkat edilir.
-Gereksiz olarak İngilizce kelimeler kullanılıp Türkçe-İngilizce arası bir dil olmamamsına dikkat edilir.
- En yeni kayıt en üstte olur.
- Commit mesajında KISA-ETIKET -- Normal commit mesajı şeklindeki format korunarak her komitin kolay okunur bir kısa etiketi olmasına dikkat edilir.

## Commit Mesajı
`KAMET ÇIKTI KORUMASI V1.0.2 -- Kamet çizelgesi çıktılarında zaman damgalı dosya adları, çakışma koruması ve OneDrive uyumlu Klasörde Göster akışı eklendi.`

## Commit Zamanı
`2026-07-05 14:35:58 +03:00`

## Bu Committe Yapılanlar

1. **Çıktı dosyaları için çakışma koruması eklendi**
- `desktop-app/src/services/output-paths.ts` içinde ortak çıktı yolu üretimi eklendi.
- XLSX ve PNG dosya adları artık ay bilgisi, seçili çıktı diline göre ay kısaltması ve zaman damgası içerir.
- Aynı ad yine çakışırsa `_2`, `_3` gibi sıra numarası eklenir.
- Geçici dosya adları için de ayrı çakışma koruması sağlandı.

2. **Çıktı yazımı geçici dosya ve final taşıma akışına alındı**
- `desktop-app/src/services/xlsx-writer.ts` ve `desktop-app/src/services/png-renderer.ts` çıktıyı önce aynı klasörde geçici dosyaya yazar.
- Yazım tamamlandıktan sonra geçici dosya final dosya adına taşınır.
- Hata durumunda geride geçici dosya kalmaması için temizlik yapılır.
- Bu yöntem OneDrive ve Explorer tarafında yeni dosyanın daha güvenilir algılanmasını hedefler.

3. **Klasörde Göster özelliği eklendi**
- `desktop-app/src/shared/ipc.ts`, `desktop-app/src/preload/index.ts` ve `desktop-app/src/main/ipc-handlers.ts` içinde `SHOW_IN_FOLDER` kanalı eklendi.
- Dosya üretimi tamamlandığında oluşturulan dosya otomatik olarak klasörde gösterilir.
- Arayüze son oluşturulan dosyayı tekrar göstermek için `Klasörde göster / Show in Folder` düğmesi eklendi.
- `desktop-app/src/renderer/src/main.ts`, `desktop-app/src/renderer/index.html` ve çeviri dosyaları bu yeni akışı destekleyecek şekilde güncellendi.

4. **OneDrive uyumlu Windows Explorer gösterme stratejisi eklendi**
- `desktop-app/src/main/reveal-in-folder.ts` içinde klasörde gösterme kararı merkezi hale getirildi.
- Windows üzerinde önce aynı klasörü gösteren açık Explorer penceresi yeniden kullanılmaya çalışılır.
- Mevcut Explorer penceresi kullanılırken klasör görünümü yeniden gezdirilip hedef klasöre döndürülür ve dosya seçilir.
- Mevcut pencere yeniden kullanılamazsa `explorer.exe /select,<dosya>` ile güvenilir seçim akışı çalışır.
- Electron `shell.showItemInFolder` son geri dönüş yolu olarak korunur.

5. **Test altyapısı ve paket ayarları güncellendi**
- `desktop-app/package.json` içine `npm test` komutu eklendi.
- `desktop-app/scripts/output-paths.test.mjs` ile dosya adı, ay kısaltması, suffix ve geçici dosya adı davranışı test edildi.
- `desktop-app/scripts/reveal-in-folder.test.mjs` ile Explorer penceresi yeniden kullanımı, geri dönüş akışı ve tek gösterim davranışı test edildi.
- Paket sürümü ve paket kilidi `1.0.2` ile eşitlendi.
- Windows dağıtım komutları ve NSIS paketleme ayarları staged değişikliklere uygun şekilde güncellendi.

## Neden Bu Değişiklikler Yapıldı?

- Aynı ay için tekrar üretim yapıldığında önceki çıktıların ezilmesi riski vardı.
- OneDrive klasörlerinde Explorer görünümü yeni dosyayı bazen yenilemeden göstermiyordu.
- Kullanıcının dosyayı bulmak için elle yenileme, sekme çoğaltma veya yeni pencere açma işlemi yapması gerekiyordu.
- Üretim sonrası dosyaya hızlı erişim için otomatik ve elle tetiklenebilir Klasörde Göster akışı istendi.

## Nasıl Yapıldı? (Teknik Yaklaşım)

- Dosya adı üretimi servis katmanında ortaklaştırıldı ve yazar servisleri bu ortak üreticiyi kullanacak şekilde düzenlendi.
- Çıktı dosyaları önce geçici ada yazılıp sonra final ada taşınarak OneDrive’ın final dosyayı algılaması kolaylaştırıldı.
- Ana süreçte Windows Explorer için önce mevcut pencereyi yeniden kullanma, sonra yeni seçim penceresi açma, en sonda Electron kabuğuna düşme sırası kuruldu.
- Arayüz tarafında son oluşturulan dosya yolu saklanarak `Klasörde göster` düğmesinin aynı dosyayı tekrar gösterebilmesi sağlandı.
- Davranışlar Node testleriyle kapsandı ve test komutu paket betiklerine eklendi.

## Doğrulama

- `npm test`
- `npm run typecheck`
- `npm run i18n:check`
- `npm run build`

## Commit Sonrası Beklenen Etki

- Önceki çıktı dosyaları yanlışlıkla ezilmez.
- Çıktı dosya adları daha okunabilir ve izlenebilir olur.
- OneDrive klasörlerinde oluşturulan dosyanın Explorer’da görünmesi daha güvenilir hale gelir.
- Aynı klasör zaten açıksa yeni pencere açmadan mevcut Explorer penceresi kullanılmaya çalışılır.
- Mevcut pencere yeniden kullanılamazsa dosya yine güvenilir geri dönüş akışıyla klasörde gösterilir.

---

## Commit Mesajı
`ÖZELLEŞTİR PENCERESİ DÜZENİ V1.0.1 -- Customize penceresinde ayraçlı grup düzeni uygulanarak okunabilirlik artırıldı ve sürüm 1.0.1'e yükseltildi.`

## Commit Zamanı
`2026-02-25 02:58:09 +03:00`

## Bu Committe Yapılanlar

1. **Uygulama sürümü güncellendi**
- `desktop-app/package.json` içinde sürüm değeri `1.0.0` -> `1.0.1` olarak yükseltildi.

2. **Customize modal genişliği yeniden dengelendi**
- `desktop-app/src/renderer/index.html` içinde `#customizeModal .modal-panel` genişliği `min(844px, 100%)` olarak tanımlandı.
- Amaç, gereksiz yatay boşluğu azaltmak ve içerik yoğunluğunu daha dengeli bir düzene taşımaktır.

3. **Customize alanları görsel gruplara ayrıldı**
- `desktop-app/src/renderer/index.html` içinde yeni sınıflar eklendi:
  - `.customize-group`
  - `.customize-group-secondary`
  - `.customize-group-no-separator`
- `.customize-controls` yapısı güncellenerek satır içi öğeler bölümlere ayrıldı ve dikey ayraçlarla görsel ayrım güçlendirildi.

4. **Dikey ayraç davranışı bağlama göre optimize edildi**
- Sağda gereksiz kalan ayraçların görünmemesi için:
  - son grup davranışı (`:last-child`) korundu,
  - ayrıca `.customize-group-no-separator` sınıfı ile seçili gruplarda ayraç kapatıldı.

5. **Customize modal içeriği satır/sütun semantiğiyle yeniden düzenlendi**
- `desktop-app/src/renderer/src/main.ts` içinde `initializeCustomizeModalUi()` şablonu yeniden yapılandırıldı.
- Kontroller şu gruplara ayrıldı:
  - Grup 1: `Enabled` + `Direction`
  - Grup 2: `Offset minutes`
  - Grup 3: `Minute multiple` (sağ ayraçsız)
  - Grup 4 (ikinci satır): `No earlier than` + `No later than` (sol hizalı)
- Bu düzenlemede ikinci satır için `customize-group-secondary` kullanılarak checkbox’ların tek satır baskısını kırmadan okunaklı yerleşim sağlandı.

## Neden Bu Değişiklikler Yapıldı?

- Customize penceresinde hangi ayarın hangi kümeye ait olduğu görsel olarak yeterince ayırt edilemiyordu.
- Özellikle dar genişlikte `Minute multiple` alanı satır kırılımında dengesiz davranıyor, `No earlier/no later` ile görsel karışıklık oluşturuyordu.
- Sağ tarafta işlevsel karşılığı olmayan dikey ayraçlar arayüzde gereksiz gürültü üretiyordu.
- Kullanıcı geri bildirimi doğrultusunda daha kompakt, daha net ve hizası güçlü bir düzen hedeflendi.

## Nasıl Yapıldı? (Teknik Yaklaşım)

- CSS tarafında mevcut `customize-controls` flex düzeni korundu; ancak kontrol alanları semantik gruplara bölünerek her gruba özel ayraç/hizalama kuralları tanımlandı.
- Template üretimi `main.ts` içinde doğrudan gruplu HTML üretecek şekilde revize edildi; böylece sadece stil değil, DOM yapısı da mantıksal bölümlere ayrıldı.
- İkinci satıra taşınması istenen checkbox alanları için tam satır davranışı (`flex-basis: 100%`) uygulandı.
- Son/ayraçsız grup kurallarıyla sağ uçtaki gereksiz border çizimi ortadan kaldırıldı.

## Commit Sonrası Beklenen Etki

- Customize penceresinde ayar kümeleri gözle daha hızlı ayrıştırılır.
- `No earlier than` / `No later than` kutuları ikinci satırda, sol hizalı ve tutarlı görünür.
- `Minute multiple` alanı sıkışmadan, kendi grubu içinde kalır.
- Modal genişliği gereksiz boşluk üretmeden daha verimli kullanılır.
- Sürüm numarası dağıtıma uygun şekilde `1.0.1` olarak güncel kalır.
