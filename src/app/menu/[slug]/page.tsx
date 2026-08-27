import { notFound } from "next/navigation";
import { getMenuBySlug } from "@/lib/queries";
import MenuClient from "./menu-client";

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getMenuBySlug(slug);
  if (!data) notFound();
  return <MenuClient data={data} />;
}
