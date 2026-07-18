---
name: MedPath v2 Upgrade Decisions
description: Key decisions, patterns, and gotchas from the MedPath OSCE/Calculators/WardRound upgrade
---

**Why:** These decisions were non-obvious and would be slow to re-derive from reading code.

**New DB tables added (lib/db/src/schema/):**
- `bookmarks` — userId, type, itemId, itemName, itemCategory
- `search_history` — userId, query, type (default "ai")
- `osce_sessions` — userId, caseData (jsonb), studentAnswer, aiFeedback, score, maxScore, specialty, status

**New API routes (artifacts/api-server/src/routes/):**
- `bookmarks.ts` — GET/POST/DELETE /bookmarks; DELETE /bookmarks/item/:type/:itemId
- `search-history.ts` — GET/POST/DELETE /search-history
- `osce.ts` — POST /osce/generate, POST /osce/evaluate, GET /osce/history, GET /osce/specialties

**AI structured format:** ai.ts system prompt enforces 13-section clinical response (Definition, Causes, Risk Factors, Symptoms, Differential, History Questions, PE, Investigations, Management, Drug Treatment, Clinical Pearls, Red Flags, Patient Education). Fallback responses also follow this format for diabetes, hypertension, MI, pneumonia.

**Frontend patterns:**
- OSCE, bookmarks, search-history use raw `fetch()` with `credentials: 'include'` (not codegen hooks — no OpenAPI spec written for them)
- Ward Round Checklist is fully localStorage-based — no backend
- Calculators are purely frontend — no backend
- AI assistant uses custom `StructuredResponse` component to parse **bold headers** into styled clinical sections
- Mobile bottom nav shows 5 items: Dashboard, AI, OSCE, Calculators, Notes (replaced old Drug Guide/Library items)
- Desktop sidebar shows all 10 nav items

**How to apply:**
- Any new backend routes not in openapi.yaml must use raw fetch on the frontend
- Always call `pnpm --filter @workspace/db run push` after adding new schema files AND updating lib/db/src/schema/index.ts
- Restart api-server workflow after any route changes
