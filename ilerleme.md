# İlerleme Notu

## Biçim Açıklaması
- Bu nottaki açıklamalar güzel bir teknik Türkçe ile yazılır ve Türkçe karakterler kullanılır. Mojibake karakter olmamasına dikkat edilir.
-Gereksiz olarak İngilizce kelimeler kullanılıp Türkçe-İngilizce arası bir dil olmamamsına dikkat edilir.
- En yeni kayıt en üstte olur.
- Commit mesajında KISA-ETIKET -- Normal commit mesajı şeklindeki format korunarak her komitin kolay okunur bir kısa etiketi olmasına dikkat edilir.

## Commit Mesajı
`KAMET ÜRETİM AKIŞI V1.0.3 -- Üretim sırasında ilerleme göstergesi, güvenli dosya adlandırma, varsayılan çıktı klasörü ve Explorer odak akışı iyileştirildi.`

## Commit Zamanı
`2026-07-05 19:17:42 +03:00`

## Bu Committe Yapılanlar

1. **Üret paneli ve üretim geri bildirimi iyileştirildi**
- `desktop-app/src/renderer/index.html` içinde çıktı klasörü satırı Üret paneline taşındı.
- Üretim sırasında belirsiz süreli ilerleme göstergesi eklendi.
- Oluşturulan dosya mesajı artık Üret panelinde düğmelerin altında gösterilir.
- `Klasörde göster / Show in Folder` düğmesi son oluşturulan dosyayı göstermeye devam eder.

2. **Varsayılan çıktı klasörü Windows kullanıcı klasörlerine bağlandı**
- `desktop-app/src/main/default-output-folder.ts` içinde varsayılan çıktı klasörü çözümleyicisi eklendi.
- Varsayılanlara dönüldüğünde önce `Documents`, yoksa `Downloads` klasörü kullanılır.
- İki klasör de bulunamazsa çıktı klasörü boş bırakılır ve hata gösterilmez.
- Bu davranış `desktop-app/scripts/default-output-folder.test.mjs` ile test edildi.

3. **Çıktı dosya adları daha okunabilir hale getirildi**
- Dosya adındaki çizelge ayı artık `January-2026` veya `Ocak-2026` gibi tam ay adıyla yazılır.
- Çakışma yoksa zaman damgası eklenmez.
- Çakışma varsa zaman damgası çift tireyle ayrılır: `iqamah_January-2026--05-Jul-2026_15-28-20.xlsx`.
- Zaman damgalı ad da çakışırsa `_2`, `_3` gibi sıra numarası eklenir.
- Zaman damgasındaki ay kısaltması seçili çıktı diline göre korunur.

4. **Windows Explorer Klasörde Göster akışı güçlendirildi**
- Mevcut Explorer penceresinin `HWND` değeri başarılı gösterimden sonra saklanır.
- Sonraki gösterimlerde aynı Explorer penceresi önce denenir; pencere arka plandaysa aynı pencere hedef klasöre gezdirilir.
- Pencere öne getirme için doğrudan Win32 `ShowWindowAsync`, `BringWindowToTop`, `SetForegroundWindow` ve `SwitchToThisWindow` çağrıları kullanılır.
- Mevcut pencere kapatılmışsa klasör eşleşmesi veya yeni Explorer penceresi geri dönüş yolu olarak korunur.

5. **Sürüm ve dağıtım çıktıları güncellendi**
- `desktop-app/package.json` ve `desktop-app/package-lock.json` sürümü `1.0.3` yapıldı.
- `Namaz Vakti Desktop Setup 1.0.3.exe` yeniden üretildi.
- `Namaz Vakti Desktop 1.0.3.exe` taşınabilir dağıtım paketi yeniden üretildi.
- `Namaz Vakti Desktop Setup 1.0.3.exe.blockmap` yeniden üretildi.

## Neden Bu Değişiklikler Yapıldı?

- Üretim sırasında uygulamanın çalıştığını gösteren belirgin bir geri bildirim gerekiyordu.
- Varsayılanlara dönüldüğünde çıktı klasörünün boş kalması kullanıcıyı gereksiz ayar yapmaya zorluyordu.
- Çıktı dosya adlarında çizelge ayı daha okunabilir olmalı, zaman damgası ise yalnızca gerçek çakışma durumunda eklenmeliydi.
- Klasörde Göster akışı mevcut Explorer penceresini bulsa bile pencereyi her zaman ön plana getiremiyordu.

## Nasıl Yapıldı? (Teknik Yaklaşım)

- Ana süreçte varsayılan klasör için yeni IPC kanalı ve küçük, test edilebilir çözümleyici eklendi.
- Dosya adı üretimi ortak `output-paths` servisinde güncellendi ve Node testleri yeni adlandırma kurallarına göre genişletildi.
- Renderer tarafında üretim durumu ve son oluşturulan dosya mesajı ayrı UI öğelerine bağlandı.
- Windows Explorer yeniden kullanım betiği mevcut pencere tanıtıcısını saklayıp sonraki çağrılarda doğrudan bu pencereyi hedefleyecek şekilde güncellendi.
- Electron Builder ile 1.0.3 NSIS kurucusu ve taşınabilir paket yeniden üretildi.

## Doğrulama

- `npm test`
- `npm run typecheck`
- `npm run i18n:check`
- `npm run build`
- `npm run dist:win:all`

## Commit Sonrası Beklenen Etki

- Üretim sırasında kullanıcı uygulamanın çalışmaya devam ettiğini görür.
- Varsayılanlara dönüşte kullanılabilir bir çıktı klasörü otomatik gelir.
- Aynı ay için ilk üretimde sade ve okunabilir dosya adı oluşur.
- Dosya adı çakışmalarında önceki dosyalar ezilmez.
- Mevcut Explorer penceresi arka planda kalsa bile Klasörde Göster akışı onu öne getirmeye çalışır.
- 1.0.3 kurucu ve taşınabilir paket bu değişiklikleri içerir.

---

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
