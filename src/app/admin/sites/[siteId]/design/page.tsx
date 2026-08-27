import { notFound } from "next/navigation";
import { updateSiteDesign } from "@/app/admin/site-actions";
import { requireSiteAdmin } from "@/lib/auth";
import { getAdminSite } from "@/lib/queries";

export default async function DesignPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAdmin(siteId);
  const data = await getAdminSite(siteId);
  if (!data) notFound();
  const { site } = data;
  const terms = site.theme.terminology ?? {};

  return <div className="admin-page-grid">
    <section className="panel">
      <div className="admin-subhead"><div><span className="eyebrow">TASARIM</span><h2>Görünüm ve terminoloji</h2></div></div>
      <form action={updateSiteDesign} className="stack-form two-cols">
        <input type="hidden" name="siteId" value={site.id} />
        <label className="full">Wallpaper URL<input name="coverUrl" defaultValue={site.coverUrl ?? ""} /></label>
        <label className="full">Wallpaper yükle<input type="file" name="coverFile" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" /></label>
        <label className="full">Logo URL<input name="logoUrl" defaultValue={site.logoUrl ?? ""} /></label>
        <label className="full">Logo yükle<input type="file" name="logoFile" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" /></label>
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
        <label>Font<select name="fontFamily" defaultValue={site.theme.fontFamily ?? "system"}><option value="system">Modern / System</option><option value="rounded">Rounded</option><option value="serif">Serif</option></select></label>
        <label>Menü başlığı<input name="menuTitle" defaultValue={terms.menuTitle ?? ""} placeholder="MENU / KATALOG / HİZMETLER" /></label>
        <label>Ürün kelimesi<input name="productsLabel" defaultValue={terms.productsLabel ?? ""} placeholder="ürün / hizmet / seçenek" /></label>
        <label>Tükendi etiketi<input name="soldOutLabel" defaultValue={terms.soldOutLabel ?? ""} /></label>
        <label>İçindekiler etiketi<input name="ingredientsLabel" defaultValue={terms.ingredientsLabel ?? ""} /></label>
        <label>Alerjenler etiketi<input name="allergensLabel" defaultValue={terms.allergensLabel ?? ""} /></label>
        <label>Arama placeholder<input name="searchPlaceholder" defaultValue={terms.searchPlaceholder ?? ""} /></label>
        <label className="check"><input type="checkbox" name="showFavorites" defaultChecked={site.theme.showFavorites ?? true} /> Favorileri göster</label>
        <label className="check"><input type="checkbox" name="showLanguage" defaultChecked={site.theme.showLanguage ?? true} /> Dil seçiciyi göster</label>
        <label className="check"><input type="checkbox" name="showHoursBadge" defaultChecked={site.theme.showHoursBadge ?? true} /> Saat rozetini göster</label>
        <button className="button primary full" type="submit">Tasarımı kaydet</button>
      </form>
    </section>
    <aside className="admin-side"><div className="preview-label">CANLI ÖNİZLEME</div><div className="compact-preview"><iframe title="Canlı önizleme" src={`/m/${site.id}`} /></div></aside>
  </div>;
}
