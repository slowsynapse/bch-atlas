# BCH Atlas Test System

Comprehensive test system to prevent database accidents and ensure data integrity.

## Purpose

This test system was created after a production incident where both `.env.local` and `.env.production.local` pointed to the same database, causing data loss when running destructive operations locally.

## Quick Start

```bash
# Run all critical tests before pushing
npm run test:pre-push

# Individual test commands
npm run test:env-safety    # Check for same database in multiple envs
npm run test:db-health     # Verify database connectivity and schema
npm run test:db-counts     # Validate expected data is present
npm run test:all           # Run all tests sequentially
```

## Test Structure

```
tests/
├── 1-environment/
│   ├── env-safety-check.ts    # CRITICAL: Prevents same DB usage
│   └── pre-push-guard.ts      # Runs all critical checks before push
├── 2-health/
│   ├── db-health-check.ts     # Database connectivity and schema
│   └── db-record-counts.ts    # Validates expected data counts
├── 3-data/                    # (Future: data integrity tests)
├── 4-api/                     # (Future: API endpoint tests)
└── 5-frontend/                # (Future: Puppeteer frontend tests)
```

## Test Descriptions

### 1. Environment Safety Check (CRITICAL)
**File:** `tests/1-environment/env-safety-check.ts`
**Command:** `npm run test:env-safety`

**Purpose:** Prevents the catastrophic error of using the same database for both local development and production.

**What it checks:**
- Reads `.env.local` and `.env.production.local`
- Extracts database hosts from connection strings
- Fails if both environments use the same database host

**When to run:**
- BEFORE any destructive database operations
- BEFORE running `prisma db push --accept-data-loss`
- BEFORE database migrations
- When setting up new environments

**Exit codes:**
- `0`: Safe - different databases detected
- `1`: CRITICAL - same database detected

### 2. Database Health Check
**File:** `tests/2-health/db-health-check.ts`
**Command:** `npm run test:db-health`

**Purpose:** Verifies database is accessible and schema is correct.

**What it checks:**
- Database connection successful
- All required tables exist (Campaign, Recipient, Entity)
- Basic queries can be executed
- Schema matches Prisma model

**When to run:**
- When database connection issues occur
- After schema changes
- When troubleshooting production issues

**Exit codes:**
- `0`: Database is healthy
- `1`: Connection or schema issues detected

### 3. Database Record Counts
**File:** `tests/2-health/db-record-counts.ts`
**Command:** `npm run test:db-counts`

**Purpose:** Validates expected data is present, detects data loss.

**What it checks:**
- Campaign count (expected: 225, min: 220)
- Recipient count (expected: 149, min: 140)
- Entity count
- Date coverage percentage
- Status distribution

**When to run:**
- After database seeding
- When suspecting data loss
- After database migrations
- Before deploying to production

**Exit codes:**
- `0`: Counts within expected range
- `1`: CRITICAL data loss detected

### 4. Pre-Push Guard
**File:** `tests/1-environment/pre-push-guard.ts`
**Command:** `npm run test:pre-push`

**Purpose:** Runs all critical tests before pushing code or deploying.

**What it runs:**
- Environment Safety Check (CRITICAL)
- Database Health Check (CRITICAL)
- Database Record Counts (INFO)

**When to run:**
- BEFORE pushing code to git
- BEFORE deploying to Vercel
- BEFORE making production changes
- As part of CI/CD pipeline

**Exit codes:**
- `0`: All checks passed, safe to push
- `1`: Critical failures, push blocked

## Incident Prevention

### The Original Problem

On 2025-11-25, production showed 0 campaigns due to:

1. Both `.env.local` and `.env.production.local` used the same Neon database
2. Running `npx prisma db push --accept-data-loss` locally dropped production tables
3. All data was lost and had to be re-seeded

### How This System Prevents It

1. **env-safety-check.ts** would have detected the configuration issue
2. **pre-push-guard.ts** would have blocked the deployment
3. **db-record-counts.ts** would have immediately detected data loss

### Recommended Workflow

```bash
# Before ANY destructive database operation:
npm run test:env-safety

# If it fails, DO NOT PROCEED until fixed!

# After database operations:
npm run test:db-health
npm run test:db-counts

# Before pushing code:
npm run test:pre-push
```

## Expected Values

### Current Production State (as of 2025-11-25)

- **Campaigns:** 225 total
  - Success: 150 (66.7%)
  - Failed: 73 (32.4%)
  - Running: 2 (0.9%)

- **Date Coverage:** 181/225 (80.4%)
  - Success campaigns: 96.7% have dates
  - Failed campaigns: dates extracted from archive URLs

- **Recipients:** 149 total
  - Not all campaigns have recipient addresses

## Future Enhancements

### Planned Tests (Not Yet Implemented)

- **3-data/** - Data integrity tests
  - Validate address formats
  - Check for duplicate campaigns
  - Verify transaction IDs match blockchain

- **4-api/** - API endpoint tests
  - Test /api/campaigns with filters
  - Validate response formats
  - Performance benchmarks

- **5-frontend/** - Frontend tests
  - Puppeteer tests for campaign listing
  - Filter functionality
  - Sorting validation
  - Graph view rendering

## Contributing

When adding new tests:

1. Place in appropriate directory (1-5)
2. Follow naming convention: `[purpose]-[type].ts`
3. Include clear error messages and troubleshooting steps
4. Add npm script to `package.json`
5. Update this README
6. Mark tests as CRITICAL if they prevent data loss

## Emergency Recovery

If production data is lost:

```bash
# 1. Verify database state
npm run test:db-health

# 2. Check if tables exist
npx prisma db push

# 3. Re-seed database
npm run db:seed

# 4. Verify data restored
npm run test:db-counts

# 5. Check production with Puppeteer
# Use MCP Puppeteer to verify: https://app-nextjs-synaptic-enterprises.vercel.app/campaigns
```

## Critical Reminders

⚠️ **NEVER** run `prisma db push --accept-data-loss` without first running `npm run test:env-safety`

⚠️ **ALWAYS** run `npm run test:pre-push` before deploying to production

⚠️ **VERIFY** `.env.local` and `.env.production.local` use different databases

⚠️ **CHECK** production with Puppeteer after major database changes
