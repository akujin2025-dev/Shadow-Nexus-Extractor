import fs from "fs";
import { chromium } from "playwright";

async function run() {
  console.log("Launching headless browser…");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  let officerData = null;

  // Capture internal API call
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/officers")) {
      try {
        officerData = await response.json();
        console.log("Captured officer JSON from internal API.");
      } catch (err) {
        console.error("Failed to parse officer JSON:", err);
      }
    }
  });

  console.log("Navigating to STFC.space officers page…");
  await page.goto("https://stfc.space/officers/", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  // Wait for React to mount
  await page.waitForTimeout(2000);

  // Scroll to trigger lazy-loaded officer list
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  // Give time for the API call to fire
  await page.waitForTimeout(4000);

  await browser.close();

  if (!officerData) {
    console.error("Failed to capture officer data.");
    process.exit(1);
  }

  fs.writeFileSync(
    "/data/officers.json",
    JSON.stringify({ officers: officerData }, null, 2)
  );

  console.log("Extraction complete. Saved to /data/officers.json");
}

run();
