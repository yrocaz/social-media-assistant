import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  listPosts,
  getPost,
  generatePostsBatch,
  approvePost,
  rejectPost,
  markPostAsPosted,
  deletePost,
  createTextVariations,
  acceptTextVariation,
  regenerateImage,
  getImageAsBase64,
  type PostWithRelations,
} from "../services/posts";
import {
  POST_STATUSES,
  TONE_OPTIONS,
  type VariationHistory,
} from "../db/schema";
import { getCurrentUser } from "../services/user";
import { authMiddleware } from "../middleware/auth";

// ============================================================================
// Schemas
// ============================================================================

const idSchema = z.object({
  id: z.string(),
});

const listByStatusSchema = z.object({
  status: z.enum(POST_STATUSES),
  limit: z.number().optional(),
});

const generateTextVariationsSchema = z.object({
  postId: z.string(),
  feedback: z.string().min(1).max(500),
  tone: z.enum(TONE_OPTIONS).nullable().optional(),
});

const acceptTextVariationSchema = z.object({
  postId: z.string(),
  variationId: z.string(),
});

const regenerateImageSchema = z.object({
  postId: z.string(),
  feedback: z.string().min(1).max(500),
});

const generatePostsWithPromptSchema = z.object({
  prompt: z.string().min(1).max(1000),
  count: z.number().min(1).max(3),
});

// ============================================================================
// Helpers
// ============================================================================

function parseHashtags(hashtags: string | null): string[] {
  return hashtags ? JSON.parse(hashtags) : [];
}

const emptyHistory: VariationHistory = {
  textVariations: [],
  imageVariations: [],
};

function parseHistory(history: string | null): VariationHistory {
  if (!history) return emptyHistory;
  try {
    return JSON.parse(history) as VariationHistory;
  } catch {
    return emptyHistory;
  }
}

function parsePost(post: PostWithRelations) {
  return {
    ...post,
    hashtags: parseHashtags(post.hashtags),
    history: parseHistory(post.history),
  };
}

// ============================================================================
// List Posts
// ============================================================================

export const listPostsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const posts = await listPosts();
    return posts.map(parsePost);
  });

export const listPostsByStatusFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(listByStatusSchema)
  .handler(async ({ data }) => {
    const posts = await listPosts(data);
    return posts.map(parsePost);
  });

// ============================================================================
// Get Single Post
// ============================================================================

export const getPostFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const post = await getPost(data.id);
    if (!post) return null;
    return parsePost(post);
  });

// ============================================================================
// Generate Posts
// ============================================================================

export const generatePostsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({}) => {
    const user = await getCurrentUser();
    const result = await generatePostsBatch({ createdBy: user });
    return {
      batchId: result.batchId,
      posts: result.posts.map(parsePost),
    };
  });

export const generatePostsWithPromptFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(generatePostsWithPromptSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const result = await generatePostsBatch({
      customPrompt: data.prompt,
      count: data.count,
      createdBy: user,
    });
    return {
      batchId: result.batchId,
      posts: result.posts.map(parsePost),
    };
  });

// ============================================================================
// Update Status
// ============================================================================

export const approvePostFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const post = await approvePost(data.id, user);
    if (!post) return null;
    return parsePost(post);
  });

export const rejectPostFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const post = await rejectPost(data.id, user);
    if (!post) return null;
    return parsePost(post);
  });

export const markPostedFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser();
    const post = await markPostAsPosted(data.id, user);
    if (!post) return null;
    return parsePost(post);
  });

// ============================================================================
// Delete Post
// ============================================================================

export const deletePostFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    await deletePost(data.id);
    return { success: true as const };
  });

// ============================================================================
// Text Variations
// ============================================================================

export const generateTextVariationsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(generateTextVariationsSchema)
  .handler(async ({ data }) => {
    const variations = await createTextVariations({
      postId: data.postId,
      feedback: data.feedback,
      tone: data.tone ?? null,
    });
    return { variations };
  });

export const acceptTextVariationFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(acceptTextVariationSchema)
  .handler(async ({ data }) => {
    const post = await acceptTextVariation(data.postId, data.variationId);
    if (!post) return null;
    return parsePost(post);
  });

// ============================================================================
// Image Regeneration
// ============================================================================

export const regenerateImageFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(regenerateImageSchema)
  .handler(async ({ data }) => {
    const post = await regenerateImage({
      postId: data.postId,
      feedback: data.feedback,
    });
    if (!post) return null;
    return parsePost(post);
  });

// ============================================================================
// Image Proxy (for sharing - bypasses CORS)
// ============================================================================

const imageProxySchema = z.object({
  url: z.string().url(),
});

export const getImageAsBase64Fn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(imageProxySchema)
  .handler(async ({ data }) => {
    return getImageAsBase64(data.url);
  });
