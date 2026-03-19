# Plan: FundMe.cash Campaign Ingestion

## Date: 2026-03-19

## Discovery

FundMe.cash has a simple REST API — no Puppeteer/scraping needed:

- `GET https://fundme.cash/get-campaignlist` → returns array of campaign IDs (101 campaigns)
- `GET https://fundme.cash/get-campaign/{id}` → returns full campaign data as JSON

## Data Available Per Campaign

Each campaign response includes:
- `campaignID` — numeric ID
- Campaign title and description (HTML)
- `ownersAddress` — BCH address of campaign creator
- Financial data: amount raised, goal, percentage funded
- `pledges` — array with name, message, amount per pledge
- `status` — "stopped", "active", etc
- `updates` — campaign update history
- `logo`, `banner` — base64 encoded images
- `isComplete` — boolean

## Task

1. **Create a fetch script** at `scripts/fetch-fundme.ts` that:
   - Fetches the campaign list from `https://fundme.cash/get-campaignlist`
   - Iterates through all IDs, fetching each campaign from `https://fundme.cash/get-campaign/{id}`
   - Adds a 500ms delay between requests to be polite
   - Transforms each campaign into our Campaign interface format (see `src/types/campaign.ts`)
   - Saves the result to `data/fundme.json`

2. **Transform mapping:**
   - `id` → generate using the same `generateId()` pattern from `src/lib/data/campaigns.ts` but with platform='fundme'
   - `platform` → 'fundme'
   - `title` → from campaign response
   - `description` → strip HTML tags from description
   - `amount` → goal amount in BCH (parse from response)
   - `raised` → amount raised in BCH
   - `status` → map: "stopped"/"canceled" → 'expired', "active"/"running" → 'running', completed/funded → 'success'
   - `url` → `https://fundme.cash/?id={campaignID}`
   - `recipientAddresses` → array with `ownersAddress` (trim whitespace)
   - `entities` → empty array (will be populated by entity extractor)
   - `time` → use current date if no date available
   - `tx` → undefined (no tx hash in FundMe data)

3. **Update `src/lib/data/campaigns.ts`** to:
   - Import `data/fundme.json`
   - Merge FundMe campaigns with Flipstarter campaigns in `getCampaigns()`
   - The TODO comment already exists for this

4. **Run the script** to generate `data/fundme.json`

5. **Verify** with `npm run build` that the merged data works correctly

## Important Notes

- Do NOT modify existing `data/*.json` files
- The new `data/fundme.json` is a NEW file, not a protected one
- Be polite to FundMe.cash API — add delays between requests
- Strip base64 image data from the saved JSON (we don't need logo/banner data, it bloats the file)
- Handle errors gracefully — some campaign IDs may return errors

## Success Criteria

- `data/fundme.json` exists with ~100 FundMe campaigns
- `npm run build` passes
- Homepage shows updated campaign count (225 + ~100 = ~325)
- FundMe campaigns appear in the graph with different coloring
- Campaign list page shows both Flipstarter and FundMe campaigns
