import fs from "fs";
import * as cheerio from "cheerio";

const BASE = "https://stfc.space/officers?page=";

async function fetchPage(page) {
  const url = `${BASE}${page}`;
  console.log(`Fetching page ${page}: ${url}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch page ${page}`);

  const html = await res.text();
  return cheerio.load(html);
}

function parseOfficers($) {
  const officers = [];

  $("li.stfc-table-result__row").each((_, el) => {
    const row = $(el);

    const link = row.find("a.stfc-table-row-link").attr("href") || "";
    const id = link.split("/").pop();

    const name = row.find("component.font-bold").text().trim();
    const group = row.find("p component").text().trim();

    const rarityEl = row.find("span[aria-label]");
    const rarity = rarityEl.attr("aria-label") || "";

    const img = row.find("img").attr("src") || "";

    officers.push({
      id,
      name,
      group,
      rarity,
      image: img
    });
  });

  return officers;
}

async function run() {
  try {
    console.log("Starting Cheerio extractor…");

    let all = [];
    let page = 1;

    while (true) {
      const $ = await fetchPage(page);
      const officers = parseOfficers($);

      if (officers.length === 0) {
        console.log(`No officers found on page ${page}. Stopping.`);
        break;
      }

      console.log(`Collected ${officers.length} officers from page ${page}.`);
      all = all.concat(officers);

      page++;
      await new Promise(r => setTimeout(r, 500)); // polite delay
    }

    fs.writeFileSync(
      "/data/officers.json",
      JSON.stringify({ officers: all }, null, 2)
    );

    console.log(`Saved ${all.length} officers to /data/officers.json`);
  } catch (err) {
    console.error("Extractor failed:", err);
    process.exit(1);
  }
}

run();
