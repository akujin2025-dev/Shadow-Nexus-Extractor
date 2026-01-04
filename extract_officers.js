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
    waitUntil: "networkidle",
    timeout: 60000
  });

  await page.waitForTimeout(3000);

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
