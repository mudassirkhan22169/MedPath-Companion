# MedPath – AI Ward & Clinical Companion

A full-stack medical education web app for MBBS students. Includes an AI clinical assistant, disease library, drug guide, lab investigation interpreter, and personal clinical notes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/medpath run dev` — run the frontend (port 25554, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — express-session secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter routing
- API: Express 5 with express-session auth
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- AI: Replit AI Integrations (OpenAI-compatible, gpt-5.6-luna) with rule-based fallback

## Where things live

- `artifacts/medpath/src/` — React frontend (pages, components, auth context)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, notes, diseases, drugs, investigations, ai, dashboard)
- `lib/db/src/schema/` — Drizzle table definitions (users, notes, diseases, drugs, lab_investigations)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation (do not edit)

## Architecture decisions

- Session-based auth using express-session with SESSION_SECRET env var
- bcryptjs for password hashing
- Diseases, drugs, and investigations are seeded reference data (not user-specific)
- Notes are user-specific and require authentication
- AI chat uses Replit AI Integrations with a rule-based fallback for common clinical queries
- Frontend uses localStorage to persist auth state; backend provides /api/auth/me, /api/auth/login, /api/auth/register, /api/auth/logout

## Product

MedPath is an AI ward companion for MBBS students with:
- Disease Library (12+ diseases with full clinical details)
- Drug Guide (10+ drugs with mechanism, dosage, interactions)
- Lab Investigation Interpreter (15+ lab tests with AI interpretation)
- AI Clinical Assistant (OpenAI-powered with fallback responses)
- Personal Clinical Notes (CRUD, search, tags, pin)
- Student Dashboard with study stats

## User preferences

_Populate as you build._

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before restarting workflows
- `pnpm --filter @workspace/db run push` pushes schema to dev DB; production schema is managed by Replit's Publish flow
- Do not use `console.log` in server code — use `req.log` in route handlers and `logger` for non-request code
- Express 5 wildcard routes require names: `/{*splat}` not `*`
- AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY are auto-set by Replit AI integration

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
