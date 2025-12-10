import { nanoid } from "nanoid";
import { eq, desc, SQL, and } from "drizzle-orm";
import {
  db,
  posts,
  type Post,
  type PostStatus,
  type ToneOption,
  type VariationHistory,
  type TextVariation,
} from "../db";
import {
  generatePosts as generatePostsWithAI,
  generateTextVariations as generateTextVariationsWithAI,
  generateImprovedImagePrompt,
} from "./llm";
import { generateAndUploadImage, deleteImageFromR2 } from "./images";
import { generateTextCard } from "./text-card";
import { User } from "better-auth";

// ============================================================================
// Types
// ============================================================================

export interface PostWithRelations extends Post {
  creator: User | null;
  approver: User | null;
  rejector: User | null;
  poster: User | null;
}

export interface GenerateBatchResult {
  batchId: string;
  posts: PostWithRelations[];
}

// ============================================================================
// List Posts
// ============================================================================

export async function listPosts(options?: {
  status?: PostStatus;
  limit?: number;
}): Promise<PostWithRelations[]> {
  const { status, limit = 50 } = options || {};

  const conditions: (SQL<unknown> | undefined)[] = [];
  if (status) {
    conditions.push(eq(posts.status, status));
  }

  const results = await db.query.posts.findMany({
    with: {
      creator: true,
      approver: true,
      rejector: true,
      poster: true,
    },
    orderBy: desc(posts.createdAt),
    limit: limit,
    where: and(...conditions),
  });
  return results;
}

// ============================================================================
// Get Single Post
// ============================================================================

export async function getPost(
  id: string
): Promise<PostWithRelations | undefined> {
  const result = await db.query.posts.findFirst({
    with: {
      creator: true,
      approver: true,
      rejector: true,
      poster: true,
    },
    where: eq(posts.id, id),
  });
  return result;
}

// ============================================================================
// Generate Posts Batch
// ============================================================================

export interface GeneratePostsBatchOptions {
  customPrompt?: string;
  count?: number;
  createdBy?: User; // User ID
}

