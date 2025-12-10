import { env } from "cloudflare:workers";
import Replicate, { FileOutput } from "replicate";

// ============================================================================
// Types
// ============================================================================

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "16:9" | "3:4" | "4:3";
}

export interface UploadedImage {
  url: string;
  key: string;
}

// ============================================================================
// Replicate Image Generation
// ============================================================================

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Generate an image using Replicate's nano-banana model
 * Returns the image as a Buffer
 */
export async function generateImageBuffer(
  options: GenerateImageOptions
): Promise<Buffer> {
  const { prompt, aspectRatio = "3:4" } = options;

  const response = await replicate.run("google/imagen-3", {
    input: {
      prompt: `${prompt}. High quality, professional photography style, warm lighting, lifestyle photography.`,
      aspect_ratio: aspectRatio,
      safety_filter_level: "block_only_high",
      output_format: "jpg",
    },
  });

  // Replicate returns a FileOutput object
  const fileOutput = response as FileOutput;

  if (!fileOutput || typeof fileOutput.blob !== "function") {
    throw new Error(
      "Failed to generate image: Invalid response from Replicate"
    );
  }

  const blob = await fileOutput.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return buffer;
}

// ============================================================================
// R2 Upload
// ============================================================================

/**
 * Upload an image buffer to R2
 * Returns the public URL and object key
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  filename: string,
  contentType: string = "image/jpeg"
): Promise<UploadedImage> {
  // Generate a unique key
  const timestamp = Date.now();
  const key = `posts/${timestamp}-${filename}`;

  // Upload to R2
  await env.BUCKET.put(key, buffer, {
    httpMetadata: {
      contentType,
    },
  });

  // Construct the public URL using R2 custom domain
  const publicUrl = `${env.CDN_URL}/${key}`;

  return {
    url: publicUrl,
    key,
  };
}

/**
 * Delete an image from R2
 */
export async function deleteImageFromR2(key: string): Promise<void> {
  await env.BUCKET.delete(key);
}

// ============================================================================
// Combined: Generate and Upload
// ============================================================================

/**
 * Generate an AI image and upload it to R2
 */
export async function generateAndUploadImage(
  prompt: string,
  postId: string
): Promise<UploadedImage> {
  // Generate the image buffer
  const imageBuffer = await generateImageBuffer({ prompt });

  // Upload to R2
  const uploaded = await uploadBufferToR2(
    imageBuffer,
    `${postId}.jpg`,
    "image/jpeg"
  );

  return uploaded;
}
