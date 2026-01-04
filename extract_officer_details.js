import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = "/data";
const OFFICERS_LIST_PATH = path.join(DATA_DIR, "officers.json");
const OFFICER_DETAILS_PATH = path.join(DATA_DIR, "officer_details.json");

// Load officers.json
async function loadOfficerList() {
  try {
    const raw = await fs.readFile(OFFICERS_LIST_PATH, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      console.error(`officers.json is not an array. Got: ${typeof parsed}`);
      return [];
    }

    console.log(`Loaded ${parsed.length} officers from ${OFFICERS_LIST_PATH}`);
    return parsed;
  } catch (err) {
    console.error(`Failed to read ${OFFICERS_LIST_PATH}:`, err.message);
    return [];
  }
}

// Save officer_details.json
async function saveOfficerDetails(details) {
  try {
    await fs.writeFile(
      OFFICER_DETAILS_PATH,
      JSON.stringify(details, null, 2),
      "utf8"
    );
    console.log(`Saved ${details.length} officer details to ${OFFICER_DETAILS_PATH}`);
  } catch (err) {
    console.error(`Failed to write ${OFFICER_DETAILS_PATH}:`, err.message);
  }
}

// Detect & fix the PWA fallback shell
async function ensureAppLoaded(page) {
  await page.waitForLoadState("networkidle").catch(() => {});

  const stuck = await page
    .locator('text=If you are stuck here')
    .first()
    .isVisible()
    .catch(() => false);

  if (stuck) {
    console.log("Detected PWA fallback shell. Clicking Reload…");

    const reloadButton = page.locator('button:has-text("Reload")');
    if (await reloadButton.first().isVisible().catch(() => false)) {
      await reloadButton.first().click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }
}

async function run() {
  console.log("Starting Playwright officer detail extractor…");

  const officers = await loadOfficerList();
  if (!officers.length) {
    console.log("No officers in list. Exiting.");
    return;
  }

  // ⭐ HEADLESS FIX + ANTI-BOT FLAGS
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  const page = await browser.newPage();

  // ⭐ Realistic browser fingerprint
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  await page.setViewportSize({ width: 1280, height: 900 });

  const details = [];

  for (const officer of officers) {
    // ⭐ URL FIX — build full URL from officer.path
    const url = `https://stfc.space${officer.path}`;

    console.log(`Fetching details for ${officer.name} (${officer.id})`);

    try {
      // --- SPA‑SAFE NAVIGATION ---
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await ensureAppLoaded(page);

      // ⭐ Allow hydration to complete
      await page.waitForTimeout(2000);

      // Wait for officer name to appear
      await page.waitForSelector("h1", { timeout: 60000 });

      // --- SCRAPE FIELDS ---
      const name = (
        await page.locator("h1").first().textContent().catch(() => "")
      ).trim();

      const rarity = (
        await page
          .locator("text=Rarity")
          .locator("xpath=following-sibling::*[1]")
          .first()
          .textContent()
          .catch(() => "")
      ).trim();

      const group = (
        await page
          .locator("text=Group")
          .locator("xpath=following-sibling::*[1]")
          .first()
          .textContent()
          .catch(() => "")
      ).trim();

      const officerClass = (
        await page
          .locator("text=Class")
          .locator("xpath=following-sibling::*[1]")
          .first()
          .textContent()
          .catch(() => "")
      ).trim();

      const captainAbility = (
        await page
          .locator("text=Captain Maneuver")
          .locator("xpath=following-sibling::*[1]")
          .first()
          .textContent()
          .catch(() => "")
      ).trim();

      const officerAbility = (
        await page
          .locator("text=Officer Ability")
          .locator("xpath=following-sibling::*[1]")
          .first()
          .textContent()
          .catch(() => "")
      ).trim();

      const traits = await page
        .locator("text=Traits")
        .locator("xpath=following-sibling::*[1] li")
        .allTextContents()
        .catch(() => []);

      details.push({
        id: officer.id,
        url,
        name,
        rarity,
        group,
        class: officerClass,
        captainAbility,
        officerAbility,
        traits,
      });
    } catch (err) {
      console.error(`Failed to fetch details for ${url}:`, err.message);
    }
  }

  await saveOfficerDetails(details);
  await browser.close();
}

run().catch((err) => {
  console.error("Detail extractor crashed:", err);
  process.exit(1);
});
