# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A social media content manager for Momwise built on Cloudflare Workers using TanStack Start (React SSR framework). The app generates AI-powered Instagram/TikTok posts with images, manages approval workflows, and tracks content variations.

## Development Commands

```bash
# Install dependencies (uses bun)
bun install

# Development server (port 3000)
bun run dev

# Build for production
bun run build

# Deploy to Cloudflare
bun run deploy

# Type checking
bun run typecheck

# Run tests
bun run test

# Database operations
bun run db:generate        # Generate Drizzle migrations from schema
bun run db:migrate:local   # Apply migrations to local D1
bun run db:migrate:remote  # Apply migrations to production D1
bun run db:studio          # Launch Drizzle Studio

# Generate Cloudflare types
bun run cf-typegen
```

## Architecture

### Framework Stack
- **TanStack Start**: File-based routing SSR framework (React 19)
- **Cloudflare Workers**: Edge runtime deployment
- **Vite**: Build tool with Cloudflare plugin
- **Better Auth**: Authentication with email/password
- **Drizzle ORM**: Type-safe database queries

### Data Flow

1. **Post Generation** (`src/server/services/llm.ts`):
   - Perplexity Sonar researches current Instagram/TikTok trends
   - Google Gemini 3 Pro generates posts based on `config/brand.json` and trends
   - Returns structured data matching `generatedPostSchema`

2. **Image Generation** (`src/server/services/images.ts`):
   - **ai-photo**: Replicate Imagen-3 → Buffer → R2 upload
   - **text-card**: HTML canvas rendering (`src/server/services/text-card.ts`) → R2 upload
   - All images stored in R2 with CDN URLs

3. **Post Workflow** (`src/server/services/posts.ts`):
   - Draft → Approved/Rejected → Posted
   - Text/image variations stored in JSON `history` column
   - Uses `nanoid` for IDs and batch grouping

### Database Schema (`src/server/db/schema.ts`)

Key tables:
- **user/session/account/verification**: Better Auth tables
- **posts**: Main content table with JSON fields:
  - `hashtags`: `string[]` serialized as text
  - `history`: Variation history with text/image alternatives
  - Status tracking with `createdBy`/`approvedBy`/`rejectedBy`/`postedBy` user relations

Important types:
- `PostWithRelations`: Includes user relations for creators/approvers
- `VariationHistory`: Tracks all text/image variations with feedback
- `ParsedPost`: Client-safe post with parsed JSON fields

### Server Services

All AI/image operations go through service layer:
- `llm.ts`: Post generation, text variations, image prompt improvements
- `images.ts`: Replicate API, R2 uploads, image deletion
- `text-card.ts`: Canvas-based text card generation
- `posts.ts`: Business logic for CRUD and workflow
- `user.ts`: User management helpers

### Configuration

**`config/brand.json`**: Single source of truth for content generation
- Brand voice, tone, persona
- Content pillars and banned phrases
- Used in LLM system prompts
- Changing this file affects all generated content

### Authentication

Better Auth setup in `src/server/auth.ts`:
- Email/password enabled, email verification disabled
- 7-day sessions with 24h refresh
- TanStack Start cookie plugin required (must be last)
- Client SDK: `src/lib/auth-client.ts`

### Environment Setup

**Required secrets** (`.dev.vars` for local):
- `BETTER_AUTH_SECRET`: Auth session encryption
- `GOOGLE_AI_API_KEY`: Gemini API
- `REPLICATE_API_TOKEN`: Image generation
- `PERPLEXITY_API_KEY`: Trend research

**Wrangler bindings** (`wrangler.jsonc`):
- `DATABASE`: D1 database
- `BUCKET`: R2 bucket
- `CDN_URL`: R2 public domain

Access in code via `env` from `cloudflare:workers`.

### Routing

TanStack Start file-based routing in `src/routes/`:
- Routes auto-generate to `src/routeTree.gen.ts`
- Root layout: `src/routes/__root.tsx` (includes TanStack devtools)
- API routes: `src/routes/api/auth/$.ts` (Better Auth catch-all)

Path aliases via `@/*` map to `./src/*` (vite-tsconfig-paths plugin).

## Key Patterns

### Server Function Pattern
Server-side logic uses TanStack Start's server functions. Import services from `src/server/services/*` in server functions, not directly in components.

### Variation History
Posts track all variations (text/image) with user feedback:
- Stored as JSON in `posts.history` column
- Each variation includes timestamp, feedback, accepted flag
- When accepting a variation, it updates the post's main fields and marks it accepted in history

### Image Management
Always clean up R2 objects:
- `deletePost()` removes associated image from R2
- Image regeneration adds old image to history before replacing
- Use `imageKey` to delete from R2, `imageUrl` for display

### Type Safety
- Drizzle generates types from schema: `Post`, `NewPost`
- Zod schemas validate API inputs: `insertPostSchema`, `updatePostSchema`
- Transform functions parse JSON columns (hashtags, history) in select schemas
- Always use `selectPostSchema` when querying posts to get parsed data

## Common Gotchas

- **JSON columns**: `hashtags` and `history` are stored as text, transform on read/write
- **Timestamps**: Use `mode: "timestamp"` for Date objects, `mode: "timestamp_ms"` for milliseconds
- **R2 cleanup**: Don't orphan images - delete from R2 when removing posts
- **Auth context**: User from Better Auth session, access via `auth.getSession()`
- **Cloudflare env**: Access bindings via `env` from `cloudflare:workers`, not `process.env`
- **Brand config**: Changes to `config/brand.json` require regenerating posts to take effect

## Testing

Uses Vitest with jsdom. Test files should be `*.test.ts` or `*.test.tsx`.
