import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";

const BASE = "https://stfc.space";

async function fetchHTML(url) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Shadow-Nexus-Extractor" }
  });
  return cheerio.load(data);
}

async function extractOfficerList() {
  const $ = await fetchHTML(`${BASE}/officers/`);
  const officers = [];

  $("a.officer-card").each((_, el) => {
    const url = $(el).attr("href");
    if (url && url.startsWith("/officer/")) {
      officers.push(BASE + url);
    }
  });

  return officers;
}

function clean(text) {
  return text?.trim().replace(/\s+/g, " ") || "";
}

async function extractOfficer(url) {
  const $ = await fetchHTML(url);

  const name = clean($("h1").first().text());
  const portrait = $(".officer-portrait img").attr("src") || null;

  const rarity = clean($(".rarity").text());
  const group = clean($(".group").text());

  const captainAbility = {
    name: clean($("#captain-ability h3").text()),
    description: clean($("#captain-ability .ability-description").text())
  };

  const officerAbility = {
    name: clean($("#officer-ability h3").text()),
    description: clean($("#officer-ability .ability-description").text())
  };

  const stats = {
    attack: clean($(".stats .attack .value").text()),
    defense: clean($(".stats .defense .value").text()),
    health: clean($(".stats .health .value").text())
  };

  const traits = [];
  $(".traits .trait").each((_, el) => {
    traits.push(clean($(el).text()));
  });

  const synergy = [];
  $(".synergy .synergy-item").each((_, el) => {
    const group = clean($(el).find(".group").text());
    const value = clean($(el).find(".value").text());
    synergy.push({ group, value });
  });

  return {
    name,
    rarity,
    group,
    portrait: portrait ? BASE + portrait : null,
    captain_ability: captainAbility,
    officer_ability: officerAbility,
    stats,
    traits,
    synergy,
    lastUpdated: new Date().toISOString(),
    source_url: url
  };
}

async function run() {
  console.log("Fetching officer list...");
  const list = await extractOfficerList();

  console.log(`Found ${list.length} officers. Extracting...`);

  const officers = [];

  for (const url of list) {
    try {
      console.log("Extracting:", url);
      const data = await extractOfficer(url);
      officers.push(data);
    } catch (err) {
      console.error("Failed to extract:", url, err.message);
    }
  }

  const output = {
    source: "stfc-space",
    lastRun: new Date().toISOString(),
    officers
  };

  fs.writeFileSync("output.json", JSON.stringify(output, null, 2));
  console.log("Extraction complete. Saved to output.json");
}

run();
