# Video Generation Feature - PRD/Plan

> **Status**: On Hold
> **Last Updated**: December 2024
> **Priority**: Future Enhancement

## Overview

Add "Convert to Reel" functionality to transform existing AI-generated posts into short-form video content for Instagram Reels, TikTok, and YouTube Shorts.

## Problem Statement

Currently, the content dashboard generates static image posts. Short-form video content (Reels) has significantly higher engagement rates on social platforms. Manually creating video content is time-consuming, and AI video generation could streamline this process.

## Proposed Solution

Add a "Convert to Reel" option to the post card dropdown menu that generates multiple 4-second video clips based on the post's image and content. Users would then stitch these clips together in their preferred video editor (e.g., CapCut).

## Key Constraints Discovered

### Content Restrictions (Critical Blocker)

**Google Veo-3** (preferred model) blocks content containing:
- Children or kids
- Family scenes with minors
- Parenting-related imagery

This is a **significant limitation** for Momwise, a parenting content brand. Most content involves children or family scenarios.

### Potential Workarounds

1. **Adult-only subjects**: Focus on "talking head" style videos featuring Jackie (the creator) speaking to camera
2. **Abstract/lifestyle content**: Generate videos of environments, objects, or abstract concepts rather than people
3. **Alternative models**: Test other video generation models with different content policies

## Alternative Video Models (Replicate)

| Model | Strengths | Content Policy | Cost |
|-------|-----------|----------------|------|
| **Kling AI 2.5** (`kwaivgi/kling-v2.5-pro`) | Best for human motion, talking heads | Unknown - needs testing | ~$0.50/video |
| **Hailuo/MiniMax** (`minimax/video-01`) | High quality image-to-video | Unknown - needs testing | ~$0.30/video |
| **Wan AI 2.1** (`wan-video/wan2.1-i2v-480p`) | Budget-friendly, fast | Unknown - needs testing | ~$0.10/video |
| **PixVerse v4** (`pixverse/pixverse-v4`) | Good motion, lower cost | Unknown - needs testing | ~$0.15/video |

**Recommendation**: Test Kling AI first for realistic human motion before implementation.

## Technical Implementation Plan

### 1. Database Schema

Add to `posts` table:
```sql
ALTER TABLE `posts` ADD COLUMN `videoUrl` text;
ALTER TABLE `posts` ADD COLUMN `videoKey` text;
ALTER TABLE `posts` ADD COLUMN `videoStatus` text; -- 'none' | 'generating' | 'ready' | 'failed'
```

### 2. New Service: `src/server/services/video.ts`

```typescript
interface GenerateVideoInput {
  postId: string;
  sourceImageUrl: string;
  motionPrompt: string;
  duration: 4 | 6 | 8;
  aspectRatio: "9:16" | "16:9" | "1:1";
  withAudio: boolean;
}

interface GenerateVideoResult {
  url: string;
  key: string;
}

// Functions:
// - generateMotionPrompt(post) - LLM generates motion description
// - generateVideo(input) - Calls Replicate API
// - uploadVideoToR2(buffer, postId) - Stores in Cloudflare R2
```

### 3. LLM Service Extension

Add to `src/server/services/llm.ts`:

```typescript
interface GenerateMotionPromptInput {
  pillar: string;
  hook: string;
  caption: string;
  imagePrompt: string;
}

async function generateMotionPrompt(input: GenerateMotionPromptInput): Promise<string> {
  // Generate a 1-2 sentence motion description
  // e.g., "Camera slowly zooms in while subject gestures expressively"
}
```

### 4. Server Functions

Add to `src/server/functions/posts.ts`:

```typescript
export const generateVideoFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    postId: z.string(),
    duration: z.enum(["4", "6", "8"]).optional(),
    withAudio: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    // 1. Get post
    // 2. Verify it has an image (ai-photo only)
    // 3. Generate motion prompt via LLM
    // 4. Call video generation service
    // 5. Upload to R2
    // 6. Update post with videoUrl
  });
```

### 5. UI Changes

**PostCardMenu** - Add option:
```tsx
<DropdownMenuItem onClick={onConvertToReel} disabled={post.imageStyle !== "ai-photo"}>
  <Video className="h-4 w-4 mr-2" />
  Convert to Reel
</DropdownMenuItem>
```

**New Dialog**: `VideoGenerateDialog.tsx`
- Shows source image preview
- Duration selector (4s, 6s, 8s)
- Audio toggle (usually off)
- Generate button with loading state
- Video preview when complete
- Download button

**PostCard** - Add video indicator:
```tsx
{post.videoUrl && (
  <Badge variant="secondary">
    <Video className="h-3 w-3 mr-1" />
    Video Ready
  </Badge>
)}
```

## Scope Decisions

### In Scope
- AI-photo posts only (not text-cards)
- Single 4-second clips initially
- 9:16 aspect ratio (vertical/portrait)
- Audio off by default
- LLM-generated motion prompts
- R2 storage for videos
- Basic video preview in dashboard

### Out of Scope (Future)
- Multiple clip generation
- Automatic stitching
- Custom music/audio tracks
- Video editing within the app
- Scheduled video posting
- Video analytics

## User Flow

1. User generates or selects an existing post (ai-photo type)
2. Clicks three-dot menu → "Convert to Reel"
3. Dialog opens with image preview
4. User optionally adjusts duration
5. Clicks "Generate Video"
6. Loading state (30-60 seconds typical)
7. Video preview appears
8. User downloads video
9. User imports to CapCut for final editing/stitching

## Success Metrics

- Video generation success rate > 90%
- Generation time < 60 seconds
- User satisfaction with video quality
- Increase in Reels content output

## Open Questions

1. Which video model works best for parenting content without triggering content filters?
2. Should we support multiple clip generation in v1?
3. Do we need video storage cleanup/retention policies?
4. Should videos be downloadable or just viewable in-app?

## Next Steps

1. **Manual Testing**: Test alternative video models (Kling, Hailuo, etc.) with parenting content prompts
2. **Content Policy Research**: Document which models allow family/children content
3. **Cost Analysis**: Calculate expected costs per video across different models
4. **Revisit**: Once a suitable model is identified, proceed with implementation

---

## Appendix: Replicate API Pattern

Based on existing image service (`src/server/services/images.ts`):

```typescript
import Replicate from "replicate";

const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN });

const output = await replicate.run("model-owner/model-name", {
  input: {
    image: sourceImageUrl,
    prompt: motionPrompt,
    duration: 4,
    aspect_ratio: "9:16",
  },
});

// Output is typically a URL to the generated video
```
