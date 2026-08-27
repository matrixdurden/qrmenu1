"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  businessHours,
  categories,
  productCategories,
  products,
  sites,
  siteSections,
  type LocalizedCategoryCopy,
  type LocalizedProductCopy,
  type LocalizedSiteCopy,
  type SiteTheme,
} from "@/db/schema";
import { auditAdmin } from "@/lib/audit";
import { normalizeLocales } from "@/lib/i18n";
import { requireOwner, requireSiteAdmin } from "@/lib/auth";
import { defaultSectionConfig, isSectionType, parseSectionConfig } from "@/lib/sections";
import { slugify } from "@/lib/slugify";
import { deleteLocalUpload, deleteSiteUploads, saveImageUpload } from "@/lib/uploads";

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const nullable = (value: FormDataEntryValue | null) => text(value) || null;
const checked = (value: FormDataEntryValue | null) => value === "on" || value === "true";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

const siteCreateSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
});

function moneyToKurus(value: FormDataEntryValue | null, required = true) {
  const raw = text(value).replace(",", ".");
  if (!raw && !required) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Geçerli bir fiyat girin.");
  return Math.round(amount * 100);
}

function numeric(value: FormDataEntryValue | null, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function jsonArray(value: FormDataEntryValue | null) {
  const raw = text(value);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Liste JSON biçiminde olmalı.");
  return parsed;
}

function normalizeCustomDomain(value: FormDataEntryValue | null) {
  const domain = text(value).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0];
  if (!domain) return null;
  if (!domainPattern.test(domain)) throw new Error("Özel domain geçersiz.");
  return domain;
}

async function uniqueSiteSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "site";
  for (let suffix = 1; suffix < 1000; suffix++) {
    const candidate = suffix === 1 ? root : `${root}-${suffix}`;
    const condition = excludeId ? and(eq(sites.slug, candidate), ne(sites.id, excludeId)) : eq(sites.slug, candidate);
    const [existing] = await db.select({ id: sites.id }).from(sites).where(condition).limit(1);
    if (!existing) return candidate;
  }
  throw new Error("Benzersiz site adresi üretilemedi.");
}

async function uniqueCategorySlug(siteId: string, base: string, excludeId?: string) {
  const root = slugify(base) || "kategori";
  for (let suffix = 1; suffix < 1000; suffix++) {
    const candidate = suffix === 1 ? root : `${root}-${suffix}`;
    const condition = excludeId
      ? and(eq(categories.siteId, siteId), eq(categories.slug, candidate), ne(categories.id, excludeId))
      : and(eq(categories.siteId, siteId), eq(categories.slug, candidate));
    const [existing] = await db.select({ id: categories.id }).from(categories).where(condition).limit(1);
    if (!existing) return candidate;
  }
  throw new Error("Benzersiz kategori adresi üretilemedi.");
}

async function uniqueProductSlug(siteId: string, base: string, excludeId?: string) {
  const root = slugify(base) || "urun";
  for (let suffix = 1; suffix < 1000; suffix++) {
    const candidate = suffix === 1 ? root : `${root}-${suffix}`;
    const condition = excludeId
      ? and(eq(products.siteId, siteId), eq(products.slug, candidate), ne(products.id, excludeId))
      : and(eq(products.siteId, siteId), eq(products.slug, candidate));
    const [existing] = await db.select({ id: products.id }).from(products).where(condition).limit(1);
    if (!existing) return candidate;
  }
  throw new Error("Benzersiz ürün adresi üretilemedi.");
}

async function getSite(siteId: string) {
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
  if (!site) throw new Error("Site bulunamadı.");
  return site;
}

