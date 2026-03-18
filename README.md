# Voting Platform

Next.js + Prisma skeleton for online voting, admin panel, admin auth, PDF exports and reminders.

## Quick start

1. Copy `.env.example` to `.env` and fill values.
2. Install deps: `npm install`
3. Run migrations: `npx prisma migrate dev --name init`
4. Seed data: `npm run prisma:seed`
5. Start: `npm run dev`

## Test data

Admin login:
- email: `admin@example.com`
- password: `Admin123!`

Voting token:
- `vote_demo_token_123456`

Voting URL:
- `/vote/vote_demo_token_123456`
