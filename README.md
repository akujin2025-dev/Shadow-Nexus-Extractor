# Shadow Nexus Extractor

This service extracts officer data from STFC.space using Playwright and saves it to a Railway volume at `/data/officers.json`.

## Run locally
docker build -t extractor .
docker run extractor

## Deploy on Railway
- Set Build Type: Dockerfile
- No start command needed (Dockerfile handles it)
