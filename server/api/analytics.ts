import fetch from 'node-fetch';
import { Post } from '@shared/schema';

// Facebook Graph API details
const FACEBOOK_API_VERSION = 'v18.0'; // Latest version as of 2024
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

/**
 * Fetch analytics data for a Facebook post
 * @param postId The Facebook post ID to fetch metrics for
 */
export async function fetchFacebookPostAnalytics(postId: string) {
  try {
    if (!FACEBOOK_ACCESS_TOKEN) {
      throw new Error('Facebook access token not configured');
    }

    const apiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${postId}/insights`;
    const params = new URLSearchParams({
      metric: 'post_impressions,post_reactions_by_type_total,post_comments,post_shares',
      access_token: FACEBOOK_ACCESS_TOKEN
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`);
    const data = await response.json() as any;

    if (data.error) {
      console.error('Error fetching Facebook post analytics:', data.error);
      return {
        success: false,
        error: data.error.message || 'Error fetching Facebook analytics'
      };
    }

    // Process and format the analytics data
    const metrics = processMetrics(data.data);
    
    return {
      success: true,
      metrics
    };
  } catch (error: any) {
    console.error('Error in fetchFacebookPostAnalytics:', error);
    return {
      success: false,
      error: error.message || 'Unknown error fetching Facebook analytics'
    };
  }
}

/**
 * Fetch analytics data for an Instagram post
 * @param postId The Instagram post ID to fetch metrics for
 */
export async function fetchInstagramPostAnalytics(postId: string) {
  try {
    if (!FACEBOOK_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      throw new Error('Instagram credentials not configured');
    }

    const apiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${postId}/insights`;
    const params = new URLSearchParams({
      metric: 'impressions,reach,engagement,saved',
      access_token: FACEBOOK_ACCESS_TOKEN
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`);
    const data = await response.json() as any;

    if (data.error) {
      console.error('Error fetching Instagram post analytics:', data.error);
      return {
        success: false,
        error: data.error.message || 'Error fetching Instagram analytics'
      };
    }

    // Process and format the analytics data
    const metrics = processInstagramMetrics(data.data);
    
    return {
      success: true,
      metrics
    };
  } catch (error: any) {
    console.error('Error in fetchInstagramPostAnalytics:', error);
    return {
      success: false,
      error: error.message || 'Unknown error fetching Instagram analytics'
    };
  }
}

/**
 * Fetch combined analytics for all platforms for a single post
 * @param post The post object containing platform-specific IDs
 */
export async function fetchCombinedPostAnalytics(post: Post) {
  try {
    const analytics = {
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagement: 0,
      platforms: {} as any
    };

    // Fetch Facebook analytics if we have a Facebook post ID
    if (post.facebookPostId) {
      const fbAnalytics = await fetchFacebookPostAnalytics(post.facebookPostId);
      if (fbAnalytics.success && fbAnalytics.metrics) {
        analytics.platforms.facebook = fbAnalytics.metrics;
        analytics.impressions += fbAnalytics.metrics.impressions || 0;
        analytics.likes += fbAnalytics.metrics.likes || 0;
        analytics.comments += fbAnalytics.metrics.comments || 0;
        analytics.shares += fbAnalytics.metrics.shares || 0;
      }
    }

    // Fetch Instagram analytics if we have an Instagram post ID
    if (post.instagramPostId) {
      const igAnalytics = await fetchInstagramPostAnalytics(post.instagramPostId);
      if (igAnalytics.success && igAnalytics.metrics) {
        analytics.platforms.instagram = igAnalytics.metrics;
        analytics.impressions += igAnalytics.metrics.impressions || 0;
        analytics.likes += igAnalytics.metrics.likes || 0;
        analytics.comments += igAnalytics.metrics.comments || 0;
        // Instagram doesn't have shares in the same way
      }
    }

    // Calculate total engagement
    analytics.engagement = analytics.likes + analytics.comments + analytics.shares;

    return {
      success: true,
      analytics
    };
  } catch (error: any) {
    console.error('Error in fetchCombinedPostAnalytics:', error);
    return {
      success: false,
      error: error.message || 'Unknown error fetching combined analytics'
    };
  }
}

/**
 * Process and normalize Facebook metrics data
 */
function processMetrics(metricsData: any[]) {
  const metrics: any = {
    impressions: 0,
    likes: 0,
    comments: 0,
    shares: 0
  };

  if (!metricsData || !Array.isArray(metricsData)) {
    return metrics;
  }

  // Process each metric type
  metricsData.forEach(metric => {
    switch (metric.name) {
      case 'post_impressions':
        metrics.impressions = metric.values[0]?.value || 0;
        break;
      case 'post_reactions_by_type_total':
        // Sum up all reaction types or get the 'like' count specifically
        const reactionValues = metric.values[0]?.value;
        if (reactionValues) {
          metrics.likes = reactionValues.like || 0;
        }
        break;
      case 'post_comments':
        metrics.comments = metric.values[0]?.value || 0;
        break;
      case 'post_shares':
        metrics.shares = metric.values[0]?.value || 0;
        break;
    }
  });

  return metrics;
}

