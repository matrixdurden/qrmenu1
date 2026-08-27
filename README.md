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
- JPG/PNG/WebP/GIF/AVIF yerel görsel upload (max 6 MB)
- Canlı telefon önizlemesi
- Site başına dinamik SVG QR kodu
- PostgreSQL 18 + Drizzle migration

## Çalıştırma

Bu Linux ortamında Node proje içindeki `.tools/node` altında, PostgreSQL 18 ise kullanıcı alanında `~/.local/share/qrmenu-postgres` altında çalışır.

Geliştirme:

```bash
./scripts/dev-local.sh
```

Ardından:

- Admin: `http://localhost:3000/admin`
- Demo menü: `http://localhost:3000/menu/mira`

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

Her site için admin editöründe QR kod otomatik görünür. QR kod kalıcı `/menu/<slug>` adresine yönlenir. Production ortamında `NEXT_PUBLIC_APP_URL` gerçek domain olmalıdır.

## Upload

Yüklenen dosyalar `public/uploads/<site-id>/` altında tutulur ve Git'e dahil edilmez. Tek sunuculu kurulum için uygundur; çoklu sunucu/cloud deployment'ta bu katman S3/R2 benzeri object storage ile değiştirilmelidir.
