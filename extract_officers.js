import fs from "fs";

const URL = "https://stfc.pro/api/officers";

async function run() {
  try {
    console.log("Fetching officer data from STFC.pro...");

    const res = await fetch(URL);
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
