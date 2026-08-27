import Link from "next/link";
import { notFound } from "next/navigation";
import { logoutAdmin } from "@/app/admin/auth-actions";
import { getAdminSiteBasics } from "@/lib/admin-queries";
import { requireSiteAdmin } from "@/lib/auth";

const tabs = [
  ["general", "Genel"], ["design", "Tasarım"], ["hours", "Saatler"], ["sections", "Bloklar"],
  ["categories", "Kategoriler"], ["products", "Ürünler"], ["qr", "QR"], ["audit", "Geçmiş"],
] as const;

export default async function SiteAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const admin = await requireSiteAdmin(siteId);
  const data = await getAdminSiteBasics(siteId);
  if (!data) notFound();
  return <div className="site-admin-layout"><header className="site-admin-header"><div className="site-admin-title"><Link href="/admin">←</Link><div><h1>{data.site.name}</h1><span>{data.site.customDomain || `/menu/${data.site.slug}`} · {data.site.isActive ? "Yayında" : "Pasif"}</span></div></div><div className="admin-actions-row"><span className="status-pill">{admin.email}</span><Link className="button ghost" href={`/m/${siteId}`} target="_blank">Menüyü aç ↗</Link><form action={logoutAdmin}><button className="button ghost" type="submit">Çıkış</button></form></div></header><nav className="site-admin-tabs">{tabs.map(([path, label]) => <Link href={`/admin/sites/${siteId}/${path}`} key={path}>{label}</Link>)}</nav><main className="site-admin-content">{children}</main></div>;
}
