import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Posts Table - Stores all generated posts
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  image: text("image"),
  postType: text("post_type").notNull(),
  productName: text("product_name"),
  publishStatus: text("publish_status").default("draft").notNull(),
  publishedTo: jsonb("published_to").$type<string[]>(), 
  scheduledDate: timestamp("scheduled_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  engagement: integer("engagement").default(0),
  clicks: integer("clicks").default(0),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  // Platform-specific post IDs for analytics
  facebookPostId: text("facebook_post_id"),
  instagramPostId: text("instagram_post_id"),
  // Last time analytics were fetched
  lastAnalyticsFetch: timestamp("last_analytics_fetch"),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  engagement: true,
  clicks: true,
  likes: true,
  shares: true,
  comments: true,
  impressions: true,
  reach: true,
  facebookPostId: true,
  instagramPostId: true,
  lastAnalyticsFetch: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

// Analytics Table - Store detailed analytics data by platform
export const postAnalytics = pgTable("post_analytics", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  platform: text("platform").notNull(), // facebook, instagram
  impressions: integer("impressions").default(0),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  clicks: integer("clicks").default(0),
  engagementRate: text("engagement_rate"),
  recordedAt: timestamp("recorded_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
});

export const insertPostAnalyticsSchema = createInsertSchema(postAnalytics).omit({
  id: true,
  recordedAt: true,
});

export type InsertPostAnalytics = z.infer<typeof insertPostAnalyticsSchema>;
export type PostAnalytics = typeof postAnalytics.$inferSelect;

// Facebook Tokens Table - Store long-lived Facebook access tokens
export const facebookTokens = pgTable("facebook_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  tokenType: text("token_type").default("bearer"),
  expiresAt: timestamp("expires_at").notNull(),
  lastRefreshed: timestamp("last_refreshed").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertFacebookTokenSchema = createInsertSchema(facebookTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFacebookToken = z.infer<typeof insertFacebookTokenSchema>;
export type FacebookToken = typeof facebookTokens.$inferSelect;

// Define the interface for platform-specific metrics
export interface PlatformAnalytics {
  // Base metrics that all platforms have
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  // Optional metrics that some platforms might have
  reach?: number;
  clicks?: number;
  saved?: number;
}

// Define the combined analytics interface with platform-specific breakdowns
export interface CombinedAnalytics {
  // Total metrics (combined across platforms)
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  saved: number;
  clicks: number;
  totalSaved?: number;
  totalReach?: number;
  
  // Platform-specific metrics breakdown
  platforms: {
    facebook?: PlatformAnalytics;
    instagram?: PlatformAnalytics;
    [key: string]: PlatformAnalytics | undefined;
  };
  
  // Individual platform metrics for easier access
  facebookImpressions?: number;
  facebookReach?: number;
  facebookLikes?: number;
  facebookComments?: number;
  facebookShares?: number;
  facebookClicks?: number;
  facebookEngagement?: number;
  
  instagramImpressions?: number;
  instagramReach?: number;
  instagramLikes?: number;
  instagramComments?: number;
  instagramShares?: number;
  instagramSaved?: number;
  instagramEngagement?: number;
}

// Define the schema for post generation
export const postGenerationSchema = z.object({
  productName: z.string().optional(),
  postType: z.enum(["general", "promotion", "event", "seasonal"]),
  image: z.string().optional(),
});

export type PostGenerationRequest = z.infer<typeof postGenerationSchema>;

// Define the schema for Facebook posting
export const facebookPostSchema = z.object({
  message: z.string(),
  image: z.string().optional(),
});

export type FacebookPostRequest = z.infer<typeof facebookPostSchema>;

// Facebook/Instagram API response types
export const socialMediaResponseSchema = z.object({
  success: z.boolean(),
  id: z.string().optional(),
  error: z.string().optional(),
  platform: z.enum(['facebook', 'instagram']).optional(),
});

export type SocialMediaResponse = z.infer<typeof socialMediaResponseSchema>;

// Schema for saving posts to history
export const savePostSchema = z.object({
  content: z.string(),
  image: z.string().optional(),
  postType: z.enum(["general", "promotion", "event", "seasonal"]),
  productName: z.string().optional(),
  publishStatus: z.enum(["draft", "published", "scheduled"]).default("draft"),
  publishedTo: z.array(z.string()).optional(),
  scheduledDate: z.string().optional(), // ISO string for date
});

export type SavePostRequest = z.infer<typeof savePostSchema>;

// Schema for fetching post history
export const postsQuerySchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
  postType: z.enum(["general", "promotion", "event", "seasonal"]).optional(),
  publishStatus: z.enum(["draft", "published", "scheduled"]).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "scheduledDate"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type PostsQueryRequest = z.infer<typeof postsQuerySchema>;
