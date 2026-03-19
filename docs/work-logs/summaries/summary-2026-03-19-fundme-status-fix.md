# Summary: Fix FundMe Status Mapping

**Date:** 2026-03-19

## Problem

FundMe.cash API returns status `'stopped'` for both successfully funded campaigns and failed ones. The `mapStatus` function in `scripts/fetch-fundme.ts` mapped all `'stopped'` to `'expired'`, misclassifying ~79 funded campaigns.

## Fix

Updated `mapStatus` to accept `raised` and `amount` parameters. Added a check before the status string mapping: if `raised >= amount && amount > 0`, return `'success'`. This ensures campaigns that met their funding goal are correctly classified regardless of API status.

## Files Changed

- `scripts/fetch-fundme.ts` — `mapStatus` signature + logic, `transformCampaign` call site
- `data/fundme.json` — regenerated with corrected statuses

## Verification

- `npx tsx scripts/fetch-fundme.ts` — 101 campaigns fetched, 0 failed
- Status distribution: 79 success, 20 expired, 1 running, 1 unknown
- `npm run build` — passes
