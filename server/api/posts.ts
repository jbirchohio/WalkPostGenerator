import { db } from "../db";
import { posts, postAnalytics, InsertPost, InsertPostAnalytics } from "@shared/schema";
import { desc, asc, eq, and, like, sql } from "drizzle-orm";

/**
 * Post History and Analytics API
 */

/**
 * Save a post to the database for historical tracking
 */
export async function savePost(postData: InsertPost): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    // Insert the post data into the database
    const [result] = await db.insert(posts).values(postData).returning({ id: posts.id });
    
    console.log('Post saved to history with ID:', result.id);
    
    return {
      success: true,
      id: result.id
    };
  } catch (error: any) {
    console.error('Error saving post to history:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while saving the post'
    };
  }
}

/**
 * Update an existing post in the database
 */
export async function updatePost(
  postId: number, 
  postData: Partial<InsertPost>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update timestamps
    const updateData = {
      ...postData,
      updatedAt: new Date()
    };
    
    await db.update(posts)
      .set(updateData)
      .where(eq(posts.id, postId));
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error updating post:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while updating the post'
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
): Promise<{ success: boolean; posts?: any[]; count?: number; error?: string }> {
  try {
    // Build query conditions
    const conditions = [];
    
    if (postType) {
      conditions.push(eq(posts.postType, postType));
    }
    
    if (publishStatus) {
      conditions.push(eq(posts.publishStatus, publishStatus));
    }
    
    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(...conditions));
    
    const count = countResult[0]?.count || 0;
    
    // Determine sort field
    let sortField;
    switch (sortBy) {
      case 'createdAt':
        sortField = posts.createdAt;
        break;
      case 'updatedAt':
        sortField = posts.updatedAt;
        break;
      case 'scheduledDate':
        sortField = posts.scheduledDate;
        break;
      default:
        sortField = posts.createdAt;
    }
    
    // Get posts with pagination and sorting
    const results = await db
      .select()
      .from(posts)
      .where(and(...conditions))
      .orderBy(sortOrder === 'desc' ? desc(sortField) : asc(sortField))
      .limit(limit)
      .offset(offset);
    
    return {
      success: true,
      posts: results,
      count
    };
  } catch (error: any) {
    console.error('Error retrieving posts:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while retrieving posts'
    };
  }
}

/**
 * Get a single post by ID
 */
export async function getPost(postId: number): Promise<{ success: boolean; post?: any; error?: string }> {
  try {
    const [result] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId));
    
    if (!result) {
      return {
        success: false,
        error: 'Post not found'
      };
    }
    
    return {
      success: true,
      post: result
    };
  } catch (error: any) {
    console.error('Error retrieving post:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while retrieving the post'
    };
  }
}

/**
 * Delete a post by ID
 */
export async function deletePost(postId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(posts).where(eq(posts.id, postId));
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while deleting the post'
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
    // Insert analytics data
    const [result] = await db
      .insert(postAnalytics)
      .values(analyticsData)
      .returning({ id: postAnalytics.id });
    
    // Update post with total metrics
    const postId = analyticsData.postId;
    const platform = analyticsData.platform;
    
    // Get all analytics for this post
    const allAnalytics = await db
      .select()
      .from(postAnalytics)
      .where(eq(postAnalytics.postId, postId));
    
    // Calculate totals across all platforms
    const totals = {
      impressions: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      clicks: 0,
    };
    
    allAnalytics.forEach(item => {
      totals.impressions += item.impressions || 0;
      totals.likes += item.likes || 0;
      totals.shares += item.shares || 0;
      totals.comments += item.comments || 0;
      totals.clicks += item.clicks || 0;
    });
    
    // Calculate total engagement
    const engagement = totals.likes + totals.shares + totals.comments;
    
    // Update the post with new totals
    await db.update(posts)
      .set({
        impressions: totals.impressions,
        likes: totals.likes,
        shares: totals.shares,
        comments: totals.comments,
        clicks: totals.clicks,
        engagement: engagement,
        updatedAt: new Date()
      })
      .where(eq(posts.id, postId));
    
    return {
      success: true,
      id: result.id
    };
  } catch (error: any) {
    console.error('Error saving analytics data:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while saving analytics data'
    };
  }
}

/**
 * Get analytics data for a post
 */
export async function getPostAnalytics(
  postId: number
): Promise<{ success: boolean; analytics?: any[]; error?: string }> {
  try {
    const results = await db
      .select()
      .from(postAnalytics)
      .where(eq(postAnalytics.postId, postId))
      .orderBy(desc(postAnalytics.recordedAt));
    
    return {
      success: true,
      analytics: results
    };
  } catch (error: any) {
    console.error('Error retrieving analytics data:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while retrieving analytics data'
    };
  }
}

/**
 * Get analytics summary data for all posts
 */
export async function getAnalyticsSummary(): Promise<{ success: boolean; summary?: any; error?: string }> {
  try {
    // Get total counts
    const [totalPosts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts);
    
    const [publishedPosts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.publishStatus, 'published'));
    
    const [scheduledPosts] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.publishStatus, 'scheduled'));
    
    // Get total metrics
    const totals = await db
      .select({
        totalImpressions: sql<number>`sum(${posts.impressions})`,
        totalLikes: sql<number>`sum(${posts.likes})`,
        totalShares: sql<number>`sum(${posts.shares})`,
        totalComments: sql<number>`sum(${posts.comments})`,
        totalClicks: sql<number>`sum(${posts.clicks})`,
        totalEngagement: sql<number>`sum(${posts.engagement})`,
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
        platform: postAnalytics.platform,
        count: sql<number>`count(distinct ${postAnalytics.postId})`
      })
      .from(postAnalytics)
      .groupBy(postAnalytics.platform);
    
    return {
      success: true,
      summary: {
        totalPosts: totalPosts.count || 0,
        publishedPosts: publishedPosts.count || 0,
        scheduledPosts: scheduledPosts.count || 0,
        metrics: totals[0] || {
          totalImpressions: 0,
          totalLikes: 0,
          totalShares: 0,
          totalComments: 0,
          totalClicks: 0,
          totalEngagement: 0,
        },
        recentPosts,
        postsByPlatform: postsByPlatform || []
      }
    };
  } catch (error: any) {
    console.error('Error retrieving analytics summary:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while retrieving analytics summary'
    };
  }
}