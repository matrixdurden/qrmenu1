export const SECTION_TYPES = [
  "hero",
  "announcement",
  "search",
  "quick-categories",
  "featured",
  "menu",
  "gallery",
  "links",
  "custom-text",
  "business-info",
  "footer",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero",
  announcement: "Duyuru",
  search: "Arama",
  "quick-categories": "Kategoriler",
  featured: "Öne çıkanlar",
  menu: "Ürünler / Katalog",
  gallery: "Galeri",
  links: "Bağlantılar",
  "custom-text": "Metin bloğu",
  "business-info": "İşletme bilgileri",
  footer: "Footer",
};

export type SectionConfig = {
  title?: string;
  eyebrow?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  layout?: "grid" | "list" | "carousel";
  items?: Array<{
    title?: string;
    text?: string;
    imageUrl?: string;
    url?: string;
    label?: string;
  }>;
  translations?: Record<string, Partial<Omit<SectionConfig, "translations" | "items">> & { items?: SectionConfig["items"] }>;
};

const asString = (value: unknown) => typeof value === "string" ? value.trim() : "";

function asItems(value: unknown): NonNullable<SectionConfig["items"]> {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 24)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        title: asString(row.title) || undefined,
        text: asString(row.text) || undefined,
        imageUrl: asString(row.imageUrl) || undefined,
        url: asString(row.url) || undefined,
        label: asString(row.label) || undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function isSectionType(value: string): value is SectionType {
  return (SECTION_TYPES as readonly string[]).includes(value);
}

export function parseSectionConfig(raw: unknown): SectionConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const row = raw as Record<string, unknown>;
  const layout = row.layout === "list" || row.layout === "carousel" ? row.layout : row.layout === "grid" ? "grid" : undefined;
  const translations: SectionConfig["translations"] = {};

  if (row.translations && typeof row.translations === "object" && !Array.isArray(row.translations)) {
    for (const [locale, value] of Object.entries(row.translations as Record<string, unknown>)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const translation = value as Record<string, unknown>;
      translations[locale] = {
        title: asString(translation.title) || undefined,
        eyebrow: asString(translation.eyebrow) || undefined,
        body: asString(translation.body) || undefined,
        ctaLabel: asString(translation.ctaLabel) || undefined,
        ctaUrl: asString(translation.ctaUrl) || undefined,
        imageUrl: asString(translation.imageUrl) || undefined,
        items: asItems(translation.items),
      };
    }
  }

  return {
    title: asString(row.title) || undefined,
    eyebrow: asString(row.eyebrow) || undefined,
    body: asString(row.body) || undefined,
    ctaLabel: asString(row.ctaLabel) || undefined,
    ctaUrl: asString(row.ctaUrl) || undefined,
    imageUrl: asString(row.imageUrl) || undefined,
    layout,
    items: asItems(row.items),
    translations: Object.keys(translations).length ? translations : undefined,
  };
}

export function localizedSectionConfig(raw: unknown, locale: string): SectionConfig {
  const base = parseSectionConfig(raw);
  const localized = base.translations?.[locale];
  if (!localized) return base;
  return {
    ...base,
    ...localized,
    items: localized.items?.length ? localized.items : base.items,
  };
}

export function defaultSectionConfig(type: SectionType): SectionConfig {
  if (type === "announcement") return { title: "Duyuru", body: "Güncel duyurunuzu buraya yazın." };
  if (type === "featured") return { title: "Öne çıkanlar", eyebrow: "SEÇKİ" };
  if (type === "gallery") return { title: "Galeri", layout: "grid", items: [] };
  if (type === "links") return { title: "Bağlantılar", items: [] };
  if (type === "custom-text") return { title: "Başlık", body: "İçeriğinizi buraya yazın." };
  return {};
}
