import fs from "fs";
import * as cheerio from "cheerio";

const BASE_URL = "https://stfc.space/officers?page=";
const OUTPUT_PATH = "/data/officers.json";

async function fetchPage(page) {
  const url = `${BASE_URL}${page}`;
  console.log(`Fetching page ${page}: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch page ${page}: ${res.status}`);
  }

  return await res.text();
}

function extractOfficerLinks(html) {
  const $ = cheerio.load(html);
  const officers = [];

  // Extract ANY link that matches /officers/{id}
  $('a[href^="/officers/"]').each((_, el) => {
    const href = $(el).attr("href");

    // Validate format
    if (!href) return;
    const parts = href.split("/");
    const id = parts.pop();

    if (!id || isNaN(Number(id))) return;

    officers.push({
      id,
      path: href
    });
  });

  return officers;
}

async function run() {
  try {
    console.log("Starting corrected officer list extractor…");

    let all = [];
    let page = 1;

    while (true) {
      const html = await fetchPage(page);
      const officers = extractOfficerLinks(html);

      if (officers.length === 0) {
        console.log(`No officer links found on page ${page}. Stopping.`);
        break;
      }

      console.log(`Found ${officers.length} officer links on page ${page}.`);
      all = all.concat(officers);

      page++;
      await new Promise((r) => setTimeout(r, 300)); // polite delay
    }

    // Save as a pure array (required by detail extractor)
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(all, null, 2));
    console.log(`Saved ${all.length} officers to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error("List extractor failed:", err);
    process.exit(1);
  }
}

run();
