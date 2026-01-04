import fs from "fs";
import fetch from "node-fetch";
import cheerio from "cheerio";

const BASE_URL = "https://stfc.space/officers?page=";
const OUTPUT_PATH = "/data/officers.json";

async function scrapePage(pageNumber) {
  const url = `${BASE_URL}${pageNumber}`;
  console.log(`Scraping page ${pageNumber}…`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch page ${pageNumber}: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const officers = [];

  $("li.stfc-table-result__row").each((_, el) => {
    const row = $(el);

    const link = row.find("a.stfc-table-row-link").attr("href") || "";
    const id = link.split("/").pop();

    const name = row.find("component.font-bold").text().trim();

    const rarity =
      row.find("span[aria-label]").attr("aria-label")?.trim() || "Unknown";

    const crew = row.find("p component").text().trim();

    const img = row.find("img").attr("src") || "";

    officers.push({
      id,
      name,
      rarity,
      crew,
      image: img
    });
  });

  console.log(`Collected ${officers.length} officers from page ${pageNumber}.`);
  return officers;
}

async function run() {
  try {
    console.log("Starting STFC officer extraction…");

    const allOfficers = [];

    // STFC.space has 14 pages of officers
    for (let page = 1; page <= 14; page++) {
      const officers = await scrapePage(page);
      allOfficers.push(...officers);
    }

    console.log(`Total officers collected: ${allOfficers.length}`);

    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify({ officers: allOfficers }, null, 2)
    );

    console.log(`Extraction complete. Saved to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("Extractor failed:", err);
    process.exit(1);
  }
}

run();
