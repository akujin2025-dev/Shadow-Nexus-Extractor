import fs from "fs";

const GRAPHQL_URL = "https://stfc.space/graphql";

async function run() {
  try {
    console.log("Fetching officer data from STFC.space GraphQL API...");

    const query = `
      query {
        officers {
          id
          name
          group
          rarity
          portrait
          captain_ability
          officer_ability
          stats {
            health
            attack
            defense
          }
          traits
        }
      }
    `;

    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    if (!res.ok) {
      throw new Error(`GraphQL request failed: ${res.status}`);
    }

    const json = await res.json();

    if (!json.data || !json.data.officers) {
      throw new Error("GraphQL response missing officer data");
    }

    const officers = json.data.officers;

    console.log(`Received ${officers.length} officers.`);

    fs.writeFileSync("output.json", JSON.stringify(officers, null, 2));

    console.log("Extraction complete. Saved to output.json");
  } catch (err) {
    console.error("Extractor failed:", err);
    process.exit(1);
  }
}

run();
