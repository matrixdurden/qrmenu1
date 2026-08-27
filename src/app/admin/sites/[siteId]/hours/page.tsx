import { notFound } from "next/navigation";
import { updateBusinessHours } from "@/app/admin/site-actions";
import { requireSiteAdmin } from "@/lib/auth";
import { getAdminSite } from "@/lib/queries";

const days = [
  { id: 1, name: "Pazartesi" }, { id: 2, name: "Salı" }, { id: 3, name: "Çarşamba" },
  { id: 4, name: "Perşembe" }, { id: 5, name: "Cuma" }, { id: 6, name: "Cumartesi" }, { id: 0, name: "Pazar" },
];

export default async function HoursPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAdmin(siteId);
  const data = await getAdminSite(siteId);
  if (!data) notFound();
  return <section className="panel">
    <div className="admin-subhead"><div><span className="eyebrow">ÇALIŞMA SAATLERİ</span><h2>Haftalık program</h2></div><span className="status-pill">{data.site.timezone}</span></div>
    <form action={updateBusinessHours} className="hours-form">
      <input type="hidden" name="siteId" value={siteId} />
      {days.map((day) => {
        const row = data.hours.find((item) => item.dayOfWeek === day.id);
        return <div className="hours-row" key={day.id}><strong>{day.name}</strong><input type="time" name={`open-${day.id}`} defaultValue={row?.openTime ?? "08:00"} /><span>—</span><input type="time" name={`close-${day.id}`} defaultValue={row?.closeTime ?? "00:00"} /><label className="check"><input type="checkbox" name={`closed-${day.id}`} defaultChecked={row?.isClosed} /> Kapalı</label></div>;
      })}
      <button className="button primary" type="submit">Saatleri kaydet</button>
    </form>
  </section>;
}
