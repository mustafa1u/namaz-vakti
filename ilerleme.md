# İlerleme Notu

## Biçim Açıklaması
- Bu nottaki açıklamalar güzel bir teknik Türkçe ile yazılır ve Türkçe karakterler kullanılır. Mojibake karakter olmamasına dikkat edilir.
-Gereksiz olarak İngilizce kelimeler kullanılıp Türkçe-İngilizce arası bir dil olmamamsına dikkat edilir.
- En yeni kayıt en üstte olur.
- Commit mesajında KISA-ETIKET -- Normal commit mesajı şeklindeki format korunarak her komitin kolay okunur bir kısa etiketi olmasına dikkat edilir.

---

## Commit Mesajı
`PAKETLEME V1.0.7 -- Yerel credential önceliği ve DigitalOcean proxy geri dönüşü içeren Windows kurucusu üretildi.`

## Commit Zamanı
`2026-09-01`

## Bu Committe Yapılanlar

- Uygulama ve paket kilidi sürümü `1.0.7` olarak güncellendi.
- Güncel proxy geri dönüş davranışını içeren `Namaz Vakti Desktop Setup 1.0.7.exe` üretildi.
- 1.0.7 sürümü kendi installer, taşınabilir paket ve blockmap dosya adlarını kullanacak şekilde hazırlandı.
- Önceki sürüm dosyalarının üzerine yazılmaması sağlandı.

## Doğrulama

- `npm run dist:win`
- Installer çıktısı ve blockmap dosyası kontrol edildi.

---

## Commit Mesajı
`DİYANET KAYNAK SEÇİMİ V1.0.7 -- Geçerli yerel credential varsa doğrudan Diyanet, yoksa DigitalOcean proxy kullanımı eklendi.`

## Commit Zamanı
`2026-09-01`

## Bu Committe Yapılanlar

1. **Yerel geliştirme kullanımında doğrudan Diyanet erişimi korundu**
- Electron uygulaması çalışırken geçerli `DIYANET_API_EMAIL` ve `DIYANET_API_PASSWORD` değerleri varsa Diyanet API'sine doğrudan bağlanır.
- Geliştirici kendi `.env.local` dosyasıyla test yaparken DigitalOcean proxy'si gereksiz yere kullanılmaz.
- Komut satırı betikleri mevcut doğrudan Diyanet akışını korur.

2. **Credential bulunamaması durumunda proxy geri dönüşü eklendi**
- `.env.local` bulunmadığında veya gerekli credential değerleri eksik olduğunda Diyanet'e istek gönderilmeden public proxy kullanılır.
- Credential mevcut fakat Diyanet girişi başarısızsa uygulama proxy'ye geçer.
- Başarısız doğrudan erişim aynı çalışma oturumunda tekrar tekrar denenmez.
- Paketlenmiş son kullanıcı uygulaması credential içermediği için doğrudan proxy kullanır.

3. **Güvenlik ve kota davranışı netleştirildi**
- Diyanet kullanıcı adı, parolası ve erişim belirteci masaüstü paketine eklenmez.
- Geliştirici ortamındaki geçerli credential ile yapılan testler DigitalOcean proxy'sinin ve Diyanet kotasının gereksiz kullanımını önler.

## Doğrulama

- `npm run typecheck`
- `npm run build`
- `npm test` — 14 test başarılı.

---

## Commit Mesajı
`DİYANET PROXY V1.0.6 -- Diyanet kimlik bilgileri masaüstü uygulamasından çıkarıldı ve güvenli sunucu proxy'sine yönlendirme eklendi.`

## Commit Zamanı
`2026-09-01`

## Bu Committe Yapılanlar

1. **Diyanet istekleri güvenli proxy'ye yönlendirildi**
- Electron masaüstü uygulaması ülke, il, şehir ve çizelge isteklerini Namaz Vakti proxy hizmetine gönderir.
- Diyanet kullanıcı adı, parolası ve erişim belirteci uygulama paketinde bulunmaz.
- Komut satırındaki bakım ve indirme betikleri doğrudan Diyanet istemcisi olarak çalışmaya devam eder.
- Proxy adresi gerektiğinde `NAMAZ_VAKTI_API_BASE` ile değiştirilebilir.

2. **Sunucu hizmeti devreye alındı**
- Diyanet kimlik bilgileri yalnızca DigitalOcean Droplet üzerindeki sunucu ortamında tutulur.
- Proxy, yerleşik olmayan konumların listelerini ve yıllık çizelgelerini önbelleğe alır.
- Paterson 2027 çizelgesi proxy üzerinden 365 kayıtla doğrulandı.

## Güvenlik ve Yayın Kapsamı

