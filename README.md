# QR Menu Studio

PostgreSQL tabanlı, çoklu site destekli ve restoran dışındaki katalog/hizmet senaryolarına da uyarlanabilen QR menü platformu.

## Temel özellikler

- `/admin` üzerinden çoklu site yönetimi
- Owner + site bazlı manager yetkilendirmesi
- HttpOnly session, scrypt parola hashleme, hesap kilidi ve PostgreSQL tabanlı IP brute-force rate limit
- Site bazlı wallpaper, logo, renk, font, terminoloji, Wi-Fi, iletişim ve sosyal medya ayarları
- Çalışma saatleri + timezone
- Kalıcı QR hedefi `/m/<site-id>`; slug veya custom domain değişse bile basılmış QR bozulmaz
- Okunabilir `/menu/<slug>` alias adresleri
- Custom domain eşleme (`menu.ornek.com` gibi)
- Gerçek çoklu dil desteği: site, kategori, ürün ve esnek blok çevirileri
- Sınırsız derinlikte parent/child kategori modeli
- Ürün/hizmet CRUD, çoklu kategori, eski fiyat, stok/uygunluk, aktif/pasif ve öne çıkan desteği
- Favorileri cihazda kalıcı saklama
- Öne çıkan ürün bloğu
- Esnek sayfa blokları: hero, duyuru, arama, kategoriler, öne çıkanlar, katalog, galeri, bağlantılar, özel metin, işletme bilgileri ve footer
- Aynı blok tipinden birden fazla örnek ekleyebilme, sıra/görünürlük/config yönetimi
- JPG/PNG/WebP/GIF/AVIF upload; max 6 MB ve gerçek dosya imzası doğrulaması
- Yerel disk veya opsiyonel S3/R2 uyumlu object storage
- Canlı telefon önizlemesi
- Dinamik SVG QR üretimi
- Audit log
- `/api/health` liveness ve `/api/ready` PostgreSQL readiness endpointleri
- PostgreSQL backup/restore scriptleri
- PostgreSQL 18 + Drizzle migration
- GitHub Actions: dependency audit, migration, lint, typecheck, unit test ve production build
- GitHub Codespaces için tek tık geliştirme ortamı

## Admin yapısı

Site paneli tek dev sayfa yerine ayrı bölümlere ayrılmıştır:

- `/admin/sites/<site-id>/general`
- `/admin/sites/<site-id>/design`
- `/admin/sites/<site-id>/hours`
- `/admin/sites/<site-id>/sections`
- `/admin/sites/<site-id>/categories`
- `/admin/sites/<site-id>/products`
- `/admin/sites/<site-id>/qr`
- `/admin/sites/<site-id>/audit`

Owner hesapları ayrıca `/admin/users` üzerinden manager hesabı oluşturabilir ve her manager için erişilebilir siteleri seçebilir.

## Gereksinimler

Yerel kurulum için:

- Node.js 24+
- PostgreSQL 18

Repo `.node-version` ile Node 24'ü referans sürüm olarak kullanır. Yerel scriptler önce sistemdeki Node/PostgreSQL araçlarını kullanır; eski kullanıcı-alanı `.tools/node` ve `~/.local/share/qrmenu-postgres` kurulumu varsa fallback olarak desteklenir.

GitHub Codespaces kullanırsanız bilgisayarınıza Node, PostgreSQL veya repo kurmanız gerekmez.

## GitHub Codespaces

Repo `.devcontainer` ile Codespaces için hazırdır. GitHub repo sayfasında:

1. `Code` butonuna basın.
2. `Codespaces` sekmesini açın.
3. `Create codespace on main` seçeneğine basın.

İlk Codespace oluşturulurken otomatik olarak:

- Node.js 24 ortamı açılır,
- PostgreSQL 18 container'ı başlatılır,
- `.env.local` oluşturulur,
- `npm ci` çalışır,
- Drizzle migration'ları uygulanır,
- veritabanı boşsa MIRA demo verisi yüklenir,
- Next.js geliştirme sunucusu port `3000` üzerinde otomatik başlatılır,
- port Codespaces tarafından forward edilir ve tarayıcıda açılır.

Veritabanı named Docker volume üzerinde tutulur; aynı Codespace durdurulup yeniden açıldığında veriler korunur. Setup veritabanında site varsa demo seed'i tekrar çalıştırmaz.

İlk admin hesabı için forwarded uygulama adresinin sonuna `/admin` ekleyin. İlk kurulumda `/admin/setup` ekranı açılır ve oluşturulan ilk kullanıcı `owner` olur.

Demo menü:

```text
<codespace-url>/menu/mira
```

Health kontrolü:

```text
<codespace-url>/api/health
<codespace-url>/api/ready
```

Sunucu logunu görmek gerekirse Codespaces terminalinde:

```bash
cat /tmp/qrmenu-dev.log
```

Sunucu durmuşsa tekrar başlatmak için:

```bash
bash .devcontainer/start.sh
```

## Environment

`.env.example` dosyasını `.env.local` olarak kopyalayın ve en az şu değerleri ayarlayın:

