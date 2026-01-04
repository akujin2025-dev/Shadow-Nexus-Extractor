import { execSync } from "child_process";

function run(command) {
  console.log(`\n==============================`);
  console.log(`Running: ${command}`);
  console.log(`==============================\n`);

  try {
    execSync(command, { stdio: "inherit" });
  } catch (err) {
    console.error(`\n❌ Failed while running: ${command}`);
    console.error(err.message);
    process.exit(1);
  }
}

console.log("\n🚀 Starting full extraction pipeline…");

run("node extract_officers.js");
run("node extract_officer_details.js");

console.log("\n✅ All extraction stages complete.");
