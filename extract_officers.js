import fs from "fs";

const URL = "https://stfcapi.com/api/officers";

async function run() {
  try {
    console.log("Fetching officer data from STFCAPI.com...");

    const res = await fetch(URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch API: ${res.status}`);
    }

    const officers = await res.json();

    console.log(`Received ${officers.length} officers.`);

    // Write to Railway volume
    fs.writeFileSync(
      "/data/officers.json",
      JSON.stringify({ officers }, null, 2)
    );

    console.log("Extraction complete. Saved to /data/officers.json");
  } catch (err) {
    console.error("Extractor failed:", err);
    process.exit(1);
  }
}

run();
