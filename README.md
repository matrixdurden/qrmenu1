# QR Menu Studio

Çoklu site destekli, PostgreSQL tabanlı QR menü yönetim sistemi.

## Özellikler

- `/admin` üzerinden birden fazla QR menü sitesi oluşturma
- İlk açılışta güvenli admin hesabı kurulumu (`/admin/setup`)
- HttpOnly session, scrypt parola hashleme ve başarısız giriş kilidi
- Site bazlı wallpaper, logo, renk, font, hero, Wi-Fi, iletişim ve sosyal medya ayarları
- Çalışma saatleri + timezone
- Göster/gizle ve sıra numarasıyla sayfa blok yönetimi
- Sınırsız derinlikte parent/child kategori modeli
- Ürün CRUD, birden çok kategori, eski fiyat/indirim, tükendi, aktif/pasif, öne çıkan
- JPG/PNG/WebP/GIF/AVIF yerel görsel upload (max 6 MB, dosya imzası doğrulamalı)
- Canlı telefon önizlemesi
- Site başına dinamik SVG QR kodu
- Kalıcı QR hedefi: `/m/<site-id>`; slug değişiklikleri basılmış QR kodlarını bozmaz
- PostgreSQL 18 + Drizzle migration
- GitHub Actions ile migration + lint + typecheck + production build kontrolü

## Gereksinimler

- Node.js 24+
- PostgreSQL 18

Repo `.node-version` ile Node 24'ü referans sürüm olarak kullanır. Yerel scriptler önce sistemdeki Node/PostgreSQL araçlarını kullanır; eski kullanıcı-alanı `.tools/node` ve `~/.local/share/qrmenu-postgres` kurulumu varsa fallback olarak desteklenir.

## Çalıştırma

Geliştirme:

```bash
./scripts/dev-local.sh
```

Ardından:

- Admin: `http://localhost:3000/admin`
- Demo menü alias'ı: `http://localhost:3000/menu/mira`

İlk admin hesabı yoksa `/admin` otomatik olarak `/admin/setup` adresine yönlendirir.

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

## Kalite kontrolü

Yerelde CI ile aynı temel kontrolleri çalıştırmak için:

```bash
npm run check
```

Bu komut ESLint, TypeScript typecheck ve production build çalıştırır. GitHub Actions ayrıca temiz PostgreSQL 18 servisi üzerinde migration'ları doğrular.

## Veritabanı

Migration:

```bash
npm run db:migrate
```

Demo MIRA verisini yeniden kurmak için:

```bash
npm run db:seed
```

> `db:seed` mevcut `mira` sitesini silip yeniden oluşturur; üretim verisinde kullanmayın.

## QR adresi

Admin editöründeki QR kod değişmeyen `/m/<site-id>` adresine yönlenir. Bu adres site UUID'sine bağlıdır ve slug değiştirilse bile aynı kalır. `/menu/<slug>` adresi okunabilir bir alias olarak çalışmaya devam eder.

Production ortamında `NEXT_PUBLIC_APP_URL` gerçek HTTPS domain olmalıdır. Basılı QR üretmeden önce bu değer doğru domain'e ayarlanmalıdır.

## Upload

Yüklenen dosyalar `public/uploads/<site-id>/` altında tutulur ve Git'e dahil edilmez. Dosyanın yalnızca tarayıcı tarafından bildirilen MIME tipi değil, gerçek dosya imzası doğrulanır. Görsel değiştirildiğinde veya ilgili kayıt/site silindiğinde eski yerel dosyalar temizlenir.

Tek sunuculu kurulum için bu yaklaşım uygundur; çoklu sunucu/cloud deployment'ta upload katmanı S3/R2 benzeri object storage ile değiştirilmelidir.
