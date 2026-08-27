import { requireSiteAdmin } from "@/lib/auth";
import { getAuditLogs } from "@/lib/queries";

export default async function AuditPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAdmin(siteId);
  const rows = await getAuditLogs({ siteId, limit: 150 });
  return <section className="panel"><div className="admin-subhead"><div><span className="eyebrow">AUDIT LOG</span><h2>Değişiklik geçmişi</h2></div><span className="count">{rows.length}</span></div><p className="admin-help">Kim, ne zaman, hangi site nesnesini değiştirdi. Bu kayıtlar uygulama hatalarını ve yanlış değişiklikleri geriye doğru izlemek için tutulur.</p><div style={{ overflowX: "auto" }}><table className="audit-table"><thead><tr><th>Zaman</th><th>Kullanıcı</th><th>İşlem</th><th>Nesne</th><th>Detay</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.createdAt.toLocaleString("tr-TR")}</td><td>{row.email || "sistem"}</td><td><strong>{row.action}</strong></td><td>{row.entityType || "-"}<br /><small>{row.entityId || ""}</small></td><td><div className="audit-meta">{Object.keys(row.metadata).length ? JSON.stringify(row.metadata, null, 2) : "-"}</div></td></tr>)}</tbody></table></div></section>;
}
