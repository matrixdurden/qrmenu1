import { notFound } from "next/navigation";
import { deleteSite, updateSiteGeneral } from "@/app/admin/site-actions";
import { requireSiteAdmin } from "@/lib/auth";
import { getAdminSite } from "@/lib/queries";

export default async function GeneralPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const admin = await requireSiteAdmin(siteId);
  const data = await getAdminSite(siteId);
  if (!data) notFound();
  const { site } = data;
  const alternateLocales = site.locales.filter((locale) => locale !== site.locale);

  return <div className="admin-page-grid">
    <div className="admin-page-main">
      <section className="panel">
        <div className="admin-subhead"><div><span className="eyebrow">GENEL</span><h2>Site ayarları</h2></div><span className={site.isActive ? "status-pill success" : "status-pill"}>{site.isActive ? "Yayında" : "Pasif"}</span></div>
        <form action={updateSiteGeneral} className="stack-form two-cols">
          <input type="hidden" name="siteId" value={site.id} />
          <label>İşletme adı<input name="name" defaultValue={site.name} required /></label>
          <label>Slug<input name="slug" defaultValue={site.slug} required /></label>
          <label className="full">Alt başlık<input name="subtitle" defaultValue={site.subtitle} /></label>
          <label>Özel domain<input name="customDomain" defaultValue={site.customDomain ?? ""} placeholder="menu.ornek.com" /></label>
          <label>Para birimi<input name="currency" defaultValue={site.currency} /></label>
          <label>Varsayılan dil<input name="locale" defaultValue={site.locale} placeholder="tr-TR" /></label>
          <label>Desteklenen diller<input name="locales" defaultValue={site.locales.join(", ")} placeholder="tr-TR, en-US" /><small>Virgülle ayırın. En fazla 6 dil.</small></label>
          <label>Saat dilimi<select name="timezone" defaultValue={site.timezone}><option>Europe/Istanbul</option><option>Europe/London</option><option>Europe/Berlin</option><option>Asia/Dubai</option><option>America/New_York</option></select></label>
          <label>Wi-Fi adı<input name="wifiName" defaultValue={site.wifiName ?? ""} /></label>
          <label>Wi-Fi şifresi<input name="wifiPassword" defaultValue={site.wifiPassword ?? ""} /></label>
          <label>Telefon<input name="phone" defaultValue={site.phone ?? ""} /></label>
          <label>WhatsApp<input name="whatsapp" defaultValue={site.whatsapp ?? ""} /></label>
          <label>Instagram<input name="instagram" defaultValue={site.instagram ?? ""} /></label>
          <label>Facebook<input name="facebook" defaultValue={site.facebook ?? ""} /></label>
          <label>TikTok<input name="tiktok" defaultValue={site.tiktok ?? ""} /></label>
          <label>Web sitesi<input name="website" defaultValue={site.website ?? ""} /></label>
          <label className="full">Adres<input name="address" defaultValue={site.address ?? ""} /></label>
          <label className="full">Footer<input name="footerText" defaultValue={site.footerText ?? ""} /></label>
          {alternateLocales.map((locale) => {
            const tr = site.translations?.[locale] ?? {};
            return <div className="translation-grid full" key={locale}><h4>{locale} çevirisi</h4><label>İşletme adı<input name={`tr:${locale}:name`} defaultValue={tr.name ?? ""} /></label><label>Alt başlık<input name={`tr:${locale}:subtitle`} defaultValue={tr.subtitle ?? ""} /></label><label>Footer<input name={`tr:${locale}:footerText`} defaultValue={tr.footerText ?? ""} /></label></div>;
          })}
          <label className="check"><input type="checkbox" name="isActive" defaultChecked={site.isActive} /> Site aktif</label>
          <button className="button primary full" type="submit">Genel ayarları kaydet</button>
        </form>
      </section>
      {admin.role === "owner" ? <section className="panel"><div className="admin-subhead"><div><span className="eyebrow danger-text">TEHLİKELİ ALAN</span><h2>Siteyi sil</h2></div></div><form action={deleteSite} className="stack-form"><input type="hidden" name="siteId" value={site.id} /><label>Onaylamak için <b>{site.slug}</b> yazın<input name="confirmSlug" required autoComplete="off" /></label><button className="button danger" type="submit">Siteyi kalıcı sil</button></form></section> : null}
    </div>
    <aside className="admin-side"><section className="panel"><div className="eyebrow">KALICI ADRES</div><p className="site-domain">/m/{site.id}</p><p className="admin-help">QR kodu bu değişmeyen adrese gider. Slug veya özel domain değişse bile basılmış QR bozulmaz.</p></section>{site.customDomain ? <section className="panel"><div className="eyebrow">ÖZEL DOMAIN</div><p className="site-domain">https://{site.customDomain}</p><p className="admin-help">DNS/proxy bu uygulamaya yönlendirildiğinde domain kökü doğrudan menüyü açar.</p></section> : null}</aside>
  </div>;
}
