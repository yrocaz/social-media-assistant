import { env } from "cloudflare:workers";

// ============================================================================
// Types
// ============================================================================

export interface TextCardOptions {
  text: string;
  brandName?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface GeneratedTextCard {
  url: string;
  key: string;
}

// ============================================================================
// SVG Text Card Generation
// ============================================================================

/**
 * Generate an SVG text card that can be converted to PNG
 * This creates a branded card with the hook/quote text
 */
function generateTextCardSVG(options: TextCardOptions): string {
  const {
    text,
    brandName = "MomwiseAI",
    backgroundColor = "#FAF3E7", // warm cream
    textColor = "#1F1F1F", // near black
  } = options;

  // Wrap text to fit card (rough estimate: 35 chars per line)
  const maxCharsPerLine = 30;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Calculate dimensions (4:5 aspect ratio for Instagram)
  const width = 1080;
  const height = 1350;
  const fontSize = Math.min(64, Math.floor(800 / Math.max(lines.length, 3)));
  const lineHeight = fontSize * 1.4;

  // Calculate text block height and starting Y position (centered)
  const textBlockHeight = lines.length * lineHeight;
  const startY = (height - textBlockHeight) / 2 + fontSize;

  // Generate text elements
  const textElements = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<text x="${width / 2}" y="${y}" text-anchor="middle" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="600">${escapeXml(line)}</text>`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FCE7F3;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <!-- Decorative elements -->
  <circle cx="100" cy="100" r="150" fill="${textColor}" opacity="0.05"/>
  <circle cx="${width - 100}" cy="${height - 100}" r="200" fill="${textColor}" opacity="0.05"/>

  <!-- Main text -->
  <g>
    ${textElements}
  </g>

  <!-- Brand watermark -->
  <text x="${width / 2}" y="${height - 60}" text-anchor="middle" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="500" opacity="0.6">@${brandName.toLowerCase()}</text>
</svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================================================
// Generate and Upload Text Card
// ============================================================================

/**
 * Generate a text card SVG and upload to R2
 * Note: SVG is used directly since PNG conversion requires additional libraries
 * Most modern platforms support SVG images
 */
export async function generateTextCard(
  text: string,
  postId: string
): Promise<GeneratedTextCard> {
  const svg = generateTextCardSVG({ text });

  // Generate a unique key
  const timestamp = Date.now();
  const key = `posts/${timestamp}-${postId}-card.svg`;

  // Upload to R2
  await env.BUCKET.put(key, svg, {
    httpMetadata: {
      contentType: "image/svg+xml",
    },
  });

  // Construct the public URL using R2 custom domain
  const publicUrl = `https://cdn-ssm.momwise.ai/${key}`;

  return {
    url: publicUrl,
    key,
  };
}
