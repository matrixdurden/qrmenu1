"use client";

import { Fragment, useMemo, useState } from "react";
import { Clock3, ExternalLink, Heart, MapPin, Phone, Search, Wifi, X } from "lucide-react";
import type { getMenuBySlug } from "@/lib/queries";

type MenuData = NonNullable<Awaited<ReturnType<typeof getMenuBySlug>>>;
type Product = MenuData["products"][number];
type Category = MenuData["categories"][number];

function money(kurus: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(kurus / 100);
}

function dayAndMinutes(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[weekday] ?? 0, minutes: hour * 60 + minute };
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function businessStatus(hours: MenuData["hours"], timezone: string) {
  const { day, minutes } = dayAndMinutes(timezone);
  const today = hours.find((item) => item.dayOfWeek === day);
  const previous = hours.find((item) => item.dayOfWeek === (day + 6) % 7);

  if (previous && !previous.isClosed) {
    const prevOpen = timeToMinutes(previous.openTime);
    const prevClose = timeToMinutes(previous.closeTime);
    if (prevClose <= prevOpen && minutes < prevClose) return { open: true, label: `Açık · ${previous.closeTime}'a kadar` };
  }

  if (!today || today.isClosed) return { open: false, label: "Bugün kapalı" };
  const open = timeToMinutes(today.openTime);
  const close = timeToMinutes(today.closeTime);
  const isOpen = close <= open ? minutes >= open : minutes >= open && minutes < close;
  return isOpen
    ? { open: true, label: `Açık · ${today.closeTime}'a kadar` }
    : { open: false, label: `Bugün ${today.openTime}–${today.closeTime}` };
}

function descendantIds(categoryId: string, categories: Category[]) {
  const ids = new Set<string>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return ids;
}

function socialHref(kind: "instagram" | "facebook" | "tiktok" | "website", value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const clean = value.replace(/^@/, "");
  if (kind === "instagram") return `https://instagram.com/${clean}`;
  if (kind === "facebook") return `https://facebook.com/${clean}`;
  if (kind === "tiktok") return `https://tiktok.com/@${clean}`;
  return `https://${clean}`;
}

