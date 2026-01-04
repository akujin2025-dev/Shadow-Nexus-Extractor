import { chromium } from "playwright";
import fs from "fs";

const OUTPUT = "/data/officers.json";

async function run() {
  console.log("Starting Playwright officer list extractor…");

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto("https://stfc.space/officers?page=1", {
    waitUntil: "networkidle",
    timeout: 60000
  });

  // Wait for officer rows to appear
  await page.waitForSelector("a.stfc-table-row-link", { timeout: 60000 });

  const officers = await page.$$eval("a.stfc-table-row-link", (links) =>
    links.map((a) => {
      const href = a.getAttribute("href");
      const id = href.split("/").pop();
      const name = a.querySelector(".font-bold")?.textContent?.trim() || null;
      return { id, path: href, name };
    })
  );

  fs.writeFileSync(OUTPUT, JSON.stringify(officers, null, 2));
  console.log(`Saved ${officers.length} officers to ${OUTPUT}`);

  await browser.close();
}

run().catch((err) => {
  console.error("List extractor failed:", err);
  process.exit(1);
});
