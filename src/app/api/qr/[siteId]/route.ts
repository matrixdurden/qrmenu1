import { eq } from "drizzle-orm";
import { toString } from "qrcode";
import { db } from "@/db";
import { sites } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const [site] = await db.select({ name: sites.name, slug: sites.slug }).from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) return new Response("QR menu not found", { status: 404 });

  const requestUrl = new URL(request.url);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/$/, "");
  const menuUrl = `${baseUrl}/menu/${site.slug}`;
  const svg = await toString(menuUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 480,
    color: { dark: "#163c2a", light: "#ffffff" },
  });
  const download = requestUrl.searchParams.get("download") === "1";
  const safeName = site.slug.replace(/[^a-z0-9-]/g, "") || "qr-menu";

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
      ...(download ? { "Content-Disposition": `attachment; filename="${safeName}-qr.svg"` } : {}),
    },
  });
}
