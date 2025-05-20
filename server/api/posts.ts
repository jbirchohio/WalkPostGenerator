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
export async function savePost(postData: any): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    // Ensure we have all required fields
    const postDataToSave = {
      content: postData.content,
      postType: postData.postType,
      image: postData.image,
      productName: postData.productName,
      publishStatus: postData.publishStatus || 'draft',
      publishedTo: Array.isArray(postData.publishedTo) ? postData.publishedTo : null,
      scheduledDate: postData.scheduledDate ? new Date(postData.scheduledDate) : null,
      impressions: postData.impressions || 0,
      likes: postData.likes || 0,
      shares: postData.shares || 0,
      comments: postData.comments || 0,
      clicks: postData.clicks || 0,
      // Add platform-specific IDs for analytics tracking
      facebookPostId: postData.facebookPostId || null,
      instagramPostId: postData.instagramPostId || null,
      engagement: postData.engagement || 0
    };
    
    // Insert into database
    const [result] = await db.insert(posts).values(postDataToSave).returning();
    
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
  queryParams: {
    limit?: number;
    offset?: number;
    postType?: string;
    publishStatus?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ success: boolean; posts?: Post[]; count?: number; error?: string }> {
  // Set defaults
  const limit = queryParams.limit || 20;
  const offset = queryParams.offset || 0;
  const sortBy = queryParams.sortBy || 'createdAt';
  const sortOrder = queryParams.sortOrder || 'desc';
  const { postType, publishStatus } = queryParams;
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
    
    // Extract reach data from metadata if it exists
    let reach = 0;
    if (analyticsData.metadata) {
      // Check if we have reach data in the metadata
      if (analyticsData.metadata.reach) {
        reach = parseInt(analyticsData.metadata.reach.toString()) || 0;
      }
    }
    
    console.log(`Updating post ${analyticsData.postId} with reach: ${reach}, platform: ${analyticsData.platform}`);
    
    // Update the post with the latest engagement metrics
    await db
      .update(posts)
      .set({
        impressions: analyticsData.impressions,
        likes: analyticsData.likes,
        shares: analyticsData.shares,
        comments: analyticsData.comments,
        clicks: analyticsData.clicks,
        reach: reach, // Add reach value
        engagement: analyticsData.likes + analyticsData.shares + analyticsData.comments + analyticsData.clicks,
        lastAnalyticsFetch: new Date() // Update analytics timestamp
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
): Promise<{ success: boolean; analytics?: PostAnalytics[]; history?: any; error?: string }> {
  try {
    const analytics = await db
      .select()
      .from(postAnalytics)
      .where(eq(postAnalytics.postId, postId))
      .orderBy(postAnalytics.recordedAt);
    
    // Group analytics by platform and format for the chart
    const history = {
      dates: [] as string[],
      facebook: {
        engagement: [] as number[],
        impressions: [] as number[],
        likes: [] as number[],
        comments: [] as number[],
        shares: [] as number[]
      },
      instagram: {
        engagement: [] as number[],
        impressions: [] as number[],
        likes: [] as number[],
        comments: [] as number[],
        shares: [] as number[]
      }
    };
    
    // Create a map to avoid duplicate dates
    const dateMap = new Map();
    
    // Process analytics data by date
    analytics.forEach(record => {
      const date = new Date(record.recordedAt).toISOString().split('T')[0];
      
      if (!dateMap.has(date)) {
        dateMap.set(date, true);
        history.dates.push(date);
      }
      
      if (record.platform === 'facebook') {
        const index = history.dates.indexOf(date);
        // If this is a new date, we need to initialize all arrays at this index
        if (index >= history.facebook.engagement.length) {
          history.facebook.engagement[index] = (record.likes || 0) + (record.comments || 0) + (record.shares || 0);
          history.facebook.impressions[index] = record.impressions || 0;
          history.facebook.likes[index] = record.likes || 0;
          history.facebook.comments[index] = record.comments || 0;
          history.facebook.shares[index] = record.shares || 0;
        }
      } 
      else if (record.platform === 'instagram') {
        const index = history.dates.indexOf(date);
        // If this is a new date, we need to initialize all arrays at this index
        if (index >= history.instagram.engagement.length) {
          history.instagram.engagement[index] = (record.likes || 0) + (record.comments || 0) + (record.shares || 0);
          history.instagram.impressions[index] = record.impressions || 0;
          history.instagram.likes[index] = record.likes || 0;
          history.instagram.comments[index] = record.comments || 0;
          history.instagram.shares[index] = record.shares || 0;
        }
      }
    });
    
    // Fill any gaps in the data
    for (let i = 0; i < history.dates.length; i++) {
      if (history.facebook.engagement[i] === undefined) {
        history.facebook.engagement[i] = 0;
        history.facebook.impressions[i] = 0;
        history.facebook.likes[i] = 0;
        history.facebook.comments[i] = 0;
        history.facebook.shares[i] = 0;
      }
      
      if (history.instagram.engagement[i] === undefined) {
        history.instagram.engagement[i] = 0;
        history.instagram.impressions[i] = 0;
        history.instagram.likes[i] = 0;
        history.instagram.comments[i] = 0;
        history.instagram.shares[i] = 0;
      }
    }
    
    return {
      success: true,
      analytics,
      history
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
        totalEngagement: sql<number>`sum(${posts.engagement})`,
        totalReach: sql<number>`sum(${posts.reach})`
      })
      .from(posts);
    
    // Get recent posts
    const recentPosts = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(5);
    
    // Get posts by platform count with a simplified approach
    // Since jsonb '?' operator doesn't work in all PostgreSQL versions,
    // we'll manually count with a direct query
    // Count posts by platform properly using the publishedTo array
    const facebookCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(sql`${posts.publishStatus} = 'published' AND ${posts.facebookPostId} IS NOT NULL`)
      .then(res => Number(res[0].count));
      
    const instagramCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(sql`${posts.publishStatus} = 'published' AND ${posts.instagramPostId} IS NOT NULL`)
      .then(res => Number(res[0].count));
    
    // Get platform-specific metrics
    const [facebookMetrics] = await db
      .select({
        impressions: sql<number>`sum(${posts.impressions})`,
        likes: sql<number>`sum(${posts.likes})`,
        shares: sql<number>`sum(${posts.shares})`,
        comments: sql<number>`sum(${posts.comments})`,
        reach: sql<number>`sum(${posts.reach})`,
        engagement: sql<number>`sum(${posts.engagement})`
      })
      .from(posts)
      .where(sql`${posts.facebookPostId} IS NOT NULL`);
      
    const [instagramMetrics] = await db
      .select({
        impressions: sql<number>`sum(${posts.impressions})`,
        likes: sql<number>`sum(${posts.likes})`,
        shares: sql<number>`sum(${posts.shares})`,
        comments: sql<number>`sum(${posts.comments})`,
        reach: sql<number>`sum(${posts.reach})`,
        engagement: sql<number>`sum(${posts.engagement})`
      })
      .from(posts)
      .where(sql`${posts.instagramPostId} IS NOT NULL`);
      
    // Create the platform summary
    const postsByPlatform = [
      { platform: 'facebook', count: facebookCount },
      { platform: 'instagram', count: instagramCount },
    ];
    
    return {
      success: true,
      summary: {
        totalPosts: postCounts.total || 0,
        publishedPosts: postCounts.published || 0,
        scheduledPosts: postCounts.scheduled || 0,
        metrics: {
          // Global metrics
          totalImpressions: metrics.totalImpressions || 0,
          totalLikes: metrics.totalLikes || 0,
          totalShares: metrics.totalShares || 0,
          totalComments: metrics.totalComments || 0,
          totalClicks: metrics.totalClicks || 0,
          totalEngagement: metrics.totalEngagement || 0,
          totalReach: metrics.totalReach || 0,
          
          // Facebook metrics
          facebookImpressions: facebookMetrics?.impressions || 0,
          facebookLikes: facebookMetrics?.likes || 0,
          facebookShares: facebookMetrics?.shares || 0,
          facebookComments: facebookMetrics?.comments || 0,
          facebookReach: facebookMetrics?.reach || 0,
          facebookEngagement: facebookMetrics?.engagement || 0,
          
          // Instagram metrics
          instagramImpressions: instagramMetrics?.impressions || 0,
          instagramLikes: instagramMetrics?.likes || 0,
          instagramShares: instagramMetrics?.shares || 0,
          instagramComments: instagramMetrics?.comments || 0,
          instagramReach: instagramMetrics?.reach || 0,
          instagramEngagement: instagramMetrics?.engagement || 0,
          
          // Additional metrics
          totalSaved: 0 // This would need to come from specific Instagram metrics
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