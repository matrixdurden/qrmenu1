type Localized<T> = Record<string, Partial<T>>;

export const UI_COPY = {
  "tr-TR": {
    all: "Tümü",
    search: "Menüde ara...",
    searchResults: "Arama sonuçları",
    allProducts: "Tüm ürünler",
    products: "ürün",
    soldOut: "Tükendi",
    todayClosed: "Bugün kapalı",
    open: "Açık",
    closed: "Kapalı",
    until: "kadar",
    today: "Bugün",
    wifi: "Wi-Fi",
    password: "Şifre",
    address: "Adres",
    phone: "Telefon",
    ingredients: "İçindekiler",
    allergens: "Alerjenler",
    note: "Not",
    noResults: "Bu filtrede ürün bulunamadı.",
    sendMessage: "Mesaj gönder",
    visit: "Ziyaret et",
    openProfile: "Profili aç",
  },
  "en-US": {
    all: "All",
    search: "Search menu...",
    searchResults: "Search results",
    allProducts: "All items",
    products: "items",
    soldOut: "Sold out",
    todayClosed: "Closed today",
    open: "Open",
    closed: "Closed",
    until: "until",
    today: "Today",
    wifi: "Wi-Fi",
    password: "Password",
    address: "Address",
    phone: "Phone",
    ingredients: "Ingredients",
    allergens: "Allergens",
    note: "Note",
    noResults: "No items found for this filter.",
    sendMessage: "Send message",
    visit: "Visit",
    openProfile: "Open profile",
  },
} as const;

export type UiCopy = (typeof UI_COPY)[keyof typeof UI_COPY];

export function uiCopy(locale: string): UiCopy {
  if (locale.toLowerCase().startsWith("en")) return UI_COPY["en-US"];
  return UI_COPY["tr-TR"];
}

export function localizedValue<T extends Record<string, unknown>>(base: T, translations: Localized<T> | null | undefined, locale: string): T {
  const translated = translations?.[locale];
  return translated ? { ...base, ...translated } : base;
}

export function normalizeLocales(defaultLocale: string, locales: unknown): string[] {
  const rows = Array.isArray(locales) ? locales : [];
  const normalized = [...new Set([defaultLocale, ...rows.map(String)])]
    .map((locale) => locale.trim())
    .filter((locale) => /^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale));
  return normalized.length ? normalized.slice(0, 6) : [defaultLocale];
}
