import { and, asc, eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { businessHours, categories, productCategories, products, siteSections, sites } from "@/db/schema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getProductCategoryLinks(productIds: string[]) {
  if (!productIds.length) return [];
  return db
    .select()
    .from(productCategories)
    .where(inArray(productCategories.productId, productIds));
}

export async function getAdminSites() {
  return db.select().from(sites).orderBy(asc(sites.createdAt));
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

async function loadPublicMenu(site: typeof sites.$inferSelect) {
  const [siteCategories, siteProducts, hours, sections] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(and(eq(categories.siteId, site.id), eq(categories.isActive, true)))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select()
      .from(products)
      .where(and(eq(products.siteId, site.id), eq(products.isActive, true)))
      .orderBy(asc(products.sortOrder), asc(products.name)),
    db.select().from(businessHours).where(eq(businessHours.siteId, site.id)).orderBy(asc(businessHours.dayOfWeek)),
    db
      .select()
      .from(siteSections)
      .where(and(eq(siteSections.siteId, site.id), eq(siteSections.isVisible, true)))
      .orderBy(asc(siteSections.sortOrder)),
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
