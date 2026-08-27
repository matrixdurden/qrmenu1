import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { businessHours, categories, productCategories, products, siteSections, sites } from "@/db/schema";

export async function getAdminSites() {
  return db.select().from(sites).orderBy(asc(sites.createdAt));
}

export async function getAdminSite(siteId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) return null;

  const [siteCategories, siteProducts, links, hours, sections] = await Promise.all([
    db.select().from(categories).where(eq(categories.siteId, siteId)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(products).where(eq(products.siteId, siteId)).orderBy(asc(products.sortOrder), asc(products.name)),
    db.select().from(productCategories),
    db.select().from(businessHours).where(eq(businessHours.siteId, siteId)).orderBy(asc(businessHours.dayOfWeek)),
    db.select().from(siteSections).where(eq(siteSections.siteId, siteId)).orderBy(asc(siteSections.sortOrder)),
  ]);

  const productIds = new Set(siteProducts.map((product) => product.id));
  return { site, categories: siteCategories, products: siteProducts, productCategories: links.filter((link) => productIds.has(link.productId)), hours, sections };
}

export async function getMenuBySlug(slug: string) {
  const [site] = await db.select().from(sites).where(eq(sites.slug, slug)).limit(1);
  if (!site || !site.isActive) return null;

  const [siteCategories, siteProducts, links, hours, sections] = await Promise.all([
    db.select().from(categories).where(eq(categories.siteId, site.id)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(products).where(eq(products.siteId, site.id)).orderBy(asc(products.sortOrder), asc(products.name)),
    db.select().from(productCategories),
    db.select().from(businessHours).where(eq(businessHours.siteId, site.id)).orderBy(asc(businessHours.dayOfWeek)),
    db.select().from(siteSections).where(eq(siteSections.siteId, site.id)).orderBy(asc(siteSections.sortOrder)),
  ]);

  const activeCategories = siteCategories.filter((category) => category.isActive);
  const activeProducts = siteProducts.filter((product) => product.isActive);
  const productIds = new Set(activeProducts.map((product) => product.id));
  const categoryIds = new Set(activeCategories.map((category) => category.id));

  return {
    site,
    categories: activeCategories,
    products: activeProducts,
    productCategories: links.filter((link) => productIds.has(link.productId) && categoryIds.has(link.categoryId)),
    hours,
    sections: sections.filter((section) => section.isVisible),
  };
}
