"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { businessHours, categories, productCategories, products, sites, siteSections, type SiteTheme } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import { deleteLocalUpload, deleteSiteUploads, saveImageUpload } from "@/lib/uploads";

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const nullable = (value: FormDataEntryValue | null) => text(value) || null;
const checked = (value: FormDataEntryValue | null) => value === "on" || value === "true";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

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

async function uniqueSiteSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "site";
  for (let suffix = 1; suffix < 1000; suffix++) {
    const candidate = suffix === 1 ? root : `${root}-${suffix}`;
    const condition = excludeId
      ? and(eq(sites.slug, candidate), ne(sites.id, excludeId))
      : eq(sites.slug, candidate);
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

export async function createSite(formData: FormData) {
  await requireAdmin();
  const name = text(formData.get("name"));
  const desiredSlug = slugify(text(formData.get("slug")) || name);
  const parsed = siteCreateSchema.safeParse({ name, slug: desiredSlug });
  if (!parsed.success) throw new Error("Site adı veya slug geçersiz.");
  const slug = await uniqueSiteSlug(parsed.data.slug);

  const site = await db.transaction(async (tx) => {
    const [created] = await tx.insert(sites).values({ name: parsed.data.name, slug }).returning({ id: sites.id, slug: sites.slug });
    await tx.insert(siteSections).values([
      { siteId: created.id, type: "hero", label: "Hero", sortOrder: 0 },
      { siteId: created.id, type: "search", label: "Arama", sortOrder: 1 },
      { siteId: created.id, type: "quick-categories", label: "Kategoriler", sortOrder: 2 },
      { siteId: created.id, type: "menu", label: "Ürünler", sortOrder: 3 },
      { siteId: created.id, type: "business-info", label: "İşletme bilgileri", sortOrder: 4 },
      { siteId: created.id, type: "footer", label: "Footer", sortOrder: 5 },
    ]);
    await tx.insert(businessHours).values(Array.from({ length: 7 }, (_, dayOfWeek) => ({ siteId: created.id, dayOfWeek })));
    return created;
  });
  redirect(`/admin/sites/${site.id}`);
}

export async function updateSite(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
  const current = await getSite(siteId);
  const slug = await uniqueSiteSlug(text(formData.get("slug")) || current.slug, siteId);
  const coverUpload = await saveImageUpload(siteId, formData.get("coverFile"), "cover");
  const logoUpload = await saveImageUpload(siteId, formData.get("logoFile"), "logo");
  const nextCoverUrl = coverUpload ?? nullable(formData.get("coverUrl"));
  const nextLogoUrl = logoUpload ?? nullable(formData.get("logoUrl"));
  const fontValue = text(formData.get("fontFamily"));
  const fontFamily: SiteTheme["fontFamily"] = fontValue === "serif" || fontValue === "rounded" ? fontValue : "system";
  const heroOverlayInput = Number(formData.get("heroOverlay"));

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
    heroOverlay: Number.isFinite(heroOverlayInput) ? clamp(heroOverlayInput, 0.1, 0.9) : (current.theme.heroOverlay ?? 0.62),
    fontFamily,
  };

  try {
    await db.update(sites).set({
      name: text(formData.get("name")) || current.name,
      slug,
      subtitle: text(formData.get("subtitle")),
      coverUrl: nextCoverUrl,
      logoUrl: nextLogoUrl,
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
      currency: text(formData.get("currency")) || "TRY",
      locale: text(formData.get("locale")) || "tr-TR",
      timezone: text(formData.get("timezone")) || "Europe/Istanbul",
      isActive: checked(formData.get("isActive")),
      theme,
      updatedAt: new Date(),
    }).where(eq(sites.id, siteId));
  } catch (error) {
    await Promise.all([deleteLocalUpload(coverUpload), deleteLocalUpload(logoUpload)]);
    throw error;
  }

  if (current.coverUrl !== nextCoverUrl) await deleteLocalUpload(current.coverUrl);
  if (current.logoUrl !== nextLogoUrl) await deleteLocalUpload(current.logoUrl);

  revalidateSite(siteId, current.slug);
  if (slug !== current.slug) {
    revalidatePath(`/menu/${slug}`);
    updateTag(`menu-slug:${slug}`);
  }
}

export async function updateBusinessHours(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
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
}

export async function updateSections(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
  const site = await getSite(siteId);
  const rows = await db.select().from(siteSections).where(eq(siteSections.siteId, siteId));
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const order = Number(formData.get(`order-${row.id}`));
      await tx.update(siteSections).set({
        isVisible: checked(formData.get(`visible-${row.id}`)),
        sortOrder: Number.isFinite(order) ? Math.round(order) : row.sortOrder,
      }).where(and(eq(siteSections.id, row.id), eq(siteSections.siteId, siteId)));
    }
  });
  revalidateSite(siteId, site.slug);
}

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
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
    await db.insert(categories).values({
      siteId,
      parentId,
      name,
      slug: await uniqueCategorySlug(siteId, text(formData.get("slug")) || name),
      description: nullable(formData.get("description")),
      imageUrl: imageUpload ?? nullable(formData.get("imageUrl")),
      sortOrder: Number(formData.get("sortOrder")) || 0,
    });
  } catch (error) {
    await deleteLocalUpload(imageUpload);
    throw error;
  }
  revalidateSite(siteId, site.slug);
}