```env
DATABASE_URL=postgresql://qrmenu_app:CHANGE_ME@127.0.0.1:5432/qrmenu
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Production'da `NEXT_PUBLIC_APP_URL` gerçek HTTPS ana domain olmalıdır. Basılı QR oluşturmadan önce bunu düzeltin.

Codespaces ortamında `.devcontainer/setup.sh`, `NEXT_PUBLIC_APP_URL` değerini Codespaces'ın forwarded HTTPS adresine otomatik ayarlar.

## Çalıştırma

Geliştirme:

```bash
./scripts/dev-local.sh
```

Production build:

```bash
./scripts/build-local.sh
./scripts/start-local.sh
```

PostgreSQL kontrolü:

```bash
./scripts/postgres-status.sh
./scripts/postgres-start.sh
./scripts/postgres-stop.sh
```

İlk admin hesabı yoksa `/admin` otomatik olarak `/admin/setup` adresine yönlendirir ve ilk hesap `owner` olur.

## Veritabanı

Migration:

```bash
npm run db:migrate
```

Demo MIRA verisini yeniden kurmak için:

```bash
npm run db:seed
```

`db:seed` mevcut `mira` sitesini silip yeniden oluşturur. Production verisinde kullanmayın.

## Kalite kontrolü

Yerelde CI ile aynı uygulama kontrollerini çalıştırmak için:

```bash
npm run check
```

Bu komut sırasıyla ESLint, TypeScript typecheck, unit test ve production build çalıştırır. GitHub Actions ayrıca temiz PostgreSQL 18 servisi üzerinde migration'ları, `npm audit --audit-level=high` sonucunu ve Codespaces devcontainer/Compose yapılandırmasını doğrular.

## QR adresleri

QR kodu değişmeyen site UUID'sine bağlıdır:

```text
https://domain.example/m/<site-id>
```

İnsan tarafından okunabilir alias ayrıca çalışır:

```text
https://domain.example/menu/<slug>
```

Slug değişebilir. Basılı QR'ın hedefi değişmez.

## Custom domain

Site genel ayarlarından örneğin `menu.ornek.com` girilebilir. DNS/reverse proxy tarafında bu host QR Menu Studio deployment'ına yönlendirilmelidir. Host uygulamaya geldiğinde `/` doğrudan eşleşen sitenin public menüsünü render eder.

TLS sertifikası ve DNS doğrulaması uygulama kodunun değil deployment/proxy katmanının sorumluluğudur.

## Upload ve object storage

Varsayılan mod tek sunucu için yerel disktir:

```text
public/uploads/<site-id>/...
```

Cloud veya birden fazla instance kullanırken `.env.local` içinde S3/R2 uyumlu storage ayarlanabilir:

```env
OBJECT_STORAGE_ENDPOINT=https://<s3-api-endpoint>
OBJECT_STORAGE_BUCKET=qrmenu
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_ACCESS_KEY_ID=...
OBJECT_STORAGE_SECRET_ACCESS_KEY=...
OBJECT_STORAGE_PUBLIC_URL=https://cdn.example.com
```

Bu değerlerin tamamı boş bırakılırsa local storage kullanılır. Object storage seçilirse endpoint, bucket, access key, secret key ve public URL birlikte verilmelidir.

Upload edilen dosyaların tarayıcının bildirdiği MIME tipine güvenilmez; gerçek dosya imzası doğrulanır. Kayıt güncellendiğinde eski dosya, site silindiğinde o siteye ait upload'lar temizlenir.

## Backup / restore

Yeni backup scriptleri GitHub Contents API ile oluşturulduğu için executable bit'e güvenmeyin; `sh` ile çağırmak en taşınabilir yöntemdir.

Backup:

```bash
sh scripts/backup-postgres.sh
```

Varsayılan çıktı `backups/qrmenu-<UTC-timestamp>.dump` olur. `BACKUP_DIR` ile dizin değiştirilebilir.

Restore veri değiştirir ve bilinçli olarak `--force` ister:

```bash
sh scripts/restore-postgres.sh --force backups/qrmenu-20260827T120000Z.dump
```

Production'da bu scripti ayrıca günlük scheduler/systemd timer ile çalıştırın ve backup'ı uygulama sunucusundan farklı bir storage'a kopyalayın. Aynı diskte duran tek backup gerçek backup değildir.

## Health checks

Liveness:

```text
GET /api/health
```

Readiness (PostgreSQL'e `select 1` yapar):

```text
GET /api/ready
```

Load balancer/Kubernetes/systemd health kontrolünde trafik vermek için readiness endpointini tercih edin.

## Güvenlik notları

- Session cookie HttpOnly ve SameSite strict'tir.
- Parolalar scrypt ile hashlenir.
- Login hem kullanıcı bazlı kilit hem hashlenmiş IP anahtarıyla global brute-force limiti uygular.
- Manager yalnızca kendisine atanmış sitelere erişebilir; site oluşturma/silme ve kullanıcı yönetimi owner'a aittir.
- Admin değişiklikleri audit log'a yazılır.
- CSP, HSTS (production), nosniff, frame, referrer ve permissions policy header'ları uygulanır.
- Production'da reverse proxy üzerinden yalnızca HTTPS yayınlayın ve PostgreSQL portunu internete açmayın.
