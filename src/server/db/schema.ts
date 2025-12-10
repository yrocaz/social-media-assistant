import { User } from "better-auth";
import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// Auth Tables (better-auth generated)
// ============================================================================

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  role: text("role").default("user"),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  posts: many(posts),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ============================================================================
// Enums / Constants
// ============================================================================

export const IMAGE_STYLES = ["ai-photo", "text-card"] as const;
export type ImageStyle = (typeof IMAGE_STYLES)[number];

export const POST_STATUSES = [
  "draft",
  "approved",
  "rejected",
  "posted",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const TONE_OPTIONS = ["formal", "friendly", "spicy", "minimal"] as const;
export type ToneOption = (typeof TONE_OPTIONS)[number];

// ============================================================================
// Variation History Types
// ============================================================================

export interface TextVariation {
  id: string;
  hook: string;
  caption: string;
  hashtags: string[];
  feedback: string;
  tone: ToneOption | null;
  createdAt: string;
  accepted: boolean;
}

export interface ImageVariation {
  id: string;
  imagePrompt: string;
  imageUrl: string | null;
  imageKey: string | null;
  feedback: string;
  createdAt: string;
  accepted: boolean;
}

export interface VariationHistory {
  textVariations: TextVariation[];
  imageVariations: ImageVariation[];
}

// ============================================================================
// Posts Table
// ============================================================================

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    pillar: text("pillar").notNull(),
    mainIdea: text("main_idea").notNull(),
    hook: text("hook").notNull(),
    caption: text("caption").notNull(),
    hashtags: text("hashtags"), // JSON array stored as text
    imageStyle: text("image_style", { enum: IMAGE_STYLES }).notNull(),
    imagePrompt: text("image_prompt").notNull(),
    imageUrl: text("image_url"),
    imageKey: text("image_key"), // R2 object key
    status: text("status", { enum: POST_STATUSES }).notNull().default("draft"),
    batchId: text("batch_id").notNull(),
    history: text("history"), // JSON storing variation history
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }), // User who generated
    approvedBy: text("approved_by").references(() => user.id, {
      onDelete: "set null",
    }), // User who approved
    rejectedBy: text("rejected_by").references(() => user.id, {
      onDelete: "set null",
    }), // User who rejected
    postedBy: text("posted_by").references(() => user.id, {
      onDelete: "set null",
    }), // User who posted
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("posts_batch_id_idx").on(table.batchId),
    index("posts_status_idx").on(table.status),
    index("posts_created_at_idx").on(table.createdAt),
  ]
);

export const postsRelations = relations(posts, ({ one }) => ({
  creator: one(user, {
    fields: [posts.createdBy],
    references: [user.id],
  }),
  approver: one(user, {
    fields: [posts.approvedBy],
    references: [user.id],
  }),
  rejector: one(user, {
    fields: [posts.rejectedBy],
    references: [user.id],
  }),
  poster: one(user, {
    fields: [posts.postedBy],
    references: [user.id],
  }),
}));

// ============================================================================
// Zod Schemas
// ============================================================================

// Variation history Zod schemas
export const textVariationSchema = z.object({
  id: z.string(),
  hook: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  feedback: z.string(),
  tone: z.enum(TONE_OPTIONS).nullable(),
  createdAt: z.string(),
  accepted: z.boolean(),
});

export const imageVariationSchema = z.object({
  id: z.string(),
  imagePrompt: z.string(),
  imageUrl: z.string().nullable(),
  imageKey: z.string().nullable(),
  feedback: z.string(),
  createdAt: z.string(),
  accepted: z.boolean(),
});

export const variationHistorySchema = z.object({
  textVariations: z.array(textVariationSchema),
  imageVariations: z.array(imageVariationSchema),
});

const emptyHistory: VariationHistory = {
  textVariations: [],
  imageVariations: [],
};

// Helper to parse history JSON
function parseHistory(val: string | null): VariationHistory {
  if (!val) return emptyHistory;
  try {
    return variationHistorySchema.parse(JSON.parse(val));
  } catch {
    return emptyHistory;
  }
}

// Schema for selecting posts - validates query results
export const selectPostSchema = createSelectSchema(posts, {
  hashtags: z
    .string()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      try {
        return JSON.parse(val) as string[];
      } catch {
        return null;
      }
    }),
  history: z.string().nullable().transform(parseHistory),
});

// Schema for inserting posts - validates API input
export const insertPostSchema = createInsertSchema(posts, {
  id: z.string().min(1),
  pillar: z.string().min(1).max(100),
  mainIdea: z.string().min(1).max(500),
  hook: z.string().min(1).max(300),
  caption: z.string().min(1).max(2200), // Instagram caption limit
  hashtags: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((val) => (val ? JSON.stringify(val) : null)),
  imageStyle: z.enum(IMAGE_STYLES),
  imagePrompt: z.string().min(1).max(1000),
  imageUrl: z.string().url().nullable().optional(),
  imageKey: z.string().nullable().optional(),
  status: z.enum(POST_STATUSES).default("draft"),
  batchId: z.string().min(1),
}).omit({
  // These will be set programmatically
  createdAt: true,
  updatedAt: true,
});

// Schema for updating posts - all fields optional except id
export const updatePostSchema = insertPostSchema.partial().extend({
  id: z.string().min(1),
});

// ============================================================================
// TypeScript Types
// ============================================================================

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type InsertPost = z.input<typeof insertPostSchema>;
export type UpdatePost = z.input<typeof updatePostSchema>;

// Parsed post with hashtags as array, history parsed, and creator email from join
export type ParsedPost = Omit<Post, "hashtags" | "history"> & {
  hashtags: string[];
  history: VariationHistory;
  creator: User | null;
  approver: User | null;
  rejector: User | null;
  poster: User | null;
};