- Diyanet kimlik bilgileri kaynak koda, `.env` dosyasına veya GitHub deposuna eklenmedi.
- Masaüstü uygulaması yalnızca herkese açık HTTPS proxy adresini içerir.
- Sunucu kodu ve gizli yapılandırma, masaüstü uygulamasının public deposuna dahil edilmez.

## Doğrulama

- Proxy `/health` kontrolü başarılı.
- Proxy ülke listesi isteği başarılı.
- Paterson 2027 çizelgesi proxy üzerinden 365 kayıt döndürdü.
- `npm run typecheck`
- `npm run build`
- `npm test` — 14 test başarılı.

---

## Commit Mesajı
`DİYANET KONUM EKLEME V1.0.5 -- Diyanet konumlarından cami ekleme, güncel yıl çizelgesi indirme ve cami yönetimi akışı iyileştirildi.`

## Commit Zamanı
`2026-08-31`

## Bu Committe Yapılanlar

1. **Diyanet konumlarından cami ekleme desteği genişletildi**
- Diyanet ülke, il ve şehir listeleri uygulamaya eklendi.
- Kullanıcı, yerleşik konumlar dışında Diyanet API'sindeki bir şehir için cami ekleyebilir.
- Ülke, il ve şehir seçimleri yalnızca ilgili seviye için istek gönderir.
- Alınan konum listeleri kalıcı önbelleğe kaydedilerek aynı seçimlerde kota tekrar kullanılmaz.
- Şehir/ilçe kimlikleri kullanıcı arayüzünde gösterilmez.

2. **Çizelge indirme ve yıl seçimi güncellendi**
- Yeni cami eklendiğinde geçerli yılın çizelgesi otomatik indirilir.
- Ana ekrandaki yıl seçimi varsayılan olarak geçerli yılı seçer.
- Kullanıcı, geçerli yılın yanında bir sonraki yılın çizelgesini de seçip indirebilir.
- Birden fazla cami aynı Diyanet konumunu kullanıyorsa aynı konum için gereksiz tekrar indirme yapılmaz.

3. **Cami ve konum seçimleri düzeltildi**
- Yerleşik ve Diyanet konumlarından cami ekleme seçenekleri birbirinden ayrıldı.
- Eklenen cami yüklendiğinde ülke, il ve şehir seçimleri doğru konuma eşitlenir.
- Eklenen konumlar ülke, il ve şehir seçim listelerine dahil edilir.
- Aynı şehirdeki yerleşik camiler ile Diyanet konumları birlikte gösterilebilir.
- Cami listesindeki ülke ve şehir adları yanlış yerleşik varsayılanlara düşmeyecek şekilde düzeltildi.

4. **Cami silme ve yeni cami ekleme formu düzeltildi**
- Cami silindikten sonra Load Mosque penceresi yenilenerek Add Mosque bölümü yeniden açılır.
- Masjid adı ve adres alanları her açılışta temiz ve etkin giriş öğeleriyle oluşturulur.
- Electron/Chromium bazı modal yeniden açılışlarında klavye olayını alıp metin giriş olayı üretmediğinde güvenli giriş geri dönüşü eklendi.
- Teknik borç: `kutucuğun içine yazılabiliyor. Ama kursör halen gözükmüyor`

## Neden Bu Değişiklikler Yapıldı?

- Kullanıcının yerleşik listede bulunmayan şehirlerden cami ekleyebilmesi gerekiyordu.
- Diyanet API kota kullanımını azaltmak için konum listelerinin ve çizelgelerin kontrollü biçimde önbelleğe alınması gerekiyordu.
- Yeni camilerde geçerli yılın otomatik kullanılmasına ve sonraki yılın seçilebilir olmasına ihtiyaç vardı.
- Cami silme sonrasında Add Mosque formundaki giriş alanı Electron yeniden çizim davranışı nedeniyle yazı kabul etmeyebiliyordu.

## Doğrulama

- `npm run typecheck`
- `npm run build`
- `npm test` — 14 test başarılı.
- Add Mosque → Delete Mosque → Add Mosque akışı elle doğrulandı; silme sonrasında masjid adı yazılıp yeni cami eklenebiliyor.

## Commit Sonrası Beklenen Etki

- Kullanıcı, yerleşik olmayan Diyanet şehirlerinden cami ekleyebilir.
- Yeni eklenen camiler için geçerli yıl çizelgesi otomatik hazır olur.
- Konum listeleri tekrar tekrar kota harcamadan kullanılabilir.
- Cami silme sonrasında yeni cami ekleme formu çalışır durumda kalır.

---

