import fs from "fs";

const API_URL = "https://stfc.space/api/officers";

async function run() {
  try {
    console.log("Fetching officer data from STFC.space API...");

    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch API: ${res.status}`);
    }

    const officers = await res.json();

    console.log(`Received ${officers.length} officers.`);

    fs.writeFileSync("output.json", JSON.stringify(officers, null, 2));

    console.log("Extraction complete. Saved to output.json");
  } catch (err) {
    console.error("Extractor failed:", err);
    process.exit(1);
  }
}

run();
