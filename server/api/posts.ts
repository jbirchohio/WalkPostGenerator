import { db } from "../db";
import { 
  posts, 
  postAnalytics, 
  type InsertPost, 
  type Post,
  type InsertPostAnalytics,
  type PostAnalytics
} from "@shared/schema";
import { eq, desc, asc, sql } from "drizzle-orm";

/**
 * Save a post to the database for historical tracking
 */
export async function savePost(postData: InsertPost): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const [result] = await db.insert(posts).values(postData).returning();
    
    return {
      success: true,
      id: result.id
    };
  } catch (error: any) {
    console.error('Error saving post:', error);
    return {
      success: false,
      error: error.message || 'Failed to save post'
    };
  }
}

/**
 * Update an existing post in the database
 */
export async function updatePost(
  id: number,
  updateData: Partial<InsertPost>
): Promise<{ success: boolean; post?: Post; error?: string }> {
  try {
    // Ensure we have the current timestamp
    const data = {
      ...updateData,
      updatedAt: new Date(),
    };
    
    const [updated] = await db
      .update(posts)
      .set(data)
      .where(eq(posts.id, id))
      .returning();
    
    if (!updated) {
      return {
        success: false,
        error: `Post with ID ${id} not found`
      };
    }
    
    return {
      success: true,
      post: updated
    };
  } catch (error: any) {
    console.error('Error updating post:', error);
    return {
      success: false,
      error: error.message || 'Failed to update post'
    };
  }
}

/**
 * Get a list of posts based on query parameters
 */
export async function getPosts(
  limit: number = 20,
  offset: number = 0,
  postType?: string,
  publishStatus?: string,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ success: boolean; posts?: Post[]; count?: number; error?: string }> {
  try {
    // Build query conditions
    let query = db.select().from(posts);
    
    if (postType) {
      query = query.where(eq(posts.postType, postType));
    }
    
    if (publishStatus) {
      query = query.where(eq(posts.publishStatus, publishStatus));
    }
    
    // Apply sorting
    if (sortBy && posts[sortBy as keyof typeof posts]) {
      const orderFn = sortOrder === 'asc' ? asc : desc;
      query = query.orderBy(orderFn(posts[sortBy as keyof typeof posts]));
    } else {
      // Default sort by createdAt desc
      query = query.orderBy(desc(posts.createdAt));
    }
    
    // Apply pagination
    query = query.limit(limit).offset(offset);
    
    // Execute query
    const results = await query;
    
    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(postType ? eq(posts.postType, postType) : undefined)
      .where(publishStatus ? eq(posts.publishStatus, publishStatus) : undefined);
    
    return {
      success: true,
      posts: results,
      count
    };
  } catch (error: any) {
    console.error('Error getting posts:', error);
    return {
      success: false,
      error: error.message || 'Failed to get posts'
    };
  }
}

/**
 * Get a single post by ID
 */
export async function getPost(postId: number): Promise<{ success: boolean; post?: Post; error?: string }> {
  try {
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId));
    
    if (!post) {
      return {
        success: false,
        error: `Post with ID ${postId} not found`
      };
    }
    
    return {
      success: true,
      post
    };
  } catch (error: any) {
    console.error('Error getting post:', error);
    return {
      success: false,
      error: error.message || 'Failed to get post'
    };
  }
}

/**
 * Delete a post by ID
 */
export async function deletePost(postId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if post exists first
    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId));
    
    if (!post) {
      return {
        success: false,
        error: `Post with ID ${postId} not found`
      };
    }
    
    // Delete any analytics data first
    await db
      .delete(postAnalytics)
      .where(eq(postAnalytics.postId, postId));
    
    // Delete the post
    await db
      .delete(posts)
      .where(eq(posts.id, postId));
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete post'
    };
  }
}

/**
 * Save analytics data for a post
 */
export async function savePostAnalytics(
  analyticsData: InsertPostAnalytics
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    // Check if the post exists
    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, analyticsData.postId));
    
    if (!post) {
      return {
        success: false,
        error: `Post with ID ${analyticsData.postId} not found`
      };
    }
    
    // Insert analytics data
    const [result] = await db
      .insert(postAnalytics)
      .values(analyticsData)
      .returning();
    
    // Update the post with the latest engagement metrics
    await db
      .update(posts)
      .set({
        impressions: analyticsData.impressions,
        likes: analyticsData.likes,
        shares: analyticsData.shares,
        comments: analyticsData.comments,
        clicks: analyticsData.clicks,
        engagement: analyticsData.likes + analyticsData.shares + analyticsData.comments + analyticsData.clicks
      })
      .where(eq(posts.id, analyticsData.postId));
    
    return {
      success: true,
      id: result.id
    };
  } catch (error: any) {
    console.error('Error saving post analytics:', error);
    return {
      success: false,
      error: error.message || 'Failed to save post analytics'
    };
  }
}

/**
 * Get analytics data for a post
 */
export async function getPostAnalytics(
  postId: number
): Promise<{ success: boolean; analytics?: PostAnalytics[]; error?: string }> {
  try {
    const analytics = await db
      .select()
      .from(postAnalytics)
      .where(eq(postAnalytics.postId, postId));
    
    return {
      success: true,
      analytics
    };
  } catch (error: any) {
    console.error('Error getting post analytics:', error);
    return {
      success: false,
      error: error.message || 'Failed to get post analytics'
    };
  }
}

/**
 * Get analytics summary data for all posts
 */
export async function getAnalyticsSummary(): Promise<{ success: boolean; summary?: any; error?: string }> {
  try {
    // Get total posts
    const [postCounts] = await db
      .select({
        total: sql<number>`count(*)`,
        published: sql<number>`sum(case when ${posts.publishStatus} = 'published' then 1 else 0 end)`,
        scheduled: sql<number>`sum(case when ${posts.publishStatus} = 'scheduled' then 1 else 0 end)`
      })
      .from(posts);
    
    // Get metrics totals
    const [metrics] = await db
      .select({
        totalImpressions: sql<number>`sum(${posts.impressions})`,
        totalLikes: sql<number>`sum(${posts.likes})`,
        totalShares: sql<number>`sum(${posts.shares})`,
        totalComments: sql<number>`sum(${posts.comments})`,
        totalClicks: sql<number>`sum(${posts.clicks})`,
        totalEngagement: sql<number>`sum(${posts.engagement})`
      })
      .from(posts);
    
    // Get recent posts
    const recentPosts = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(5);
    
    // Get posts by platform
    const postsByPlatform = await db
      .select({
        platform: sql<string>`unnest(${posts.publishedTo})`,
        count: sql<number>`count(*)`
      })
      .from(posts)
      .groupBy(sql`unnest(${posts.publishedTo})`)
      .orderBy(desc(sql<number>`count(*)`));
    
    return {
      success: true,
      summary: {
        totalPosts: postCounts.total || 0,
        publishedPosts: postCounts.published || 0,
        scheduledPosts: postCounts.scheduled || 0,
        metrics: {
          totalImpressions: metrics.totalImpressions || 0,
          totalLikes: metrics.totalLikes || 0,
          totalShares: metrics.totalShares || 0,
          totalComments: metrics.totalComments || 0,
          totalClicks: metrics.totalClicks || 0,
          totalEngagement: metrics.totalEngagement || 0
        },
        recentPosts,
        postsByPlatform: postsByPlatform || []
      }
    };
  } catch (error: any) {
    console.error('Error getting analytics summary:', error);
    return {
      success: false,
      error: error.message || 'Failed to get analytics summary'
    };
  }
}