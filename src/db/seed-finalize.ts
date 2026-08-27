import { eq } from "drizzle-orm";
import { db, pool } from "./index";
import { siteSections, sites } from "./schema";
import { defaultSectionConfig } from "../lib/sections";

async function finalize() {
  const allSites = await db.select({ id: sites.id }).from(sites);
  for (const site of allSites) {
    const sections = await db.select({ type: siteSections.type }).from(siteSections).where(eq(siteSections.siteId, site.id));
    const types = new Set(sections.map((row) => row.type));
    const additions = [];
    if (!types.has("announcement")) additions.push({ siteId: site.id, type: "announcement", label: "Duyuru", isVisible: false, sortOrder: 1, config: defaultSectionConfig("announcement") });
    if (!types.has("featured")) additions.push({ siteId: site.id, type: "featured", label: "Öne çıkanlar", isVisible: true, sortOrder: 4, config: defaultSectionConfig("featured") });
    if (additions.length) await db.insert(siteSections).values(additions);
  }
}

finalize()
  .then(async () => {
    console.log("Flexible section defaults finalized");
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
