# Momwise SMM Dashboard - Product Requirements Document

## Product Overview

**Momwise SMM** is an internal AI-powered social media content generation dashboard. It generates daily Instagram/TikTok posts using AI, stores them for review, and allows approval before manual cross-posting.

### Problem
Manually creating 3+ social posts daily is time-consuming. We need AI to generate on-brand content (hook, caption, hashtags, image) that can be quickly reviewed, approved, and copy/pasted to social platforms.

### Solution
A minimal dashboard where:
1. Click "Generate" → AI creates 3 posts with images
2. Review each post (preview image, read caption)
3. Approve/reject individual posts
4. Copy approved content to Instagram/TikTok manually
5. (Future) Auto-post to platforms via API

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React meta-framework) |
| Hosting | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle |
| API | tRPC |
| Auth | better-auth (email/password, @momwise.ai only) |
| UI | shadcn/ui + Tailwind |
| Image Storage | Cloudflare R2 |
| AI Text | Vercel AI SDK + OpenAI |
| AI Images | Replicate (google/nano-banana-pro) |
| Text Cards | workers-og (edge-native HTML→PNG) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                      │
├─────────────────────────────────────────────────────────┤
│  TanStack Start App                                      │
│  ├── /login          (better-auth)                       │
│  ├── /               (dashboard - protected)             │
│  └── /api/trpc/*     (tRPC handlers)                     │
├─────────────────────────────────────────────────────────┤
│  Server Services                                         │
│  ├── llm.ts          (AI SDK + OpenAI)                   │
│  ├── images.ts       (Replicate + R2 upload)             │
│  └── text-card.ts    (workers-og)                        │
├─────────────────────────────────────────────────────────┤
│  Cloudflare Bindings                                     │
│  ├── D1 (database)                                       │
│  └── R2 (image storage)                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### users (better-auth managed)
```sql
-- Created by better-auth, includes:
-- id, email, emailVerified, name, image, createdAt, updatedAt
```

### posts
```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  pillar TEXT NOT NULL,
  main_idea TEXT NOT NULL,
  hook TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT, -- JSON array
  image_style TEXT NOT NULL CHECK (image_style IN ('ai-photo', 'text-card')),
  image_prompt TEXT NOT NULL,
  image_url TEXT,
  image_key TEXT, -- R2 object key
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'posted')),
  batch_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_batch ON posts(batch_id);
```

---

## API Routes (tRPC)

```typescript
posts.list({ status?, limit? })     // Get posts, optionally filter by status
posts.get(id)                        // Get single post
posts.generate()                     // Generate new batch of 3 posts
posts.approve(id)                    // Set status = approved
posts.reject(id)                     // Set status = rejected
posts.delete(id)                     // Delete post + R2 image
posts.markPosted(id)                 // Set status = posted (after manual share)
```

---

## UI Screens

### Login (`/login`)
- Email + password form
- Only accepts @momwise.ai emails
- Redirects to dashboard on success

### Dashboard (`/`)
- **Header**: "Momwise Content" + user avatar + logout
- **Action bar**: "Generate Posts" button (creates 3 new drafts)
- **Tabs**: Draft | Approved | Rejected | Posted
- **Post grid**: Cards showing each post

### Post Card Component
```
┌─────────────────────────────────┐
│  [Image Preview - 4:5 ratio]    │
├─────────────────────────────────┤
│  Pillar: meal planning          │
│                                 │
│  Hook: "The 5-minute lunch..."  │
│                                 │
│  Caption: (truncated preview)   │
│  [Expand to see full]           │
│                                 │
│  #momwise #lunchbox #parenting  │
├─────────────────────────────────┤
│  [✓ Approve] [✗ Reject] [Copy]  │
└─────────────────────────────────┘
```

**Copy button**: Copies caption + hashtags to clipboard for pasting to Instagram.

---

## AI Generation

### LLM Prompt Structure
```
Generate 3 structured social posts for Momwise.

Persona: Warm, witty, and practical friend who has tried every parenting hack twice.
Audience: Busy parents with kids under 10 who want quick wins and calm days.
Voice: warm, practical, encouraging, non-judgy
Content pillars: meal planning, kids activities, weekend plans
Topics: lunchbox ideas, screen-free play, morning routines
Avoid: mom guilt, perfect parent

Return JSON matching schema. Mix pillars. Keep captions concise and conversational.
```

### Post Schema (Zod)
```typescript
z.object({
  pillar: z.string(),
  mainIdea: z.string(),
  hook: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()).optional(),
  imageStyle: z.enum(["ai-photo", "text-card"]),
  imagePrompt: z.string(),
})
```

### Image Generation Flow
1. If `imageStyle === "ai-photo"`:
   - Call Replicate with `google/nano-banana-pro`
   - Aspect ratio: 4:5 (1080x1350 for Instagram)
2. If `imageStyle === "text-card"` OR Replicate fails:
   - Generate with workers-og (HTML → PNG)
   - Branded card with hook text + gradient background
3. Upload result to R2
4. Store public URL in database

---

## Brand Configuration

Store in `config/brand.json` (loaded at build time):

```json
{
  "name": "Momwise",
  "persona": "Warm, witty, and practical friend who has tried every parenting hack twice.",
  "audience": "Busy parents with kids under 10 who want quick wins and calm days.",
  "voiceAdjectives": ["warm", "practical", "encouraging", "non-judgy"],
  "contentPillars": ["meal planning", "kids activities", "weekend plans"],
  "topics": ["lunchbox ideas", "screen-free play", "morning routines"],
  "bannedPhrases": ["mom guilt", "perfect parent"],
  "postCountPerDay": 3
}
```

---

## Environment / Secrets

```bash
# Auth
BETTER_AUTH_SECRET=<random-string>

# AI
OPENAI_API_KEY=<key>
LLM_MODEL=gpt-4o

# Images
REPLICATE_API_TOKEN=<key>
PUBLIC_BASE_URL=https://smm.momwise.ai

# Cloudflare (auto-injected via bindings)
# DB - D1 database
# ASSETS - R2 bucket
```

---

## Project Structure

```
momwise-smm/
├── app/
│   ├── routes/
│   │   ├── __root.tsx           # Root layout, tRPC + auth providers
│   │   ├── index.tsx            # Dashboard (protected)
│   │   ├── login.tsx            # Login page
│   │   └── api/
│   │       ├── trpc/$.ts        # tRPC catch-all
│   │       └── auth/$.ts        # better-auth handler
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── post-card.tsx
│   │   ├── post-grid.tsx
│   │   └── generate-button.tsx
│   └── lib/
│       ├── trpc.ts              # tRPC client
│       └── auth-client.ts       # better-auth client
├── server/
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema
│   │   └── index.ts             # Drizzle client
│   ├── services/
│   │   ├── llm.ts               # AI generation
│   │   ├── images.ts            # Replicate + R2
│   │   └── text-card.ts         # workers-og
│   ├── trpc/
│   │   ├── router.ts            # Root router
│   │   └── posts.ts             # Posts procedures
│   ├── auth.ts                  # better-auth config
│   └── context.ts               # AsyncLocalStorage for CF bindings
├── config/
│   └── brand.json
├── drizzle.config.ts
├── wrangler.jsonc
└── package.json
```

---

## Implementation Phases

### Phase 1: Project Setup
- [ ] Create TanStack Start project with Cloudflare preset
- [ ] Configure wrangler.jsonc with D1 + R2 bindings
- [ ] Set up Drizzle with D1
- [ ] Run initial migration (posts table)
- [ ] Install shadcn/ui, configure Tailwind

### Phase 2: Auth
- [ ] Install better-auth
- [ ] Configure with D1 adapter
- [ ] Restrict to @momwise.ai emails
- [ ] Create login page
- [ ] Protect dashboard route

### Phase 3: Core Services
- [ ] Implement AsyncLocalStorage context for CF bindings
- [ ] Port LLM service (from old src/llm.ts)
- [ ] Port image service (from old src/images.ts)
- [ ] Update to use google/nano-banana-pro model
- [ ] Implement text-card with workers-og

### Phase 4: tRPC API
- [ ] Set up tRPC with TanStack Start
- [ ] Implement posts router (list, get, generate, approve, reject, delete)
- [ ] Wire up to Drizzle + services

### Phase 5: Dashboard UI
- [ ] Build post card component
- [ ] Build post grid with tabs (draft/approved/rejected/posted)
- [ ] Add generate button with loading state
- [ ] Add copy-to-clipboard for captions
- [ ] Polish mobile responsiveness

### Phase 6: Deploy
- [ ] Create D1 database in Cloudflare
- [ ] Create R2 bucket (or reuse existing momwise-smm-images)
- [ ] Set secrets via wrangler
- [ ] Deploy to Cloudflare Pages
- [ ] Test end-to-end

---

## Future Scope (Not in V1)

- Auto-post to Instagram/TikTok via API
- Scheduled generation (daily cron)
- Post analytics / performance tracking
- Multiple brands support
- Image editing / regeneration
- Calendar view for content planning

---

## Reference: Existing Code to Preserve

From the old Cloudflare Worker codebase:

| File | What to Keep |
|------|--------------|
| `src/llm.ts` | Zod schema, prompt builder, AI SDK integration |
| `src/images.ts` | Replicate call pattern, R2 upload logic |
| `src/types.ts` | GeneratedPost and BrandConfig types |
| `src/config.ts` | Default brand values (move to JSON) |

The Slack integration (`src/slack.ts`) and worker handler (`src/worker.ts`) are not needed.