export async function updateCategory(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
  const categoryId = text(formData.get("categoryId"));
  const site = await getSite(siteId);
  const [current] = await db.select().from(categories).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId))).limit(1);
  if (!current) throw new Error("Kategori bulunamadı.");
  const parentId = nullable(formData.get("parentId"));
  if (parentId === categoryId) throw new Error("Kategori kendisinin üst kategorisi olamaz.");
  if (parentId) {
    const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories).where(eq(categories.siteId, siteId));
    let cursor: string | null = parentId;
    const byId = new Map(all.map((row) => [row.id, row.parentId]));
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
      isActive: checked(formData.get("isActive")),
      sortOrder: Number(formData.get("sortOrder")) || 0,
      updatedAt: new Date(),
    }).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId)));
  } catch (error) {
    await deleteLocalUpload(imageUpload);
    throw error;
  }
  if (current.imageUrl !== nextImageUrl) await deleteLocalUpload(current.imageUrl);
  revalidateSite(siteId, site.slug);
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
  const categoryId = text(formData.get("categoryId"));
  const site = await getSite(siteId);
  const [current] = await db.select({ imageUrl: categories.imageUrl }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId))).limit(1);
  if (!current) throw new Error("Kategori bulunamadı.");
  await db.transaction(async (tx) => {
    await tx.update(categories).set({ parentId: null }).where(and(eq(categories.siteId, siteId), eq(categories.parentId, categoryId)));
    await tx.delete(categories).where(and(eq(categories.id, categoryId), eq(categories.siteId, siteId)));
  });
  await deleteLocalUpload(current.imageUrl);
  revalidateSite(siteId, site.slug);
}

async function validCategoryIds(siteId: string, formData: FormData) {
  const requested = [...new Set(formData.getAll("categoryIds").map(String).filter(Boolean))];
  if (!requested.length) return [];
  return db.select({ id: categories.id }).from(categories).where(and(eq(categories.siteId, siteId), inArray(categories.id, requested)));
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
  const site = await getSite(siteId);
  const name = text(formData.get("name"));
  if (!name) throw new Error("Ürün adı gerekli.");
  const imageUpload = await saveImageUpload(siteId, formData.get("imageFile"), "product");
  const valid = await validCategoryIds(siteId, formData);

  try {
    await db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values({
        siteId,
        name,
        slug: await uniqueProductSlug(siteId, text(formData.get("slug")) || name),
        description: nullable(formData.get("description")),
        ingredients: nullable(formData.get("ingredients")),
        allergens: nullable(formData.get("allergens")),
        note: nullable(formData.get("note")),
        imageUrl: imageUpload ?? nullable(formData.get("imageUrl")),
        badge: nullable(formData.get("badge")),
        priceKurus: moneyToKurus(formData.get("price"))!,
        compareAtPriceKurus: moneyToKurus(formData.get("compareAtPrice"), false),
        isActive: checked(formData.get("isActive")),
        isAvailable: checked(formData.get("isAvailable")),
        isFeatured: checked(formData.get("isFeatured")),
        sortOrder: Number(formData.get("sortOrder")) || 0,
      }).returning({ id: products.id });
      if (valid.length) await tx.insert(productCategories).values(valid.map((category, sortOrder) => ({ productId: product.id, categoryId: category.id, sortOrder })));
    });
  } catch (error) {
    await deleteLocalUpload(imageUpload);
    throw error;
  }
  revalidateSite(siteId, site.slug);
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
  const productId = text(formData.get("productId"));
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
        priceKurus: moneyToKurus(formData.get("price"))!,
        compareAtPriceKurus: moneyToKurus(formData.get("compareAtPrice"), false),
        isActive: checked(formData.get("isActive")),
        isAvailable: checked(formData.get("isAvailable")),
        isFeatured: checked(formData.get("isFeatured")),
        sortOrder: Number(formData.get("sortOrder")) || 0,
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
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
  const productId = text(formData.get("productId"));
  const site = await getSite(siteId);
  const [current] = await db.select({ imageUrl: products.imageUrl }).from(products).where(and(eq(products.id, productId), eq(products.siteId, siteId))).limit(1);
  if (!current) throw new Error("Ürün bulunamadı.");
  await db.delete(products).where(and(eq(products.id, productId), eq(products.siteId, siteId)));
  await deleteLocalUpload(current.imageUrl);
  revalidateSite(siteId, site.slug);
}

export async function deleteSite(formData: FormData) {
  await requireAdmin();
  const siteId = text(formData.get("siteId"));
  const site = await getSite(siteId);
  if (text(formData.get("confirmSlug")) !== site.slug) throw new Error("Site silme onayı geçersiz.");
  await db.delete(sites).where(eq(sites.id, siteId));
  await deleteSiteUploads(siteId);
  revalidatePath("/admin");
  updateTag(`menu-site:${siteId}`);
  updateTag(`menu-slug:${site.slug}`);
  redirect("/admin");
}
