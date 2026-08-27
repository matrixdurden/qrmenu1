import Link from "next/link";
import { notFound } from "next/navigation";
import { createProduct, deleteProduct, updateProduct } from "@/app/admin/site-actions";
import { requireSiteAdmin } from "@/lib/auth";
import { getAdminSiteBasics } from "@/lib/admin-queries";
import { getAdminProductsPage } from "@/lib/queries";

const amount = (kurus: number | null) => kurus == null ? "" : (kurus / 100).toFixed(2);

export default async function ProductsPage({ params, searchParams }: { params: Promise<{ siteId: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  const { siteId } = await params;
  await requireSiteAdmin(siteId);
  const filters = await searchParams;
  const page = Math.max(1, Number(filters.page) || 1);
  const query = filters.q?.trim() ?? "";
  const [meta, catalog] = await Promise.all([getAdminSiteBasics(siteId), getAdminProductsPage(siteId, { query, page, pageSize: 40 })]);
  if (!meta) notFound();
  const { site, categories } = meta;
  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize));
  const altLocales = site.locales.filter((locale) => locale !== site.locale);

  return <div className="admin-page-main">
    <section className="panel">
      <div className="admin-subhead"><div><span className="eyebrow">YENİ ÜRÜN / HİZMET</span><h2>Kataloğa ekle</h2></div></div>
      <form action={createProduct} className="stack-form two-cols">
        <input type="hidden" name="siteId" value={siteId} />
        <label>Ad<input name="name" required /></label><label>Fiyat<input name="price" type="number" min="0" step="0.01" required /></label>
        <label>Eski fiyat<input name="compareAtPrice" type="number" min="0" step="0.01" /></label><label>Sıra<input name="sortOrder" type="number" defaultValue={catalog.total} /></label>
        <label className="full">Açıklama<textarea name="description" rows={3} /></label><label className="full">Görsel URL<input name="imageUrl" /></label><label className="full">Görsel yükle<input type="file" name="imageFile" accept="image/*" /></label>
        <label>Badge<input name="badge" /></label><label>Not<input name="note" /></label><label>İçindekiler<input name="ingredients" /></label><label>Alerjenler<input name="allergens" /></label>
        <fieldset className="full category-checks"><legend>Kategoriler</legend>{categories.map((category) => <label className="check" key={category.id}><input type="checkbox" name="categoryIds" value={category.id} /> {category.name}</label>)}</fieldset>
        {altLocales.map((locale) => <div className="translation-grid full" key={locale}><h4>{locale}</h4><label>Ad<input name={`tr:${locale}:name`} /></label><label>Açıklama<input name={`tr:${locale}:description`} /></label><label>Badge<input name={`tr:${locale}:badge`} /></label><label>Not<input name={`tr:${locale}:note`} /></label><label>İçindekiler<input name={`tr:${locale}:ingredients`} /></label><label>Alerjenler<input name={`tr:${locale}:allergens`} /></label></div>)}
        <label className="check"><input type="checkbox" name="isActive" defaultChecked /> Aktif</label><label className="check"><input type="checkbox" name="isAvailable" defaultChecked /> Stokta</label><label className="check"><input type="checkbox" name="isFeatured" /> Öne çıkan</label>
        <button className="button primary full" type="submit">Ekle</button>
      </form>
    </section>

    <section className="panel">
      <div className="admin-subhead"><div><span className="eyebrow">KATALOG</span><h2>Ürünler</h2></div><span className="count">{catalog.total}</span></div>
      <div className="toolbar"><form method="get"><input name="q" defaultValue={query} placeholder="Ürün ara..." /><button className="button ghost" type="submit">Ara</button></form>{query ? <Link className="button ghost" href={`/admin/sites/${siteId}/products`}>Temizle</Link> : null}</div>
      <div className="section-list">{catalog.products.map((product) => {
        const selectedIds = new Set(catalog.productCategories.filter((link) => link.productId === product.id).map((link) => link.categoryId));
        const names = categories.filter((category) => selectedIds.has(category.id)).map((category) => category.name);
        return <details className="section-card" key={product.id}><summary><div style={{ display: "flex", gap: 10, alignItems: "center" }}><div className="admin-thumb" style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined} /><div><strong>{product.name}</strong><br /><small>{names.join(" · ") || "Kategorisiz"} · {amount(product.priceKurus)} {site.currency}</small></div></div><span>{product.isActive && product.isAvailable ? "●" : "○"}</span></summary><form action={updateProduct} className="stack-form two-cols" style={{ marginTop: 16 }}><input type="hidden" name="siteId" value={siteId} /><input type="hidden" name="productId" value={product.id} /><label>Ad<input name="name" defaultValue={product.name} required /></label><label>Slug<input name="slug" defaultValue={product.slug} /></label><label>Fiyat<input name="price" type="number" min="0" step="0.01" defaultValue={amount(product.priceKurus)} required /></label><label>Eski fiyat<input name="compareAtPrice" type="number" min="0" step="0.01" defaultValue={amount(product.compareAtPriceKurus)} /></label><label>Sıra<input name="sortOrder" type="number" defaultValue={product.sortOrder} /></label><label>Badge<input name="badge" defaultValue={product.badge ?? ""} /></label><label className="full">Açıklama<textarea name="description" rows={3} defaultValue={product.description ?? ""} /></label><label className="full">Görsel URL<input name="imageUrl" defaultValue={product.imageUrl ?? ""} /></label><label className="full">Yeni görsel<input type="file" name="imageFile" accept="image/*" /></label><label>Not<input name="note" defaultValue={product.note ?? ""} /></label><label>İçindekiler<input name="ingredients" defaultValue={product.ingredients ?? ""} /></label><label className="full">Alerjenler<input name="allergens" defaultValue={product.allergens ?? ""} /></label><fieldset className="full category-checks"><legend>Kategoriler</legend>{categories.map((category) => <label className="check" key={category.id}><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={selectedIds.has(category.id)} /> {category.name}</label>)}</fieldset>{altLocales.map((locale) => { const tr = product.translations?.[locale] ?? {}; return <div className="translation-grid full" key={locale}><h4>{locale}</h4><label>Ad<input name={`tr:${locale}:name`} defaultValue={tr.name ?? ""} /></label><label>Açıklama<input name={`tr:${locale}:description`} defaultValue={tr.description ?? ""} /></label><label>Badge<input name={`tr:${locale}:badge`} defaultValue={tr.badge ?? ""} /></label><label>Not<input name={`tr:${locale}:note`} defaultValue={tr.note ?? ""} /></label><label>İçindekiler<input name={`tr:${locale}:ingredients`} defaultValue={tr.ingredients ?? ""} /></label><label>Alerjenler<input name={`tr:${locale}:allergens`} defaultValue={tr.allergens ?? ""} /></label></div>; })}<label className="check"><input type="checkbox" name="isActive" defaultChecked={product.isActive} /> Aktif</label><label className="check"><input type="checkbox" name="isAvailable" defaultChecked={product.isAvailable} /> Stokta</label><label className="check"><input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} /> Öne çıkan</label><button className="button primary" type="submit">Kaydet</button></form><form action={deleteProduct} style={{ marginTop: 10 }}><input type="hidden" name="siteId" value={siteId} /><input type="hidden" name="productId" value={product.id} /><button className="button danger" type="submit">Sil</button></form></details>;
      })}</div>
      {totalPages > 1 ? <nav className="pagination">{page > 1 ? <Link href={`?q=${encodeURIComponent(query)}&page=${page - 1}`}>← Önceki</Link> : null}<span className="status-pill">{page} / {totalPages}</span>{page < totalPages ? <Link href={`?q=${encodeURIComponent(query)}&page=${page + 1}`}>Sonraki →</Link> : null}</nav> : null}
    </section>
  </div>;
}
