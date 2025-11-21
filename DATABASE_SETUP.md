# Database Setup Guide

## Step 1: Create Vercel Postgres Database

1. Go to https://vercel.com/synaptic-enterprises/app-nextjs/stores
2. Click **"Create Database"**
3. Select **"Postgres"** (powered by Neon)
4. Name: `bch-atlas`
5. Region: Choose closest to your location
6. Click **"Create"**
7. Click **"Connect to Project"** and select `app-nextjs`

## Step 2: Pull Environment Variables

After creating the database, pull the environment variables:

```bash
vercel env pull .env.local
```

This will download the Postgres connection strings:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

## Step 3: Generate Prisma Client

```bash
npx prisma generate
```

## Step 4: Push Database Schema

Push the schema to create all tables:

```bash
npm run db:push
```

This will create:
- `Campaign` table
- `Recipient` table
- `Entity` table

## Step 5: Seed the Database

Import all 225 campaigns from JSON to database:

```bash
npm run db:seed
```

This will:
- Clear existing data
- Import all campaigns from `data/flipstarters-with-addresses.json`
- Create recipients for each campaign
- Show progress during import

## Step 6: Verify Data

Open Prisma Studio to view your data:

```bash
npm run db:studio
```

This opens a browser UI at http://localhost:5555

## Available Commands

- `npm run db:migrate` - Create and run migrations
- `npm run db:push` - Push schema changes (no migration files)
- `npm run db:seed` - Seed database with campaign data
- `npm run db:studio` - Open Prisma Studio UI

## Next Steps

After seeding, update the app to use the database:

1. Replace `/src/lib/data/campaigns.ts` to fetch from Prisma
2. Add API routes for filtering/searching
3. Enable server-side rendering with database queries

## Troubleshooting

### Connection Error
If you get connection errors, make sure:
- `.env.local` has the latest environment variables
- Database was created in Vercel dashboard
- Database is connected to your project

### Seed Fails
If seeding fails:
- Check database connection
- Verify JSON data format
- Look at error messages for specific issues

### Schema Changes
After modifying `prisma/schema.prisma`:
```bash
npm run db:push  # Push changes
npx prisma generate  # Regenerate client
```