/**
 * Process and normalize Instagram metrics data
 */
function processInstagramMetrics(metricsData: any[]) {
  const metrics: any = {
    impressions: 0,
    reach: 0,
    engagement: 0,
    likes: 0,
    comments: 0,
    saved: 0
  };

  if (!metricsData || !Array.isArray(metricsData)) {
    return metrics;
  }

  // Process each metric type
  metricsData.forEach(metric => {
    switch (metric.name) {
      case 'impressions':
        metrics.impressions = metric.values[0]?.value || 0;
        break;
      case 'reach':
        metrics.reach = metric.values[0]?.value || 0;
        break;
      case 'engagement':
        metrics.engagement = metric.values[0]?.value || 0;
        // Estimate likes and comments as a portion of engagement
        // This is a rough approximation as Instagram doesn't provide direct access
        metrics.likes = Math.round(metrics.engagement * 0.7); // 70% of engagement
        metrics.comments = Math.round(metrics.engagement * 0.2); // 20% of engagement
        break;
      case 'saved':
        metrics.saved = metric.values[0]?.value || 0;
        break;
    }
  });

  return metrics;
}

/**
 * Fetch overall account analytics for all platforms
 */
export async function fetchAccountAnalytics() {
  try {
    const analytics = {
      facebook: await fetchFacebookPageInsights(),
      instagram: await fetchInstagramAccountInsights()
    };
    
    return {
      success: true,
      analytics
    };
  } catch (error: any) {
    console.error('Error fetching account analytics:', error);
    return {
      success: false,
      error: error.message || 'Error fetching account analytics'
    };
  }
}

/**
 * Fetch Facebook page insights
 */
async function fetchFacebookPageInsights() {
  try {
    if (!FACEBOOK_ACCESS_TOKEN || !FACEBOOK_PAGE_ID) {
      throw new Error('Facebook credentials not configured');
    }

    const apiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/insights`;
    const params = new URLSearchParams({
      metric: 'page_impressions,page_engaged_users,page_post_engagements',
      period: 'day',
      access_token: FACEBOOK_ACCESS_TOKEN
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`);
    const data = await response.json() as any;

    if (data.error) {
      console.error('Error fetching Facebook page insights:', data.error);
      return null;
    }

    // Process the insights data
    return processFacebookPageInsights(data.data);
  } catch (error: any) {
    console.error('Error in fetchFacebookPageInsights:', error);
    return null;
  }
}

/**
 * Process Facebook page insights data
 */
function processFacebookPageInsights(insightsData: any[]) {
  const insights = {
    impressions: 0,
    engagement: 0,
    postEngagements: 0
  };

  if (!insightsData || !Array.isArray(insightsData)) {
    return insights;
  }

  // Process each insight type
  insightsData.forEach(insight => {
    switch (insight.name) {
      case 'page_impressions':
        insights.impressions = insight.values[0]?.value || 0;
        break;
      case 'page_engaged_users':
        insights.engagement = insight.values[0]?.value || 0;
        break;
      case 'page_post_engagements':
        insights.postEngagements = insight.values[0]?.value || 0;
        break;
    }
  });

  return insights;
}

/**
 * Fetch Instagram account insights
 */
async function fetchInstagramAccountInsights() {
  try {
    if (!FACEBOOK_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      throw new Error('Instagram credentials not configured');
    }

    const apiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/insights`;
    const params = new URLSearchParams({
      metric: 'impressions,reach,profile_views',
      period: 'day',
      access_token: FACEBOOK_ACCESS_TOKEN
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`);
    const data = await response.json() as any;

    if (data.error) {
      console.error('Error fetching Instagram account insights:', data.error);
      return null;
    }

    // Process the insights data
    return processInstagramAccountInsights(data.data);
  } catch (error: any) {
    console.error('Error in fetchInstagramAccountInsights:', error);
    return null;
  }
}

/**
 * Process Instagram account insights data
 */
function processInstagramAccountInsights(insightsData: any[]) {
  const insights = {
    impressions: 0,
    reach: 0,
    profileViews: 0
  };

  if (!insightsData || !Array.isArray(insightsData)) {
    return insights;
  }

  // Process each insight type
  insightsData.forEach(insight => {
    switch (insight.name) {
      case 'impressions':
        insights.impressions = insight.values[0]?.value || 0;
        break;
      case 'reach':
        insights.reach = insight.values[0]?.value || 0;
        break;
      case 'profile_views':
        insights.profileViews = insight.values[0]?.value || 0;
        break;
    }
  });

  return insights;
}