export async function generatePostsBatch(
  options?: GeneratePostsBatchOptions
): Promise<GenerateBatchResult> {
  const batchId = nanoid();
  const now = new Date();

  // Generate content with AI
  const generatedContent = await generatePostsWithAI({
    includeTrendResearch: !options?.customPrompt,
    customPrompt: options?.customPrompt,
    count: options?.count,
  });

  // Process each generated post
  const createdPosts: PostWithRelations[] = [];

  for (const content of generatedContent) {
    const postId = nanoid();

    // Generate image based on style
    let imageUrl: string | null = null;
    let imageKey: string | null = null;

    try {
      if (content.imageStyle === "ai-photo") {
        const uploaded = await generateAndUploadImage(
          content.imagePrompt,
          postId
        );
        imageUrl = uploaded.url;
        imageKey = uploaded.key;
      } else {
        // text-card
        const textCard = await generateTextCard(content.imagePrompt, postId);
        imageUrl = textCard.url;
        imageKey = textCard.key;
      }
    } catch (error) {
      console.error(`Failed to generate image for post ${postId}:`, error);
      // Continue without image - can be regenerated later
    }

    // Insert into database
    const newPost: typeof posts.$inferInsert = {
      id: postId,
      pillar: content.pillar,
      mainIdea: content.mainIdea,
      hook: content.hook,
      caption: content.caption,
      hashtags: JSON.stringify(content.hashtags),
      imageStyle: content.imageStyle,
      imagePrompt: content.imagePrompt,
      imageUrl,
      imageKey,
      status: "draft",
      batchId,
      createdBy: options?.createdBy?.id ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const [post] = await db.insert(posts).values(newPost).returning();
    createdPosts.push({
      ...post,
      creator: options?.createdBy ?? null,
      approver: null,
      rejector: null,
      poster: null,
    } as PostWithRelations);
  }

  return {
    batchId,
    posts: createdPosts,
  };
}

// ============================================================================
// Update Post Status
// ============================================================================

export async function approvePost(
  id: string,
  user?: User
): Promise<PostWithRelations | undefined> {
  await db
    .update(posts)
    .set({
      status: "approved",
      approvedBy: user?.id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  return getPost(id);
}

export async function rejectPost(
  id: string,
  user?: User
): Promise<PostWithRelations | undefined> {
  await db
    .update(posts)
    .set({
      status: "rejected",
      rejectedBy: user?.id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  return getPost(id);
}

export async function markPostAsPosted(
  id: string,
  user?: User
): Promise<PostWithRelations | undefined> {
  await db
    .update(posts)
    .set({
      status: "posted",
      postedBy: user?.id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  return getPost(id);
}

// ============================================================================
// Delete Post
// ============================================================================

export async function deletePost(id: string): Promise<void> {
  // Get the post first to clean up R2 image
  const post = await getPost(id);

  if (post?.imageKey) {
    try {
      await deleteImageFromR2(post.imageKey);
    } catch (error) {
      console.error(`Failed to delete image ${post.imageKey}:`, error);
    }
  }

  await db.delete(posts).where(eq(posts.id, id));
}

// ============================================================================
// Text Variations
// ============================================================================

export interface CreateTextVariationsInput {
  postId: string;
  feedback: string;
  tone?: ToneOption | null;
}

export interface TextVariationResult {
  id: string;
  hook: string;
  caption: string;
  hashtags: string[];
}

const emptyHistory: VariationHistory = {
  textVariations: [],
  imageVariations: [],
};

function parseHistory(historyStr: string | null): VariationHistory {
  if (!historyStr) return emptyHistory;
  try {
    return JSON.parse(historyStr) as VariationHistory;
  } catch {
    return emptyHistory;
  }
}

export async function createTextVariations(
  input: CreateTextVariationsInput
): Promise<TextVariationResult[]> {
  const post = await getPost(input.postId);
  if (!post) throw new Error("Post not found");

  // Generate variations using LLM
  const variations = await generateTextVariationsWithAI({
    originalPost: {
      pillar: post.pillar,
      mainIdea: post.mainIdea,
      hook: post.hook,
      caption: post.caption,
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : [],
    },
    userFeedback: input.feedback,
    tone: input.tone,
  });

  // Parse existing history
  const history = parseHistory(post.history);

  // Create variation records
  const variationRecords: TextVariation[] = variations.map((v) => ({
    id: nanoid(),
    ...v,
    feedback: input.feedback,
    tone: input.tone ?? null,
    createdAt: new Date().toISOString(),
    accepted: false,
  }));

  // Append to history
  history.textVariations.push(...variationRecords);

  // Update post with new history
  await db
    .update(posts)
    .set({ history: JSON.stringify(history), updatedAt: new Date() })
    .where(eq(posts.id, input.postId));

  return variationRecords.map(({ id, hook, caption, hashtags }) => ({
    id,
    hook,
    caption,
    hashtags,
  }));
}

export async function acceptTextVariation(
  postId: string,
  variationId: string
): Promise<PostWithRelations | undefined> {
  const post = await getPost(postId);
  if (!post) throw new Error("Post not found");

  const history = parseHistory(post.history);

  // Find the variation
  const variation = history.textVariations.find((v) => v.id === variationId);
  if (!variation) throw new Error("Variation not found");

  // Mark as accepted, unmark others
  history.textVariations = history.textVariations.map((v) => ({
    ...v,
    accepted: v.id === variationId,
  }));

  // Update the post with the new content
  await db
    .update(posts)
    .set({
      hook: variation.hook,
      caption: variation.caption,
      hashtags: JSON.stringify(variation.hashtags),
      history: JSON.stringify(history),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));

  return getPost(postId);
}

// ============================================================================
// Image Regeneration
// ============================================================================

export interface RegenerateImageInput {
  postId: string;
  feedback: string;
}

export async function regenerateImage(
  input: RegenerateImageInput
): Promise<PostWithRelations | undefined> {
  const post = await getPost(input.postId);
  if (!post) throw new Error("Post not found");

  // Generate improved prompt using LLM
  const { imagePrompt } = await generateImprovedImagePrompt({
    originalPost: {
      pillar: post.pillar,
      mainIdea: post.mainIdea,
      hook: post.hook,
      caption: post.caption,
      imageStyle: post.imageStyle,
      imagePrompt: post.imagePrompt,
    },
    userFeedback: input.feedback,
  });

  // Parse existing history
  const history = parseHistory(post.history);

  // Store current image in history before regenerating
  if (post.imageUrl) {
    history.imageVariations.push({
      id: nanoid(),
      imagePrompt: post.imagePrompt,
      imageUrl: post.imageUrl,
      imageKey: post.imageKey,
      feedback: "original",
      createdAt: post.createdAt.toISOString(),
      accepted: false,
    });
  }

  // Generate new image
  let imageUrl: string | null = null;
  let imageKey: string | null = null;

  if (post.imageStyle === "ai-photo") {
    const uploaded = await generateAndUploadImage(imagePrompt, post.id);
    imageUrl = uploaded.url;
    imageKey = uploaded.key;
  } else {
    const textCard = await generateTextCard(imagePrompt, post.id);
    imageUrl = textCard.url;
    imageKey = textCard.key;
  }

  // Add new image to history
  history.imageVariations.push({
    id: nanoid(),
    imagePrompt,
    imageUrl,
    imageKey,
    feedback: input.feedback,
    createdAt: new Date().toISOString(),
    accepted: true,
  });

  // Update post
  await db
    .update(posts)
    .set({
      imagePrompt,
      imageUrl,
      imageKey,
      history: JSON.stringify(history),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, input.postId));

  return getPost(input.postId);
}

// ============================================================================
// Image Proxy (for sharing - bypasses CORS)
// ============================================================================

export async function getImageAsBase64(
  url: string
): Promise<{ base64: string; contentType: string }> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return { base64, contentType };
}
