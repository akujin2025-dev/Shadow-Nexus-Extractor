import * as cheerio from "cheerio";
import fs from "fs";

// Base URL for officer list
const BASE_URL = "https://stfc.space";

// Fetch helper using native fetch
async function fetchHTML(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return await res.text();
}

async function extractOfficerList() {
  console.log("Fetching officer list...");
  const html = await fetchHTML(`${BASE_URL}/officers/`);
  const $ = cheerio.load(html);

  const officers = [];

  $(".officer-card").each((i, el) => {
    const name = $(el).find(".officer-card__name").text().trim();
    const link = $(el).find("a").attr("href");
    const rarity = $(el).find(".officer-card__rarity").text().trim();
    const group = $(el).find(".officer-card__group").text().trim();
    const portrait = $(el).find("img").attr("src");

    if (name && link) {
      officers.push({
        name,
        rarity,
        group,
        portrait: portrait ? BASE_URL + portrait : null,
        url: BASE_URL + link
      });
    }
  });

  console.log(`Found ${officers.length} officers.`);
  return officers;
}

async function extractOfficerDetails(officer) {
  console.log(`Extracting ${officer.name}...`);
  const html = await fetchHTML(officer.url);
  const $ = cheerio.load(html);

  const captainAbility = $(".ability--captain .ability__description").text().trim();
  const officerAbility = $(".ability--officer .ability__description").text().trim();

  const stats = {};
  $(".stats__item").each((i, el) => {
    const label = $(el).find(".stats__label").text().trim();
    const value = $(el).find(".stats__value").text().trim();
    if (label && value) stats[label] = value;
  });

  const traits = [];
  $(".traits__item").each((i, el) => {
    traits.push($(el).text().trim());
  });

  return {
    ...officer,
    captainAbility,
    officerAbility,
    stats,
    traits
  };
}

async function run() {
  try {
    const list = await extractOfficerList();
    const results = [];

    for (const officer of list) {
      const details = await extractOfficerDetails(officer);
      results.push(details);
    }

    fs.writeFileSync("output.json", JSON.stringify(results, null, 2));
    console.log("Extraction complete. Saved to output.json");
  } catch (err) {
    console.error("Extractor failed:", err);
    process.exit(1);
  }
}

run();
