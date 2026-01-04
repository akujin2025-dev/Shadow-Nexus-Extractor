import fs from "fs/promises";
import path from "path";
import * as cheerio from "cheerio";

const BASE_URL = "https://stfc.space";

const DATA_DIR = process.env.DATA_DIR || "/data";
const OFFICERS_LIST_PATH = path.join(DATA_DIR, "officers.json");
const OFFICER_DETAILS_PATH = path.join(DATA_DIR, "officer_details.json");

async function readOfficersList() {
  try {
    const raw = await fs.readFile(OFFICERS_LIST_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      console.error("officers.json is not an array. Got:", typeof data);
      return [];
    }
    console.log(`Loaded ${data.length} officers from ${OFFICERS_LIST_PATH}`);
    return data;
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`No officers.json found at ${OFFICERS_LIST_PATH}`);
    } else {
      console.error("Error reading officers.json:", err);
    }
    return [];
  }
}

async function fetchOfficerPage(relativePath) {
  const url = relativePath.startsWith("http")
    ? relativePath
    : `${BASE_URL}${relativePath}`;

  console.log(`Fetching officer detail: ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AllianceBot/1.0; +https://stfc.space)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

/**
 * Very conservative parser:
 * - officer name: first <h1> text
 * - group/faction: first small/secondary text near header (best guess)
 * - main image: first <img> inside main content
 *
 * We can refine selectors once we inspect a saved HTML sample.
 */
function parseOfficerDetail(html, officerMeta = {}) {
  const $ = cheerio.load(html);

  // Name: try <h1>, fallback to existing meta
  const name =
    $("h1").first().text().trim() ||
    officerMeta.name ||
    officerMeta.displayName ||
    null;

  // Group/faction: best guess—often near header in a <p>, <small>, or similar
  let group = null;
  const headerContainer = $("h1").first().parent();
  if (headerContainer && headerContainer.length) {
    const maybeGroup = headerContainer
      .find("p, small, span")
      .first()
      .text()
      .trim();
    if (maybeGroup && maybeGroup !== name) {
      group = maybeGroup;
    }
  }

  // Main image: first image in main content area
  let imageUrl = null;
  const mainImg =
    $("main img").first().attr("src") ||
    $(".stfc-officer img").first().attr("src") ||
    $("img").first().attr("src");

  if (mainImg) {
    imageUrl = mainImg.startsWith("http") ? mainImg : `${BASE_URL}${mainImg}`;
  }

  // Example: ability/traits placeholders (we’ll refine later)
  const abilities = [];
  $(".stfc-ability, .stfc-officer-ability").each((_, el) => {
    const title = $(el).find("h2, h3, .ability-title").first().text().trim();
    const desc = $(el).find("p, .ability-description").first().text().trim();
    if (title || desc) {
      abilities.push({ title: title || null, description: desc || null });
    }
  });

  return {
    id: officerMeta.id ?? null,
    slug: officerMeta.slug ?? null,
    path: officerMeta.path ?? officerMeta.url ?? null,
    name,
    group,
    imageUrl,
    rarity: officerMeta.rarity ?? null,
    tags: officerMeta.tags ?? [],
    abilities,
  };
}

async function saveOfficerDetails(details) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    OFFICER_DETAILS_PATH,
    JSON.stringify(details, null, 2),
    "utf8"
  );
  console.log(
    `Saved ${details.length} officer detail records to ${OFFICER_DETAILS_PATH}`
  );
}

async function run() {
  console.log("Starting officer-detail extractor…");

  const officers = await readOfficersList();
  if (!officers.length) {
    console.log("No officers in list. Exiting.");
    return;
  }

  const results = [];

  for (const officer of officers) {
    const relPath =
      officer.path ||
      officer.url ||
      (officer.id ? `/officers/${officer.id}` : null);

    if (!relPath) {
      console.warn(
        `Skipping officer without path/url/id: ${JSON.stringify(officer)}`
      );
      continue;
    }

    try {
      const html = await fetchOfficerPage(relPath);

      // Optional: dump first few pages for inspection/debug
      if (results.length < 3) {
        const debugPath = path.join(
          DATA_DIR,
          `debug_officer_${officer.id || results.length + 1}.html`
        );
        await fs.writeFile(debugPath, html, "utf8");
        console.log(`Saved debug HTML for ${officer.name} to ${debugPath}`);
      }

      const parsed = parseOfficerDetail(html, officer);
      results.push(parsed);
    } catch (err) {
      console.error(
        `Error processing officer ${officer.name || officer.id}:`,
        err.message
      );
    }
  }

  await saveOfficerDetails(results);
  console.log("Officer-detail extraction complete.");
}

run().catch((err) => {
  console.error("Fatal error in officer-detail extractor:", err);
  process.exit(1);
});
