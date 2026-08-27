CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"open_time" text DEFAULT '08:00' NOT NULL,
	"close_time" text DEFAULT '00:00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"ingredients" text,
	"allergens" text,
	"note" text,
	"image_url" text,
	"badge" text,
	"price_kurus" integer NOT NULL,
	"compare_at_price_kurus" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"subtitle" text DEFAULT 'Kitchen · Coffee · Lounge' NOT NULL,
	"cover_url" text,
	"logo_url" text,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"locale" text DEFAULT 'tr-TR' NOT NULL,
	"wifi_name" text,
	"wifi_password" text,
	"footer_text" text,
	"phone" text,
	"address" text,
	"instagram" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"theme" jsonb DEFAULT '{"background":"#f7f6f2","card":"#ffffff","text":"#171714","muted":"#7a776f","accent":"#173c2b","accentSoft":"#e9f0ec","radius":20,"heroHeight":190,"productLayout":"grid"}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_sections" ADD CONSTRAINT "site_sections_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_site_day_idx" ON "business_hours" USING btree ("site_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_site_slug_idx" ON "categories" USING btree ("site_id","slug");--> statement-breakpoint
CREATE INDEX "categories_tree_idx" ON "categories" USING btree ("site_id","parent_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_unique_idx" ON "product_categories" USING btree ("product_id","category_id");--> statement-breakpoint
CREATE INDEX "product_categories_category_idx" ON "product_categories" USING btree ("category_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "products_site_slug_idx" ON "products" USING btree ("site_id","slug");--> statement-breakpoint
CREATE INDEX "products_site_sort_idx" ON "products" USING btree ("site_id","sort_order");--> statement-breakpoint
CREATE INDEX "site_sections_site_idx" ON "site_sections" USING btree ("site_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_slug_idx" ON "sites" USING btree ("slug");