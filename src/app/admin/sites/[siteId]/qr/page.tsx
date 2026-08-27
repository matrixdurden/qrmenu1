/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { requireSiteAdmin } from "@/lib/auth";
import { getAdminSiteBasics } from "@/lib/admin-queries";

export default async function QrPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAdmin(siteId);
  const data = await getAdminSiteBasics(siteId);
  if (!data) notFound();
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const permanentUrl = `${base}/m/${siteId}`;
  return <div className="admin-page-grid"><section className="panel"><div className="admin-subhead"><div><span className="eyebrow">QR KOD</span><h2>{data.site.name}</h2></div></div><div style={{ display: "grid", placeItems: "center", gap: 16, padding: 20 }}><img className="qr-image" src={`/api/qr/${siteId}`} alt={`${data.site.name} QR`} style={{ width: 320, maxWidth: "100%" }} /><code style={{ maxWidth: "100%", overflowWrap: "anywhere" }}>{permanentUrl}</code><a className="button primary" href={`/api/qr/${siteId}?download=1`}>SVG indir</a></div></section><aside className="admin-side"><section className="panel"><h3>Kalıcı hedef</h3><p className="admin-help">QR, slug yerine değişmeyen site kimliğine gider. Menü adı, slug veya özel domain değişebilir; basılı QR aynı kalır.</p></section>{data.site.customDomain ? <section className="panel"><h3>Özel domain</h3><p className="site-domain">https://{data.site.customDomain}</p><p className="admin-help">Domain günlük kullanım için güzel URL’dir; QR’ın ana hedefi yine platformun kalıcı adresidir.</p></section> : null}</aside></div>;
}
