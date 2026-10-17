# StudyCircle

Collaborative study groups ("circles"): chat, shared resources, and progress tracking.
Built with Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Prisma, PostgreSQL, and Auth.js v5.

## Setup

Requires Node.js 18.18 or later.

1. Get a PostgreSQL database. Either works:
   - Neon (https://neon.tech): copy the pooled and direct connection strings.
   - Prisma Postgres through the Vercel integration: it provides one direct connection string.
2. Create a `.env` file in the project root (`cp .env.example .env`) and fill in:

   ```
   DATABASE_URL="postgresql://..."   # pooled string (or the single string)
   DIRECT_URL="postgresql://..."     # direct, non-pooled string (or the same single string)
   AUTH_SECRET="..."                 # generate with: npx auth secret
   ```

   Prisma reads `.env`, not `.env.local`, so keep the database URLs in `.env`.
3. Install, create the tables, add the demo data, and run:

   ```bash
   npm install
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   npm run dev
   ```

Open http://localhost:3000.

### Demo admin account (development only)

`npx tsx prisma/seed.ts` creates a demo circle (`/groups/demo`) and this account, which is its OWNER:

- Email: `admin@studycircle.test`
- Password: `ChangeMe123!`

Change the password, or skip the seed, before deploying anywhere public.

### Deploying (Vercel)

- Add `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` under Project Settings, Environment Variables.
- Add `"postinstall": "prisma generate"` to the `scripts` in `package.json` so the Prisma client is built during installs.

## Roles

Roles live on the membership, so a person can be an admin of one circle and a regular member of another.

| Role | Meaning |
| --- | --- |
| OWNER | Created the circle. Can see the invite link and manage the circle. |
| ADMIN | Can see the invite link and manage the circle. |
| MODERATOR | Reserved for moderation tools (pinning, removing posts). |
| MEMBER | Default role for anyone who joins by invite link. |

## How invites work

1. An OWNER or ADMIN opens the circle page and copies the invite link (`/join/<inviteCode>`).
2. Someone who is logged out is sent to `/login?redirectTo=/join/<inviteCode>`, signs in or registers, and lands back on the join page.
3. They press **Join circle** and become a MEMBER. Existing members are never downgraded.

## Structure

```
prisma/schema.prisma        Data model (users, groups, memberships, posts, messages, resources, reactions, study sessions)
prisma/seed.ts              Demo admin account and demo circle
src/auth.ts                 Auth.js config (credentials + bcrypt)
src/auth.config.ts          Edge-safe config, route protection, and session callbacks
src/middleware.ts           Protects /dashboard, /groups, and /join
src/lib/db.ts               Prisma client (single shared instance)
src/lib/validations.ts      Zod schemas and the FormState type
src/app/actions/auth.ts     Server actions: register, login, logout
src/app/actions/groups.ts   Server actions: createGroup, joinGroup
src/app/(auth)/             Login and register pages
src/app/(app)/              Pages for signed-in users (dashboard, groups, join)
src/components/             Shared components (logo, auth form)
```

## Troubleshooting

- **`MissingSecret`**: `AUTH_SECRET` is not set. Add it to `.env` and restart the dev server.
- **`no matching decryption secret`**: an old session cookie was made with a different `AUTH_SECRET`. Clear the site's cookies.
- **`Environment variable not found: DIRECT_URL`**: the schema reads `DATABASE_URL` and `DIRECT_URL`, so both names must exist in `.env`.
- **`EPERM` while running `prisma generate` on Windows**: stop the dev server and any other Node process, then run it again.
- **Red error on `@prisma/client` after `npm install`**: run `npx prisma generate`, then restart the TypeScript server in your editor.
- **Two pages resolve to the same path**: route groups like `(app)` do not change the URL, so do not create the same route inside and outside them.

## Roadmap

1. Foundation (done): schema, auth, layout, dashboard
2. Groups (mostly done): create a circle, join by invite link, roles. Still to build: change roles and remove members
3. Posts, resources, reactions
4. Real-time chat and notifications
5. Progress tracking and the rest of the roadmap