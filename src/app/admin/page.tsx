import Link from "next/link";
import { createSite } from "@/app/admin/site-actions";
import { logoutAdmin } from "@/app/admin/auth-actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminSitesForUser } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const sites = await getAdminSitesForUser(admin);
  return <main className="admin-shell">
    <header className="admin-topbar"><div><span className="eyebrow">QR MENU STUDIO</span><h1>Siteler</h1><p>{admin.role === "owner" ? "Tüm siteleri ve kullanıcıları yönetin." : "Size yetki verilen siteleri yönetin."}</p></div><div className="top-actions"><span className="status-pill">{admin.email} · {admin.role}</span>{admin.role === "owner" ? <Link className="button ghost" href="/admin/users">Kullanıcılar</Link> : null}<form action={logoutAdmin}><button className="button ghost" type="submit">Çıkış</button></form></div></header>
    <section className="admin-grid">
      {admin.role === "owner" ? <div className="panel"><div className="panel-head"><div><span className="eyebrow">YENİ</span><h2>Site oluştur</h2></div></div><form action={createSite} className="stack-form"><label>Site adı<input name="name" placeholder="MIRA" required /></label><label>Slug<input name="slug" placeholder="mira" /></label><button className="button primary" type="submit">Siteyi oluştur</button></form></div> : <div className="panel"><div className="panel-head"><h2>Manager hesabı</h2></div><p className="admin-help">Yeni site oluşturma ve kullanıcı yönetimi owner hesabına aittir. Burada yalnızca size atanan siteler görünür.</p></div>}
      <div className="panel wide"><div className="panel-head"><div><span className="eyebrow">YÖNETİM</span><h2>Mevcut siteler</h2></div><span className="count">{sites.length}</span></div><div className="site-list">{sites.length ? sites.map((site) => <Link key={site.id} href={`/admin/sites/${site.id}/general`} className="site-row"><div className="site-avatar">{site.name.slice(0, 2).toUpperCase()}</div><div className="site-copy"><strong>{site.name}</strong><span>{site.customDomain || `/menu/${site.slug}`}</span></div><span className={site.isActive ? "dot active" : "dot"} /><span className="row-arrow">→</span></Link>) : <div className="empty-state admin-empty">Erişebileceğiniz site bulunmuyor.</div>}</div></div>
    </section>
  </main>;
}
