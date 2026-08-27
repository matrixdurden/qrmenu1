import Link from "next/link";
import { createSite } from "@/app/actions";
import { logoutAdmin } from "@/app/admin/auth-actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminSites } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [admin, sites] = await Promise.all([requireAdmin(), getAdminSites()]);
  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div><span className="eyebrow">QR MENU STUDIO</span><h1>Siteler</h1><p>Tek panelden birden fazla QR menü yönet.</p></div>
        <div className="top-actions">
          <span className="status-pill">{admin.email}</span>
          <form action={logoutAdmin}><button className="button ghost" type="submit">Çıkış</button></form>
        </div>
      </header>
      <section className="admin-grid">
        <div className="panel">
          <div className="panel-head"><div><span className="eyebrow">YENİ</span><h2>Site oluştur</h2></div></div>
          <form action={createSite} className="stack-form">
            <label>Site adı<input name="name" placeholder="MIRA" required /></label>
            <label>Slug<input name="slug" placeholder="mira" /></label>
            <button className="button primary" type="submit">Siteyi oluştur</button>
          </form>
        </div>
        <div className="panel wide">
          <div className="panel-head"><div><span className="eyebrow">YÖNETİM</span><h2>Mevcut siteler</h2></div><span className="count">{sites.length}</span></div>
          <div className="site-list">
            {sites.length ? sites.map((site) => (
              <Link key={site.id} href={`/admin/sites/${site.id}`} className="site-row">
                <div className="site-avatar">{site.name.slice(0, 2).toUpperCase()}</div>
                <div className="site-copy"><strong>{site.name}</strong><span>/menu/{site.slug}</span></div>
                <span className={site.isActive ? "dot active" : "dot"} />
                <span className="row-arrow">→</span>
              </Link>
            )) : <div className="empty-state admin-empty">Henüz site yok. İlk QR menünüzü oluşturun.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}
