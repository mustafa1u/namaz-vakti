# İlerleme Notu

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
