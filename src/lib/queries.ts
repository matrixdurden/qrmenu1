import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import {
  adminAuditLogs,
  adminSiteAccess,
  adminUsers,
  businessHours,
  categories,
  productCategories,
  products,
  siteSections,
  sites,
} from "@/db/schema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getProductCategoryLinks(productIds: string[]) {
  if (!productIds.length) return [];
  return db.select().from(productCategories).where(inArray(productCategories.productId, productIds));
}

export async function getAdminSitesForUser(user: { id: string; role: string }) {
  if (user.role === "owner") return db.select().from(sites).orderBy(asc(sites.createdAt));
  return db
    .select({
      id: sites.id,
      name: sites.name,
      slug: sites.slug,
      subtitle: sites.subtitle,
      coverUrl: sites.coverUrl,
      logoUrl: sites.logoUrl,
      customDomain: sites.customDomain,
      currency: sites.currency,
      locale: sites.locale,
      locales: sites.locales,
      translations: sites.translations,
      timezone: sites.timezone,
      wifiName: sites.wifiName,
      wifiPassword: sites.wifiPassword,
      footerText: sites.footerText,
      phone: sites.phone,
      address: sites.address,
      instagram: sites.instagram,
      whatsapp: sites.whatsapp,
      facebook: sites.facebook,
      tiktok: sites.tiktok,
      website: sites.website,
      isActive: sites.isActive,
      theme: sites.theme,
      createdAt: sites.createdAt,
      updatedAt: sites.updatedAt,
    })
    .from(adminSiteAccess)
    .innerJoin(sites, eq(adminSiteAccess.siteId, sites.id))
    .where(eq(adminSiteAccess.userId, user.id))
    .orderBy(asc(sites.createdAt));
}

export async function getAdminSite(siteId: string) {
  if (!UUID_PATTERN.test(siteId)) return null;
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) return null;

  const [siteCategories, siteProducts, hours, sections] = await Promise.all([
    db.select().from(categories).where(eq(categories.siteId, siteId)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(products).where(eq(products.siteId, siteId)).orderBy(asc(products.sortOrder), asc(products.name)),
    db.select().from(businessHours).where(eq(businessHours.siteId, siteId)).orderBy(asc(businessHours.dayOfWeek)),
    db.select().from(siteSections).where(eq(siteSections.siteId, siteId)).orderBy(asc(siteSections.sortOrder)),
  ]);
  const links = await getProductCategoryLinks(siteProducts.map((product) => product.id));
  return { site, categories: siteCategories, products: siteProducts, productCategories: links, hours, sections };
}

export async function getAdminProductsPage(siteId: string, options?: { query?: string; page?: number; pageSize?: number }) {
  const query = options?.query?.trim() ?? "";
  const pageSize = Math.min(100, Math.max(10, options?.pageSize ?? 40));
  const page = Math.max(1, options?.page ?? 1);
  const search = query ? or(ilike(products.name, `%${query}%`), ilike(products.description, `%${query}%`), ilike(products.badge, `%${query}%`)) : undefined;
  const where = search ? and(eq(products.siteId, siteId), search) : eq(products.siteId, siteId);
  const [[total], rows] = await Promise.all([
    db.select({ value: count() }).from(products).where(where),
    db.select().from(products).where(where).orderBy(asc(products.sortOrder), asc(products.name)).limit(pageSize).offset((page - 1) * pageSize),
  ]);
  const links = await getProductCategoryLinks(rows.map((row) => row.id));
  return { products: rows, productCategories: links, total: Number(total.value), page, pageSize, query };
}

export async function getAdminUsersWithAccess() {
  const [users, access] = await Promise.all([
    db.select({ id: adminUsers.id, email: adminUsers.email, role: adminUsers.role, lastLoginAt: adminUsers.lastLoginAt, createdAt: adminUsers.createdAt }).from(adminUsers).orderBy(asc(adminUsers.createdAt)),
    db.select().from(adminSiteAccess),
  ]);
  return users.map((user) => ({ ...user, siteIds: access.filter((row) => row.userId === user.id).map((row) => row.siteId) }));
}

export async function getAuditLogs(options?: { siteId?: string; limit?: number }) {
  const limit = Math.min(200, Math.max(10, options?.limit ?? 100));
  const rows = options?.siteId
    ? await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.siteId, options.siteId)).orderBy(desc(adminAuditLogs.createdAt)).limit(limit)
    : await db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit);
  const userIds = [...new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id)))];
  const users = userIds.length ? await db.select({ id: adminUsers.id, email: adminUsers.email }).from(adminUsers).where(inArray(adminUsers.id, userIds)) : [];
  const emails = new Map(users.map((user) => [user.id, user.email]));
  return rows.map((row) => ({ ...row, email: row.userId ? emails.get(row.userId) ?? null : null }));
}

async function loadPublicMenu(site: typeof sites.$inferSelect) {
  const [siteCategories, siteProducts, hours, sections] = await Promise.all([
    db.select().from(categories).where(and(eq(categories.siteId, site.id), eq(categories.isActive, true))).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(products).where(and(eq(products.siteId, site.id), eq(products.isActive, true))).orderBy(asc(products.sortOrder), asc(products.name)),
    db.select().from(businessHours).where(eq(businessHours.siteId, site.id)).orderBy(asc(businessHours.dayOfWeek)),
    db.select().from(siteSections).where(and(eq(siteSections.siteId, site.id), eq(siteSections.isVisible, true))).orderBy(asc(siteSections.sortOrder)),
  ]);
  const links = await getProductCategoryLinks(siteProducts.map((product) => product.id));
  const categoryIds = new Set(siteCategories.map((category) => category.id));
  return {
    site,
    categories: siteCategories,
    products: siteProducts,
    productCategories: links.filter((link) => categoryIds.has(link.categoryId)),
    hours,
    sections,
  };
}

export async function getMenuBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;
  return unstable_cache(
    async () => {
      const [site] = await db.select().from(sites).where(eq(sites.slug, normalizedSlug)).limit(1);
      if (!site || !site.isActive) return null;
      return loadPublicMenu(site);
    },
    ["public-menu-slug", normalizedSlug],
    { revalidate: 3600, tags: [`menu-slug:${normalizedSlug}`] },
  )();
}

export async function getMenuBySiteId(siteId: string) {
  if (!UUID_PATTERN.test(siteId)) return null;
  return unstable_cache(
    async () => {
      const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
      if (!site || !site.isActive) return null;
      return loadPublicMenu(site);
    },
    ["public-menu-site", siteId],
    { revalidate: 3600, tags: [`menu-site:${siteId}`] },
  )();
}

export async function getMenuByDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().split(":")[0];
  if (!normalized) return null;
  return unstable_cache(
    async () => {
      const [site] = await db.select().from(sites).where(eq(sites.customDomain, normalized)).limit(1);
      if (!site || !site.isActive) return null;
      return loadPublicMenu(site);
    },
    ["public-menu-domain", normalized],
    { revalidate: 3600, tags: [`menu-domain:${normalized}`] },
  )();
}
