import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import {
  businessHours,
  categories,
  productCategories,
  products,
  siteSections,
  sites,
} from "./schema";
import { slugify } from "../lib/slugify";

const categorySeed = [
  { slug: "popular", name: "Popüler", imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=500&q=82", sortOrder: 0 },
  { slug: "breakfast", name: "Kahvaltı", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=500&q=82", sortOrder: 1 },
  { slug: "main", name: "Yemekler", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=82", sortOrder: 2 },
  { slug: "coffee", name: "Kahveler", imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=500&q=82", sortOrder: 3 },
  { slug: "dessert", name: "Tatlılar", imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=82", sortOrder: 4 },
  { slug: "cold", name: "Soğuklar", imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=500&q=82", sortOrder: 5 },
];

const productSeed = [
  { name: "Mira Burger", price: 420, badge: "Çok Sevilen", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=86", description: "Smash dana köfte, cheddar, karamelize soğan ve özel sos.", ingredients: "Dana köfte, brioche, cheddar, soğan, turşu, özel sos", allergens: "Gluten, süt, yumurta", note: "180 g", cats: ["popular", "main"] },
  { name: "San Sebastian", price: 260, badge: "Öne Çıkan", imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=86", description: "Yoğun krem peynirli, yanık yüzeyli klasik cheesecake.", ingredients: "Krem peynir, krema, yumurta, şeker", allergens: "Süt, yumurta", note: "Dilim", cats: ["popular", "dessert"] },
  { name: "Iced Latte", price: 210, badge: null, imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=700&q=86", description: "Çift espresso, soğuk süt ve buz.", ingredients: "Double espresso, süt, buz", allergens: "Süt", note: "350 ml", cats: ["popular", "cold"] },
  { name: "Pesto Tavuk", price: 390, badge: null, imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=700&q=86", description: "Izgara tavuk, parmesan ve fesleğenli pesto makarna.", ingredients: "Tavuk, makarna, pesto, parmesan, krema", allergens: "Gluten, süt, kuruyemiş", note: "Ana yemek", cats: ["popular", "main"] },
  { name: "Avokado Tost", price: 320, badge: "Vejetaryen", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=700&q=86", description: "Ekşi maya, avokado, poşe yumurta ve taze yeşillikler.", ingredients: "Ekşi maya, avokado, yumurta, roka, cherry domates", allergens: "Gluten, yumurta", note: "Kahvaltı", cats: ["breakfast"] },
  { name: "Kruvasan Tabağı", price: 280, badge: null, imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=700&q=86", description: "Tereyağlı kruvasan, peynir, reçel ve mevsim meyveleri.", ingredients: "Kruvasan, peynir, reçel, meyve", allergens: "Gluten, süt, yumurta", note: "Günlük", cats: ["breakfast"] },
  { name: "Granola Bowl", price: 250, badge: null, imageUrl: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=700&q=86", description: "Yoğurt, granola, taze meyve ve bal.", ingredients: "Yoğurt, granola, muz, çilek, bal", allergens: "Süt, gluten, kuruyemiş", note: "Soğuk", cats: ["breakfast"] },
  { name: "Eggs Benedict", price: 340, badge: "Şef Önerisi", imageUrl: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=700&q=86", description: "Poşe yumurta, brioche ve hollandez sos.", ingredients: "Yumurta, brioche, tereyağı, hollandez", allergens: "Yumurta, süt, gluten", note: "Sıcak", cats: ["breakfast"] },
  { name: "Trüflü Makarna", price: 360, badge: null, imageUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=700&q=86", description: "Krema, parmesan, mantar ve trüf dokunuşu.", ingredients: "Makarna, krema, parmesan, mantar, trüf yağı", allergens: "Gluten, süt", note: "Vejetaryen", cats: ["main"] },
  { name: "Izgara Somon", price: 560, badge: "Yeni", imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=700&q=86", description: "Izgara somon, mevsim sebzeleri ve limon sos.", ingredients: "Somon, sebze, limon, zeytinyağı", allergens: "Balık", note: "220 g", cats: ["main"] },
  { name: "Flat White", price: 200, badge: null, imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=700&q=86", description: "Çift espresso ve kadifemsi mikro köpüklü süt.", ingredients: "Double espresso, süt", allergens: "Süt", note: "200 ml", cats: ["coffee"] },
  { name: "Americano", price: 190, badge: null, imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=86", description: "Espresso ve sıcak su. Temiz, güçlü ve sade.", ingredients: "Double espresso, sıcak su", allergens: "—", note: "240 ml", cats: ["coffee"] },
  { name: "Caramel Macchiato", price: 220, badge: "Yeni", imageUrl: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=700&q=86", description: "Espresso, süt, vanilya ve karamel.", ingredients: "Espresso, süt, vanilya, karamel", allergens: "Süt", note: "220 ml", cats: ["coffee"] },
  { name: "Türk Kahvesi", price: 120, badge: null, imageUrl: "https://images.unsplash.com/photo-1587985782608-20062892559d?auto=format&fit=crop&w=700&q=86", description: "Geleneksel yöntemle ağır ateşte pişirilir.", ingredients: "Türk kahvesi, su", allergens: "—", note: "70 ml", cats: ["coffee"] },
  { name: "Tiramisu", price: 250, badge: null, imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=700&q=86", description: "Espresso, mascarpone kreması ve kakao.", ingredients: "Mascarpone, espresso, kakao, kedi dili", allergens: "Süt, yumurta, gluten", note: "Günlük", cats: ["dessert"] },
  { name: "Chocolate Cake", price: 240, badge: null, imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=700&q=86", description: "Yoğun bitter çikolatalı yumuşak katlı pasta.", ingredients: "Çikolata, un, yumurta, krema", allergens: "Gluten, süt, yumurta", note: "Dilim", cats: ["dessert"] },
  { name: "Berry Cheesecake", price: 260, badge: null, imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=700&q=86", description: "Cheesecake ve taze orman meyveleri.", ingredients: "Krem peynir, meyve, bisküvi, krema", allergens: "Süt, gluten", note: "Dilim", cats: ["dessert"] },
  { name: "Cold Brew", price: 220, badge: "14 Saat", imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=700&q=86", description: "Uzun süre soğuk demlenmiş, düşük asiditeli kahve.", ingredients: "Cold brew kahve, buz", allergens: "—", note: "350 ml", cats: ["cold"] },
  { name: "Ev Limonatası", price: 160, badge: null, imageUrl: "https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?auto=format&fit=crop&w=700&q=86", description: "Taze limon, nane ve dengeli şeker.", ingredients: "Limon, su, nane, şeker", allergens: "—", note: "350 ml", cats: ["cold"] },
  { name: "Berry Soda", price: 180, badge: "Ferahlık", imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=86", description: "Orman meyveleri, lime, soda ve buz.", ingredients: "Orman meyvesi, lime, soda, buz", allergens: "—", note: "400 ml", cats: ["cold"] },
];

async function seed() {
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: sites.id }).from(sites).where(eq(sites.slug, "mira"));
    if (existing[0]) await tx.delete(sites).where(eq(sites.id, existing[0].id));

    const [site] = await tx
      .insert(sites)
      .values({
        name: "MIRA",
        slug: "mira",
        subtitle: "Kitchen · Coffee · Lounge",
        coverUrl: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=88",
        wifiName: "MIRA Guest",
        footerText: "MIRA · Dijital Menü",
      })
      .returning({ id: sites.id });

    await tx.insert(siteSections).values([
      { siteId: site.id, type: "hero", label: "Hero", sortOrder: 0 },
      { siteId: site.id, type: "search", label: "Arama", sortOrder: 1 },
      { siteId: site.id, type: "quick-categories", label: "Hızlı kategoriler", sortOrder: 2 },
      { siteId: site.id, type: "menu", label: "Menü", sortOrder: 3 },
      { siteId: site.id, type: "business-info", label: "İşletme bilgileri", sortOrder: 4 },
      { siteId: site.id, type: "footer", label: "Footer", sortOrder: 5 },
    ]);

    await tx.insert(businessHours).values(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        siteId: site.id,
        dayOfWeek,
        openTime: "08:00",
        closeTime: "00:00",
      })),
    );

    const insertedCategories = await tx
      .insert(categories)
      .values(categorySeed.map((category) => ({ ...category, siteId: site.id })))
      .returning({ id: categories.id, slug: categories.slug });
    const categoryBySlug = new Map(insertedCategories.map((category) => [category.slug, category.id]));

    const [mainCategory] = insertedCategories.filter((category) => category.slug === "main");
    await tx.insert(categories).values([
      { siteId: site.id, parentId: mainCategory.id, name: "Burgerler", slug: "burgers", sortOrder: 0 },
      { siteId: site.id, parentId: mainCategory.id, name: "Makarnalar", slug: "pastas", sortOrder: 1 },
    ]);

    for (const [sortOrder, product] of productSeed.entries()) {
      const [inserted] = await tx
        .insert(products)
        .values({
          siteId: site.id,
          name: product.name,
          slug: slugify(product.name),
          description: product.description,
          ingredients: product.ingredients,
          allergens: product.allergens,
          note: product.note,
          imageUrl: product.imageUrl,
          badge: product.badge,
          priceKurus: product.price * 100,
          isFeatured: product.cats.includes("popular"),
          sortOrder,
        })
        .returning({ id: products.id });

      await tx.insert(productCategories).values(
        product.cats.map((catSlug, index) => ({
          productId: inserted.id,
          categoryId: categoryBySlug.get(catSlug)!,
          sortOrder: index,
        })),
      );
    }
  });
}

seed()
  .then(async () => {
    console.log("MIRA demo site seeded");
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
