CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sites" ALTER COLUMN "theme" SET DEFAULT '{"background":"#f7f6f2","card":"#ffffff","text":"#171714","muted":"#7a776f","accent":"#173c2b","accentSoft":"#e9f0ec","radius":20,"heroHeight":190,"productLayout":"grid","showFavorites":true,"showLanguage":true,"showHoursBadge":true,"heroOverlay":0.62,"fontFamily":"system"}'::jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "timezone" text DEFAULT 'Europe/Istanbul' NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "facebook" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "tiktok" text;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_idx" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_idx" ON "admin_users" USING btree ("email");