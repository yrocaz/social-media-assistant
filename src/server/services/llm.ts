import { generateObject, generateText, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { perplexity } from "@ai-sdk/perplexity";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import brandConfig from "../../../config/brand.json";
import config from "../../../config/llm.json";
import type { ToneOption, ImageStyle } from "../db/schema";

// ============================================================================
// Types
// ============================================================================

export const generatedPostSchema = z.object({
  pillar: z.string().describe("The content pillar this post belongs to"),
  mainIdea: z.string().describe("The core idea or message of the post"),
  hook: z
    .string()
    .describe("An attention-grabbing opening line (max 100 characters)"),
  caption: z
    .string()
    .describe("The full caption text (conversational, 150-300 words)"),
  hashtags: z
    .array(z.string())
    .describe("5-10 relevant hashtags without the # symbol"),
  imageStyle: z
    .enum(["ai-photo", "text-card"])
    .describe("Whether to generate an AI photo or a text-based card"),
  imagePrompt: z
    .string()
    .describe(
      "A detailed prompt for image generation (for ai-photo) or the text to display (for text-card)"
    ),
});

export const generatedPostsSchema = z.object({
  posts: z.array(generatedPostSchema).length(brandConfig.postCountPerDay),
});

export type GeneratedPost = z.infer<typeof generatedPostSchema>;
export type GeneratedPosts = z.infer<typeof generatedPostsSchema>;

function getResearchModel(): LanguageModel {
  switch (config.researchModel.provider) {
    case "perplexity":
      return perplexity(config.researchModel.model);
    case "google":
      return google(config.researchModel.model);
    case "openai":
      return openai(config.researchModel.model);
    default:
      throw new Error(
        `Unsupported research model provider: ${config.researchModel.provider}`
      );
  }
}

function getGenerationModel(): LanguageModel {
  switch (config.generationModel.provider) {
    case "google":
      return google(config.generationModel.model);
    case "openai":
      return openai(config.generationModel.model);
    case "perplexity":
      return perplexity(config.generationModel.model);
    default:
      throw new Error(
        `Unsupported generation model provider: ${config.generationModel.provider}`
      );
  }
}

// ============================================================================
// Trend Research (Perplexity)
// ============================================================================

export async function researchTrends(): Promise<string> {
  const { text } = await generateText({
    model: getResearchModel(),
    prompt: `Research current trending topics and viral content formats on Instagram and TikTok for parenting content creators.

Focus on:
1. What parenting topics are trending this week?
2. What content formats are getting high engagement (carousels, reels, text posts)?
3. What hooks and caption styles are going viral?
4. Any seasonal or timely topics relevant to parents right now?
5. Trending hashtags in the parenting/mom space

Target audience: ${brandConfig.audience}
Content pillars to focus on: ${brandConfig.contentPillars.join(", ")}

Provide a concise summary with specific, actionable insights for creating engaging content today.`,
  });

  return text;
}

// ============================================================================
// System Prompt
// ============================================================================

const buildSystemPrompt = (trendResearch?: string) => {
  let prompt = `You are a social media content creator for ${brandConfig.name}.

## Brand Persona
${brandConfig.persona}

## Target Audience
${brandConfig.audience}

## Voice & Tone
Your writing should be: ${brandConfig.voiceAdjectives.join(", ")}.

## Content Pillars
Focus on these topics: ${brandConfig.contentPillars.join(", ")}.

## Suggested Topics
Draw inspiration from: ${brandConfig.topics.join(", ")}.

## Rules
1. NEVER use these phrases: ${brandConfig.bannedPhrases.join(", ")}
2. Keep hooks punchy and under 100 characters
3. Captions should be conversational, not salesy
4. Mix up the content pillars across posts
5. Use relatable, everyday scenarios parents face
6. End captions with a question or call-to-action when appropriate
7. Hashtags should be a mix of broad (#parenting) and niche (#lunchboxideas)

## Image Style Guidelines
- Use "ai-photo" for lifestyle imagery (families, food, activities)
- Use "text-card" for quotes, tips lists, or text-heavy content
- For ai-photo: Write detailed, photorealistic prompts describing the scene
- For text-card: Write the exact text to display (keep it short and punchy)`;

  if (trendResearch) {
    prompt += `

## Current Trends & Insights
Use these real-time insights to make your content timely and engaging:

${trendResearch}`;
  }

  return prompt;
};

// ============================================================================
// Generate Posts
// ============================================================================

export interface GeneratePostsOptions {
  includeTrendResearch?: boolean;
  customPrompt?: string;
  count?: number;
}

// Dynamic schema based on count
function createPostsSchema(count: number) {
  return z.object({
    posts: z.array(generatedPostSchema).length(count),
  });
}

export async function generatePosts(
  options: GeneratePostsOptions = { includeTrendResearch: true }
): Promise<GeneratedPost[]> {
  const postCount = options.count ?? brandConfig.postCountPerDay;

  // Research trends first if enabled (skip for custom prompts)
  let trendResearch: string | undefined;
  if (options.includeTrendResearch && !options.customPrompt) {
    try {
      trendResearch = await researchTrends();
    } catch (error) {
      console.warn("Trend research failed, continuing without:", error);
    }
  }

  // Build prompt based on whether we have a custom prompt
  const userPrompt = options.customPrompt
    ? `Generate ${postCount} social media post${postCount > 1 ? "s" : ""} based on this topic/prompt:

"${options.customPrompt}"

Requirements:
- All posts should relate to the given topic/prompt
- Each post should have a unique angle or perspective on the topic
- Mix image styles when appropriate (ai-photo for lifestyle, text-card for quotes/tips)
- Vary the caption lengths and structures
- Ensure hashtags are relevant to both the topic and the brand
- Maintain brand voice and guidelines

Return exactly ${postCount} post${postCount > 1 ? "s" : ""}.`
    : `Generate ${postCount} unique social media posts for today.

Requirements:
- Each post should cover a DIFFERENT content pillar
- Mix image styles (include both ai-photo and text-card)
- Make content feel fresh and timely
- Vary the caption lengths and structures
- Ensure hashtags are relevant and not repetitive across posts
${trendResearch ? "- Incorporate trending topics and formats from the research" : ""}

Return exactly ${postCount} posts.`;

  const { object } = await generateObject({
    model: getGenerationModel(),
    schema: createPostsSchema(postCount),
    system: buildSystemPrompt(trendResearch),
    prompt: userPrompt,
  });

  return object.posts;
}

// ============================================================================
// Text Variations
// ============================================================================

export const textVariationOutputSchema = z.object({
  variations: z.array(
    z.object({
      hook: z.string().describe("Attention-grabbing opening (max 100 chars)"),
      caption: z.string().describe("Full caption text (150-300 words)"),
      hashtags: z.array(z.string()).describe("5-10 relevant hashtags"),
    })
  ),
});

export interface GenerateTextVariationsInput {
  originalPost: {
    pillar: string;
    mainIdea: string;
    hook: string;
    caption: string;
    hashtags: string[];
  };
  userFeedback: string;
  tone?: ToneOption | null;
}

const toneInstructions: Record<ToneOption, string> = {
  formal: "Use more professional, polished language while maintaining warmth",
  friendly:
    "Make it more casual, conversational, and relatable - like talking to a friend",
  spicy: "Add more personality, humor, bold statements, and unexpected takes",
  minimal: "Simplify and condense - fewer words, more impact, cut the fluff",
};

export async function generateTextVariations(
  input: GenerateTextVariationsInput
): Promise<Array<{ hook: string; caption: string; hashtags: string[] }>> {
  const tonePrompt = input.tone
    ? `\n\nTone adjustment: ${toneInstructions[input.tone]}`
    : "";

  const { object } = await generateObject({
    model: getGenerationModel(),
    schema: textVariationOutputSchema,
    system: buildSystemPrompt(),
    prompt: `Generate 3 variations of this social media post based on user feedback.

Original Post:
- Pillar: ${input.originalPost.pillar}
- Main Idea: ${input.originalPost.mainIdea}
- Hook: ${input.originalPost.hook}
- Caption: ${input.originalPost.caption}
- Hashtags: ${input.originalPost.hashtags.join(", ")}

User Feedback: ${input.userFeedback}${tonePrompt}

Requirements:
- Keep the same core message and main idea
- Apply the user's feedback thoughtfully
- Each variation should feel distinctly different
- Maintain brand voice and guidelines
- Return exactly 3 variations`,
  });

  return object.variations;
}

// ============================================================================
// Image Prompt Improvement
// ============================================================================

export const improvedImagePromptSchema = z.object({
  imagePrompt: z.string().describe("Detailed image generation prompt"),
  reasoning: z.string().describe("Brief explanation of changes made"),
});

export interface GenerateImagePromptInput {
  originalPost: {
    pillar: string;
    mainIdea: string;
    hook: string;
    caption: string;
    imageStyle: ImageStyle;
    imagePrompt: string;
  };
  userFeedback: string;
}

export async function generateImprovedImagePrompt(
  input: GenerateImagePromptInput
): Promise<{ imagePrompt: string; reasoning: string }> {
  const { object } = await generateObject({
    model: getGenerationModel(),
    schema: improvedImagePromptSchema,
    system: `You are an expert at creating image generation prompts for social media content.

For ai-photo style:
- Create detailed, photorealistic prompts
- Include lighting, composition, mood, and atmosphere
- Focus on lifestyle photography that resonates with parents
- Describe specific scenes, expressions, and settings

For text-card style:
- Write the exact text to display
- Keep it short and punchy (max 15-20 words)
- Make it quotable and shareable`,
    prompt: `Improve this image prompt based on user feedback.

Post Context:
- Pillar: ${input.originalPost.pillar}
- Main Idea: ${input.originalPost.mainIdea}
- Hook: ${input.originalPost.hook}
- Caption (excerpt): ${input.originalPost.caption.slice(0, 200)}...
- Image Style: ${input.originalPost.imageStyle}

Current Image Prompt:
${input.originalPost.imagePrompt}

User Feedback:
${input.userFeedback}

Generate an improved ${input.originalPost.imageStyle === "ai-photo" ? "photorealistic image prompt" : "text card content"} that addresses the feedback while staying relevant to the post content.`,
  });

  return object;
}