export default function MenuClient({ data }: { data: MenuData }) {
  const { site, categories, products, productCategories, hours } = data;
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const status = businessStatus(hours, site.timezone);
  const activeCategoryRow = categories.find((category) => category.id === activeCategory);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(site.locale);
    const allowedCategoryIds = activeCategory ? descendantIds(activeCategory, categories) : null;
    return products.filter((product) => {
      const searchable = `${product.name} ${product.description ?? ""} ${product.ingredients ?? ""} ${product.badge ?? ""}`.toLocaleLowerCase(site.locale);
      const queryMatches = !q || searchable.includes(q);
      const categoryMatches = !allowedCategoryIds || productCategories.some((link) => link.productId === product.id && allowedCategoryIds.has(link.categoryId));
      return queryMatches && categoryMatches;
    });
  }, [products, productCategories, query, activeCategory, categories, site.locale]);

  const rootCategories = categories.filter((category) => !category.parentId);
  const siblingParentId = activeCategoryRow?.parentId ?? activeCategoryRow?.id ?? null;
  const subCategories = siblingParentId ? categories.filter((category) => category.parentId === siblingParentId) : [];
  const showFavorites = site.theme.showFavorites ?? true;
  const heroVisible = data.sections.some((section) => section.type === "hero");
  const bodySections = data.sections.filter((section) => section.type !== "hero");
  const fontStack = site.theme.fontFamily === "serif"
    ? "Georgia, 'Times New Roman', serif"
    : site.theme.fontFamily === "rounded"
      ? "'Trebuchet MS', ui-rounded, system-ui, sans-serif"
      : "Inter, ui-sans-serif, system-ui, sans-serif";

  const searchBlock = <label className="menu-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Menüde ara..." />{query && <button type="button" onClick={() => setQuery("")} aria-label="Aramayı temizle"><X size={16} /></button>}</label>;

  const categoriesBlock = <div className="category-area">
    <div className="category-strip">
      <button type="button" className={!activeCategory ? "category-pill active" : "category-pill"} onClick={() => setActiveCategory(null)}>Tümü</button>
      {rootCategories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? "category-pill active" : "category-pill"} onClick={() => setActiveCategory(category.id)}>{category.name}</button>)}
    </div>
    {subCategories.length ? <div className="subcategory-strip">{subCategories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? "subcategory-pill active" : "subcategory-pill"} onClick={() => setActiveCategory(category.id)}>{category.name}</button>)}</div> : null}
  </div>;

  const productsBlock = <section className="menu-section">
    <div className="section-title"><div><span className="eyebrow">{site.name} MENU</span><h2>{activeCategoryRow?.name ?? (query ? "Arama sonuçları" : "Tüm ürünler")}</h2></div><span>{visibleProducts.length} ürün</span></div>
    <div className={`menu-products ${site.theme.productLayout === "list" ? "list" : ""}`}>
      {visibleProducts.map((product) => (
        <article className={`menu-product-card ${product.isAvailable ? "" : "unavailable"}`} key={product.id} onClick={() => setSelected(product)}>
          <div className="product-picture" style={product.imageUrl ? { backgroundImage: `url(${product.imageUrl})` } : undefined}>
            {!product.isAvailable ? <span className="product-badge sold-out">Tükendi</span> : product.badge ? <span className="product-badge">{product.badge}</span> : null}
            {showFavorites ? <button type="button" aria-label="Favori" className={`fav ${favorites.has(product.id) ? "active" : ""}`} onClick={(event) => { event.stopPropagation(); setFavorites((prev) => { const next = new Set(prev); if (next.has(product.id)) next.delete(product.id); else next.add(product.id); return next; }); }}><Heart size={18} fill={favorites.has(product.id) ? "currentColor" : "none"} /></button> : null}
          </div>
          <div className="product-copy"><h3>{product.name}</h3><p>{product.description}</p><div className="product-price"><div>{product.compareAtPriceKurus ? <del>{money(product.compareAtPriceKurus, site.currency, site.locale)}</del> : null}<strong>{money(product.priceKurus, site.currency, site.locale)}</strong></div>{product.note ? <span>{product.note}</span> : null}</div></div>
        </article>
      ))}
    </div>
    {!visibleProducts.length ? <div className="empty-state">Bu filtrede ürün bulunamadı.</div> : null}
  </section>;

  const businessBlock = <section className="info-card-grid">
    {site.wifiName ? <div className="info-card"><Wifi size={20} /><div><span>Wi-Fi</span><strong>{site.wifiName}</strong>{site.wifiPassword ? <small>Şifre: {site.wifiPassword}</small> : null}</div></div> : null}
    <div className="info-card"><Clock3 size={20} /><div><span>Bugün</span><strong>{status.label}</strong></div></div>
    {site.address ? <div className="info-card full"><MapPin size={20} /><div><span>Adres</span><strong>{site.address}</strong></div></div> : null}
    {site.phone ? <a className="info-card" href={`tel:${site.phone}`}><Phone size={20} /><div><span>Telefon</span><strong>{site.phone}</strong></div></a> : null}
    {site.whatsapp ? <a className="info-card" href={`https://wa.me/${site.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>WhatsApp</span><strong>Mesaj gönder</strong></div></a> : null}
    {site.instagram ? <a className="info-card" href={socialHref("instagram", site.instagram)} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>Instagram</span><strong>{site.instagram}</strong></div></a> : null}
    {site.facebook ? <a className="info-card" href={socialHref("facebook", site.facebook)} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>Facebook</span><strong>Profili aç</strong></div></a> : null}
    {site.tiktok ? <a className="info-card" href={socialHref("tiktok", site.tiktok)} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>TikTok</span><strong>Profili aç</strong></div></a> : null}
    {site.website ? <a className="info-card" href={socialHref("website", site.website)} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>Web sitesi</span><strong>Ziyaret et</strong></div></a> : null}
  </section>;

  function renderSection(type: string) {
    if (type === "search") return searchBlock;
    if (type === "quick-categories") return categoriesBlock;
    if (type === "menu") return productsBlock;
    if (type === "business-info") return businessBlock;
    if (type === "footer") return <footer className="menu-footer">{site.footerText ?? `${site.name} · Dijital Menü`}</footer>;
    return null;
  }

  return (
    <div
      className="menu-page"
      style={{
        "--menu-bg": site.theme.background,
        "--menu-card": site.theme.card,
        "--menu-text": site.theme.text,
        "--menu-muted": site.theme.muted,
        "--menu-accent": site.theme.accent,
        "--menu-accent-soft": site.theme.accentSoft,
        "--menu-radius": `${site.theme.radius}px`,
        "--hero-height": `${site.theme.heroHeight}px`,
        "--menu-font": fontStack,
      } as React.CSSProperties}
    >
      <div className="menu-shell">
        {heroVisible ? <header className="menu-hero" style={site.coverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(10,10,10,.18), rgba(10,10,10,${site.theme.heroOverlay ?? 0.62})), url(${site.coverUrl})` } : undefined}>
          <div className="hero-top">
            {(site.theme.showHoursBadge ?? true) ? <span className={`hero-chip ${status.open ? "open" : ""}`}><Clock3 size={14} /> {status.label}</span> : <span />}
            {(site.theme.showLanguage ?? true) ? <span className="hero-chip">{site.locale.split("-")[0].toUpperCase()}</span> : null}
          </div>
          <div className="hero-copy">
            {site.logoUrl ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="menu-logo" src={site.logoUrl} alt="" />
            </> : null}
            <h1>{site.name}</h1><p>{site.subtitle}</p>
          </div>
        </header> : <header className="minimal-menu-header"><div><h1>{site.name}</h1><p>{site.subtitle}</p></div><span className={status.open ? "mini-status open" : "mini-status"}>{status.open ? "Açık" : "Kapalı"}</span></header>}

        <div className="menu-content">
          {bodySections.map((section) => <Fragment key={section.id}>{renderSection(section.type)}</Fragment>)}
        </div>
      </div>

      {selected ? <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="product-modal" onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setSelected(null)} aria-label="Kapat"><X /></button><div className="modal-image" style={selected.imageUrl ? { backgroundImage: `url(${selected.imageUrl})` } : undefined} /><div className="modal-copy">{!selected.isAvailable ? <span className="product-badge inline sold-out">Tükendi</span> : selected.badge ? <span className="product-badge inline">{selected.badge}</span> : null}<h2>{selected.name}</h2><div className="modal-prices">{selected.compareAtPriceKurus ? <del>{money(selected.compareAtPriceKurus, site.currency, site.locale)}</del> : null}<strong className="modal-price">{money(selected.priceKurus, site.currency, site.locale)}</strong></div><p>{selected.description}</p>{selected.ingredients ? <div className="detail-line"><span>İçindekiler</span><b>{selected.ingredients}</b></div> : null}{selected.allergens ? <div className="detail-line"><span>Alerjenler</span><b>{selected.allergens}</b></div> : null}{selected.note ? <div className="detail-line"><span>Not</span><b>{selected.note}</b></div> : null}</div></div></div> : null}
    </div>
  );
}
