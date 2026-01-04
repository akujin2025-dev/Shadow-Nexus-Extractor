// extract_officer_details.js
const { chromium } = require('playwright');
const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = process.env.DATA_PATH || '/data';
const OFFICERS_LIST_PATH = path.join(DATA_DIR, 'officers.json');
const OFFICER_DETAILS_PATH = path.join(DATA_DIR, 'officer_details.json');

async function loadOfficerList() {
  try {
    const raw = await fs.readFile(OFFICERS_LIST_PATH, 'utf8');
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

async function saveOfficerDetails(details) {
  try {
    await fs.writeFile(
      OFFICER_DETAILS_PATH,
      JSON.stringify(details, null, 2),
      'utf8'
    );
    console.log(`Saved ${details.length} officer details to ${OFFICER_DETAILS_PATH}`);
  } catch (err) {
    console.error(`Failed to write ${OFFICER_DETAILS_PATH}:`, err.message);
  }
}

// Helper: handle the “stuck here, press Reload” shell
async function ensureAppLoaded(page) {
  // Wait for network to settle a bit
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

  const stuckText = page.locator('text=If you are stuck here, press the Reload Button');
  const isStuck = await stuckText.first().isVisible().catch(() => false);

  if (isStuck) {
    console.log('Detected service-worker shell. Clicking Reload button…');
    const reloadButton = page.locator('button:has-text("Reload")');
    if (await reloadButton.first().isVisible().catch(() => false)) {
      await reloadButton.first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    }
  }
}

async function run() {
  console.log('Starting Playwright officer detail extractor…');

  const officers = await loadOfficerList();
  if (!officers.length) {
    console.log('No officers in list. Exiting.');
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const details = [];

  for (const officer of officers) {
    const url = officer.url || officer.link || officer.href;
    if (!url) {
      console.warn('Officer missing URL field, skipping:', officer);
      continue;
    }

    console.log(`Fetching details for ${officer.name || officer.id || 'Unknown'} (${officer.id || 'no-id'})`);

    try {
      // --- NAVIGATION BLOCK (this is the part we’re “replacing”) ---
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await ensureAppLoaded(page);

      // Wait for the real officer page to render.
      // If your previous extractor used a different selector than 'h1',
      // you can swap it here.
      await page.waitForSelector('h1', { timeout: 60000 });

      // --- SCRAPING BLOCK (adjust selectors as needed) ---
      const name = (await page.locator('h1').first().textContent().catch(() => '')).trim();

      const rarity = (await page
        .locator('text=Rarity')
        .locator('xpath=following-sibling::*[1]')
        .first()
        .textContent()
        .catch(() => '')).trim();

      const group = (await page
        .locator('text=Group')
        .locator('xpath=following-sibling::*[1]')
        .first()
        .textContent()
        .catch(() => '')).trim();

      const officerClass = (await page
        .locator('text=Class')
        .locator('xpath=following-sibling::*[1]')
        .first()
        .textContent()
        .catch(() => '')).trim();

      const captainAbility = (await page
        .locator('text=Captain Maneuver')
        .locator('xpath=following-sibling::*[1]')
        .first()
        .textContent()
        .catch(() => '')).trim();

      const officerAbility = (await page
        .locator('text=Officer Ability')
        .locator('xpath=following-sibling::*[1]')
        .first()
        .textContent()
        .catch(() => '')).trim();

      const traits = await page
        .locator('text=Traits')
        .locator('xpath=following-sibling::*[1] li')
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
  console.error('Detail extractor crashed:', err);
  process.exit(1);
});
