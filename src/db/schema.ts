import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type SiteTheme = {
  background: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  radius: number;
  heroHeight: number;
  productLayout: "grid" | "list";
  showFavorites?: boolean;
  showLanguage?: boolean;
  showHoursBadge?: boolean;
  heroOverlay?: number;
  fontFamily?: "system" | "serif" | "rounded";
  terminology?: {
    menuTitle?: string;
    productsLabel?: string;
    soldOutLabel?: string;
    ingredientsLabel?: string;
    allergensLabel?: string;
    searchPlaceholder?: string;
  };
};

export type LocalizedSiteCopy = {
  name?: string;
  subtitle?: string;
  footerText?: string;
};

export type LocalizedCategoryCopy = {
  name?: string;
  description?: string;
};

export type LocalizedProductCopy = {
  name?: string;
  description?: string;
  ingredients?: string;
  allergens?: string;
  note?: string;
  badge?: string;
};

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    subtitle: text("subtitle").notNull().default("Kitchen · Coffee · Lounge"),
    coverUrl: text("cover_url"),
    logoUrl: text("logo_url"),
    customDomain: text("custom_domain"),
    currency: text("currency").notNull().default("TRY"),
    locale: text("locale").notNull().default("tr-TR"),
    locales: jsonb("locales").$type<string[]>().notNull().default(["tr-TR"]),
    translations: jsonb("translations").$type<Record<string, LocalizedSiteCopy>>().notNull().default({}),
    timezone: text("timezone").notNull().default("Europe/Istanbul"),
    wifiName: text("wifi_name"),
    wifiPassword: text("wifi_password"),
    footerText: text("footer_text"),
    phone: text("phone"),
    address: text("address"),
    instagram: text("instagram"),
    whatsapp: text("whatsapp"),
    facebook: text("facebook"),
    tiktok: text("tiktok"),
    website: text("website"),
    isActive: boolean("is_active").notNull().default(true),
    theme: jsonb("theme").$type<SiteTheme>().notNull().default({
      background: "#f7f6f2",
      card: "#ffffff",
      text: "#171714",
      muted: "#7a776f",
      accent: "#173c2b",
      accentSoft: "#e9f0ec",
      radius: 20,
      heroHeight: 190,
      productLayout: "grid",
      showFavorites: true,
      showLanguage: true,
      showHoursBadge: true,
      heroOverlay: 0.62,
      fontFamily: "system",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sites_slug_idx").on(table.slug),
    uniqueIndex("sites_custom_domain_idx").on(table.customDomain),
  ],
);

export const siteSections = pgTable(
  "site_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    label: text("label").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [index("site_sections_site_idx").on(table.siteId, table.sortOrder)],
);

export const businessHours = pgTable(
  "business_hours",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    isClosed: boolean("is_closed").notNull().default(false),
    openTime: text("open_time").notNull().default("08:00"),
    closeTime: text("close_time").notNull().default("00:00"),
  },
  (table) => [uniqueIndex("business_hours_site_day_idx").on(table.siteId, table.dayOfWeek)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    translations: jsonb("translations").$type<Record<string, LocalizedCategoryCopy>>().notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_site_slug_idx").on(table.siteId, table.slug),
    index("categories_tree_idx").on(table.siteId, table.parentId, table.sortOrder),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    ingredients: text("ingredients"),
    allergens: text("allergens"),
    note: text("note"),
    imageUrl: text("image_url"),
    badge: text("badge"),
    translations: jsonb("translations").$type<Record<string, LocalizedProductCopy>>().notNull().default({}),
    priceKurus: integer("price_kurus").notNull(),
    compareAtPriceKurus: integer("compare_at_price_kurus"),
    isActive: boolean("is_active").notNull().default(true),
    isAvailable: boolean("is_available").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_site_slug_idx").on(table.siteId, table.slug),
    index("products_site_sort_idx").on(table.siteId, table.sortOrder),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("product_categories_unique_idx").on(table.productId, table.categoryId),
    index("product_categories_category_idx").on(table.categoryId, table.sortOrder),
  ],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("owner"),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_users_email_idx").on(table.email)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("admin_sessions_token_idx").on(table.tokenHash),
    index("admin_sessions_user_idx").on(table.userId, table.expiresAt),
  ],
);

export const adminSiteAccess = pgTable(
  "admin_site_access",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("admin_site_access_unique_idx").on(table.userId, table.siteId),
    index("admin_site_access_site_idx").on(table.siteId),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    siteId: uuid("site_id").references(() => sites.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_site_idx").on(table.siteId, table.createdAt),
    index("admin_audit_user_idx").on(table.userId, table.createdAt),
  ],
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    key: text("key").primaryKey(),
    attempts: integer("attempts").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("auth_rate_limits_blocked_idx").on(table.blockedUntil)],
);
