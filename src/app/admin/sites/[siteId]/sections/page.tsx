import { notFound } from "next/navigation";
import { createSection, deleteSection, updateSection } from "@/app/admin/site-actions";
import { getAdminSiteSections } from "@/lib/admin-queries";
import { requireSiteAdmin } from "@/lib/auth";
import { parseSectionConfig, SECTION_LABELS, SECTION_TYPES } from "@/lib/sections";

export default async function SectionsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAdmin(siteId);
  const data = await getAdminSiteSections(siteId);
  if (!data) notFound();
  const { site, sections } = data;

  return <div className="admin-page-grid">
    <div className="admin-page-main">
      <section className="panel">
        <div className="admin-subhead"><div><span className="eyebrow">YENİ BLOK</span><h2>Sayfaya blok ekle</h2></div><span className="count">{sections.length}</span></div>
        <form action={createSection} className="stack-form two-cols">
          <input type="hidden" name="siteId" value={siteId} />
          <label>Blok tipi<select name="type" defaultValue="custom-text">{SECTION_TYPES.map((type) => <option value={type} key={type}>{SECTION_LABELS[type]}</option>)}</select></label>
          <label>Panel etiketi<input name="label" placeholder="Örn. Spa duyurusu" /></label>
          <label>Sıra<input name="sortOrder" type="number" defaultValue={sections.length} /></label>
          <button className="button primary" type="submit">Blok ekle</button>
        </form>
      </section>
      <section className="panel">
        <div className="admin-subhead"><div><span className="eyebrow">SAYFA DÜZENİ</span><h2>Bloklar</h2></div></div>
        <p className="admin-help">Aynı tipten birden fazla blok ekleyebilirsiniz. Galeri ve bağlantı öğeleri JSON liste olarak tutulur; bu bölüm generic olduğu için restoran, otel, spa veya katalog senaryosunda aynı motor çalışır.</p>
        <div className="section-list">
          {sections.map((section) => {
            const config = parseSectionConfig(section.config);
            return <details className="section-card" key={section.id}>
              <summary><div><strong>{section.label}</strong><br /><small>{section.type} · sıra {section.sortOrder} · {section.isVisible ? "görünür" : "gizli"}</small></div><span>⌄</span></summary>
              <form action={updateSection} className="stack-form two-cols" style={{ marginTop: 16 }}>
                <input type="hidden" name="siteId" value={siteId} /><input type="hidden" name="sectionId" value={section.id} />
                <label>Panel etiketi<input name="label" defaultValue={section.label} /></label>
                <label>Sıra<input name="sortOrder" type="number" defaultValue={section.sortOrder} /></label>
                <label>Eyebrow<input name="eyebrow" defaultValue={config.eyebrow ?? ""} /></label>
                <label>Başlık<input name="title" defaultValue={config.title ?? ""} /></label>
                <label className="full">Metin<textarea name="body" rows={4} defaultValue={config.body ?? ""} /></label>
                <label>CTA etiketi<input name="ctaLabel" defaultValue={config.ctaLabel ?? ""} /></label>
                <label>CTA URL<input name="ctaUrl" defaultValue={config.ctaUrl ?? ""} /></label>
                <label>Kapak/görsel URL<input name="imageUrl" defaultValue={config.imageUrl ?? ""} /></label>
                <label>Düzen<select name="layout" defaultValue={config.layout ?? "grid"}><option value="grid">Grid</option><option value="list">Liste</option><option value="carousel">Carousel</option></select></label>
                <label className="full">Öğeler JSON<textarea name="itemsJson" rows={7} defaultValue={JSON.stringify(config.items ?? [], null, 2)} /><span className="json-help">Örnek: [{`{"title":"Havuz","imageUrl":"https://...","url":"/spa"}`}]</span></label>
                {site.locales.filter((locale) => locale !== site.locale).map((locale) => {
                  const tr = config.translations?.[locale] ?? {};
                  return <div className="translation-grid full" key={locale}><h4>{locale} çevirisi</h4><label>Eyebrow<input name={`tr:${locale}:eyebrow`} defaultValue={tr.eyebrow ?? ""} /></label><label>Başlık<input name={`tr:${locale}:title`} defaultValue={tr.title ?? ""} /></label><label>Metin<textarea name={`tr:${locale}:body`} rows={3} defaultValue={tr.body ?? ""} /></label><label>CTA etiketi<input name={`tr:${locale}:ctaLabel`} defaultValue={tr.ctaLabel ?? ""} /></label><label>CTA URL<input name={`tr:${locale}:ctaUrl`} defaultValue={tr.ctaUrl ?? ""} /></label><label>Görsel URL<input name={`tr:${locale}:imageUrl`} defaultValue={tr.imageUrl ?? ""} /></label><label>Öğeler JSON<textarea name={`tr:${locale}:itemsJson`} rows={5} defaultValue={tr.items?.length ? JSON.stringify(tr.items, null, 2) : ""} /></label></div>;
                })}
                <label className="check"><input type="checkbox" name="isVisible" defaultChecked={section.isVisible} /> Görünür</label>
                <button className="button primary" type="submit">Bloğu kaydet</button>
              </form>
              <form action={deleteSection} className="admin-actions-row" style={{ marginTop: 10 }}><input type="hidden" name="siteId" value={siteId} /><input type="hidden" name="sectionId" value={section.id} /><button className="button danger" type="submit">Bloğu sil</button></form>
            </details>;
          })}
        </div>
      </section>
    </div>
    <aside className="admin-side"><div className="preview-label">CANLI ÖNİZLEME</div><div className="compact-preview"><iframe title="Canlı önizleme" src={`/m/${site.id}`} /></div></aside>
  </div>;
}
