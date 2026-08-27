/* eslint-disable @next/next/no-img-element */
"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Clock3, ExternalLink, Heart, MapPin, Phone, Search, Wifi, X } from "lucide-react";
import type { getMenuBySlug } from "@/lib/queries";
import { normalizeLocales, uiCopy } from "@/lib/i18n";
import { localizedSectionConfig } from "@/lib/sections";

type MenuData = NonNullable<Awaited<ReturnType<typeof getMenuBySlug>>>;
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

function businessStatus(hours: MenuData["hours"], timezone: string, copy: ReturnType<typeof uiCopy>) {
  const { day, minutes } = dayAndMinutes(timezone);
  const today = hours.find((item) => item.dayOfWeek === day);
  const previous = hours.find((item) => item.dayOfWeek === (day + 6) % 7);

  if (previous && !previous.isClosed) {
    const prevOpen = timeToMinutes(previous.openTime);
    const prevClose = timeToMinutes(previous.closeTime);
    if (prevClose <= prevOpen && minutes < prevClose) return { open: true, label: `${copy.open} · ${previous.closeTime} ${copy.until}` };
  }

  if (!today || today.isClosed) return { open: false, label: copy.todayClosed };
  const open = timeToMinutes(today.openTime);
  const close = timeToMinutes(today.closeTime);
  const isOpen = close <= open ? minutes >= open : minutes >= open && minutes < close;
  return isOpen
    ? { open: true, label: `${copy.open} · ${today.closeTime} ${copy.until}` }
    : { open: false, label: `${copy.today} ${today.openTime}–${today.closeTime}` };
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

function safeHref(value?: string) {
  if (!value) return null;
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(value)) return value;
  return null;
}

