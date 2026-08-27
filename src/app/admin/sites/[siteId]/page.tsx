import { redirect } from "next/navigation";

export default async function SiteEditorIndex({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  redirect(`/admin/sites/${siteId}/general`);
}
