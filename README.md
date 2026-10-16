# StudyCircle

Collaborative study groups: chat, shared resources, and progress tracking.
Built with Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Prisma, Neon Postgres, and Auth.js v5.

## Setup

Requires Node.js 18.18 or later.

1. Create a project at https://neon.tech and copy the pooled and direct connection strings.
2. `cp .env.example .env` and fill in `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET` (`npx auth secret`).
3. Install and create the tables:

```bash
npm install
npm run db:push
npm run dev
```

Open http://localhost:3000.

## Structure

```
prisma/schema.prisma     Data model (users, groups, memberships, posts, messages, resources, reactions, sessions)
src/auth.ts              Auth.js config (credentials + bcrypt)
src/auth.config.ts       Edge-safe config and route protection rules
src/middleware.ts        Protects /dashboard and /groups
src/app/actions/         Server actions (register, login, logout)
src/app/(auth)/          Login and register pages
src/app/(app)/           Pages for signed-in users
```

## Roadmap

1. Foundation (done): schema, auth, layout, dashboard
2. Groups: create, join by invite link, roles
3. Posts, resources, reactions
4. Real-time chat and notifications
5. Progress tracking and the rest of the roadmap
