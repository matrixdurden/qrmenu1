import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MenuClient from "@/app/menu/[slug]/menu-client";
import { getMenuForHost } from "@/lib/domains";

export default async function Home() {
  const store = await headers();
  const host = store.get("x-forwarded-host") || store.get("host") || "";
  const data = host ? await getMenuForHost(host) : null;
  if (data) return <MenuClient data={data} />;
  redirect("/admin");
}
