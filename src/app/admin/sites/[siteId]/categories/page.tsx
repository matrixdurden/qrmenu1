import { notFound } from "next/navigation";
import { createCategory, deleteCategory, updateCategory } from "@/app/admin/site-actions";
import { requireSiteAdmin } from "@/lib/auth";
import { getAdminSite } from "@/lib/queries";

function categoryDepth(id: string, rows: { id: string; parentId: string | null }[]) {
  let depth = 0;
  let current = rows.find((row) => row.id === id);
  while (current?.parentId && depth < 20) {
    depth++;
    current = rows.find((row) => row.id === current?.parentId);
  }
  return depth;
}

export default async function CategoriesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAdmin(siteId);
  const data = await getAdminSite(siteId);
  if (!data) notFound();
  const { site, categories } = data;
  const altLocales = site.locales.filter((locale) => locale !== site.locale);

  return <div className="admin-page-main">
    <section className="panel">
      <div className="admin-subhead"><div><span className="eyebrow">YENİ KATEGORİ</span><h2>Kategori ekle</h2></div><span className="count">{categories.length}</span></div>
      <form action={createCategory} className="stack-form two-cols">
        <input type="hidden" name="siteId" value={siteId} />
        <label>Ad<input name="name" required /></label>
        <label>Üst kategori<select name="parentId" defaultValue=""><option value="">Ana kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{"— ".repeat(categoryDepth(c.id, categories))}{c.name}</option>)}</select></label>
        <label>Slug<input name="slug" /></label><label>Sıra<input type="number" name="sortOrder" defaultValue={categories.length} /></label>
        <label className="full">Açıklama<textarea name="description" rows={2} /></label>
        <label className="full">Görsel URL<input name="imageUrl" /></label><label className="full">Görsel yükle<input type="file" name="imageFile" accept="image/*" /></label>
        {altLocales.map((locale) => <div className="translation-grid full" key={locale}><h4>{locale}</h4><label>Ad<input name={`tr:${locale}:name`} /></label><label>Açıklama<input name={`tr:${locale}:description`} /></label></div>)}
        <button className="button primary full" type="submit">Kategori ekle</button>
      </form>
    </section>
    <section className="panel">
      <div className="admin-subhead"><div><span className="eyebrow">KATEGORİ AĞACI</span><h2>Kategoriler</h2></div></div>
      <div className="section-list">{categories.map((category) => <details className="section-card" key={category.id}><summary style={{ paddingLeft: categoryDepth(category.id, categories) * 14 }}><div><strong>{category.name}</strong><br /><small>{category.parentId ? "Alt kategori" : "Ana kategori"} · sıra {category.sortOrder}</small></div><span>⌄</span></summary><form action={updateCategory} className="stack-form two-cols" style={{ marginTop: 16 }}><input type="hidden" name="siteId" value={siteId} /><input type="hidden" name="categoryId" value={category.id} /><label>Ad<input name="name" defaultValue={category.name} required /></label><label>Slug<input name="slug" defaultValue={category.slug} /></label><label>Üst kategori<select name="parentId" defaultValue={category.parentId ?? ""}><option value="">Ana kategori</option>{categories.filter((c) => c.id !== category.id).map((c) => <option key={c.id} value={c.id}>{"— ".repeat(categoryDepth(c.id, categories))}{c.name}</option>)}</select></label><label>Sıra<input type="number" name="sortOrder" defaultValue={category.sortOrder} /></label><label className="full">Açıklama<textarea name="description" rows={2} defaultValue={category.description ?? ""} /></label><label className="full">Görsel URL<input name="imageUrl" defaultValue={category.imageUrl ?? ""} /></label><label className="full">Yeni görsel<input type="file" name="imageFile" accept="image/*" /></label>{altLocales.map((locale) => { const tr = category.translations?.[locale] ?? {}; return <div className="translation-grid full" key={locale}><h4>{locale}</h4><label>Ad<input name={`tr:${locale}:name`} defaultValue={tr.name ?? ""} /></label><label>Açıklama<input name={`tr:${locale}:description`} defaultValue={tr.description ?? ""} /></label></div>; })}<label className="check"><input type="checkbox" name="isActive" defaultChecked={category.isActive} /> Aktif</label><button className="button primary" type="submit">Kaydet</button></form><form action={deleteCategory} style={{ marginTop: 10 }}><input type="hidden" name="siteId" value={siteId} /><input type="hidden" name="categoryId" value={category.id} /><button className="button danger" type="submit">Sil</button></form></details>)}</div>
    </section>
  </div>;
}
