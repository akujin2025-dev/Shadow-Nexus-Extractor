import fs from "fs";
import fetch from "node-fetch";
import cheerio from "cheerio";

const BASE = "https://stfc.space/officers?page=";

async function scrapePage(pageNum) {
  const url = `${BASE}${pageNum}`;
  console.log(`Scraping page ${pageNum}…`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load page ${pageNum}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const rows = $(".stfc-table-result__row");
  if (rows.length === 0) return null; // no more pages

  const officers = [];

  rows.each((i, el) => {
    const row = $(el);

    const link = row.find("a.stfc-table-row-link").attr("href") || "";
    const id = link.split("/").pop();

    const name = row.find("component.font-bold").text().trim();
    const crew = row.find("p component").text().trim();

    const rarityEl = row.find("span[aria-label]");
    const rarity = rarityEl.attr("aria-label") || "Unknown";

    const img = row.find("img").attr("src") || null;

    officers.push({
      id,
      name,
      crew,
      rarity,
      image: img
    });
  });

  console.log(`Collected ${officers.length} officers from page ${pageNum}.`);
  return officers;
}

async function run() {
  try {
    let page = 1;
    let all = [];

    while (true) {
      const data = await scrapePage(page);
      if (!data) break;
      all = all.concat(data);
      page++;
    }

    console.log(`Total officers collected: ${all.length}`);

    fs.writeFileSync(
      "/data/officers.json",
      JSON.stringify({ officers: all }, null, 2)
    );

    console.log("Saved to /data/officers.json");
  } catch (err) {
    console.error("Extractor failed:", err);
    process.exit(1);
  }
}

run();
