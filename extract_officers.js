import fs from "fs";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const BASE_URL = "https://stfc.space/officers?page=";

async function scrapePage(pageNum) {
  const url = `${BASE_URL}${pageNum}`;
  console.log(`Scraping page ${pageNum}…`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load page ${pageNum}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const officers = [];

  $("li.stfc-table-result__row").each((_, el) => {
    const name = $(el).find("component.font-bold").text().trim();
    const group = $(el).find("p component").text().trim();
    const rarity = $(el).find("span[aria-label]").attr("aria-label") || "";
    const img = $(el).find("img").attr("src") || "";
    const link = $(el).find("a.stfc-table-row-link").attr("href") || "";

    officers.push({
      name,
      group,
      rarity,
      img,
      link: `https://stfc.space${link}`,
    });
  });

  console.log(`Collected ${officers.length} officers from page ${pageNum}.`);
  return officers;
}

async function run() {
  try {
    let all = [];

    // STFC.space has 14 pages of officers
    for (let page = 1; page <= 14; page++) {
      const officers = await scrapePage(page);
      all = all.concat(officers);
      await new Promise((r) => setTimeout(r, 500)); // polite delay
    }

    fs.writeFileSync(
      "/data/officers.json",
      JSON.stringify({ officers: all }, null, 2)
    );

    console.log(`Extraction complete. Total officers: ${all.length}`);
  } catch (err) {
    console.error("Extractor failed:", err);
    process.exit(1);
  }
}

run();
