# HealTrip AI Patient Decision Assistant

A bilingual English/Arabic care-navigation prototype built with Next.js App Router, tRPC, Prisma, PostgreSQL, and Gemini tool calling. It helps users explore fictional provider records; it is not a medical diagnostic system.

## Architecture

```text
Next.js App Router
  ├─ English/Arabic chat UI (LTR/RTL)
  └─ tRPC API
      └─ Chat router
          ├─ AI agent → Gemini via @ai-sdk/google
          ├─ searchDoctors / searchHospitals → validated services
          └─ emergencyGuidance → deterministic demo rules
              └─ Prisma → PostgreSQL
```

Next.js keeps the prototype's UI and server code in one application. tRPC keeps client/server procedure types connected. Prisma 7 generates a typed client into `src/generated/prisma` and connects through `@prisma/adapter-pg` plus `pg`; the datasource URL is configured in `prisma.config.ts`. The model can request only explicit tools; it cannot access the database, raw SQL, environment variables, or arbitrary server functions.

The AI SDK's native Gemini function-calling integration is used. Provider results are validated and returned as structured data. The UI renders doctor/hospital identity only from those structured results, not from free-form model text.

## Data and conversations

`Hospital` and `Doctor` are related provider-directory models. The seed contains nine fictional doctors and four fictional hospitals across Cairo, Giza, and Alexandria. All seeded names, facilities, and addresses are demo data and must not be treated as real care options.

Anonymous `Conversation` and `Message` rows preserve the current chat. The server binds ownership to a random token in a signed, `HttpOnly`, `SameSite=Lax` cookie; only its hash is stored with a conversation. Reads, writes, and deletion are owner-scoped. Deleting a conversation cascades to its messages. The prototype retains records until the visitor deletes them. If the cookie is lost, the visitor cannot reclaim or delete those records; production needs an explicit retention and recovery policy.

The application does not log prompts or full conversation text. Do not add such logging without a privacy review.

## AI safety

- The assistant must not diagnose, prescribe, or claim certainty.
- Doctor and hospital details are only shown when present in validated tool results. Empty results stay empty; tool failures produce an unavailable message.
- Chest-pain examples first trigger deterministic safety handling. The fixed demo flags are severe/sudden/worsening chest pain, breathing difficulty, fainting, severe sweating, or pain radiating to the arm or jaw. Otherwise the assistant asks clarifying questions.
- These keyword rules are illustrative routing behavior, not clinical triage. They have not been clinically validated and must not be used for real care decisions.
- User messages are untrusted. Prompts and API secrets remain server-only; hidden reasoning is never returned.
- Tool execution is capped at five model steps, and user text/history are length-bounded.
- Chat requests are limited to ten per owner per minute in this single-process prototype. Production deployments need a shared/distributed rate limiter.

## Setup

Requirements: Node.js 20 or later and a PostgreSQL database. Copy `.env.example` to `.env` and set `DATABASE_URL`, `SESSION_SECRET`, and the Gemini configuration. `SESSION_SECRET` must be at least 32 characters; generate a unique random value and never commit `.env`.

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000/en/chat](http://localhost:3000/en/chat) or [http://localhost:3000/ar/chat](http://localhost:3000/ar/chat). Arabic uses RTL document direction. The `/` route redirects to `/en/chat`.

For a managed/production database, apply committed migrations with `npm run db:deploy`; do not use `migrate dev` against a production database. The initial migration is created locally by `migrate dev` and should be committed before deployment.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, server-side only |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini provider secret, server-side only |
| `GEMINI_MODEL` | Gemini model identifier; defaults to `gemini-2.5-flash` |
| `SESSION_SECRET` | HMAC key for anonymous session ownership cookies; at least 32 characters |

## Tests and checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run db:validate
```

The unit suite does not require a live LLM or database. Migration, seeding, and live chat require configured PostgreSQL and Gemini credentials.

## Limitations

- All directory data is synthetic demo data; there is no live provider catalog, availability, pricing, or insurance information.
- This is not a medical diagnostic system and must not be used to make medical decisions.
- Emergency rules are simple illustrative examples, not clinically validated guidance.
- No real patient data or accounts are used.
- Anonymous conversations persist until deleted; losing the owner cookie prevents later deletion by that visitor.
- No production clinical, privacy, security, or distributed rate-limit review has been performed.