function revalidateSite(siteId: string, slug: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/sites/${siteId}`);
  revalidatePath(`/menu/${slug}`);
  revalidatePath(`/m/${siteId}`);
  updateTag(`menu-site:${siteId}`);
  updateTag(`menu-slug:${slug}`);
}

function translationsFromForm<T extends Record<string, string | undefined>>(
  formData: FormData,
  locales: string[],
  defaultLocale: string,
  fields: readonly (keyof T & string)[],
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const locale of locales) {
    if (locale === defaultLocale) continue;
    const row: Record<string, string> = {};
    for (const field of fields) {
      const value = text(formData.get(`tr:${locale}:${field}`));
      if (value) row[field] = value;
    }
    if (Object.keys(row).length) result[locale] = row as T;
  }
  return result;
}

export async function createSite(formData: FormData) {
  const admin = await requireOwner();
  const name = text(formData.get("name"));
  const desiredSlug = slugify(text(formData.get("slug")) || name);
  const parsed = siteCreateSchema.safeParse({ name, slug: desiredSlug });
  if (!parsed.success) throw new Error("Site adı veya slug geçersiz.");
  const slug = await uniqueSiteSlug(parsed.data.slug);

  const site = await db.transaction(async (tx) => {
    const [created] = await tx.insert(sites).values({ name: parsed.data.name, slug }).returning({ id: sites.id, slug: sites.slug });
    await tx.insert(siteSections).values([
      { siteId: created.id, type: "hero", label: "Hero", sortOrder: 0 },
      { siteId: created.id, type: "announcement", label: "Duyuru", isVisible: false, sortOrder: 1, config: defaultSectionConfig("announcement") },
      { siteId: created.id, type: "search", label: "Arama", sortOrder: 2 },
      { siteId: created.id, type: "quick-categories", label: "Kategoriler", sortOrder: 3 },
      { siteId: created.id, type: "featured", label: "Öne çıkanlar", sortOrder: 4, config: defaultSectionConfig("featured") },
      { siteId: created.id, type: "menu", label: "Ürünler", sortOrder: 5 },
      { siteId: created.id, type: "business-info", label: "İşletme bilgileri", sortOrder: 6 },
      { siteId: created.id, type: "footer", label: "Footer", sortOrder: 7 },
    ]);
    await tx.insert(businessHours).values(Array.from({ length: 7 }, (_, dayOfWeek) => ({ siteId: created.id, dayOfWeek })));
    return created;
  });
  await auditAdmin({ userId: admin.id, siteId: site.id, action: "site.create", entityType: "site", entityId: site.id });
  redirect(`/admin/sites/${site.id}/general`);
}

export async function updateSiteGeneral(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const admin = await requireSiteAdmin(siteId);
  const current = await getSite(siteId);
  const slug = await uniqueSiteSlug(text(formData.get("slug")) || current.slug, siteId);
  const locale = text(formData.get("locale")) || current.locale;
  const locales = normalizeLocales(locale, text(formData.get("locales")).split(","));
  const customDomain = normalizeCustomDomain(formData.get("customDomain"));
  const translations = translationsFromForm<LocalizedSiteCopy>(formData, locales, locale, ["name", "subtitle", "footerText"]);

  await db.update(sites).set({
    name: text(formData.get("name")) || current.name,
    slug,
    subtitle: text(formData.get("subtitle")),
    customDomain,
    currency: text(formData.get("currency")) || "TRY",
    locale,
    locales,
    translations,
    timezone: text(formData.get("timezone")) || "Europe/Istanbul",
    wifiName: nullable(formData.get("wifiName")),
    wifiPassword: nullable(formData.get("wifiPassword")),
    phone: nullable(formData.get("phone")),
    address: nullable(formData.get("address")),
    instagram: nullable(formData.get("instagram")),
    whatsapp: nullable(formData.get("whatsapp")),
    facebook: nullable(formData.get("facebook")),
    tiktok: nullable(formData.get("tiktok")),
    website: nullable(formData.get("website")),
    footerText: nullable(formData.get("footerText")),
    isActive: checked(formData.get("isActive")),
    updatedAt: new Date(),
  }).where(eq(sites.id, siteId));

  revalidateSite(siteId, current.slug);
  if (slug !== current.slug) updateTag(`menu-slug:${slug}`);
  await auditAdmin({ userId: admin.id, siteId, action: "site.update_general", entityType: "site", entityId: siteId, metadata: { slug, customDomain } });
}

export async function updateSiteDesign(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const admin = await requireSiteAdmin(siteId);
  const current = await getSite(siteId);
  const coverUpload = await saveImageUpload(siteId, formData.get("coverFile"), "cover");
  const logoUpload = await saveImageUpload(siteId, formData.get("logoFile"), "logo");
  const nextCoverUrl = coverUpload ?? nullable(formData.get("coverUrl"));
  const nextLogoUrl = logoUpload ?? nullable(formData.get("logoUrl"));
  const fontValue = text(formData.get("fontFamily"));
  const fontFamily: SiteTheme["fontFamily"] = fontValue === "serif" || fontValue === "rounded" ? fontValue : "system";
  const heroOverlay = Number(formData.get("heroOverlay"));

  const terminology: NonNullable<SiteTheme["terminology"]> = {
    menuTitle: nullable(formData.get("menuTitle")) ?? undefined,
    productsLabel: nullable(formData.get("productsLabel")) ?? undefined,
    soldOutLabel: nullable(formData.get("soldOutLabel")) ?? undefined,
    ingredientsLabel: nullable(formData.get("ingredientsLabel")) ?? undefined,
    allergensLabel: nullable(formData.get("allergensLabel")) ?? undefined,
    searchPlaceholder: nullable(formData.get("searchPlaceholder")) ?? undefined,
  };

  const theme: SiteTheme = {
    ...current.theme,
    background: text(formData.get("background")) || current.theme.background,
    card: text(formData.get("card")) || current.theme.card,
    text: text(formData.get("textColor")) || current.theme.text,
    muted: text(formData.get("muted")) || current.theme.muted,
    accent: text(formData.get("accent")) || current.theme.accent,
    accentSoft: text(formData.get("accentSoft")) || current.theme.accentSoft,
    radius: clamp(Number(formData.get("radius")) || current.theme.radius, 0, 48),
    heroHeight: clamp(Number(formData.get("heroHeight")) || current.theme.heroHeight, 140, 420),
    productLayout: formData.get("productLayout") === "list" ? "list" : "grid",
    showFavorites: checked(formData.get("showFavorites")),
    showLanguage: checked(formData.get("showLanguage")),
    showHoursBadge: checked(formData.get("showHoursBadge")),
    heroOverlay: Number.isFinite(heroOverlay) ? clamp(heroOverlay, 0.1, 0.9) : (current.theme.heroOverlay ?? 0.62),
    fontFamily,
    terminology,
  };

  try {
    await db.update(sites).set({ coverUrl: nextCoverUrl, logoUrl: nextLogoUrl, theme, updatedAt: new Date() }).where(eq(sites.id, siteId));
  } catch (error) {
    await Promise.all([deleteLocalUpload(coverUpload), deleteLocalUpload(logoUpload)]);
    throw error;
  }
  if (current.coverUrl !== nextCoverUrl) await deleteLocalUpload(current.coverUrl);
  if (current.logoUrl !== nextLogoUrl) await deleteLocalUpload(current.logoUrl);
  revalidateSite(siteId, current.slug);
  await auditAdmin({ userId: admin.id, siteId, action: "site.update_design", entityType: "site", entityId: siteId });
}

export async function updateBusinessHours(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  await db.transaction(async (tx) => {
    for (let day = 0; day < 7; day++) {
      const isClosed = checked(formData.get(`closed-${day}`));
      const openTime = text(formData.get(`open-${day}`)) || "08:00";
      const closeTime = text(formData.get(`close-${day}`)) || "00:00";
      if (!timePattern.test(openTime) || !timePattern.test(closeTime)) throw new Error("Çalışma saati biçimi geçersiz.");
      await tx.update(businessHours).set({ isClosed, openTime, closeTime }).where(and(eq(businessHours.siteId, siteId), eq(businessHours.dayOfWeek, day)));
    }
  });
  revalidateSite(siteId, site.slug);
  await auditAdmin({ userId: admin.id, siteId, action: "site.update_hours", entityType: "site", entityId: siteId });
}

export async function createSection(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  const typeValue = text(formData.get("type"));
  if (!isSectionType(typeValue)) throw new Error("Geçersiz blok tipi.");
  const [last] = await db.select({ sortOrder: siteSections.sortOrder }).from(siteSections).where(eq(siteSections.siteId, siteId)).orderBy(siteSections.sortOrder).limit(1);
  const [created] = await db.insert(siteSections).values({
    siteId,
    type: typeValue,
    label: text(formData.get("label")) || typeValue,
    sortOrder: numeric(formData.get("sortOrder"), (last?.sortOrder ?? 0) + 1),
    config: defaultSectionConfig(typeValue),
  }).returning({ id: siteSections.id });
  revalidateSite(siteId, site.slug);
  await auditAdmin({ userId: admin.id, siteId, action: "section.create", entityType: "section", entityId: created.id, metadata: { type: typeValue } });
}

export async function updateSection(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const sectionId = text(formData.get("sectionId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  const [current] = await db.select().from(siteSections).where(and(eq(siteSections.id, sectionId), eq(siteSections.siteId, siteId))).limit(1);
  if (!current) throw new Error("Blok bulunamadı.");

  const baseConfig = {
    title: nullable(formData.get("title")) ?? undefined,
    eyebrow: nullable(formData.get("eyebrow")) ?? undefined,
    body: nullable(formData.get("body")) ?? undefined,
    ctaLabel: nullable(formData.get("ctaLabel")) ?? undefined,
    ctaUrl: nullable(formData.get("ctaUrl")) ?? undefined,
    imageUrl: nullable(formData.get("imageUrl")) ?? undefined,
    layout: formData.get("layout") === "list" || formData.get("layout") === "carousel" ? formData.get("layout") : "grid",
    items: jsonArray(formData.get("itemsJson")),
    translations: {} as Record<string, Record<string, unknown>>,
  };
  for (const locale of site.locales) {
    if (locale === site.locale) continue;
    const localized: Record<string, unknown> = {};
    for (const key of ["title", "eyebrow", "body", "ctaLabel", "ctaUrl", "imageUrl"] as const) {
      const value = text(formData.get(`tr:${locale}:${key}`));
      if (value) localized[key] = value;
    }
    const itemsRaw = text(formData.get(`tr:${locale}:itemsJson`));
    if (itemsRaw) localized.items = JSON.parse(itemsRaw);
    if (Object.keys(localized).length) baseConfig.translations[locale] = localized;
  }

  const config = parseSectionConfig(baseConfig);
  await db.update(siteSections).set({
    label: text(formData.get("label")) || current.label,
    isVisible: checked(formData.get("isVisible")),
    sortOrder: numeric(formData.get("sortOrder"), current.sortOrder),
    config,
  }).where(and(eq(siteSections.id, sectionId), eq(siteSections.siteId, siteId)));
  revalidateSite(siteId, site.slug);
  await auditAdmin({ userId: admin.id, siteId, action: "section.update", entityType: "section", entityId: sectionId });
}

export async function deleteSection(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const sectionId = text(formData.get("sectionId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  const [current] = await db.select({ id: siteSections.id, type: siteSections.type }).from(siteSections).where(and(eq(siteSections.id, sectionId), eq(siteSections.siteId, siteId))).limit(1);
  if (!current) throw new Error("Blok bulunamadı.");
  await db.delete(siteSections).where(and(eq(siteSections.id, sectionId), eq(siteSections.siteId, siteId)));
  revalidateSite(siteId, site.slug);
  await auditAdmin({ userId: admin.id, siteId, action: "section.delete", entityType: "section", entityId: sectionId, metadata: { type: current.type } });
}

function categoryTranslations(formData: FormData, site: typeof sites.$inferSelect) {
  return translationsFromForm<LocalizedCategoryCopy>(formData, site.locales, site.locale, ["name", "description"]);
}

function productTranslations(formData: FormData, site: typeof sites.$inferSelect) {
  return translationsFromForm<LocalizedProductCopy>(formData, site.locales, site.locale, ["name", "description", "ingredients", "allergens", "note", "badge"]);
}

export async function createCategory(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  const name = text(formData.get("name"));
  if (!name) throw new Error("Kategori adı gerekli.");
  const parentId = nullable(formData.get("parentId"));
  if (parentId) {
    const [parent] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, parentId), eq(categories.siteId, siteId))).limit(1);
    if (!parent) throw new Error("Üst kategori geçersiz.");
  }
  const imageUpload = await saveImageUpload(siteId, formData.get("imageFile"), "category");
  try {
    const [created] = await db.insert(categories).values({
      siteId,
      parentId,
      name,
      slug: await uniqueCategorySlug(siteId, text(formData.get("slug")) || name),
      description: nullable(formData.get("description")),
      imageUrl: imageUpload ?? nullable(formData.get("imageUrl")),
      translations: categoryTranslations(formData, site),
      sortOrder: numeric(formData.get("sortOrder")),
    }).returning({ id: categories.id });
    await auditAdmin({ userId: admin.id, siteId, action: "category.create", entityType: "category", entityId: created.id });
  } catch (error) {
    await deleteLocalUpload(imageUpload);
    throw error;
  }
  revalidateSite(siteId, site.slug);
}

export async function updateCategory(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const categoryId = text(formData.get("categoryId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  const [current] = await db.select().from(categories).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId))).limit(1);
  if (!current) throw new Error("Kategori bulunamadı.");
  const parentId = nullable(formData.get("parentId"));
  if (parentId === categoryId) throw new Error("Kategori kendisinin üst kategorisi olamaz.");
  if (parentId) {
    const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories).where(eq(categories.siteId, siteId));
    const byId = new Map(all.map((row) => [row.id, row.parentId]));
    let cursor: string | null = parentId;
    for (let i = 0; cursor && i < all.length + 1; i++) {
      if (cursor === categoryId) throw new Error("Kategori ağacında döngü oluşturulamaz.");
      cursor = byId.get(cursor) ?? null;
    }
    if (!byId.has(parentId)) throw new Error("Üst kategori geçersiz.");
  }

  const imageUpload = await saveImageUpload(siteId, formData.get("imageFile"), "category");
  const nextImageUrl = imageUpload ?? nullable(formData.get("imageUrl"));
  const name = text(formData.get("name")) || current.name;
  try {
    await db.update(categories).set({
      name,
      slug: await uniqueCategorySlug(siteId, text(formData.get("slug")) || name, categoryId),
      parentId,
      description: nullable(formData.get("description")),
      imageUrl: nextImageUrl,
      translations: categoryTranslations(formData, site),
      isActive: checked(formData.get("isActive")),
      sortOrder: numeric(formData.get("sortOrder")),
      updatedAt: new Date(),
    }).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId)));
  } catch (error) {
    await deleteLocalUpload(imageUpload);
    throw error;
  }
  if (current.imageUrl !== nextImageUrl) await deleteLocalUpload(current.imageUrl);
  revalidateSite(siteId, site.slug);
  await auditAdmin({ userId: admin.id, siteId, action: "category.update", entityType: "category", entityId: categoryId });
}

export async function deleteCategory(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const categoryId = text(formData.get("categoryId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  const [current] = await db.select({ imageUrl: categories.imageUrl }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId))).limit(1);
  if (!current) throw new Error("Kategori bulunamadı.");
  await db.transaction(async (tx) => {
    await tx.update(categories).set({ parentId: null }).where(and(eq(categories.siteId, siteId), eq(categories.parentId, categoryId)));
    await tx.delete(categories).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId)));
  });
  await deleteLocalUpload(current.imageUrl);
  revalidateSite(siteId, site.slug);
  await auditAdmin({ userId: admin.id, siteId, action: "category.delete", entityType: "category", entityId: categoryId });
}

async function validCategoryIds(siteId: string, formData: FormData) {
  const requested = [...new Set(formData.getAll("categoryIds").map(String).filter(Boolean))];
  if (!requested.length) return [];
  return db.select({ id: categories.id }).from(categories).where(and(eq(categories.siteId, siteId), inArray(categories.id, requested)));
}

export async function createProduct(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  const name = text(formData.get("name"));
  if (!name) throw new Error("Ürün adı gerekli.");
  const imageUpload = await saveImageUpload(siteId, formData.get("imageFile"), "product");
  const valid = await validCategoryIds(siteId, formData);

  try {
    const product = await db.transaction(async (tx) => {
      const [created] = await tx.insert(products).values({
        siteId,
        name,
        slug: await uniqueProductSlug(siteId, text(formData.get("slug")) || name),
        description: nullable(formData.get("description")),
        ingredients: nullable(formData.get("ingredients")),
        allergens: nullable(formData.get("allergens")),
        note: nullable(formData.get("note")),
        imageUrl: imageUpload ?? nullable(formData.get("imageUrl")),
        badge: nullable(formData.get("badge")),
        translations: productTranslations(formData, site),
        priceKurus: moneyToKurus(formData.get("price"))!,
        compareAtPriceKurus: moneyToKurus(formData.get("compareAtPrice"), false),
        isActive: checked(formData.get("isActive")),
        isAvailable: checked(formData.get("isAvailable")),
        isFeatured: checked(formData.get("isFeatured")),
        sortOrder: numeric(formData.get("sortOrder")),
      }).returning({ id: products.id });
      if (valid.length) await tx.insert(productCategories).values(valid.map((category, sortOrder) => ({ productId: created.id, categoryId: category.id, sortOrder })));
      return created;
    });
    await auditAdmin({ userId: admin.id, siteId, action: "product.create", entityType: "product", entityId: product.id });
  } catch (error) {
    await deleteLocalUpload(imageUpload);
    throw error;
  }
  revalidateSite(siteId, site.slug);
}

export async function updateProduct(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const productId = text(formData.get("productId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  const [current] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.siteId, siteId))).limit(1);
  if (!current) throw new Error("Ürün bulunamadı.");
  const name = text(formData.get("name")) || current.name;
  const imageUpload = await saveImageUpload(siteId, formData.get("imageFile"), "product");
  const nextImageUrl = imageUpload ?? nullable(formData.get("imageUrl"));
  const valid = await validCategoryIds(siteId, formData);

  try {
    await db.transaction(async (tx) => {
      await tx.update(products).set({
        name,
        slug: await uniqueProductSlug(siteId, text(formData.get("slug")) || name, productId),
        description: nullable(formData.get("description")),
        ingredients: nullable(formData.get("ingredients")),
        allergens: nullable(formData.get("allergens")),
        note: nullable(formData.get("note")),
        imageUrl: nextImageUrl,
        badge: nullable(formData.get("badge")),
        translations: productTranslations(formData, site),
        priceKurus: moneyToKurus(formData.get("price"))!,
        compareAtPriceKurus: moneyToKurus(formData.get("compareAtPrice"), false),
        isActive: checked(formData.get("isActive")),
        isAvailable: checked(formData.get("isAvailable")),
        isFeatured: checked(formData.get("isFeatured")),
        sortOrder: numeric(formData.get("sortOrder")),
        updatedAt: new Date(),
      }).where(and(eq(products.id, productId), eq(products.siteId, siteId)));
      await tx.delete(productCategories).where(eq(productCategories.productId, productId));
      if (valid.length) await tx.insert(productCategories).values(valid.map((category, sortOrder) => ({ productId, categoryId: category.id, sortOrder })));
    });
  } catch (error) {
    await deleteLocalUpload(imageUpload);
    throw error;
  }
  if (current.imageUrl !== nextImageUrl) await deleteLocalUpload(current.imageUrl);
  revalidateSite(siteId, site.slug);
  await auditAdmin({ userId: admin.id, siteId, action: "product.update", entityType: "product", entityId: productId });
}

export async function deleteProduct(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const productId = text(formData.get("productId"));
  const admin = await requireSiteAdmin(siteId);
  const site = await getSite(siteId);
  const [current] = await db.select({ imageUrl: products.imageUrl }).from(products).where(and(eq(products.id, productId), eq(products.siteId, siteId))).limit(1);
  if (!current) throw new Error("Ürün bulunamadı.");
  await db.delete(products).where(and(eq(products.id, productId), eq(products.siteId, siteId)));
  await deleteLocalUpload(current.imageUrl);
  revalidateSite(siteId, site.slug);
  await auditAdmin({ userId: admin.id, siteId, action: "product.delete", entityType: "product", entityId: productId });
}

export async function deleteSite(formData: FormData) {
  const siteId = text(formData.get("siteId"));
  const admin = await requireOwner();
  const site = await getSite(siteId);
  if (text(formData.get("confirmSlug")) !== site.slug) throw new Error("Site silme onayı geçersiz.");
  await db.delete(sites).where(eq(sites.id, siteId));
  await deleteSiteUploads(siteId);
  await auditAdmin({ userId: admin.id, action: "site.delete", entityType: "site", entityId: siteId, metadata: { slug: site.slug } });
  revalidatePath("/admin");
  redirect("/admin");
}
