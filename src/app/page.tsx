import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMenuByDomain } from "@/lib/queries";
import MenuClient from "@/app/menu/[slug]/menu-client";

export default async function Home() {
  const store = await headers();
  const host = store.get("x-forwarded-host") || store.get("host") || "";
  const data = host ? await getMenuByDomain(host) : null;
  if (data) return <MenuClient data={data} />;
  redirect("/admin");
}
