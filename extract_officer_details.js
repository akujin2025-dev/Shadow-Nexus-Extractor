import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = "/data";
const LIST_PATH = path.join(DATA_DIR, "officers.json");
const OUTPUT_PATH = path.join(DATA_DIR, "officer_details.json");

async function run() {
  console.log("Starting Playwright officer detail extractor…");

  const raw = await fs.readFile(LIST_PATH, "utf8");
  const officers = JSON.parse(raw);

  if (!Array.isArray(officers) || officers.length === 0) {
    console.log("No officers found in list. Exiting.");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];

  for (const officer of officers) {
    const url = `https://stfc.space${officer.path}`;
    console.log(`Fetching details for ${officer.name} (${officer.id})`);

    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    // Wait for officer name to appear
    await page.waitForSelector("h1", { timeout: 60000 });

    const data = await page.evaluate(() => {
      const name = document.querySelector("h1")?.textContent?.trim() || null;
      const img = document.querySelector("img")?.src || null;
      const group = document.querySelector("p")?.textContent?.trim() || null;

      return { name, img, group };
    });

    results.push({
      id: officer.id,
      path: officer.path,
      ...data
    });
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} officer details to ${OUTPUT_PATH}`);

  await browser.close();
}

run().catch((err) => {
  console.error("Detail extractor failed:", err);
  process.exit(1);
});
