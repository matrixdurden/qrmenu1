import { notFound } from "next/navigation";
import { getMenuBySiteId } from "@/lib/queries";
import MenuClient from "../../menu/[slug]/menu-client";

export default async function StableMenuPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const data = await getMenuBySiteId(siteId);
  if (!data) notFound();
  return <MenuClient data={data} />;
}
