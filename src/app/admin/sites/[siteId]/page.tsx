import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  deleteSite,
  updateBusinessHours,
  updateCategory,
  updateProduct,
  updateSections,
  updateSite,
} from "@/app/actions";
import { logoutAdmin } from "@/app/admin/auth-actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminSite } from "@/lib/queries";

const days = [
  { id: 1, name: "Pazartesi" }, { id: 2, name: "Salı" }, { id: 3, name: "Çarşamba" },
  { id: 4, name: "Perşembe" }, { id: 5, name: "Cuma" }, { id: 6, name: "Cumartesi" }, { id: 0, name: "Pazar" },
];

const amount = (kurus: number | null) => kurus == null ? "" : (kurus / 100).toFixed(2);

function categoryDepth(id: string, rows: { id: string; parentId: string | null }[]) {
  let depth = 0;
  let current = rows.find((row) => row.id === id);
  while (current?.parentId && depth < 12) {
    depth++;
    current = rows.find((row) => row.id === current?.parentId);
  }
  return depth;
}

export const dynamic = "force-dynamic";

export default async function SiteEditor({ params }: { params: Promise<{ siteId: string }> }) {
  await requireAdmin();
  const { siteId } = await params;
  const data = await getAdminSite(siteId);
  if (!data) notFound();
  const { site, categories, products, productCategories, hours, sections } = data;
  const publicBase = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const publicUrl = `${publicBase}/m/${site.id}`;

  return (
    <main className="admin-shell editor-shell">
      <header className="admin-topbar sticky-admin">
        <div className="crumb"><Link href="/admin">← Siteler</Link><span>/</span><strong>{site.name}</strong></div>
        <div className="top-actions">
          <Link className="button ghost" href={`/menu/${site.slug}`} target="_blank">Menüyü aç ↗</Link>
          <form action={logoutAdmin}><button className="button ghost" type="submit">Çıkış</button></form>
        </div>
      </header>

      <div className="editor-grid">
        <div className="editor-column">
          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">GENEL + TASARIM</span><h2>Site ayarları</h2></div><span className={site.isActive ? "status-pill success" : "status-pill"}>{site.isActive ? "Yayında" : "Pasif"}</span></div>
            <form action={updateSite} className="stack-form two-cols">
              <input type="hidden" name="siteId" value={site.id} />
              <label>İşletme adı<input name="name" defaultValue={site.name} required /></label>
              <label>Slug<input name="slug" defaultValue={site.slug} required /></label>
              <label className="full">Alt başlık<input name="subtitle" defaultValue={site.subtitle} /></label>

              <label className="full">Wallpaper URL<input name="coverUrl" defaultValue={site.coverUrl ?? ""} placeholder="https://... veya /uploads/..." /></label>
              <label className="full file-field">Wallpaper yükle<input type="file" name="coverFile" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" /><small>JPG, PNG, WebP, GIF, AVIF · max 6 MB</small></label>
              <label className="full">Logo URL<input name="logoUrl" defaultValue={site.logoUrl ?? ""} /></label>
              <label className="full file-field">Logo yükle<input type="file" name="logoFile" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" /></label>

              <label>Wi-Fi adı<input name="wifiName" defaultValue={site.wifiName ?? ""} /></label>
              <label>Wi-Fi şifresi<input name="wifiPassword" defaultValue={site.wifiPassword ?? ""} /></label>
              <label>Telefon<input name="phone" defaultValue={site.phone ?? ""} /></label>
              <label>WhatsApp<input name="whatsapp" defaultValue={site.whatsapp ?? ""} placeholder="90555..." /></label>
              <label>Instagram<input name="instagram" defaultValue={site.instagram ?? ""} /></label>
              <label>Facebook<input name="facebook" defaultValue={site.facebook ?? ""} /></label>
              <label>TikTok<input name="tiktok" defaultValue={site.tiktok ?? ""} /></label>
              <label>Web sitesi<input name="website" defaultValue={site.website ?? ""} /></label>
              <label className="full">Adres<input name="address" defaultValue={site.address ?? ""} /></label>
              <label className="full">Footer<input name="footerText" defaultValue={site.footerText ?? ""} /></label>

              <label>Para birimi<input name="currency" defaultValue={site.currency} /></label>
              <label>Dil<input name="locale" defaultValue={site.locale} /></label>
              <label>Saat dilimi<select name="timezone" defaultValue={site.timezone}><option>Europe/Istanbul</option><option>Europe/London</option><option>Europe/Berlin</option><option>Asia/Dubai</option><option>America/New_York</option></select></label>
              <label>Font<select name="fontFamily" defaultValue={site.theme.fontFamily ?? "system"}><option value="system">Modern / System</option><option value="rounded">Rounded</option><option value="serif">Serif</option></select></label>

              <div className="color-grid full">
                <label>Arka plan<input type="color" name="background" defaultValue={site.theme.background} /></label>
                <label>Kart<input type="color" name="card" defaultValue={site.theme.card} /></label>
                <label>Yazı<input type="color" name="textColor" defaultValue={site.theme.text} /></label>
                <label>Muted<input type="color" name="muted" defaultValue={site.theme.muted} /></label>
                <label>Accent<input type="color" name="accent" defaultValue={site.theme.accent} /></label>
                <label>Accent soft<input type="color" name="accentSoft" defaultValue={site.theme.accentSoft} /></label>
              </div>
              <label>Radius<input type="number" name="radius" min="0" max="48" defaultValue={site.theme.radius} /></label>
              <label>Hero yüksekliği<input type="number" name="heroHeight" min="140" max="420" defaultValue={site.theme.heroHeight} /></label>
              <label>Hero overlay<input type="number" name="heroOverlay" min="0.1" max="0.9" step="0.05" defaultValue={site.theme.heroOverlay ?? 0.62} /></label>
              <label>Ürün görünümü<select name="productLayout" defaultValue={site.theme.productLayout}><option value="grid">Grid</option><option value="list">Liste</option></select></label>
              <label className="check"><input type="checkbox" name="showFavorites" defaultChecked={site.theme.showFavorites ?? true} /> Favorileri göster</label>
              <label className="check"><input type="checkbox" name="showLanguage" defaultChecked={site.theme.showLanguage ?? true} /> Dil rozetini göster</label>
              <label className="check"><input type="checkbox" name="showHoursBadge" defaultChecked={site.theme.showHoursBadge ?? true} /> Açık/saat rozetini göster</label>
              <label className="check"><input type="checkbox" name="isActive" defaultChecked={site.isActive} /> Site aktif</label>
              <button className="button primary full" type="submit">Ayarları kaydet</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">SAYFA DÜZENİ</span><h2>Bloklar</h2></div><span className="count">{sections.length}</span></div>
            <p className="panel-note">Blokları gizleyebilir ve sıra numarasıyla istediğiniz düzene taşıyabilirsiniz.</p>
            <form action={updateSections} className="section-editor">
              <input type="hidden" name="siteId" value={site.id} />
              {sections.map((section) => <div className="section-row" key={section.id}><div className="drag-handle">⋮⋮</div><strong>{section.label}</strong><label className="check"><input type="checkbox" name={`visible-${section.id}`} defaultChecked={section.isVisible} /> Göster</label>{section.type === "hero" ? <span className="fixed-order">Üstte sabit</span> : <label className="order-field">Sıra<input type="number" name={`order-${section.id}`} defaultValue={section.sortOrder} /></label>}</div>)}
              <button className="button primary" type="submit">Blok düzenini kaydet</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">ÇALIŞMA SAATLERİ</span><h2>Haftalık saatler</h2></div></div>
            <form action={updateBusinessHours} className="hours-form">
              <input type="hidden" name="siteId" value={site.id} />
              {days.map((day) => {
                const row = hours.find((item) => item.dayOfWeek === day.id);
                return <div className="hours-row" key={day.id}><strong>{day.name}</strong><input type="time" name={`open-${day.id}`} defaultValue={row?.openTime ?? "08:00"} /><span>—</span><input type="time" name={`close-${day.id}`} defaultValue={row?.closeTime ?? "00:00"} /><label className="check"><input type="checkbox" name={`closed-${day.id}`} defaultChecked={row?.isClosed} /> Kapalı</label></div>;
              })}
              <button className="button primary" type="submit">Saatleri kaydet</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">KATEGORİLER</span><h2>Esnek kategori ağacı</h2></div><span className="count">{categories.length}</span></div>
            <form action={createCategory} className="stack-form two-cols compact-form">
              <input type="hidden" name="siteId" value={site.id} />
              <label>Kategori adı<input name="name" placeholder="Burgerler" required /></label>
              <label>Üst kategori<select name="parentId" defaultValue=""><option value="">Ana kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{"— ".repeat(categoryDepth(c.id, categories))}{c.name}</option>)}</select></label>
              <label>Görsel URL<input name="imageUrl" placeholder="https://..." /></label>
              <label className="file-field">Görsel yükle<input type="file" name="imageFile" accept="image/*" /></label>
              <label>Sıra<input type="number" name="sortOrder" defaultValue={categories.length} /></label>
              <button className="button primary" type="submit">Kategori ekle</button>
            </form>
            <div className="category-admin-list editable-list">
              {categories.map((category) => (
                <details className="edit-card" key={category.id}>
                  <summary style={{ paddingLeft: 14 + categoryDepth(category.id, categories) * 18 }}><span className={category.isActive ? "dot active" : "dot"} /><strong>{category.name}</strong><small>{category.parentId ? "Alt kategori" : "Ana kategori"} · sıra {category.sortOrder}</small><span className="row-arrow">⌄</span></summary>
                  <form action={updateCategory} className="stack-form two-cols edit-form">
                    <input type="hidden" name="siteId" value={site.id} /><input type="hidden" name="categoryId" value={category.id} />
                    <label>Ad<input name="name" defaultValue={category.name} required /></label>
                    <label>Slug<input name="slug" defaultValue={category.slug} /></label>
                    <label>Üst kategori<select name="parentId" defaultValue={category.parentId ?? ""}><option value="">Ana kategori</option>{categories.filter((c) => c.id !== category.id).map((c) => <option key={c.id} value={c.id}>{"— ".repeat(categoryDepth(c.id, categories))}{c.name}</option>)}</select></label>
                    <label>Sıra<input type="number" name="sortOrder" defaultValue={category.sortOrder} /></label>
                    <label className="full">Açıklama<input name="description" defaultValue={category.description ?? ""} /></label>
                    <label className="full">Görsel URL<input name="imageUrl" defaultValue={category.imageUrl ?? ""} /></label>
                    <label className="file-field full">Yeni görsel<input type="file" name="imageFile" accept="image/*" /></label>
                    <label className="check"><input type="checkbox" name="isActive" defaultChecked={category.isActive} /> Aktif</label>
                    <button className="button primary" type="submit">Kategoriyi güncelle</button>
                  </form>
                  <form action={deleteCategory} className="danger-inline"><input type="hidden" name="siteId" value={site.id} /><input type="hidden" name="categoryId" value={category.id} /><span>Silinen kategorinin alt kategorileri ana kategoriye taşınır.</span><button className="button danger" type="submit">Sil</button></form>
                </details>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">ÜRÜNLER</span><h2>Yeni ürün</h2></div></div>
            <form action={createProduct} className="stack-form two-cols">
              <input type="hidden" name="siteId" value={site.id} />
              <label>Ürün adı<input name="name" required /></label>
              <label>Fiyat<input name="price" type="number" min="0" step="0.01" required /></label>
              <label>Eski fiyat<input name="compareAtPrice" type="number" min="0" step="0.01" placeholder="Opsiyonel" /></label>
              <label>Sıra<input name="sortOrder" type="number" defaultValue={products.length} /></label>
              <label className="full">Açıklama<textarea name="description" rows={3} /></label>
              <label className="full">Görsel URL<input name="imageUrl" placeholder="https://..." /></label>
              <label className="full file-field">Görsel yükle<input type="file" name="imageFile" accept="image/*" /></label>
              <label>Badge<input name="badge" placeholder="Yeni / Şef Önerisi" /></label>
              <label>Not<input name="note" placeholder="180 g / 350 ml" /></label>
              <label>İçindekiler<input name="ingredients" /></label>
              <label>Alerjenler<input name="allergens" /></label>
              <fieldset className="full category-checks"><legend>Kategoriler</legend>{categories.map((category) => <label key={category.id} className="check"><input type="checkbox" name="categoryIds" value={category.id} /> {category.name}</label>)}</fieldset>
              <label className="check"><input type="checkbox" name="isActive" defaultChecked /> Aktif</label>
              <label className="check"><input type="checkbox" name="isAvailable" defaultChecked /> Stokta</label>
              <label className="check"><input type="checkbox" name="isFeatured" /> Öne çıkan</label>
              <button className="button primary full" type="submit">Ürünü ekle</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">KATALOG</span><h2>Ürünler</h2></div><span className="count">{products.length}</span></div>
            <div className="product-admin-list editable-list">
              {products.map((product) => {
                const selectedIds = new Set(productCategories.filter((link) => link.productId === product.id).map((link) => link.categoryId));
                const names = categories.filter((cat) => selectedIds.has(cat.id)).map((cat) => cat.name);
                return <details className="edit-card" key={product.id}>
                  <summary><div className="admin-thumb" style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined} /><div className="summary-copy"><strong>{product.name}</strong><small>{names.join(" · ") || "Kategorisiz"}</small></div><div className="summary-price">{amount(product.priceKurus)} {site.currency}</div><span className={product.isActive && product.isAvailable ? "dot active" : "dot"} /><span className="row-arrow">⌄</span></summary>
                  <form action={updateProduct} className="stack-form two-cols edit-form">
                    <input type="hidden" name="siteId" value={site.id} /><input type="hidden" name="productId" value={product.id} />
                    <label>Ad<input name="name" defaultValue={product.name} required /></label>
                    <label>Slug<input name="slug" defaultValue={product.slug} /></label>
                    <label>Fiyat<input name="price" type="number" min="0" step="0.01" defaultValue={amount(product.priceKurus)} required /></label>
                    <label>Eski fiyat<input name="compareAtPrice" type="number" min="0" step="0.01" defaultValue={amount(product.compareAtPriceKurus)} /></label>
                    <label>Sıra<input name="sortOrder" type="number" defaultValue={product.sortOrder} /></label>
                    <label>Badge<input name="badge" defaultValue={product.badge ?? ""} /></label>
                    <label className="full">Açıklama<textarea name="description" rows={3} defaultValue={product.description ?? ""} /></label>
                    <label className="full">Görsel URL<input name="imageUrl" defaultValue={product.imageUrl ?? ""} /></label>
                    <label className="full file-field">Yeni görsel<input type="file" name="imageFile" accept="image/*" /></label>
                    <label>Not<input name="note" defaultValue={product.note ?? ""} /></label>
                    <label>İçindekiler<input name="ingredients" defaultValue={product.ingredients ?? ""} /></label>
                    <label className="full">Alerjenler<input name="allergens" defaultValue={product.allergens ?? ""} /></label>
                    <fieldset className="full category-checks"><legend>Kategoriler</legend>{categories.map((category) => <label key={category.id} className="check"><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={selectedIds.has(category.id)} /> {category.name}</label>)}</fieldset>
                    <label className="check"><input type="checkbox" name="isActive" defaultChecked={product.isActive} /> Aktif</label>
                    <label className="check"><input type="checkbox" name="isAvailable" defaultChecked={product.isAvailable} /> Stokta</label>
                    <label className="check"><input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} /> Öne çıkan</label>
                    <button className="button primary" type="submit">Ürünü güncelle</button>
                  </form>
                  <form action={deleteProduct} className="danger-inline"><input type="hidden" name="siteId" value={site.id} /><input type="hidden" name="productId" value={product.id} /><span>Bu ürün kalıcı olarak silinir.</span><button className="button danger" type="submit">Sil</button></form>
                </details>;
              })}
            </div>
          </section>

          <section className="panel danger-zone">
            <div className="panel-head"><div><span className="eyebrow">TEHLİKELİ ALAN</span><h2>Siteyi sil</h2></div></div>
            <form action={deleteSite} className="danger-delete"><input type="hidden" name="siteId" value={site.id} /><label>Onaylamak için <b>{site.slug}</b> yazın<input name="confirmSlug" autoComplete="off" required /></label><button className="button danger" type="submit">Siteyi kalıcı sil</button></form>
          </section>
        </div>

        <aside className="preview-column">
          <div className="preview-label">CANLI SAYFA</div>
          <div className="phone-frame"><iframe title={`${site.name} menü önizlemesi`} src={`/menu/${site.slug}`} /></div>
          <section className="qr-card">
            <div><span className="eyebrow">QR KOD</span><h3>{site.name}</h3></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="qr-image" src={`/api/qr/${site.id}`} alt={`${site.name} QR kodu`} />
            <code>{publicUrl}</code>
            <a className="button primary" href={`/api/qr/${site.id}?download=1`}>SVG indir</a>
          </section>
        </aside>
      </div>
    </main>
  );
}