## Commit Mesajı
`DİYANET API -- Yetkili API kullanımı düzeltildi, çok yıllı çizelge okuma eklendi ve yerleşik konumların 2027 çizelgeleri indirildi.`

## Commit Zamanı
`2026-08-30`

## Bu Committe Yapılanlar

1. **Diyanet API kullanımı düzeltildi**
- Giriş isteği `https://awqatsalah.diyanet.gov.tr/Auth/Login` adresine taşındı.
- Korunan isteklerde girişten alınan erişim belirteci kullanılacak şekilde istemci düzeltildi.
- Yıllık çizelge isteği, güncel API'nin `POST /api/PrayerTime/DateRange` uç noktasını kullanacak şekilde güncellendi.
- Yıl bilgisi `DIYANET_YEAR` değişkeniyle seçilebilir hâle getirildi.

2. **Çok yıllı çizelge desteği eklendi**
- Uygulama çizelgeleri artık doğrudan 2026 klasörüne bağlı kalmadan `assets/schedules/<yıl>/` altındaki klasörlerde arıyor.
- Böylece aynı konum için farklı yıllara ait çizelgeler uygulama tarafından bulunabiliyor.

3. **Yerleşik konumların 2027 çizelgeleri indirildi**
- 33 benzersiz yerleşik konum için 2027 çizelgesi doğrulanarak `desktop-app/assets/schedules/2027/` altına kaydedildi.
- Aynı Diyanet konumunu kullanan Brooklyn/New York City kaydı iki kez indirilmedi.
- İlçe adları için Diyanet'teki şehir karşılıkları (Altındağ/Ankara, Fatih/İstanbul, Efeler/Aydın ve New York City/New York) tanımlandı.
- Paterson, NJ için Diyanet şehir kimliği 8877 kullanıldı.

## Doğrulama

- `npm run typecheck`
- `npm test`
- 2027 çizelgelerinin her biri 365 günlük kayıt ve geçerli başlık satırı içeriyor.

---

## Commit Mesajı
`GITHUB YAYIN HAZIRLIĞI -- Masaüstü uygulaması bağımsız GitHub deposuna gönderilmek üzere belgelendi ve seçili dosyalar aşamalı alana alındı.`

## Commit Zamanı
`2026-08-08`

## Bu Committe Yapılanlar

1. **Masaüstü uygulaması README belgeleri güncellendi**
- `desktop-app/README.md` içine İngilizce ve Türkçe arayüz ekran görüntüleri eklendi.
- Temel pencere, gelişmiş ayarlar ve Özelleştir penceresi için karşılaştırmalı görseller eklendi.
- Tek ve çift numaralı aylar için örnek çizelge görselleri ve İngilizce açıklamalar eklendi.
- README belgesinin DOCX karşılığı `desktop-app/README.docx` olarak oluşturuldu.

2. **Bağımsız GitHub deposu için yayın kapsamı belirlendi**
- Yayın kapsamı yalnızca `desktop-app` klasöründeki uygulama dosyalarıyla sınırlandırıldı.
- Ekran görüntüleri `desktop-app/docs/screenshots/` altında tutuldu.
- Geçici tarayıcı yakalama klasörleri, editör kilit dosyaları ve geçici yardımcı betikler yayın kapsamına alınmadı.

## Neden Bu Değişiklikler Yapıldı?

- Masaüstü uygulamasının ana depodan ayrılarak `mustafa1u/namaz-vakti` GitHub deposunda kendi kök diziniyle yayımlanması planlandı.
- Yeni depoda kullanıcıların uygulamayı ve arayüz seçeneklerini README üzerinden hızlıca anlayabilmesi hedeflendi.

## Doğrulama

- `npm run typecheck`
- README görsellerinin ve DOCX içindeki gömülü görsellerin kontrolü yapıldı.
- Seçili masaüstü uygulaması dosyaları Git aşamalı alanına alındı.

## Commit Sonrası Beklenen Etki

- Masaüstü uygulaması bağımsız GitHub deposuna temiz bir kök dizin yapısıyla aktarılabilir.
- README hem Markdown hem DOCX biçiminde kullanılabilir.
- Geçici ve üretilmiş çalışma dosyaları GitHub deposuna taşınmaz.

## Commit Mesajı
`KAMET BASKI AYARI V1.0.4 -- Excel çıktılarında sayfa yerleşimi, yazı sarma, kenarlıklar ve varsayılan kamet ayarları düzenlendi.`

## Commit Zamanı
`2026-07-07 00:17:33 +03:00`

## Bu Committe Yapılanlar

