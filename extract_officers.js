import fs from "fs";
import { chromium } from "playwright";

async function run() {
  console.log("Launching headless browser…");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  console.log("Navigating to STFC.space officers page…");
  await page.goto("https://stfc.space/officers/", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  // Wait for React to mount
  await page.waitForTimeout(2000);

  let allOfficers = [];
  let currentPage = 1;

  while (true) {
    console.log(`Scraping page ${currentPage}…`);

    // Wait for officer rows to appear
    await page.waitForSelector(".stfc-table-result__row", { timeout: 15000 });

    // Extract officers from DOM
    const officers = await page.$$eval(".stfc-table-result__row", rows =>
      rows.map(row => {
        const link = row.querySelector("a.stfc-table-row-link");
        const href = link?.getAttribute("href") || "";
        const id = href.split("/").pop();

        const img = row.querySelector("img");
        const image = img?.src || null;

        const name = row.querySelector("component.font-bold")?.textContent?.trim() || null;

        const raritySpan = row.querySelector("span[aria-label]");
        const rarity = raritySpan?.getAttribute("aria-label") || null;

        const crew = row.querySelector("p component")?.textContent?.trim() || null;

        return { id, name, rarity, crew, image };
      })
    );

    allOfficers.push(...officers);

    console.log(`Collected ${officers.length} officers from page ${currentPage}.`);

    // Try to click "Next" button
    const nextButton = await page.$('a[aria-label="Next"], a:has-text("Next")');

    if (!nextButton) {
      console.log("No Next button found. Pagination complete.");
      break;
    }

    const disabled = await nextButton.getAttribute("class");
    if (disabled?.includes("cursor-not-allowed") || disabled?.includes("disabled")) {
      console.log("Next button disabled. Reached final page.");
      break;
    }

    await nextButton.click();
    currentPage++;

    // Wait for new page to load
    await page.waitForTimeout(2000);
  }

  await browser.close();

  console.log(`Total officers collected: ${allOfficers.length}`);

  // Write to Railway volume
  fs.writeFileSync(
    "/data/officers.json",
    JSON.stringify({ officers: allOfficers }, null, 2)
  );

  console.log("Extraction complete. Saved to /data/officers.json");
}

run();
