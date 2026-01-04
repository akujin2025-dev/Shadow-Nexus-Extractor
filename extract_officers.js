import fs from "fs";

const URL = "https://stfc.space/api/officers";

async function run() {
  try {
    console.log("Fetching officer data from STFC.space...");

    const res = await fetch(URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch API: ${res.status}`);
    }

    const officers = await res.json();

    console.log(`Received ${officers.length} officers.`);

    // WRITE TO RAILWAY VOLUME
    fs.writeFileSync("/data/officers.json", JSON.stringify({ officers }, null, 2));

    console.log("Extraction complete. Saved to /data/officers.json");
  } catch (err) {
    console.error("Extractor failed:", err);
    process.exit(1);
  }
}

run();