1. **Excel baskı yerleşimi A4 ve Letter sayfalara göre düzenlendi**
- `desktop-app/src/services/xlsx-writer.ts` içinde Excel çıktısının yazdırma alanı gerçek tablo sınırlarına indirildi.
- Kullanılmayan şablon satırlarının baskı alanını gereksiz büyütmesi engellendi.
- Sayfa kenar boşlukları 2 cm olarak ayarlandı.
- Genişlik A4 portre yazdırılabilir alana göre, yükseklik Letter portre yazdırılabilir alana yakın olacak şekilde ölçeklendi.
- Dikey güvenlik payı yarıya düşürülerek tablo yüksekliği daha iyi sayfa dolduracak hale getirildi.
- Excel yazdırma ayarları `No scaling` seçeneğinde daha tutarlı sonuç verecek şekilde yüzde 100, portre ve yatay ortalı olarak yazıldı.

2. **Excel hücre biçimleri iyileştirildi**
- Saat yazılan kamet hücrelerinde `Wrap text` artık her zaman etkinleştirildi.
- `(See *)`, `(See **)`, `(Bkz. *)` ve `(Bkz. **)` içeren öğle hücrelerinde yazı boyutu 18 puntoya eşitlendi.
- Çift sütunlu çift ay şablonunda son satırın alt kenarlığı bütün tablo boyunca kapatıldı.
- Özellikle Haziran gibi çift aylarda Fajr ve Asr alanlarında gün 30 alt çizgisinin eksik kalması engellendi.

3. **Varsayılan kamet ayarları güncellendi**
- `desktop-app/src/shared/ipc.ts` içinde 7 dakika olan varsayılan offset değerleri 4 dakikaya düşürüldü.
- Bu değişiklik öğle, ikindi ve yatsı için uygulandı.
- Tüm vakitlerde `No earlier than` ve `No later than` varsayılan olarak seçili olmayacak hale getirildi.
- `Varsayılanlara dön` akışı `DEFAULT_CUSTOMIZATION` değerini doğrudan kullanacak şekilde sadeleştirildi.

4. **Sürüm ve dağıtım çıktıları güncellendi**
- `desktop-app/package.json` ve `desktop-app/package-lock.json` sürümü `1.0.4` yapıldı.
- `Namaz Vakti Desktop Setup 1.0.4.exe` üretildi.
- `Namaz Vakti Desktop 1.0.4.exe` taşınabilir dağıtım paketi üretildi.
- `Namaz Vakti Desktop Setup 1.0.4.exe.blockmap` üretildi.

## Neden Bu Değişiklikler Yapıldı?

- PNG çıktısı sayfayı iyi doldururken Excel çıktısı `No scaling` ve `Fit to page` seçimlerinde aynı ölçü hissini vermiyordu.
- Şablondan kalan fazla satırlar Excel baskı alanını gereksiz büyütüyordu.
- Bazı saat hücrelerinde yazı sarma açık olmadığı için biçim davranışı sütunlara göre değişiyordu.
- Çift ay şablonunda bazı son satır alt kenarlıkları şablondan eksik geliyordu.
- Varsayılan kamet offset ve sınır seçimleri yeni istenen kullanım şekline göre sadeleştirilmeliydi.

## Nasıl Yapıldı? (Teknik Yaklaşım)

- Excel yazımı sonrasında çalışma sayfası XML'i işlenerek gerçek tablo alanı dışındaki satır ve hücreler temizlendi.
- Yazdırma alanı, sayfa kenar boşlukları, yönlendirme ve ölçek ayarları XML seviyesinde sabitlendi.
- Sütun genişlikleri ve satır yükseklikleri hedef yazdırılabilir ölçülere göre hesaplandı.
- Kamet hücre stili normalizasyonuna yazı sarma eklendi.
- Son tablo satırına açıkça alt kenarlık uygulanarak şablon farklılıklarına bağımlılık azaltıldı.
- Varsayılan özelleştirme değerleri ortak yapıdan güncellendi ve sıfırlama akışı bu ortak yapı ile eşitlendi.

## Doğrulama

- `npm test`
- `npm run typecheck`
- `npm run i18n:check`
- `npm run build`
- `npm run dist:win:all`

## Commit Sonrası Beklenen Etki

- Excel çıktıları portre A4 ve Letter sayfalarda daha dengeli ve dolu görünür.
- `No scaling` ve `Fit to page` arasında beklenen fark azalır.
- Saat hücreleri bütün vakitlerde daha tutarlı biçimlenir.
- Çift aylarda son satır alt çizgisi eksik kalmaz.
- Yeni üretimlerde öğle, ikindi ve yatsı varsayılan offset değeri 4 dakika olur.
- Vakit sınırı seçenekleri varsayılan olarak kapalı gelir.
- 1.0.4 kurucu ve taşınabilir paket bu değişiklikleri içerir.

---

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
