# Social Media Manager

An AI-powered social media content generator and management platform built for modern edge infrastructure. Generate on-brand posts with AI-generated images, manage approval workflows, and track content variations—all from a single interface.

Originally built for [Momwise](https://momwise.ai), this tool demonstrates how to build a production-ready content management system using cutting-edge web technologies deployed on Cloudflare's edge network.

## Features

- **AI Content Generation**: Automatically generates social media posts using Google Gemini, with real-time trend research via Perplexity
- **Dual Image Generation**:
  - Photorealistic images via Replicate (Imagen-3)
  - Text card generation using HTML Canvas
- **Smart Variations**: Generate text and image variations based on user feedback with tone adjustments (formal, friendly, spicy, minimal)
- **Approval Workflow**: Draft → Approved/Rejected → Posted status tracking with user attribution
- **Variation History**: Track all content iterations with feedback and rollback capability
- **Brand Consistency**: Configure brand voice, content pillars, and banned phrases in a single JSON file
- **Edge Performance**: Deployed on Cloudflare Workers for global low-latency access
- **Type-Safe**: End-to-end type safety with TypeScript, Drizzle ORM, and Zod validation

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React 19 SSR)
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge)
- **Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) (S3-compatible object storage)
- **ORM**: [Drizzle](https://orm.drizzle.team/) with type-safe queries
- **Auth**: [Better Auth](https://better-auth.com/) with email/password
- **AI Models**:
  - Google Gemini 3 Pro (content generation)
  - Perplexity Sonar Pro (trend research)
  - Replicate Imagen-3 (image generation)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Build Tool**: Vite

## Prerequisites

- [Bun](https://bun.sh/) >= 1.3.3
- [Cloudflare Account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- API Keys:
  - Google AI (Gemini)
  - Perplexity API
  - Replicate API

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd social-media-manager
bun install
```

### 2. Set Up Cloudflare Resources

Create required resources in your Cloudflare account:

```bash
# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create prod-momwise-smm

# Create R2 bucket
wrangler r2 bucket create prod-momwise-ssm

# Set up R2 public access (optional, for CDN)
# Configure custom domain in Cloudflare Dashboard: R2 → your-bucket → Settings → Public Access
```

Update `wrangler.jsonc` with your resource IDs:
```jsonc
{
  "d1_databases": [{
    "binding": "DATABASE",
    "database_name": "smm-db",
    "database_id": "YOUR_D1_DATABASE_ID"
  }],
  "r2_buckets": [{
    "bucket_name": "smm-assets",
    "binding": "BUCKET"
  }],
  "vars": {
    "CDN_URL": "https://your-r2-domain.com"
  }
}
```

### 3. Configure Environment Variables

Create `.dev.vars` for local development:

```bash
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
GOOGLE_AI_API_KEY=your-google-ai-key
PERPLEXITY_API_KEY=your-perplexity-key
REPLICATE_API_TOKEN=your-replicate-token
```

For production, set secrets via Wrangler:

```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_AI_API_KEY
wrangler secret put PERPLEXITY_API_KEY
wrangler secret put REPLICATE_API_TOKEN
```

### 4. Set Up Database

Generate and apply migrations:

```bash
# Generate migration from schema
bun run db:generate

# Apply to local D1
bun run db:migrate:local

# Apply to production D1
bun run db:migrate:remote
```

### 5. Configure Your Brand

Edit `config/brand.json` to match your brand:

```json
{
  "name": "Your Brand",
  "persona": "Your brand's personality...",
  "audience": "Your target audience...",
  "voiceAdjectives": ["warm", "professional", "witty"],
  "contentPillars": ["pillar 1", "pillar 2"],
  "topics": ["topic 1", "topic 2"],
  "bannedPhrases": ["phrase to avoid"],
  "postCountPerDay": 3
}
```

### 6. Run Development Server

```bash
bun run dev
```

Visit `http://localhost:3000` and create an account to start generating posts.

## Usage

### Generating Posts

1. Click "Generate Posts" in the dashboard
2. Choose between:
   - **Auto-generate with trends**: Researches current trends and generates posts
   - **Custom prompt**: Generate posts based on your specific topic

### Managing Content

- **Approve/Reject**: Use the action menu on each post card
- **Generate Variations**:
  - Text variations with tone adjustment (formal, friendly, spicy, minimal)
  - Image regeneration based on feedback
- **View History**: See all variations and accepted versions
- **Delete**: Removes post and associated images from R2

### Post Workflow

```
Draft → Approved/Rejected → Posted
```

Each status change tracks which user performed the action.

## Development

### Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── ai-elements/     # AI interaction components
│   └── posts/           # Post management components
├── routes/              # File-based routes (TanStack Start)
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Dashboard
│   ├── login.tsx        # Auth page
│   └── api/
│       └── auth/        # Better Auth endpoints
├── server/
│   ├── auth.ts          # Better Auth configuration
│   ├── db/
│   │   ├── schema.ts    # Database schema
│   │   └── index.ts     # Drizzle client
│   ├── middleware/      # Auth middleware
│   └── services/        # Business logic
│       ├── llm.ts       # AI content generation
│       ├── images.ts    # Image generation & R2
│       ├── posts.ts     # Post CRUD operations
│       └── text-card.ts # Canvas text rendering
├── lib/                 # Utilities
└── hooks/               # React hooks
config/
└── brand.json           # Brand configuration
```

### Key Commands

```bash
# Development
bun run dev              # Start dev server (port 3000)
bun run typecheck        # Type check
bun run test             # Run tests

# Database
bun run db:generate      # Generate migrations
bun run db:migrate:local # Apply local migrations
bun run db:studio        # Open Drizzle Studio

# Production
bun run build            # Build for production
bun run deploy           # Deploy to Cloudflare
bun run cf-typegen       # Generate Cloudflare types
```

### Database Schema

The schema uses Drizzle ORM with SQLite (D1):

- **user/session/account/verification**: Authentication tables (Better Auth)
- **posts**: Main content table
  - JSON columns: `hashtags` (array), `history` (variation tracking)
  - Relations: `createdBy`, `approvedBy`, `rejectedBy`, `postedBy`
  - Indexes: `batchId`, `status`, `createdAt`

See `src/server/db/schema.ts` for full schema and types.

### AI Content Generation Flow

1. **Trend Research** (optional): Perplexity Sonar researches current Instagram/TikTok trends
2. **Content Generation**: Google Gemini generates structured posts based on:
   - Brand configuration (`config/brand.json`)
   - Trend insights
   - Content pillars and voice guidelines
3. **Image Generation**:
   - **ai-photo**: Replicate Imagen-3 → photorealistic images
   - **text-card**: HTML Canvas → rendered text graphics
4. **Storage**: Images uploaded to R2 with public CDN URLs

### Variation System

Posts track all variations with full history:

```typescript
interface VariationHistory {
  textVariations: TextVariation[]    // Different copy versions
  imageVariations: ImageVariation[]  // Different images
}
```

Each variation includes:
- Unique ID
- User feedback that triggered it
- Timestamp
- Acceptance status
- Full content/image data

## Deployment

Deploy to Cloudflare Workers:

```bash
# Build and deploy
bun run deploy

# Or separately
bun run build
wrangler deploy
```

The app will be deployed to your Cloudflare Workers subdomain. Configure a custom domain in the Cloudflare Dashboard.

### Environment Setup

Ensure all secrets are set in production:

```bash
wrangler secret list  # Check existing secrets
```

## Architecture Highlights

### Edge-First Design

- **Global Performance**: Deployed on Cloudflare's global network
- **D1 Database**: SQLite at the edge with automatic replication
- **R2 Storage**: S3-compatible object storage with CDN integration
- **Zero Cold Starts**: Workers are always warm

### Type Safety

- Drizzle ORM generates TypeScript types from schema
- Zod schemas validate all API inputs/outputs
- Transform functions handle JSON column serialization
- End-to-end type safety from database to UI

### Service Layer Pattern

All business logic isolated in `src/server/services/`:
- Clear separation of concerns
- Testable units
- Reusable across routes
- Type-safe interfaces

## Contributing

Contributions are welcome! Areas for improvement:

- Additional AI model integrations (Claude, OpenAI GPT-4)
- Social media platform integrations (Instagram, TikTok APIs)
- Calendar scheduling for posts
- Analytics and engagement tracking
- Multi-user team collaboration features
- Export/import functionality
- Webhook integrations

## License

[MIT License](LICENSE) - feel free to use this project for commercial or personal use.

---

Built with ❤️ using modern web technologies. Deploy globally in minutes with Cloudflare Workers.