export default function MenuClient({ data }: { data: MenuData }) {
  const { site, categories, products, productCategories, hours } = data;
  const locales = normalizeLocales(site.locale, site.locales);
  const [locale, setLocale] = useState(site.locale);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesReady, setFavoritesReady] = useState(false);
  const copy = uiCopy(locale);
  const status = businessStatus(hours, site.timezone, copy);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem(`qrmenu:favorites:${site.id}`);
        if (stored) setFavorites(new Set(JSON.parse(stored) as string[]));
      } catch {
        setFavorites(new Set());
      } finally {
        setFavoritesReady(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [site.id]);

  useEffect(() => {
    if (!favoritesReady) return;
    localStorage.setItem(`qrmenu:favorites:${site.id}`, JSON.stringify([...favorites]));
  }, [favorites, favoritesReady, site.id]);

  const localizedSite = useMemo(() => {
    const translated = site.translations?.[locale];
    return {
      ...site,
      name: translated?.name || site.name,
      subtitle: translated?.subtitle || site.subtitle,
      footerText: translated?.footerText || site.footerText,
    };
  }, [site, locale]);

  const localizedCategories = useMemo(() => categories.map((category) => {
    const translated = category.translations?.[locale];
    return { ...category, name: translated?.name || category.name, description: translated?.description || category.description };
  }), [categories, locale]);

  const localizedProducts = useMemo(() => products.map((product) => {
    const translated = product.translations?.[locale];
    return {
      ...product,
      name: translated?.name || product.name,
      description: translated?.description || product.description,
      ingredients: translated?.ingredients || product.ingredients,
      allergens: translated?.allergens || product.allergens,
      note: translated?.note || product.note,
      badge: translated?.badge || product.badge,
    };
  }), [products, locale]);

  const selected = localizedProducts.find((product) => product.id === selectedId) ?? null;
  const activeCategoryRow = localizedCategories.find((category) => category.id === activeCategory);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale);
    const allowedCategoryIds = activeCategory ? descendantIds(activeCategory, categories) : null;
    return localizedProducts.filter((product) => {
      const searchable = `${product.name} ${product.description ?? ""} ${product.ingredients ?? ""} ${product.badge ?? ""}`.toLocaleLowerCase(locale);
      const queryMatches = !q || searchable.includes(q);
      const categoryMatches = !allowedCategoryIds || productCategories.some((link) => link.productId === product.id && allowedCategoryIds.has(link.categoryId));
      return queryMatches && categoryMatches;
    });
  }, [localizedProducts, productCategories, query, activeCategory, categories, locale]);

  const rootCategories = localizedCategories.filter((category) => !category.parentId);
  const siblingParentId = activeCategoryRow?.parentId ?? activeCategoryRow?.id ?? null;
  const subCategories = siblingParentId ? localizedCategories.filter((category) => category.parentId === siblingParentId) : [];
  const showFavorites = site.theme.showFavorites ?? true;
  const heroVisible = data.sections.some((section) => section.type === "hero");
  const bodySections = data.sections.filter((section) => section.type !== "hero");
  const fontStack = site.theme.fontFamily === "serif"
    ? "Georgia, 'Times New Roman', serif"
    : site.theme.fontFamily === "rounded"
      ? "'Trebuchet MS', ui-rounded, system-ui, sans-serif"
      : "Inter, ui-sans-serif, system-ui, sans-serif";
  const terminology = site.theme.terminology ?? {};

  function productCards(rows: typeof localizedProducts) {
    return <div className={`menu-products ${site.theme.productLayout === "list" ? "list" : ""}`}>
      {rows.map((product) => (
        <article className={`menu-product-card ${product.isAvailable ? "" : "unavailable"}`} key={product.id} onClick={() => setSelectedId(product.id)}>
          <div className="product-picture">{product.imageUrl ? <img className="media-image" src={product.imageUrl} alt="" loading="lazy" decoding="async" /> : null}
            {!product.isAvailable ? <span className="product-badge sold-out">{terminology.soldOutLabel || copy.soldOut}</span> : product.badge ? <span className="product-badge">{product.badge}</span> : null}
            {showFavorites ? <button type="button" aria-label="Favori" className={`fav ${favorites.has(product.id) ? "active" : ""}`} onClick={(event) => { event.stopPropagation(); setFavorites((prev) => { const next = new Set(prev); if (next.has(product.id)) next.delete(product.id); else next.add(product.id); return next; }); }}><Heart size={18} fill={favorites.has(product.id) ? "currentColor" : "none"} /></button> : null}
          </div>
          <div className="product-copy"><h3>{product.name}</h3><p>{product.description}</p><div className="product-price"><div>{product.compareAtPriceKurus ? <del>{money(product.compareAtPriceKurus, site.currency, locale)}</del> : null}<strong>{money(product.priceKurus, site.currency, locale)}</strong></div>{product.note ? <span>{product.note}</span> : null}</div></div>
        </article>
      ))}
    </div>;
  }

  const searchBlock = <label className="menu-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={terminology.searchPlaceholder || copy.search} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Aramayı temizle"><X size={16} /></button>}</label>;

  const categoriesBlock = <div className="category-area">
    <div className="category-strip category-strip-rich">
      <button type="button" className={!activeCategory ? "category-pill active" : "category-pill"} onClick={() => setActiveCategory(null)}>{copy.all}</button>
      {rootCategories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? "category-pill active" : "category-pill"} onClick={() => setActiveCategory(category.id)}>{category.imageUrl ? <img className="category-pill-image" src={category.imageUrl} alt="" loading="lazy" decoding="async" /> : null}<span>{category.name}</span></button>)}
    </div>
    {subCategories.length ? <div className="subcategory-strip">{subCategories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? "subcategory-pill active" : "subcategory-pill"} onClick={() => setActiveCategory(category.id)}>{category.name}</button>)}</div> : null}
  </div>;

  const productsBlock = <section className="menu-section">
    <div className="section-title"><div><span className="eyebrow">{localizedSite.name} {terminology.menuTitle || "MENU"}</span><h2>{activeCategoryRow?.name ?? (query ? copy.searchResults : copy.allProducts)}</h2></div><span>{visibleProducts.length} {terminology.productsLabel || copy.products}</span></div>
    {productCards(visibleProducts)}
    {!visibleProducts.length ? <div className="empty-state">{copy.noResults}</div> : null}
  </section>;

  const businessBlock = <section className="info-card-grid">
    {site.wifiName ? <div className="info-card"><Wifi size={20} /><div><span>{copy.wifi}</span><strong>{site.wifiName}</strong>{site.wifiPassword ? <small>{copy.password}: {site.wifiPassword}</small> : null}</div></div> : null}
    <div className="info-card"><Clock3 size={20} /><div><span>{copy.today}</span><strong>{status.label}</strong></div></div>
    {site.address ? <div className="info-card full"><MapPin size={20} /><div><span>{copy.address}</span><strong>{site.address}</strong></div></div> : null}
    {site.phone ? <a className="info-card" href={`tel:${site.phone}`}><Phone size={20} /><div><span>{copy.phone}</span><strong>{site.phone}</strong></div></a> : null}
    {site.whatsapp ? <a className="info-card" href={`https://wa.me/${site.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>WhatsApp</span><strong>{copy.sendMessage}</strong></div></a> : null}
    {site.instagram ? <a className="info-card" href={socialHref("instagram", site.instagram)} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>Instagram</span><strong>{site.instagram}</strong></div></a> : null}
    {site.facebook ? <a className="info-card" href={socialHref("facebook", site.facebook)} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>Facebook</span><strong>{copy.openProfile}</strong></div></a> : null}
    {site.tiktok ? <a className="info-card" href={socialHref("tiktok", site.tiktok)} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>TikTok</span><strong>{copy.openProfile}</strong></div></a> : null}
    {site.website ? <a className="info-card" href={socialHref("website", site.website)} target="_blank" rel="noreferrer"><ExternalLink size={20} /><div><span>Web</span><strong>{copy.visit}</strong></div></a> : null}
  </section>;

  function renderSection(section: MenuData["sections"][number]) {
    const config = localizedSectionConfig(section.config, locale);
    if (section.type === "search") return searchBlock;
    if (section.type === "quick-categories") return categoriesBlock;
    if (section.type === "menu") return productsBlock;
    if (section.type === "featured") {
      const featured = localizedProducts.filter((product) => product.isFeatured && product.isActive);
      if (!featured.length) return null;
      return <section className="menu-section"><div className="section-title"><div>{config.eyebrow ? <span className="eyebrow">{config.eyebrow}</span> : null}<h2>{config.title || "Öne çıkanlar"}</h2></div></div>{productCards(featured)}</section>;
    }
    if (section.type === "announcement") {
      const href = safeHref(config.ctaUrl);
      return <section className="content-card announcement-block">{config.eyebrow ? <span className="eyebrow">{config.eyebrow}</span> : null}<h2>{config.title}</h2>{config.body ? <p>{config.body}</p> : null}{href && config.ctaLabel ? <a className="content-cta" href={href}>{config.ctaLabel}</a> : null}</section>;
    }
    if (section.type === "gallery") {
      const items = config.items ?? [];
      if (!items.length) return null;
      return <section className="menu-section"><div className="section-title"><div>{config.eyebrow ? <span className="eyebrow">{config.eyebrow}</span> : null}<h2>{config.title || "Galeri"}</h2></div></div><div className={`menu-gallery ${config.layout || "grid"}`}>{items.map((item, index) => { const href = safeHref(item.url); const tile = <div className="gallery-tile">{item.imageUrl ? <img className="media-image" src={item.imageUrl} alt="" loading="lazy" decoding="async" /> : null}<div>{item.title ? <strong>{item.title}</strong> : null}{item.text ? <span>{item.text}</span> : null}</div></div>; return href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" key={index}>{tile}</a> : <Fragment key={index}>{tile}</Fragment>; })}</div></section>;
    }
    if (section.type === "links") {
      const items = (config.items ?? []).filter((item) => safeHref(item.url));
      if (!items.length) return null;
      return <section className="menu-section"><div className="section-title"><div><h2>{config.title || "Bağlantılar"}</h2></div></div><div className="menu-link-grid">{items.map((item, index) => <a className="menu-link-card" href={safeHref(item.url)!} target={item.url?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" key={index}><div><strong>{item.label || item.title || "Bağlantı"}</strong>{item.text ? <span>{item.text}</span> : null}</div><ExternalLink size={18} /></a>)}</div></section>;
    }
    if (section.type === "custom-text") return <section className="content-card custom-text-block">{config.eyebrow ? <span className="eyebrow">{config.eyebrow}</span> : null}{config.title ? <h2>{config.title}</h2> : null}{config.body ? <p>{config.body}</p> : null}</section>;
    if (section.type === "business-info") return businessBlock;
    if (section.type === "footer") return <footer className="menu-footer">{localizedSite.footerText ?? `${localizedSite.name} · Dijital Menü`}</footer>;
    return null;
  }

  return (
    <div className="menu-page" style={{
      "--menu-bg": site.theme.background,
      "--menu-card": site.theme.card,
      "--menu-text": site.theme.text,
      "--menu-muted": site.theme.muted,
      "--menu-accent": site.theme.accent,
      "--menu-accent-soft": site.theme.accentSoft,
      "--menu-radius": `${site.theme.radius}px`,
      "--hero-height": `${site.theme.heroHeight}px`,
      "--menu-font": fontStack,
    } as React.CSSProperties}>
      <div className="menu-shell">
        {heroVisible ? <header className="menu-hero" style={site.coverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(10,10,10,.18), rgba(10,10,10,${site.theme.heroOverlay ?? 0.62})), url(${site.coverUrl})` } : undefined}>
          <div className="hero-top">
            {(site.theme.showHoursBadge ?? true) ? <span className={`hero-chip ${status.open ? "open" : ""}`}><Clock3 size={14} /> {status.label}</span> : <span />}
            {(site.theme.showLanguage ?? true) && locales.length > 1 ? <div className="language-switcher">{locales.map((item) => <button type="button" key={item} className={item === locale ? "active" : ""} onClick={() => setLocale(item)}>{item.split("-")[0].toUpperCase()}</button>)}</div> : null}
          </div>
          <div className="hero-copy">
            {site.logoUrl ? <img className="menu-logo" src={site.logoUrl} alt="" decoding="async" /> : null}
            <h1>{localizedSite.name}</h1><p>{localizedSite.subtitle}</p>
          </div>
        </header> : <header className="minimal-menu-header"><div><h1>{localizedSite.name}</h1><p>{localizedSite.subtitle}</p></div><span className={status.open ? "mini-status open" : "mini-status"}>{status.open ? copy.open : copy.closed}</span></header>}

        <div className="menu-content">{bodySections.map((section) => <Fragment key={section.id}>{renderSection(section)}</Fragment>)}</div>
      </div>

      {selected ? <div className="modal-backdrop" onClick={() => setSelectedId(null)}><div className="product-modal" role="dialog" aria-modal="true" aria-label={selected.name} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setSelectedId(null)} aria-label="Kapat"><X /></button><div className="modal-image">{selected.imageUrl ? <img className="media-image" src={selected.imageUrl} alt="" decoding="async" /> : null}</div><div className="modal-copy">{!selected.isAvailable ? <span className="product-badge inline sold-out">{terminology.soldOutLabel || copy.soldOut}</span> : selected.badge ? <span className="product-badge inline">{selected.badge}</span> : null}<h2>{selected.name}</h2><div className="modal-prices">{selected.compareAtPriceKurus ? <del>{money(selected.compareAtPriceKurus, site.currency, locale)}</del> : null}<strong className="modal-price">{money(selected.priceKurus, site.currency, locale)}</strong></div><p>{selected.description}</p>{selected.ingredients ? <div className="detail-line"><span>{terminology.ingredientsLabel || copy.ingredients}</span><b>{selected.ingredients}</b></div> : null}{selected.allergens ? <div className="detail-line"><span>{terminology.allergensLabel || copy.allergens}</span><b>{selected.allergens}</b></div> : null}{selected.note ? <div className="detail-line"><span>{copy.note}</span><b>{selected.note}</b></div> : null}</div></div></div> : null}
    </div>
  );
}
